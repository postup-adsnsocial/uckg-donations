import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { TenancyModule } from '../tenancy/tenancy.module.js';
import { ChurchesController } from './churches.controller.js';

@Module({
  controllers: [ChurchesController],
  imports: [AuthModule, TenancyModule],
})
export class ChurchesModule {}
