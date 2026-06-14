/**
 * Vercel serverless fast path for POST /webhooks/stripe: reject missing/invalid Stripe
 * signatures before bootstrap.js + full Express graph. Verified events replay the raw body
 * into the existing serverless-http + Express stack (second constructEvent in route).
 */
import { Readable } from 'node:stream';

import Stripe from 'stripe';

import { clientErrorBody } from '../src/lib/clientErrorJson.js';
import { API_CONTRACT_CODE } from '../src/constants/apiContractCodes.js';
import { WEBTOPUP_STRIPE_PI_METADATA_SOURCE } from '../src/constants/webTopupStripePiMetadata.js';
import { isLikelyPaymentCheckoutId } from '../src/lib/paymentCheckoutId.js';
import { primeSlimServerlessEnv } from './slimReadyEnv.mjs';
import {
  isHostedCheckoutSessionCompletedEvent,
  slimProcessCheckoutSessionCompletedWebhook,
} from './slimStripeWebhookCheckoutCompleted.mjs';
import {
  isChargeRefundedEvent,
  slimProcessChargeRefundedWebhook,
} from './slimStripeWebhookChargeRefunded.mjs';
import {
  isHostedCheckoutSessionExpiredEvent,
  slimProcessCheckoutSessionExpiredWebhook,
} from './slimStripeWebhookCheckoutExpired.mjs';
import { logStripeWebhookLifecycle } from '../src/lib/stripeWebhookLifecycleLog.js';
import {
  recordStripeWebhookAudit,
  stripeAccountModeFromEvent,
  webhookAuditRouteFromRequest,
} from './stripeWebhookAudit.mjs';

/** Match `express.raw({ limit: '256kb' })` on `/webhooks/stripe` in app.js */
export const WEBHOOK_RAW_BODY_LIMIT_BYTES = 256 * 1024;

/**
 * @param {number} startedAt
 */
function elapsedMs(startedAt) {
  return Date.now() - startedAt;
}

/**
 * @param {import('stripe').Stripe.Event | undefined} event
 */
function stripeWebhookAuditEventFields(event) {
  if (!event) return {};
  return {
    event_id: typeof event.id === 'string' ? event.id : undefined,
    event_type: typeof event.type === 'string' ? event.type : undefined,
    stripe_account_mode: stripeAccountModeFromEvent(event),
  };
}

/**
 * @param {unknown} result
 */
function idempotencyStatusFromSlimResult(result) {
  if (!result || typeof result !== 'object') return 'new';
  const status = typeof result.status === 'string' ? result.status : '';
  const transition = typeof result.stateTransition === 'string' ? result.stateTransition : '';
  if (transition === 'duplicate_shadow_ack') return 'duplicate_shadow_ack';
  if (transition.startsWith('duplicate_db')) return 'duplicate_db';
  if (status === 'duplicate_ignored') return 'duplicate';
  if (status === 'error_ack' || transition.includes('error')) return 'error';
  return 'new';
}

/**
 * @param {'webhook_slim_entry' | 'webhook_signature_missing' | 'webhook_signature_invalid' | 'webhook_signature_verified_handoff'} event
 */
function logWebhookSlimBreadcrumb(event) {
  console.log(
    JSON.stringify({
      event,
      schema: 'zora.webhook_slim.v1',
      t: new Date().toISOString(),
    }),
  );
}

const TW_ORD_META = /^tw_ord_[0-9a-f-]{36}$/i;

/**
 * True when a verified Stripe event cannot correlate to Zora-Walat money-path rows based
 * only on Stripe payload shape (no DB). Used to return 2xx before cold `getHandler()`.
 *
 * @param {import('stripe').Stripe.Event} event
 * @returns {boolean}
 */
export function stripeEventSlimUnmatchedFastAck(event) {
  const t = event?.type;
  if (t === 'checkout.session.completed' || t === 'checkout.session.expired') {
    const session = event.data?.object;
    if (!session || typeof session !== 'object') return true;
    const raw = session.metadata?.internalCheckoutId;
    if (raw == null || String(raw).trim() === '') return true;
    return !isLikelyPaymentCheckoutId(String(raw));
  }
  if (t === 'payment_intent.succeeded' || t === 'payment_intent.payment_failed') {
    const pi = event.data?.object;
    if (!pi || typeof pi !== 'object') return true;
    const tid = pi.metadata?.topup_order_id;
    if (tid == null || String(tid).trim() === '') return true;
    if (typeof tid !== 'string' || !TW_ORD_META.test(tid)) return true;
    /**
     * Stripe CLI / dashboard resends often synthesize a `tw_ord_<uuid>`-shaped id without
     * our app marker; those must fast-ack 200 before cold `getHandler()`. Real embedded
     * PIs always set `metadata.source` in paymentController.
     */
    const src = String(pi.metadata?.source ?? '').trim();
    if (src !== WEBTOPUP_STRIPE_PI_METADATA_SOURCE) return true;
    return false;
  }
  return false;
}

/**
 * @param {string | undefined} raw
 * @returns {boolean}
 */
function signingSecretLooksConfigured(raw) {
  const s = String(raw ?? '').trim();
  return s.startsWith('whsec_') && s.length >= 20;
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {number} limitBytes
 * @returns {Promise<Buffer>}
 */
export async function readBoundedWebhookBody(req, limitBytes) {
  if (Buffer.isBuffer(req.body)) {
    const b = req.body;
    if (b.length > limitBytes) {
      const e = new Error('webhook_body_too_large');
      e.code = 'WEBHOOK_BODY_TOO_LARGE';
      throw e;
    }
    return b;
  }
  if (typeof req.body === 'string') {
    const b = Buffer.from(req.body, 'utf8');
    if (b.length > limitBytes) {
      const e = new Error('webhook_body_too_large');
      e.code = 'WEBHOOK_BODY_TOO_LARGE';
      throw e;
    }
    return b;
  }

  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buf.length;
    if (total > limitBytes) {
      const e = new Error('webhook_body_too_large');
      e.code = 'WEBHOOK_BODY_TOO_LARGE';
      throw e;
    }
    chunks.push(buf);
  }
  return total === 0 ? Buffer.alloc(0) : Buffer.concat(chunks, total);
}

/**
 * Replayable request stream for the full Express + serverless-http stack after slim verify.
 *
 * @param {import('http').IncomingMessage} originalReq
 * @param {Buffer} bodyBuf
 * @returns {import('node:stream').Readable & import('http').IncomingMessage}
 */
export function createStripeWebhookReplayStream(originalReq, bodyBuf) {
  const stream = Readable.from([bodyBuf], { objectMode: false });
  stream.method = originalReq.method;
  stream.url = originalReq.url;
  stream.headers = { ...originalReq.headers };
  stream.httpVersion = originalReq.httpVersion;
  stream.httpVersionMajor = originalReq.httpVersionMajor;
  stream.httpVersionMinor = originalReq.httpVersionMinor;
  if (originalReq.socket) stream.socket = originalReq.socket;
  if (originalReq.trailers) stream.trailers = originalReq.trailers;
  if (originalReq.rawTrailers) stream.rawTrailers = originalReq.rawTrailers;
  if (typeof originalReq.originalUrl === 'string') {
    stream.originalUrl = originalReq.originalUrl;
  }
  return /** @type {import('node:stream').Readable & import('http').IncomingMessage} */ (
    /** @type {unknown} */ (stream)
  );
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {() => Promise<(rq: import('http').IncomingMessage, rs: import('http').ServerResponse) => unknown>} getHandler
 * @returns {Promise<void>}
 */
export async function handleSlimStripeWebhookPost(req, res, getHandler) {
  const startedAt = Date.now();
  const auditBase = {
    route: webhookAuditRouteFromRequest(req),
    received_at: new Date(startedAt).toISOString(),
  };
  logWebhookSlimBreadcrumb('webhook_slim_entry');
  logStripeWebhookLifecycle('webhook_received', { path: 'slim' });

  if (process.env.NODE_ENV !== 'production') {
    primeSlimServerlessEnv();
  }

  const secretRaw = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signingSecretLooksConfigured(secretRaw)) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(
      JSON.stringify(
        clientErrorBody('Service unavailable', API_CONTRACT_CODE.INTERNAL_ERROR),
      ),
    );
    return;
  }
  const secret = String(secretRaw).trim();

  const sig = req.headers['stripe-signature'];
  if (!sig || typeof sig !== 'string') {
    logWebhookSlimBreadcrumb('webhook_signature_missing');
    logStripeWebhookLifecycle('signature_verified', {
      success: false,
      reason: 'missing_header',
    });
    try {
      await readBoundedWebhookBody(req, WEBHOOK_RAW_BODY_LIMIT_BYTES);
    } catch (e) {
      if (e && typeof e === 'object' && e.code === 'WEBHOOK_BODY_TOO_LARGE') {
        res.statusCode = 413;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(
          JSON.stringify(
            clientErrorBody('Payload too large', API_CONTRACT_CODE.VALIDATION_ERROR),
          ),
        );
        return;
      }
      throw e;
    }
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(
      JSON.stringify(
        clientErrorBody('Invalid request', API_CONTRACT_CODE.VALIDATION_ERROR),
      ),
    );
    return;
  }

  let rawBody;
  try {
    rawBody = await readBoundedWebhookBody(req, WEBHOOK_RAW_BODY_LIMIT_BYTES);
  } catch (e) {
    if (e && typeof e === 'object' && e.code === 'WEBHOOK_BODY_TOO_LARGE') {
      res.statusCode = 413;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(
        JSON.stringify(
          clientErrorBody('Payload too large', API_CONTRACT_CODE.VALIDATION_ERROR),
        ),
      );
      return;
    }
    throw e;
  }

  let event;
  try {
    event = Stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch {
    logWebhookSlimBreadcrumb('webhook_signature_invalid');
    logStripeWebhookLifecycle('signature_verified', {
      success: false,
      reason: 'construct_event_failed',
    });
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(
      JSON.stringify(
        clientErrorBody('Invalid request', API_CONTRACT_CODE.VALIDATION_ERROR),
      ),
    );
    return;
  }

  logWebhookSlimBreadcrumb('webhook_signature_verified_handoff');
  logStripeWebhookLifecycle('signature_verified', {
    success: true,
    stripeEventType: event.type,
    stripeEventIdSuffix:
      typeof event.id === 'string' && event.id.length >= 8
        ? event.id.slice(-8)
        : 'unknown',
  });
  await recordStripeWebhookAudit({
    ...auditBase,
    ...stripeWebhookAuditEventFields(event),
    signature_verification_status: 'verified',
    idempotency_status: 'not_applicable',
    handler_stage: 'signature_verified',
  });

  if (isHostedCheckoutSessionCompletedEvent(event)) {
    const t0 = Date.now();
    await recordStripeWebhookAudit({
      ...auditBase,
      ...stripeWebhookAuditEventFields(event),
      signature_verification_status: 'verified',
      idempotency_status: 'not_applicable',
      handler_stage: 'handler_stage_entered',
    });
    try {
      const processor =
        typeof globalThis.__zwSlimWebhookCheckoutSessionCompletedImpl ===
        'function'
          ? globalThis.__zwSlimWebhookCheckoutSessionCompletedImpl
          : slimProcessCheckoutSessionCompletedWebhook;
      const result = await processor(event);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      logStripeWebhookLifecycle('ack_returned', {
        stripeEventType: event.type,
        path: 'slim_checkout_session_completed',
        latencyMs: result.latencyMs ?? Date.now() - t0,
      });
      await recordStripeWebhookAudit({
        ...auditBase,
        ...stripeWebhookAuditEventFields(event),
        signature_verification_status: 'verified',
        idempotency_status: idempotencyStatusFromSlimResult(result),
        handler_stage: 'idempotency_checked',
      });
      await recordStripeWebhookAudit({
        ...auditBase,
        ...stripeWebhookAuditEventFields(event),
        signature_verification_status: 'verified',
        idempotency_status: idempotencyStatusFromSlimResult(result),
        handler_stage: 'response_sent',
        response_status: 200,
        ack_latency_ms: elapsedMs(startedAt),
      });
      res.end(
        JSON.stringify({
          received: true,
          path: 'slim_checkout_session_completed',
          status: result.status,
          stateTransition: result.stateTransition,
          latencyMs: result.latencyMs ?? Date.now() - t0,
        }),
      );
    } catch (err) {
      console.log(
        JSON.stringify({
          event: 'webhook_slim_checkout_unhandled_error',
          schema: 'zora.webhook_slim.v1',
          stripeEventType: event.type,
          latencyMs: Date.now() - t0,
          errName: err?.name,
          t: new Date().toISOString(),
        }),
      );
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      logStripeWebhookLifecycle('ack_returned', {
        stripeEventType: event.type,
        path: 'slim_checkout_session_completed_error_ack',
      });
      await recordStripeWebhookAudit({
        ...auditBase,
        ...stripeWebhookAuditEventFields(event),
        signature_verification_status: 'verified',
        idempotency_status: 'error',
        handler_stage: 'response_sent',
        response_status: 200,
        ack_latency_ms: elapsedMs(startedAt),
        redacted_error_code: err?.name ?? 'processor_error',
      });
      res.end(JSON.stringify({ received: true, path: 'slim_checkout_session_completed_error_ack' }));
    }
    return;
  }

  if (isHostedCheckoutSessionExpiredEvent(event)) {
    const t0 = Date.now();
    await recordStripeWebhookAudit({
      ...auditBase,
      ...stripeWebhookAuditEventFields(event),
      signature_verification_status: 'verified',
      idempotency_status: 'not_applicable',
      handler_stage: 'handler_stage_entered',
    });
    try {
      const processor =
        typeof globalThis.__zwSlimWebhookCheckoutSessionExpiredImpl === 'function'
          ? globalThis.__zwSlimWebhookCheckoutSessionExpiredImpl
          : slimProcessCheckoutSessionExpiredWebhook;
      const result = await processor(event);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      logStripeWebhookLifecycle('ack_returned', {
        stripeEventType: event.type,
        path: 'slim_checkout_session_expired',
        latencyMs: result.latencyMs ?? Date.now() - t0,
      });
      await recordStripeWebhookAudit({
        ...auditBase,
        ...stripeWebhookAuditEventFields(event),
        signature_verification_status: 'verified',
        idempotency_status: idempotencyStatusFromSlimResult(result),
        handler_stage: 'idempotency_checked',
      });
      await recordStripeWebhookAudit({
        ...auditBase,
        ...stripeWebhookAuditEventFields(event),
        signature_verification_status: 'verified',
        idempotency_status: idempotencyStatusFromSlimResult(result),
        handler_stage: 'response_sent',
        response_status: 200,
        ack_latency_ms: elapsedMs(startedAt),
      });
      res.end(
        JSON.stringify({
          received: true,
          path: 'slim_checkout_session_expired',
          status: result.status,
          stateTransition: result.stateTransition,
          latencyMs: result.latencyMs ?? Date.now() - t0,
        }),
      );
    } catch (err) {
      console.log(
        JSON.stringify({
          event: 'webhook_slim_expired_unhandled_error',
          schema: 'zora.webhook_slim.v1',
          stripeEventType: event.type,
          latencyMs: Date.now() - t0,
          errName: err?.name,
          t: new Date().toISOString(),
        }),
      );
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      logStripeWebhookLifecycle('ack_returned', {
        stripeEventType: event.type,
        path: 'slim_checkout_session_expired_error_ack',
      });
      await recordStripeWebhookAudit({
        ...auditBase,
        ...stripeWebhookAuditEventFields(event),
        signature_verification_status: 'verified',
        idempotency_status: 'error',
        handler_stage: 'response_sent',
        response_status: 200,
        ack_latency_ms: elapsedMs(startedAt),
        redacted_error_code: err?.name ?? 'processor_error',
      });
      res.end(JSON.stringify({ received: true, path: 'slim_checkout_session_expired_error_ack' }));
    }
    return;
  }

  if (isChargeRefundedEvent(event)) {
    const t0 = Date.now();
    await recordStripeWebhookAudit({
      ...auditBase,
      ...stripeWebhookAuditEventFields(event),
      signature_verification_status: 'verified',
      idempotency_status: 'not_applicable',
      handler_stage: 'handler_stage_entered',
    });
    try {
      const result = await slimProcessChargeRefundedWebhook(event);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      logStripeWebhookLifecycle('ack_returned', {
        stripeEventType: event.type,
        path: 'slim_charge_refunded',
        latencyMs: result.latencyMs ?? Date.now() - t0,
      });
      await recordStripeWebhookAudit({
        ...auditBase,
        ...stripeWebhookAuditEventFields(event),
        signature_verification_status: 'verified',
        idempotency_status: idempotencyStatusFromSlimResult(result),
        handler_stage: 'idempotency_checked',
      });
      await recordStripeWebhookAudit({
        ...auditBase,
        ...stripeWebhookAuditEventFields(event),
        signature_verification_status: 'verified',
        idempotency_status: idempotencyStatusFromSlimResult(result),
        handler_stage: 'response_sent',
        response_status: 200,
        ack_latency_ms: elapsedMs(startedAt),
      });
      res.end(
        JSON.stringify({
          received: true,
          path: 'slim_charge_refunded',
          status: result.status,
          stateTransition: result.stateTransition,
          latencyMs: result.latencyMs ?? Date.now() - t0,
        }),
      );
    } catch (err) {
      console.log(
        JSON.stringify({
          event: 'webhook_slim_charge_refunded_unhandled_error',
          schema: 'zora.webhook_slim.v1',
          stripeEventType: event.type,
          latencyMs: Date.now() - t0,
          errName: err?.name,
          t: new Date().toISOString(),
        }),
      );
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      logStripeWebhookLifecycle('ack_returned', {
        stripeEventType: event.type,
        path: 'slim_charge_refunded_error_ack',
      });
      await recordStripeWebhookAudit({
        ...auditBase,
        ...stripeWebhookAuditEventFields(event),
        signature_verification_status: 'verified',
        idempotency_status: 'error',
        handler_stage: 'response_sent',
        response_status: 200,
        ack_latency_ms: elapsedMs(startedAt),
        redacted_error_code: err?.name ?? 'processor_error',
      });
      res.end(JSON.stringify({ received: true, path: 'slim_charge_refunded_error_ack' }));
    }
    return;
  }

  if (stripeEventSlimUnmatchedFastAck(event)) {
    const idSuffix =
      typeof event.id === 'string' && event.id.length >= 8
        ? event.id.slice(-8)
        : 'unknown';
    console.log(
      JSON.stringify({
        event: 'webhook_slim_unmatched_fast_ack',
        schema: 'zora.webhook_slim.v1',
        stripeEventType: event.type,
        stripeEventIdSuffix: idSuffix,
        t: new Date().toISOString(),
      }),
    );
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    await recordStripeWebhookAudit({
      ...auditBase,
      ...stripeWebhookAuditEventFields(event),
      signature_verification_status: 'verified',
      idempotency_status: 'skipped',
      handler_stage: 'handler_stage_entered',
    });
    logStripeWebhookLifecycle('ack_returned', {
      stripeEventType: event.type,
      path: 'slim_unmatched_fast_ack',
    });
    await recordStripeWebhookAudit({
      ...auditBase,
      ...stripeWebhookAuditEventFields(event),
      signature_verification_status: 'verified',
      idempotency_status: 'skipped',
      handler_stage: 'response_sent',
      response_status: 200,
      ack_latency_ms: elapsedMs(startedAt),
    });
    res.end(
      JSON.stringify({
        ok: true,
        status: 'ignored',
        reason: 'unmatched_event',
        stripeEventType: event.type,
      }),
    );
    return;
  }

  logStripeWebhookLifecycle('processing_started', {
    stripeEventType: event.type,
    path: 'express_replay',
  });
  await recordStripeWebhookAudit({
    ...auditBase,
    ...stripeWebhookAuditEventFields(event),
    signature_verification_status: 'verified',
    idempotency_status: 'not_applicable',
    handler_stage: 'handler_stage_entered',
  });
  const replayReq = createStripeWebhookReplayStream(req, rawBody);
  const next = await getHandler();
  const out = next(replayReq, res);
  if (out && typeof out.then === 'function') {
    await out;
  }
  await recordStripeWebhookAudit({
    ...auditBase,
    ...stripeWebhookAuditEventFields(event),
    signature_verification_status: 'verified',
    idempotency_status: 'not_applicable',
    handler_stage: 'response_sent',
    response_status: res.statusCode,
    ack_latency_ms: elapsedMs(startedAt),
  });
}
