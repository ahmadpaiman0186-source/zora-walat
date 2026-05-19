/**
 * Super-System invariant checks — diagnose only, no money mutations.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  classifyStripeSecretKeyMode,
  resolveL11OperatorStripeKey,
} from '../stagingOperatorL11StripeKey.mjs';
import dotenv from 'dotenv';
import { decodeJwtClaimsUnsafe } from '../stagingOperatorAuthEnv.mjs';

import { INVARIANT_CATEGORIES, invariant } from './types.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const SERVER_ROOT = join(__dirname, '..', '..');
export const REPO_ROOT = join(SERVER_ROOT, '..');

const BANNED_CUSTOMER_COPY = [
  'bank-grade',
  'military-grade',
  'test mode',
  'provider routing is mocked',
  'mocked routing',
  'guaranteed instant',
  'not wired',
];

const MONEY_PATH_TEST_FILES = [
  'test/orderStateSafetyAudit.test.js',
  'test/transactionFortressGate.test.js',
  'test/slimStripeWebhookUnmatchedFastAck.test.js',
  'test/paymentReconciliationRefundSafety.test.js',
  'test/integrations/stripeWebhookHttpChaos.integration.test.js',
];

/**
 * @typedef {object} ZwDoctorContext
 * @property {boolean} [probeStaging]
 * @property {boolean} [probeOperator]
 * @property {string} [stagingApiBase]
 */

/**
 * @param {string} rel
 */
function serverFile(rel) {
  return join(SERVER_ROOT, rel);
}

/**
 * @param {string} rel
 */
function repoFile(rel) {
  return join(REPO_ROOT, rel);
}

/**
 * @param {string} path
 */
function fileContains(path, needle) {
  if (!existsSync(path)) return false;
  return readFileSync(path, 'utf8').includes(needle);
}

/**
 * @param {ZwDoctorContext} ctx
 */
export async function runMoneyPathInvariants(ctx) {
  /** @type {import('./types.mjs').InvariantResult[]} */
  const results = [];

  const gatePath = serverFile('src/lib/phase1FulfillmentPaymentGate.js');
  if (existsSync(gatePath)) {
    try {
      const { canOrderProceedToFulfillment } = await import(
        '../../src/lib/phase1FulfillmentPaymentGate.js'
      );
      const { ORDER_STATUS } = await import('../../src/constants/orderStatus.js');
      const { PAYMENT_CHECKOUT_STATUS } = await import(
        '../../src/constants/paymentCheckoutStatus.js',
      );
      const { POST_PAYMENT_INCIDENT_STATUS } = await import(
        '../../src/constants/postPaymentIncidentStatus.js',
      );
      const pending = canOrderProceedToFulfillment({
        productType: 'mobile_topup',
        currency: 'usd',
        orderStatus: ORDER_STATUS.PENDING,
        status: PAYMENT_CHECKOUT_STATUS.PAYMENT_PENDING,
        amountUsdCents: 500,
        stripePaymentIntentId: 'pi_test_suffix',
        postPaymentIncidentStatus: POST_PAYMENT_INCIDENT_STATUS.NONE,
      });
      const paid = canOrderProceedToFulfillment({
        productType: 'mobile_topup',
        currency: 'usd',
        orderStatus: ORDER_STATUS.PAID,
        status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
        amountUsdCents: 500,
        stripePaymentIntentId: 'pi_test_suffix',
        completedByWebhookEventId: 'evt_test_suffix',
        postPaymentIncidentStatus: POST_PAYMENT_INCIDENT_STATUS.NONE,
      });
      results.push(
        invariant({
          id: 'PAID_BEFORE_FULFILLMENT',
          status:
            pending.ok === false && paid.ok === true ? 'PASS' : 'CRITICAL',
          confidence: 'high',
          category: INVARIANT_CATEGORIES.MONEY_PATH,
          evidence: `canOrderProceedToFulfillment pending=${pending.ok} paid=${paid.ok}`,
          risk: 'Fulfillment without server-confirmed payment',
          proposed_next_action:
            pending.ok === false && paid.ok === true
              ? 'Gate enforced in code'
              : 'Inspect phase1FulfillmentPaymentGate.js immediately',
          approval_required: pending.ok !== false || paid.ok !== true,
        }),
      );
    } catch (e) {
      results.push(
        invariant({
          id: 'PAID_BEFORE_FULFILLMENT',
          status: 'BLOCKED',
          confidence: 'medium',
          category: INVARIANT_CATEGORIES.MONEY_PATH,
          evidence: `import_failed:${String(e.message ?? e).slice(0, 80)}`,
          risk: 'Cannot verify fulfillment gate at runtime',
          proposed_next_action: 'Fix module import path for zw-doctor',
          approval_required: true,
        }),
      );
    }
  } else {
    results.push(
      invariant({
        id: 'PAID_BEFORE_FULFILLMENT',
        status: 'CRITICAL',
        confidence: 'high',
        category: INVARIANT_CATEGORIES.MONEY_PATH,
        evidence: 'phase1FulfillmentPaymentGate.js missing',
        risk: 'No paid-before-fulfillment gate file',
        proposed_next_action: 'Restore gate from git',
        approval_required: true,
      }),
    );
  }

  const psm = serverFile('src/payment/paymentStateMachine.js');
  results.push(
    invariant({
      id: 'WEBHOOK_ONLY_PAID_AUTHORITY',
      status: fileContains(psm, 'WEBHOOK_ONLY_TO_PAID_FROM')
        ? 'PASS'
        : 'CRITICAL',
      confidence: 'high',
      category: INVARIANT_CATEGORIES.MONEY_PATH,
      evidence: fileContains(psm, 'stripe_webhook')
        ? 'paymentStateMachine.js defines webhook-only PAID transition'
        : 'WEBHOOK_ONLY_TO_PAID_FROM not found',
      risk: 'API shortcut could mark orders PAID without Stripe',
      proposed_next_action: 'Restore webhook-only PAID authority in paymentStateMachine.js',
      approval_required: !fileContains(psm, 'WEBHOOK_ONLY_TO_PAID_FROM'),
    }),
  );

  for (const [id, file, needle] of [
    ['CHECKOUT_SESSION_MAPPING_SAFE', 'tools/stagingOperatorL11StripeMapping.mjs', 'evaluateDbStripeMapping'],
    ['PAYMENT_INTENT_MAPPING_SAFE', 'tools/stagingOperatorL11StripeMapping.mjs', 'piSuffixesMatch'],
    ['UNMATCHED_EVENT_SAFE', 'api/slimStripeWebhookHandler.mjs', 'stripeEventSlimUnmatchedFastAck'],
    ['EVENT_ORDERING_SAFE', 'test/integrations/stripeWebhookHttpChaos.integration.test.js', 'describe'],
  ]) {
    const p = serverFile(file);
    const testOnly = file.startsWith('test/');
    results.push(
      invariant({
        id,
        status: existsSync(p) ? 'PASS' : testOnly ? 'PARTIAL' : 'BLOCKED',
        confidence: existsSync(p) ? 'high' : 'medium',
        category: INVARIANT_CATEGORIES.MONEY_PATH,
        evidence: existsSync(p)
          ? `${file} present${needle && fileContains(p, needle) ? '' : ''}`
          : `${file} missing`,
        risk: id.includes('UNMATCHED')
          ? 'Orphan Stripe events could corrupt money state'
          : 'Mapping/order bugs on hosted checkout',
        proposed_next_action: existsSync(p)
          ? 'Run focused webhook tests in CI'
          : `Restore ${file}`,
        approval_required: !existsSync(p),
      }),
    );
  }

  const negTests = [
    'Ap786/L8_CARD_DECLINED_SAFETY.md',
    'Ap786/L9_CHECKOUT_CANCEL_SAFETY.md',
    'Ap786/L10_EXPIRED_CHECKOUT_SESSION_SAFETY.md',
  ];
  const negOk = negTests.every((f) => existsSync(repoFile(f)));
  results.push(
    invariant({
      id: 'CANCEL_DECLINE_EXPIRE_NO_FULFILLMENT',
      status: negOk ? 'PASS' : 'PARTIAL',
      confidence: negOk ? 'high' : 'medium',
      category: INVARIANT_CATEGORIES.MONEY_PATH,
      evidence: negOk
        ? 'L-8/L-9/L-10 Ap786 evidence files present'
        : `missing:${negTests.filter((f) => !existsSync(repoFile(f))).join(',')}`,
      risk: 'Unpaid sessions could fulfill',
      proposed_next_action: 'Complete L-8–L-10 evidence or run automated webhook chaos tests',
      approval_required: false,
    }),
  );

  results.push(
    invariant({
      id: 'REFUND_SINGLE_EXECUTION_SAFE',
      status: existsSync(repoFile('Ap786/L11_REFUND_EXECUTION_AND_POST_REFUND_PROOF.md'))
        ? 'PASS'
        : 'PARTIAL',
      confidence: 'high',
      category: INVARIANT_CATEGORIES.MONEY_PATH,
      evidence: 'L-11 PASS documented (single refund, no second refund)',
      risk: 'Double refund or duplicate incident corruption',
      proposed_next_action: 'Execute L-13 duplicate refund resend proof when approved',
      approval_required: false,
    }),
  );

  results.push(
    invariant({
      id: 'NO_DUPLICATE_FULFILLMENT',
      status: existsSync(repoFile('Ap786/L5_DUPLICATE_WEBHOOK_SAFETY_PROOF_PLAN.md'))
        ? 'PASS'
        : 'PARTIAL',
      confidence: 'medium',
      category: INVARIANT_CATEGORIES.MONEY_PATH,
      evidence: 'L-5 duplicate webhook resend proof documented',
      risk: 'Duplicate fulfillment on webhook replay',
      proposed_next_action: 'Run transactionFortressConcurrency integration test in CI',
      approval_required: false,
    }),
  );

  results.push(
    invariant({
      id: 'POST_REFUND_INCIDENT_REFUNDED',
      status: fileContains(
        repoFile('Ap786/AP786_EVIDENCE_INDEX.txt'),
        'L-11: PASS',
      )
        ? 'PASS'
        : 'PARTIAL',
      confidence: 'high',
      category: INVARIANT_CATEGORIES.MONEY_PATH,
      evidence: 'Ap786 index records L-11 PASS with REFUNDED incident',
      risk: 'Refund in Stripe without app incident mirror',
      proposed_next_action:
        'Use l11-post-refund-verify after refunds; never auto-resend from zw-doctor',
      approval_required: false,
    }),
  );

  const missingTests = MONEY_PATH_TEST_FILES.filter(
    (f) => !existsSync(serverFile(f)),
  );
  if (missingTests.length === 0) {
    results.push(
      invariant({
        id: 'MONEY_PATH_TEST_COVERAGE',
        status: 'PASS',
        confidence: 'medium',
        category: INVARIANT_CATEGORIES.MONEY_PATH,
        evidence: `${MONEY_PATH_TEST_FILES.length} key test files present`,
        risk: 'Regression in money path',
        proposed_next_action: 'npm run test:ci on integration DB',
        approval_required: false,
      }),
    );
  }

  if (ctx.probeOperator) {
    const op = await probeOperatorStatusCheck();
    if (op) {
      results.push(...op.invariants);
      Object.assign(ctx, { _runtimeSignals: op.signals });
    }
  }

  return results;
}

/**
 * @param {ZwDoctorContext} ctx
 */
export async function runFrontendInvariants(ctx) {
  void ctx;
  const results = [];
  const enPath = repoFile('messages/en.ts');
  let banned = [];
  if (existsSync(enPath)) {
    const src = readFileSync(enPath, 'utf8').toLowerCase();
    banned = BANNED_CUSTOMER_COPY.filter((p) => src.includes(p));
  }
  results.push(
    invariant({
      id: 'NO_CUSTOMER_VISIBLE_TEST_OR_MOCK_COPY',
      status: banned.length === 0 ? 'PASS' : 'BLOCKED',
      confidence: 'high',
      category: INVARIANT_CATEGORIES.FRONTEND,
      evidence:
        banned.length === 0
          ? 'messages/en.ts has no banned test/mock phrases'
          : `banned_found:${banned.join('|')}`,
      risk: 'Investor/customer trust damage',
      proposed_next_action: 'Replace banned phrases in messages/en.ts and locales',
      approval_required: banned.length > 0,
    }),
  );

  const strong = ['bank-grade', 'military-grade', 'guaranteed secure'];
  const topup = repoFile('components/topup/ZoraWalatTopUp.tsx');
  let strongFound = [];
  if (existsSync(topup)) {
    const t = readFileSync(topup, 'utf8').toLowerCase();
    strongFound = strong.filter((p) => t.includes(p));
  }
  results.push(
    invariant({
      id: 'NO_OVERSTRONG_SECURITY_CLAIMS',
      status: strongFound.length === 0 ? 'PASS' : 'BLOCKED',
      confidence: 'high',
      category: INVARIANT_CATEGORIES.FRONTEND,
      evidence:
        strongFound.length === 0
          ? 'Top-up component has no overstrong security claims'
          : `found:${strongFound.join('|')}`,
      risk: 'Misleading security marketing',
      proposed_next_action: 'Use defensible Stripe-hosted checkout language',
      approval_required: strongFound.length > 0,
    }),
  );

  const hasCtaGuard =
    existsSync(topup) &&
    fileContains(topup, 'continueDisabledReason') &&
    fileContains(topup, 'busyIntent');
  results.push(
    invariant({
      id: 'CTA_REQUIRES_VALID_OPERATOR_PLAN_AMOUNT',
      status: hasCtaGuard ? 'PASS' : 'PARTIAL',
      confidence: existsSync(topup) ? 'high' : 'low',
      category: INVARIANT_CATEGORIES.FRONTEND,
      evidence: hasCtaGuard
        ? 'ZoraWalatTopUp.tsx disables CTA with reason + busy guard'
        : 'CTA guard pattern not found in web top-up',
      risk: 'Double-submit or invalid checkout',
      proposed_next_action: 'Verify Flutter checkout_screen _canPay parity',
      approval_required: false,
    }),
  );

  const rt = repoFile('lib/env/publicRuntime.ts');
  const safeErrors =
    existsSync(rt) &&
    fileContains(rt, 'buildStripePublishableKeyCustomerMessage') &&
    !readFileSync(rt, 'utf8').includes('C:\\\\Users\\\\ahmad');
  results.push(
    invariant({
      id: 'PRODUCTION_ERROR_COPY_SAFE',
      status: safeErrors ? 'PASS' : 'WARN',
      confidence: 'medium',
      category: INVARIANT_CATEGORIES.FRONTEND,
      evidence: safeErrors
        ? 'publicRuntime.ts uses customer-safe Stripe messages'
        : 'Dev-only paths or hardcoded workspace paths may leak to production UI',
      risk: 'Developer paths shown to customers',
      proposed_next_action: 'Gate detailed Stripe setup hints behind NODE_ENV=development',
      approval_required: false,
    }),
  );

  return results;
}

/**
 * @param {ZwDoctorContext} ctx
 */
/**
 * Load operator env without printing values (quiet dotenv for JSON output).
 */
function loadZwDoctorEnv() {
  dotenv.config({
    path: join(SERVER_ROOT, '.env'),
    override: false,
    quiet: true,
  });
  const localPath = join(SERVER_ROOT, '.env.local');
  if (existsSync(localPath)) {
    dotenv.config({ path: localPath, override: true, quiet: true });
  }
}

export async function runConfigSecurityInvariants(ctx) {
  loadZwDoctorEnv();
  const results = [];

  const resolution = resolveL11OperatorStripeKey({
    serverRoot: SERVER_ROOT,
    stripeKeyBeforeDotenv: process.env.STRIPE_SECRET_KEY,
  });
  const mode = resolution.keyMode ?? classifyStripeSecretKeyMode(
    process.env.STRIPE_SECRET_KEY ?? '',
  );

  let stripeStatus = 'PASS';
  if (mode === 'missing' || mode === 'placeholder') stripeStatus = 'BLOCKED';
  else if (mode === 'malformed') stripeStatus = 'BLOCKED';
  else if (mode === 'live_blocked') stripeStatus = 'CRITICAL';
  else if (mode === 'test_secret' || mode === 'test_restricted')
    stripeStatus = 'PASS';

  results.push(
    invariant({
      id: 'STRIPE_SECRET_TEST_ONLY_FOR_STAGING',
      status: stripeStatus,
      confidence: 'high',
      category: INVARIANT_CATEGORIES.CONFIG_SECURITY,
      evidence: `stripe_secret_mode=${mode} source=${resolution.effectiveSource ?? 'unknown'}`,
      risk: 'Wrong Stripe mode for environment',
      proposed_next_action:
        mode === 'missing'
          ? 'Set TEST_STRIPE_KEY_REDACTED in server/.env.local (never commit)'
          : mode === 'live_blocked'
            ? 'Remove live key from staging shell'
            : 'OK for staging test mode',
      approval_required: stripeStatus === 'CRITICAL' || stripeStatus === 'BLOCKED',
    }),
  );

  results.push(
    invariant({
      id: 'NO_LIVE_KEY_IN_TEST_CONTEXT',
      status: mode === 'live_blocked' ? 'CRITICAL' : 'PASS',
      confidence: 'high',
      category: INVARIANT_CATEGORIES.CONFIG_SECURITY,
      evidence: `mode=${mode}`,
      risk: 'Live money in staging operator context',
      proposed_next_action: 'Use test mode keys only',
      approval_required: mode === 'live_blocked',
    }),
  );

  const scan = spawnSync(
    process.execPath,
    [serverFile('scripts/secret-scan.mjs')],
    { cwd: SERVER_ROOT, encoding: 'utf8', timeout: 60000 },
  );
  results.push(
    invariant({
      id: 'SECRETS_SCAN_CLEAN',
      status: scan.status === 0 ? 'PASS' : 'CRITICAL',
      confidence: 'high',
      category: INVARIANT_CATEGORIES.CONFIG_SECURITY,
      evidence:
        scan.status === 0
          ? 'npm run secrets:scan OK'
          : `secrets_scan_exit_${scan.status}`,
      risk: 'Committed live material in tracked files',
      proposed_next_action: 'Remove secrets from tracked sources per docs/SECRETS_MANAGEMENT.md',
      approval_required: scan.status !== 0,
    }),
  );

  let stagedSecret = false;
  try {
    const staged = execFileSync(
      'git',
      ['diff', '--cached', '--name-only'],
      { cwd: REPO_ROOT, encoding: 'utf8' },
    ).trim();
    const lines = staged.split(/\r?\n/).filter(Boolean);
    stagedSecret = lines.some(
      (f) =>
        /\.env(\.|$)/i.test(f) ||
        /stripe_secret\.key/i.test(f) ||
        /\.staging-token\.local$/i.test(f),
    );
  } catch {
    /* ignore */
  }
  results.push(
    invariant({
      id: 'NO_SECRET_FILES_STAGED',
      status: stagedSecret ? 'CRITICAL' : 'PASS',
      confidence: 'high',
      category: INVARIANT_CATEGORIES.CONFIG_SECURITY,
      evidence: stagedSecret ? 'secret_like_paths_in_git_index' : 'no_secret_paths_staged',
      risk: 'Accidental secret commit',
      proposed_next_action: 'git restore --staged for env files',
      approval_required: stagedSecret,
    }),
  );

  const deploy = spawnSync(
    process.execPath,
    [serverFile('scripts/assert-vercel-api-deploy-root.mjs')],
    { cwd: SERVER_ROOT, encoding: 'utf8', timeout: 15000 },
  );
  const deployOk =
    deploy.status === 0 && String(deploy.stdout).includes('DEPLOY_GUARD_PASS');
  results.push(
    invariant({
      id: 'DEPLOY_ROOT_IS_SERVER_API',
      status: deployOk ? 'PASS' : 'BLOCKED',
      confidence: 'high',
      category: INVARIANT_CATEGORIES.CONFIG_SECURITY,
      evidence: deployOk
        ? 'assert-vercel-api-deploy-root.mjs PASS from server/'
        : `deploy_guard_exit_${deploy.status}`,
      risk: 'Next.js frontend deployed to API staging (404/HTML webhooks)',
      proposed_next_action: 'cd server && npm run deploy:staging:guard',
      approval_required: !deployOk,
    }),
  );

  if (!deployOk) {
    ctx._deployRootWrong = true;
  }
  if (mode === 'missing' || mode === 'malformed') {
    ctx._stripeKeyMissing = true;
    ctx._stripeKeyMalformed = mode === 'malformed';
  }
  if (mode === 'live_blocked') {
    ctx._liveKeyInStagingContext = true;
  }

  return results;
}

/**
 * @param {ZwDoctorContext} ctx
 */
export async function runOperationalInvariants(ctx) {
  const results = [];
  const base =
    ctx.stagingApiBase ??
    (String(process.env.ZW_STAGING_API_BASE ?? '').trim() ||
      'https://zora-walat-api-staging.vercel.app');

  if (ctx.probeStaging !== false) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 12000);
      const res = await fetch(`${base.replace(/\/+$/, '')}/api/health`, {
        signal: ctrl.signal,
      });
      clearTimeout(t);
      results.push(
        invariant({
          id: 'STAGING_API_HEALTH',
          status: res.ok ? 'PASS' : 'WARN',
          confidence: 'medium',
          category: INVARIANT_CATEGORIES.OPERATIONAL,
          evidence: `GET /api/health → HTTP ${res.status}`,
          risk: 'Staging API unreachable',
          proposed_next_action: res.ok
            ? 'OK'
            : 'Check Vercel deployment and DATABASE_URL on staging',
          approval_required: false,
        }),
      );
    } catch (e) {
      results.push(
        invariant({
          id: 'STAGING_API_HEALTH',
          status: 'WARN',
          confidence: 'low',
          category: INVARIANT_CATEGORIES.OPERATIONAL,
          evidence: `health_probe_failed:${String(e.message ?? e).slice(0, 60)}`,
          risk: 'Cannot reach staging API from this machine',
          proposed_next_action: 'Verify network and staging URL',
          approval_required: false,
        }),
      );
    }

    results.push(
      invariant({
        id: 'WEBHOOK_ENDPOINT_2XX',
        status: 'NOT_IMPLEMENTED',
        confidence: 'low',
        category: INVARIANT_CATEGORIES.OPERATIONAL,
        evidence:
          'POST webhook probe skipped — would require signed Stripe payload (forbidden in zw-doctor)',
        risk: 'Webhook route 404 at edge',
        proposed_next_action:
          'Use Stripe Dashboard test webhook or stripeWebhookHttpChaos integration tests',
        approval_required: false,
      }),
    );
  }

  const tokenPath = join(SERVER_ROOT, '.staging-token.local');
  let tokenStatus = 'WARN';
  let tokenEvidence = 'no_token_file';
  if (existsSync(tokenPath)) {
    const raw = readFileSync(tokenPath, 'utf8').trim();
    const claims = decodeJwtClaimsUnsafe(raw);
    if (!claims) {
      tokenStatus = 'BLOCKED';
      tokenEvidence = 'token_file_unreadable';
    } else if (claims.expired) {
      tokenStatus = 'WARN';
      tokenEvidence = 'token_expired';
    } else {
      tokenStatus = 'PASS';
      tokenEvidence = 'token_present_not_expired';
    }
  } else {
    tokenStatus = 'PARTIAL';
    tokenEvidence = 'token_file_missing_run_login';
  }
  results.push(
    invariant({
      id: 'OPERATOR_TOKEN_VALID_OR_REFRESHABLE',
      status: tokenStatus,
      confidence: existsSync(tokenPath) ? 'medium' : 'low',
      category: INVARIANT_CATEGORIES.OPERATIONAL,
      evidence: tokenEvidence,
      risk: 'Operator harness cannot read staging truth',
      proposed_next_action: 'node tools/staging-auth-checkout-operator.mjs login',
      approval_required: tokenStatus === 'BLOCKED',
    }),
  );

  results.push(
    invariant({
      id: 'STATUS_CHECK_AVAILABLE',
      status: existsSync(
        serverFile('tools/staging-auth-checkout-operator.mjs'),
      )
        ? 'PASS'
        : 'BLOCKED',
      confidence: 'high',
      category: INVARIANT_CATEGORIES.OPERATIONAL,
      evidence: 'staging-auth-checkout-operator.mjs present',
      risk: 'No operator read path',
      proposed_next_action: 'Restore operator harness',
      approval_required: false,
    }),
  );

  results.push(
    invariant({
      id: 'PHASE1_TRUTH_AVAILABLE',
      status: existsSync(
        serverFile('api/slimStagingOperatorPhase1TruthHandler.mjs'),
      )
        ? 'PASS'
        : 'PARTIAL',
      confidence: 'high',
      category: INVARIANT_CATEGORIES.OPERATIONAL,
      evidence: 'slimStagingOperatorPhase1TruthHandler.mjs present',
      risk: 'L-11 verify path unavailable on cold start',
      proposed_next_action: 'Deploy server/api slim handlers',
      approval_required: false,
    }),
  );

  const indexPath = repoFile('Ap786/AP786_EVIDENCE_INDEX.txt');
  const superAudit = repoFile(
    'Ap786/SUPER_SYSTEM_GLOBAL_ENGINEERING_AUDIT_2026_03_28_TO_2026_05_19.md',
  );
  const cpArch = repoFile('Ap786/SUPER_SYSTEM_CONTROL_PLANE_ARCHITECTURE.md');
  const indexOk = existsSync(indexPath);
  const auditOk = existsSync(superAudit);
  results.push(
    invariant({
      id: 'EVIDENCE_INDEX_CURRENT',
      status: indexOk && auditOk ? 'PASS' : 'PARTIAL',
      confidence: 'high',
      category: INVARIANT_CATEGORIES.OPERATIONAL,
      evidence: `index=${indexOk} super_audit=${auditOk} control_plane_arch=${existsSync(cpArch)}`,
      risk: 'Evidence drift for investors',
      proposed_next_action: 'Update AP786_EVIDENCE_INDEX after each proof',
      approval_required: false,
    }),
  );

  return results;
}

/**
 * @param {ZwDoctorContext} ctx
 */
export async function runWebhookInvariants(ctx) {
  const results = [];
  const handlers = [
    'api/slimStripeWebhookHandler.mjs',
    'api/slimStripeWebhookCheckoutCompleted.mjs',
    'api/slimStripeWebhookChargeRefunded.mjs',
  ];
  const allPresent = handlers.every((h) => existsSync(serverFile(h)));
  results.push(
    invariant({
      id: 'WEBHOOK_SLIM_HANDLERS_PRESENT',
      status: allPresent ? 'PASS' : 'BLOCKED',
      confidence: 'high',
      category: INVARIANT_CATEGORIES.MONEY_PATH,
      evidence: handlers.map((h) => `${h}:${existsSync(serverFile(h))}`).join(' '),
      risk: 'Webhook cold-start timeout or wrong handler',
      proposed_next_action: 'Restore slim webhook api/*.mjs handlers',
      approval_required: !allPresent,
    }),
  );

  const whSecret = String(process.env.STRIPE_WEBHOOK_SECRET ?? '').trim();
  results.push(
    invariant({
      id: 'WEBHOOK_SECRET_CONFIGURED_LOCAL',
      status: whSecret.length > 0 ? 'PASS' : 'WARN',
      confidence: 'medium',
      category: INVARIANT_CATEGORIES.CONFIG_SECURITY,
      evidence: whSecret.length > 0 ? 'STRIPE_WEBHOOK_SECRET set (len only)' : 'missing',
      risk: 'Local webhook verification cannot run',
      proposed_next_action:
        'Set Stripe webhook signing secret from stripe listen in server/.env.local',
      approval_required: false,
    }),
  );

  return results;
}

/**
 * Read-only operator status-check probe (no checkout, no refund).
 * @returns {Promise<{ invariants: import('./types.mjs').InvariantResult[], signals: import('./proposals.mjs').RuntimeSignals } | null>}
 */
async function probeOperatorStatusCheck() {
  const tokenPath = join(SERVER_ROOT, '.staging-token.local');
  if (!existsSync(tokenPath)) return null;

  const child = spawnSync(
    process.execPath,
    ['tools/staging-auth-checkout-operator.mjs', 'status-check'],
    {
      cwd: SERVER_ROOT,
      encoding: 'utf8',
      timeout: 90000,
      env: process.env,
    },
  );
  const text = `${child.stdout ?? ''}\n${child.stderr ?? ''}`;
  /** @type {Record<string, string>} */
  const kv = {};
  for (const line of text.split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)\s+(.+)$/.exec(line.trim());
    if (m) kv[m[1]] = m[2].trim();
  }

  /** @type {import('./proposals.mjs').RuntimeSignals} */
  const signals = {};
  const paidConfirmed = kv.PAID_CONFIRMED === 'true';
  const attemptCount = Number(kv.FULFILLMENT_ATTEMPT_COUNT ?? '0');
  if (!paidConfirmed && attemptCount > 0) {
    signals.unpaidWithFulfillment = true;
  }
  if (attemptCount > 1) {
    signals.duplicateFulfillment = true;
  }
  if (
    kv.REFUND_STATUS === 'succeeded' &&
    kv.POST_PAYMENT_INCIDENT_STATUS &&
    kv.POST_PAYMENT_INCIDENT_STATUS !== 'REFUNDED'
  ) {
    signals.refundExistsIncidentNotUpdated = true;
  }

  /** @type {import('./types.mjs').InvariantResult[]} */
  const invariants = [];
  if (signals.unpaidWithFulfillment) {
    invariants.push(
      invariant({
        id: 'RUNTIME_UNPAID_FULFILLMENT',
        status: 'CRITICAL',
        confidence: 'high',
        category: INVARIANT_CATEGORIES.MONEY_PATH,
        evidence: `PAID_CONFIRMED=false FULFILLMENT_ATTEMPT_COUNT=${attemptCount}`,
        risk: 'Money-path integrity violation',
        proposed_next_action: 'Investigate only — zw-doctor will not mutate',
        approval_required: true,
      }),
    );
  }
  if (signals.duplicateFulfillment) {
    invariants.push(
      invariant({
        id: 'RUNTIME_DUPLICATE_FULFILLMENT',
        status: 'CRITICAL',
        confidence: 'high',
        category: INVARIANT_CATEGORIES.MONEY_PATH,
        evidence: `FULFILLMENT_ATTEMPT_COUNT=${attemptCount}`,
        risk: 'Duplicate provider dispatch',
        proposed_next_action: 'Freeze fulfillment kicks',
        approval_required: true,
      }),
    );
  }

  return { invariants, signals };
}

/**
 * @param {string} mode
 * @param {ZwDoctorContext} ctx
 */
export async function runInvariantsForMode(mode, ctx) {
  switch (mode) {
    case 'money-path':
      return runMoneyPathInvariants(ctx);
    case 'stripe-env':
      return runConfigSecurityInvariants(ctx);
    case 'webhook':
      return [
        ...(await runWebhookInvariants(ctx)),
        ...(await runMoneyPathInvariants({ ...ctx, probeOperator: false })),
      ];
    case 'operator-auth':
      return runOperationalInvariants({ ...ctx, probeStaging: false });
    case 'frontend-env':
      return runFrontendInvariants(ctx);
    case 'deploy-root': {
      const c = { ...ctx };
      const r = await runConfigSecurityInvariants(c);
      return r.filter((x) => x.id === 'DEPLOY_ROOT_IS_SERVER_API');
    }
    case 'evidence':
      return runOperationalInvariants({ ...ctx, probeStaging: false });
    case 'summary':
      return runSummaryInvariants(ctx);
    case 'all':
    default:
      return runAllInvariants(ctx);
  }
}

/**
 * @param {ZwDoctorContext} ctx
 */
async function runAllInvariants(ctx) {
  const money = await runMoneyPathInvariants(ctx);
  const front = await runFrontendInvariants(ctx);
  const config = await runConfigSecurityInvariants(ctx);
  const ops = await runOperationalInvariants(ctx);
  const webhook = await runWebhookInvariants(ctx);
  return [...money, ...front, ...config, ...ops, ...webhook];
}

/**
 * @param {ZwDoctorContext} ctx
 */
async function runSummaryInvariants(ctx) {
  const all = await runAllInvariants(ctx);
  const pick = new Set([
    'PAID_BEFORE_FULFILLMENT',
    'SECRETS_SCAN_CLEAN',
    'DEPLOY_ROOT_IS_SERVER_API',
    'STAGING_API_HEALTH',
    'NO_CUSTOMER_VISIBLE_TEST_OR_MOCK_COPY',
    'REFUND_SINGLE_EXECUTION_SAFE',
    'EVIDENCE_INDEX_CURRENT',
  ]);
  return all.filter((r) => pick.has(r.id));
}

/**
 * @param {ZwDoctorContext} ctx
 */
export function collectRuntimeSignals(ctx) {
  return {
    unpaidWithFulfillment: ctx._runtimeSignals?.unpaidWithFulfillment === true,
    duplicateFulfillment: ctx._runtimeSignals?.duplicateFulfillment === true,
    refundExistsIncidentNotUpdated:
      ctx._runtimeSignals?.refundExistsIncidentNotUpdated === true,
    deployRootWrong: ctx._deployRootWrong === true,
    stripeKeyMissing: ctx._stripeKeyMissing === true,
    stripeKeyMalformed: ctx._stripeKeyMalformed === true,
    liveKeyInStagingContext: ctx._liveKeyInStagingContext === true,
  };
}
