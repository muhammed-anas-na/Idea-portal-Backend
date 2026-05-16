import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { TrackEventDto } from './dto/track-event.dto';
import { TrackingService } from './tracking.service';

// Kind priority for picking the "lead" interaction within a source-idea group
const KIND_ORDER: Record<string, number> = { post: 0, comment: 1, reply: 2, vote: 3 };

@Controller('portal')
export class PortalController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tracking: TrackingService,
  ) {}

  @Get('c/:token')
  async byToken(@Param('token') token: string) {
    const link = await this.prisma.trackingLink.findUnique({
      where: { token },
      include: {
        customer: {
          include: {
            page: true,
            interactions: {
              orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
              include: {
                answer: {
                  where: { isPublished: true },
                  include: { product: true },
                },
              },
            },
          },
        },
      },
    });

    if (!link?.customer) throw new NotFoundException('Page not found.');
    const customer = link.customer;

    // Only interactions that have a published answer
    const withAnswer = customer.interactions.filter((it) => it.answer !== null);

    // Group by sourceId (fallback to own id when sourceId is null)
    const groups = new Map<string, typeof withAnswer>();
    for (const it of withAnswer) {
      const key = it.sourceId ?? it.id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(it);
    }

    // Produce one card per group — pick the lead interaction by kind priority
    const ideas = Array.from(groups.values()).map((group) => {
      const lead = group.slice().sort(
        (a, b) => (KIND_ORDER[a.kind] ?? 9) - (KIND_ORDER[b.kind] ?? 9),
      )[0];
      const voteCount = group.filter((i) => i.kind === 'vote').length;
      const commentCount = group.filter(
        (i) => i.kind === 'comment' || i.kind === 'reply',
      ).length;
      return {
        id: lead.id,
        kind: lead.kind,
        sourceUrl: lead.sourceUrl,
        sourceId: lead.sourceId,
        occurredOn: lead.occurredOn,
        title: lead.title,
        body: lead.body,
        voteCount,
        commentCount,
        totalInteractions: group.length,
      };
    });

    const useCases = await this.prisma.useCase.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        title: true,
        summary: true,
        product: { select: { name: true, url: true, logoUrl: true } },
      },
    });

    return {
      linkId: link.id,
      name: customer.name,
      targetInteractionId: link.interactionId ?? null,
      page: customer.page
        ? {
            introHtml: customer.page.introHtml,
            outroHtml: customer.page.outroHtml,
            accentColor: customer.page.accentColor,
            calendlyUrl: customer.page.calendlyUrl,
            isPublished: customer.page.isPublished,
          }
        : null,
      interactions: ideas,
      useCases,
    };
  }

  @Get('c/:token/idea/:interactionId')
  async ideaDetail(
    @Param('token') token: string,
    @Param('interactionId') interactionId: string,
  ) {
    const link = await this.prisma.trackingLink.findUnique({
      where: { token },
      include: { customer: { include: { page: true } } },
    });
    if (!link?.customer) throw new NotFoundException('Page not found.');

    const interaction = await this.prisma.interaction.findFirst({
      where: { id: interactionId, customerId: link.customer.id },
      include: {
        answer: {
          where: { isPublished: true },
          include: { product: true },
        },
      },
    });
    if (!interaction || !interaction.answer)
      throw new NotFoundException('Idea not found.');

    // All interactions across ALL customers on the same source idea
    const communityInteractions = interaction.sourceId
      ? await this.prisma.interaction.findMany({
          where: {
            sourceId: interaction.sourceId,
            id: { not: interactionId }, // exclude the current one
          },
          orderBy: { occurredOn: 'asc' },
        })
      : [];

    const voteCount = communityInteractions.filter((i) => i.kind === 'vote').length;
    const communityComments = communityInteractions.filter(
      (i) => i.kind === 'post' || i.kind === 'comment' || i.kind === 'reply',
    );

    // Up to 3 other published interactions from the same customer (different sourceId group)
    const otherIdeas = await this.prisma.interaction.findMany({
      where: {
        customerId: link.customer.id,
        id: { not: interactionId },
        ...(interaction.sourceId ? { sourceId: { not: interaction.sourceId } } : {}),
        answer: { isPublished: true },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      take: 3,
    });

    return {
      linkId: link.id,
      customerName: link.customer.name,
      page: link.customer.page
        ? {
            accentColor: link.customer.page.accentColor,
            calendlyUrl: link.customer.page.calendlyUrl,
            outroHtml: link.customer.page.outroHtml,
          }
        : null,
      interaction: {
        id: interaction.id,
        kind: interaction.kind,
        title: interaction.title,
        body: interaction.body,
        sourceUrl: interaction.sourceUrl,
        sourceId: interaction.sourceId,
        occurredOn: interaction.occurredOn,
        answer: {
          contentHtml: interaction.answer.contentHtml,
          product: interaction.answer.product
            ? {
                name: interaction.answer.product.name,
                url: interaction.answer.product.url,
                logoUrl: interaction.answer.product.logoUrl,
              }
            : null,
        },
      },
      communityActivity: interaction.sourceId
        ? {
            voteCount,
            totalComments: communityComments.length,
            comments: communityComments.map((c) => ({
              id: c.id,
              kind: c.kind,
              title: c.title,
              body: c.body,
              occurredOn: c.occurredOn,
            })),
          }
        : null,
      otherIdeas: otherIdeas.map((r) => ({
        id: r.id,
        kind: r.kind,
        title: r.title,
        body: r.body,
        sourceUrl: r.sourceUrl,
        occurredOn: r.occurredOn,
      })),
    };
  }

  @Get('c/:token/case/:useCaseId')
  async caseDetail(
    @Param('token') token: string,
    @Param('useCaseId') useCaseId: string,
  ) {
    const link = await this.prisma.trackingLink.findUnique({
      where: { token },
      include: { customer: { include: { page: true } } },
    });
    if (!link?.customer) throw new NotFoundException('Page not found.');

    const useCase = await this.prisma.useCase.findFirst({
      where: { id: useCaseId, isPublished: true },
      include: { product: { select: { name: true, url: true, logoUrl: true } } },
    });
    if (!useCase) throw new NotFoundException('Use case not found.');

    return {
      linkId: link.id,
      customerName: link.customer.name,
      page: link.customer.page
        ? {
            accentColor: link.customer.page.accentColor,
            calendlyUrl: link.customer.page.calendlyUrl,
            outroHtml: link.customer.page.outroHtml,
          }
        : null,
      useCase: {
        id: useCase.id,
        title: useCase.title,
        summary: useCase.summary,
        contentHtml: useCase.contentHtml,
        product: useCase.product,
      },
    };
  }

  @Post('track')
  @HttpCode(202)
  async track(@Body() dto: TrackEventDto, @Req() req: Request) {
    const userAgent = req.headers['user-agent'];
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.socket.remoteAddress;
    await this.tracking.record(dto, userAgent, ip);
    return { ok: true };
  }
}
