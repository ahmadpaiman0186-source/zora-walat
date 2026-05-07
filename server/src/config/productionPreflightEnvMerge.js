/**
 * Optional merge for `evaluateProductionDeploymentPreflight` on dev/CI hosts where
 * `OWNER_ALLOWED_EMAIL` / `ZW_REQUIRE_OWNER_ALLOWED_EMAIL` are intentionally unset.
 *
 * **Never** set `ZW_PRODUCTION_PREFLIGHT_SYNTHETIC_OWNER_GATE=true` on a real production
 * workload — use real operator email + `ZW_REQUIRE_OWNER_ALLOWED_EMAIL=true` instead.
 * This path exists so automated `release:gate` can validate Stripe/CORS/Reloadly/JWT
 * without committing operator identity to repo env files.
 */

import { envStrictTrue } from '../lib/localCheckoutProofRuntime.js';

/** Non-routable placeholder; valid email shape for OWNER_EMAIL_RE in preflight. */
export const PRODUCTION_PREFLIGHT_SYNTHETIC_OWNER_EMAIL =
  'production-preflight-synthetic@zora-walat.invalid';

/**
 * @param {NodeJS.ProcessEnv} sourceEnv
 * @returns {{ env: NodeJS.ProcessEnv, syntheticOwnerGateApplied: boolean }}
 */
export function buildProductionPreflightMergedEnv(sourceEnv = process.env) {
  if (!envStrictTrue(sourceEnv.ZW_PRODUCTION_PREFLIGHT_SYNTHETIC_OWNER_GATE)) {
    return { env: { ...sourceEnv }, syntheticOwnerGateApplied: false };
  }
  return {
    env: {
      ...sourceEnv,
      ZW_REQUIRE_OWNER_ALLOWED_EMAIL: 'true',
      OWNER_ALLOWED_EMAIL: PRODUCTION_PREFLIGHT_SYNTHETIC_OWNER_EMAIL,
    },
    syntheticOwnerGateApplied: true,
  };
}
