import { ZodError } from 'zod';

import { env } from '../config/env.js';
import {
  sessionKeySuffix,
  webTopupLog,
} from '../lib/webTopupObservability.js';
import {
  createTopupOrder,
  getTopupOrderForClient,
  listTopupOrdersForClient,
  markTopupOrderPaidFromStripe,
  isValidTopupOrderId,
} from '../services/topupOrder/topupOrderService.js';
import { MONEY_PATH_OUTCOME } from '../constants/moneyPathOutcome.js';
import {
  idempotencyKeyHeaderSchema,
  topupOrderCreateSchema,
  topupOrderGetQuerySchema,
  topupOrderListQuerySchema,
  topupOrderMarkPaidSchema,
} from '../validators/topupOrder.js';

function zodDetails(e) {
  if (env.nodeEnv !== 'production' && e instanceof ZodError) {
    return e.flatten();
  }
  return undefined;
}

function parseIdempotencyKey(req) {
  const raw = req.get('Idempotency-Key');
  if (raw == null || typeof raw !== 'string') return false;
  const t = raw.trim();
  if (!t) return false;
  const r = idempotencyKeyHeaderSchema.safeParse(t);
  if (!r.success) return false;
  return t;
}

export async function postCreateTopupOrder(req, res) {
  const idem = parseIdempotencyKey(req);
  if (idem === false) {
    webTopupLog(req.log, 'warn', 'suspicious_request_detected', {
      kind: 'missing_or_invalid_idempotency_header',
    });
    return res.status(400).json({
      error: 'Idempotency-Key header required (UUID v4)',
      code: 'topup_order_idempotency_required',
      moneyPathOutcome: MONEY_PATH_OUTCOME.REJECTED,
    });
  }

  let parsed;
  try {
    parsed = topupOrderCreateSchema.parse(req.body ?? {});
  } catch (e) {
    if (e instanceof ZodError) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: zodDetails(e),
      });
    }
    throw e;
  }

  try {
    const result = await createTopupOrder(parsed, idem);
    const code = result.idempotentReplay ? 200 : 201;
    webTopupLog(
      req.log,
      'info',
      result.idempotentReplay ? 'order_create_replayed' : 'order_created',
      {
        orderIdSuffix: String(result.order.id).slice(-8),
        sessionKeySuffix: sessionKeySuffix(result.sessionKey),
        statusCode: code,
      },
    );
    return res.status(code).json({
      order: result.order,
      updateToken: result.updateToken,
      sessionKey: result.sessionKey,
      moneyPathOutcome: result.moneyPathOutcome,
      ...(result.idempotentReplay ? { idempotentReplay: true } : {}),
    });
  } catch (e) {
    if (e?.code === 'idempotency_conflict') {
      webTopupLog(req.log, 'warn', 'suspicious_request_detected', {
        kind: 'idempotency_key_payload_conflict',
      });
      return res.status(409).json({
        error: 'Idempotency key reused with a different payload',
        moneyPathOutcome: MONEY_PATH_OUTCOME.REJECTED,
      });
    }
    webTopupLog(req.log, 'error', 'order_create_failed', {
      errName: e?.name,
      errCode: e?.code,
    });
    throw e;
  }
}

export async function getTopupOrder(req, res) {
  const id = req.params.id;
  if (!isValidTopupOrderId(id)) {
    return res.status(400).json({ error: 'Invalid order id' });
  }
  let q;
  try {
    q = topupOrderGetQuerySchema.parse(req.query ?? {});
  } catch (e) {
    if (e instanceof ZodError) {
      return res.status(400).json({
        error: 'Invalid query',
        details: zodDetails(e),
      });
    }
    throw e;
  }

  const order = await getTopupOrderForClient(id, q.sessionKey);
  if (!order) {
    return res.status(404).json({ error: 'Not found' });
  }
  return res.json({ order });
}

export async function listTopupOrders(req, res) {
  let q;
  try {
    q = topupOrderListQuerySchema.parse(req.query ?? {});
  } catch (e) {
    if (e instanceof ZodError) {
      return res.status(400).json({
        error: 'Invalid query',
        details: zodDetails(e),
      });
    }
    throw e;
  }

  const orders = await listTopupOrdersForClient(q.sessionKey, q.limit);
  return res.json({ orders });
}

export async function postMarkTopupOrderPaid(req, res) {
  if (!env.webtopupClientMarkPaidEnabled) {
    webTopupLog(req.log, 'warn', 'suspicious_request_detected', {
      kind: 'webtopup_client_mark_paid_blocked',
    });
    return res.status(403).json({
      code: 'webtopup_client_mark_paid_disabled',
      error:
        'Client mark-paid is disabled for this deployment. Confirm payment via Stripe webhooks, or set WEBTOPUP_CLIENT_MARK_PAID_ENABLED=true (non-production default allows this path).',
    });
  }

  const id = req.params.id;
  if (!isValidTopupOrderId(id)) {
    return res.status(400).json({ error: 'Invalid order id' });
  }
  let body;
  try {
    body = topupOrderMarkPaidSchema.parse(req.body ?? {});
  } catch (e) {
    if (e instanceof ZodError) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: zodDetails(e),
      });
    }
    throw e;
  }

  if (!body.paymentIntentId.startsWith('pi_')) {
    return res.status(400).json({ error: 'Invalid paymentIntentId' });
  }

  webTopupLog(req.log, 'info', 'order_mark_paid_requested', {
    orderIdSuffix: id.slice(-8),
    paymentIntentIdSuffix: body.paymentIntentId.slice(-10),
    sessionKeySuffix: sessionKeySuffix(body.sessionKey),
  });

  try {
    const { order, markPaidReplay } = await markTopupOrderPaidFromStripe(
      id,
      body.sessionKey,
      body.updateToken,
      body.paymentIntentId,
    );
    webTopupLog(
      req.log,
      'info',
      markPaidReplay ? 'order_mark_paid_replayed' : 'order_mark_paid_completed',
      {
        orderIdSuffix: String(order.id).slice(-8),
        paymentIntentIdSuffix: body.paymentIntentId.slice(-10),
      },
    );
    return res.json({ order });
  } catch (e) {
    const code = e?.code;
    if (code === 'not_found') {
      return res.status(404).json({ error: 'Not found' });
    }
    if (code === 'forbidden') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (code === 'order_not_pending') {
      return res.status(409).json({ error: 'Order cannot be updated' });
    }
    if (code === 'concurrent_update') {
      return res.status(409).json({ error: 'Order state changed; refresh and retry' });
    }
    if (code === 'pi_mismatch_order') {
      webTopupLog(req.log, 'warn', 'suspicious_request_detected', {
        kind: 'mark_paid_pi_mismatch',
        orderIdSuffix: id.slice(-8),
      });
      return res.status(409).json({ error: 'PaymentIntent does not match order' });
    }
    if (
      code === 'stripe_not_test' ||
      code === 'stripe_key_mode' ||
      code === 'stripe_missing' ||
      code === 'invalid_pi' ||
      code === 'pi_currency' ||
      code === 'pi_amount' ||
      code === 'pi_not_succeeded' ||
      code === 'pi_metadata_order'
    ) {
      return res.status(400).json({
        error: 'Payment verification failed',
        code,
        ...(code === 'pi_not_succeeded' && e.detail
          ? { stripeStatus: e.detail }
          : {}),
      });
    }
    if (code === 'invalid_order') {
      return res.status(400).json({ error: 'Invalid order id' });
    }
    throw e;
  }
}
