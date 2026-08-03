import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateApiEnvironment } from './api-config.js';
import { ApiConfigService } from './api-config.service.js';

@Global()
@Module({
  exports: [ApiConfigService],
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      validate: validateApiEnvironment,
    }),
  ],
  providers: [ApiConfigService],
})
export class ApiConfigModule {}
