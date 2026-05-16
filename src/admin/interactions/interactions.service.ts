import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertAnswerDto } from './dto/upsert-answer.dto';
import { UpsertInteractionDto } from './dto/upsert-interaction.dto';

@Injectable()
export class InteractionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listAll(filter?: { kind?: string; published?: boolean }) {
    return this.prisma.interaction.findMany({
      where: {
        ...(filter?.kind ? { kind: filter.kind as never } : {}),
        ...(filter?.published !== undefined
          ? { answer: filter.published ? { isPublished: true } : { isPublished: false } }
          : {}),
      },
      orderBy: [{ occurredOn: 'desc' }, { createdAt: 'desc' }],
      include: {
        customer: { select: { id: true, name: true, email: true, status: true } },
        answer: {
          select: { id: true, isPublished: true, updatedAt: true },
        },
      },
    });
  }

  async addInteraction(customerId: string, dto: UpsertInteractionDto) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Customer not found.');
    return this.prisma.interaction.create({
      data: {
        customerId,
        sourceUrl: dto.sourceUrl.trim(),
        sourceId: extractSourceId(dto.sourceUrl),
        kind: dto.kind,
        title: dto.title.trim(),
        body: dto.body?.trim() ?? null,
        occurredOn: parseDateInput(dto.occurredOn),
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateInteraction(id: string, dto: UpsertInteractionDto) {
    const existing = await this.prisma.interaction.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Interaction not found.');
    return this.prisma.interaction.update({
      where: { id },
      data: {
        sourceUrl: dto.sourceUrl.trim(),
        sourceId: extractSourceId(dto.sourceUrl),
        kind: dto.kind,
        title: dto.title.trim(),
        body: dto.body?.trim() ?? null,
        occurredOn: parseDateInput(dto.occurredOn),
        sortOrder: dto.sortOrder ?? existing.sortOrder,
      },
    });
  }

  async removeInteraction(id: string): Promise<void> {
    await this.prisma.interaction.delete({ where: { id } });
  }

  async upsertAnswer(interactionId: string, dto: UpsertAnswerDto) {
    const interaction = await this.prisma.interaction.findUnique({
      where: { id: interactionId },
    });
    if (!interaction) throw new NotFoundException('Interaction not found.');
    return this.prisma.interactionAnswer.upsert({
      where: { interactionId },
      create: {
        interactionId,
        contentHtml: dto.contentHtml,
        productId: dto.productId ?? null,
        isPublished: dto.isPublished ?? false,
      },
      update: {
        contentHtml: dto.contentHtml,
        productId: dto.productId ?? null,
        isPublished: dto.isPublished,
      },
    });
  }

  async deleteAnswer(interactionId: string): Promise<void> {
    const existing = await this.prisma.interactionAnswer.findUnique({
      where: { interactionId },
    });
    if (!existing) return;
    await this.prisma.interactionAnswer.delete({ where: { interactionId } });
  }
}

function parseDateInput(value?: string): Date | null {
  if (!value) return null;
  const isoMatch = /^\d{4}-\d{2}-\d{2}/.exec(value);
  const ddmmMatch = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value.trim());
  if (isoMatch) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (ddmmMatch) {
    const [, dd, mm, yyyy] = ddmmMatch;
    return new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
  }
  return null;
}

function extractSourceId(url: string): string | null {
  const m = /\/ideas\/([A-Z0-9-]+)/i.exec(url);
  return m ? m[1] : null;
}
