import { prisma } from '../db.js';
import { isLikelyPaymentCheckoutId } from '../lib/paymentCheckoutId.js';
import { getCanonicalPhase1OrderForUser } from '../services/canonicalPhase1OrderService.js';

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
  clientOrigin: true,
  createdAt: true,
  updatedAt: true,
};

function toPublicOrder(row) {
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
    select: publicSelect,
  });

  res.json({ orders: rows.map(toPublicOrder) });
}

export async function getOrderById(req, res) {
  const id = req.params.id;
  if (!isLikelyPaymentCheckoutId(id)) {
    return res.status(400).json({ error: 'Invalid order id' });
  }
  const userId = req.user.id;

  const row = await prisma.paymentCheckout.findFirst({
    where: { id, userId },
    select: publicSelect,
  });
  if (!row) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json({ order: toPublicOrder(row) });
}

const SESSION_ID_RE = /^cs_[a-zA-Z0-9]+$/;

export async function getOrderByStripeSession(req, res) {
  const sessionId = req.params.sessionId;
  if (!SESSION_ID_RE.test(sessionId)) {
    return res.status(400).json({ error: 'Invalid session id' });
  }
  const userId = req.user.id;

  const row = await prisma.paymentCheckout.findFirst({
    where: { userId, stripeCheckoutSessionId: sessionId },
    select: publicSelect,
  });
  if (!row) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json({ order: toPublicOrder(row) });
}

/**
 * Phase 1 MOBILE_TOPUP canonical read model (support / ops / finance).
 * Auth: same as other `/api/orders/*` routes — JWT, owner-only (`userId` match).
 */
export async function getPhase1CanonicalOrder(req, res) {
  const id = req.params.id;
  if (!isLikelyPaymentCheckoutId(id)) {
    return res.status(400).json({ error: 'Invalid order id' });
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
    return res.status(404).json({ error: 'Not found' });
  }
  res.json({ phase1Order: phase1 });
}
