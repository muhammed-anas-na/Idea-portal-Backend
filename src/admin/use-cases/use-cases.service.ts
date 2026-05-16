import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertUseCaseDto } from './dto/upsert-use-case.dto';

@Injectable()
export class UseCasesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.useCase.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: { product: { select: { id: true, name: true, slug: true } } },
    });
  }

  create(dto: UpsertUseCaseDto) {
    return this.prisma.useCase.create({
      data: {
        title: dto.title,
        summary: dto.summary ?? null,
        contentHtml: dto.contentHtml,
        productId: dto.productId ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isPublished: dto.isPublished ?? false,
      },
      include: { product: { select: { id: true, name: true, slug: true } } },
    });
  }

  async update(id: string, dto: UpsertUseCaseDto) {
    const existing = await this.prisma.useCase.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Use case not found.');
    return this.prisma.useCase.update({
      where: { id },
      data: {
        title: dto.title,
        summary: dto.summary ?? null,
        contentHtml: dto.contentHtml,
        productId: dto.productId ?? null,
        sortOrder: dto.sortOrder ?? existing.sortOrder,
        isPublished: dto.isPublished ?? existing.isPublished,
      },
      include: { product: { select: { id: true, name: true, slug: true } } },
    });
  }

  listProducts() {
    return this.prisma.feebakProduct.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, slug: true },
    });
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.useCase.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Use case not found.');
    await this.prisma.useCase.delete({ where: { id } });
  }
}
