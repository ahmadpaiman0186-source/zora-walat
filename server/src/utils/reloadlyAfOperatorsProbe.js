import { env } from '../config/env.js';
import { getOperators, isReloadlyConfigured } from '../services/reloadlyClient.js';

/**
 * One-shot validation: Afghanistan operator list (count + small sample). No secrets.
 * Safe to no-op when Reloadly is not selected or not configured.
 */
export async function logReloadlyAfOperatorsSample() {
  if (env.airtimeProvider !== 'reloadly') return;
  if (!isReloadlyConfigured()) return;

  const r = await getOperators('AF');
  if (!r.ok) {
    console.log(
      JSON.stringify({
        reloadlyAfOperatorsProbe: 'error',
        failureCode: r.failureCode,
        failureMessage: r.failureMessage,
      }),
    );
    return;
  }

  const ops = r.operators ?? [];
  const sample = ops.slice(0, 3).map((o) => {
    if (!o || typeof o !== 'object') return {};
    return {
      id: o.operatorId != null ? o.operatorId : o.id,
      name: o.name != null ? String(o.name).slice(0, 80) : null,
    };
  });

  console.log(
    JSON.stringify({
      reloadlyAfOperatorsProbe: 'ok',
      countryCode: 'AF',
      count: ops.length,
      sample,
    }),
  );
}
