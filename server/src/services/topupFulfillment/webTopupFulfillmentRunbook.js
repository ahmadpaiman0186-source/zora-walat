/**
 * Operator-facing runbook data for WebTopupOrder + Reloadly (AF airtime sandbox rollout).
 * No secrets; safe strings only.
 */
import { env } from '../../config/env.js';
import { FULFILLMENT_DB_ERROR } from '../../domain/topupOrder/fulfillmentErrors.js';
import {
  buildWebTopupReloadlyPayload,
  RELOADLY_WEBTOPUP_ENABLED_COUNTRY,
  RELOADLY_WEBTOPUP_ENABLED_PRODUCT,
} from '../../domain/fulfillment/reloadlyWebTopupFulfillment.js';
import { PAYMENT_STATUS, FULFILLMENT_STATUS } from '../../domain/topupOrder/statuses.js';
import { isReloadlyConfigured } from '../reloadlyClient.js';
import {
  assertEligibleForInitialDispatch,
  assertEligibleForRetryDispatch,
  isFulfillmentDispatchBlocked,
} from './fulfillmentEligibility.js';
import { assertProviderMatchesWebTopupScope } from './webTopupFulfillmentScope.js';
import { resolveTopupFulfillmentProvider } from './providerRegistry.js';

const HINT = {
  WAIT_PAYMENT:
    'Wait for Stripe webhook or client mark-paid so paymentStatus becomes paid.',
  USE_ADMIN_DISPATCH:
    'POST /api/admin/web-topup-order/:id/fulfillment/dispatch when prerequisites show ready.',
  FIX_OPERATOR_MAP:
    'Set RELOADLY_OPERATOR_MAP_JSON or defaults so operatorKey maps to a numeric Reloadly operatorId.',
  USE_MOCK_OR_SCOPE:
    'Use WEBTOPUP_FULFILLMENT_PROVIDER=mock for non-AF routes, or create an AF airtime order only.',
  RETRY_AFTER_RETRYABLE:
    'POST /api/admin/web-topup-order/:id/fulfillment/retry after a retryable failure.',
  NO_RETRY_TERMINAL:
    'Order failed terminally; investigate provider message and create a new order if appropriate.',
  DUPLICATE:
    'Fulfillment is queued/processing/delivered; use GET diagnostics. Do not double-dispatch.',
  CONFIGURE_RELOADLY:
    'Set RELOADLY_CLIENT_ID and RELOADLY_CLIENT_SECRET when using WEBTOPUP_FULFILLMENT_PROVIDER=reloadly.',
};

/**
 * Safe hostname from URL for operator display.
 * @param {string} rawUrl
 */
function safeApiHost(rawUrl) {
  try {
    const u = new URL(String(rawUrl).trim());
    return u.hostname || null;
  } catch {
    return null;
  }
}

/**
 * Global provider / sandbox readiness (no order).
 */
export function buildSandboxProviderReadiness() {
  const providerId = String(env.webTopupFulfillmentProvider ?? 'mock')
    .trim()
    .toLowerCase();
  const reloadlyConfigured = isReloadlyConfigured();
  const reloadlySandbox = env.reloadlySandbox === true;
  const topupsHost = providerId === 'reloadly' ? safeApiHost(env.reloadlyBaseUrl) : null;

  return {
    webTopupFulfillmentProvider: providerId,
    reloadlyCredentialsConfigured: reloadlyConfigured,
    reloadlySandboxMode: providerId === 'reloadly' ? reloadlySandbox : null,
    reloadlyTopupsApiHost: topupsHost,
    prerequisitesSummary:
      providerId === 'reloadly'
        ? reloadlyConfigured
          ? reloadlySandbox
            ? 'Reloadly sandbox: credentials present; use Topups sandbox host for exercises.'
            : 'Reloadly production Topups host selected; use only with ops approval.'
          : 'Reloadly selected but credentials missing — server should not start.'
        : 'Mock fulfillment provider — no Reloadly credentials required.',
  };
}

/**
 * @param {import('@prisma/client').WebTopupOrder} row
 */
export function evaluateOperatorMappingForReloadlyWebOrder(row) {
  const req = {
    orderId: row.id,
    destinationCountry: row.destinationCountry,
    productType: row.productType,
    operatorKey: row.operatorKey,
    operatorLabel: row.operatorLabel,
    phoneNationalDigits: row.phoneNumber,
    productId: row.productId,
    productName: row.productName,
    amountCents: row.amountCents,
    currency: row.currency,
  };
  const built = buildWebTopupReloadlyPayload(req, env.reloadlyOperatorMap);
  const keyHint =
    typeof row.operatorKey === 'string' && row.operatorKey.length > 4
      ? `***${row.operatorKey.slice(-4)}`
      : row.operatorKey
        ? '(short)'
        : null;

  if (!built.ok) {
    const mappingRelated = [
      'reloadly_operator_unmapped',
      'reloadly_operator_key_missing',
      'reloadly_operator_id_invalid',
    ].includes(built.code);
    return {
      applies: true,
      ready: false,
      status: mappingRelated ? 'missing_or_invalid_mapping' : 'payload_validation_failed',
      operatorKeyHint: keyHint,
      detailCode: built.code,
      explanation: String(built.message).slice(0, 300),
      suggestedActions: mappingRelated ? [HINT.FIX_OPERATOR_MAP] : [],
    };
  }

  return {
    applies: true,
    ready: true,
    status: 'ok',
    operatorKeyHint: keyHint,
    detailCode: null,
    explanation: 'Operator resolves to Reloadly operatorId for AF airtime payload.',
    suggestedActions: [],
  };
}

/**
 * @param {import('@prisma/client').WebTopupOrder} row
 */
function explainInitialDispatchBlockers(row, providerId) {
  /** @type {string[]} */
  const reasons = [];
  /** @type {string[]} */
  const hints = [];

  const el = assertEligibleForInitialDispatch(row);
  if (!el.ok) {
    if (el.code === 'not_paid') {
      reasons.push('Dispatch requires paymentStatus=paid.');
      hints.push(HINT.WAIT_PAYMENT);
    } else {
      reasons.push(
        `Dispatch requires fulfillmentStatus=pending (got ${row.fulfillmentStatus}).`,
      );
      if (row.fulfillmentStatus === FULFILLMENT_STATUS.DELIVERED) {
        hints.push('Order already delivered — no further dispatch.');
      } else if (row.fulfillmentStatus === FULFILLMENT_STATUS.FAILED) {
        hints.push(
          row.fulfillmentErrorCode === FULFILLMENT_DB_ERROR.RETRYABLE
            ? HINT.RETRY_AFTER_RETRYABLE
            : HINT.NO_RETRY_TERMINAL,
        );
      }
    }
  }

  if (isFulfillmentDispatchBlocked(row.fulfillmentStatus)) {
    reasons.push(
      `Fulfillment state is ${row.fulfillmentStatus} (in-flight or completed) — duplicate dispatch blocked.`,
    );
    hints.push(HINT.DUPLICATE);
  }

  const provider = resolveTopupFulfillmentProvider(providerId);
  if (!provider) {
    reasons.push(`Unknown fulfillment provider id "${providerId}".`);
    hints.push('Check WEBTOPUP_FULFILLMENT_PROVIDER (mock | reloadly).');
  }

  const scope = assertProviderMatchesWebTopupScope(providerId, row);
  if (!scope.ok) {
    reasons.push(
      `Reloadly web rollout is ${RELOADLY_WEBTOPUP_ENABLED_COUNTRY} + ${RELOADLY_WEBTOPUP_ENABLED_PRODUCT} only; this order does not match.`,
    );
    hints.push(HINT.USE_MOCK_OR_SCOPE);
  }

  if (providerId === 'reloadly' && !isReloadlyConfigured()) {
    reasons.push('Reloadly credentials not configured.');
    hints.push(HINT.CONFIGURE_RELOADLY);
  }

  return { reasons, hints };
}

/**
 * @param {import('@prisma/client').WebTopupOrder} row
 */
function explainRetryBlockers(row) {
  const el = assertEligibleForRetryDispatch(row);
  if (el.ok) {
    return {
      allowed: true,
      reasons: [],
      hints: [HINT.RETRY_AFTER_RETRYABLE],
    };
  }
  /** @type {string[]} */
  const reasons = [];
  /** @type {string[]} */
  const hints = [];
  if (el.code === 'not_paid') {
    reasons.push('Retry requires paymentStatus=paid.');
    hints.push(HINT.WAIT_PAYMENT);
  } else {
    reasons.push(
      'Retry requires fulfillmentStatus=failed with errorCode retryable, or fulfillmentStatus=retrying.',
    );
    hints.push(
      row.fulfillmentStatus === FULFILLMENT_STATUS.FAILED &&
        row.fulfillmentErrorCode !== FULFILLMENT_DB_ERROR.RETRYABLE
        ? HINT.NO_RETRY_TERMINAL
        : 'If order is pending, use dispatch instead of retry.',
    );
  }
  return { allowed: false, reasons, hints };
}

/**
 * Full runbook attachment for GET diagnostics (and optional error payloads).
 * @param {import('@prisma/client').WebTopupOrder} row
 */
export function buildFulfillmentRunbookForOrder(row) {
  const providerId = String(env.webTopupFulfillmentProvider ?? 'mock')
    .trim()
    .toLowerCase();
  const providerReady = buildSandboxProviderReadiness();
  const inReloadlyScope =
    assertProviderMatchesWebTopupScope('reloadly', row).ok === true;
  const scopeCheck = assertProviderMatchesWebTopupScope(providerId, row);

  let operatorMapping = {
    applies: false,
    ready: null,
    status: 'not_applicable',
    operatorKeyHint: null,
    detailCode: null,
    explanation: 'Operator mapping checks apply only when provider is reloadly and order is in AF airtime scope.',
    suggestedActions: [],
  };

  if (providerId === 'reloadly' && scopeCheck.ok) {
    operatorMapping = evaluateOperatorMappingForReloadlyWebOrder(row);
  } else if (providerId === 'reloadly' && !scopeCheck.ok) {
    operatorMapping = {
      applies: false,
      ready: null,
      status: 'skipped_out_of_scope',
      operatorKeyHint:
        typeof row.operatorKey === 'string' && row.operatorKey.length > 4
          ? `***${row.operatorKey.slice(-4)}`
          : null,
      detailCode: scopeCheck.code ?? null,
      explanation: 'Reloadly operator mapping is not evaluated for orders outside AF airtime rollout.',
      suggestedActions: [HINT.USE_MOCK_OR_SCOPE],
    };
  }

  const initialBlock = explainInitialDispatchBlockers(row, providerId);
  const initialEligible =
    assertEligibleForInitialDispatch(row).ok &&
    !isFulfillmentDispatchBlocked(row.fulfillmentStatus) &&
    scopeCheck.ok &&
    resolveTopupFulfillmentProvider(providerId) != null &&
    (providerId !== 'reloadly' || isReloadlyConfigured()) &&
    (providerId !== 'reloadly' || operatorMapping.ready !== false);

  const retryInfo = explainRetryBlockers(row);

  const rollout = {
    label: `${RELOADLY_WEBTOPUP_ENABLED_COUNTRY} ${RELOADLY_WEBTOPUP_ENABLED_PRODUCT} only (Reloadly web path)`,
    orderMatchesReloadlyScope: inReloadlyScope,
    destinationCountry: row.destinationCountry,
    productType: row.productType,
  };

  return {
    version: 1,
    sandbox: providerReady,
    rollout,
    operatorMapping,
    dispatch: {
      initialEligible,
      reasonsIfBlocked: initialBlock.reasons,
      suggestedNextSteps: initialBlock.hints,
      duplicateDispatchRisk: isFulfillmentDispatchBlocked(row.fulfillmentStatus),
    },
    retry: {
      eligible: retryInfo.allowed,
      reasonsIfBlocked: retryInfo.reasons,
      suggestedNextSteps: retryInfo.hints,
    },
    payment: {
      status: row.paymentStatus,
      paid: row.paymentStatus === PAYMENT_STATUS.PAID,
    },
    fulfillment: {
      status: row.fulfillmentStatus,
      attemptCount: row.fulfillmentAttemptCount,
      lastErrorCode: row.fulfillmentErrorCode,
    },
  };
}
