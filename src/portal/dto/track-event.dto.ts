import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export enum TrackEventType {
  PageView = 'page_view',
  SectionDwell = 'section_dwell',
  DemoRequest = 'demo_request',
  LinkClick = 'link_click',
  ImageClick = 'image_click',
  Navigation = 'navigation',
  OutboundClick = 'outbound_click',
}

export class TrackEventDto {
  @IsUUID()
  sessionId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  token?: string;

  @IsEnum(TrackEventType)
  eventType!: TrackEventType;

  @IsOptional()
  @IsUUID()
  interactionId?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
