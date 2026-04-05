import { z } from 'zod';

/** Test PaymentIntent — amount in smallest currency unit (USD cents). */
export const createPaymentIntentBodySchema = z
  .object({
    amount: z.coerce.number().int().min(50).max(999_999).optional(),
    /** Optional top-up order id (`tw_ord_…`) to link metadata + validate amount. */
    orderId: z.string().min(1).max(48).optional(),
  })
  .strict();
