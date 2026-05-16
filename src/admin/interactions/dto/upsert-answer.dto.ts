import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpsertAnswerDto {
  @IsString()
  @MaxLength(50_000)
  contentHtml!: string;

  @IsOptional()
  @IsUUID()
  productId?: string | null;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
