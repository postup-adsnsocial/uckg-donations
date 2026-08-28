import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { TenancyModule } from '../tenancy/tenancy.module.js';
import { AnnualBookController } from './annual-book.controller.js';
import { AnnualBookService } from './annual-book.service.js';

@Module({
  controllers: [AnnualBookController],
  exports: [AnnualBookService],
  imports: [AuthModule, TenancyModule],
  providers: [AnnualBookService],
})
export class AnnualBookModule {}
