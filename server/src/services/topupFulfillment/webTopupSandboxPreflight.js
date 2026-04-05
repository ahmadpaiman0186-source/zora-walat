/**
 * Strict preflight + post-dispatch summaries for the first controlled Reloadly **sandbox**
 * dispatch (AF airtime only). No secrets in outputs.
 */
import { env } from '../../config/env.js';
import { FULFILLMENT_STATUS } from '../../domain/topupOrder/statuses.js';
import { prisma } from '../../db.js';
import { isReloadlyConfigured } from '../reloadlyClient.js';
import { isValidTopupOrderId } from '../topupOrder/topupOrderService.js';
import { assertEligibleForInitialDispatch } from './fulfillmentEligibility.js';
import { assertProviderMatchesWebTopupScope } from './webTopupFulfillmentScope.js';
import {
  buildFulfillmentRunbookForOrder,
  buildSandboxProviderReadiness,
  evaluateOperatorMappingForReloadlyWebOrder,
} from './webTopupFulfillmentRunbook.js';

/** @typedef {{ webTopupFulfillmentProvider: string; reloadlySandbox: boolean; reloadlyCredentialsConfigured: boolean }} SandboxExerciseGate */

/**
 * Current process env as an operator exercise gate (Reloadly sandbox dispatch only).
 * @returns {SandboxExerciseGate}
 */
export function getReloadlySandboxExerciseGate() {
  const webTopupFulfillmentProvider = String(
    env.webTopupFulfillmentProvider ?? 'mock',
  )
    .trim()
    .toLowerCase();
  return {
    webTopupFulfillmentProvider,
    reloadlySandbox: env.reloadlySandbox === true,
    reloadlyCredentialsConfigured: isReloadlyConfigured(),
  };
}

/**
 * @param {SandboxExerciseGate} gate
 * @param {string} orderId
 * @returns {string[]}
 */
function collectGateBlockers(gate, orderId) {
  /** @type {string[]} */
  const out = [];
  if (gate.webTopupFulfillmentProvider !== 'reloadly') {
    out.push(
      `[environment] WEBTOPUP_FULFILLMENT_PROVIDER must be "reloadly" for this exercise (currently "${gate.webTopupFulfillmentProvider}").`,
    );
  }
  if (!gate.reloadlySandbox) {
    out.push(
      '[environment] RELOADLY_SANDBOX must be exactly "true" — refuse to run a labeled sandbox exercise against non-sandbox config.',
    );
  }
  if (!gate.reloadlyCredentialsConfigured) {
    out.push(
      '[environment] Reloadly credentials are not configured (RELOADLY_CLIENT_ID / RELOADLY_CLIENT_SECRET).',
    );
  }
  if (!isValidTopupOrderId(orderId)) {
    out.push('[order] Order id format is invalid for web top-up orders.');
  }
  return out;
}

/**
 * Core preflight: gate + order row. Reuses runbook builders when `row` is present.
 *
 * @param {import('@prisma/client').WebTopupOrder | null} row
 * @param {SandboxExerciseGate} gate
 * @param {string} orderId
 * @returns {{
 *   version: number;
 *   kind: 'reloadly_sandbox_first_dispatch_preflight';
 *   ready: boolean;
 *   blockers: string[];
 *   warnings: string[];
 *   nextAction: string;
 *   orderIdSuffix: string | null;
 *   sandbox: ReturnType<typeof buildSandboxProviderReadiness>;
 *   runbook: ReturnType<typeof buildFulfillmentRunbookForOrder> | null;
 * }}
 */
export function buildReloadlySandboxDispatchPreflight(row, gate, orderId) {
  const sandbox = buildSandboxProviderReadiness();
  const orderIdSuffix = isValidTopupOrderId(orderId) ? orderId.slice(-8) : null;

  const blockers = [...collectGateBlockers(gate, orderId)];
  /** @type {string[]} */
  const warnings = [];

  /** @type {ReturnType<typeof buildFulfillmentRunbookForOrder> | null} */
  let runbook = null;

  if (blockers.length) {
    return finalizePreflight({
      blockers,
      warnings,
      sandbox,
      orderIdSuffix,
      runbook: null,
    });
  }

  if (!row) {
    blockers.push('[order] Order was not found in the database.');
    return finalizePreflight({
      blockers,
      warnings,
      sandbox,
      orderIdSuffix,
      runbook: null,
    });
  }

  runbook = buildFulfillmentRunbookForOrder(row);

  const el = assertEligibleForInitialDispatch(row);
  if (!el.ok) {
    if (el.code === 'not_paid') {
      blockers.push(
        `[order] paymentStatus must be "paid" for dispatch (currently "${row.paymentStatus}").`,
      );
    } else {
      blockers.push(
        `[order] First-dispatch exercise requires fulfillmentStatus=pending (currently "${row.fulfillmentStatus}"). For retryable failures use the admin retry path, not this preflight.`,
      );
    }
  }

  const scope = assertProviderMatchesWebTopupScope('reloadly', row);
  if (!scope.ok) {
    blockers.push(
      `[route] Reloadly web rollout allows AF + airtime only (scope: ${scope.code ?? 'out_of_scope'}).`,
    );
  }

  if (scope.ok) {
    const om = evaluateOperatorMappingForReloadlyWebOrder(row);
    if (!om.ready) {
      blockers.push(
        `[mapping] Operator mapping is not ready: ${om.explanation || om.status}`,
      );
    }
  }

  if (
    typeof row.fulfillmentAttemptCount === 'number' &&
    row.fulfillmentAttemptCount > 0
  ) {
    warnings.push(
      `This order already has fulfillmentAttemptCount=${row.fulfillmentAttemptCount}; confirm this is intentional before the first sandbox exercise.`,
    );
  }

  return finalizePreflight({
    blockers,
    warnings,
    sandbox,
    orderIdSuffix,
    runbook,
  });
}

/**
 * @param {{
 *   blockers: string[];
 *   warnings: string[];
 *   sandbox: ReturnType<typeof buildSandboxProviderReadiness>;
 *   orderIdSuffix: string | null;
 *   runbook: ReturnType<typeof buildFulfillmentRunbookForOrder> | null;
 * }}
 */
function finalizePreflight({ blockers, warnings, sandbox, orderIdSuffix, runbook }) {
  const ready = blockers.length === 0;
  let nextAction = ready
    ? 'Preflight passed. Execute one admin dispatch (or run the sandbox dispatch exercise script without --dry-run).'
    : blockers[0];

  if (!ready && runbook?.dispatch?.suggestedNextSteps?.length) {
    const hint = runbook.dispatch.suggestedNextSteps[0];
    if (hint && !nextAction.includes(hint.slice(0, 20))) {
      nextAction = `${nextAction} Suggested: ${hint}`;
    }
  }

  return {
    version: 1,
    kind: 'reloadly_sandbox_first_dispatch_preflight',
    ready,
    blockers,
    warnings,
    nextAction,
    orderIdSuffix,
    sandbox,
    runbook,
  };
}

/**
 * Load order and run Reloadly sandbox first-dispatch preflight.
 * @param {string} orderId
 */
export async function runReloadlySandboxDispatchPreflight(orderId) {
  const gate = getReloadlySandboxExerciseGate();
  const early = collectGateBlockers(gate, orderId);
  if (early.length) {
    return buildReloadlySandboxDispatchPreflight(null, gate, orderId);
  }
  const row = await prisma.webTopupOrder.findUnique({ where: { id: orderId } });
  return buildReloadlySandboxDispatchPreflight(row ?? null, gate, orderId);
}

/**
 * Safe summary after a dispatch attempt (pass diagnostics from `getWebTopupFulfillmentDiagnostics`).
 * @param {{ ok?: boolean; [k: string]: unknown }} diag
 */
export function buildSandboxPostDispatchSummary(diag) {
  if (!diag || diag.ok !== true) {
    return {
      ok: false,
      fulfillmentStatus: null,
      fulfillmentReferenceSuffix: null,
      retryEligible: null,
      fulfillmentErrorCode: null,
      fulfillmentErrorMessageSafe: null,
      recommendedNextAction:
        'Verify the order id and call GET /api/admin/web-topup-order/:id/fulfillment/diagnostics.',
    };
  }

  const rb = /** @type {{ retry?: { eligible?: boolean; suggestedNextSteps?: string[] } } | undefined} */ (
    diag.runbook
  );

  let recommendedNextAction =
    'Review diagnostics.runbook and fulfillment fields for this order.';

  const fs = String(diag.fulfillmentStatus ?? '');
  if (fs === FULFILLMENT_STATUS.DELIVERED) {
    recommendedNextAction =
      'Fulfillment shows delivered; reconcile in Reloadly sandbox dashboard and archive exercise notes.';
  } else if (fs === FULFILLMENT_STATUS.FAILED && rb?.retry?.eligible) {
    recommendedNextAction =
      'Retryable failure: use POST .../fulfillment/retry after confirming the issue was transient.';
  } else if (fs === FULFILLMENT_STATUS.FAILED) {
    recommendedNextAction =
      rb?.retry?.suggestedNextSteps?.[0] ??
      'Terminal or non-retryable failure — investigate provider message; may require a new order.';
  } else if (
    fs === FULFILLMENT_STATUS.QUEUED ||
    fs === FULFILLMENT_STATUS.PROCESSING
  ) {
    recommendedNextAction =
      'Fulfillment still in progress; poll diagnostics until delivered or failed.';
  }

  return {
    ok: true,
    orderIdSuffix: diag.orderIdSuffix,
    fulfillmentStatus: diag.fulfillmentStatus,
    fulfillmentReferenceSuffix: diag.fulfillmentReferenceSuffix,
    retryEligible: rb?.retry?.eligible ?? false,
    fulfillmentErrorCode: diag.fulfillmentErrorCode,
    fulfillmentErrorMessageSafe: diag.fulfillmentErrorMessageSafe,
    recommendedNextAction,
  };
}

/**
 * Explicit plan for CLI / automation (dry-run vs live).
 * @param {{ ready: boolean }} preflight
 * @param {boolean} dryRun
 */
export function planSandboxDispatchExercise(preflight, dryRun) {
  if (dryRun) {
    return {
      wouldDispatch: false,
      dryRun: true,
      explanation:
        'Dry-run: preflight only. No Reloadly HTTP call and no fulfillment state transition will be made.',
    };
  }
  if (!preflight.ready) {
    return {
      wouldDispatch: false,
      dryRun: false,
      explanation:
        'Live mode blocked: preflight is not ready — fix blockers before dispatching.',
    };
  }
  return {
    wouldDispatch: true,
    dryRun: false,
    explanation:
      'Live mode: one dispatch will be executed via the standard admin fulfillment service.',
  };
}
