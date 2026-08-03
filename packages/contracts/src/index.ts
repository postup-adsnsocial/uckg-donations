import { z } from 'zod';

export const healthResponseSchema = z.object({
  service: z.enum(['api', 'worker']),
  status: z.enum(['ok', 'ready']),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
