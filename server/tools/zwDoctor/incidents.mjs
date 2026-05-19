/**
 * Zora-Walat incident taxonomy + classifier (propose-only, no auto-repair execution).
 */

/** @typedef {'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'} IncidentSeverity */

/** @typedef {'ACTIVE'|'CONTAINED'|'RESOLVED'|'NOT_DETECTED'} IncidentStatus */

/**
 * @typedef {object} IncidentDefinition
 * @property {string} id
 * @property {IncidentSeverity} severity
 * @property {string[]} confidence_signals
 * @property {string} detection_command
 * @property {string} safe_immediate_action
 * @property {string} proposed_repair
 * @property {boolean} approval_required
 * @property {string[]} forbidden_actions
 * @property {string[]} evidence_required
 * @property {string} rollback_hint
 */

/**
 * @typedef {object} IncidentResult
 * @property {string} id
 * @property {IncidentSeverity} severity
 * @property {IncidentStatus} status
 * @property {'high'|'medium'|'low'} confidence
 * @property {string[]} signals
 * @property {string} proposed_action
 * @property {boolean} approval_required
 * @property {string[]} forbidden_actions
 * @property {string[]} evidence_required
 * @property {string} rollback_hint
 */

/** @typedef {import('./types.mjs').InvariantResult} InvariantResult */

/** @typedef {import('./types.mjs').ZwDoctorReport} ZwDoctorReport */

export const INCIDENT_IDS = Object.freeze([
  'UNPAID_FULFILLMENT_ATTEMPT',
  'DUPLICATE_FULFILLMENT_ATTEMPT',
  'DUPLICATE_PAYMENT_WEBHOOK',
  'CHECKOUT_MAPPING_MISMATCH',
  'PAYMENT_INTENT_MAPPING_MISMATCH',
  'REFUND_EXISTS_INCIDENT_NOT_UPDATED',
  'REFUND_DOUBLE_EXECUTION_RISK',
  'UNMATCHED_STRIPE_EVENT',
  'WEBHOOK_TIMEOUT_OR_NON_2XX',
  'EVENT_ORDERING_CONFLICT',
  'WRONG_VERCEL_DEPLOY_ROOT',
  'STAGING_API_DOWN',
  'OPERATOR_AUTH_FAILED',
  'TOKEN_EXPIRED',
  'STRIPE_KEY_MISSING_OR_MALFORMED',
  'STRIPE_LIVE_KEY_IN_TEST_CONTEXT',
  'DATABASE_UNREACHABLE',
  'PRISMA_MIGRATION_MISMATCH',
  'SECRETS_SCAN_FAILED',
  'CI_SUPER_SYSTEM_GUARD_FAILED',
  'FRONTEND_PAYMENT_CTA_INVALID',
]);

/** @type {Record<string, IncidentDefinition>} */
export const INCIDENT_TAXONOMY = Object.freeze({
  UNPAID_FULFILLMENT_ATTEMPT: {
    id: 'UNPAID_FULFILLMENT_ATTEMPT',
    severity: 'CRITICAL',
    confidence_signals: [
      'PAID_CONFIRMED false',
      'FULFILLMENT_ATTEMPT_COUNT > 0',
      'RUNTIME_UNPAID_FULFILLMENT invariant CRITICAL',
    ],
    detection_command:
      'npm run zw:doctor -- money-path && node tools/staging-auth-checkout-operator.mjs status-check',
    safe_immediate_action:
      'Freeze fulfillment kicks; capture enum-only status-check and phase1-truth readouts.',
    proposed_repair:
      'Investigate payment state vs fulfillment rows; no refund or resend until root cause documented.',
    approval_required: true,
    forbidden_actions: [
      'auto_fulfillment_retry',
      'refund_without_approval',
      'webhook_resend_without_approval',
      'order_status_mutation',
    ],
    evidence_required: [
      'before/after operator enums',
      'phase1-truth incident block',
      'fulfillment attempt count',
    ],
    rollback_hint:
      'If erroneous fulfillment occurred, contain provider dispatch and escalate — do not auto-reverse money.',
  },
  DUPLICATE_FULFILLMENT_ATTEMPT: {
    id: 'DUPLICATE_FULFILLMENT_ATTEMPT',
    severity: 'CRITICAL',
    confidence_signals: [
      'FULFILLMENT_ATTEMPT_COUNT > 1',
      'RUNTIME_DUPLICATE_FULFILLMENT invariant CRITICAL',
    ],
    detection_command:
      'node tools/staging-auth-checkout-operator.mjs status-check',
    safe_immediate_action:
      'Stop manual/operator fulfillment retries for affected order suffix.',
    proposed_repair:
      'Compare fulfillment attempts vs provider evidence; verify webhook idempotency ledger (read-only).',
    approval_required: true,
    forbidden_actions: [
      'second_fulfillment_dispatch',
      'refund_without_approval',
      'duplicate_webhook_resend',
    ],
    evidence_required: ['fulfillment count', 'attempt status enums', 'webhook idempotency note'],
    rollback_hint: 'Contain provider side; document duplicate attempt IDs (suffix-only) for support.',
  },
  DUPLICATE_PAYMENT_WEBHOOK: {
    id: 'DUPLICATE_PAYMENT_WEBHOOK',
    severity: 'HIGH',
    confidence_signals: [
      'duplicate checkout.session.completed resend',
      'ledger idempotent replay',
      'L-5 evidence expectation',
    ],
    detection_command:
      'npm run zw:doctor -- webhook && Ap786 L4/L5 resend proof review',
    safe_immediate_action:
      'Confirm order enums unchanged after Dashboard resend (read-only).',
    proposed_repair:
      'If duplicate delivery changes PAID or fulfillment, treat as CRITICAL money incident.',
    approval_required: true,
    forbidden_actions: ['unapproved_webhook_resend', 'second_refund'],
    evidence_required: ['before/after status-check enums', 'fulfillment count'],
    rollback_hint: 'Stop resend tests; revert only via documented payment-safety playbook.',
  },
  CHECKOUT_MAPPING_MISMATCH: {
    id: 'CHECKOUT_MAPPING_MISMATCH',
    severity: 'HIGH',
    confidence_signals: [
      'hosted checkout metadata mismatch',
      'l11-mapping-diagnose BLOCKED',
      'CHECKOUT_SESSION_MAPPING_SAFE not PASS',
    ],
    detection_command:
      'node tools/staging-auth-checkout-operator.mjs l11-mapping-diagnose',
    safe_immediate_action: 'Do not refund or fulfill until mapping verified (read-only diagnose).',
    proposed_repair:
      'Refresh order ref; verify session vs PI suffix alignment; fix client metadata contract.',
    approval_required: true,
    forbidden_actions: ['refund_execute', 'fulfillment_kick', 'webhook_resend'],
    evidence_required: ['mapping diagnose enums', 'order suffix reference'],
    rollback_hint: 'Use l11-refresh-order-ref before any money action.',
  },
  PAYMENT_INTENT_MAPPING_MISMATCH: {
    id: 'PAYMENT_INTENT_MAPPING_MISMATCH',
    severity: 'HIGH',
    confidence_signals: [
      'piSuffixesMatch false',
      'PAYMENT_INTENT_MAPPING_SAFE not PASS',
    ],
    detection_command:
      'node tools/staging-auth-checkout-operator.mjs l11-stripe-diagnose',
    safe_immediate_action: 'Halt L-11 or refund workflows until mapping PASS.',
    proposed_repair: 'Align PaymentIntent metadata with internal checkout id (desk review).',
    approval_required: true,
    forbidden_actions: ['l11-refund-execute', 'webhook_resend'],
    evidence_required: ['stripe diagnose enums', 'phase1-truth correlation'],
    rollback_hint: 'Do not execute refund until l11-mapping-diagnose PASS.',
  },
  REFUND_EXISTS_INCIDENT_NOT_UPDATED: {
    id: 'REFUND_EXISTS_INCIDENT_NOT_UPDATED',
    severity: 'HIGH',
    confidence_signals: [
      'REFUND_STATUS succeeded',
      'POST_PAYMENT_INCIDENT_STATUS not REFUNDED',
      'STATE_C class',
    ],
    detection_command:
      'node tools/staging-auth-checkout-operator.mjs l11-post-refund-verify',
    safe_immediate_action:
      'Read-only classify; do not create second refund.',
    proposed_repair:
      'Approved: resend duplicate charge.refunded event to staging webhook (test mode only).',
    approval_required: true,
    forbidden_actions: [
      'second_refund',
      'refund_execute_without_L11_REFUND_APPROVAL',
      'order_mutation',
    ],
    evidence_required: ['l11-post-refund-verify verdict', 'incident enum before/after'],
    rollback_hint: 'If resend fails, slim charge.refunded path desk review — no live Stripe.',
  },
  REFUND_DOUBLE_EXECUTION_RISK: {
    id: 'REFUND_DOUBLE_EXECUTION_RISK',
    severity: 'CRITICAL',
    confidence_signals: [
      'second refund attempt',
      'duplicate charge.refunded delivery',
      'L-13 checklist scope',
    ],
    detection_command: 'Ap786 L13 checklist + l11-post-refund-verify',
    safe_immediate_action: 'Stop all refund actions; capture before enums.',
    proposed_repair:
      'L-13: resend existing charge.refunded only (no new refund amount).',
    approval_required: true,
    forbidden_actions: ['l11-refund-execute', 'dashboard_second_refund'],
    evidence_required: ['refund count', 'incident status', 'fulfillment count'],
    rollback_hint: 'Freeze refund tooling until PASS proven.',
  },
  UNMATCHED_STRIPE_EVENT: {
    id: 'UNMATCHED_STRIPE_EVENT',
    severity: 'MEDIUM',
    confidence_signals: [
      'unmatched fast-ack',
      'unknown checkout id',
      'L-7 tests',
    ],
    detection_command: 'npm run zw:doctor -- webhook',
    safe_immediate_action: 'Verify event type; ensure no orphan PAID transition.',
    proposed_repair: 'Replay staging fixture tests; optional L-7 live replay with approval.',
    approval_required: false,
    forbidden_actions: ['create_order_from_unmatched_event'],
    evidence_required: ['event type enum', 'HTTP 200 ack'],
    rollback_hint: 'If orphan row appeared, reconciliation scan (read-only).',
  },
  WEBHOOK_TIMEOUT_OR_NON_2XX: {
    id: 'WEBHOOK_TIMEOUT_OR_NON_2XX',
    severity: 'HIGH',
    confidence_signals: [
      'Stripe retry schedule',
      'WEBHOOK_ENDPOINT_2XX not implemented in zw-doctor',
      '504 on handler',
    ],
    detection_command: 'Stripe Dashboard delivery log + staging route diagnostics',
    safe_immediate_action: 'Check slim handler deployed; no resend until root cause known.',
    proposed_repair:
      'Fix cold start / route; then approved Dashboard resend for same event id.',
    approval_required: true,
    forbidden_actions: ['mass_webhook_resend', 'manual_paid_transition'],
    evidence_required: ['HTTP status', 'handler path', 'order paid lag'],
    rollback_hint: 'Deploy server/api webhook shim before resend.',
  },
  EVENT_ORDERING_CONFLICT: {
    id: 'EVENT_ORDERING_CONFLICT',
    severity: 'MEDIUM',
    confidence_signals: [
      'PI before session.completed',
      'L-6 automated tests',
      'EVENT_ORDERING_SAFE PARTIAL',
    ],
    detection_command: 'npm run zw:doctor -- money-path',
    safe_immediate_action: 'Read-only phase1-truth; do not fulfill on ordering doubt.',
    proposed_repair: 'Optional staging replay with approval; verify classifier handles order.',
    approval_required: true,
    forbidden_actions: ['fulfillment_kick', 'refund'],
    evidence_required: ['event order note', 'final order status enums'],
    rollback_hint: 'Classifier should leave order safe-unpaid until session.completed.',
  },
  WRONG_VERCEL_DEPLOY_ROOT: {
    id: 'WRONG_VERCEL_DEPLOY_ROOT',
    severity: 'HIGH',
    confidence_signals: [
      'DEPLOY_GUARD_FAIL',
      '404 HTML on API routes',
      'DEPLOY_ROOT_IS_SERVER_API BLOCKED',
    ],
    detection_command: 'cd server && npm run deploy:staging:guard',
    safe_immediate_action: 'Stop deploy; verify monorepo root is not used.',
    proposed_repair: 'Approved: deploy staging API from server root.',
    approval_required: true,
    forbidden_actions: ['deploy_from_repo_root', 'skip_deploy_guard'],
    evidence_required: ['deploy guard output', 'health 200 on /api/health'],
    rollback_hint: 'Redeploy previous known-good server build.',
  },
  STAGING_API_DOWN: {
    id: 'STAGING_API_DOWN',
    severity: 'HIGH',
    confidence_signals: ['STAGING_API_HEALTH WARN/FAIL', 'health probe timeout'],
    detection_command: 'curl staging /api/health (no secrets)',
    safe_immediate_action: 'Check Vercel status and last deploy.',
    proposed_repair: 'Fix DATABASE_URL / boot; redeploy from server/ after guard PASS.',
    approval_required: true,
    forbidden_actions: ['live_stripe_tests_while_down'],
    evidence_required: ['health HTTP code', 'ready probe if available'],
    rollback_hint: 'Roll back Vercel deployment.',
  },
  OPERATOR_AUTH_FAILED: {
    id: 'OPERATOR_AUTH_FAILED',
    severity: 'MEDIUM',
    confidence_signals: [
      'login HTTP 401',
      'TOKEN_OK false',
      'OPERATOR_TOKEN BLOCKED',
    ],
    detection_command:
      'node tools/staging-auth-checkout-operator.mjs login',
    safe_immediate_action: 'Do not run checkout or refund modes.',
    proposed_repair: 'Refresh staging operator credentials in local env only.',
    approval_required: false,
    forbidden_actions: ['checkout', 'l11-refund-execute'],
    evidence_required: ['LOGIN_HTTP status enum'],
    rollback_hint: 'Re-login; verify OWNER_ALLOWED_EMAIL if lockdown.',
  },
  TOKEN_EXPIRED: {
    id: 'TOKEN_EXPIRED',
    severity: 'LOW',
    confidence_signals: ['TOKEN_EXPIRED true', 'TOKEN_STATE expired'],
    detection_command:
      'node tools/staging-auth-checkout-operator.mjs auth-env-check',
    safe_immediate_action: 'Re-login before status-check or truth reads.',
    proposed_repair: 'node tools/staging-auth-checkout-operator.mjs login',
    approval_required: false,
    forbidden_actions: ['refund_execute_with_expired_token'],
    evidence_required: ['TOKEN_EXPIRED enum'],
    rollback_hint: 'None — refresh session.',
  },
  STRIPE_KEY_MISSING_OR_MALFORMED: {
    id: 'STRIPE_KEY_MISSING_OR_MALFORMED',
    severity: 'MEDIUM',
    confidence_signals: [
      'stripe_secret_mode missing',
      'STRIPE_SECRET_TEST_ONLY BLOCKED',
    ],
    detection_command: 'npm run zw:doctor -- stripe-env',
    safe_immediate_action: 'Do not run payment or refund operator modes.',
    proposed_repair: 'Set TEST_STRIPE_KEY_REDACTED in server/.env.local (never commit).',
    approval_required: false,
    forbidden_actions: ['commit_env_files', 'live_key_in_staging'],
    evidence_required: ['l11-key-diagnose enums'],
    rollback_hint: 'Revert .env.local change if wrong key mode.',
  },
  STRIPE_LIVE_KEY_IN_TEST_CONTEXT: {
    id: 'STRIPE_LIVE_KEY_IN_TEST_CONTEXT',
    severity: 'CRITICAL',
    confidence_signals: [
      'live_blocked mode',
      'NO_LIVE_KEY CRITICAL',
    ],
    detection_command: 'npm run zw:doctor -- stripe-env',
    safe_immediate_action: 'Stop all Stripe money operations immediately.',
    proposed_repair: 'Remove live-mode secret keys from staging shell and .env.local.',
    approval_required: true,
    forbidden_actions: [
      'checkout',
      'refund',
      'webhook_forward',
      'deploy_with_live_keys',
    ],
    evidence_required: ['key mode enum only', 'key-diagnose PASS after fix'],
    rollback_hint: 'Rotate keys if live material was exposed; document incident.',
  },
  DATABASE_UNREACHABLE: {
    id: 'DATABASE_UNREACHABLE',
    severity: 'HIGH',
    confidence_signals: ['P1001', 'ready db_error', 'test-db-connection fail'],
    detection_command: 'cd server && npm run db:health',
    safe_immediate_action: 'Stop fulfillment worker; no order mutations.',
    proposed_repair: 'Fix connection URL shape and Postgres availability.',
    approval_required: true,
    forbidden_actions: ['prisma_migrate_on_unknown_state', 'manual_sql_without_backup'],
    evidence_required: ['db:health exit code', 'ready probe summary'],
    rollback_hint: 'Restore DB from backup drill if corruption suspected.',
  },
  PRISMA_MIGRATION_MISMATCH: {
    id: 'PRISMA_MIGRATION_MISMATCH',
    severity: 'HIGH',
    confidence_signals: ['migrate deploy fail', 'schema drift'],
    detection_command: 'cd server && npm run db:validate',
    safe_immediate_action: 'Do not deploy until migrations align.',
    proposed_repair: 'Run migrate deploy on staging with approval.',
    approval_required: true,
    forbidden_actions: ['db_push_on_production_without_plan'],
    evidence_required: ['migrate log', 'prisma validate'],
    rollback_hint: 'Roll back deploy; forward-fix migration in new commit.',
  },
  SECRETS_SCAN_FAILED: {
    id: 'SECRETS_SCAN_FAILED',
    severity: 'CRITICAL',
    confidence_signals: ['secrets:scan exit 1', 'SECRETS_SCAN_CLEAN CRITICAL'],
    detection_command: 'npm run secrets:scan',
    safe_immediate_action: 'Block merge; remove material from tracked files.',
    proposed_repair: 'Redact committed secrets; rotate affected credentials.',
    approval_required: true,
    forbidden_actions: ['push_without_fix', 'unblock_secret_scan'],
    evidence_required: ['scan path list only', 'rotation ticket'],
    rollback_hint: 'git revert offending commit.',
  },
  CI_SUPER_SYSTEM_GUARD_FAILED: {
    id: 'CI_SUPER_SYSTEM_GUARD_FAILED',
    severity: 'MEDIUM',
    confidence_signals: ['super-system-guard workflow red', 'zw-doctor strict fail'],
    detection_command: 'GitHub Actions super-system-guard job',
    safe_immediate_action: 'Reproduce locally with CI-equivalent commands.',
    proposed_repair: 'Fix invariants/regressions; re-run PR gate.',
    approval_required: false,
    forbidden_actions: ['skip_ci', 'force_push'],
    evidence_required: ['CI log summary', 'local zw-doctor output'],
    rollback_hint: 'Revert breaking commit.',
  },
  FRONTEND_PAYMENT_CTA_INVALID: {
    id: 'FRONTEND_PAYMENT_CTA_INVALID',
    severity: 'MEDIUM',
    confidence_signals: [
      'CTA_REQUIRES_VALID_OPERATOR_PLAN_AMOUNT not PASS',
      'missing continueDisabledReason',
    ],
    detection_command: 'npm run zw:doctor -- frontend-env',
    safe_immediate_action: 'Block release until CTA guards restored.',
    proposed_repair: 'Restore disabled reasons and busy guard in top-up/checkout UI.',
    approval_required: false,
    forbidden_actions: ['ship_without_cta_guard'],
    evidence_required: ['frontend-env invariant output'],
    rollback_hint: 'Revert frontend commit.',
  },
});

/** Maps invariant id -> incident id(s) when invariant is non-PASS */
const INVARIANT_TO_INCIDENTS = Object.freeze({
  RUNTIME_UNPAID_FULFILLMENT: ['UNPAID_FULFILLMENT_ATTEMPT'],
  RUNTIME_DUPLICATE_FULFILLMENT: ['DUPLICATE_FULFILLMENT_ATTEMPT'],
  PAID_BEFORE_FULFILLMENT: ['UNPAID_FULFILLMENT_ATTEMPT'],
  NO_DUPLICATE_FULFILLMENT: ['DUPLICATE_FULFILLMENT_ATTEMPT'],
  CHECKOUT_SESSION_MAPPING_SAFE: ['CHECKOUT_MAPPING_MISMATCH'],
  PAYMENT_INTENT_MAPPING_SAFE: ['PAYMENT_INTENT_MAPPING_MISMATCH'],
  UNMATCHED_EVENT_SAFE: ['UNMATCHED_STRIPE_EVENT'],
  EVENT_ORDERING_SAFE: ['EVENT_ORDERING_CONFLICT'],
  REFUND_SINGLE_EXECUTION_SAFE: ['REFUND_DOUBLE_EXECUTION_RISK'],
  POST_REFUND_INCIDENT_REFUNDED: ['REFUND_EXISTS_INCIDENT_NOT_UPDATED'],
  WEBHOOK_ENDPOINT_2XX: ['WEBHOOK_TIMEOUT_OR_NON_2XX'],
  DEPLOY_ROOT_IS_SERVER_API: ['WRONG_VERCEL_DEPLOY_ROOT'],
  STAGING_API_HEALTH: ['STAGING_API_DOWN'],
  OPERATOR_TOKEN_VALID_OR_REFRESHABLE: ['TOKEN_EXPIRED', 'OPERATOR_AUTH_FAILED'],
  STRIPE_SECRET_TEST_ONLY_FOR_STAGING: ['STRIPE_KEY_MISSING_OR_MALFORMED'],
  NO_LIVE_KEY_IN_TEST_CONTEXT: ['STRIPE_LIVE_KEY_IN_TEST_CONTEXT'],
  SECRETS_SCAN_CLEAN: ['SECRETS_SCAN_FAILED'],
  CTA_REQUIRES_VALID_OPERATOR_PLAN_AMOUNT: ['FRONTEND_PAYMENT_CTA_INVALID'],
});

const DANGEROUS_ACTION_PATTERNS = [
  /\brefund_execute\b/i,
  /\bl11-refund-execute\b/i,
  /\bcreate.?checkout\b/i,
  /\bwebhook.?resend\b/i,
  /\bresend.+webhook\b/i,
  /\bfulfillment.?kick\b/i,
  /\bauto.?repair.?apply\b/i,
  /\bZW_SELF_HEALING_APPLY\s*=\s*true\b/i,
  /\bproduction.?db.?write\b/i,
  /\border_status_mutation\b/i,
];

/**
 * @param {IncidentSeverity} s
 */
export function incidentSeverityRank(s) {
  const order = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
  return order[s] ?? 0;
}

/**
 * @param {string} action
 */
export function assertNoDangerousAutoRepair(action) {
  const a = String(action ?? '');
  for (const re of DANGEROUS_ACTION_PATTERNS) {
    if (re.test(a)) {
      throw new Error(`dangerous_auto_repair_forbidden:${re.source}`);
    }
  }
}

/**
 * @param {string} incidentId
 * @param {Partial<IncidentResult> & Pick<IncidentResult, 'status'|'signals'>} overrides
 */
function buildResult(incidentId, overrides) {
  const def = INCIDENT_TAXONOMY[incidentId];
  if (!def) {
    return {
      id: incidentId,
      severity: 'MEDIUM',
      status: overrides.status ?? 'ACTIVE',
      confidence: 'low',
      signals: overrides.signals ?? [],
      proposed_action: 'Unknown incident — manual classification required.',
      approval_required: true,
      forbidden_actions: ['auto_repair'],
      evidence_required: ['operator note'],
      rollback_hint: 'Escalate to payment-safety on-call.',
    };
  }
  return {
    id: def.id,
    severity: def.severity,
    status: overrides.status,
    confidence: overrides.confidence ?? 'medium',
    signals: [...def.confidence_signals, ...overrides.signals],
    proposed_action: overrides.proposed_action ?? def.proposed_repair,
    approval_required: def.approval_required,
    forbidden_actions: [...def.forbidden_actions],
    evidence_required: [...def.evidence_required],
    rollback_hint: def.rollback_hint,
  };
}

/**
 * @param {{
 *   incidentId: string,
 *   status?: IncidentStatus,
 *   signals?: string[],
 *   confidence?: 'high'|'medium'|'low',
 * }} input
 * @returns {IncidentResult}
 */
export function classifyIncident(input) {
  const id = String(input.incidentId ?? '').trim();
  const status = input.status ?? 'ACTIVE';
  return buildResult(id, {
    status,
    signals: input.signals ?? [],
    confidence: input.confidence ?? (status === 'ACTIVE' ? 'high' : 'medium'),
    proposed_action: undefined,
  });
}

/**
 * @param {IncidentDefinition} def
 */
export function buildIncidentRunbook(def) {
  return {
    incident_id: def.id,
    severity: def.severity,
    detection: def.detection_command,
    safe_immediate_action: def.safe_immediate_action,
    proposed_repair: def.proposed_repair,
    approval_required: def.approval_required,
    forbidden_actions: def.forbidden_actions,
    evidence_required: def.evidence_required,
    rollback: def.rollback_hint,
    auto_execute: false,
  };
}

/**
 * @param {InvariantResult} inv
 * @returns {IncidentResult[]}
 */
function incidentsFromInvariant(inv) {
  if (inv.status === 'PASS') return [];

  const mapped = INVARIANT_TO_INCIDENTS[inv.id] ?? [];
  const status = inv.status === 'NOT_IMPLEMENTED' ? 'NOT_DETECTED' : 'ACTIVE';
  const confidence =
    inv.confidence === 'high' ? 'high' : inv.confidence === 'low' ? 'low' : 'medium';

  if (inv.id === 'OPERATOR_TOKEN_VALID_OR_REFRESHABLE' && inv.status !== 'PASS') {
    const ev = String(inv.evidence ?? '');
    if (/expired/i.test(ev)) {
      return [buildResult('TOKEN_EXPIRED', { status: 'ACTIVE', signals: [ev], confidence })];
    }
    return [buildResult('OPERATOR_AUTH_FAILED', { status: 'ACTIVE', signals: [ev], confidence })];
  }

  if (mapped.length === 0) {
    return [];
  }

  return mapped.map((incidentId) => {
    const def = INCIDENT_TAXONOMY[incidentId];
    let severity = def?.severity ?? 'MEDIUM';
    if (inv.status === 'CRITICAL' && incidentSeverityRank(severity) < incidentSeverityRank('HIGH')) {
      severity = 'HIGH';
    }
    if (inv.status === 'CRITICAL' && incidentId.includes('FULFILLMENT')) {
      severity = 'CRITICAL';
    }
    const base = buildResult(incidentId, {
      status,
      signals: [`invariant=${inv.id}`, inv.evidence].filter(Boolean),
      confidence,
      proposed_action: inv.proposed_next_action || def?.proposed_repair,
    });
    return { ...base, severity };
  });
}

/**
 * @param {import('./proposals.mjs').RuntimeSignals} signals
 */
function incidentsFromRuntimeSignals(signals) {
  /** @type {IncidentResult[]} */
  const out = [];
  if (signals.unpaidWithFulfillment) {
    out.push(
      classifyIncident({
        incidentId: 'UNPAID_FULFILLMENT_ATTEMPT',
        status: 'ACTIVE',
        signals: ['runtime.unpaidWithFulfillment'],
        confidence: 'high',
      }),
    );
  }
  if (signals.duplicateFulfillment) {
    out.push(
      classifyIncident({
        incidentId: 'DUPLICATE_FULFILLMENT_ATTEMPT',
        status: 'ACTIVE',
        signals: ['runtime.duplicateFulfillment'],
        confidence: 'high',
      }),
    );
  }
  if (signals.refundExistsIncidentNotUpdated) {
    out.push(
      classifyIncident({
        incidentId: 'REFUND_EXISTS_INCIDENT_NOT_UPDATED',
        status: 'ACTIVE',
        signals: ['runtime.refundExistsIncidentNotUpdated'],
        confidence: 'high',
      }),
    );
  }
  if (signals.deployRootWrong) {
    out.push(
      classifyIncident({
        incidentId: 'WRONG_VERCEL_DEPLOY_ROOT',
        status: 'ACTIVE',
        signals: ['runtime.deployRootWrong'],
      }),
    );
  }
  if (signals.liveKeyInStagingContext) {
    out.push(
      classifyIncident({
        incidentId: 'STRIPE_LIVE_KEY_IN_TEST_CONTEXT',
        status: 'ACTIVE',
        signals: ['runtime.liveKeyInStagingContext'],
        confidence: 'high',
      }),
    );
  }
  if (signals.stripeKeyMissing || signals.stripeKeyMalformed) {
    out.push(
      classifyIncident({
        incidentId: 'STRIPE_KEY_MISSING_OR_MALFORMED',
        status: 'ACTIVE',
        signals: ['runtime.stripeKeyMissingOrMalformed'],
      }),
    );
  }
  return out;
}

/**
 * @param {ZwDoctorReport} report
 * @param {import('./proposals.mjs').RuntimeSignals} [runtimeSignals]
 * @returns {{ incidents: IncidentResult[], runbooks: object[] }}
 */
export function classifyDoctorReport(report, runtimeSignals = {}) {
  /** @type {Map<string, IncidentResult>} */
  const byId = new Map();

  for (const inv of report.invariants ?? []) {
    for (const inc of incidentsFromInvariant(inv)) {
      const existing = byId.get(inc.id);
      if (!existing || incidentSeverityRank(inc.severity) > incidentSeverityRank(existing.severity)) {
        byId.set(inc.id, inc);
      }
    }
  }

  for (const inc of incidentsFromRuntimeSignals(runtimeSignals)) {
    const existing = byId.get(inc.id);
    if (!existing || incidentSeverityRank(inc.severity) >= incidentSeverityRank(existing.severity)) {
      byId.set(inc.id, inc);
    }
  }

  const incidents = [...byId.values()].sort(
    (a, b) => incidentSeverityRank(b.severity) - incidentSeverityRank(a.severity),
  );

  const runbooks = incidents
    .filter((i) => i.status === 'ACTIVE')
    .map((i) => buildIncidentRunbook(INCIDENT_TAXONOMY[i.id] ?? INCIDENT_TAXONOMY.EVENT_ORDERING_CONFLICT));

  return { incidents, runbooks };
}

/**
 * @param {IncidentResult[]} incidents
 */
export function incidentsStrictExitCode(incidents) {
  const active = incidents.filter((i) => i.status === 'ACTIVE');
  const bad = active.filter(
    (i) => i.severity === 'HIGH' || i.severity === 'CRITICAL',
  );
  return bad.length > 0 ? 1 : 0;
}
