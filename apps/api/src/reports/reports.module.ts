import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { DonationsModule } from '../donations/donations.module.js';
import { TenancyModule } from '../tenancy/tenancy.module.js';
import { PrivateObjectStorage } from '../storage/private-object-storage.js';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';

@Module({
  controllers: [ReportsController],
  imports: [AuthModule, DonationsModule, TenancyModule],
  providers: [ReportsService, PrivateObjectStorage],
})
export class ReportsModule {}
