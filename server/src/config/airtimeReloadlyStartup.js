import { env } from './env.js';
import { shouldBlockPhase1ReloadlyOutbound } from '../domain/fulfillment/fulfillmentOutboundPolicy.js';
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
  const map = env.reloadlyOperatorMap && typeof env.reloadlyOperatorMap === 'object' ? env.reloadlyOperatorMap : {};
  const reloadlyOperatorMapConfiguredCount = Object.values(map).filter(
    (v) => String(v ?? '').trim() !== '',
  ).length;
  const reloadlyAirtimeSandboxActive = provider === 'reloadly' && env.reloadlySandbox === true;
  const phase1FulfillmentOutboundEnabled = env.phase1FulfillmentOutboundEnabled === true;
  const reloadlyOutboundHttpBlocked = shouldBlockPhase1ReloadlyOutbound(
    process.env.NODE_ENV,
    { phase1FulfillmentOutboundEnabled },
  );

  return {
    airtimeProvider: provider,
    reloadlySandbox: env.reloadlySandbox,
    /** Explicit gate: Reloadly HTTP only runs when true (non-test) — see `fulfillmentOutboundPolicy.js`. */
    phase1FulfillmentOutboundEnabled,
    /** When true, `runDeliveryAdapter` returns `fulfillment_outbound_disabled` before any Reloadly call. */
    reloadlyOutboundHttpBlocked,
    reloadlyCredentialsPresent: credsPresent,
    reloadlyTopupsAudienceConfigured: Boolean(String(env.reloadlyBaseUrl ?? '').trim()),
    mockFallbackExplicitlyAllowed: env.reloadlyAllowUnavailableMockFallback === true,
    reloadlyOperatorMapConfiguredCount,
    /**
     * Runbook-oriented signals for first controlled sandbox drill (`GET /ready`). No secrets.
     */
    sandboxExecutionReadiness: {
      reloadlyAirtimeSandboxActive,
      operatorMappingSatisfied: provider !== 'reloadly' || reloadlyOperatorMapConfiguredCount > 0,
      prelaunchLockdownBlocksCheckoutFlow: env.prelaunchLockdown === true,
      processingRecoveryWorkerEnabled: env.processingRecoveryEnabled === true,
      processingRecoveryPollMs: env.processingRecoveryPollMs,
      conservativeSandboxRecoverySuppressionEnabled: env.processingRecoverySandboxConservative === true,
      /** When true, paid checkout / execute may be unavailable — set false before drill. */
      drillLikelyBlockedByPrelaunch: env.prelaunchLockdown === true,
      /** When true with poll > 0, auto recovery may run during observation — prefer poll 0 for first drill. */
      drillNoiseFromAutoRecovery:
        reloadlyAirtimeSandboxActive &&
        env.processingRecoveryEnabled &&
        env.processingRecoveryPollMs > 0 &&
        !env.processingRecoverySandboxConservative,
    },
  };
}
