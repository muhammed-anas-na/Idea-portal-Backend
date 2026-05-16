import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { TrackEventDto } from './dto/track-event.dto';

@Injectable()
export class TrackingService {
  constructor(private readonly prisma: PrismaService) {}

  async record(dto: TrackEventDto, userAgent: string | undefined, ip: string | undefined): Promise<void> {
    const ipHash = ip ? createHash('sha256').update(ip).digest('hex') : null;

    let trackingLinkId: string | null = null;
    let customerId: string | null = null;
    if (dto.token) {
      const link = await this.prisma.trackingLink.findUnique({
        where: { token: dto.token },
        select: { id: true, customerId: true },
      });
      trackingLinkId = link?.id ?? null;
      customerId = link?.customerId ?? null;
    }

    await this.prisma.trackingSession.upsert({
      where: { id: dto.sessionId },
      create: {
        id: dto.sessionId,
        trackingLinkId,
        customerId,
        userAgent: userAgent?.slice(0, 500) ?? null,
        ipHash,
      },
      update: {
        lastSeenAt: new Date(),
        ...(trackingLinkId ? { trackingLinkId } : {}),
        ...(customerId ? { customerId } : {}),
      },
    });

    await this.prisma.trackingEvent.create({
      data: {
        sessionId: dto.sessionId,
        trackingLinkId,
        customerId,
        interactionId: dto.interactionId ?? null,
        eventType: dto.eventType,
        payload: (dto.payload ?? {}) as object,
      },
    });
  }
}
