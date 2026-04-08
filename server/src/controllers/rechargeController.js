import { prisma } from '../db.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { isLikelyPaymentCheckoutId } from '../lib/paymentCheckoutId.js';
import { resolveRecipientFromBody } from '../services/recipient/recipientService.js';
import { getRechargeProvider } from '../services/providers/index.js';
import { processFulfillmentForOrder } from '../services/fulfillmentProcessingService.js';
import { writeOrderAudit } from '../services/orderAuditService.js';
import { canOrderProceedToFulfillment } from '../lib/phase1FulfillmentPaymentGate.js';
import { deriveCustomerTrackingStageForOrder } from '../services/transactionsService.js';
import { env } from '../config/env.js';
import { enqueuePhase1FulfillmentJob } from '../queues/phase1FulfillmentProducer.js';
import { waitForPaymentCheckoutTerminal } from '../services/fulfillmentClientWait.js';

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

  const gate = canOrderProceedToFulfillment(existing, {
    lifecycle: 'PAID_OR_PROCESSING',
  });
  if (!gate.ok) {
    req.log?.warn?.(
      {
        securityEvent: 'recharge_execute_gate_denied',
        orderIdSuffix: orderId.slice(-12),
        denial: gate.denial,
      },
      'security',
    );
    return res.status(409).json({
      error: 'Fulfillment not authorized for current payment state',
      fortressDenial: gate.denial,
      fortressDetail: gate.detail ?? null,
      ...basePayload,
    });
  }

  if (env.fulfillmentQueueEnabled) {
    const enq = await enqueuePhase1FulfillmentJob(orderId, req.traceId);
    if (enq.ok) {
      const terminal = await waitForPaymentCheckoutTerminal(orderId, {
        timeoutMs: env.fulfillmentClientExecuteWaitMs,
      });
      if (!terminal.ok) {
        const mid = await prisma.paymentCheckout.findFirst({
          where: { id: orderId, userId },
          include: {
            fulfillmentAttempts: { orderBy: { attemptNumber: 'desc' }, take: 1 },
          },
        });
        return res.status(504).json({
          error: 'Fulfillment still in progress — poll order status',
          fulfillmentQueue: true,
          ...(mid
            ? {
                order: publicOrderSlice(mid),
                fulfillment: fulfillmentFromRow(mid),
              }
            : {}),
        });
      }
    } else {
      await processFulfillmentForOrder(orderId, { traceId: req.traceId });
    }
  } else {
    await processFulfillmentForOrder(orderId, { traceId: req.traceId });
  }

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
