import { z } from 'zod';

import { normalizeTopupPhone } from '../lib/topupOrderPayload.js';

export const topupOrderCreateSchema = z
  .object({
    sessionKey: z.string().uuid().optional(),
    originCountry: z.string().min(2).max(8),
    destinationCountry: z.string().min(2).max(8),
    productType: z.enum(['airtime', 'data', 'calling']),
    operatorKey: z.string().min(1).max(64),
    operatorLabel: z.string().min(1).max(200),
    phoneNumber: z
      .string()
      .min(1)
      .max(32)
      .transform((s) => normalizeTopupPhone(s))
      .refine((s) => s.length >= 9 && s.length <= 20, {
        message: 'Invalid phone number',
      }),
    productId: z.string().min(1).max(128),
    productName: z.string().min(1).max(200),
    selectedAmountLabel: z.string().min(1).max(200),
    amountCents: z.coerce.number().int().min(50).max(999_999),
    currency: z.literal('usd').default('usd'),
  })
  .strict();

export const topupOrderMarkPaidSchema = z
  .object({
    updateToken: z.string().min(32).max(256),
    paymentIntentId: z.string().min(1).max(64),
    /** Omit when `Authorization: Bearer` matches the order-bound user (recovery path). */
    sessionKey: z.string().uuid().optional(),
  })
  .strict();

export const topupOrderListQuerySchema = z
  .object({
    /** Omit when listing orders for the authenticated user (`Authorization: Bearer`). */
    sessionKey: z.string().uuid().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

export const topupOrderGetQuerySchema = z
  .object({
    /** Omit when recovering via `Authorization: Bearer` for a user-bound order. */
    sessionKey: z.string().uuid().optional(),
  })
  .strict();

export const idempotencyKeyHeaderSchema = z.string().uuid();
