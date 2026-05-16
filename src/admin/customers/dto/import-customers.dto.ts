import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { InteractionKind } from '@prisma/client';

export class ImportInteractionDto {
  @IsString()
  @MaxLength(1000)
  url!: string;

  @IsEnum(InteractionKind)
  type!: InteractionKind;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  date?: string;

  @IsString()
  @MaxLength(500)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  idea?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  comment?: string;
}

export class ImportPersonDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(254)
  email?: string;

  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(5_000)
  @ValidateNested({ each: true })
  @Type(() => ImportInteractionDto)
  interactions!: ImportInteractionDto[];
}

export class ImportCustomersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5_000)
  @ValidateNested({ each: true })
  @Type(() => ImportPersonDto)
  persons!: ImportPersonDto[];
}
