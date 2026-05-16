import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Customer, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { UpsertCustomerPageDto } from './dto/upsert-page.dto';
import { ImportCustomersDto, ImportInteractionDto, ImportPersonDto } from './dto/import-customers.dto';

export interface CustomerListItem {
  id: string;
  name: string;
  email: string | null;
  status: string;
  interactionCount: number;
  answerCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImportResult {
  createdCustomers: number;
  matchedCustomers: number;
  insertedInteractions: number;
  updatedInteractions: number;
}

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<CustomerListItem[]> {
    const rows = await this.prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { interactions: true } },
        interactions: {
          where: { answer: { isNot: null } },
          select: { id: true },
        },
      },
    });
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      status: c.status,
      interactionCount: c._count.interactions,
      answerCount: c.interactions.length,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  async create(dto: CreateCustomerDto): Promise<Customer> {
    if (dto.email) {
      const dup = await this.prisma.customer.findUnique({ where: { email: dto.email } });
      if (dup) throw new ConflictException('A customer with that email already exists.');
    }
    return this.prisma.customer.create({
      data: {
        name: dto.name.trim(),
        email: dto.email?.trim().toLowerCase() ?? null,
        notes: dto.notes ?? null,
        page: { create: {} },
      },
    });
  }

  async findDetail(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        page: true,
        interactions: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: { answer: { include: { product: true } } },
        },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found.');
    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<Customer> {
    const existing = await this.prisma.customer.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Customer not found.');
    if (dto.email && dto.email !== existing.email) {
      const dup = await this.prisma.customer.findUnique({ where: { email: dto.email } });
      if (dup) throw new ConflictException('A customer with that email already exists.');
    }
    return this.prisma.customer.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        email: dto.email?.trim().toLowerCase(),
        notes: dto.notes,
        status: dto.status,
      },
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.customer.delete({ where: { id } });
  }

  async upsertPage(customerId: string, dto: UpsertCustomerPageDto) {
    await this.findDetail(customerId);
    return this.prisma.customerPage.upsert({
      where: { customerId },
      create: {
        customerId,
        introHtml: dto.introHtml ?? '',
        outroHtml: dto.outroHtml ?? '',
        accentColor: dto.accentColor ?? null,
        calendlyUrl: dto.calendlyUrl ?? null,
        isPublished: dto.isPublished ?? false,
      },
      update: {
        introHtml: dto.introHtml,
        outroHtml: dto.outroHtml,
        accentColor: dto.accentColor,
        calendlyUrl: dto.calendlyUrl,
        isPublished: dto.isPublished,
      },
    });
  }

  async importPersons(payload: ImportCustomersDto): Promise<ImportResult> {
    const result: ImportResult = {
      createdCustomers: 0,
      matchedCustomers: 0,
      insertedInteractions: 0,
      updatedInteractions: 0,
    };

    // Deduplicate by email (priority) then by name within this import batch
    const seenByEmail = new Map<string, ImportPersonDto>();
    const seenByName = new Map<string, ImportPersonDto>();
    for (const person of payload.persons) {
      const emailKey = person.email?.trim().toLowerCase();
      const nameKey = person.name.trim().toLowerCase();
      const existing = (emailKey && seenByEmail.get(emailKey)) ?? seenByName.get(nameKey);
      if (existing) {
        existing.interactions = mergeInteractions(existing.interactions, person.interactions);
        if (emailKey && !seenByEmail.has(emailKey)) seenByEmail.set(emailKey, existing);
      } else {
        const entry: ImportPersonDto = { ...person, interactions: [...person.interactions] };
        if (emailKey) seenByEmail.set(emailKey, entry);
        seenByName.set(nameKey, entry);
      }
    }
    // Use name map as the canonical deduplicated list (email map is a lookup index)
    const seenNames = seenByName;

    for (const person of seenNames.values()) {
      const trimmedName = person.name.trim();
      const normalizedEmail = person.email?.trim().toLowerCase() || null;

      // Match by email first (if provided), then fall back to case-insensitive name
      let matched: { id: string } | null = null;
      if (normalizedEmail) {
        matched = await this.prisma.customer.findUnique({
          where: { email: normalizedEmail },
          select: { id: true },
        });
      }
      if (!matched) {
        matched = await this.prisma.customer.findFirst({
          where: { name: { equals: trimmedName, mode: 'insensitive' } },
          select: { id: true },
        });
      }

      const customer = matched
        ? matched
        : await this.prisma.customer.create({
            data: {
              name: trimmedName,
              email: normalizedEmail,
              page: { create: {} },
            },
            select: { id: true },
          });

      if (matched) result.matchedCustomers += 1;
      else result.createdCustomers += 1;

      for (const interaction of person.interactions) {
        const occurredOn = parseDdMmYyyy(interaction.date);
        const sourceId = extractSourceId(interaction.url);
        const data = {
          sourceUrl: interaction.url,
          sourceId,
          kind: interaction.type,
          occurredOn,
          title: interaction.title.trim(),
          body: (interaction.type === 'comment' || interaction.type === 'reply')
            ? (interaction.comment?.trim() || interaction.idea?.trim() || null)
            : (interaction.idea?.trim() || null),
          raw: interaction as unknown as Prisma.InputJsonValue,
        };
        const upserted = await this.prisma.interaction.upsert({
          where: {
            customerId_sourceUrl: {
              customerId: customer.id,
              sourceUrl: interaction.url,
            },
          },
          create: { customerId: customer.id, ...data },
          update: data,
          select: { createdAt: true, updatedAt: true },
        });
        if (upserted.createdAt.getTime() === upserted.updatedAt.getTime()) {
          result.insertedInteractions += 1;
        } else {
          result.updatedInteractions += 1;
        }
      }

    }

    return result;
  }
}


function mergeInteractions(
  existing: ImportInteractionDto[],
  incoming: ImportInteractionDto[],
): ImportInteractionDto[] {
  const byUrl = new Map<string, ImportInteractionDto>();
  for (const it of existing) byUrl.set(it.url, it);
  for (const it of incoming) byUrl.set(it.url, it);
  return Array.from(byUrl.values());
}

function parseDdMmYyyy(value?: string): Date | null {
  if (!value) return null;
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value.trim());
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const date = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
  return Number.isNaN(date.getTime()) ? null : date;
}

function extractSourceId(url: string): string | null {
  const m = /\/ideas\/([A-Z0-9-]+)/i.exec(url);
  return m ? m[1] : null;
}
