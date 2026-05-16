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
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { InteractionsService } from './interactions.service';
import { UpsertAnswerDto } from './dto/upsert-answer.dto';
import { UpsertInteractionDto } from './dto/upsert-interaction.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class InteractionsController {
  constructor(private readonly interactions: InteractionsService) {}

  @Get('ideas')
  listAll(
    @Query('kind') kind?: string,
    @Query('published') published?: string,
  ) {
    const publishedFilter =
      published === 'true' ? true : published === 'false' ? false : undefined;
    return this.interactions.listAll({ kind, published: publishedFilter });
  }

  @Post('customers/:customerId/interactions')
  @HttpCode(HttpStatus.CREATED)
  add(
    @Param('customerId', new ParseUUIDPipe()) customerId: string,
    @Body() dto: UpsertInteractionDto,
  ) {
    return this.interactions.addInteraction(customerId, dto);
  }

  @Put('interactions/:id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpsertInteractionDto,
  ) {
    return this.interactions.updateInteraction(id, dto);
  }

  @Delete('interactions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.interactions.removeInteraction(id);
  }

  @Put('interactions/:id/answer')
  upsertAnswer(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpsertAnswerDto,
  ) {
    return this.interactions.upsertAnswer(id, dto);
  }

  @Delete('interactions/:id/answer')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAnswer(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.interactions.deleteAnswer(id);
  }
}
