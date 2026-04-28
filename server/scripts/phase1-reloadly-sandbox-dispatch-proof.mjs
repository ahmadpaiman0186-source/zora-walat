/**
 * Phase 1 (PaymentCheckout) Reloadly **sandbox** dispatch proof — real POST via same path as the worker.
 *
 * Uses `processFulfillmentForOrder` → `executeDelivery` → `fulfillReloadlyDelivery` with `zwr_{attemptId}` identity.
 *
 * Usage:
 *   npm run proof:phase1:reloadly:sandbox -- --checkout=<PaymentCheckout.id> --dry-run
 *   npm run proof:phase1:reloadly:sandbox -- --checkout=<PaymentCheckout.id> --execute
 *   (or invoke the .mjs path directly with the same flags)
 *
 * `--execute` performs **at most one** provider call when a QUEUED attempt exists (atomic claim inside
 * `processFulfillmentForOrder`). Safe replay: second run no-ops if no QUEUED attempt.
 *
 * Exit: 0 dry-run ok or execute ok; 1 bad args / exception; 2 preflight blockers.
 */
import '../bootstrap.js';

import { FULFILLMENT_ATTEMPT_STATUS } from '../src/constants/fulfillmentAttemptStatus.js';
import { prisma } from '../src/db.js';
import {
  buildPhase1ProviderIdentityBundle,
} from '../src/lib/providerExecutionCorrelation.js';
import {
  collectPhase1ReloadlySandboxBlockers,
  getPhase1ReloadlySandboxEnvGate,
  phase1SandboxDispatchNextAction,
} from '../src/lib/phase1ReloadlySandboxPreflight.js';
import { processFulfillmentForOrder } from '../src/services/fulfillmentProcessingService.js';

const checkoutArg = process.argv.find((a) => a.startsWith('--checkout='))?.slice('--checkout='.length);
const dryRun = process.argv.includes('--dry-run');
const execute = process.argv.includes('--execute');

if (!checkoutArg?.trim() || (!dryRun && !execute)) {
  console.error(
    [
      'Usage:',
      '  npm run proof:phase1:reloadly:sandbox -- --checkout=<PaymentCheckout.id> (--dry-run | --execute)',
      '  node scripts/phase1-reloadly-sandbox-dispatch-proof.mjs --checkout=<PaymentCheckout.id> (--dry-run | --execute)',
      '',
      'Requires: PaymentCheckout exists; orderStatus=PAID; a QUEUED FulfillmentAttempt (create via normal checkout + webhook flow).',
      'Does not require STRIPE_WEBHOOK_SECRET for this script, but bootstrap still validates webhook env when importing the server stack.',
    ].join('\n'),
  );
  process.exit(1);
}

if (dryRun && execute) {
  console.error('Use either --dry-run or --execute, not both.');
  process.exit(1);
}

const checkoutId = checkoutArg.trim();

const order = await prisma.paymentCheckout.findUnique({
  where: { id: checkoutId },
});
const queuedAttempt = await prisma.fulfillmentAttempt.findFirst({
  where: {
    orderId: checkoutId,
    status: FULFILLMENT_ATTEMPT_STATUS.QUEUED,
  },
  orderBy: { attemptNumber: 'asc' },
});
const latestAttempt = await prisma.fulfillmentAttempt.findFirst({
  where: { orderId: checkoutId },
  orderBy: { attemptNumber: 'desc' },
});

const gate = getPhase1ReloadlySandboxEnvGate();
const blockers = collectPhase1ReloadlySandboxBlockers(order, queuedAttempt);
const ready = blockers.length === 0;

const identity =
  order && latestAttempt?.id
    ? buildPhase1ProviderIdentityBundle(order.id, latestAttempt.id)
    : null;

const report = {
  script: 'phase1-reloadly-sandbox-dispatch-proof',
  checkoutIdSuffix: checkoutId.slice(-12),
  envGate: gate,
  preflightReady: ready,
  blockers,
  blockersCount: blockers.length,
  reloadlyProofMaturityClass: !ready
    ? 'preflight_blocked'
    : dryRun
      ? 'preflight_passed_dry_run'
      : 'preflight_passed_execute_mode',
  nextAction: phase1SandboxDispatchNextAction(ready),
  queuedAttemptIdSuffix: queuedAttempt?.id ? String(queuedAttempt.id).slice(-12) : null,
  latestAttemptStatus: latestAttempt?.status ?? null,
  phase1ProviderIdentity: identity,
  mode: dryRun ? 'dry_run' : 'execute',
};

console.log(JSON.stringify({ phase1ReloadlySandboxProof: true, ...report }, null, 2));

if (!ready) {
  console.error('\nNO-GO: fix blockers before --execute.\n');
  await prisma.$disconnect().catch(() => {});
  process.exit(2);
}

if (dryRun) {
  console.error(
    '\nDRY-RUN OK: preflight passed. To issue one real Reloadly sandbox POST (same as worker), run with --execute.\n',
  );
  await prisma.$disconnect().catch(() => {});
  process.exit(0);
}

/** Live: single worker-equivalent dispatch */
console.error('\nEXECUTE: calling processFulfillmentForOrder once…\n');
try {
  await processFulfillmentForOrder(checkoutId, {
    traceId: `phase1-sandbox-proof-${Date.now()}`,
    bullmqAttemptsMade: 0,
  });
} catch (e) {
  console.error(
    JSON.stringify({
      event: 'phase1_sandbox_proof_execute_failed',
      message: String(e?.message ?? e).slice(0, 400),
    }),
  );
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
}

const after = await prisma.fulfillmentAttempt.findFirst({
  where: { orderId: checkoutId },
  orderBy: { attemptNumber: 'desc' },
});
const orderAfter = await prisma.paymentCheckout.findUnique({
  where: { id: checkoutId },
  select: { orderStatus: true },
});

const safeSummary = (() => {
  if (!after?.requestSummary) return null;
  try {
    const o = JSON.parse(String(after.requestSummary));
    if (o && typeof o === 'object') {
      return {
        mode: o.mode ?? null,
        reloadlyCustomIdentifier: o.reloadlyCustomIdentifier ?? o.providerRequestKey ?? null,
        providerExecutionCorrelationId: o.providerExecutionCorrelationId ?? null,
        phase1ReloadlyCustomIdentifierSource: o.phase1ReloadlyCustomIdentifierSource ?? null,
      };
    }
  } catch {
    return { parseError: true };
  }
  return null;
})();

const DUPLICATE_PROBE_NOTE =
  'When latest attempt is SUCCEEDED or FAILED, a second processFulfillmentForOrder should not claim a new QUEUED row or re-issue the same Reloadly POST for that attempt. Concurrent duplicate workers are covered by integration transactionFortressConcurrency.';

/** Second invoke only when attempt reached a terminal row state (avoids double I/O while PROCESSING). */
let duplicateDispatchProbe = {
  secondProcessFulfillmentForOrderInvoked: false,
  skippedReason: 'attempt_not_terminal_for_safe_probe',
  note: DUPLICATE_PROBE_NOTE,
};
const attemptTerminalForProbe =
  after?.status === FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED ||
  after?.status === FULFILLMENT_ATTEMPT_STATUS.FAILED;
if (attemptTerminalForProbe && after?.id) {
  const attemptIdBefore = String(after.id);
  console.error(
    '\nDUPLICATE-SAFETY: second processFulfillmentForOrder (expect no new attempt id / no provider re-post for same attempt)…\n',
  );
  let secondInvokeThrew = false;
  let secondInvokeError = null;
  try {
    await processFulfillmentForOrder(checkoutId, {
      traceId: `phase1-sandbox-proof-replay-${Date.now()}`,
      bullmqAttemptsMade: 0,
    });
  } catch (e) {
    secondInvokeThrew = true;
    secondInvokeError = String(e?.message ?? e).slice(0, 200);
  }
  const afterProbe = await prisma.fulfillmentAttempt.findFirst({
    where: { orderId: checkoutId },
    orderBy: { attemptNumber: 'desc' },
  });
  duplicateDispatchProbe = {
    secondProcessFulfillmentForOrderInvoked: true,
    secondInvokeThrew,
    ...(secondInvokeError ? { secondInvokeError } : {}),
    latestFulfillmentAttemptIdStable: String(afterProbe?.id ?? '') === attemptIdBefore,
    latestAttemptStatusAfterProbe: afterProbe?.status ?? null,
    attemptCountAfterProbe: await prisma.fulfillmentAttempt.count({ where: { orderId: checkoutId } }),
    note: DUPLICATE_PROBE_NOTE,
  };
}

console.log(
  JSON.stringify(
    {
      phase1ReloadlySandboxProofResult: true,
      orderStatusAfter: orderAfter?.orderStatus ?? null,
      latestAttemptStatus: after?.status ?? null,
      providerReference: after?.providerReference ?? null,
      provider: after?.provider ?? null,
      requestSummarySafe: safeSummary,
      duplicateDispatchProbe,
      evidenceNote:
        'Compare reloadlyCustomIdentifier to Reloadly sandbox dashboard / reports; inquiry uses the same key.',
    },
    null,
    2,
  ),
);

await prisma.$disconnect().catch(() => {});
process.exit(0);
