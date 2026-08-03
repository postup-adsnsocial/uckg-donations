import { describe, expect, it } from 'vitest';

import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  it('reports that the API is healthy', () => {
    expect(new HealthController().getHealth()).toEqual({
      service: 'api',
      status: 'ok',
    });
  });
});
