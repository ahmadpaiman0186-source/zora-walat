/**
 * Executable WebTopup incident runbook: metadata + handlers calling existing services only.
 */

import { API_CONTRACT_CODE } from '../constants/apiContractCodes.js';
import { isValidTopupOrderId } from '../services/topupOrder/topupOrderService.js';
import { scanWebTopupMoneyPathReconciliation } from '../services/topupOrder/webtopupMoneyPathReconciliationEngine.js';
import { getReloadlyWebtopupDurableCircuitAdminSnapshot } from '../services/reliability/reloadlyWebtopupDurableCircuit.js';
import { getTopupProviderCircuitSnapshot } from '../services/topupFulfillment/topupProviderCircuit.js';
import {
  getWebTopupFulfillmentQueueHealthSnapshot,
  recoverStaleWebTopupFulfillmentJobs,
} from '../services/topupFulfillment/webtopFulfillmentJob.js';
import {
  adminForceDeliverWebTopupOrder,
  getWebTopupOrderAdminDetails,
  retryWebTopupFulfillment,
} from '../services/topupFulfillment/webTopupFulfillmentService.js';

/** @typedef {{ id: string; type: string; severity: 'warn'|'critical' }} IncidentShape */

/**
 * @param {IncidentShape[]} incidents
 * @returns {{ id: string; description: string; riskLevel: 'low'|'medium'|'high'; requiresConfirmation: boolean }[]}
 */
export function getSuggestedRunbookActions(incidents) {
  /** @type {Set<string>} */
  const ids = new Set();
  for (const i of incidents) {
    ids.add(i.type);
    ids.add(i.id);
  }

  /** @type {{ id: string; description: string; riskLevel: 'low'|'medium'|'high'; requiresConfirmation: boolean }[]} */
  const out = [];

  const push = (a) => {
    if (!out.some((x) => x.id === a.id)) out.push(a);
  };

  push({
    id: 'snapshot_queue_health',
    description: 'Fetch current fulfillment job + order backlog snapshot (read-only).',
    riskLevel: 'low',
    requiresConfirmation: false,
  });
  push({
    id: 'snapshot_provider_health',
    description: 'Fetch Reloadly durable circuit + in-memory provider circuit snapshots (read-only).',
    riskLevel: 'low',
    requiresConfirmation: false,
  });

  if (
    ids.has('fulfillment_stale_processing') ||
    ids.has('fulfillment_stale_queued') ||
    ids.has('fulfillment_queue') ||
    ids.has('sla_breach') ||
    incidents.some((i) => String(i.id).includes('stale'))
  ) {
    push({
      id: 'recover_stale_fulfillment_jobs',
      description:
        'Re-queue WebTopupFulfillmentJob rows stuck in processing past lease (uses recoverStaleWebTopupFulfillmentJobs).',
      riskLevel: 'medium',
      requiresConfirmation: true,
    });
  }

  if (
    ids.has('fulfillment_dead_letter') ||
    ids.has('fulfillment_failures') ||
    incidents.some((i) => String(i.id).includes('dead_letter'))
  ) {
    push({
      id: 'retry_order',
      description: 'Retry fulfillment for a specific order (honors retryable policy unless force).',
      riskLevel: 'medium',
      requiresConfirmation: false,
    });
    push({
      id: 'retry_order_force',
      description: 'Force retry even when failure code is not normally retryable — high impact.',
      riskLevel: 'high',
      requiresConfirmation: true,
    });
  }

  if (ids.has('payment_webhook_fallback') || ids.has('financial_protection')) {
    push({
      id: 'reconcile_order',
      description: 'Run money-path reconciliation for one order (read-only analysis + Stripe optional).',
      riskLevel: 'low',
      requiresConfirmation: false,
    });
  }

  push({
    id: 'inspect_order',
    description: 'Load operator-safe order details for a specific order id.',
    riskLevel: 'low',
    requiresConfirmation: false,
  });

  if (ids.has('provider_circuit') || ids.has('fulfillment_failures')) {
    push({
      id: 'force_deliver_order',
      description: 'Admin-only terminal deliver path — use only when business approves manual completion.',
      riskLevel: 'high',
      requiresConfirmation: true,
    });
  }

  return out;
}

/**
 * @param {{ incidentSignals: { incidents: IncidentShape[] } }} ctx
 */
export function buildIncidentRunbookPayload(ctx) {
  const suggestedActions = getSuggestedRunbookActions(ctx.incidentSignals.incidents);
  return {
    incidents: ctx.incidentSignals.incidents,
    suggestedActions,
  };
}

/**
 * @param {string} actionId
 * @param {{
 *   log: import('pino').Logger | undefined;
 *   orderId?: string | null;
 *   confirm?: boolean;
 *   traceId?: string;
 *   includeStripe?: boolean;
 * }} ctx
 * @returns {Promise<{ ok: boolean; actionId: string; result?: unknown; error?: string; code?: string }>}
 */
export async function executeWebtopIncidentAction(actionId, ctx) {
  const { log, orderId, confirm, traceId, includeStripe } = ctx;

  const requireOrder = () => {
    const oid = orderId && String(orderId).trim();
    if (!oid || !isValidTopupOrderId(oid)) {
      const err = new Error('orderId required and must be valid');
      err.code = API_CONTRACT_CODE.VALIDATION_ERROR;
      throw err;
    }
    return oid;
  };

  const requireConfirm = (riskLabel) => {
    if (confirm !== true) {
      const err = new Error(`${riskLabel}: pass confirm:true to execute`);
      err.code = 'confirmation_required';
      throw err;
    }
  };

  switch (actionId) {
    case 'snapshot_queue_health': {
      const snap = await getWebTopupFulfillmentQueueHealthSnapshot();
      return { ok: true, actionId, result: snap };
    }
    case 'snapshot_provider_health': {
      const durable = await getReloadlyWebtopupDurableCircuitAdminSnapshot();
      const inMem = getTopupProviderCircuitSnapshot();
      return { ok: true, actionId, result: { reloadly: { durable, inMemory: inMem.reloadly ?? null }, inMemoryAllProviders: inMem } };
    }
    case 'recover_stale_fulfillment_jobs': {
      requireConfirm('recover_stale_fulfillment_jobs');
      const n = await recoverStaleWebTopupFulfillmentJobs({ log });
      return { ok: true, actionId, result: { recoveredCount: n } };
    }
    case 'inspect_order': {
      const oid = requireOrder();
      const order = await getWebTopupOrderAdminDetails(oid);
      if (!order) {
        return { ok: false, actionId, error: 'not_found', code: 'ORDER_NOT_FOUND' };
      }
      return { ok: true, actionId, result: { order } };
    }
    case 'reconcile_order': {
      const oid = requireOrder();
      const out = await scanWebTopupMoneyPathReconciliation({
        orderId: oid,
        includeStripeLookup: includeStripe === true,
        log,
      });
      return { ok: Boolean(out.ok), actionId, result: out };
    }
    case 'retry_order': {
      try {
        const oid = requireOrder();
        const diag = await retryWebTopupFulfillment(oid, log, {
          force: false,
          traceId,
          idempotencyKey: `incident_retry:${oid}:${Date.now().toString(36)}`,
        });
        return { ok: true, actionId, result: diag };
      } catch (e) {
        const code =
          e && typeof e === 'object' && 'code' in e ? String(e.code) : 'retry_failed';
        return {
          ok: false,
          actionId,
          error: String(e?.message ?? e).slice(0, 500),
          code,
        };
      }
    }
    case 'retry_order_force': {
      requireConfirm('retry_order_force');
      try {
        const oid = requireOrder();
        const diag = await retryWebTopupFulfillment(oid, log, {
          force: true,
          traceId,
          idempotencyKey: `incident_retry_force:${oid}:${Date.now().toString(36)}`,
        });
        return { ok: true, actionId, result: diag };
      } catch (e) {
        const code =
          e && typeof e === 'object' && 'code' in e ? String(e.code) : 'retry_failed';
        return {
          ok: false,
          actionId,
          error: String(e?.message ?? e).slice(0, 500),
          code,
        };
      }
    }
    case 'force_deliver_order': {
      requireConfirm('force_deliver_order');
      try {
        const oid = requireOrder();
        const out = await adminForceDeliverWebTopupOrder(oid, log, { fulfillmentReference: null });
        return { ok: true, actionId, result: out };
      } catch (e) {
        const code =
          e && typeof e === 'object' && 'code' in e ? String(e.code) : 'force_deliver_failed';
        return {
          ok: false,
          actionId,
          error: String(e?.message ?? e).slice(0, 500),
          code,
        };
      }
    }
    default: {
      const err = new Error(`Unknown actionId: ${actionId}`);
      err.code = API_CONTRACT_CODE.VALIDATION_ERROR;
      throw err;
    }
  }
}
