import { Module } from '@nestjs/common';
import { PortalController } from './portal.controller';
import { TrackingService } from './tracking.service';

@Module({
  controllers: [PortalController],
  providers: [TrackingService],
})
export class PortalModule {}
