import { ORDER_API_ERROR_CODE } from '../constants/apiContractCodes.js';
import { prisma } from '../db.js';
import { clientErrorBody } from '../lib/clientErrorJson.js';
import { isLikelyPaymentCheckoutId } from '../lib/paymentCheckoutId.js';
import { deriveCustomerFulfillmentView } from '../lib/customerVisibleOrderStatus.js';
import { getCanonicalPhase1OrderForUser } from '../services/canonicalPhase1OrderService.js';
import { pricingBreakdownFromSnapshot } from '../lib/checkoutPricingBreakdown.js';
import {
  deriveCustomerTrackingStageForOrder,
  derivePublicLifecycleStage,
} from '../services/transactionsService.js';

const publicSelect = {
  id: true,
  orderStatus: true,
  status: true,
  currency: true,
  amountUsdCents: true,
  packageId: true,
  provider: true,
  operatorKey: true,
  stripeCheckoutSessionId: true,
  stripePaymentIntentId: true,
  paidAt: true,
  failedAt: true,
  cancelledAt: true,
  failureReason: true,
  metadata: true,
  clientOrigin: true,
  createdAt: true,
  updatedAt: true,
  pricingSnapshot: true,
};

/**
 * @param {object} row
 * @param {Pick<import('@prisma/client').FulfillmentAttempt, 'status' | 'failureReason'> | null} [latestAttempt]
 */
function toPublicOrder(row, latestAttempt = null) {
  const customerVisible = deriveCustomerFulfillmentView(row, latestAttempt);
  const pricingBreakdown = pricingBreakdownFromSnapshot(
    row.pricingSnapshot,
    row.amountUsdCents,
  );
  const trackingStageKey = deriveCustomerTrackingStageForOrder(row, latestAttempt);
  const lifecycleStageKey = derivePublicLifecycleStage(
    trackingStageKey,
    row,
    latestAttempt,
  );
  return {
    id: row.id,
    orderStatus: row.orderStatus,
    status: row.status,
    currency: row.currency,
    amountUsdCents: row.amountUsdCents,
    packageId: row.packageId,
    provider: row.provider,
    operatorKey: row.operatorKey,
    stripeCheckoutSessionId: row.stripeCheckoutSessionId,
    stripePaymentIntentId: row.stripePaymentIntentId,
    paidAt: row.paidAt,
    failedAt: row.failedAt,
    cancelledAt: row.cancelledAt,
    failureReason: row.failureReason,
    clientOrigin: row.clientOrigin,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    customerVisible,
    pricingBreakdown,
    /** Mirrors `/api/transactions` + execute payloads — Flutter success hydration uses GET /api/orders/:id. */
    trackingStageKey,
    lifecycleStageKey,
  };
}

export async function listOrders(req, res) {
  const userId = req.user.id;
  const raw = parseInt(String(req.query.limit ?? '20'), 10);
  const limit = Number.isFinite(raw) ? Math.min(50, Math.max(1, raw)) : 20;

  const rows = await prisma.paymentCheckout.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      ...publicSelect,
      fulfillmentAttempts: {
        orderBy: { attemptNumber: 'desc' },
        take: 1,
        select: { status: true, failureReason: true },
      },
    },
  });

  res.json({
    orders: rows.map((r) => {
      const latest = r.fulfillmentAttempts?.[0] ?? null;
      const { fulfillmentAttempts: _fa, ...rest } = r;
      return toPublicOrder(rest, latest);
    }),
  });
}

export async function getOrderById(req, res) {
  const id = req.params.id;
  if (!isLikelyPaymentCheckoutId(id)) {
    return res
      .status(400)
      .json(
        clientErrorBody('Invalid order id', ORDER_API_ERROR_CODE.INVALID_ORDER_ID),
      );
  }
  const userId = req.user.id;

  const row = await prisma.paymentCheckout.findFirst({
    where: { id, userId },
    select: {
      ...publicSelect,
      fulfillmentAttempts: {
        orderBy: { attemptNumber: 'desc' },
        take: 1,
        select: { status: true, failureReason: true },
      },
    },
  });
  if (!row) {
    return res
      .status(404)
      .json(clientErrorBody('Not found', ORDER_API_ERROR_CODE.NOT_FOUND));
  }
  const latest = row.fulfillmentAttempts?.[0] ?? null;
  const { fulfillmentAttempts: _fa, ...rest } = row;
  res.json({ order: toPublicOrder(rest, latest) });
}

const SESSION_ID_RE = /^cs_[a-zA-Z0-9]+$/;

export async function getOrderByStripeSession(req, res) {
  const sessionId = req.params.sessionId;
  if (!SESSION_ID_RE.test(sessionId)) {
    return res
      .status(400)
      .json(
        clientErrorBody('Invalid session id', ORDER_API_ERROR_CODE.INVALID_SESSION_ID),
      );
  }
  const userId = req.user.id;

  const row = await prisma.paymentCheckout.findFirst({
    where: { userId, stripeCheckoutSessionId: sessionId },
    select: {
      ...publicSelect,
      fulfillmentAttempts: {
        orderBy: { attemptNumber: 'desc' },
        take: 1,
        select: { status: true, failureReason: true },
      },
    },
  });
  if (!row) {
    return res
      .status(404)
      .json(clientErrorBody('Not found', ORDER_API_ERROR_CODE.NOT_FOUND));
  }
  const latest = row.fulfillmentAttempts?.[0] ?? null;
  const { fulfillmentAttempts: _fa, ...rest } = row;
  res.json({ order: toPublicOrder(rest, latest) });
}

/**
 * Phase 1 MOBILE_TOPUP canonical read model (support / ops / finance).
 * Auth: same as other `/api/orders/*` routes — JWT, owner-only (`userId` match).
 */
export async function getPhase1CanonicalOrder(req, res) {
  const id = req.params.id;
  if (!isLikelyPaymentCheckoutId(id)) {
    return res
      .status(400)
      .json(
        clientErrorBody('Invalid order id', ORDER_API_ERROR_CODE.INVALID_ORDER_ID),
      );
  }
  const userId = req.user.id;
  req.log?.info?.(
    {
      traceId: req.traceId,
      checkoutIdSuffix: id.slice(-10),
      kind: 'phase1_canonical_read',
    },
    'phase1_canonical_order',
  );
  const phase1 = await getCanonicalPhase1OrderForUser(id, userId);
  if (!phase1) {
    return res
      .status(404)
      .json(clientErrorBody('Not found', ORDER_API_ERROR_CODE.NOT_FOUND));
  }
  res.json({ phase1Order: phase1 });
}
