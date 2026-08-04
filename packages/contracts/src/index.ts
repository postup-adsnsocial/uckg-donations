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

const optionalEmailSchema = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().toLowerCase().email().max(320).optional(),
);

const optionalPhoneSchema = z.preprocess(
  (value) => {
    if (value === '') return undefined;
    return typeof value === 'string'
      ? value.trim().replace(/[\s().-]/g, '')
      : value;
  },
  z
    .string()
    .trim()
    .regex(/^\+[1-9][0-9]{7,14}$/)
    .optional(),
);

const emptyStringToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const optionalAddressTextSchema = (maxLength: number) =>
  z.preprocess(
    emptyStringToUndefined,
    z.string().trim().min(2).max(maxLength).optional(),
  );

export const createMemberRequestSchema = z.object({
  addressLine1: optionalAddressTextSchema(200),
  addressLine2: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().max(200).optional(),
  ),
  city: optionalAddressTextSchema(120),
  country: z.string().trim().length(2).default('US'),
  email: optionalEmailSchema,
  fullName: z.string().trim().min(2).max(160),
  notes: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().trim().max(1000).optional(),
  ),
  phone: optionalPhoneSchema,
  postalCode: z.preprocess(
    emptyStringToUndefined,
    z
      .string()
      .trim()
      .regex(/^\d{5}(?:-\d{4})?$/)
      .optional(),
  ),
  region: optionalAddressTextSchema(50),
  status: z.enum(['active', 'inactive']).default('active'),
});

export type CreateMemberRequest = z.infer<typeof createMemberRequestSchema>;

export const memberSchema = z.object({
  addressLine1: z.string().nullable(),
  addressLine2: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string(),
  createdAt: z.string().datetime(),
  email: z.string().email().nullable(),
  fullName: z.string(),
  id: z.string().uuid(),
  phone: z.string().nullable(),
  postalCode: z.string().nullable(),
  region: z.string().nullable(),
  notes: z.string().nullable(),
  status: z.enum(['active', 'inactive']),
  deletedAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime(),
});

export type MemberResponse = z.infer<typeof memberSchema>;

export const createDonationRequestSchema = z.object({
  amountCents: z.number().int().positive().max(100_000_000),
  memberId: z.string().uuid().nullable().optional(),
  notes: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().trim().max(500).optional(),
  ),
  receivedOn: z.iso.date(),
  paymentMethod: z.enum(['card', 'cash', 'check']),
});

export type CreateDonationRequest = z.infer<typeof createDonationRequestSchema>;

export const donationSchema = z.object({
  amountCents: z.number().int().positive(),
  createdAt: z.string().datetime(),
  envelope: z
    .object({
      contentType: z.string(),
      originalName: z.string(),
      sizeBytes: z.number().int().positive(),
    })
    .nullable(),
  id: z.string().uuid(),
  member: z.object({ id: z.string().uuid(), fullName: z.string() }).nullable(),
  notes: z.string().nullable(),
  operatorName: z.string(),
  paymentMethod: z.enum(['card', 'cash', 'check']),
  receivedOn: z.string(),
});

export type DonationResponse = z.infer<typeof donationSchema>;
