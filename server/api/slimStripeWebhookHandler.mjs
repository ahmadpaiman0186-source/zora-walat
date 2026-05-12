/**
 * Vercel serverless fast path for POST /webhooks/stripe: reject missing/invalid Stripe
 * signatures before bootstrap.js + full Express graph. Verified events replay the raw body
 * into the existing serverless-http + Express stack (second constructEvent in route).
 */
import { Readable } from 'node:stream';

import Stripe from 'stripe';

import { clientErrorBody } from '../src/lib/clientErrorJson.js';
import { API_CONTRACT_CODE } from '../src/constants/apiContractCodes.js';
import { primeSlimServerlessEnv } from './slimReadyEnv.mjs';

/** Match `express.raw({ limit: '256kb' })` on `/webhooks/stripe` in app.js */
export const WEBHOOK_RAW_BODY_LIMIT_BYTES = 256 * 1024;

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
  logWebhookSlimBreadcrumb('webhook_slim_entry');

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

  try {
    Stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch {
    logWebhookSlimBreadcrumb('webhook_signature_invalid');
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
  const replayReq = createStripeWebhookReplayStream(req, rawBody);
  const next = await getHandler();
  const out = next(replayReq, res);
  if (out && typeof out.then === 'function') {
    await out;
  }
}
