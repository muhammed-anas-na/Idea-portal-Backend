import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { TrackingLinksService } from './tracking-links.service';
import { CreateLinkDto } from './dto/create-link.dto';

@Controller('admin/tracking-links')
@UseGuards(JwtAuthGuard)
export class TrackingLinksController {
  constructor(private readonly service: TrackingLinksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateLinkDto) {
    return this.service.create(dto);
  }

  @Get('customer/:customerId')
  listForCustomer(@Param('customerId', new ParseUUIDPipe()) customerId: string) {
    return this.service.listForCustomer(customerId);
  }

  @Get(':id/activity')
  getActivity(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.getActivity(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.service.remove(id);
  }
}
