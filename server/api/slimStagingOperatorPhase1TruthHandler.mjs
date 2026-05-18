/**
 * Slim GET post-payment incident + lifecycle for staging operator harness (L-11 verify).
 * Read-only PaymentCheckout row — avoids full Express cold start on
 * `GET /api/orders/:id/phase1-truth`.
 *
 * Gate: `STAGING_ALLOW_OPERATOR_ORDER_STATUS=true` (same as slim order-status).
 */
import { AUTH_ERROR_CODE } from '../src/constants/authErrors.js';
import { POST_PAYMENT_INCIDENT_STATUS } from '../src/constants/postPaymentIncidentStatus.js';
import { clientErrorBody } from '../src/lib/clientErrorJson.js';
import { isLikelyPaymentCheckoutId } from '../src/lib/paymentCheckoutId.js';
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

export const STAGING_OPERATOR_PHASE1_TRUTH_PATH_PREFIX =
  '/api/ops/staging-operator-phase1-truth/';

const ALLOWED_INCIDENT = new Set(Object.values(POST_PAYMENT_INCIDENT_STATUS));

function gateEnabled() {
  return (
    String(process.env.STAGING_ALLOW_OPERATOR_ORDER_STATUS ?? '')
      .trim()
      .toLowerCase() === 'true'
  );
}

/**
 * @param {string | null | undefined} raw
 * @returns {string}
 */
export function normalizePostPaymentIncidentStatus(raw) {
  const t = typeof raw === 'string' ? raw.trim() : '';
  return ALLOWED_INCIDENT.has(t) ? t : POST_PAYMENT_INCIDENT_STATUS.NONE;
}

function safeJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

/**
 * @param {import('http').IncomingMessage} req
 */
function bearerToken(req) {
  const h = req.headers?.authorization;
  if (typeof h !== 'string' || !h.startsWith('Bearer ')) return null;
  const t = h.slice(7).trim();
  return t.length > 0 ? t : null;
}

/**
 * @param {string} url
 */
export function orderIdFromStagingOperatorPhase1TruthUrl(url) {
  const pathOnly = String(url ?? '').split('?')[0];
  const normalized =
    pathOnly.length > 1 && pathOnly.endsWith('/')
      ? pathOnly.slice(0, -1)
      : pathOnly;
  if (!normalized.startsWith(STAGING_OPERATOR_PHASE1_TRUTH_PATH_PREFIX)) {
    return '';
  }
  return normalized.slice(STAGING_OPERATOR_PHASE1_TRUTH_PATH_PREFIX.length).trim();
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
export async function handleSlimStagingOperatorPhase1TruthGet(req, res) {
  if (process.env.NODE_ENV !== 'production') {
    primeSlimServerlessEnv();
  }

  if (!gateEnabled()) {
    safeJson(res, 503, {
      orderFound: false,
      reason: 'staging_operator_phase1_truth_disabled',
    });
    return;
  }

  const orderId = orderIdFromStagingOperatorPhase1TruthUrl(req.url ?? '');
  if (!isLikelyPaymentCheckoutId(orderId)) {
    safeJson(res, 400, {
      orderFound: false,
      reason: 'invalid_order_id',
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

  const row = await prisma.paymentCheckout.findFirst({
    where: { id: orderId, userId },
    select: {
      orderStatus: true,
      status: true,
      postPaymentIncidentStatus: true,
      postPaymentIncidentMapSource: true,
    },
  });

  if (!row) {
    safeJson(res, 404, { orderFound: false, reason: 'not_found' });
    return;
  }

  const incidentStatus = normalizePostPaymentIncidentStatus(row.postPaymentIncidentStatus);
  const rawMap =
    typeof row.postPaymentIncidentMapSource === 'string'
      ? row.postPaymentIncidentMapSource.trim()
      : '';
  const mapSource = rawMap.length > 0 ? rawMap : null;

  safeJson(res, 200, {
    orderFound: true,
    orderStatus: String(row.orderStatus ?? 'unknown'),
    paymentStatus: String(row.status ?? 'unknown'),
    postPaymentIncidentStatus: incidentStatus,
    postPaymentIncidentMapSource: mapSource,
    orderIdSuffix: safeSuffix(orderId, 10),
  });
}
