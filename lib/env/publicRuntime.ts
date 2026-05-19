/**
 * Next.js client-only public configuration (NEXT_PUBLIC_*).
 * Centralizes reads so env usage stays explicit and grep-friendly.
 *
 * Values are inlined at build time for production bundles; in dev they refresh when the
 * Next.js dev server restarts after editing `.env.local` at the repo root.
 */

const PK_LINE =
  /^pk_(test|live)_[A-Za-z0-9_]+$/;

export function getStripePublishableKey(): string {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? '';
}

export function getPublicApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
}

/** When true, show a small staging-only badge (set NEXT_PUBLIC_ZW_APP_ENV=staging). */
export function isStagingPreviewApp(): boolean {
  const v = String(process.env.NEXT_PUBLIC_ZW_APP_ENV ?? '')
    .trim()
    .toLowerCase();
  return v === 'staging' || v === 'preview';
}

export type StripePublishableKeyDiagnostics = {
  present: boolean;
  malformed: boolean;
  maskedPreview: string;
};

/** Mask for UI — never exposes full key. */
export function maskStripePublishableKeyForUi(raw: string): string {
  const k = String(raw ?? '').trim();
  if (!k) return '(none)';
  if (!k.startsWith('pk_')) return '(invalid prefix)';
  const head = k.slice(0, Math.min(16, k.length));
  const tail = k.length > 8 ? k.slice(-4) : '';
  return `${head}…${tail}`;
}

export function getStripePublishableKeyDiagnostics(): StripePublishableKeyDiagnostics {
  const raw = getStripePublishableKey();
  const present = raw.length > 0;
  const malformed =
    present &&
    (raw.length < 24 ||
      raw.length > 256 ||
      /\s/.test(raw) ||
      !PK_LINE.test(raw));
  return {
    present,
    malformed,
    maskedPreview: maskStripePublishableKeyForUi(raw),
  };
}

/**
 * Safe diagnostic for devtools only (never log full key).
 * @deprecated Prefer getStripePublishableKeyDiagnostics for structured checks.
 */
export function describeStripePublishableKey(): {
  present: boolean;
  length: number;
  prefix: string;
} {
  const k = getStripePublishableKey();
  const d = getStripePublishableKeyDiagnostics();
  return {
    present: d.present,
    length: k.length,
    prefix: k.slice(0, 12),
  };
}

/** Effective key for Stripe.js — empty when missing or structurally invalid (fail-fast). */
export function getEffectiveStripePublishableKey(): string {
  const d = getStripePublishableKeyDiagnostics();
  if (!d.present || d.malformed) return '';
  return getStripePublishableKey();
}

/** Investor-safe message — no env var names, paths, or masked key previews. */
export function buildStripePublishableKeyCustomerMessage(
  diag: StripePublishableKeyDiagnostics,
): string {
  if (diag.present && diag.malformed) {
    return 'Payment setup is incomplete. Contact support if this persists.';
  }
  return 'Payment is not available on this deployment. Contact support if this persists.';
}

/**
 * Developer setup hint (local dev only). Masked preview when malformed — never full key.
 */
export function buildStripePublishableKeyDevSetupMessage(
  diag: StripePublishableKeyDiagnostics,
): string {
  const required = 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY';
  const rootHint =
    '.env.local at the repository root (same folder as package.json — not inside server/).';
  const restart =
    'Restart the Next.js dev server after editing .env.local.';

  if (diag.present && diag.malformed) {
    return (
      `Malformed Stripe publishable key. Detected value (masked): ${diag.maskedPreview}. ` +
      `Must start with pk_test_ or pk_live_, ASCII only, no spaces or quotes. ` +
      `Fix ${required} in ${rootHint} ${restart}`
    );
  }

  return (
    `Stripe publishable key is missing for the Next.js app. Set ${required} in ${rootHint} ` +
    `${restart} If you only added it to server/.env.local, copy it to the repo root.`
  );
}

/** Customer-safe in production; detailed dev hint when NODE_ENV is development. */
export function buildStripePublishableKeySetupMessage(
  diag: StripePublishableKeyDiagnostics,
): string {
  if (process.env.NODE_ENV === 'development') {
    return buildStripePublishableKeyDevSetupMessage(diag);
  }
  return buildStripePublishableKeyCustomerMessage(diag);
}
