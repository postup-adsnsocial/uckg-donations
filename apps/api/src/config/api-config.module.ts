import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { fileURLToPath } from 'node:url';

import { validateApiEnvironment } from './api-config.js';
import { ApiConfigService } from './api-config.service.js';

@Global()
@Module({
  exports: [ApiConfigService],
  imports: [
    ConfigModule.forRoot({
      cache: true,
      envFilePath: fileURLToPath(new URL('../../../../.env', import.meta.url)),
      isGlobal: true,
      validate: validateApiEnvironment,
    }),
  ],
  providers: [ApiConfigService],
})
export class ApiConfigModule {}
