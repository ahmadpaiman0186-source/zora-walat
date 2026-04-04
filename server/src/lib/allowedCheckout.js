import { AIRTIME_SKUS, getAirtimeSku } from './pricing.js';
import { getDataPackageRetailUsdCents, allDataPackageRetailUsdCents } from './dataPackagePricing.js';
import { MOCK_PACKAGE_ECONOMICS } from '../domain/pricing/packageCatalog.js';

/** Operators accepted for checkout metadata (matches catalog + Flutter). */
export const OPERATOR_KEYS = [
  'roshan',
  'mtn',
  'etisalat',
  'afghanWireless',
];

/** Mock package face values (USD cents) — must match `MOCK_PACKAGE_ECONOMICS`. */
const MOCK_PACKAGE_FACE_CENTS = Object.fromEntries(
  Object.entries(MOCK_PACKAGE_ECONOMICS).map(([k, v]) => [
    k,
    v.faceValueUsdCents,
  ]),
);

function uniqueSorted(ints) {
  return [...new Set(ints)].sort((a, b) => a - b);
}

/** All cent amounts the server will accept for Checkout (no client trust beyond picking one of these). */
export const ALLOWED_CHECKOUT_USD_CENTS = new Set(
  uniqueSorted([
    ...AIRTIME_SKUS.map((r) => r.retailUsdCents),
    ...Object.values(MOCK_PACKAGE_FACE_CENTS),
    ...allDataPackageRetailUsdCents(),
    // Flutter recharge home presets ($5–$25)
    500, 1000, 1500, 2000, 2500,
  ]),
);

/**
 * Resolve catalog **face-value** cents (retail) from server catalogs / whitelist only.
 * Checkout charges must use `resolveCheckoutPricing` (domain/pricing) instead.
 * When [packageId] is set, client-sent amounts are ignored — price is never taken from the client.
 * @deprecated Prefer resolveCheckoutPricing for Stripe amounts.
 */
export function resolveTrustedAmountUsdCents({ packageId, amountUsdCents }) {
  if (packageId != null && String(packageId).trim()) {
    const pid = String(packageId).trim();
    if (MOCK_PACKAGE_FACE_CENTS[pid] != null) {
      return {
        ok: true,
        cents: MOCK_PACKAGE_FACE_CENTS[pid],
        source: 'mock_package',
      };
    }
    const sku = getAirtimeSku(pid);
    if (sku) {
      return { ok: true, cents: sku.retailUsdCents, source: 'airtime_sku' };
    }
    const dataCents = getDataPackageRetailUsdCents(pid);
    if (dataCents != null) {
      return { ok: true, cents: dataCents, source: 'data_package' };
    }
    return { ok: false, error: 'Unknown packageId' };
  }
  const n = Number(amountUsdCents);
  if (!Number.isInteger(n) || n < 50 || n > 500_000) {
    return { ok: false, error: 'Invalid amountUsdCents' };
  }
  if (!ALLOWED_CHECKOUT_USD_CENTS.has(n)) {
    return { ok: false, error: 'Amount not in allowed price list' };
  }
  return { ok: true, cents: n, source: 'allowed_amount' };
}

/**
 * When both are present, package IDs must be namespaced by operator (except mock_*).
 */
export function validatePackageOperatorPair(packageId, operatorKey) {
  if (!packageId?.trim() || !operatorKey) {
    return { ok: true };
  }
  const pid = String(packageId).trim();
  if (pid.startsWith('mock_')) {
    return { ok: true };
  }
  const prefix = `${operatorKey}_`;
  if (!pid.startsWith(prefix)) {
    return {
      ok: false,
      error: 'packageId does not match operatorKey',
    };
  }
  return { ok: true };
}
