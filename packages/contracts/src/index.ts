import { z } from 'zod';

export const healthResponseSchema = z.object({
  service: z.enum(['api', 'worker']),
  status: z.enum(['ok', 'ready']),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const loginRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(1).max(128),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const churchIdSchema = z.string().uuid();
