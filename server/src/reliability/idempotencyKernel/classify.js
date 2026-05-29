import { STALE_PENDING_DEFAULT_MS } from './attemptContext.js';
import {
  buildCanonicalKey,
  buildProviderAttemptKey,
  validateKeyMaterial,
} from './keyModel.js';
import { lookupByKey, lookupProviderRef, lookupWebhookEvent } from './registry.js';
import { createDecision, DECISION } from './types.js';

/**
 * @param {import('./attemptContext.js').AttemptContext} ctx
 * @param {import('./registry.js').ReturnType<import('./registry.js').createIdempotencyRegistry>} registry
 * @returns {import('./types.js').IdempotencyDecision}
 */
export function classifyIdempotencyAttempt(ctx, registry) {
  const keyResult = validateKeyMaterial(ctx.keyMaterial);
  if (!keyResult.ok) {
    return createDecision({
      code: 'CORE5-KEY-001',
      decision: keyResult.ambiguous ? DECISION.BLOCK_AMBIGUOUS : DECISION.PENDING_REVIEW,
      severity: 'high',
      invariantIds: ['INV-01'],
      requiredNextAction: 'supply_valid_idempotency_key_material',
      attemptKind: ctx.attemptKind,
      entityIds: ctx.entityIds,
      evidence: { reason: keyResult.reason },
      confidence: 'high',
    });
  }

  const idempotencyKey = keyResult.key;
  const base = {
    idempotencyKey,
    attemptKind: ctx.attemptKind,
    entityIds: ctx.entityIds,
  };

  const prior = lookupByKey(registry, idempotencyKey);
  if (prior && prior.outcome === 'completed') {
    return createDecision({
      ...base,
      code: duplicateCodeForKind(ctx.attemptKind),
      decision: DECISION.BLOCK_DUPLICATE,
      severity: 'critical',
      invariantIds: ['INV-01'],
      requiredNextAction: 'reject_duplicate_attempt_do_not_mutate',
      evidence: { priorOutcome: prior.outcome, priorKind: prior.attemptKind },
    });
  }

  if (prior && prior.outcome === 'in_flight') {
    return createDecision({
      ...base,
      code: 'CORE5-DUP-INFLIGHT-001',
      decision: DECISION.BLOCK_DUPLICATE,
      severity: 'high',
      invariantIds: ['INV-01'],
      requiredNextAction: 'wait_for_in_flight_attempt_or_ops_review',
      evidence: { priorOutcome: prior.outcome },
      confidence: 'high',
    });
  }

  if (ctx.attemptKind === 'webhook') {
    return classifyWebhook(ctx, registry, base);
  }
  if (ctx.attemptKind === 'checkout') {
    return classifyCheckout(ctx, registry, base);
  }
  if (ctx.attemptKind === 'provider_execution') {
    return classifyProviderExecution(ctx, registry, base);
  }
  if (ctx.attemptKind === 'wallet_intent') {
    return classifyWalletIntent(ctx, registry, base);
  }
  if (ctx.attemptKind === 'order_retry') {
    return classifyOrderRetry(ctx, registry, base);
  }

  return createDecision({
    ...base,
    code: 'CORE5-UNK-001',
    decision: DECISION.BLOCK_AMBIGUOUS,
    severity: 'medium',
    invariantIds: ['INV-01'],
    requiredNextAction: 'unknown_attempt_kind_ops_review',
    evidence: { attemptKind: ctx.attemptKind },
  });
}

/**
 * @param {import('./attemptContext.js').AttemptContext} ctx
 * @param {import('./registry.js').ReturnType<import('./registry.js').createIdempotencyRegistry>} registry
 * @param {object} base
 */
function classifyWebhook(ctx, registry, base) {
  const eventId = ctx.entityIds?.eventId ?? ctx.keyMaterial?.eventId;
  if (eventId) {
    const priorEv = lookupWebhookEvent(registry, eventId);
    if (priorEv) {
      return createDecision({
        ...base,
        code: 'CORE5-DUP-WH-001',
        decision: DECISION.BLOCK_DUPLICATE,
        severity: 'high',
        invariantIds: ['INV-01'],
        requiredNextAction: 'ack_duplicate_webhook_without_replay',
        entityIds: { ...ctx.entityIds, eventId },
        evidence: { duplicateWebhookEvent: true },
      });
    }
  }
  return paymentProviderCrossCheck(ctx, base, 'CORE5-WH-ALLOW-001', DECISION.ALLOW);
}

/**
 * @param {import('./attemptContext.js').AttemptContext} ctx
 * @param {import('./registry.js').ReturnType<import('./registry.js').createIdempotencyRegistry>} registry
 * @param {object} base
 */
function classifyCheckout(ctx, registry, base) {
  void registry;
  return paymentProviderCrossCheck(ctx, base, 'CORE5-CHK-ALLOW-001', DECISION.ALLOW);
}

/**
 * @param {import('./attemptContext.js').AttemptContext} ctx
 * @param {import('./registry.js').ReturnType<import('./registry.js').createIdempotencyRegistry>} registry
 * @param {object} base
 */
function classifyProviderExecution(ctx, registry, base) {
  const ref = ctx.providerState?.providerReference ?? ctx.entityIds?.providerReference;
  if (ref) {
    const priorRef = lookupProviderRef(registry, ref);
    const orderId = ctx.entityIds?.orderId;
    if (
      priorRef &&
      priorRef.providerReference === ref &&
      priorRef.entityIds?.orderId &&
      orderId &&
      priorRef.entityIds.orderId !== orderId
    ) {
      return createDecision({
        ...base,
        code: 'CORE5-DUP-PRVREF-001',
        decision: DECISION.BLOCK_DUPLICATE,
        severity: 'critical',
        invariantIds: ['INV-01', 'INV-04'],
        requiredNextAction: 'halt_provider_retry_investigate_duplicate_reference',
        evidence: { providerReference: ref, priorOrderId: priorRef.entityIds.orderId },
      });
    }
  }

  const priorOutcome = ctx.providerState?.priorOutcome;
  const lastStatus = ctx.providerState?.lastAttemptStatus;
  const isRetry = ctx.retryContext?.isRetry === true;

  if (isRetry && (lastStatus === 'SUCCESS' || priorOutcome === 'completed')) {
    return createDecision({
      ...base,
      code: 'CORE5-RETRY-AFTER-SUCCESS-001',
      decision: DECISION.BLOCK_DUPLICATE,
      severity: 'critical',
      invariantIds: ['INV-01'],
      requiredNextAction: 'do_not_redispatch_after_provider_success',
      evidence: { lastStatus, priorOutcome },
    });
  }

  if (isRetry && (lastStatus === 'TIMEOUT' || lastStatus === 'UNKNOWN' || ctx.providerState?.ambiguous)) {
    return createDecision({
      ...base,
      code: 'CORE5-RETRY-UNSAFE-001',
      decision: DECISION.RETRY_UNSAFE,
      severity: 'high',
      invariantIds: ['INV-01', 'INV-04'],
      requiredNextAction: 'manual_provider_state_reconciliation_before_retry',
      evidence: { lastStatus, ambiguous: ctx.providerState?.ambiguous },
      confidence: ctx.providerState?.ambiguous ? 'medium' : 'high',
    });
  }

  if (isRetry && lastStatus === 'FAILED' && !ctx.providerState?.ambiguous) {
    return createDecision({
      ...base,
      code: 'CORE5-RETRY-SAFE-001',
      decision: DECISION.RETRY_SAFE,
      severity: 'low',
      invariantIds: ['INV-01'],
      requiredNextAction: 'retry_allowed_classify_only_not_executed',
      evidence: { lastStatus },
      confidence: 'medium',
    });
  }

  const attemptKey = buildProviderAttemptKey({
    orderId: ctx.entityIds?.orderId ?? ctx.keyMaterial?.orderId ?? '',
    attemptId: ctx.entityIds?.attemptId ?? ctx.keyMaterial?.attemptId,
  });
  if (attemptKey) {
    const dup = lookupByKey(registry, attemptKey);
    if (dup && dup.outcome === 'completed') {
      return createDecision({
        ...base,
        code: 'CORE5-DUP-PRVEXEC-001',
        decision: DECISION.BLOCK_DUPLICATE,
        severity: 'critical',
        invariantIds: ['INV-01'],
        requiredNextAction: 'reject_duplicate_provider_execution_attempt',
        idempotencyKey: attemptKey,
        evidence: { duplicateProviderAttempt: true },
      });
    }
  }

  return paymentProviderCrossCheck(ctx, base, 'CORE5-PRV-ALLOW-001', DECISION.ALLOW);
}

/**
 * @param {import('./attemptContext.js').AttemptContext} ctx
 * @param {import('./registry.js').ReturnType<import('./registry.js').createIdempotencyRegistry>} registry
 * @param {object} base
 */
function classifyWalletIntent(ctx, registry, base) {
  void registry;
  return paymentProviderCrossCheck(ctx, base, 'CORE5-WALLET-ALLOW-001', DECISION.ALLOW);
}

/**
 * @param {import('./attemptContext.js').AttemptContext} ctx
 * @param {import('./registry.js').ReturnType<import('./registry.js').createIdempotencyRegistry>} registry
 * @param {object} base
 */
function classifyOrderRetry(ctx, registry, base) {
  void registry;
  const orderStatus = ctx.paymentState?.orderStatus;
  const staleAge = ctx.retryContext?.staleAgeMs ?? 0;
  const threshold = ctx.retryContext?.staleThresholdMs ?? STALE_PENDING_DEFAULT_MS;

  if (
    orderStatus === 'PROCESSING' &&
    staleAge >= threshold &&
    ctx.retryContext?.isRetry === true
  ) {
    return createDecision({
      ...base,
      code: 'CORE5-STALE-PENDING-001',
      decision: DECISION.RETRY_UNSAFE,
      severity: 'high',
      invariantIds: ['INV-01'],
      requiredNextAction: 'stale_pending_ops_review_before_retry',
      evidence: { orderStatus, staleAgeMs: staleAge, staleThresholdMs: threshold },
    });
  }

  return paymentProviderCrossCheck(ctx, base, 'CORE5-ORDER-RETRY-001', DECISION.ALLOW);
}

/**
 * @param {import('./attemptContext.js').AttemptContext} ctx
 * @param {object} base
 * @param {string} allowCode
 * @param {import('./types.js').IdempotencyDecisionType} allowDecision
 */
function paymentProviderCrossCheck(ctx, base, allowCode, allowDecision) {
  const orderStatus = ctx.paymentState?.orderStatus;
  const stripePaid = ctx.paymentState?.stripePaid === true;
  const proofPresent = ctx.providerState?.proofPresent === true;
  const providerRef = ctx.providerState?.providerReference;

  if (orderStatus === 'FULFILLED' && !proofPresent && !providerRef) {
    return createDecision({
      ...base,
      code: 'CORE5-FULFILLED-NO-PROOF-001',
      decision: DECISION.BLOCK_AMBIGUOUS,
      severity: 'critical',
      invariantIds: ['INV-04'],
      requiredNextAction: 'never_mark_delivered_investigate_missing_provider_proof',
      evidence: { orderStatus },
    });
  }

  if (stripePaid && !proofPresent && !providerRef) {
    return createDecision({
      ...base,
      code: 'CORE5-PAID-NO-PROOF-001',
      decision: DECISION.PENDING_REVIEW,
      severity: 'critical',
      invariantIds: ['INV-02', 'INV-04'],
      requiredNextAction: 'reconcile_payment_before_provider_or_delivery_claim',
      evidence: { orderStatus, stripePaid: true },
    });
  }

  return createDecision({
    ...base,
    code: allowCode,
    decision: allowDecision,
    severity: 'info',
    invariantIds: ['INV-01'],
    requiredNextAction: 'proceed_classify_only_no_mutation',
    evidence: { classifyOnly: true },
  });
}

/**
 * @param {import('./attemptContext.js').AttemptKind} kind
 */
function duplicateCodeForKind(kind) {
  const map = {
    checkout: 'CORE5-DUP-CHK-001',
    webhook: 'CORE5-DUP-WH-001',
    provider_execution: 'CORE5-DUP-PRVEXEC-001',
    wallet_intent: 'CORE5-DUP-WALLET-001',
    order_retry: 'CORE5-DUP-RETRY-001',
  };
  return map[kind] ?? 'CORE5-DUP-GEN-001';
}

/**
 * @param {import('./attemptContext.js').AttemptContext[]} contexts
 * @param {import('./registry.js').ReturnType<import('./registry.js').createIdempotencyRegistry>} registry
 */
export function classifyIdempotencyBatch(contexts, registry) {
  return contexts.map((ctx) => classifyIdempotencyAttempt(ctx, registry));
}
