import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { CustomersModule } from './admin/customers/customers.module';
import { InteractionsModule } from './admin/interactions/interactions.module';
import { TrackingLinksModule } from './admin/tracking-links/tracking-links.module';
import { UseCasesModule } from './admin/use-cases/use-cases.module';
import { PortalModule } from './portal/portal.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    PrismaModule,
    AuthModule,
    CustomersModule,
    InteractionsModule,
    TrackingLinksModule,
    UseCasesModule,
    PortalModule,
  ],
})
export class AppModule {}
