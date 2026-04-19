import { ZodError } from 'zod';

import { env } from '../config/env.js';
import {
  sessionKeySuffix,
  webTopupCorrelationFields,
  webTopupLog,
} from '../lib/webTopupObservability.js';
import {
  createTopupOrder,
  listTopupOrdersForBoundUser,
  listTopupOrdersForClient,
  markTopupOrderPaidFromStripe,
  resolveTopupOrderForRead,
  isValidTopupOrderId,
} from '../services/topupOrder/topupOrderService.js';
import { MONEY_PATH_OUTCOME } from '../constants/moneyPathOutcome.js';
import { WEBTOPUP_CLIENT_ERROR_CODE } from '../constants/webtopupClientErrors.js';
import { MONEY_PATH_EVENT } from '../domain/payments/moneyPathEvents.js';
import { emitMoneyPathLog } from '../infrastructure/logging/moneyPathLog.js';
import { clientErrorBody } from '../lib/clientErrorJson.js';
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
    return res.status(400).json(
      clientErrorBody(
        'Idempotency-Key header required (UUID v4)',
        WEBTOPUP_CLIENT_ERROR_CODE.TOPUP_ORDER_IDEMPOTENCY_REQUIRED,
        { moneyPathOutcome: MONEY_PATH_OUTCOME.REJECTED },
      ),
    );
  }

  let parsed;
  try {
    parsed = topupOrderCreateSchema.parse(req.body ?? {});
  } catch (e) {
    if (e instanceof ZodError) {
      return res.status(400).json({
        ...clientErrorBody(
          'Invalid request body',
          WEBTOPUP_CLIENT_ERROR_CODE.VALIDATION_ERROR,
        ),
        details: zodDetails(e),
      });
    }
    throw e;
  }

  try {
    const boundUserId = req.webtopupAuthUser?.id ?? null;
    const result = await createTopupOrder(parsed, idem, {
      boundUserId,
      riskLog: req.log,
      riskTraceId: req.traceId ?? null,
    });
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
    emitMoneyPathLog(MONEY_PATH_EVENT.WEBTOPUP_ORDER_CREATED, {
      traceId: req.traceId ?? null,
      orderIdSuffix: String(result.order.id).slice(-8),
      sessionKeySuffix: sessionKeySuffix(result.sessionKey),
      idempotentReplay: Boolean(result.idempotentReplay),
      statusCode: code,
    });
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
      return res.status(409).json(
        clientErrorBody(
          'Idempotency key reused with a different payload',
          WEBTOPUP_CLIENT_ERROR_CODE.TOPUP_ORDER_IDEMPOTENCY_CONFLICT,
          { moneyPathOutcome: MONEY_PATH_OUTCOME.REJECTED },
        ),
      );
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
    return res
      .status(400)
      .json(clientErrorBody('Invalid order id', 'invalid_topup_order_id'));
  }
  let q;
  try {
    q = topupOrderGetQuerySchema.parse(req.query ?? {});
  } catch (e) {
    if (e instanceof ZodError) {
      return res.status(400).json({
        ...clientErrorBody(
          'Invalid query',
          WEBTOPUP_CLIENT_ERROR_CODE.VALIDATION_ERROR,
        ),
        details: zodDetails(e),
      });
    }
    throw e;
  }

  const sessionKey = q.sessionKey;
  const jwtUserId = req.webtopupAuthUser?.id ?? null;
  if (!sessionKey && !jwtUserId) {
    return res.status(400).json(
      clientErrorBody(
        'Query sessionKey or Authorization Bearer required',
        WEBTOPUP_CLIENT_ERROR_CODE.SESSION_OR_AUTH_REQUIRED,
      ),
    );
  }

  const order = await resolveTopupOrderForRead(id, sessionKey, jwtUserId);
  if (!order) {
    return res
      .status(404)
      .json(clientErrorBody('Not found', WEBTOPUP_CLIENT_ERROR_CODE.TOPUP_ORDER_NOT_FOUND));
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
        ...clientErrorBody(
          'Invalid query',
          WEBTOPUP_CLIENT_ERROR_CODE.VALIDATION_ERROR,
        ),
        details: zodDetails(e),
      });
    }
    throw e;
  }

  const jwtUserId = req.webtopupAuthUser?.id ?? null;
  if (q.sessionKey) {
    const orders = await listTopupOrdersForClient(q.sessionKey, q.limit, jwtUserId);
    return res.json({ orders });
  }
  if (jwtUserId) {
    const orders = await listTopupOrdersForBoundUser(jwtUserId, q.limit);
    return res.json({ orders, listScope: 'bound_user' });
  }
  return res.status(400).json(
    clientErrorBody(
      'Query sessionKey or Authorization Bearer required',
      WEBTOPUP_CLIENT_ERROR_CODE.SESSION_OR_AUTH_REQUIRED,
    ),
  );
}

export async function postMarkTopupOrderPaid(req, res) {
  if (!env.webtopupClientMarkPaidEnabled) {
    webTopupLog(req.log, 'warn', 'suspicious_request_detected', {
      kind: 'webtopup_client_mark_paid_blocked',
    });
    return res.status(403).json(
      clientErrorBody(
        'Client mark-paid is disabled for this deployment. Confirm payment via Stripe webhooks, or set WEBTOPUP_CLIENT_MARK_PAID_ENABLED=true (non-production default allows this path).',
        WEBTOPUP_CLIENT_ERROR_CODE.WEBTOPUP_MARK_PAID_DISABLED,
      ),
    );
  }

  const id = req.params.id;
  if (!isValidTopupOrderId(id)) {
    return res
      .status(400)
      .json(clientErrorBody('Invalid order id', 'invalid_topup_order_id'));
  }
  let body;
  try {
    body = topupOrderMarkPaidSchema.parse(req.body ?? {});
  } catch (e) {
    if (e instanceof ZodError) {
      return res.status(400).json({
        ...clientErrorBody(
          'Invalid request body',
          WEBTOPUP_CLIENT_ERROR_CODE.VALIDATION_ERROR,
        ),
        details: zodDetails(e),
      });
    }
    throw e;
  }

  if (!body.paymentIntentId.startsWith('pi_')) {
    return res
      .status(400)
      .json(
        clientErrorBody(
          'Invalid paymentIntentId',
          WEBTOPUP_CLIENT_ERROR_CODE.INVALID_PAYMENT_INTENT_ID,
        ),
      );
  }

  const jwtUserId = req.webtopupAuthUser?.id ?? null;
  if (!body.sessionKey && !jwtUserId) {
    return res.status(400).json(
      clientErrorBody(
        'sessionKey in body or Authorization Bearer (bound user) required',
        WEBTOPUP_CLIENT_ERROR_CODE.MARK_PAID_SESSION_OR_AUTH_REQUIRED,
        { moneyPathOutcome: MONEY_PATH_OUTCOME.REJECTED },
      ),
    );
  }

  webTopupLog(req.log, 'info', 'order_mark_paid_requested', {
    orderIdSuffix: id.slice(-8),
    paymentIntentIdSuffix: body.paymentIntentId.slice(-10),
    sessionKeySuffix: sessionKeySuffix(body.sessionKey),
    /** Explicit: not `stripe_webhook` — duplicates webhook authority when enabled. */
    paymentAuthority: 'client_mark_paid',
  });
  emitMoneyPathLog(MONEY_PATH_EVENT.WEBTOPUP_MARK_PAID_REQUESTED, {
    traceId: req.traceId ?? null,
    orderIdSuffix: id.slice(-8),
    paymentIntentIdSuffix: body.paymentIntentId.slice(-10),
  });

  try {
    const { order, markPaidReplay } = await markTopupOrderPaidFromStripe(
      id,
      body.sessionKey ?? null,
      body.updateToken,
      body.paymentIntentId,
      { jwtUserId },
    );
    webTopupLog(
      req.log,
      'info',
      markPaidReplay ? 'order_mark_paid_replayed' : 'order_mark_paid_completed',
      {
        orderIdSuffix: String(order.id).slice(-8),
        paymentIntentIdSuffix: body.paymentIntentId.slice(-10),
        traceId: req.traceId,
      },
    );
    webTopupLog(req.log, 'info', 'payment_received', {
      ...webTopupCorrelationFields(String(order.id), body.paymentIntentId, req.traceId),
      source: 'client_mark_paid',
      markPaidReplay: Boolean(markPaidReplay),
    });
    emitMoneyPathLog(MONEY_PATH_EVENT.WEBTOPUP_MARK_PAID_COMPLETED, {
      traceId: req.traceId ?? null,
      orderIdSuffix: String(order.id).slice(-8),
      paymentIntentIdSuffix: body.paymentIntentId.slice(-10),
      markPaidReplay: Boolean(markPaidReplay),
    });
    return res.json({ order });
  } catch (e) {
    const code = e?.code;
    if (code === 'not_found') {
      return res
        .status(404)
        .json(
          clientErrorBody('Not found', WEBTOPUP_CLIENT_ERROR_CODE.TOPUP_ORDER_NOT_FOUND),
        );
    }
    if (code === 'forbidden') {
      return res
        .status(403)
        .json(clientErrorBody('Forbidden', WEBTOPUP_CLIENT_ERROR_CODE.TOPUP_ORDER_FORBIDDEN));
    }
    if (code === 'order_not_pending') {
      return res.status(409).json(
        clientErrorBody(
          'Order cannot be updated',
          WEBTOPUP_CLIENT_ERROR_CODE.TOPUP_ORDER_CANNOT_UPDATE,
        ),
      );
    }
    if (code === 'concurrent_update') {
      return res.status(409).json(
        clientErrorBody(
          'Order state changed; refresh and retry',
          WEBTOPUP_CLIENT_ERROR_CODE.TOPUP_ORDER_CONCURRENT_UPDATE,
        ),
      );
    }
    if (code === 'pi_mismatch_order') {
      webTopupLog(req.log, 'warn', 'suspicious_request_detected', {
        kind: 'mark_paid_pi_mismatch',
        orderIdSuffix: id.slice(-8),
      });
      return res.status(409).json(
        clientErrorBody(
          'PaymentIntent does not match order',
          WEBTOPUP_CLIENT_ERROR_CODE.TOPUP_ORDER_PI_MISMATCH,
        ),
      );
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
      return res.status(400).json(
        clientErrorBody(
          'Payment verification failed',
          WEBTOPUP_CLIENT_ERROR_CODE.TOPUP_ORDER_PAYMENT_VERIFICATION_FAILED,
          {
            /** Stripe-side reason (e.g. `pi_not_succeeded`); top-level `code` is the API contract. */
            stripeErrorCode: code,
            ...(code === 'pi_not_succeeded' && e.detail
              ? { stripeStatus: e.detail }
              : {}),
          },
        ),
      );
    }
    if (code === 'invalid_order') {
      return res
      .status(400)
      .json(clientErrorBody('Invalid order id', 'invalid_topup_order_id'));
    }
    throw e;
  }
}
