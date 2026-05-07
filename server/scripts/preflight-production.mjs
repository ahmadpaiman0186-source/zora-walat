#!/usr/bin/env node
/**
 * Production deployment preflight (no deploy, no live payment enablement).
 * Loads server/.env via bootstrap, then evaluates a production env profile (fail-closed list).
 *
 * Run: npm --prefix server run preflight:production
 */
import '../bootstrap.js';

import { buildProductionPreflightMergedEnv } from '../src/config/productionPreflightEnvMerge.js';
import { evaluateProductionDeploymentPreflight } from '../src/config/productionDeploymentPreflight.js';

const { env: mergedEnv, syntheticOwnerGateApplied } =
  buildProductionPreflightMergedEnv(process.env);
if (syntheticOwnerGateApplied) {
  // eslint-disable-next-line no-console -- operator visibility (no secrets)
  console.warn(
    '[preflight:production] ZW_PRODUCTION_PREFLIGHT_SYNTHETIC_OWNER_GATE=true — using non-routable placeholder for owner gate evaluation only.',
  );
}
const r = evaluateProductionDeploymentPreflight(mergedEnv);
const warnings = [...r.warnings];
if (syntheticOwnerGateApplied) {
  warnings.push(
    'production_preflight: ZW_PRODUCTION_PREFLIGHT_SYNTHETIC_OWNER_GATE=true — owner gate used a non-routable placeholder for evaluation only; set real ZW_REQUIRE_OWNER_ALLOWED_EMAIL + OWNER_ALLOWED_EMAIL before any real production deploy',
  );
}

// eslint-disable-next-line no-console -- CLI contract
console.log(
  JSON.stringify(
    {
      ok: r.ok,
      blockerCount: r.blockers.length,
      warningCount: warnings.length,
      blockers: r.blockers,
      warnings,
      checks: {
        ...r.checks,
        syntheticOwnerGateApplied,
      },
    },
    null,
    2,
  ),
);

process.exit(r.ok ? 0 : 1);
