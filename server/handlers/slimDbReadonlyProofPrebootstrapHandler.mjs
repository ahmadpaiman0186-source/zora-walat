import {
  evaluatePrebootstrapDbReadonlyProof,
  sendPrebootstrapDbReadonlyProofBlocked,
} from '../lib/prebootstrapDbReadonlyProofGuard.mjs';

/**
 * Pre-bootstrap GET /ops/db-readonly-proof — fail closed before bootstrap/Express/DB proof.
 * @param {import('http').IncomingMessage} req
 * @param {import('express').Response} res
 * @param {{
 *   passThrough?: () => Promise<void>;
 *   evaluate?: typeof evaluatePrebootstrapDbReadonlyProof;
 * }} [options]
 */
export async function handleSlimDbReadonlyProofPrebootstrapGet(req, res, options = {}) {
  const route =
    typeof options.route === 'string' && options.route.length > 0
      ? options.route
      : '/ops/db-readonly-proof';
  const evaluate = options.evaluate ?? evaluatePrebootstrapDbReadonlyProof;
  const decision = evaluate(req, route, options.deps ?? {});

  if (decision.action === 'blocked') {
    sendPrebootstrapDbReadonlyProofBlocked(res, decision.reason, route);
    return;
  }

  const passThrough = options.passThrough;
  if (typeof passThrough === 'function') {
    await passThrough();
    return;
  }

  sendPrebootstrapDbReadonlyProofBlocked(res, 'readonly_url_missing', route);
}
