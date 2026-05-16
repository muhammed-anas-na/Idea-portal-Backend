import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProductsController, UseCasesController } from './use-cases.controller';
import { UseCasesService } from './use-cases.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProductsController, UseCasesController],
  providers: [UseCasesService],
})
export class UseCasesModule {}
