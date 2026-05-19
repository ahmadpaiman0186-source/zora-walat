/**
 * Slim GET refundable L-11 candidates for staging operator (read-only, suffix-only).
 */
import { AUTH_ERROR_CODE } from '../src/constants/authErrors.js';
import { ORDER_STATUS } from '../src/constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../src/constants/paymentCheckoutStatus.js';
import { POST_PAYMENT_INCIDENT_STATUS } from '../src/constants/postPaymentIncidentStatus.js';
import { clientErrorBody } from '../src/lib/clientErrorJson.js';
import { safeSuffix } from '../src/lib/webTopupObservability.js';
import {
  isOwnerOnlyEnforced,
  ownerEmailMatchesAllowed,
  ownerOnlyDeniedBody,
} from '../src/middleware/ownerOnlyAccessGuard.js';
import { verifyAccessToken } from '../src/services/authTokenService.js';
import { loadUserForRequest } from '../src/services/authService.js';
import { prisma } from '../src/db.js';
import { primeSlimServerlessEnv } from './slimReadyEnv.mjs';

export const STAGING_OPERATOR_REFUNDABLE_CANDIDATES_PATH =
  '/api/ops/staging-operator-refundable-candidates';

function gateEnabled() {
  return (
    String(process.env.STAGING_ALLOW_OPERATOR_ORDER_STATUS ?? '')
      .trim()
      .toLowerCase() === 'true'
  );
}

function safeJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function bearerToken(req) {
  const h = req.headers?.authorization;
  if (typeof h !== 'string' || !h.startsWith('Bearer ')) return null;
  const t = h.slice(7).trim();
  return t.length > 0 ? t : null;
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
export async function handleSlimStagingOperatorRefundableCandidatesGet(req, res) {
  if (process.env.NODE_ENV !== 'production') {
    primeSlimServerlessEnv();
  }

  if (!gateEnabled()) {
    safeJson(res, 503, {
      candidateCount: 0,
      reason: 'staging_operator_refundable_candidates_disabled',
    });
    return;
  }

  const token = bearerToken(req);
  if (!token) {
    safeJson(res, 401, clientErrorBody('Authentication required', AUTH_ERROR_CODE.AUTH_REQUIRED));
    return;
  }

  let userId;
  try {
    const payload = verifyAccessToken(token);
    const tv =
      typeof payload.tv === 'number'
        ? payload.tv
        : parseInt(String(payload.tv), 10);
    const user = await loadUserForRequest(payload.sub, tv);
    if (!user) {
      safeJson(res, 401, clientErrorBody('Authentication required', AUTH_ERROR_CODE.AUTH_REQUIRED));
      return;
    }
    if (isOwnerOnlyEnforced() && !ownerEmailMatchesAllowed(user.email)) {
      safeJson(res, 403, ownerOnlyDeniedBody());
      return;
    }
    userId = user.id;
  } catch {
    safeJson(res, 401, clientErrorBody('Authentication required', AUTH_ERROR_CODE.AUTH_REQUIRED));
    return;
  }

  const url = new URL(req.url ?? '', 'http://local');
  const limitRaw = parseInt(String(url.searchParams.get('limit') ?? '5'), 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 10) : 5;

  const rows = await prisma.paymentCheckout.findMany({
    where: {
      userId,
      orderStatus: ORDER_STATUS.FULFILLED,
      status: PAYMENT_CHECKOUT_STATUS.RECHARGE_COMPLETED,
      postPaymentIncidentStatus: { not: POST_PAYMENT_INCIDENT_STATUS.REFUNDED },
      stripePaymentIntentId: { not: null },
    },
    orderBy: { paidAt: 'desc' },
    take: limit,
    select: {
      id: true,
      amountUsdCents: true,
      currency: true,
      stripePaymentIntentId: true,
      stripeCheckoutSessionId: true,
    },
  });

  const candidates = rows.map((row) => {
    const pi = String(row.stripePaymentIntentId ?? '').trim();
    const cs = String(row.stripeCheckoutSessionId ?? '').trim();
    return {
      orderIdSuffix: safeSuffix(row.id, 10),
      internalCheckoutIdSuffix: safeSuffix(row.id, 10),
      checkoutSessionIdSuffix: cs.length > 0 ? safeSuffix(cs, 10) : 'unknown',
      paymentIntentIdSuffix: pi.length > 0 ? safeSuffix(pi, 10) : 'unknown',
      amountUsdCents: row.amountUsdCents,
      currency: String(row.currency ?? 'usd'),
      /** Harness-only — never log. */
      orderIdForHarness: row.id,
      paymentIntentIdForVerify: pi,
      checkoutSessionIdForVerify: cs,
    };
  });

  safeJson(res, 200, {
    candidateCount: candidates.length,
    candidates,
  });
}
