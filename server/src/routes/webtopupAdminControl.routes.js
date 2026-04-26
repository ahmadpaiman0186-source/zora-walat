import { Router } from 'express';

import { API_CONTRACT_CODE } from '../constants/apiContractCodes.js';
import { clientErrorBody } from '../lib/clientErrorJson.js';
import { webtopAdminAuditPayload } from '../lib/adminAuditFields.js';
import { webTopupCorrelationFields, webTopupLog } from '../lib/webTopupObservability.js';
import { requireAdminIpAllowlist } from '../middleware/adminIpAllowlist.js';
import { requireAdminSecret } from '../middleware/adminSecretAuth.js';
import { webtopAdminMutationLimiter, webtopAdminReadLimiter } from '../middleware/rateLimits.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { FULFILLMENT_SERVICE_CODE } from '../domain/topupOrder/fulfillmentErrors.js';
import { isValidTopupOrderId } from '../services/topupOrder/topupOrderService.js';
import {
  adminForceDeliverWebTopupOrder,
  getWebTopupOrderAdminDetails,
  retryWebTopupFulfillment,
} from '../services/topupFulfillment/webTopupFulfillmentService.js';
import { scanWebTopupMoneyPathReconciliation } from '../services/topupOrder/webtopupMoneyPathReconciliationEngine.js';
import { getReloadlyWebtopupDurableCircuitAdminSnapshot } from '../services/reliability/reloadlyWebtopupDurableCircuit.js';
import { getTopupProviderCircuitSnapshot } from '../services/topupFulfillment/topupProviderCircuit.js';
import { getWebTopupFulfillmentQueueHealthSnapshot } from '../services/topupFulfillment/webtopFulfillmentJob.js';
import { getWebTopupMonitoringSnapshot } from '../lib/webtopMonitoringSummary.js';
import { executeWebtopIncidentAction } from '../lib/webtopIncidentRunbook.js';

const router = Router();

/**
 * POST /api/admin/webtopup/retry  { "orderId": "tw_ord_…" }
 * Force retry: `force: true` bypasses retryable-only failure codes.
 */
router.post(
  '/retry',
  requireAdminIpAllowlist,
  requireAdminSecret,
  webtopAdminMutationLimiter,
  asyncHandler(async (req, res) => {
    const orderId = req.body?.orderId ?? req.body?.order_id;
    const force = req.body?.force === true;
    if (!orderId || typeof orderId !== 'string' || !isValidTopupOrderId(orderId.trim())) {
      return res
        .status(400)
        .json(
          clientErrorBody('orderId required', API_CONTRACT_CODE.VALIDATION_ERROR, {
            field: 'orderId',
          }),
        );
    }
    const oid = orderId.trim();
    const traceId = req.traceId ?? undefined;
    webTopupLog(req.log, 'info', 'webtop_admin_retry', {
      ...webtopAdminAuditPayload(req),
      ...webTopupCorrelationFields(oid, null, traceId),
      force,
      path: 'POST /api/admin/webtopup/retry',
    });
    try {
      const diag = await retryWebTopupFulfillment(oid, req.log, {
        force,
        traceId,
        idempotencyKey: `admin_retry:${oid}:${Date.now().toString(36)}`,
      });
      res.setHeader('Cache-Control', 'no-store');
      const asyncAccepted = Boolean(
        diag && typeof diag === 'object' && 'asyncAccepted' in diag && diag.asyncAccepted,
      );
      return res.status(asyncAccepted ? 202 : 200).json({ ok: true, force, ...diag });
    } catch (e) {
      const code = e && typeof e === 'object' && 'code' in e ? String(e.code) : undefined;
      if (code === FULFILLMENT_SERVICE_CODE.ORDER_NOT_FOUND) {
        return res.status(404).json(clientErrorBody('Not found', code));
      }
      if (code === FULFILLMENT_SERVICE_CODE.NOT_PAID) {
        return res.status(409).json(clientErrorBody(e.message ?? 'Not paid', code));
      }
      if (
        code === FULFILLMENT_SERVICE_CODE.INVALID_STATE ||
        code === 'invalid_fulfillment_state'
      ) {
        return res.status(409).json(clientErrorBody(e.message ?? 'Invalid state', code));
      }
      throw e;
    }
  }),
);

/**
 * POST /api/admin/webtopup/force-deliver  { "orderId": "…", "fulfillmentReference": "optional" }
 */
router.post(
  '/force-deliver',
  requireAdminIpAllowlist,
  requireAdminSecret,
  webtopAdminMutationLimiter,
  asyncHandler(async (req, res) => {
    const orderId = req.body?.orderId ?? req.body?.order_id;
    const fulfillmentReference = req.body?.fulfillmentReference ?? req.body?.fulfillment_reference;
    if (!orderId || typeof orderId !== 'string' || !isValidTopupOrderId(orderId.trim())) {
      return res
        .status(400)
        .json(
          clientErrorBody('orderId required', API_CONTRACT_CODE.VALIDATION_ERROR, {
            field: 'orderId',
          }),
        );
    }
    const oid = orderId.trim();
    const traceId = req.traceId ?? undefined;
    webTopupLog(req.log, 'info', 'webtop_admin_force_deliver', {
      ...webtopAdminAuditPayload(req),
      ...webTopupCorrelationFields(oid, null, traceId),
      path: 'POST /api/admin/webtopup/force-deliver',
    });
    try {
      const out = await adminForceDeliverWebTopupOrder(oid, req.log, {
        fulfillmentReference:
          typeof fulfillmentReference === 'string' ? fulfillmentReference : null,
      });
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ ok: true, ...out });
    } catch (e) {
      const code = e && typeof e === 'object' && 'code' in e ? String(e.code) : undefined;
      if (code === FULFILLMENT_SERVICE_CODE.ORDER_NOT_FOUND) {
        return res.status(404).json(clientErrorBody('Not found', code));
      }
      if (code === FULFILLMENT_SERVICE_CODE.NOT_PAID) {
        return res.status(409).json(clientErrorBody(e.message ?? 'Not paid', code));
      }
      throw e;
    }
  }),
);

/**
 * GET /api/admin/webtopup/provider-health?provider=reloadly
 * Durable Reloadly circuit + in-process breaker snapshots (admin-only).
 */
router.get(
  '/provider-health',
  requireAdminIpAllowlist,
  requireAdminSecret,
  webtopAdminReadLimiter,
  asyncHandler(async (req, res) => {
    const filter = String(req.query.provider ?? req.query.p ?? '').trim().toLowerCase();
    webTopupLog(req.log, 'info', 'webtop_admin_provider_health', {
      ...webtopAdminAuditPayload(req),
      path: 'GET /api/admin/webtopup/provider-health',
      providerFilter: filter || null,
      traceId: req.traceId ?? undefined,
    });
    const durable = await getReloadlyWebtopupDurableCircuitAdminSnapshot();
    const inMem = getTopupProviderCircuitSnapshot();
    res.setHeader('Cache-Control', 'no-store');
    if (filter && filter !== 'reloadly') {
      return res.status(200).json({
        ok: true,
        provider: filter,
        note:
          'Durable circuit state is stored only for reloadly; other providers use in-memory snapshots.',
        inMemory: inMem[filter] ?? null,
      });
    }
    return res.status(200).json({
      ok: true,
      reloadly: {
        durable,
        inMemory: inMem.reloadly ?? null,
      },
      inMemoryAllProviders: inMem,
    });
  }),
);

/**
 * GET /api/admin/webtopup/queue-health
 * Job queue + fulfillment backlog snapshot (admin-only).
 */
router.get(
  '/queue-health',
  requireAdminIpAllowlist,
  requireAdminSecret,
  webtopAdminReadLimiter,
  asyncHandler(async (req, res) => {
    webTopupLog(req.log, 'info', 'webtop_admin_queue_health', {
      ...webtopAdminAuditPayload(req),
      path: 'GET /api/admin/webtopup/queue-health',
      traceId: req.traceId ?? undefined,
    });
    const snapshot = await getWebTopupFulfillmentQueueHealthSnapshot();
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true, ...snapshot });
  }),
);

/**
 * POST /api/admin/webtopup/incident-action
 * Execute a runbook action (retry, recover jobs, snapshots — see suggestedActions on monitoring).
 */
router.post(
  '/incident-action',
  requireAdminIpAllowlist,
  requireAdminSecret,
  webtopAdminMutationLimiter,
  asyncHandler(async (req, res) => {
    const actionId = String(req.body?.actionId ?? req.body?.action_id ?? '').trim();
    if (!actionId) {
      return res.status(400).json(
        clientErrorBody('actionId required', API_CONTRACT_CODE.VALIDATION_ERROR, { field: 'actionId' }),
      );
    }
    const orderId = req.body?.orderId ?? req.body?.order_id ?? null;
    const confirm = req.body?.confirm === true;
    const includeStripe =
      req.body?.includeStripe === true || req.body?.include_stripe === true;
    const traceId = req.traceId ?? undefined;
    try {
      const out = await executeWebtopIncidentAction(actionId, {
        log: req.log,
        orderId,
        confirm,
        traceId,
        includeStripe,
      });
      if (out && typeof out === 'object' && 'ok' in out && out.ok === false) {
        webTopupLog(req.log, 'warn', 'incident_action_failed', {
          ...webtopAdminAuditPayload(req),
          path: 'POST /api/admin/webtopup/incident-action',
          actionId,
          code: out.code,
          traceId,
        });
      } else {
        webTopupLog(req.log, 'info', 'incident_action_executed', {
          ...webtopAdminAuditPayload(req),
          path: 'POST /api/admin/webtopup/incident-action',
          actionId,
          ok: true,
          traceId,
        });
      }
      res.setHeader('Cache-Control', 'no-store');
      if (out.ok === false && out.code === FULFILLMENT_SERVICE_CODE.ORDER_NOT_FOUND) {
        return res.status(404).json(clientErrorBody('Not found', out.code));
      }
      if (out.ok === false && out.code === FULFILLMENT_SERVICE_CODE.NOT_PAID) {
        return res.status(409).json(clientErrorBody(out.error ?? 'Not paid', out.code));
      }
      if (
        out.ok === false &&
        (out.code === FULFILLMENT_SERVICE_CODE.INVALID_STATE || out.code === 'invalid_fulfillment_state')
      ) {
        return res.status(409).json(clientErrorBody(out.error ?? 'Invalid state', out.code));
      }
      return res.status(200).json({ ok: out.ok !== false, ...out });
    } catch (e) {
      const code = e && typeof e === 'object' && 'code' in e ? String(e.code) : undefined;
      webTopupLog(req.log, 'warn', 'incident_action_failed', {
        ...webtopAdminAuditPayload(req),
        actionId,
        code: code ?? 'unknown',
        message: String(e?.message ?? e).slice(0, 500),
        traceId,
      });
      if (code === 'confirmation_required') {
        res.setHeader('Cache-Control', 'no-store');
        return res.status(409).json(
          clientErrorBody(
            e.message ?? 'Confirmation required for this action',
            'confirmation_required',
            { actionId, requiresConfirm: true },
          ),
        );
      }
      if (code === API_CONTRACT_CODE.VALIDATION_ERROR) {
        res.setHeader('Cache-Control', 'no-store');
        return res.status(400).json(clientErrorBody(e.message ?? 'Invalid request', code));
      }
      throw e;
    }
  }),
);

/**
 * GET /api/admin/webtopup/monitoring
 * Metrics summary, queue/circuit snapshots, alert severity, durable log config (admin-only).
 */
router.get(
  '/monitoring',
  requireAdminIpAllowlist,
  requireAdminSecret,
  webtopAdminReadLimiter,
  asyncHandler(async (req, res) => {
    webTopupLog(req.log, 'info', 'webtop_admin_monitoring', {
      ...webtopAdminAuditPayload(req),
      path: 'GET /api/admin/webtopup/monitoring',
      traceId: req.traceId ?? undefined,
    });
    const snapshot = await getWebTopupMonitoringSnapshot();
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(snapshot);
  }),
);

/**
 * GET /api/admin/webtopup/status?orderId=tw_ord_…
 */
router.get(
  '/status',
  requireAdminIpAllowlist,
  requireAdminSecret,
  webtopAdminReadLimiter,
  asyncHandler(async (req, res) => {
    const orderId = String(req.query.orderId ?? req.query.order_id ?? '').trim();
    if (!orderId || !isValidTopupOrderId(orderId)) {
      return res
        .status(400)
        .json(
          clientErrorBody('orderId query required', API_CONTRACT_CODE.VALIDATION_ERROR, {
            field: 'orderId',
          }),
        );
    }
    const traceId = req.traceId ?? undefined;
    webTopupLog(req.log, 'info', 'webtop_admin_status', {
      ...webtopAdminAuditPayload(req),
      ...webTopupCorrelationFields(orderId, null, traceId),
      path: 'GET /api/admin/webtopup/status',
    });
    const order = await getWebTopupOrderAdminDetails(orderId);
    if (!order) {
      return res
        .status(404)
        .json(clientErrorBody('Not found', FULFILLMENT_SERVICE_CODE.ORDER_NOT_FOUND));
    }
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true, order });
  }),
);

/**
 * GET /api/admin/webtopup/reconciliation?orderId=tw_ord_…&includeStripe=1
 * Read-only money-path reconciliation (single order).
 */
router.get(
  '/reconciliation',
  requireAdminIpAllowlist,
  requireAdminSecret,
  webtopAdminReadLimiter,
  asyncHandler(async (req, res) => {
    const orderId = String(req.query.orderId ?? req.query.order_id ?? '').trim();
    if (!orderId || !isValidTopupOrderId(orderId)) {
      return res
        .status(400)
        .json(
          clientErrorBody('orderId query required', API_CONTRACT_CODE.VALIDATION_ERROR, {
            field: 'orderId',
          }),
        );
    }
    const includeStripe =
      String(req.query.includeStripe ?? req.query.include_stripe ?? '') === '1' ||
      String(req.query.includeStripe ?? '').toLowerCase() === 'true';
    webTopupLog(req.log, 'info', 'webtop_admin_reconciliation', {
      ...webtopAdminAuditPayload(req),
      ...webTopupCorrelationFields(orderId, null, req.traceId ?? undefined),
      path: 'GET /api/admin/webtopup/reconciliation',
      includeStripeLookup: includeStripe,
    });
    const out = await scanWebTopupMoneyPathReconciliation({
      orderId,
      includeStripeLookup: includeStripe,
      log: req.log,
    });
    res.setHeader('Cache-Control', 'no-store');
    if (!out.ok && out.error === 'not_found') {
      return res.status(404).json(clientErrorBody('Not found', API_CONTRACT_CODE.NOT_FOUND));
    }
    if (!out.ok) {
      return res.status(400).json(clientErrorBody('Invalid request', API_CONTRACT_CODE.VALIDATION_ERROR));
    }
    return res.status(200).json(out);
  }),
);

/**
 * GET /api/admin/webtopup/reconciliation/recent?limit=50&paymentStatus=paid&fulfillmentStatus=pending&includeStripe=0
 */
router.get(
  '/reconciliation/recent',
  requireAdminIpAllowlist,
  requireAdminSecret,
  webtopAdminReadLimiter,
  asyncHandler(async (req, res) => {
    const raw = parseInt(String(req.query.limit ?? '50'), 10);
    const limit = Number.isFinite(raw) ? Math.min(500, Math.max(1, raw)) : 50;
    const paymentStatus = String(req.query.paymentStatus ?? req.query.payment_status ?? '').trim();
    const fulfillmentStatus = String(
      req.query.fulfillmentStatus ?? req.query.fulfillment_status ?? '',
    ).trim();
    const includeStripe =
      String(req.query.includeStripe ?? req.query.include_stripe ?? '') === '1' ||
      String(req.query.includeStripe ?? '').toLowerCase() === 'true';
    webTopupLog(req.log, 'info', 'webtop_admin_reconciliation_recent', {
      ...webtopAdminAuditPayload(req),
      path: 'GET /api/admin/webtopup/reconciliation/recent',
      limit,
      includeStripeLookup: includeStripe,
    });
    const out = await scanWebTopupMoneyPathReconciliation({
      limit,
      paymentStatus: paymentStatus || undefined,
      fulfillmentStatus: fulfillmentStatus || undefined,
      includeStripeLookup: includeStripe,
      log: req.log,
    });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(out);
  }),
);

export default router;
