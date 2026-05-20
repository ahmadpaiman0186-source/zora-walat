/**
 * Non-destructive repair proposal engine (propose-only).
 */
import {
  buildJwtMaterialPattern,
  buildLiveStripeSecretPattern,
} from './secretPatterns.mjs';
import { ACTION_MODE, FAILURE_LEVEL } from './types.mjs';

/**
 * @typedef {import('./types.mjs').RepairProposal} RepairProposal
 * @typedef {import('./types.mjs').InvariantResult} InvariantResult
 */

/**
 * @typedef {object} RuntimeSignals
 * @property {boolean} [unpaidWithFulfillment]
 * @property {boolean} [duplicateFulfillment]
 * @property {boolean} [refundExistsIncidentNotUpdated]
 * @property {boolean} [deployRootWrong]
 * @property {boolean} [stripeKeyMissing]
 * @property {boolean} [stripeKeyMalformed]
 * @property {boolean} [liveKeyInStagingContext]
 */

/**
 * @param {Partial<RepairProposal> & Pick<RepairProposal, 'id'|'title'|'steps'>} p
 * @returns {RepairProposal}
 */
function proposal(p) {
  return {
    id: p.id,
    title: p.title,
    classification: p.classification ?? FAILURE_LEVEL.WARN,
    action_mode: p.action_mode ?? ACTION_MODE.PROPOSE_REPAIR,
    danger: p.danger ?? 'low',
    approval_required: p.approval_required === true,
    steps: p.steps,
    related_invariant: p.related_invariant,
    forbidden_auto: p.forbidden_auto === true,
  };
}

/**
 * @param {RuntimeSignals} signals
 * @returns {RepairProposal[]}
 */
export function buildRuntimeProposals(signals) {
  /** @type {RepairProposal[]} */
  const out = [];

  if (signals.unpaidWithFulfillment) {
    out.push(
      proposal({
        id: 'PROP_UNPAID_FULFILLMENT',
        title: 'Unpaid checkout with fulfillment attempts detected',
        classification: FAILURE_LEVEL.CRITICAL,
        action_mode: ACTION_MODE.APPROVAL_REQUIRED,
        danger: 'high',
        approval_required: true,
        forbidden_auto: true,
        related_invariant: 'PAID_BEFORE_FULFILLMENT',
        steps: [
          'Classify as money-path integrity incident — do not auto-mutate orders.',
          'Run operator phase1-truth and reconciliation scan (read-only).',
          'Freeze manual fulfillment kicks until root cause is documented.',
          'Escalate to payment-safety reviewer before any refund or resend.',
        ],
      }),
    );
  }

  if (signals.duplicateFulfillment) {
    out.push(
      proposal({
        id: 'PROP_DUPLICATE_FULFILLMENT',
        title: 'Duplicate fulfillment attempts detected',
        classification: FAILURE_LEVEL.CRITICAL,
        action_mode: ACTION_MODE.APPROVAL_REQUIRED,
        danger: 'high',
        approval_required: true,
        forbidden_auto: true,
        related_invariant: 'NO_DUPLICATE_FULFILLMENT',
        steps: [
          'Stop operator fulfillment retries for the affected order suffix.',
          'Compare fulfillment attempt rows vs provider evidence.',
          'Verify webhook idempotency ledger — no automated repair.',
        ],
      }),
    );
  }

  if (signals.refundExistsIncidentNotUpdated) {
    out.push(
      proposal({
        id: 'PROP_REFUND_INCIDENT_STALE',
        title: 'Refund may exist in Stripe but app incident not REFUNDED',
        classification: FAILURE_LEVEL.BLOCKED,
        action_mode: ACTION_MODE.APPROVAL_REQUIRED,
        danger: 'medium',
        approval_required: true,
        related_invariant: 'POST_REFUND_INCIDENT_REFUNDED',
        steps: [
          'Run: node tools/staging-auth-checkout-operator.mjs l11-post-refund-verify (read-only classify).',
          'If STATE_C: propose Dashboard resend of charge.refunded to staging webhook (test mode only).',
          'Requires explicit approval — zw-doctor will not resend webhooks.',
        ],
      }),
    );
  }

  if (signals.deployRootWrong) {
    out.push(
      proposal({
        id: 'PROP_DEPLOY_ROOT',
        title: 'Vercel deploy root may be wrong (Next.js shipped to API project)',
        classification: FAILURE_LEVEL.BLOCKED,
        action_mode: ACTION_MODE.APPROVAL_REQUIRED,
        danger: 'medium',
        approval_required: true,
        related_invariant: 'DEPLOY_ROOT_IS_SERVER_API',
        steps: [
          'cd server',
          'npm run deploy:staging:guard',
          'If guard passes: npm run deploy:staging (operator approval required).',
        ],
      }),
    );
  }

  if (signals.stripeKeyMissing || signals.stripeKeyMalformed) {
    out.push(
      proposal({
        id: 'PROP_STRIPE_KEY_LOCAL',
        title: 'Stripe secret key missing or malformed for local/staging shell',
        classification: FAILURE_LEVEL.WARN,
        action_mode: ACTION_MODE.PROPOSE_REPAIR,
        danger: 'low',
        approval_required: false,
        related_invariant: 'STRIPE_SECRET_TEST_ONLY_FOR_STAGING',
        steps: [
          'Set STRIPE_SECRET_KEY in server/.env.local (TEST_STRIPE_KEY_REDACTED shape only for staging).',
          'Restart Node after editing — do not commit .env files.',
          'Run: node tools/zw-doctor.mjs stripe-env',
        ],
      }),
    );
  }

  if (signals.liveKeyInStagingContext) {
    out.push(
      proposal({
        id: 'PROP_LIVE_KEY_STAGING',
        title: 'Live Stripe key detected in staging context',
        classification: FAILURE_LEVEL.CRITICAL,
        action_mode: ACTION_MODE.FORBIDDEN,
        danger: 'high',
        approval_required: true,
        forbidden_auto: true,
        related_invariant: 'NO_LIVE_KEY_IN_TEST_CONTEXT',
        steps: [
          'Remove LIVE_STRIPE_KEY_REDACTED / live restricted keys from staging operator shell and .env.local.',
          'Use test mode keys only until production go-live is approved.',
        ],
      }),
    );
  }

  return out;
}

/**
 * @param {InvariantResult[]} invariants
 * @param {RuntimeSignals} [signals]
 * @returns {RepairProposal[]}
 */
export function buildProposalsFromInvariants(invariants, signals = {}) {
  const out = [...buildRuntimeProposals(signals)];
  const seen = new Set(out.map((p) => p.id));

  for (const inv of invariants) {
    if (inv.status === 'PASS') continue;

    if (
      inv.id === 'NO_SECRET_FILES_STAGED' &&
      inv.status !== 'PASS' &&
      !seen.has('PROP_UNSTAGE_SECRETS')
    ) {
      out.push(
        proposal({
          id: 'PROP_UNSTAGE_SECRETS',
          title: 'Unstage secret-like files before commit',
          classification: FAILURE_LEVEL.CRITICAL,
          action_mode: ACTION_MODE.SAFE_LOCAL_FIX,
          danger: 'high',
          approval_required: false,
          related_invariant: inv.id,
          steps: [
            'git restore --staged .env .env.local .env.staging.local',
            'Verify .gitignore covers env files',
            'Re-run: npm run secrets:scan',
          ],
        }),
      );
      seen.add('PROP_UNSTAGE_SECRETS');
    }

    if (
      inv.id === 'NO_CUSTOMER_VISIBLE_TEST_OR_MOCK_COPY' &&
      inv.status !== 'PASS' &&
      !seen.has('PROP_FRONTEND_COPY')
    ) {
      out.push(
        proposal({
          id: 'PROP_FRONTEND_COPY',
          title: 'Remove test/mock customer-facing copy',
          classification: FAILURE_LEVEL.WARN,
          action_mode: ACTION_MODE.SAFE_LOCAL_FIX,
          danger: 'low',
          approval_required: false,
          related_invariant: inv.id,
          steps: [
            'Edit messages/en.ts and related locale files',
            'Run: node tools/zw-doctor.mjs frontend-env',
          ],
        }),
      );
      seen.add('PROP_FRONTEND_COPY');
    }

    if (
      inv.id === 'OPERATOR_TOKEN_VALID_OR_REFRESHABLE' &&
      (inv.status === 'BLOCKED' || inv.status === 'WARN') &&
      !seen.has('PROP_OPERATOR_LOGIN')
    ) {
      out.push(
        proposal({
          id: 'PROP_OPERATOR_LOGIN',
          title: 'Refresh staging operator session',
          classification: FAILURE_LEVEL.WARN,
          action_mode: ACTION_MODE.PROPOSE_REPAIR,
          danger: 'low',
          approval_required: false,
          related_invariant: inv.id,
          steps: [
            'cd server',
            'node tools/staging-auth-checkout-operator.mjs login',
            'Then: node tools/staging-auth-checkout-operator.mjs status-check',
          ],
        }),
      );
      seen.add('PROP_OPERATOR_LOGIN');
    }
  }

  return out;
}

/**
 * @param {RepairProposal[]} proposals
 * @param {string} text
 */
export function assertProposalOutputHasNoSecrets(proposals, text) {
  const blob = JSON.stringify(proposals) + text;
  if (buildLiveStripeSecretPattern().test(blob)) {
    throw new Error('proposal_output_contains_live_stripe_secret');
  }
  if (buildJwtMaterialPattern().test(blob)) {
    throw new Error('proposal_output_contains_jwt_material');
  }
}
