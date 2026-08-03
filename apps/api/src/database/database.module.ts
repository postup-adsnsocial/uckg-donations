import { Global, Module } from '@nestjs/common';

import { DatabaseService } from './database.service.js';
import { TenantUnitOfWork } from './tenant-unit-of-work.js';

@Global()
@Module({
  exports: [DatabaseService, TenantUnitOfWork],
  providers: [DatabaseService, TenantUnitOfWork],
})
export class DatabaseModule {}
