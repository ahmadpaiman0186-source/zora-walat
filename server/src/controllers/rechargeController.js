import { prisma } from '../db.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { isLikelyPaymentCheckoutId } from '../lib/paymentCheckoutId.js';
import { resolveRecipientFromBody } from '../services/recipient/recipientService.js';
import { getRechargeProvider } from '../services/providers/index.js';
import { processFulfillmentForOrder } from '../services/fulfillmentProcessingService.js';
import { writeOrderAudit } from '../services/orderAuditService.js';
import { deriveCustomerTrackingStageForOrder } from '../services/transactionsService.js';

export async function postQuote(req, res) {
  const recipient = await resolveRecipientFromBody(req.user.id, req.body);
  const provider = getRechargeProvider();
  return res.json(
    provider.getQuote({
      recipient,
      operatorKey: recipient.operatorKey,
    }),
  );
}

export async function postOrder(req, res) {
  const { packageId } = req.body || {};
  if (!packageId) {
    return res.status(400).json({ error: 'packageId is required' });
  }
  const recipient = await resolveRecipientFromBody(req.user.id, req.body);
  const provider = getRechargeProvider();
  const out = provider.createOrder({
    recipient,
    operatorKey: recipient.operatorKey,
    packageId,
    userId: req.user.id,
  });
  return res.status(201).json(out);
}

function maskNational(national) {
  if (national == null) return null;
  const s = String(national).trim();
  if (s.length < 4) return null;
  return `***${s.slice(-4)}`;
}

function fulfillmentFromRow(row) {
  const a = row.fulfillmentAttempts?.[0];
  if (!a) {
    return {
      status: null,
      providerReference: null,
      failureReason: null,
    };
  }
  return {
    status: a.status,
    providerReference: a.providerReference ?? null,
    failureReason: a.failureReason ?? null,
  };
}

function publicOrderSlice(row) {
  const latest = row.fulfillmentAttempts?.[0] ?? null;
  return {
    id: row.id,
    orderStatus: row.orderStatus,
    status: row.status,
    currency: row.currency,
    amountUsdCents: row.amountUsdCents,
    packageId: row.packageId ?? null,
    operatorKey: row.operatorKey ?? null,
    failureReason: row.failureReason ?? null,
    paidAt: row.paidAt,
    failedAt: row.failedAt,
    trackingStageKey: deriveCustomerTrackingStageForOrder(row, latest),
  };
}

/**
 * After Stripe Checkout success, the client may call this to kick airtime delivery if the
 * webhook is delayed. Idempotent: safe to call multiple times; duplicates do not re-send airtime
 * once the order is terminal (see `processFulfillmentForOrder`).
 *
 * Body: `{ "orderId": "<PaymentCheckout.id>" }`
 */
export async function postExecute(req, res) {
  const raw = req.body?.orderId;
  if (raw == null || typeof raw !== 'string' || !isLikelyPaymentCheckoutId(raw.trim())) {
    return res.status(400).json({ error: 'Invalid orderId' });
  }
  const orderId = raw.trim();
  const userId = req.user.id;

  const existing = await prisma.paymentCheckout.findFirst({
    where: { id: orderId, userId },
    include: {
      fulfillmentAttempts: {
        orderBy: { attemptNumber: 'desc' },
        take: 1,
      },
    },
  });

  if (!existing) {
    return res.status(404).json({ error: 'Not found' });
  }

  await writeOrderAudit(prisma, {
    event: 'recharge_execute_requested',
    payload: { orderId, phase: 'client_kick' },
    ip: req.ip ? String(req.ip).slice(0, 64) : null,
  });

  const basePayload = {
    order: publicOrderSlice(existing),
    fulfillment: fulfillmentFromRow(existing),
    airtime: {
      operatorKey: existing.operatorKey ?? null,
      amountUsdCents: existing.amountUsdCents,
      recipientMasked: maskNational(existing.recipientNational),
    },
  };

  if (existing.orderStatus === ORDER_STATUS.PENDING) {
    return res.status(409).json({
      error: 'Payment not confirmed yet',
      ...basePayload,
    });
  }

  if (existing.orderStatus === ORDER_STATUS.CANCELLED) {
    return res.status(409).json({
      error: 'Order cancelled',
      ...basePayload,
    });
  }

  await processFulfillmentForOrder(orderId, { traceId: req.traceId });

  const fresh = await prisma.paymentCheckout.findFirst({
    where: { id: orderId, userId },
    include: {
      fulfillmentAttempts: {
        orderBy: { attemptNumber: 'desc' },
        take: 1,
      },
    },
  });

  if (!fresh) {
    return res.status(404).json({ error: 'Not found' });
  }

  return res.json({
    ok: true,
    order: publicOrderSlice(fresh),
    fulfillment: fulfillmentFromRow(fresh),
    airtime: {
      operatorKey: fresh.operatorKey ?? null,
      amountUsdCents: fresh.amountUsdCents,
      recipientMasked: maskNational(fresh.recipientNational),
    },
  });
}
