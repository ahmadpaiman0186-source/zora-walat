import { env } from '../../config/env.js';
import { safeSuffix, webTopupLog } from '../../lib/webTopupObservability.js';
import { resolveTopupFulfillmentProvider } from '../topupFulfillment/providerRegistry.js';
import { getSharedCircuitBreaker } from '../reliability/circuitBreaker.js';
import { isSafeToRetryTopupResult } from '../reliability/failureModel.js';
import { withRetry } from '../reliability/retryEngine.js';
import {
  recordTopupProviderCircuitOutcome,
} from '../topupFulfillment/topupProviderCircuit.js';
import {
  checkAllowReloadlyWebtopupCall,
  isReloadlyWebtopupDurableCircuitEnabled,
  recordReloadlyWebtopupProviderOutcome,
} from '../reliability/reloadlyWebtopupDurableCircuit.js';

/** @typedef {import('../topupFulfillment/providers/topupProviderTypes.js').TopupFulfillmentRequest} TopupFulfillmentRequest */
/** @typedef {import('../topupFulfillment/providers/topupProviderTypes.js').TopupFulfillmentResult} TopupFulfillmentResult */

function circuitOpts() {
  return {
    failureThreshold: env.providerCircuitFailureThreshold,
    windowMs: env.providerCircuitWindowMs,
    cooldownMs: env.providerCircuitOpenMs,
  };
}

/**
 * @param {string} primaryKey
 */
function useReloadlyDurableCircuit(primaryKey) {
  return String(primaryKey).toLowerCase() === 'reloadly' && isReloadlyWebtopupDurableCircuitEnabled();
}

/**
 * @param {string} primaryKey
 * @param {boolean} success
 * @param {import('pino').Logger | undefined} log
 * @param {string | null | undefined} traceId
 */
async function recordPrimaryCircuitOutcome(primaryKey, success, log, traceId) {
  if (useReloadlyDurableCircuit(primaryKey)) {
    await recordReloadlyWebtopupProviderOutcome({ success, log, traceId });
  } else {
    recordTopupProviderCircuitOutcome(primaryKey, success);
  }
}

/**
 * Primary path with bounded retries, optional fallback when primary is blocked or transiently unavailable.
 *
 * @param {object} ctx
 * @param {TopupFulfillmentRequest} ctx.request
 * @param {import('../topupFulfillment/providers/mockTopupProvider.js').MockTopupProvider | import('../topupFulfillment/providers/reloadlyWebTopupProvider.js').ReloadlyWebTopupProvider} ctx.primary
 * @param {import('pino').Logger | undefined} ctx.log
 * @param {string | null | undefined} ctx.traceId
 * @param {string} ctx.orderIdSuffix
 * @param {import('../topupFulfillment/providers/mockTopupProvider.js').MockTopupProvider | import('../topupFulfillment/providers/reloadlyWebTopupProvider.js') | null} [ctx.injectFallbackProvider] test-only injected fallback
 * @returns {Promise<TopupFulfillmentResult>}
 */
export async function executeTopupWithReliability(ctx) {
  const { request, primary, log, traceId, orderIdSuffix } = ctx;
  const primaryKey = primary.id;

  const primaryCb = getSharedCircuitBreaker(primaryKey, {
    name: primaryKey,
    ...circuitOpts(),
  });

  if (useReloadlyDurableCircuit(primaryKey)) {
    const gate = await checkAllowReloadlyWebtopupCall({ log, traceId, orderIdSuffix });
    if (!gate.allowed) {
      webTopupLog(log, 'warn', 'provider_call_blocked_by_circuit', {
        orderIdSuffix,
        traceId,
        provider: primaryKey,
        state: gate.state,
        cooldownUntil: gate.cooldownUntil,
        reason: gate.reason,
      });
      return await tryFallback(
        request,
        log,
        traceId,
        orderIdSuffix,
        primaryKey,
        'durable_circuit_open',
        ctx.injectFallbackProvider ?? null,
      );
    }
  } else if (!primaryCb.allowRequest()) {
    webTopupLog(log, 'warn', 'provider_failover_circuit_open', {
      orderIdSuffix,
      traceId,
      primary: primaryKey,
      reason: 'primary_circuit_blocked',
    });
    return await tryFallback(
      request,
      log,
      traceId,
      orderIdSuffix,
      primaryKey,
      'circuit_open',
      ctx.injectFallbackProvider ?? null,
    );
  }

  const retry = await withRetry(
    async () => primary.sendTopup(request),
    {
      maxAttempts: env.webtopupRetryMaxAttempts,
      backoffMs: env.webtopupRetryBackoffMs,
      traceId: traceId ?? null,
      label: `topup:${primaryKey}`,
      shouldRetryResult: (r) => isSafeToRetryTopupResult(/** @type {TopupFulfillmentResult} */ (r)),
    },
  );

  if (!retry.ok) {
    await recordPrimaryCircuitOutcome(primaryKey, false, log, traceId);
    webTopupLog(log, 'error', 'provider_primary_exhausted', {
      orderIdSuffix,
      traceId,
      primary: primaryKey,
      attempts: retry.attempts,
      err: String(retry.error ?? '').slice(0, 200),
    });
    return await tryFallback(
      request,
      log,
      traceId,
      orderIdSuffix,
      primaryKey,
      'primary_threw',
      ctx.injectFallbackProvider ?? null,
    );
  }

  const result = /** @type {TopupFulfillmentResult} */ (retry.value);

  if (retry.attempts > 1 && result.outcome === 'succeeded') {
    webTopupLog(log, 'info', 'provider_retry_recovered', {
      orderIdSuffix,
      traceId,
      primary: primaryKey,
      attempts: retry.attempts,
    });
  }

  if (result.outcome === 'succeeded') {
    await recordPrimaryCircuitOutcome(primaryKey, true, log, traceId);
    return result;
  }

  await recordPrimaryCircuitOutcome(primaryKey, false, log, traceId);

  if (result.outcome !== 'failed_retryable' || !isSafeToRetryTopupResult(result)) {
    return result;
  }

  /** Still transient after bounded retries */
  webTopupLog(log, 'warn', 'provider_primary_transient_exhausted', {
    orderIdSuffix,
    traceId,
    primary: primaryKey,
    attempts: retry.attempts,
    errorCode: result.errorCode,
  });
  return await tryFallback(
    request,
    log,
    traceId,
    orderIdSuffix,
    primaryKey,
    'transient_exhausted',
    ctx.injectFallbackProvider ?? null,
  );
}

/**
 * @param {TopupFulfillmentRequest} request
 * @param {import('pino').Logger | undefined} log
 * @param {string | null | undefined} traceId
 * @param {string} orderIdSuffix
 * @param {string} primaryKey
 * @param {string} reason
 * @param {import('../topupFulfillment/providers/mockTopupProvider.js').MockTopupProvider | import('../topupFulfillment/providers/reloadlyWebTopupProvider.js') | null} injectFb
 */
async function tryFallback(
  request,
  log,
  traceId,
  orderIdSuffix,
  primaryKey,
  reason,
  injectFb,
) {
  const fallbackId = String(env.webtopupFallbackProvider ?? '').trim().toLowerCase();
  const fb =
    injectFb ??
    (fallbackId ? resolveTopupFulfillmentProvider(fallbackId) : null);
  if (!fallbackId && !injectFb) {
    return {
      outcome: 'failed_retryable',
      errorCode: reason === 'durable_circuit_open' ? 'provider_circuit_open' : 'provider_unavailable',
      errorMessageSafe:
        reason === 'durable_circuit_open'
          ? 'Reloadly circuit is open; outbound call not attempted'
          : 'Primary path failed and no fallback provider is configured',
    };
  }

  if (!fb || fb.id === primaryKey) {
    return {
      outcome: 'failed_retryable',
      errorCode: reason === 'durable_circuit_open' ? 'provider_circuit_open' : 'provider_unavailable',
      errorMessageSafe:
        reason === 'durable_circuit_open'
          ? 'Reloadly circuit is open; no usable fallback'
          : 'Fallback provider not available or same as primary',
    };
  }

  const fbCb = getSharedCircuitBreaker(fb.id, { name: fb.id, ...circuitOpts() });
  if (!fbCb.allowRequest()) {
    return {
      outcome: 'failed_retryable',
      errorCode: reason === 'durable_circuit_open' ? 'provider_circuit_open' : 'fulfillment_suspended',
      errorMessageSafe:
        reason === 'durable_circuit_open'
          ? 'Reloadly circuit is open and fallback path is also blocked'
          : 'Fallback provider circuit blocked',
    };
  }

  webTopupLog(log, 'warn', 'provider_failover_invoked', {
    orderIdSuffix,
    traceId,
    reason,
    primary: primaryKey,
    fallback: fb.id,
    fallbackSuffix: safeSuffix(fb.id, 6),
  });

  try {
    const out = await fb.sendTopup(request);
    recordTopupProviderCircuitOutcome(fb.id, out.outcome === 'succeeded');
    return out;
  } catch (e) {
    recordTopupProviderCircuitOutcome(fb.id, false);
    return {
      outcome: 'failed_retryable',
      errorCode: 'PROVIDER_EXCEPTION',
      errorMessageSafe: String(e?.message ?? e).slice(0, 200),
    };
  }
}
