import { z } from 'zod';

const operatorKeyEnum = z.enum([
  'roshan',
  'mtn',
  'etisalat',
  'afghanWireless',
]);

const senderCountryEnum = z.enum(['US', 'CA', 'EU', 'AE', 'TR']);

/**
 * Strict body: unknown fields rejected. Legacy `amount` (cents) accepted as alias for amountUsdCents.
 * Phase 1: [senderCountry] is required — pricing risk buffer is resolved from SenderCountry config.
 * Client must never be trusted for final USD amount; when [packageId] is set, amount fields are ignored for pricing.
 */
export const checkoutSessionBodySchema = z
  .object({
    amountUsdCents: z.number().int().positive().max(500_000).optional(),
    amount: z.union([z.number(), z.string()]).optional(),
    currency: z.literal('usd').default('usd'),
    senderCountry: senderCountryEnum,
    operatorKey: operatorKeyEnum.optional(),
    recipientPhone: z.string().min(3).max(40).optional(),
    packageId: z.string().min(1).max(128).optional(),
  })
  .strict()
  .transform((d) => {
    let cents = d.amountUsdCents;
    if (cents == null && d.amount != null) {
      const n = Math.round(Number(d.amount));
      if (Number.isFinite(n) && n > 0) cents = n;
    }
    return {
      amountUsdCents: cents,
      currency: d.currency,
      senderCountry: d.senderCountry,
      operatorKey: d.operatorKey,
      recipientPhone: d.recipientPhone,
      packageId: d.packageId,
    };
  })
  .refine((d) => d.packageId != null || d.amountUsdCents != null, {
    message: 'packageId or amount / amountUsdCents is required',
    path: ['amountUsdCents'],
  })
  .refine(
    (d) =>
      (d.operatorKey == null && d.recipientPhone == null) ||
      (d.operatorKey != null && d.recipientPhone != null),
    {
      message: 'operatorKey and recipientPhone must both be provided together',
      path: ['operatorKey'],
    },
  );

export const idempotencyKeyHeaderSchema = z.string().uuid();
