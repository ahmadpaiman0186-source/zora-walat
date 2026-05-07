#!/usr/bin/env node
/**
 * Reloadly real-topup readiness preflight (read-only: no OAuth, no POST /topups, no secret values).
 *
 * Run: npm --prefix server run preflight:reloadly-live
 */
import '../bootstrap.js';

import { evaluateReloadlyLiveReadinessPreflight } from '../src/config/reloadlyLiveReadinessPreflight.js';

const r = evaluateReloadlyLiveReadinessPreflight(process.env);

// eslint-disable-next-line no-console -- CLI contract
console.log(
  JSON.stringify(
    {
      ok: r.ok,
      blockerCount: r.blockers.length,
      warningCount: r.warnings.length,
      blockers: r.blockers,
      warnings: r.warnings,
      checks: r.checks,
    },
    null,
    2,
  ),
);

process.exit(r.ok ? 0 : 1);
