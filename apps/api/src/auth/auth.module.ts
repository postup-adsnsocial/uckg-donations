import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { SessionAuthGuard } from './session-auth.guard.js';

@Module({
  controllers: [AuthController],
  exports: [AuthService, SessionAuthGuard],
  providers: [AuthService, SessionAuthGuard],
})
export class AuthModule {}
