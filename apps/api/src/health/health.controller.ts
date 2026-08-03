import { Controller, Get } from '@nestjs/common';

import { PublicRoute } from '../tenancy/route-policy.decorator.js';

export interface HealthResponse {
  service: 'api';
  status: 'ok';
}

@Controller('health')
export class HealthController {
  @Get()
  @PublicRoute()
  getHealth(): HealthResponse {
    return {
      service: 'api',
      status: 'ok',
    };
  }
}
