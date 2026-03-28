import 'dotenv/config';
import Stripe from 'stripe';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
}

export const config = {
  port: Number(process.env.PORT || 8787),
  databaseUrl: process.env.DATABASE_URL,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  bffApiKey: process.env.BFF_API_KEY || '',
  reloadlySandbox: process.env.RELOADLY_SANDBOX !== 'false',
  reloadlyClientId: process.env.RELOADLY_CLIENT_ID || '',
  reloadlyClientSecret: process.env.RELOADLY_CLIENT_SECRET || '',
  operators: {
    roshan: process.env.RELOADLY_OPERATOR_ROSHAN || '',
    mtn: process.env.RELOADLY_OPERATOR_MTN || '',
    etisalat: process.env.RELOADLY_OPERATOR_ETISALAT || '',
    afghanWireless: process.env.RELOADLY_OPERATOR_AFGHAN_WIRELESS || '',
  },
  maxTopupUsdCentsPerPhonePerDay: Number(
    process.env.MAX_TOPUP_USD_CENTS_PER_PHONE_PER_DAY || 15_000,
  ),
  velocityMaxOrdersPerPhonePerHour: Number(
    process.env.VELOCITY_MAX_ORDERS_PER_PHONE_PER_HOUR || 8,
  ),
  commissionRate: 0.1,
};

let stripeSingleton = null;

/**
 * Stripe client when [config.stripeSecretKey] is set; otherwise `null`.
 * No placeholder keys are stored in the repo (avoids false positives from secret scanning).
 */
export function getStripeClient() {
  const k = (config.stripeSecretKey || '').trim();
  if (!k) return null;
  if (!stripeSingleton) stripeSingleton = new Stripe(k);
  return stripeSingleton;
}

export function reloadlyAudience() {
  return config.reloadlySandbox
    ? 'https://topups-sandbox.reloadly.com'
    : 'https://topups.reloadly.com';
}

export function reloadlyApiBase() {
  return config.reloadlySandbox
    ? 'https://topups-sandbox.reloadly.com'
    : 'https://topups.reloadly.com';
}
