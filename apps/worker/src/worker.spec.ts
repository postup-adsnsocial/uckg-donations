import { describe, expect, it } from 'vitest';

import { getWorkerStatus } from './worker.js';

describe('worker status', () => {
  it('reports that the process is ready', () => {
    expect(getWorkerStatus()).toEqual({ service: 'worker', status: 'ready' });
  });
});
