/**
 * Controlled first Reloadly **sandbox** dispatch exercise (AF airtime only).
 *
 * Usage:
 *   node scripts/webtopup-sandbox-dispatch-exercise.mjs --order=tw_ord_... --dry-run
 *   node scripts/webtopup-sandbox-dispatch-exercise.mjs --order=tw_ord_...
 *
 * Exit codes: 0 success, 1 bad args or dispatch exception, 2 preflight NO-GO.
 * Refuses live dispatch when WEBTOPUP_FULFILLMENT_PROVIDER≠reloadly, RELOADLY_SANDBOX≠true, or preflight fails.
 * Requires DATABASE_URL (and order row in DB for live / dry-run with real id).
 */
import '../bootstrap.js';

import {
  buildSandboxPostDispatchSummary,
  planSandboxDispatchExercise,
  runReloadlySandboxDispatchPreflight,
} from '../src/services/topupFulfillment/webTopupSandboxPreflight.js';
import {
  dispatchWebTopupFulfillment,
  getWebTopupFulfillmentDiagnostics,
} from '../src/services/topupFulfillment/webTopupFulfillmentService.js';
import { prisma } from '../src/db.js';

const orderArg = process.argv.find((a) => a.startsWith('--order='))?.slice(
  '--order='.length,
);
const dryRun = process.argv.includes('--dry-run');

if (!orderArg?.trim()) {
  console.error(
    'Usage: node scripts/webtopup-sandbox-dispatch-exercise.mjs --order=tw_ord_... [--dry-run]',
  );
  process.exit(1);
}

/** Structured stderr logger compatible with `webTopupLog` / pino-style (obj, msg). */
const scriptLog = {
  info(o, _msg) {
    console.error(JSON.stringify({ level: 'info', ...o }));
  },
  warn(o, _msg) {
    console.error(JSON.stringify({ level: 'warn', ...o }));
  },
  error(o, _msg) {
    console.error(JSON.stringify({ level: 'error', ...o }));
  },
};

function printSection(title, body) {
  console.log(`\n=== ${title} ===\n`);
  if (typeof body === 'string') console.log(body);
  else console.log(JSON.stringify(body, null, 2));
}

const preflight = await runReloadlySandboxDispatchPreflight(orderArg.trim());

printSection('PRE-FLIGHT', {
  ready: preflight.ready,
  orderIdSuffix: preflight.orderIdSuffix,
  blockers: preflight.blockers,
  warnings: preflight.warnings,
  nextAction: preflight.nextAction,
  sandbox: preflight.sandbox,
});

const plan = planSandboxDispatchExercise(preflight, dryRun);
printSection('EXECUTION PLAN', plan);

if (!preflight.ready) {
  console.log('\nNO-GO: preflight failed — fix blockers before any live dispatch.\n');
  await prisma.$disconnect().catch(() => {});
  process.exit(2);
}

if (dryRun) {
  printSection('DRY-RUN COMPLETE', {
    message:
      'Preflight passed. No dispatch was executed. Remove --dry-run to perform exactly one live sandbox dispatch.',
  });
  await prisma.$disconnect().catch(() => {});
  process.exit(0);
}

printSection('LIVE DISPATCH', { message: 'Calling dispatchWebTopupFulfillment once…' });

let diag;
try {
  diag = await dispatchWebTopupFulfillment(orderArg.trim(), scriptLog);
} catch (e) {
  const err = /** @type {{ code?: string; message?: string }} */ (e);
  console.error(
    JSON.stringify({
      event: 'sandbox_dispatch_exercise_failed',
      code: err.code,
      message: err.message,
    }),
  );
  const after = await getWebTopupFulfillmentDiagnostics(orderArg.trim(), scriptLog, {
    emitLog: false,
    includeRunbook: true,
  });
  if (after.ok) {
    printSection('POST-DISPATCH (after error)', buildSandboxPostDispatchSummary(after));
  }
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
}

printSection('DISPATCH RESULT (safe fields)', {
  orderIdSuffix: diag.orderIdSuffix,
  paymentStatus: diag.paymentStatus,
  fulfillmentStatus: diag.fulfillmentStatus,
  fulfillmentReferenceSuffix: diag.fulfillmentReferenceSuffix,
  fulfillmentErrorCode: diag.fulfillmentErrorCode,
  summary: diag.summary,
});

printSection('POST-DISPATCH VERIFICATION', buildSandboxPostDispatchSummary(diag));

console.log(
  `\nGO: exercise completed — confirm outcome in Reloadly sandbox and order diagnostics.\n`,
);

await prisma.$disconnect().catch(() => {});
process.exit(0);
