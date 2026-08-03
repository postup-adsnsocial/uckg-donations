import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ApiConfig } from './api-config.js';

@Injectable()
export class ApiConfigService {
  constructor(
    @Inject(ConfigService)
    private readonly config: ConfigService<ApiConfig, true>,
  ) {}

  get values(): ApiConfig {
    return {
      nodeEnv: this.config.get('nodeEnv', { infer: true }),
      apiPort: this.config.get('apiPort', { infer: true }),
      databaseUrl: this.config.get('databaseUrl', { infer: true }),
      webOrigins: this.config.get('webOrigins', { infer: true }),
      trustProxy: this.config.get('trustProxy', { infer: true }),
      metricsToken: this.config.get('metricsToken', { infer: true }),
      bodyLimit: this.config.get('bodyLimit', { infer: true }),
      dbPoolMax: this.config.get('dbPoolMax', { infer: true }),
      dbConnectionTimeoutMs: this.config.get('dbConnectionTimeoutMs', {
        infer: true,
      }),
      dbIdleTimeoutMs: this.config.get('dbIdleTimeoutMs', { infer: true }),
      dbStatementTimeoutMs: this.config.get('dbStatementTimeoutMs', {
        infer: true,
      }),
      dbReadyTimeoutMs: this.config.get('dbReadyTimeoutMs', { infer: true }),
      loginSourceLimit: this.config.get('loginSourceLimit', { infer: true }),
      loginSourceWindowMs: this.config.get('loginSourceWindowMs', {
        infer: true,
      }),
      loginAccountLimit: this.config.get('loginAccountLimit', { infer: true }),
      loginAccountWindowMs: this.config.get('loginAccountWindowMs', {
        infer: true,
      }),
    };
  }
}
