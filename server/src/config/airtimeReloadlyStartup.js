import { env } from './env.js';
import { isReloadlyConfigured } from '../services/reloadlyClient.js';

/**
 * Production hardening: payment-checkout airtime must not run Reloadly without credentials.
 */
export function validateAirtimeReloadlyConfigOrExit() {
  if (env.nodeEnv !== 'production') return;
  if (env.airtimeProvider !== 'reloadly') return;
  if (!isReloadlyConfigured()) {
    console.error(
      '[fatal] AIRTIME_PROVIDER=reloadly requires RELOADLY_CLIENT_ID and RELOADLY_CLIENT_SECRET in production',
    );
    process.exit(1);
  }
}

/**
 * Safe diagnostics for ops (stdout / health-adjacent tooling). No secrets.
 */
export function getAirtimeReloadlyDiagnosticsSnapshot() {
  const provider = env.airtimeProvider;
  const credsPresent = isReloadlyConfigured();
  return {
    airtimeProvider: provider,
    reloadlySandbox: env.reloadlySandbox,
    reloadlyCredentialsPresent: credsPresent,
    reloadlyTopupsAudienceConfigured: Boolean(String(env.reloadlyBaseUrl ?? '').trim()),
    mockFallbackExplicitlyAllowed: env.reloadlyAllowUnavailableMockFallback === true,
  };
}
