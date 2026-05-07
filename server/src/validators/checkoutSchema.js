/**
 * Layer 1 edge schema for POST /checkout-pricing-quote (and root alias).
 * Fail-closed: strict object (unknown keys rejected), no string→number coercion for money fields.
 * `destinationCountry` is allowed only for early restricted-region middleware (stripped before `req.validated`).
 *
 * Amount bounds match `checkoutSessionBodySchema` (max 500_000 cents) to avoid pricing regressions.
 */
import { z } from 'zod';

import { operatorKeyEnum, senderCountryEnum } from './checkoutSession.js';

/** ISO-style region token for restricted-region collection (middleware runs before route). */
const regionToken = z
  .string()
  .trim()
  .min(2)
  .max(3)
  .transform((s) => s.toUpperCase());

const recipientPhoneDigits = z
  .string()
  .trim()
  .regex(/^\d{7,15}$/, 'recipientPhone must be 7–15 digits, no spaces');

function trimStringOrPass(v) {
  if (typeof v === 'string') return v.trim();
  return v;
}

function trimOptionalStringOrPass(v) {
  if (v === undefined || v === null) return undefined;
  if (typeof v === 'string') return v.trim();
  return v;
}

export const checkoutPricingQuoteEdgeSchema = z
  .object({
    currency: z.literal('usd').default('usd'),
    senderCountry: z.preprocess(trimStringOrPass, senderCountryEnum),
    /** Optional; used only by upstream `blockRestrictedCountries` — stripped from `req.validated`. */
    destinationCountry: regionToken.optional(),
    amountUsdCents: z.number().int().min(100).max(500_000).optional(),
    /** Explicit integer only (no string coercion at the edge). */
    amount: z.number().int().min(100).max(500_000).optional(),
    operatorKey: z.preprocess(trimOptionalStringOrPass, operatorKeyEnum.optional()),
    recipientPhone: z.preprocess(trimOptionalStringOrPass, recipientPhoneDigits.optional()),
    packageId: z.string().trim().min(1).max(128).optional(),
  })
  .strict()
  .superRefine((d, ctx) => {
    const hasPkg = d.packageId != null && String(d.packageId).trim().length > 0;
    const hasCents =
      d.amountUsdCents != null && Number.isInteger(d.amountUsdCents);
    const hasAmount = d.amount != null && Number.isInteger(d.amount);
    if (!hasPkg && !hasCents && !hasAmount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'packageId or amountUsdCents (or explicit integer amount) is required',
        path: ['amountUsdCents'],
      });
    }
    const op = d.operatorKey;
    const ph = d.recipientPhone;
    if ((op == null) !== (ph == null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'operatorKey and recipientPhone must both be provided together',
        path: ['operatorKey'],
      });
    }
  });

/** Keys allowed into `checkoutSessionBodySchema.parse` after edge success. */
const CHECKOUT_SESSION_INPUT_KEYS = new Set([
  'currency',
  'senderCountry',
  'amountUsdCents',
  'amount',
  'operatorKey',
  'recipientPhone',
  'packageId',
]);

/**
 * @param {z.infer<typeof checkoutPricingQuoteEdgeSchema>} edge
 * @returns {Record<string, unknown>}
 */
export function toCheckoutSessionParseInput(edge) {
  /** @type {Record<string, unknown>} */
  const o = {};
  for (const k of CHECKOUT_SESSION_INPUT_KEYS) {
    if (k in edge && edge[k] !== undefined) o[k] = edge[k];
  }
  return o;
}

/**
 * @param {z.infer<typeof checkoutPricingQuoteEdgeSchema>} edge
 * @returns {z.infer<typeof checkoutPricingQuoteEdgeSchema>}
 */
export function normalizeCheckoutQuoteEdge(edge) {
  const d = { ...edge };
  if (typeof d.senderCountry === 'string') d.senderCountry = d.senderCountry.trim();
  if (typeof d.destinationCountry === 'string') {
    d.destinationCountry = d.destinationCountry.trim().toUpperCase();
  }
  if (typeof d.packageId === 'string') d.packageId = d.packageId.trim();
  if (typeof d.recipientPhone === 'string') d.recipientPhone = d.recipientPhone.trim();
  if (typeof d.currency === 'string') d.currency = d.currency.trim().toLowerCase();
  return d;
}
