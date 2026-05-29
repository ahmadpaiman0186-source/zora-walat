/**
 * CORE-08 repair signal normalization from doctor / idempotency / NPNS inputs.
 */

/**
 * @typedef {object} RepairSignal
 * @property {string} signalType
 * @property {string} [sourceFindingId]
 * @property {string} [sourceCode]
 * @property {string[]} [invariantIds]
 * @property {Record<string, string>} [entityIds]
 * @property {Record<string, unknown>} [evidence]
 * @property {string} [severity]
 */

/**
 * @param {import('../runtimeDoctor/types.js').DiagnosticFinding} f
 * @returns {RepairSignal | null}
 */
export function signalFromDoctorFinding(f) {
  const id = f.id ?? '';
  const base = {
    sourceFindingId: id,
    sourceCode: id,
    invariantIds: f.invariantIds ?? [],
    entityIds: f.entityId ? { [f.entityType ?? 'entity']: f.entityId } : {},
    evidence: { ...(f.evidence ?? {}), fmId: f.fmId },
    severity: f.severity,
  };

  if (id.includes('AUD') || id.includes('audit')) {
    return { ...base, signalType: 'missing_audit_metadata' };
  }
  if (id.includes('STALE')) {
    return { ...base, signalType: 'stale_pending_review' };
  }
  if (id.includes('NPNS') || id.includes('PAID-NO')) {
    return { ...base, signalType: 'paid_provider_missing' };
  }
  if (id.includes('AMB') || id.includes('ambiguous')) {
    return { ...base, signalType: 'provider_timeout_ambiguous' };
  }
  if (id.includes('DUP') || id.includes('DUPLICATE')) {
    return { ...base, signalType: 'duplicate_provider_execution' };
  }
  if (id.includes('PRV-PRF') || id.includes('FULFILLED-NO')) {
    return { ...base, signalType: 'completed_without_provider_proof' };
  }
  return null;
}

/**
 * @param {import('../idempotencyKernel/types.js').IdempotencyDecision} d
 * @returns {RepairSignal | null}
 */
export function signalFromIdempotencyDecision(d) {
  const base = {
    sourceFindingId: d.code,
    sourceCode: d.code,
    invariantIds: d.invariantIds ?? [],
    entityIds: d.entityIds,
    evidence: d.evidence ?? {},
    severity: d.severity,
  };

  if (d.code === 'CORE5-KEY-001') {
    return { ...base, signalType: 'missing_idempotency_key' };
  }
  if (d.code === 'CORE5-RETRY-UNSAFE-001' || d.decision === 'RETRY_UNSAFE') {
    return { ...base, signalType: 'provider_retry_after_ambiguous' };
  }
  if (d.code === 'CORE5-RETRY-SAFE-001') {
    return { ...base, signalType: 'provider_retry' };
  }
  if (d.code.startsWith('CORE5-DUP') || d.decision === 'BLOCK_DUPLICATE') {
    return { ...base, signalType: 'duplicate_provider_execution' };
  }
  return null;
}

/**
 * @param {import('../noPayNoServiceProof/types.js').DeliveryProofDecision} d
 * @returns {RepairSignal | null}
 */
export function signalFromDeliveryDecision(d) {
  const base = {
    sourceFindingId: d.code,
    sourceCode: d.code,
    invariantIds: d.invariantIds ?? [],
    entityIds: d.entityIds,
    evidence: { ...(d.evidence ?? {}), missingEvidence: d.missingEvidence },
    severity: d.severity,
  };

  if (d.code === 'CORE6-PAID-NO-PRV-001' || d.code === 'CORE6-PAID-PRV-MISSING-001') {
    return { ...base, signalType: 'paid_provider_missing' };
  }
  if (d.code === 'CORE6-FULFILLED-NO-REF-001' || d.code === 'CORE6-FULFILLED-NO-PROOF-001') {
    return { ...base, signalType: 'completed_without_provider_proof' };
  }
  if (d.code === 'CORE6-PRV-AMBIG-001') {
    return { ...base, signalType: 'provider_timeout_ambiguous' };
  }
  if (d.code === 'CORE6-STALE-PENDING-001') {
    return { ...base, signalType: 'stale_pending_review' };
  }
  return null;
}

/**
 * @param {import('./signals.js').RepairSignal[]} explicit
 * @param {import('../runtimeDoctor/types.js').DiagnosticFinding[]} [findings]
 * @param {import('../idempotencyKernel/types.js').IdempotencyDecision[]} [idempotencyDecisions]
 * @param {import('../noPayNoServiceProof/types.js').DeliveryProofDecision[]} [deliveryDecisions]
 */
export function collectRepairSignals({
  signals: explicit = [],
  findings = [],
  idempotencyDecisions = [],
  deliveryDecisions = [],
}) {
  const out = [...explicit];
  const seen = new Set(out.map((s) => `${s.signalType}:${s.sourceFindingId ?? ''}`));

  const add = (s) => {
    if (!s) return;
    const key = `${s.signalType}:${s.sourceFindingId ?? ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(s);
  };

  for (const f of findings) add(signalFromDoctorFinding(f));
  for (const d of idempotencyDecisions) add(signalFromIdempotencyDecision(d));
  for (const d of deliveryDecisions) add(signalFromDeliveryDecision(d));

  return out;
}
