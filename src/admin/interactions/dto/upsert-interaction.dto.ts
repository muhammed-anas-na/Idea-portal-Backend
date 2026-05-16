import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { InteractionKind } from '@prisma/client';

export class UpsertInteractionDto {
  @IsString()
  @MaxLength(1000)
  sourceUrl!: string;

  @IsEnum(InteractionKind)
  kind!: InteractionKind;

  @IsString()
  @MaxLength(500)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  body?: string;

  @IsOptional()
  @IsString()
  occurredOn?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
