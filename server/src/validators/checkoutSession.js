import { z } from 'zod';

const operatorKeyEnum = z.enum([
  'roshan',
  'mtn',
  'etisalat',
  'afghanWireless',
]);

/**
 * Strict body: unknown fields rejected. Legacy `amount` (cents) accepted as alias for amountUsdCents.
 */
export const checkoutSessionBodySchema = z
  .object({
    amountUsdCents: z.number().int().positive().max(500_000).optional(),
    amount: z.union([z.number(), z.string()]).optional(),
    currency: z.literal('usd').default('usd'),
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
