import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { TenancyModule } from '../tenancy/tenancy.module.js';
import { MembersController } from './members.controller.js';
import { MembersService } from './members.service.js';

@Module({
  controllers: [MembersController],
  imports: [AuthModule, TenancyModule],
  providers: [MembersService],
})
export class MembersModule {}
