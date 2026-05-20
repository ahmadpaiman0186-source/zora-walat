/**
 * Super-System intelligence layer — error classification + read-only health synthesis.
 * No secrets, no auto-repair execution, no money mutations.
 */
import {
  classifyDoctorReport,
  filterIncidentsForCiStatic,
} from './incidents.mjs';
import {
  collectRuntimeSignals,
  runInvariantsForMode,
} from './invariants.mjs';
import { ZW_DOCTOR_VERSION } from './types.mjs';

/** @typedef {'auth'|'db'|'stripe'|'webhook'|'fulfillment'|'frontend'|'config'|'deploy_root'|'secret'|'operator'|'unknown'} ErrorCategory */

export const ERROR_CATEGORIES = Object.freeze([
  'auth',
  'db',
  'stripe',
  'webhook',
  'fulfillment',
  'frontend',
  'config',
  'deploy_root',
  'secret',
  'operator',
  'unknown',
]);

const CATEGORY_RANK = Object.freeze({
  secret: 10,
  deploy_root: 9,
  stripe: 8,
  webhook: 7,
  fulfillment: 7,
  auth: 6,
  operator: 6,
  db: 5,
  config: 4,
  frontend: 3,
  unknown: 0,
});

/** Maps invariant id prefixes/patterns → error category. */
const INVARIANT_CATEGORY_MAP = Object.freeze({
  RUNTIME_UNPAID_FULFILLMENT: 'fulfillment',
  RUNTIME_DUPLICATE_FULFILLMENT: 'fulfillment',
  PAID_BEFORE_FULFILLMENT: 'fulfillment',
  NO_DUPLICATE_FULFILLMENT: 'fulfillment',
  REFUND_SINGLE_EXECUTION_SAFE: 'stripe',
  POST_REFUND_INCIDENT_REFUNDED: 'stripe',
  CHECKOUT_SESSION_MAPPING_SAFE: 'stripe',
  PAYMENT_INTENT_MAPPING_SAFE: 'stripe',
  UNMATCHED_EVENT_SAFE: 'webhook',
  EVENT_ORDERING_SAFE: 'webhook',
  WEBHOOK_ENDPOINT_2XX: 'webhook',
  STRIPE_SECRET_TEST_ONLY_FOR_STAGING: 'stripe',
  NO_LIVE_KEY_IN_TEST_CONTEXT: 'secret',
  SECRETS_SCAN_CLEAN: 'secret',
  NO_SECRET_FILES_STAGED: 'secret',
  DEPLOY_ROOT_IS_SERVER_API: 'deploy_root',
  STAGING_API_HEALTH: 'db',
  OPERATOR_TOKEN_VALID_OR_REFRESHABLE: 'operator',
  STATUS_CHECK_AVAILABLE: 'operator',
  PHASE1_TRUTH_AVAILABLE: 'operator',
  CTA_REQUIRES_VALID_OPERATOR_PLAN_AMOUNT: 'frontend',
  NO_CUSTOMER_VISIBLE_TEST_OR_MOCK_COPY: 'frontend',
  EVIDENCE_INDEX_CURRENT: 'config',
});

const SIGNAL_PATTERNS = Object.freeze([
  { re: /\b(auth|login|token|jwt|401|403|owner_only)\b/i, cat: 'auth' },
  { re: /\b(database|prisma|db_|neon|postgres|connection)\b/i, cat: 'db' },
  { re: /(?:stripe|checkout|payment_intent|charge\.|refund)/i, cat: 'stripe' },
  { re: /\b(webhook|evt_|signature|resend)\b/i, cat: 'webhook' },
  { re: /\b(fulfillment|fulfil|paid_before|unpaid)\b/i, cat: 'fulfillment' },
  { re: /\b(frontend|cta|copy|mock)\b/i, cat: 'frontend' },
  { re: /\b(deploy|vercel|nextjs|404|html)\b/i, cat: 'deploy_root' },
  { re: /\b(secret|sk_|whsec_|scan)\b/i, cat: 'secret' },
  { re: /\b(operator|staging.auth)\b/i, cat: 'operator' },
]);

/**
 * Classify a sanitized signal string (no raw secrets).
 *
 * @param {{ code?: string, message?: string, invariantId?: string, httpStatus?: number }} input
 * @returns {ErrorCategory}
 */
export function classifyErrorSignal(input = {}) {
  const inv = String(input.invariantId ?? '').trim();
  if (inv && INVARIANT_CATEGORY_MAP[inv]) {
    return INVARIANT_CATEGORY_MAP[inv];
  }

  if (input.httpStatus === 401 || input.httpStatus === 403) {
    return 'auth';
  }

  const blob = `${input.code ?? ''} ${input.message ?? ''}`.trim();
  if (!blob) return 'unknown';

  for (const { re, cat } of SIGNAL_PATTERNS) {
    if (re.test(blob)) return cat;
  }

  return 'unknown';
}

/**
 * @param {import('./types.mjs').InvariantResult} inv
 * @returns {ErrorCategory}
 */
export function classifyInvariant(inv) {
  const mapped = INVARIANT_CATEGORY_MAP[inv.id];
  if (mapped) return mapped;
  return classifyErrorSignal({
    invariantId: inv.id,
    message: inv.evidence,
    code: inv.risk,
  });
}

/**
 * @param {import('./types.mjs').InvariantResult[]} invariants
 */
export function summarizeByCategory(invariants) {
  /** @type {Record<ErrorCategory, { pass: number, warn: number, blocked: number, critical: number, partial: number, not_impl: number }>} */
  const out = {};
  for (const cat of ERROR_CATEGORIES) {
    out[cat] = { pass: 0, warn: 0, blocked: 0, critical: 0, partial: 0, not_impl: 0 };
  }

  for (const inv of invariants) {
    const cat = classifyInvariant(inv);
    const bucket = out[cat] ?? out.unknown;
    if (inv.status === 'PASS') bucket.pass += 1;
    else if (inv.status === 'WARN') bucket.warn += 1;
    else if (inv.status === 'BLOCKED') bucket.blocked += 1;
    else if (inv.status === 'CRITICAL') bucket.critical += 1;
    else if (inv.status === 'PARTIAL') bucket.partial += 1;
    else if (inv.status === 'NOT_IMPLEMENTED') bucket.not_impl += 1;
  }

  return out;
}

/**
 * @param {import('./types.mjs').InvariantResult[]} invariants
 */
export function topRiskCategories(invariants) {
  const summary = summarizeByCategory(invariants);
  return ERROR_CATEGORIES.filter((cat) => {
    const s = summary[cat];
    return s.critical > 0 || s.blocked > 0;
  }).sort((a, b) => (CATEGORY_RANK[b] ?? 0) - (CATEGORY_RANK[a] ?? 0));
}

/**
 * @param {import('./types.mjs').InvariantResult[]} invariants
 * @param {import('./incidents.mjs').IncidentResult[]} [incidents]
 */
export function buildIntelligencePayload(invariants, incidents = []) {
  const categorySummary = summarizeByCategory(invariants);
  const risks = topRiskCategories(invariants);
  const activeIncidents = incidents.filter((i) => i.status === 'ACTIVE');
  const moneyIncidents = activeIncidents.filter((i) =>
    /FULFILLMENT|REFUND|PAYMENT|WEBHOOK|STRIPE/i.test(i.id),
  );

  let platformVerdict = 'HEALTHY';
  if (invariants.some((i) => i.status === 'CRITICAL')) {
    platformVerdict = 'CRITICAL';
  } else if (
    activeIncidents.some((i) => i.severity === 'CRITICAL') ||
    invariants.some((i) => i.status === 'BLOCKED')
  ) {
    platformVerdict = 'DEGRADED';
  } else if (
    invariants.some((i) => i.status === 'WARN' || i.status === 'PARTIAL') ||
    activeIncidents.length > 0
  ) {
    platformVerdict = 'WARN';
  }

  return {
    version: ZW_DOCTOR_VERSION,
    mode: 'intelligence',
    timestamp: new Date().toISOString(),
    platform_verdict: platformVerdict,
    auto_repair_executed: false,
    money_mutation_executed: false,
    category_summary: categorySummary,
    top_risk_categories: risks,
    active_incident_count: activeIncidents.length,
    active_money_incident_count: moneyIncidents.length,
    fail_closed_money_path: (() => {
      const paidGate = invariants.find((i) => i.id === 'PAID_BEFORE_FULFILLMENT');
      const unpaid = invariants.find((i) => i.id === 'RUNTIME_UNPAID_FULFILLMENT');
      return (
        paidGate?.status === 'PASS' &&
        (unpaid == null || unpaid.status !== 'CRITICAL')
      );
    })(),
    self_healing_apply_allowed: false,
    no_false_pass_policy: true,
  };
}

/**
 * @param {object} payload
 * @param {(key: string, value: string) => void} emit
 */
export function printIntelligenceReport(payload, emit) {
  emit('ZW_INTELLIGENCE_VERDICT', payload.platform_verdict);
  emit('AUTO_REPAIR_EXECUTED', payload.auto_repair_executed ? 'true' : 'false');
  emit('MONEY_MUTATION_EXECUTED', payload.money_mutation_executed ? 'true' : 'false');
  emit('ACTIVE_INCIDENT_COUNT', String(payload.active_incident_count));
  emit('ACTIVE_MONEY_INCIDENT_COUNT', String(payload.active_money_incident_count));
  emit('FAIL_CLOSED_MONEY_PATH', payload.fail_closed_money_path ? 'true' : 'false');
  emit('SELF_HEALING_APPLY_ALLOWED', 'false');

  for (const cat of payload.top_risk_categories) {
    emit('TOP_RISK_CATEGORY', cat);
  }

  for (const cat of ERROR_CATEGORIES) {
    const s = payload.category_summary[cat];
    if (!s) continue;
    const total =
      s.pass + s.warn + s.blocked + s.critical + s.partial + s.not_impl;
    if (total === 0) continue;
    emit(
      `CATEGORY_${cat.toUpperCase()}`,
      `pass=${s.pass} warn=${s.warn} blocked=${s.blocked} critical=${s.critical}`,
    );
  }
}

/**
 * @param {{ json?: boolean, strict?: boolean, probeStaging?: boolean, probeOperator?: boolean, ciStatic?: boolean }} opts
 */
export async function runZwDoctorIntelligence(opts = {}) {
  const ciStatic = opts.ciStatic === true;
  const ctx = {
    probeStaging: !ciStatic && opts.probeStaging !== false,
    probeOperator: !ciStatic && opts.probeOperator !== false,
    ciStatic,
  };

  const invariants = await runInvariantsForMode('all', ctx);
  const signals = collectRuntimeSignals(ctx);
  let { incidents } = classifyDoctorReport(
    {
      version: ZW_DOCTOR_VERSION,
      mode: 'all',
      timestamp: new Date().toISOString(),
      verdict: 'PARTIAL',
      invariants,
      proposals: [],
      summary: {},
    },
    signals,
  );
  if (ciStatic) {
    incidents = filterIncidentsForCiStatic(incidents);
  }

  const payload = buildIntelligencePayload(invariants, incidents);

  if (opts.json) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  } else {
    printIntelligenceReport(payload, (k, v) => {
      process.stdout.write(`${k} ${v}\n`);
    });
  }

  const exitCode =
    opts.strict === true &&
    (payload.platform_verdict === 'CRITICAL' || payload.platform_verdict === 'DEGRADED')
      ? 1
      : 0;

  return { payload, exitCode };
}
