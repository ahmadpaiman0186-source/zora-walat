import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

import { getStripeClient } from '../services/stripe.js';
import {
  getValidatedStripeSecretKey,
  isStripeKeyAllowedForWebTopupCharges,
} from '../config/stripeEnv.js';
import { env } from '../config/env.js';
import {
  checkoutSessionBodySchema,
  idempotencyKeyHeaderSchema,
} from '../validators/checkoutSession.js';
import { createPaymentIntentBodySchema } from '../validators/paymentIntent.js';
import {
  assertTopupOrderEligibleForPaymentIntent,
  linkWebTopupPaymentIntent,
} from '../services/topupOrder/topupOrderService.js';
import { safeSuffix, webTopupLog } from '../lib/webTopupObservability.js';
import { validatePackageOperatorPair } from '../lib/allowedCheckout.js';
import { resolveCheckoutPricing } from '../domain/pricing/resolveCheckoutPricing.js';
import {
  normalizeAfghanNational,
  validateAfghanMobileNational,
} from '../lib/phone.js';
import { originHostnameForLog } from '../lib/corsPolicy.js';
import { resolveCheckoutClientBase } from '../lib/checkoutClientBase.js';
import { checkoutRequestFingerprint } from '../lib/checkoutFingerprint.js';
import {
  findReusableCheckout,
  createInitiatedRow,
  markCheckoutCreated,
  markCheckoutFailed,
  getCheckoutByIdempotencyKey,
} from '../services/paymentCheckoutService.js';
import { writeOrderAudit } from '../services/orderAuditService.js';
import { prisma } from '../db.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { classifyCheckoutAbuseDistributed } from '../services/checkoutAbuseDetectorDistributed.js';
import { deviceFingerprintHash } from '../lib/deviceFingerprint.js';
import { logOpsEvent } from '../lib/opsLog.js';
import { recordCheckoutSessionCreated } from '../lib/opsMetrics.js';
import { emitPhase1OperationalEvent } from '../lib/phase1OperationalEvents.js';
import { MONEY_PATH_OUTCOME } from '../constants/moneyPathOutcome.js';

export async function createCheckoutSession(req, res) {
  const authUserId = req.user?.id;
  if (!authUserId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return res.status(503).json({
      error:
        'Stripe not configured. Set STRIPE_SECRET_KEY in server environment (see server/.env.example).',
    });
  }

  const origin = req.headers.origin;
  const clientBaseResolution = resolveCheckoutClientBase({
    nodeEnv: env.nodeEnv,
    clientUrl: env.clientUrl,
    origin,
  });
  req.log?.info(
    {
      originHost: origin ? originHostnameForLog(origin) : null,
      checkoutClientBaseSource: clientBaseResolution.ok
        ? clientBaseResolution.source
        : 'unresolved',
    },
    'checkout client base',
  );
  if (!clientBaseResolution.ok) {
    return res.status(clientBaseResolution.status).json({
      error: clientBaseResolution.error,
    });
  }
  const clientBase = clientBaseResolution.clientBase;

  const idemRaw = req.get('idempotency-key');
  const idemParsed = idempotencyKeyHeaderSchema.safeParse(idemRaw);
  if (!idemParsed.success) {
    req.log?.warn(
      { securityEvent: 'checkout_idempotency_key_invalid' },
      'security',
    );
    return res.status(400).json({
      error: 'Idempotency-Key header required (UUID v4)',
      moneyPathOutcome: MONEY_PATH_OUTCOME.REJECTED,
    });
  }
  const idempotencyKey = idemParsed.data;

  let parsed;
  try {
    parsed = checkoutSessionBodySchema.parse(req.body ?? {});
  } catch (err) {
    if (err instanceof ZodError) {
      req.log?.warn(
        { securityEvent: 'checkout_payload_schema_invalid' },
        'security',
      );
      if (env.nodeEnv === 'production') {
        return res.status(400).json({ error: 'Invalid request body' });
      }
      return res.status(400).json({
        error: 'Invalid request body',
        details: err.flatten(),
      });
    }
    throw err;
  }

  const sender = await prisma.senderCountry.findUnique({
    where: { code: parsed.senderCountry },
  });
  if (!sender || !sender.enabled) {
    return res.status(400).json({
      error: 'Invalid or disabled sender country',
      code: 'SENDER_COUNTRY_INVALID',
    });
  }

  const priced = resolveCheckoutPricing({
    packageId: parsed.packageId,
    amountUsdCents: parsed.amountUsdCents,
    riskBufferPercent: sender.riskBufferPercent,
  });
  if (!priced.ok) {
    req.log?.warn(
      { securityEvent: 'checkout_pricing_rejected', code: priced.code },
      'security',
    );
    const hard =
      priced.code === 'MARGIN_BELOW_FLOOR'
        ? 'Checkout rejected: projected margin below minimum threshold'
        : priced.code === 'CHECKOUT_BELOW_MINIMUM'
          ? priced.message
          : null;
    return res.status(400).json({
      error:
        hard ??
        (env.nodeEnv === 'production'
          ? 'Checkout cannot be priced safely'
          : priced.message),
      code: priced.code,
    });
  }

  const trustedCents = priced.pricing.finalPriceCents;

  const pair = validatePackageOperatorPair(
    parsed.packageId,
    parsed.operatorKey,
  );
  if (!pair.ok) {
    req.log?.warn(
      { securityEvent: 'checkout_package_operator_mismatch' },
      'security',
    );
    return res.status(400).json({
      error:
        env.nodeEnv === 'production'
          ? 'Invalid checkout request'
          : pair.error,
    });
  }

  let recipientNational = null;
  if (parsed.recipientPhone) {
    recipientNational = normalizeAfghanNational(parsed.recipientPhone);
    if (!recipientNational) {
      return res.status(400).json({ error: 'Invalid recipient phone' });
    }
    const v = validateAfghanMobileNational(recipientNational);
    if (!v.ok) {
      return res
        .status(400)
        .json({ error: v.error || 'Invalid recipient phone' });
    }
  }

  const fingerprint = checkoutRequestFingerprint({
    userId: authUserId,
    amountUsdCents: trustedCents,
    senderCountryCode: parsed.senderCountry,
    operatorKey: parsed.operatorKey ?? null,
    recipientNational,
    packageId: parsed.packageId ?? null,
  });

  // Anti-abuse: detect excessive/rapid repeated checkout creation attempts.
  // This is intentionally conservative: we only block when there is already an
  // in-flight PaymentCheckout for this fingerprint (before fulfillment starts).
  const deviceHash = deviceFingerprintHash(req);
  const abuse = await classifyCheckoutAbuseDistributed({
    userId: authUserId,
    ip: req.ip,
    fingerprint,
    idempotencyKey,
    deviceFingerprintHash: deviceHash,
    now: new Date(),
  });

  if (abuse.severity === 'high') {
    // Confirm there is an existing non-terminal checkout for this fingerprint.
    const latestPending = await prisma.paymentCheckout.findFirst({
      where: {
        userId: authUserId,
        requestFingerprint: fingerprint,
        orderStatus: {
          in: [ORDER_STATUS.PENDING, ORDER_STATUS.PAID, ORDER_STATUS.PROCESSING],
        },
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    const ageMs = latestPending?.createdAt
      ? Date.now() - new Date(latestPending.createdAt).getTime()
      : null;

    // Block only if a pending checkout exists and the new attempt is rapid.
    if (latestPending && ageMs != null && ageMs < 30_000) {
      req.log?.warn(
        {
          securityEvent: 'checkout_abuse_blocked',
          abuseSeverity: abuse.severity,
          abuseReasonCode: abuse.reasonCode,
          reasonCodes: abuse.reasonCodes,
          abuseDetail: abuse.detail,
          userId: authUserId,
          ip: req.ip,
          fingerprintPrefix: fingerprint.slice(0, 12),
          pendingAgeMs: ageMs,
        },
        'security',
      );
      return res.status(429).json({
        error: 'Too many checkout attempts; please wait.',
        moneyPathOutcome: MONEY_PATH_OUTCOME.REJECTED,
        abuse: {
          severity: abuse.severity,
          reasonCode: abuse.reasonCode,
          reasonCodes: abuse.reasonCodes,
          detail: abuse.detail,
          recommendedAction: abuse.recommendedAction,
        },
      });
    }

    // High severity without pending-in-flight is only flagged, never blocked.
    req.log?.warn(
      {
        securityEvent: 'checkout_abuse_flagged',
        abuseSeverity: abuse.severity,
        abuseReasonCode: abuse.reasonCode,
        reasonCodes: abuse.reasonCodes,
        abuseDetail: abuse.detail,
        userId: authUserId,
        ip: req.ip,
        fingerprintPrefix: fingerprint.slice(0, 12),
      },
      'security',
    );
  } else if (abuse.severity === 'medium') {
    req.log?.info(
      {
        securityEvent: 'checkout_abuse_flagged',
        abuseSeverity: abuse.severity,
        abuseReasonCode: abuse.reasonCode,
        reasonCodes: abuse.reasonCodes,
        abuseDetail: abuse.detail,
        userId: authUserId,
        ip: req.ip,
        fingerprintPrefix: fingerprint.slice(0, 12),
      },
      'security',
    );
  }

  try {
    const reused = await findReusableCheckout({
      idempotencyKey,
      fingerprint,
      userId: authUserId,
    });
    if (reused) {
      req.log?.info(
        { checkoutId: reused.id, reused: true },
        'checkout idempotent replay',
      );
      return res.json({
        url: reused.url,
        orderId: reused.id,
        orderReference: reused.id,
        moneyPathOutcome: MONEY_PATH_OUTCOME.REPLAYED,
      });
    }
  } catch (e) {
    if (e.status) {
      return res.status(e.status).json({
        error: e.message,
        moneyPathOutcome: MONEY_PATH_OUTCOME.REJECTED,
      });
    }
    throw e;
  }

  let row;
  try {
    row = await createInitiatedRow({
      idempotencyKey,
      fingerprint,
      userId: authUserId,
      amountUsdCents: trustedCents,
      currency: 'usd',
      senderCountryCode: parsed.senderCountry,
      operatorKey: parsed.operatorKey ?? null,
      recipientNational,
      packageId: parsed.packageId ?? null,
      pricing: priced.pricing,
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      const existing = await getCheckoutByIdempotencyKey(idempotencyKey);
      if (
        existing &&
        existing.requestFingerprint === fingerprint &&
        existing.stripeCheckoutUrl
      ) {
        return res.json({
          url: existing.stripeCheckoutUrl,
          moneyPathOutcome: MONEY_PATH_OUTCOME.REPLAYED,
        });
      }
      return res.status(409).json({
        error: 'Checkout already in progress',
        moneyPathOutcome: MONEY_PATH_OUTCOME.REJECTED,
      });
    }
    throw e;
  }

  try {
    const session = await stripe.checkout.sessions.create(
      {
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Afghanistan mobile top-up (USD)',
              },
              unit_amount: trustedCents,
            },
            quantity: 1,
          },
        ],
        success_url: `${clientBase}/success?session_id={CHECKOUT_SESSION_ID}&order_id=${encodeURIComponent(row.id)}`,
        cancel_url: `${clientBase}/cancel`,
        client_reference_id: row.id,
        metadata: {
          internalCheckoutId: row.id,
          idempotencyKey,
          appUserId: authUserId,
        },
      },
      { idempotencyKey },
    );

    await markCheckoutCreated(row.id, {
      stripeCheckoutSessionId: session.id,
      stripeCheckoutUrl: session.url,
    });

    await writeOrderAudit(prisma, {
      event: 'checkout_session_created',
      payload: { orderId: row.id, stripeCheckoutSessionId: session.id },
      ip: req.ip,
    });

    req.log?.info(
      { checkoutId: row.id, sessionId: session.id },
      'checkout session created',
    );
    recordCheckoutSessionCreated();
    emitPhase1OperationalEvent('checkout_session_created', {
      traceId: req.traceId ?? null,
      orderIdSuffix: safeSuffix(row.id, 10),
      stripeSessionIdSuffix: String(session.id).slice(-12),
    });
    logOpsEvent({
      domain: 'payment',
      event: 'checkout_session_created',
      outcome: 'ok',
      orderId: row.id,
      traceId: req.traceId,
      extra: { stripeSessionIdSuffix: String(session.id).slice(-12) },
    });
    return res.json({
      url: session.url,
      orderId: row.id,
      orderReference: row.id,
      moneyPathOutcome: MONEY_PATH_OUTCOME.ACCEPTED,
    });
  } catch (e) {
    await markCheckoutFailed(row.id);
    throw e;
  }
}

/**
 * POST /create-payment-intent — embedded Payment Element (Next.js marketing checkout).
 * Test keys work in any NODE_ENV; live keys only when NODE_ENV=production.
 */
export async function createTestPaymentIntent(req, res) {
  if (!getValidatedStripeSecretKey()) {
    return res.status(503).json({
      error:
        'Stripe not configured. Set STRIPE_SECRET_KEY in server environment.',
    });
  }
  if (!isStripeKeyAllowedForWebTopupCharges()) {
    const mode = process.env.NODE_ENV || 'development';
    return res.status(403).json({
      error:
        mode === 'production'
          ? 'Stripe key mode is not valid for embedded checkout in this deployment.'
          : 'Live Stripe keys are refused when NODE_ENV is not production. Use sk_test_… (or rk_test_…) for embedded checkout.',
    });
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return res.status(503).json({
      error:
        'Stripe not configured. Set STRIPE_SECRET_KEY in server environment.',
    });
  }

  let parsed;
  try {
    parsed = createPaymentIntentBodySchema.parse(req.body ?? {});
  } catch (e) {
    if (e instanceof ZodError) {
      if (env.nodeEnv !== 'production') {
        return res.status(400).json({
          error: 'Invalid request body',
          details: e.flatten(),
        });
      }
      return res.status(400).json({ error: 'Invalid request body' });
    }
    throw e;
  }

  const idemParsed = idempotencyKeyHeaderSchema.safeParse(
    req.get('idempotency-key'),
  );
  if (!idemParsed.success) {
    req.log?.warn(
      { securityEvent: 'payment_intent_idempotency_key_invalid' },
      'security',
    );
    return res.status(400).json({
      error: 'Idempotency-Key header required (UUID v4)',
      code: 'payment_intent_idempotency_required',
      moneyPathOutcome: MONEY_PATH_OUTCOME.REJECTED,
    });
  }
  const idempotencyKey = idemParsed.data;

  const amountCents = parsed.amount ?? 500;

  let metadata = { source: 'zora_walat_next_test' };
  if (parsed.orderId != null && parsed.orderId !== '') {
    try {
      await assertTopupOrderEligibleForPaymentIntent(
        parsed.orderId,
        amountCents,
      );
      metadata = { ...metadata, topup_order_id: parsed.orderId };
    } catch (e) {
      const c = e?.code;
      if (c === 'invalid_order') {
        return res.status(400).json({ error: 'Invalid order id' });
      }
      if (c === 'not_found') {
        return res.status(404).json({ error: 'Order not found' });
      }
      if (c === 'order_not_pending') {
        return res
          .status(409)
          .json({ error: 'Order is not pending payment' });
      }
      if (c === 'order_already_linked') {
        return res.status(409).json({
          error: 'This order already has a PaymentIntent',
        });
      }
      if (c === 'amount_mismatch') {
        return res.status(400).json({ error: 'Amount does not match order' });
      }
      throw e;
    }
  }

  let pi;
  try {
    pi = await stripe.paymentIntents.create(
      {
        amount: amountCents,
        currency: 'usd',
        automatic_payment_methods: { enabled: true },
        metadata: {
          ...metadata,
          request_idempotency_key: idempotencyKey,
        },
      },
      { idempotencyKey },
    );
  } catch (err) {
    webTopupLog(req.log, 'warn', 'payment_intent_failed', {
      amountCents,
      orderIdSuffix:
        parsed.orderId != null && parsed.orderId !== ''
          ? String(parsed.orderId).slice(-8)
          : undefined,
      stripeType: err?.type,
      stripeCode: err?.code,
    });
    throw err;
  }

  if (!pi.client_secret) {
    webTopupLog(req.log, 'error', 'payment_intent_failed', {
      reason: 'missing_client_secret',
      paymentIntentIdSuffix: safeSuffix(pi.id, 10),
    });
    return res.status(500).json({ error: 'Stripe did not return a client secret' });
  }

  if (parsed.orderId != null && parsed.orderId !== '') {
    const linked = await linkWebTopupPaymentIntent(parsed.orderId, pi.id);
    if (!linked) {
      webTopupLog(req.log, 'warn', 'suspicious_request_detected', {
        kind: 'payment_intent_link_failed',
        orderIdSuffix: String(parsed.orderId).slice(-8),
        paymentIntentIdSuffix: safeSuffix(pi.id, 10),
      });
    }
  }

  webTopupLog(req.log, 'info', 'payment_intent_created', {
    paymentIntentIdSuffix: safeSuffix(pi.id, 10),
    amountCents,
    hasTopupOrder: Boolean(parsed.orderId),
    idempotencyKeySuffix: safeSuffix(idempotencyKey, 8),
    orderIdSuffix:
      parsed.orderId != null && parsed.orderId !== ''
        ? String(parsed.orderId).slice(-8)
        : undefined,
  });

  return res.status(200).json({
    clientSecret: pi.client_secret,
    paymentIntentId: pi.id,
    moneyPathOutcome: MONEY_PATH_OUTCOME.ACCEPTED,
  });
}
