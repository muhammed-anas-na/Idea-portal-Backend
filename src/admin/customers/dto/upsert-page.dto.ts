import { IsBoolean, IsHexColor, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpsertCustomerPageDto {
  @IsOptional()
  @IsString()
  @MaxLength(50_000)
  introHtml?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50_000)
  outroHtml?: string;

  @IsOptional()
  @IsHexColor()
  accentColor?: string;

  @IsOptional()
  @IsUrl()
  calendlyUrl?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
