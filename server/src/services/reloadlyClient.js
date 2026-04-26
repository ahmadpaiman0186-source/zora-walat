import { env } from '../config/env.js';
import {
  AIRTIME_ERROR_KIND,
  AIRTIME_OUTCOME,
} from '../domain/fulfillment/airtimeFulfillmentResult.js';
import {
  buildReloadlyTopupPayload,
  sendReloadlyTopupRequest,
} from '../domain/fulfillment/reloadlyTopup.js';
import {
  emitReloadlyFulfillmentEvent,
  reloadlyFulfillmentBaseFields,
} from '../lib/reloadlyFulfillmentObservability.js';
import { getTraceId } from '../lib/requestContext.js';
import {
  buildPhase1ProviderIdentityBundle,
  buildReloadlyPhase1CustomIdentifier,
} from '../lib/providerExecutionCorrelation.js';
import { getReloadlyAccessTokenCached } from './reloadlyAuthService.js';
import {
  getReloadlyTopupCircuitState,
  recordReloadlyTopupOutcome,
  recordReloadlyTopupOutcomeFromSendTopupResult,
} from './reloadlyProviderCircuitBreaker.js';
import { findReloadlyTopupReportRowByCustomIdentifier } from './reloadlyTransactionInquiry.js';
import {
  getReloadlyTopupRegistryEntry,
  setReloadlyTopupRegistryEntry,
} from './reloadlyIdempotencyRegistry.js';
import {
  markReloadlyTopupPostInFlight,
  clearReloadlyTopupPostInFlight,
  isReloadlyTopupPostInFlight,
} from './reloadlyTopupInFlight.js';
import { resolveStalledSubstate } from '../domain/fulfillment/fulfillmentStalledLifecycle.js';
import { recordMoneyPathOpsSignal } from '../lib/opsMetrics.js';
import { persistReloadlyPreHttpDispatchEvidence } from './fulfillmentAttemptDispatchEvidence.js';

const ACCEPT = 'application/com.reloadly.topups-v1+json';

export function isReloadlyConfigured() {
  return (
    String(env.reloadlyClientId ?? '').trim().length > 0 &&
    String(env.reloadlyClientSecret ?? '').trim().length > 0
  );
}

function safeRecipientHint(national) {
  if (!national || typeof national !== 'string' || national.length < 4) {
    return null;
  }
  return `***${national.slice(-4)}`;
}

/**
 * GET /operators — Bearer token; no secrets in logs.
 * @param {string} countryCode ISO 3166-1 alpha-2
 * @returns {Promise<{ ok: true, operators: object[], raw: any } | { ok: false, failureCode: string, failureMessage: string, operators: [], raw: any }>}
 */
export async function getOperators(countryCode) {
  const cc = String(countryCode ?? '')
    .trim()
    .toUpperCase();
  if (!cc || cc.length !== 2) {
    return {
      ok: false,
      failureCode: 'reloadly_operators_bad_country',
      failureMessage: 'Invalid country code',
      operators: [],
      raw: null,
    };
  }

  const tokenResult = await getReloadlyAccessTokenCached();
  if (!tokenResult.ok) {
    return {
      ok: false,
      failureCode: tokenResult.failureCode,
      failureMessage: tokenResult.failureMessage,
      operators: [],
      raw: tokenResult.responseSummary ?? null,
    };
  }

  const base = env.reloadlyBaseUrl.replace(/\/$/, '');
  const url = `${base}/operators?countryCode=${encodeURIComponent(cc)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.airtimeProviderTimeoutMs);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: ACCEPT,
        Authorization: `Bearer ${tokenResult.accessToken}`,
      },
      signal: controller.signal,
    });

    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    if (!res.ok) {
      return {
        ok: false,
        failureCode: 'reloadly_operators_http',
        failureMessage: `Reloadly operators HTTP ${res.status}`,
        operators: [],
        raw: json,
      };
    }

    const list = Array.isArray(json)
      ? json
      : json && typeof json === 'object'
        ? json.content ?? json.data ?? []
        : [];
    const operators = Array.isArray(list) ? list : [];

    return { ok: true, operators, raw: json };
  } catch (err) {
    if (err?.name === 'AbortError') {
      return {
        ok: false,
        failureCode: 'reloadly_operators_timeout',
        failureMessage: 'Reloadly operators request timed out',
        operators: [],
        raw: null,
      };
    }
    return {
      ok: false,
      failureCode: 'reloadly_operators_request_failed',
      failureMessage: String(err?.message ?? err ?? 'request_failed').slice(0, 200),
      operators: [],
      raw: null,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * POST /topups — normalized outcome for integrations (truth-first; no legacy `ok` flag).
 * @param {object} p
 * @param {string} p.phone — recipient number as required by Reloadly (e.g. international digits).
 * @param {number|string} p.operatorId
 * @param {string} p.amount — decimal string "0.00"
 * @param {string} p.countryCode — ISO country code for recipient phone
 * @param {string} [p.customIdentifier] — idempotency / correlation (e.g. order id + attempt)
 * @param {import('pino').Logger | undefined} [p.log]
 * @param {{ traceId?: string | null, orderId?: string | null, attemptNumber?: number | null }} [p.ctx]
 * @returns {Promise<
 *   | { resultType: 'confirmed', providerReference: string, raw: object }
 *   | { resultType: 'pending', providerReference: string | null, raw: object }
 *   | { resultType: 'ambiguous', raw: object }
 *   | { resultType: 'failed', raw: object }
 * >}
 */
export async function sendTopup({ phone, operatorId, amount, countryCode, customIdentifier, log, ctx = {} }) {
  const amountStr =
    typeof amount === 'string' ? amount : Number(amount).toFixed(2);
  const body = {
    operatorId,
    amount: amountStr,
    useLocalAmount: false,
    recipientPhone: {
      countryCode: String(countryCode ?? '')
        .trim()
        .toUpperCase(),
      number: String(phone ?? '').trim(),
    },
  };
  if (customIdentifier != null && String(customIdentifier).trim()) {
    body.customIdentifier = String(customIdentifier).trim();
  }

  const traceId = ctx.traceId ?? getTraceId();
  const t0 = Date.now();

  emitReloadlyFulfillmentEvent(log, 'info', 'reloadly_request_started', {
    ...reloadlyFulfillmentBaseFields(ctx.orderId ?? null, {
      traceId,
      attemptNumber: ctx.attemptNumber ?? null,
      providerReference: customIdentifier ?? null,
      decisionPath: 'topups_post',
    }),
  });

  const tokenResult = await getReloadlyAccessTokenCached();
  if (!tokenResult.ok) {
    const latencyMs = Date.now() - t0;
    emitReloadlyFulfillmentEvent(log, 'warn', 'reloadly_request_failed', {
      ...reloadlyFulfillmentBaseFields(ctx.orderId ?? null, {
        traceId,
        attemptNumber: ctx.attemptNumber ?? null,
        latencyMs,
        normalizedOutcome: 'auth_failure',
        proofClassification: 'no_delivery_proof',
      }),
    });
    const authFail = {
      resultType: 'failed',
      raw: { phase: 'auth', ...tokenResult },
    };
    await recordReloadlyTopupOutcomeFromSendTopupResult(authFail);
    return authFail;
  }

  const topup = await sendReloadlyTopupRequest({
    accessToken: tokenResult.accessToken,
    sandbox: env.reloadlySandbox,
    body,
    timeoutMs: env.airtimeProviderTimeoutMs,
    baseUrl: env.reloadlyBaseUrl,
  });

  const latencyMs = Date.now() - t0;

  if (topup.kind === 'confirmed') {
    emitReloadlyFulfillmentEvent(log, 'info', 'reloadly_request_completed', {
      ...reloadlyFulfillmentBaseFields(ctx.orderId ?? null, {
        traceId,
        attemptNumber: ctx.attemptNumber ?? null,
        providerReference: topup.providerReference,
        latencyMs,
        normalizedOutcome: 'confirmed',
        proofClassification: 'confirmed_delivery',
      }),
    });
    emitReloadlyFulfillmentEvent(log, 'info', 'reloadly_delivery_confirmed', {
      ...reloadlyFulfillmentBaseFields(ctx.orderId ?? null, {
        traceId,
        attemptNumber: ctx.attemptNumber ?? null,
        providerReference: topup.providerReference,
        latencyMs,
        normalizedOutcome: 'confirmed',
        decisionPath: 'topups_post',
      }),
    });
    emitReloadlyFulfillmentEvent(log, 'info', 'reloadly_status_mapped', {
      ...reloadlyFulfillmentBaseFields(ctx.orderId ?? null, {
        traceId,
        attemptNumber: ctx.attemptNumber ?? null,
        providerReference: topup.providerReference,
        latencyMs,
        normalizedOutcome: 'confirmed',
        proofClassification: 'confirmed_delivery',
      }),
    });
    const ok = {
      resultType: 'confirmed',
      providerReference: topup.providerReference,
      raw: topup.responseSummary,
    };
    recordReloadlyTopupOutcomeFromSendTopupResult(ok);
    return ok;
  }

  if (topup.kind === 'pending') {
    emitReloadlyFulfillmentEvent(log, 'info', 'reloadly_request_completed', {
      ...reloadlyFulfillmentBaseFields(ctx.orderId ?? null, {
        traceId,
        attemptNumber: ctx.attemptNumber ?? null,
        providerReference: topup.providerReference,
        latencyMs,
        normalizedOutcome: 'pending_verification',
        proofClassification: 'pending_provider',
      }),
    });
    emitReloadlyFulfillmentEvent(log, 'warn', 'reloadly_status_mapped', {
      ...reloadlyFulfillmentBaseFields(ctx.orderId ?? null, {
        traceId,
        attemptNumber: ctx.attemptNumber ?? null,
        providerReference: topup.providerReference,
        latencyMs,
        normalizedOutcome: 'pending_verification',
        proofClassification: 'pending_provider',
      }),
    });
    const pend = {
      resultType: 'pending',
      providerReference: topup.providerReference,
      raw: topup.responseSummary,
    };
    await recordReloadlyTopupOutcomeFromSendTopupResult(pend);
    return pend;
  }

  if (topup.kind === 'ambiguous') {
    emitReloadlyFulfillmentEvent(log, 'warn', 'reloadly_request_completed', {
      ...reloadlyFulfillmentBaseFields(ctx.orderId ?? null, {
        traceId,
        attemptNumber: ctx.attemptNumber ?? null,
        latencyMs,
        normalizedOutcome: 'ambiguous',
        proofClassification: 'ambiguous_evidence',
      }),
    });
    emitReloadlyFulfillmentEvent(log, 'warn', 'reloadly_ambiguous_result', {
      ...reloadlyFulfillmentBaseFields(ctx.orderId ?? null, {
        traceId,
        attemptNumber: ctx.attemptNumber ?? null,
        latencyMs,
        normalizedOutcome: 'ambiguous',
        decisionPath: 'topups_post',
        proofClassification: 'ambiguous_evidence',
      }),
    });
    const amb = {
      resultType: 'ambiguous',
      raw: topup.responseSummary,
    };
    await recordReloadlyTopupOutcomeFromSendTopupResult(amb);
    return amb;
  }

  emitReloadlyFulfillmentEvent(log, 'warn', 'reloadly_request_failed', {
    ...reloadlyFulfillmentBaseFields(ctx.orderId ?? null, {
      traceId,
      attemptNumber: ctx.attemptNumber ?? null,
      latencyMs,
      normalizedOutcome: 'failed',
      proofClassification: 'explicit_non_delivery',
    }),
  });
  if (topup.failureCode === 'reloadly_topup_duplicate') {
    emitReloadlyFulfillmentEvent(log, 'warn', 'reloadly_duplicate_send_prevented', {
      ...reloadlyFulfillmentBaseFields(ctx.orderId ?? null, {
        traceId,
        attemptNumber: ctx.attemptNumber ?? null,
        latencyMs,
        normalizedOutcome: 'duplicate_rejected',
        decisionPath: 'http_409',
        proofClassification: 'no_delivery_proof',
      }),
    });
  }
  emitReloadlyFulfillmentEvent(log, 'warn', 'reloadly_status_mapped', {
    ...reloadlyFulfillmentBaseFields(ctx.orderId ?? null, {
      traceId,
      attemptNumber: ctx.attemptNumber ?? null,
      latencyMs,
      normalizedOutcome: 'failed',
      proofClassification:
        topup.failureCode === 'reloadly_topup_explicit_failure'
          ? 'explicit_non_delivery'
          : 'no_delivery_proof',
    }),
  });
  const failed = {
    resultType: 'failed',
    raw: topup,
  };
  await recordReloadlyTopupOutcomeFromSendTopupResult(failed);
  return failed;
}

/**
 * Paid checkout → Reloadly top-up (uses {@link sendTopup}).
 *
 * **Idempotency / duplicate-send:** `customIdentifier` is `zwr_{FulfillmentAttempt.id}` when `attemptId`
 * is present (stable 1:1 with the attempt row; aligns with `providerExecutionCorrelationId` logs). Legacy
 * fallback: `${orderId}_a${attemptNumber}`. Reloadly HTTP 409 → `reloadly_topup_duplicate` (logged; not
 * silent success). A *new* FulfillmentAttempt row → *new* key → second provider send only via new attempt.
 * **Residual risk:** transport success at Reloadly with no persisted HTTP body locally → reconciler/ops
 * must verify in dashboard before approving a replacement attempt; use `PROCESSING_RECOVERY_SANDBOX_CONSERVATIVE=true`
 * during first sandbox drills to block auto `retry_new_attempt`.
 *
 * @param {import('@prisma/client').PaymentCheckout} order
 * @param {{
 *   attemptNumber?: number,
 *   attemptId?: string,
 *   traceId?: string | null,
 *   log?: import('pino').Logger,
 *   bullmqAttemptsMade?: number,
 *   forceProviderInquiryBeforePost?: boolean,
 *   attemptStartedAt?: Date | string | null,
 * }} [fulfillmentCtx]
 */
export async function fulfillReloadlyDelivery(order, fulfillmentCtx = {}) {
  const apiBase = env.reloadlyBaseUrl;
  const attemptNum =
    fulfillmentCtx.attemptNumber != null && Number.isFinite(Number(fulfillmentCtx.attemptNumber))
      ? Number(fulfillmentCtx.attemptNumber)
      : 1;
  const customIdentifier = buildReloadlyPhase1CustomIdentifier(
    order.id,
    fulfillmentCtx.attemptId,
    attemptNum,
  );

  const phase1Identity = buildPhase1ProviderIdentityBundle(order.id, fulfillmentCtx.attemptId);

  const snap =
    order.pricingSnapshot && typeof order.pricingSnapshot === 'object'
      ? order.pricingSnapshot
      : null;
  const recipientValueCents =
    snap?.customerProductValueUsdCents != null &&
    Number.isFinite(Number(snap.customerProductValueUsdCents))
      ? Math.round(Number(snap.customerProductValueUsdCents))
      : order.amountUsdCents;

  const requestSummary = {
    mode: 'reloadly',
    sandbox: env.reloadlySandbox,
    audienceUrl: apiBase,
    topupsPath: `${String(apiBase).replace(/\/$/, '')}/topups`,
    packageId: order.packageId ?? null,
    operatorKey: order.operatorKey ?? null,
    recipientHint: safeRecipientHint(order.recipientNational),
    amountUsdCents: recipientValueCents,
    stripeChargeUsdCents: order.amountUsdCents,
    currency: order.currency,
    providerRequestKey: customIdentifier,
    externalReference: customIdentifier,
    reloadlyCustomIdentifier: customIdentifier,
    attemptNumber: attemptNum,
    attemptId: fulfillmentCtx.attemptId ?? null,
    phase1ReloadlyCustomIdentifierSource: fulfillmentCtx.attemptId
      ? 'fulfillment_attempt_id'
      : 'legacy_order_attempt_number',
    ...(phase1Identity
      ? {
          providerExecutionCorrelationId: phase1Identity.providerExecutionCorrelationId,
          identityAlignmentNote: phase1Identity.identityAlignmentNote,
          reloadlyInquiryAndRegistryKeyMatchesCustomIdentifier: true,
        }
      : {}),
  };

  if (!isReloadlyConfigured()) {
    return {
      outcome: AIRTIME_OUTCOME.UNAVAILABLE,
      providerKey: 'reloadly',
      failureCode: 'reloadly_not_configured',
      failureMessage: 'Reloadly credentials not set in environment',
      errorKind: AIRTIME_ERROR_KIND.CONFIG,
      requestSummary,
      responseSummary: {},
    };
  }

  const payload = buildReloadlyTopupPayload(order, env.reloadlyOperatorMap, {
    customIdentifier,
    providerRequestKey: customIdentifier,
  });
  if (!payload.ok) {
    return {
      outcome: AIRTIME_OUTCOME.FAILURE,
      providerKey: 'reloadly',
      failureCode: payload.code,
      failureMessage: payload.message,
      errorKind: AIRTIME_ERROR_KIND.CONFIG,
      requestSummary,
      responseSummary: {},
    };
  }

  requestSummary.providerRequestKey = payload.providerRequestKey;

  const b = payload.body;
  const traceId = fulfillmentCtx.traceId ?? getTraceId();
  const bullmqAttemptsMade =
    fulfillmentCtx.bullmqAttemptsMade != null && Number.isFinite(Number(fulfillmentCtx.bullmqAttemptsMade))
      ? Number(fulfillmentCtx.bullmqAttemptsMade)
      : 0;
  const regEarly = await getReloadlyTopupRegistryEntry(customIdentifier);
  if (regEarly?.airtimeOutcome === 'SUCCESS' && regEarly.providerReference) {
    recordMoneyPathOpsSignal('phase1_reloadly_registry_hit_success');
    emitReloadlyFulfillmentEvent(fulfillmentCtx.log, 'info', 'reloadly_idempotency_registry_hit', {
      ...reloadlyFulfillmentBaseFields(order.id, {
        traceId,
        attemptNumber: attemptNum,
        providerReference: regEarly.providerReference,
        decisionPath: 'idempotency_registry',
      }),
    });
    return {
      outcome: AIRTIME_OUTCOME.SUCCESS,
      providerKey: 'reloadly',
      providerReference: regEarly.providerReference,
      requestSummary: { ...requestSummary, registryHit: true },
      responseSummary: {
        registryCacheHit: true,
        registrySource: regEarly.source,
        topupsBaseUsed: env.reloadlyBaseUrl,
      },
    };
  }
  if (
    regEarly?.airtimeOutcome === 'PENDING_VERIFICATION' &&
    regEarly.providerReference
  ) {
    recordMoneyPathOpsSignal('phase1_reloadly_registry_hit_pending');
    return {
      outcome: AIRTIME_OUTCOME.PENDING_VERIFICATION,
      providerKey: 'reloadly',
      providerReference: regEarly.providerReference,
      requestSummary: { ...requestSummary, registryHit: true },
      responseSummary: {
        registryCacheHit: true,
        registrySource: regEarly.source,
        topupsBaseUsed: env.reloadlyBaseUrl,
      },
    };
  }

  const shouldInquire =
    fulfillmentCtx.forceProviderInquiryBeforePost === true || bullmqAttemptsMade > 0;

  if (shouldInquire) {
    const hit = await findReloadlyTopupReportRowByCustomIdentifier(customIdentifier);
    requestSummary.inquiry = {
      attempted: true,
      found: hit.found,
      reason: hit.found ? null : hit.reason,
      pagesScanned: hit.pagesScanned ?? null,
    };
    if (hit.found === true) {
      if (hit.classification === 'confirmed') {
        await recordReloadlyTopupOutcome({ success: true, kind: 'ok' });
        const pref = hit.transactionId != null ? String(hit.transactionId) : null;
        if (pref) {
          await setReloadlyTopupRegistryEntry(customIdentifier, {
            airtimeOutcome: 'SUCCESS',
            providerReference: pref,
            source: 'reports_inquiry',
          });
        }
        emitReloadlyFulfillmentEvent(fulfillmentCtx.log, 'info', 'reloadly_inquiry_resolved_confirmed', {
          ...reloadlyFulfillmentBaseFields(order.id, {
            traceId,
            attemptNumber: attemptNum,
            providerReference: pref,
            decisionPath: 'reports_transactions_inquiry',
            proofClassification: 'confirmed_delivery',
          }),
        });
        return {
          outcome: AIRTIME_OUTCOME.SUCCESS,
          providerKey: 'reloadly',
          providerReference: pref,
          requestSummary,
          responseSummary: {
            inquiryResolved: true,
            inquiryClassification: hit.classification,
            providerStatus: hit.providerStatus,
            transactionId: hit.transactionId ?? null,
            topupsBaseUsed: env.reloadlyBaseUrl,
          },
        };
      }
      if (hit.classification === 'pending' || hit.classification === 'unknown') {
        await recordReloadlyTopupOutcome({ success: true, kind: 'ok' });
        const pref = hit.transactionId != null ? String(hit.transactionId) : null;
        if (pref) {
          await setReloadlyTopupRegistryEntry(customIdentifier, {
            airtimeOutcome: 'PENDING_VERIFICATION',
            providerReference: pref,
            source: 'reports_inquiry',
          });
        }
        emitReloadlyFulfillmentEvent(fulfillmentCtx.log, 'warn', 'reloadly_inquiry_resolved_pending', {
          ...reloadlyFulfillmentBaseFields(order.id, {
            traceId,
            attemptNumber: attemptNum,
            providerReference: pref,
            decisionPath: 'reports_transactions_inquiry',
            proofClassification: 'pending_provider',
          }),
        });
        return {
          outcome: AIRTIME_OUTCOME.PENDING_VERIFICATION,
          providerKey: 'reloadly',
          providerReference: pref,
          requestSummary,
          responseSummary: {
            inquiryResolved: true,
            inquiryClassification: hit.classification,
            providerStatus: hit.providerStatus,
            transactionId: hit.transactionId ?? null,
            topupsBaseUsed: env.reloadlyBaseUrl,
          },
        };
      }
      if (hit.classification === 'terminal_failure') {
        await recordReloadlyTopupOutcome({ success: true, kind: 'ok' });
        return {
          outcome: AIRTIME_OUTCOME.FAILURE,
          providerKey: 'reloadly',
          failureCode: 'reloadly_prior_identifier_terminal',
          failureMessage: `Reloadly already shows terminal state for this customIdentifier (${hit.providerStatus})`,
          errorKind: AIRTIME_ERROR_KIND.PROVIDER,
          requestSummary,
          responseSummary: {
            inquiryResolved: true,
            inquiryClassification: hit.classification,
            providerStatus: hit.providerStatus,
            transactionId: hit.transactionId ?? null,
            topupsBaseUsed: env.reloadlyBaseUrl,
          },
        };
      }
    } else {
      const hitReason = hit.reason;
      const inconclusive = hitReason === 'not_found' || hitReason === 'inquiry_timeout';
      const retryOrForce =
        bullmqAttemptsMade > 0 || fulfillmentCtx.forceProviderInquiryBeforePost === true;
      if (inconclusive && retryOrForce) {
        const inflight = await isReloadlyTopupPostInFlight(customIdentifier);
        const startedAt = fulfillmentCtx.attemptStartedAt;
        const recentDbAttempt =
          startedAt &&
          Date.now() - new Date(startedAt).getTime() < env.reloadlyStalledVerificationRecentMs;
        if (inflight || recentDbAttempt) {
          requestSummary.stalledVerificationHold = {
            redisInFlightMarker: inflight,
            recentDbAttempt: !!recentDbAttempt,
            inquiryReason: hitReason,
            policy: 'no_post_stalled_verification',
          };
          recordMoneyPathOpsSignal('phase1_stalled_verification_hold');
          const stalledSubstate = resolveStalledSubstate(hitReason, {
            redisInFlightMarker: inflight,
            recentDbAttempt: !!recentDbAttempt,
          });
          emitReloadlyFulfillmentEvent(fulfillmentCtx.log, 'warn', 'reloadly_stalled_verification_hold', {
            ...reloadlyFulfillmentBaseFields(order.id, {
              traceId,
              attemptNumber: attemptNum,
              decisionPath: 'stalled_verification',
              proofClassification: 'provider_truth_uncertain',
            }),
          });
          return {
            outcome: AIRTIME_OUTCOME.PENDING_VERIFICATION,
            providerKey: 'reloadly',
            providerReference: null,
            requestSummary,
            responseSummary: {
              stalledVerificationHold: true,
              stalledSubstate,
              stalledLifecycleVersion: 1,
              inquiryReason: hitReason,
              proofClassification: 'no_repeat_post_pending_verification',
              topupsBaseUsed: env.reloadlyBaseUrl,
            },
          };
        }
      }
    }
  } else {
    requestSummary.inquiry = { attempted: false };
  }

  const circuit = await getReloadlyTopupCircuitState();
  if (circuit.hardOpen) {
    const e = new Error('reloadly_circuit_open_backoff');
    e.code = 'PROVIDER_CIRCUIT_OPEN';
    throw e;
  }
  if (circuit.softRateLimit) {
    const e = new Error('reloadly_rate_limit_regime_backoff');
    e.code = 'PROVIDER_RATE_LIMIT_REGIME';
    throw e;
  }

  if (fulfillmentCtx.attemptId) {
    await persistReloadlyPreHttpDispatchEvidence(fulfillmentCtx.attemptId, {
      customIdentifier,
      traceId,
      providerExecutionCorrelationId: phase1Identity?.providerExecutionCorrelationId ?? null,
    });
  }

  if (phase1Identity) {
    console.log(
      JSON.stringify({
        reloadlyPhase1ProviderIdentity: true,
        orderIdSuffix: String(order.id).slice(-12),
        attemptIdSuffix: phase1Identity.fulfillmentAttemptIdSuffix,
        providerExecutionCorrelationId: phase1Identity.providerExecutionCorrelationId,
        reloadlyCustomIdentifier: customIdentifier,
        inquiryRegistryAndPostUseSameKey: true,
        traceId: traceId ?? null,
        t: new Date().toISOString(),
      }),
    );
  }

  await markReloadlyTopupPostInFlight(customIdentifier, { traceId });
  let normalized;
  try {
    normalized = await sendTopup({
      phone: b.recipientPhone.number,
      operatorId: b.operatorId,
      amount: b.amount,
      countryCode: b.recipientPhone.countryCode,
      customIdentifier: b.customIdentifier,
      log: fulfillmentCtx.log,
      ctx: {
        orderId: order.id,
        attemptNumber: attemptNum,
        traceId: fulfillmentCtx.traceId,
      },
    });
  } catch (err) {
    await clearReloadlyTopupPostInFlight(customIdentifier);
    throw err;
  }
  {
    const rawPost = normalized?.raw;
    const postTimeout =
      normalized?.resultType === 'failed' &&
      rawPost &&
      typeof rawPost === 'object' &&
      rawPost.kind === 'failed' &&
      rawPost.failureCode === 'reloadly_topup_timeout';
    if (!postTimeout) {
      await clearReloadlyTopupPostInFlight(customIdentifier);
    }
  }

  if (normalized.resultType === 'confirmed') {
    emitReloadlyFulfillmentEvent(fulfillmentCtx.log, 'info', 'reloadly_reference_recorded', {
      ...reloadlyFulfillmentBaseFields(order.id, {
        traceId,
        attemptNumber: attemptNum,
        providerReference: normalized.providerReference,
        normalizedOutcome: 'confirmed',
        proofClassification: 'confirmed_delivery',
      }),
    });
    if (normalized.providerReference) {
      await setReloadlyTopupRegistryEntry(customIdentifier, {
        airtimeOutcome: 'SUCCESS',
        providerReference: normalized.providerReference,
        source: 'topups_post',
      });
    }
    return {
      outcome: AIRTIME_OUTCOME.SUCCESS,
      providerKey: 'reloadly',
      providerReference: normalized.providerReference,
      requestSummary,
      responseSummary: {
        ...(typeof normalized.raw === 'object' && normalized.raw ? normalized.raw : {}),
        topupsBaseUsed: env.reloadlyBaseUrl,
      },
    };
  }

  if (normalized.resultType === 'pending') {
    const pref = normalized.providerReference ?? null;
    if (pref) {
      emitReloadlyFulfillmentEvent(fulfillmentCtx.log, 'info', 'reloadly_reference_recorded', {
        ...reloadlyFulfillmentBaseFields(order.id, {
          traceId,
          attemptNumber: attemptNum,
          providerReference: pref,
          normalizedOutcome: 'pending_verification',
          proofClassification: 'pending_provider',
        }),
      });
      await setReloadlyTopupRegistryEntry(customIdentifier, {
        airtimeOutcome: 'PENDING_VERIFICATION',
        providerReference: pref,
        source: 'topups_post_pending',
      });
    }
    return {
      outcome: AIRTIME_OUTCOME.PENDING_VERIFICATION,
      providerKey: 'reloadly',
      providerReference: pref,
      requestSummary,
      responseSummary: {
        ...(typeof normalized.raw === 'object' && normalized.raw ? normalized.raw : {}),
        topupsBaseUsed: env.reloadlyBaseUrl,
      },
    };
  }

  if (normalized.resultType === 'ambiguous') {
    return {
      outcome: AIRTIME_OUTCOME.AMBIGUOUS,
      providerKey: 'reloadly',
      providerReference: null,
      failureCode: 'reloadly_topup_ambiguous_response',
      failureMessage: 'Reloadly response did not provide sufficient proof of outcome',
      errorKind: AIRTIME_ERROR_KIND.PROVIDER,
      requestSummary,
      responseSummary: {
        ...(typeof normalized.raw === 'object' && normalized.raw ? normalized.raw : {}),
        topupsBaseUsed: env.reloadlyBaseUrl,
      },
    };
  }

  const raw = normalized.raw;
  if (raw && typeof raw === 'object' && raw.kind === 'failed') {
    if (raw.failureCode === 'reloadly_topup_duplicate') {
      return {
        outcome: AIRTIME_OUTCOME.PENDING_VERIFICATION,
        providerKey: 'reloadly',
        providerReference: null,
        requestSummary,
        responseSummary: {
          ...(raw.responseSummary && typeof raw.responseSummary === 'object' ? raw.responseSummary : {}),
          normalizedOutcome: 'pending_verification',
          proofClassification: 'duplicate_request_at_provider',
          topupsBaseUsed: env.reloadlyBaseUrl,
        },
      };
    }
    return {
      outcome: AIRTIME_OUTCOME.FAILURE,
      providerKey: 'reloadly',
      failureCode: raw.failureCode ?? 'reloadly_topup_failed',
      failureMessage: raw.failureMessage ?? 'Reloadly top-up failed',
      errorKind: raw.errorKind ?? AIRTIME_ERROR_KIND.PROVIDER,
      requestSummary,
      responseSummary: raw.responseSummary ?? {},
    };
  }
  if (raw && typeof raw === 'object' && raw.phase === 'auth') {
    return {
      outcome: AIRTIME_OUTCOME.FAILURE,
      providerKey: 'reloadly',
      failureCode: raw.failureCode ?? 'reloadly_auth_failed',
      failureMessage: raw.failureMessage ?? 'Reloadly OAuth failed',
      errorKind: AIRTIME_ERROR_KIND.CONFIG,
      requestSummary,
      responseSummary: raw.responseSummary ?? {},
    };
  }
  return {
    outcome: AIRTIME_OUTCOME.FAILURE,
    providerKey: 'reloadly',
    failureCode: 'reloadly_topup_failed',
    failureMessage: 'Reloadly top-up failed',
    errorKind: AIRTIME_ERROR_KIND.PROVIDER,
    requestSummary,
    responseSummary: {},
  };
}
