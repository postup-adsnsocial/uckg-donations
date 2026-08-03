import { Module } from '@nestjs/common';

import { AuthModule } from './auth/auth.module.js';
import { ChurchesModule } from './churches/churches.module.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthController } from './health/health.controller.js';
import { TenancyModule } from './tenancy/tenancy.module.js';

@Module({
  controllers: [HealthController],
  imports: [DatabaseModule, AuthModule, TenancyModule, ChurchesModule],
})
export class AppModule {}
