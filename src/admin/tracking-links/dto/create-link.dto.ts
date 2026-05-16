import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateLinkDto {
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  interactionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;
}
