/**
 * Release gate specification + GO/NO-GO report builder (pure; no subprocess I/O).
 * Runner: `npm --prefix server run release:gate` → `scripts/release-gate.mjs`.
 */

/** @typedef {'security' | 'payment' | 'fulfillment' | 'infra' | 'config'} ReleaseGateBlockerCategory */

/** @typedef {{ id: string, label: string, domain: ReleaseGateBlockerCategory }} ReleaseGateManualChecklistItem */

/** @typedef {{ id: string, kind: 'npm' | 'flutter', script?: string, args?: string[], category: ReleaseGateBlockerCategory, label: string }} ReleaseGateStepSpec */

/**
 * @typedef {{ id: string, status: 'passed' | 'failed' | 'skipped', exitCode: number | null, durationMs: number, signal?: string | null }} ReleaseGateStepResult
 */

export const RELEASE_GATE_VERSION = 1;

/**
 * Ordered fail-closed steps (same order as `release:gate` runner).
 * @type {ReleaseGateStepSpec[]}
 */
export const RELEASE_GATE_STEPS = [
  {
    id: 'unit_tests',
    kind: 'npm',
    script: 'test',
    category: 'infra',
    label: 'Server unit tests',
  },
  {
    id: 'integration_tests',
    kind: 'npm',
    script: 'test:integration',
    category: 'payment',
    label: 'Server integration tests',
  },
  {
    id: 'verify_local_pricing',
    kind: 'npm',
    script: 'verify:local-pricing',
    category: 'payment',
    label: 'Local pricing runtime verification',
  },
  {
    id: 'proof_stripe_webhook_local',
    kind: 'npm',
    script: 'proof:stripe-webhook-local',
    category: 'payment',
    label: 'Stripe webhook local proof',
  },
  {
    id: 'proof_reloadly_dry_run',
    kind: 'npm',
    script: 'proof:reloadly-dry-run',
    category: 'fulfillment',
    label: 'Reloadly dry-run proof',
  },
  {
    id: 'proof_reconciliation_local',
    kind: 'npm',
    script: 'proof:reconciliation-local',
    category: 'payment',
    label: 'Reconciliation local proof',
  },
  {
    id: 'proof_audit_trail_local',
    kind: 'npm',
    script: 'proof:audit-trail-local',
    category: 'security',
    label: 'Audit trail local proof',
  },
  {
    id: 'proof_fraud_controls_local',
    kind: 'npm',
    script: 'proof:fraud-controls-local',
    category: 'security',
    label: 'Fraud controls local proof',
  },
  {
    id: 'proof_observability_local',
    kind: 'npm',
    script: 'proof:observability-local',
    category: 'infra',
    label: 'Observability local proof',
  },
  {
    id: 'proof_self_healing_local',
    kind: 'npm',
    script: 'proof:self-healing-local',
    category: 'infra',
    label: 'L7 self-healing local proof',
  },
  {
    id: 'preflight_production',
    kind: 'npm',
    script: 'preflight:production',
    category: 'config',
    label: 'Production preflight script',
  },
  {
    id: 'flutter_analyze',
    kind: 'flutter',
    args: ['analyze'],
    category: 'infra',
    label: 'Flutter static analysis',
  },
  {
    id: 'flutter_test',
    kind: 'flutter',
    args: ['test'],
    category: 'infra',
    label: 'Flutter tests',
  },
];

/**
 * Manual GO items (operator / secrets / runtime — not fully automatable here).
 * @type {ReleaseGateManualChecklistItem[]}
 */
export const RELEASE_GATE_MANUAL_CHECKLIST = [
  {
    id: 'stripe_live_keys_rotated',
    label: 'Stripe live keys configured and rotation policy agreed',
    domain: 'payment',
  },
  {
    id: 'webhook_secret_aligned',
    label: 'Stripe webhook signing secret aligned with Dashboard / active CLI forward',
    domain: 'payment',
  },
  {
    id: 'owner_gate_active',
    label: 'Owner / bootstrap gate active where required (no open admin in prod)',
    domain: 'security',
  },
  {
    id: 'dev_bypass_disabled',
    label: 'Dev checkout bypass and other unsafe dev flags disabled in production',
    domain: 'security',
  },
  {
    id: 'restricted_regions_enforced',
    label: 'Restricted / sanctioned region controls enforced on API edge',
    domain: 'security',
  },
  {
    id: 'reloadly_live_mapping',
    label: 'Reloadly live catalog / operator mapping present and verified for target corridors',
    domain: 'fulfillment',
  },
  {
    id: 'monitoring_enabled',
    label: 'Monitoring / alerting path agreed (metrics scrape, logs, on-call)',
    domain: 'infra',
  },
];

/** @returns {Record<ReleaseGateBlockerCategory, { stepId: string, label: string, exitCode: number | null, signal?: string | null }[]>} */
function emptyBlockerBuckets() {
  return {
    security: [],
    payment: [],
    fulfillment: [],
    infra: [],
    config: [],
  };
}

/**
 * @param {ReleaseGateStepSpec[]} steps
 * @param {ReleaseGateStepResult[]} results — same length/order as `steps`
 */
export function buildReleaseGateReport(steps, results) {
  if (steps.length !== results.length) {
    throw new Error('releaseGate: steps and results length mismatch');
  }
  const failing = [];
  const skipped = [];
  const blockers = emptyBlockerBuckets();
  for (let i = 0; i < steps.length; i += 1) {
    const s = steps[i];
    const r = results[i];
    if (s.id !== r.id) {
      throw new Error(`releaseGate: step id mismatch at index ${i}: ${s.id} vs ${r.id}`);
    }
    if (r.status === 'failed') {
      failing.push(s.id);
      const entry = {
        stepId: s.id,
        label: s.label,
        exitCode: r.exitCode,
        ...(r.signal ? { signal: r.signal } : {}),
      };
      blockers[s.category].push(entry);
    } else if (r.status === 'skipped') {
      skipped.push(s.id);
    }
  }
  const ok = failing.length === 0;
  const passedCount = results.filter((x) => x.status === 'passed').length;
  const failedCount = results.filter((x) => x.status === 'failed').length;
  const skippedCount = results.filter((x) => x.status === 'skipped').length;
  return {
    ok,
    schema: 'zora.release_gate.v1',
    version: RELEASE_GATE_VERSION,
    generatedAt: new Date().toISOString(),
    summary: {
      totalSteps: steps.length,
      passed: passedCount,
      failed: failedCount,
      skipped: skippedCount,
    },
    failingSteps: failing,
    skippedSteps: skipped,
    steps: steps.map((s, i) => ({
      id: s.id,
      label: s.label,
      kind: s.kind,
      category: s.category,
      status: results[i].status,
      exitCode: results[i].exitCode,
      durationMs: results[i].durationMs,
      ...(results[i].signal ? { signal: results[i].signal } : {}),
    })),
    blockers,
    manualChecklist: RELEASE_GATE_MANUAL_CHECKLIST.map((c) => ({
      id: c.id,
      label: c.label,
      domain: c.domain,
      /** Automation does not mark these; operators confirm outside this report. */
      operatorConfirmRequired: true,
    })),
  };
}
