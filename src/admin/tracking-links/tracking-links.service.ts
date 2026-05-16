import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { generateCustomerToken } from '../../common/token.util';
import { CreateLinkDto } from './dto/create-link.dto';

@Injectable()
export class TrackingLinksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateLinkDto) {
    return this.prisma.trackingLink.create({
      data: {
        token: generateCustomerToken(),
        customerId: dto.customerId ?? null,
        interactionId: dto.interactionId ?? null,
        label: dto.label?.trim() ?? null,
      },
    });
  }

  async listForCustomer(customerId: string) {
    const rows = await this.prisma.trackingLink.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: {
        interaction: { select: { id: true, title: true, kind: true } },
        _count: { select: { events: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      token: r.token,
      label: r.label,
      interaction: r.interaction,
      eventCount: r._count.events,
      createdAt: r.createdAt,
    }));
  }

  async getActivity(id: string) {
    const link = await this.prisma.trackingLink.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true } },
        interaction: { select: { id: true, title: true, kind: true } },
        sessions: {
          orderBy: { startedAt: 'asc' },
          include: { events: { where: { trackingLinkId: id }, orderBy: { occurredAt: 'asc' } } },
        },
      },
    });
    if (!link) throw new NotFoundException('Tracking link not found.');

    const allEvents = link.sessions.flatMap((s) => s.events);

    // Fetch titles for any interactionId referenced in events
    const interactionIds = [
      ...new Set(allEvents.map((e) => e.interactionId).filter(Boolean)),
    ] as string[];
    const interactions =
      interactionIds.length > 0
        ? await this.prisma.interaction.findMany({
            where: { id: { in: interactionIds } },
            select: { id: true, title: true, kind: true },
          })
        : [];
    const byId = new Map(interactions.map((i) => [i.id, i]));

    const demoRequests = allEvents.filter((e) => e.eventType === 'demo_request').length;
    const totalDwellMs = allEvents
      .filter((e) => e.eventType === 'section_dwell')
      .reduce(
        (sum, e) =>
          sum + (Number((e.payload as Record<string, unknown>)?.['dwellMs']) || 0),
        0,
      );

    return {
      link: {
        id: link.id,
        token: link.token,
        label: link.label,
        createdAt: link.createdAt,
        customer: link.customer,
        interaction: link.interaction,
      },
      summary: {
        totalEvents: allEvents.length,
        uniqueSessions: link.sessions.length,
        pageViews: allEvents.filter((e) => e.eventType === 'page_view').length,
        ideasViewed: new Set(
          allEvents.filter((e) => e.interactionId).map((e) => e.interactionId),
        ).size,
        demoRequests,
        outboundClicks: allEvents.filter((e) => e.eventType === 'outbound_click').length,
        firstSeenAt: link.sessions[0]?.startedAt ?? null,
        lastSeenAt: link.sessions.at(-1)?.lastSeenAt ?? null,
        totalDwellMs,
      },
      sessions: link.sessions.map((s) => ({
        id: s.id,
        startedAt: s.startedAt,
        lastSeenAt: s.lastSeenAt,
        userAgent: s.userAgent,
        events: s.events.map((e) => ({
          id: e.id,
          eventType: e.eventType,
          occurredAt: e.occurredAt,
          interactionId: e.interactionId,
          interaction: e.interactionId ? (byId.get(e.interactionId) ?? null) : null,
          payload: e.payload,
        })),
      })),
    };
  }

  async remove(id: string): Promise<void> {
    const link = await this.prisma.trackingLink.findUnique({ where: { id } });
    if (!link) throw new NotFoundException('Tracking link not found.');
    await this.prisma.trackingLink.delete({ where: { id } });
  }
}
