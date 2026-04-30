import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

import { HttpError } from '../lib/httpError.js';
import { getStripeClient } from '../services/stripe.js';
import {
  getValidatedStripeSecretKey,
  isStripeKeyAllowedForHostedCheckout,
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
import { MONEY_PATH_EVENT } from '../domain/payments/moneyPathEvents.js';
import { emitMoneyPathLog } from '../infrastructure/logging/moneyPathLog.js';
import { safeSuffix, webTopupLog } from '../lib/webTopupObservability.js';
import { validatePackageOperatorPair } from '../lib/allowedCheckout.js';
import { resolveCheckoutPricing } from '../domain/pricing/resolveCheckoutPricing.js';
import {
  normalizeAfghanNational,
  validateAfghanMobileNational,
} from '../lib/phone.js';
import { originHostnameForLog } from '../lib/corsPolicy.js';
import { resolveCheckoutClientBase } from '../lib/checkoutClientBase.js';
import {
  buildStripeCheckoutReturnUrls,
  checkoutRedirectLocalDiagnosticCode,
} from '../lib/checkoutRedirectUrls.js';
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
import { API_CONTRACT_CODE } from '../constants/apiContractCodes.js';
import { MONEY_PATH_OUTCOME } from '../constants/moneyPathOutcome.js';
import { AUTH_ERROR_CODE } from '../constants/authErrors.js';
import { WEBTOPUP_CLIENT_ERROR_CODE } from '../constants/webtopupClientErrors.js';
import { clientErrorBody } from '../lib/clientErrorJson.js';
import { validateControlledStripeLiveProofCheckout } from '../lib/controlledStripeLiveProof.js';
import { timingSafeEqualUtf8 } from '../lib/timingSafeString.js';
import { assertPaymentIntentRiskAllowed } from '../services/risk/assertPaymentIntentRisk.js';
import { orchestrateStripeCall } from '../services/reliability/reliabilityOrchestrator.js';
import {
  buildStripeCheckoutLineItems,
  pricingBreakdownFromSnapshot,
  pricingBreakdownResponseBody,
} from '../lib/checkoutPricingBreakdown.js';
import { buildPricingMeta } from '../domain/pricing/pricingSnapshotPolicy.js';

export async function createCheckoutSession(req, res) {
  const authUserId = req.user?.id;
  if (!authUserId) {
    return res
      .status(401)
      .json(
        clientErrorBody('Authentication required', AUTH_ERROR_CODE.AUTH_REQUIRED),
      );
  }

  if (!getValidatedStripeSecretKey()) {
    return res.status(503).json(
      clientErrorBody(
        'Stripe not configured. Set STRIPE_SECRET_KEY in server environment (see server/.env.example).',
        'stripe_not_configured',
      ),
    );
  }
  if (!isStripeKeyAllowedForHostedCheckout()) {
    const mode = process.env.NODE_ENV || 'development';
    return res.status(403).json(
      clientErrorBody(
        mode === 'production'
          ? 'Stripe key mode is not valid for hosted checkout in this deployment.'
          : 'Live Stripe keys are refused when NODE_ENV is not production. Use test-mode keys from the Stripe Dashboard for hosted checkout.',
        'stripe_key_mode_forbidden',
      ),
    );
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return res.status(503).json(
      clientErrorBody(
        'Stripe not configured. Set STRIPE_SECRET_KEY in server environment (see server/.env.example).',
        'stripe_not_configured',
      ),
    );
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
    return res.status(clientBaseResolution.status).json(
      clientErrorBody(
        String(clientBaseResolution.error ?? 'Bad request'),
        'checkout_client_base_unresolved',
      ),
    );
  }
  const clientBase = clientBaseResolution.clientBase;

  const redirectDiag = checkoutRedirectLocalDiagnosticCode({
    nodeEnv: env.nodeEnv,
    clientBase,
    source: clientBaseResolution.source,
  });
  if (redirectDiag) {
    req.log?.warn(
      {
        checkoutRedirectDiagnostic: redirectDiag,
        clientBase,
        hint: `Repo Next.js defaults to port 3000 (root package.json). Origin must match a running web app.`,
      },
      'checkout redirect origin port mismatch risk',
    );
  }

  const idemRaw = req.get('idempotency-key');
  const idemParsed = idempotencyKeyHeaderSchema.safeParse(idemRaw);
  if (!idemParsed.success) {
    req.log?.warn(
      { securityEvent: 'checkout_idempotency_key_invalid' },
      'security',
    );
    return res.status(400).json({
      ...clientErrorBody(
        'Idempotency-Key header required (UUID v4)',
        'checkout_idempotency_required',
      ),
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
        return res
          .status(400)
          .json(
            clientErrorBody('Invalid request body', API_CONTRACT_CODE.VALIDATION_ERROR),
          );
      }
      return res.status(400).json({
        ...clientErrorBody('Invalid request body', API_CONTRACT_CODE.VALIDATION_ERROR),
        details: err.flatten(),
      });
    }
    throw err;
  }

  const sender = await prisma.senderCountry.findUnique({
    where: { code: parsed.senderCountry },
  });
  if (!sender || !sender.enabled) {
    return res.status(400).json(
      clientErrorBody('Invalid or disabled sender country', 'SENDER_COUNTRY_INVALID'),
    );
  }

  const priced = resolveCheckoutPricing({
    packageId: parsed.packageId,
    amountCents: parsed.amountUsdCents,
    riskBufferPercent: sender.riskBufferPercent,
    senderCountryCode: parsed.senderCountry,
    billingJurisdiction: parsed.billingJurisdiction ?? null,
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
    return res.status(400).json(
      clientErrorBody(
        hard ??
          (env.nodeEnv === 'production'
            ? 'Checkout cannot be priced safely'
            : priced.message),
        String(priced.code),
      ),
    );
  }

  const trustedCents = priced.pricing.finalPriceCents;
  const pricingBreakdown = pricingBreakdownResponseBody(priced.pricing);

  const pair = validatePackageOperatorPair(
    parsed.packageId,
    parsed.operatorKey,
  );
  if (!pair.ok) {
    req.log?.warn(
      { securityEvent: 'checkout_package_operator_mismatch' },
      'security',
    );
    return res.status(400).json(
      clientErrorBody(
        env.nodeEnv === 'production'
          ? 'Invalid checkout request'
          : pair.error,
        'checkout_package_operator_mismatch',
      ),
    );
  }

  let recipientNational = null;
  if (parsed.recipientPhone) {
    recipientNational = normalizeAfghanNational(parsed.recipientPhone);
    if (!recipientNational) {
      return res
        .status(400)
        .json(
          clientErrorBody('Invalid recipient phone', 'checkout_invalid_recipient_phone'),
        );
    }
    const v = validateAfghanMobileNational(recipientNational);
    if (!v.ok) {
      return res.status(400).json(
        clientErrorBody(
          v.error || 'Invalid recipient phone',
          'checkout_invalid_recipient_phone',
        ),
      );
    }
  }

  const hasOperatorAndRecipient = Boolean(
    parsed.operatorKey && parsed.recipientPhone,
  );
  const proofGate = validateControlledStripeLiveProofCheckout({
    finalPriceCents: trustedCents,
    recipientNational,
    hasOperatorAndRecipient,
  });
  if (!proofGate.ok) {
    req.log?.warn(
      {
        securityEvent: 'controlled_stripe_live_proof_rejected',
        code: proofGate.code,
      },
      'security',
    );
    return res.status(400).json(
      clientErrorBody(proofGate.message, proofGate.code),
    );
  }

  const fingerprint = checkoutRequestFingerprint({
    userId: authUserId,
    amountCents: trustedCents,
    senderCountryCode: parsed.senderCountry,
    operatorKey: parsed.operatorKey ?? null,
    recipientNational,
    packageId: parsed.packageId ?? null,
    billingJurisdiction: parsed.billingJurisdiction ?? null,
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
      const replayRow = await prisma.paymentCheckout.findUnique({
        where: { id: reused.id },
        select: { pricingSnapshot: true, amountUsdCents: true },
      });
      const replayBreakdown = replayRow
        ? pricingBreakdownFromSnapshot(
            replayRow.pricingSnapshot,
            replayRow.amountUsdCents,
          )
        : pricingBreakdown;
      return res.json({
        url: reused.url,
        orderId: reused.id,
        orderReference: reused.id,
        moneyPathOutcome: MONEY_PATH_OUTCOME.REPLAYED,
        pricingBreakdown: replayBreakdown,
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
      amountCents: trustedCents,
      currency: 'usd',
      senderCountryCode: parsed.senderCountry,
      operatorKey: parsed.operatorKey ?? null,
      recipientNational,
      packageId: parsed.packageId ?? null,
      pricing: priced.pricing,
      pricingMeta: buildPricingMeta({
        senderCountryCode: parsed.senderCountry,
        billingJurisdiction: parsed.billingJurisdiction ?? null,
      }),
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
          orderId: existing.id,
          orderReference: existing.id,
          moneyPathOutcome: MONEY_PATH_OUTCOME.REPLAYED,
          pricingBreakdown: pricingBreakdownFromSnapshot(
            existing.pricingSnapshot,
            existing.amountUsdCents,
          ),
        });
      }
      return res.status(409).json({
        error: 'Checkout already in progress',
        moneyPathOutcome: MONEY_PATH_OUTCOME.REJECTED,
      });
    }
    throw e;
  }

  const stripeReturn = buildStripeCheckoutReturnUrls(clientBase, row.id);
  req.log?.info(
    {
      checkoutRedirectBuilt: true,
      clientBase,
      checkoutClientBaseSource: clientBaseResolution.source,
      successPath: stripeReturn.successPath,
      cancelPath: stripeReturn.cancelPath,
      cancelUrl: stripeReturn.cancelUrl,
    },
    'checkout stripe return urls',
  );

  try {
    const session = await orchestrateStripeCall({
      operationName: 'checkout.sessions.create',
      traceId: req.traceId,
      log: req.log,
      /** With Stripe `timeout` ~25s, cap attempts so the handler finishes before typical client timeouts. */
      maxAttempts: 2,
      fn: () =>
        stripe.checkout.sessions.create(
          {
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: buildStripeCheckoutLineItems(priced.pricing),
            success_url: stripeReturn.successUrl,
            cancel_url: stripeReturn.cancelUrl,
            client_reference_id: row.id,
            metadata: {
              internalCheckoutId: row.id,
              idempotencyKey,
              appUserId: authUserId,
            },
          },
          { idempotencyKey },
        ),
    });

    await markCheckoutCreated(row.id, {
      stripeCheckoutSessionId: session.id,
      stripeCheckoutUrl: session.url,
    });

    console.log('STRIPE_SESSION_CREATED', session.id);

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
    emitMoneyPathLog(MONEY_PATH_EVENT.CHECKOUT_SESSION_CREATED, {
      traceId: req.traceId ?? null,
      orderIdSuffix: safeSuffix(row.id, 10),
      stripeSessionIdSuffix: String(session.id).slice(-12),
    });
    if (
      session.amount_total != null &&
      session.amount_total !== trustedCents
    ) {
      req.log?.error(
        {
          securityEvent: 'stripe_checkout_amount_total_mismatch',
          expectedCents: trustedCents,
          sessionAmountTotal: session.amount_total,
        },
        'security',
      );
    }

    return res.json({
      url: session.url,
      orderId: row.id,
      orderReference: row.id,
      moneyPathOutcome: MONEY_PATH_OUTCOME.ACCEPTED,
      pricingBreakdown,
    });
  } catch (e) {
    await markCheckoutFailed(row.id);
    throw e;
  }
}

/**
 * POST /checkout-pricing-quote (root) and POST /api/checkout-pricing-quote (`routes/index.js` + `payment.routes` under `/api`)
 * — same body as hosted checkout; returns transparent breakdown
 * without creating a Stripe session (for review UI before pay).
 */
export async function createCheckoutPricingQuote(req, res) {
  let parsed;
  try {
    parsed = checkoutSessionBodySchema.parse(req.body ?? {});
  } catch (err) {
    if (err instanceof ZodError) {
      req.log?.warn(
        { securityEvent: 'checkout_quote_payload_schema_invalid' },
        'security',
      );
      if (env.nodeEnv === 'production') {
        return res
          .status(400)
          .json(
            clientErrorBody('Invalid request body', API_CONTRACT_CODE.VALIDATION_ERROR),
          );
      }
      return res.status(400).json({
        ...clientErrorBody('Invalid request body', API_CONTRACT_CODE.VALIDATION_ERROR),
        details: err.flatten(),
      });
    }
    throw err;
  }

  const sender = await prisma.senderCountry.findUnique({
    where: { code: parsed.senderCountry },
  });
  if (!sender || !sender.enabled) {
    return res.status(400).json(
      clientErrorBody('Invalid or disabled sender country', 'SENDER_COUNTRY_INVALID'),
    );
  }

  const priced = resolveCheckoutPricing({
    packageId: parsed.packageId,
    amountCents: parsed.amountUsdCents,
    riskBufferPercent: sender.riskBufferPercent,
    senderCountryCode: parsed.senderCountry,
    billingJurisdiction: parsed.billingJurisdiction ?? null,
  });
  if (!priced.ok) {
    req.log?.warn(
      { securityEvent: 'checkout_quote_pricing_rejected', code: priced.code },
      'security',
    );
    const hard =
      priced.code === 'MARGIN_BELOW_FLOOR'
        ? 'Checkout rejected: projected margin below minimum threshold'
        : priced.code === 'CHECKOUT_BELOW_MINIMUM'
          ? priced.message
          : null;
    return res.status(400).json(
      clientErrorBody(
        hard ??
          (env.nodeEnv === 'production'
            ? 'Checkout cannot be priced safely'
            : priced.message),
        String(priced.code),
      ),
    );
  }

  return res.json({
    pricingBreakdown: pricingBreakdownResponseBody(priced.pricing),
    pricingMeta: buildPricingMeta({
      senderCountryCode: parsed.senderCountry,
      billingJurisdiction: parsed.billingJurisdiction ?? null,
    }),
  });
}

/**
 * POST /create-payment-intent — embedded Payment Element (Next.js marketing checkout).
 * Test keys work in any NODE_ENV; live keys only when NODE_ENV=production.
 *
 * When `orderId` is set, caller must prove possession of the order `sessionKey` via
 * header `X-ZW-WebTopup-Session` (same value returned from `POST /api/topup-orders`).
 * Optional `Authorization: Bearer` adds non-blocking metadata (`optional_app_user_id`, …).
 */
export async function createTestPaymentIntent(req, res) {
  let parsed;
  try {
    parsed = createPaymentIntentBodySchema.parse(req.body ?? {});
  } catch (e) {
    if (e instanceof ZodError) {
      if (env.nodeEnv !== 'production') {
        return res.status(400).json({
          ...clientErrorBody('Invalid request body', 'validation_error'),
          details: e.flatten(),
        });
      }
      return res
        .status(400)
        .json(clientErrorBody('Invalid request body', 'validation_error'));
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
    return res.status(400).json(
      clientErrorBody(
        'Idempotency-Key header required (UUID v4)',
        WEBTOPUP_CLIENT_ERROR_CODE.PAYMENT_INTENT_IDEMPOTENCY_REQUIRED,
        { moneyPathOutcome: MONEY_PATH_OUTCOME.REJECTED },
      ),
    );
  }
  const idempotencyKey = idemParsed.data;

  const amountCents = parsed.amount ?? 500;

  assertPaymentIntentRiskAllowed(req, {
    amountCents,
    traceId: req.traceId ?? null,
  });

  /**
   * Order-bound PaymentIntent: enforce possession proof **before** Stripe availability checks so
   * integration / CI without STRIPE_SECRET_KEY still receives **403** for invalid session (contract),
   * not **503** stripe_not_configured.
   */
  let metadata = { source: 'zora_walat_next_test' };
  if (parsed.orderId != null && parsed.orderId !== '') {
    let orderRow;
    try {
      orderRow = await assertTopupOrderEligibleForPaymentIntent(
        parsed.orderId,
        amountCents,
      );
      metadata = {
        ...metadata,
        topup_order_id: parsed.orderId,
        ...(orderRow.userId
          ? { webtopup_bound_user_id: String(orderRow.userId) }
          : {}),
      };
    } catch (e) {
      const c = e?.code;
      if (c === 'invalid_order') {
        return res
          .status(400)
          .json(clientErrorBody('Invalid order id', 'invalid_topup_order_id'));
      }
      if (c === 'not_found') {
        return res
          .status(404)
          .json(clientErrorBody('Order not found', 'topup_order_not_found'));
      }
      if (c === 'order_not_pending') {
        return res.status(409).json(
          clientErrorBody('Order is not pending payment', 'topup_order_not_pending'),
        );
      }
      if (c === 'order_already_linked') {
        return res.status(409).json(
          clientErrorBody(
            'This order already has a PaymentIntent',
            'topup_order_pi_already_linked',
          ),
        );
      }
      if (c === 'amount_mismatch') {
        return res
          .status(400)
          .json(clientErrorBody('Amount does not match order', 'topup_order_amount_mismatch'));
      }
      if (e instanceof HttpError && e.status === 403 && e.code === 'restricted_region') {
        return res.status(403).json(
          clientErrorBody(e.message, 'restricted_region', {
            moneyPathOutcome: MONEY_PATH_OUTCOME.REJECTED,
          }),
        );
      }
      throw e;
    }

    const sessionHeader = req.get('x-zw-webtopup-session')?.trim() ?? '';
    if (!timingSafeEqualUtf8(sessionHeader, orderRow.sessionKey)) {
      req.log?.warn(
        { securityEvent: 'webtopup_pi_session_invalid', orderIdSuffix: parsed.orderId.slice(-8) },
        'security',
      );
      return res.status(403).json(
        clientErrorBody(
          'Header X-ZW-WebTopup-Session must match the order session from checkout.',
          WEBTOPUP_CLIENT_ERROR_CODE.ORDER_SESSION_INVALID,
          { moneyPathOutcome: MONEY_PATH_OUTCOME.REJECTED },
        ),
      );
    }
  }

  if (!getValidatedStripeSecretKey()) {
    return res.status(503).json(
      clientErrorBody(
        'Stripe not configured. Set STRIPE_SECRET_KEY in server environment.',
        'stripe_not_configured',
      ),
    );
  }
  if (!isStripeKeyAllowedForWebTopupCharges()) {
    const mode = process.env.NODE_ENV || 'development';
    return res.status(403).json(
      clientErrorBody(
        mode === 'production'
          ? 'Stripe key mode is not valid for embedded checkout in this deployment.'
          : 'Live Stripe keys are refused when NODE_ENV is not production. Use test-mode keys from the Stripe Dashboard for embedded checkout.',
        'stripe_key_mode_forbidden',
      ),
    );
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return res.status(503).json(
      clientErrorBody(
        'Stripe not configured. Set STRIPE_SECRET_KEY in server environment.',
        'stripe_not_configured',
      ),
    );
  }

  const auth = req.webtopupAuthUser;
  const stripeMetadata = {
    ...metadata,
    request_idempotency_key: idempotencyKey,
    ...(auth
      ? {
          optional_app_user_id: auth.id,
          optional_email_verified: auth.emailVerified ? 'true' : 'false',
        }
      : {}),
  };

  let pi;
  try {
    pi = await orchestrateStripeCall({
      operationName: 'paymentIntents.create',
      traceId: req.traceId,
      log: req.log,
      fn: () =>
        stripe.paymentIntents.create(
          {
            amount: amountCents,
            currency: 'usd',
            automatic_payment_methods: { enabled: true },
            metadata: stripeMetadata,
          },
          { idempotencyKey },
        ),
    });
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
    return res
      .status(500)
      .json(
        clientErrorBody(
          'Stripe did not return a client secret',
          'stripe_missing_client_secret',
        ),
      );
  }

  if (parsed.orderId != null && parsed.orderId !== '') {
    const metaOrder = pi.metadata?.topup_order_id;
    if (String(metaOrder ?? '') !== String(parsed.orderId)) {
      webTopupLog(req.log, 'error', 'payment_intent_metadata_mismatch', {
        orderIdSuffix: String(parsed.orderId).slice(-8),
        paymentIntentIdSuffix: safeSuffix(pi.id, 10),
      });
      try {
        await orchestrateStripeCall({
          operationName: 'paymentIntents.cancel',
          traceId: req.traceId,
          log: req.log,
          useCircuit: false,
          maxAttempts: 2,
          fn: () => stripe.paymentIntents.cancel(pi.id),
        });
      } catch (cancelErr) {
        req.log?.warn?.(
          {
            securityEvent: 'payment_intent_cancel_failed',
            paymentIntentIdSuffix: safeSuffix(pi.id, 10),
          },
          'security',
        );
      }
      return res.status(500).json(
        clientErrorBody(
          'PaymentIntent metadata integrity check failed',
          WEBTOPUP_CLIENT_ERROR_CODE.PAYMENT_INTENT_METADATA_MISMATCH,
          { moneyPathOutcome: MONEY_PATH_OUTCOME.REJECTED },
        ),
      );
    }
    if (typeof pi.amount === 'number' && pi.amount !== amountCents) {
      try {
        await orchestrateStripeCall({
          operationName: 'paymentIntents.cancel',
          traceId: req.traceId,
          log: req.log,
          useCircuit: false,
          maxAttempts: 2,
          fn: () => stripe.paymentIntents.cancel(pi.id),
        });
      } catch {
        /* best-effort */
      }
      return res.status(400).json(
        clientErrorBody('Amount does not match order', 'topup_order_amount_mismatch'),
      );
    }
    const linked = await linkWebTopupPaymentIntent(parsed.orderId, pi.id);
    if (!linked) {
      webTopupLog(req.log, 'warn', 'suspicious_request_detected', {
        kind: 'payment_intent_link_failed',
        orderIdSuffix: String(parsed.orderId).slice(-8),
        paymentIntentIdSuffix: safeSuffix(pi.id, 10),
      });
      try {
        await orchestrateStripeCall({
          operationName: 'paymentIntents.cancel',
          traceId: req.traceId,
          log: req.log,
          useCircuit: false,
          maxAttempts: 2,
          fn: () => stripe.paymentIntents.cancel(pi.id),
        });
      } catch {
        /* best-effort */
      }
      return res.status(409).json(
        clientErrorBody(
          'Could not attach PaymentIntent to order; refresh and retry.',
          WEBTOPUP_CLIENT_ERROR_CODE.TOPUP_ORDER_PI_LINK_FAILED,
          { moneyPathOutcome: MONEY_PATH_OUTCOME.REJECTED },
        ),
      );
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
    optionalAuth: Boolean(auth),
  });

  emitMoneyPathLog(MONEY_PATH_EVENT.PAYMENT_INTENT_CREATED, {
    traceId: req.traceId ?? null,
    paymentIntentIdSuffix: safeSuffix(pi.id, 10),
    amountCents,
    hasTopupOrder: Boolean(parsed.orderId),
    orderIdSuffix:
      parsed.orderId != null && parsed.orderId !== ''
        ? String(parsed.orderId).slice(-8)
        : undefined,
  });

  return res.status(200).json({
    success: true,
    clientSecret: pi.client_secret,
    paymentIntentId: pi.id,
    moneyPathOutcome: MONEY_PATH_OUTCOME.ACCEPTED,
  });
}
