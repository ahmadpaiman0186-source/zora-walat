import { createHash } from 'node:crypto';
import { env } from '../../config/env.js';
import { AIRTIME_ERROR_KIND, AIRTIME_OUTCOME } from './airtimeFulfillmentResult.js';

/** Read at call time so tests can set `process.env` without reloading `env.js`. */
function readMockAirtimeDelayMs() {
  const raw = process.env.MOCK_AIRTIME_DELAY_MS;
  if (raw != null && String(raw).trim() !== '') {
    const n = parseInt(String(raw).trim(), 10);
    if (Number.isFinite(n) && n >= 0) return Math.min(n, 30_000);
  }
  return Math.min(Number(env.mockAirtimeDelayMs) || 0, 30_000);
}

function readMockAirtimeSimulate() {
  const raw = process.env.MOCK_AIRTIME_SIMULATE;
  if (raw != null && String(raw).trim() !== '') {
    return String(raw).trim().toLowerCase();
  }
  return String(env.mockAirtimeSimulate ?? '').trim().toLowerCase();
}

function safeRecipientHint(national) {
  if (!national || typeof national !== 'string' || national.length < 4) {
    return null;
  }
  return `***${national.slice(-4)}`;
}

/**
 * Deterministic reference derived from order + correlation (stable across retries with same attempt).
 * @param {string} orderId
 * @param {string | null | undefined} correlationId
 */
/** Safe subset of meta for persisted request summaries (no trace/job internals). */
function pickMockMetaPublic(meta) {
  const m = meta && typeof meta === 'object' ? meta : {};
  const out = {};
  if (typeof m.providerCorrelationId === 'string') {
    out.providerCorrelationId = m.providerCorrelationId;
  }
  if (typeof m.fallbackFrom === 'string') out.fallbackFrom = m.fallbackFrom;
  if (typeof m.fallbackReason === 'string') out.fallbackReason = m.fallbackReason;
  return out;
}

function deterministicMockProviderReference(orderId, correlationId) {
  if (correlationId && String(correlationId).trim()) {
    const h = createHash('sha256')
      .update(`${String(orderId)}|${String(correlationId)}`)
      .digest('hex')
      .slice(0, 24);
    return `mock_ref_${h}`;
  }
  return `mock_${String(orderId).slice(0, 12)}`;
}

/**
 * Deterministic mock airtime provider (no external calls unless Reloadly path is selected upstream).
 * @param {import('@prisma/client').PaymentCheckout} order
 * @param {object} [meta] — includes `providerCorrelationId` from `executeDelivery` when an attempt is claimed
 */
export async function fulfillMockAirtime(order, meta = {}) {
  const delayMs = readMockAirtimeDelayMs();
  if (delayMs > 0) {
    await new Promise((r) => setTimeout(r, delayMs));
  }

  const providerCorrelationId =
    typeof meta.providerCorrelationId === 'string' ? meta.providerCorrelationId : null;
  const simulate = readMockAirtimeSimulate();

  const requestSummary = {
    mode: 'mock',
    packageId: order.packageId ?? null,
    operatorKey: order.operatorKey ?? null,
    recipientHint: safeRecipientHint(order.recipientNational),
    amountUsdCents: order.amountUsdCents,
    currency: order.currency,
    ...pickMockMetaPublic(meta),
  };

  if (simulate === 'retryable') {
    return {
      outcome: AIRTIME_OUTCOME.FAILURE,
      providerKey: 'mock',
      failureCode: 'mock_simulated_transient',
      failureMessage: 'mock_airtime_simulate_retryable',
      errorKind: AIRTIME_ERROR_KIND.NETWORK,
      providerReference: null,
      requestSummary,
      responseSummary: {
        mock: true,
        simulated: 'retryable',
        fulfilledAt: new Date().toISOString(),
        ...(providerCorrelationId ? { providerCorrelationId } : {}),
      },
    };
  }

  if (simulate === 'terminal') {
    return {
      outcome: AIRTIME_OUTCOME.FAILURE,
      providerKey: 'mock',
      failureCode: 'mock_simulated_terminal',
      failureMessage: 'mock_airtime_simulate_terminal',
      errorKind: AIRTIME_ERROR_KIND.PROVIDER,
      providerReference: null,
      requestSummary,
      responseSummary: {
        mock: true,
        simulated: 'terminal',
        fulfilledAt: new Date().toISOString(),
        ...(providerCorrelationId ? { providerCorrelationId } : {}),
      },
    };
  }

  const providerReference = deterministicMockProviderReference(order.id, providerCorrelationId);

  return {
    outcome: AIRTIME_OUTCOME.SUCCESS,
    providerKey: 'mock',
    providerReference,
    requestSummary,
    responseSummary: {
      mock: true,
      outcome: AIRTIME_OUTCOME.SUCCESS,
      providerStatus: 'succeeded',
      fulfilledAt: new Date().toISOString(),
      ...(providerCorrelationId ? { providerCorrelationId } : {}),
    },
  };
}
