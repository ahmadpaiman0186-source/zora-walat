/**
 * Evaluates production money-path safety without side effects (for tests).
 * @param {NodeJS.ProcessEnv} processEnv
 * @returns {{ ok: true } | { ok: false, code: string, message: string }}
 */
export function evaluateProductionMoneyPathSafety(processEnv) {
  const nodeEnv = String(processEnv.NODE_ENV ?? '').trim();
  if (nodeEnv !== 'production') {
    return { ok: true };
  }

  if (processEnv.DEV_CHECKOUT_AUTH_BYPASS === 'true') {
    return {
      ok: false,
      code: 'dev_checkout_bypass_in_production',
      message:
        'DEV_CHECKOUT_AUTH_BYPASS=true must not be set when NODE_ENV=production (TEMP TEST MODE).',
    };
  }

  const airtime = String(processEnv.AIRTIME_PROVIDER ?? 'mock').trim().toLowerCase();
  if (airtime === 'mock' && processEnv.ALLOW_MOCK_AIRTIME_IN_PRODUCTION !== 'true') {
    return {
      ok: false,
      code: 'mock_airtime_in_production',
      message:
        'AIRTIME_PROVIDER=mock is not allowed when NODE_ENV=production unless ALLOW_MOCK_AIRTIME_IN_PRODUCTION=true (explicit non-live airtime only).',
    };
  }

  const webtop = String(processEnv.WEBTOPUP_FULFILLMENT_PROVIDER ?? 'mock')
    .trim()
    .toLowerCase();
  if (webtop === 'mock' && processEnv.ALLOW_MOCK_WEBTOPUP_FULFILLMENT_IN_PRODUCTION !== 'true') {
    return {
      ok: false,
      code: 'mock_webtopup_fulfillment_in_production',
      message:
        'WEBTOPUP_FULFILLMENT_PROVIDER=mock is not allowed when NODE_ENV=production unless ALLOW_MOCK_WEBTOPUP_FULFILLMENT_IN_PRODUCTION=true (explicit sandbox path only).',
    };
  }

  if (
    processEnv.RELOADLY_ALLOW_UNAVAILABLE_MOCK_FALLBACK === 'true' &&
    airtime === 'reloadly'
  ) {
    return {
      ok: false,
      code: 'reloadly_mock_fallback_in_production',
      message:
        'RELOADLY_ALLOW_UNAVAILABLE_MOCK_FALLBACK=true must not be used when NODE_ENV=production with AIRTIME_PROVIDER=reloadly (forces unsafe mock fallback).',
    };
  }

  return { ok: true };
}

/**
 * Hard-fail startup when NODE_ENV=production and dangerous dev/sandbox combinations are present.
 * Call after `env` is loaded; mirrors checks in `index.js` for DEV_CHECKOUT_AUTH_BYPASS.
 */
export function assertProductionMoneyPathSafetyOrExit() {
  const r = evaluateProductionMoneyPathSafety(process.env);
  if (r.ok) return;
  console.error(`[fatal] production_safety_gate: ${r.code} — ${r.message}`);
  process.exit(1);
}
