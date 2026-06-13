/**
 * Slim GET order status for staging operator harness (avoids full Express cold start).
 * Requires STAGING_ALLOW_OPERATOR_ORDER_STATUS=true on the deployment.
 */
import { AUTH_ERROR_CODE } from '../src/constants/authErrors.js';
import { ORDER_STATUS } from '../src/constants/orderStatus.js';
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

export const STAGING_OPERATOR_ORDER_STATUS_PATH_PREFIX =
  '/api/ops/staging-operator-order-status/';

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
export function orderIdFromStagingOperatorStatusUrl(url) {
  const pathOnly = String(url ?? '').split('?')[0];
  const normalized =
    pathOnly.length > 1 && pathOnly.endsWith('/')
      ? pathOnly.slice(0, -1)
      : pathOnly;
  if (!normalized.startsWith(STAGING_OPERATOR_ORDER_STATUS_PATH_PREFIX)) {
    return '';
  }
  return normalized.slice(STAGING_OPERATOR_ORDER_STATUS_PATH_PREFIX.length).trim();
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
export async function handleSlimStagingOperatorOrderStatusGet(req, res) {
  if (process.env.NODE_ENV !== 'production') {
    primeSlimServerlessEnv();
  }

  if (!gateEnabled()) {
    safeJson(res, 503, {
      orderFound: false,
      reason: 'staging_operator_order_status_disabled',
    });
    return;
  }

  const orderId = orderIdFromStagingOperatorStatusUrl(req.url ?? '');
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
      paidAt: true,
      _count: { select: { fulfillmentAttempts: true } },
    },
  });

  if (!row) {
    safeJson(res, 404, { orderFound: false, reason: 'not_found' });
    return;
  }

  const lifecycle = String(row.orderStatus ?? 'unknown');
  const payment = String(row.status ?? 'unknown');
  const attemptCount = row._count?.fulfillmentAttempts ?? 0;
  const paidConfirmed =
    lifecycle === ORDER_STATUS.PAID ||
    lifecycle === ORDER_STATUS.PROCESSING ||
    lifecycle === ORDER_STATUS.FULFILLED;

  safeJson(res, 200, {
    orderFound: true,
    orderStatus: lifecycle,
    paymentStatus: payment,
    paidConfirmed,
    fulfillmentAttemptCount: attemptCount,
    fulfillmentDuplicateSafe: paidConfirmed && attemptCount <= 1,
    orderIdSuffix: safeSuffix(orderId, 10),
  });
}
