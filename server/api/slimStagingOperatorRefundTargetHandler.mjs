/**
 * Slim GET refund target mapping for L-11 (read-only PaymentCheckout row).
 * Gate: STAGING_ALLOW_OPERATOR_ORDER_STATUS=true
 */
import { AUTH_ERROR_CODE } from '../src/constants/authErrors.js';
import { PAYMENT_CHECKOUT_STATUS } from '../src/constants/paymentCheckoutStatus.js';
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

export const STAGING_OPERATOR_REFUND_TARGET_PATH_PREFIX =
  '/api/ops/staging-operator-refund-target/';

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
 * @param {string} url
 */
export function orderIdFromStagingOperatorRefundTargetUrl(url) {
  const pathOnly = String(url ?? '').split('?')[0];
  const normalized =
    pathOnly.length > 1 && pathOnly.endsWith('/')
      ? pathOnly.slice(0, -1)
      : pathOnly;
  if (!normalized.startsWith(STAGING_OPERATOR_REFUND_TARGET_PATH_PREFIX)) {
    return '';
  }
  return normalized.slice(STAGING_OPERATOR_REFUND_TARGET_PATH_PREFIX.length).trim();
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
export async function handleSlimStagingOperatorRefundTargetGet(req, res) {
  if (process.env.NODE_ENV !== 'production') {
    primeSlimServerlessEnv();
  }

  if (!gateEnabled()) {
    safeJson(res, 503, {
      orderFound: false,
      reason: 'staging_operator_refund_target_disabled',
    });
    return;
  }

  const orderId = orderIdFromStagingOperatorRefundTargetUrl(req.url ?? '');
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
      amountUsdCents: true,
      currency: true,
      stripePaymentIntentId: true,
      postPaymentIncidentStatus: true,
    },
  });

  if (!row) {
    safeJson(res, 404, { orderFound: false, reason: 'not_found' });
    return;
  }

  const pi = String(row.stripePaymentIntentId ?? '').trim();
  const incidentRaw = String(row.postPaymentIncidentStatus ?? '').trim();
  const incident = Object.values(POST_PAYMENT_INCIDENT_STATUS).includes(incidentRaw)
    ? incidentRaw
    : POST_PAYMENT_INCIDENT_STATUS.NONE;

  safeJson(res, 200, {
    orderFound: true,
    orderIdSuffix: safeSuffix(orderId, 10),
    orderStatus: String(row.orderStatus ?? 'unknown'),
    paymentStatus: String(row.status ?? 'unknown'),
    paidConfirmed:
      row.status === PAYMENT_CHECKOUT_STATUS.RECHARGE_COMPLETED ||
      row.status === PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
    amountUsdCents: row.amountUsdCents,
    currency: String(row.currency ?? 'usd'),
    paymentIntentMapped: pi.length > 0,
    stripePaymentIntentIdSuffix: pi.length > 0 ? safeSuffix(pi, 10) : 'unknown',
    postPaymentIncidentStatus: incident,
    refundAlreadyRecordedInApp: incident === POST_PAYMENT_INCIDENT_STATUS.REFUNDED,
  });
}
