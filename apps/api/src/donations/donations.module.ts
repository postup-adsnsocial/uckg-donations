import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { TenancyModule } from '../tenancy/tenancy.module.js';
import { DonationsController } from './donations.controller.js';
import { DonationsService } from './donations.service.js';

@Module({
  controllers: [DonationsController],
  imports: [AuthModule, TenancyModule],
  providers: [DonationsService],
})
export class DonationsModule {}
