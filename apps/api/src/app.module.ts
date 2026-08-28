import { Module } from '@nestjs/common';

import { AnnualBookModule } from './annual-book/annual-book.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ChurchesModule } from './churches/churches.module.js';
import { ApiConfigModule } from './config/api-config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { DonationsModule } from './donations/donations.module.js';
import { HealthController } from './health/health.controller.js';
import { MembersModule } from './members/members.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { TenancyModule } from './tenancy/tenancy.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  controllers: [HealthController],
  imports: [
    ApiConfigModule,
    DatabaseModule,
    AnnualBookModule,
    AuthModule,
    TenancyModule,
    ChurchesModule,
    MembersModule,
    DonationsModule,
    ReportsModule,
    UsersModule,
  ],
})
export class AppModule {}
