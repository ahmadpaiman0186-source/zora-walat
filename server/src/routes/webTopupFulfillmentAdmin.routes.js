import { Router } from 'express';

import { API_CONTRACT_CODE } from '../constants/apiContractCodes.js';
import { clientErrorBody } from '../lib/clientErrorJson.js';
import { staffApiErrorBody } from '../lib/staffApiError.js';
import {
  requireAuth,
  requireStaff,
  requireFulfillmentActor,
} from '../middleware/authMiddleware.js';
import { requireFulfillmentActionReason } from '../middleware/fulfillmentAdminReason.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { FULFILLMENT_SERVICE_CODE } from '../domain/topupOrder/fulfillmentErrors.js';
import {
  dispatchWebTopupFulfillment,
  getWebTopupFulfillmentDiagnostics,
  retryWebTopupFulfillment,
} from '../services/topupFulfillment/webTopupFulfillmentService.js';
import { buildSandboxProviderReadiness } from '../services/topupFulfillment/webTopupFulfillmentRunbook.js';
import { runReloadlySandboxDispatchPreflight } from '../services/topupFulfillment/webTopupSandboxPreflight.js';
import { writeWebTopupFulfillmentAdminAudit } from '../services/fulfillmentAdminAuditService.js';
import { isValidTopupOrderId } from '../services/topupOrder/topupOrderService.js';
import {
  fulfillmentAdminMutationLimiter,
  fulfillmentPerOrderLimiter,
} from '../middleware/rateLimits.js';

const router = Router();

/**
 * @param {import('express').Response} res
 * @param {number} status
 * @param {Record<string, unknown>} json
 * @param {{ orderId?: string; log?: import('pino').Logger }} [ctx]
 */
async function respondWithRunbook(res, status, json, ctx) {
  const { orderId, log } = ctx || {};
  const errText = typeof json.error === 'string' ? json.error : 'Request failed';
  const codeStr =
    typeof json.code === 'string' && json.code.length > 0
      ? json.code
      : API_CONTRACT_CODE.INTERNAL_ERROR;
  const base = clientErrorBody(errText, codeStr, {
    nextAction: json.nextAction,
  });
  if (orderId && log) {
    try {
      const d = await getWebTopupFulfillmentDiagnostics(orderId, log, {
        emitLog: false,
        includeRunbook: true,
      });
      if (d.ok) {
        return res.status(status).json({
          ...base,
          summary: d.summary,
          runbook: d.runbook,
        });
      }
    } catch {
      /* diagnostics unavailable */
    }
  }
  return res.status(status).json(base);
}

/**
 * @param {unknown} err
 * @param {import('express').Response} res
 * @param {{ orderId?: string; log?: import('pino').Logger }} [ctx]
 */
async function handleFulfillmentError(err, res, ctx) {
  const e = /** @type {{ code?: string; message?: string }} */ (err);
  const c = e?.code;
  if (c === FULFILLMENT_SERVICE_CODE.ORDER_NOT_FOUND) {
    return res.status(404).json(clientErrorBody('Not found', c));
  }
  if (c === FULFILLMENT_SERVICE_CODE.FULFILLMENT_SUSPENDED) {
    return respondWithRunbook(
      res,
      503,
      {
        error: e.message,
        code: c,
        nextAction:
          'Fulfillment is suspended by operations (kill switch or config). No provider call was made.',
      },
      ctx,
    );
  }
  if (c === FULFILLMENT_SERVICE_CODE.IDEMPOTENCY_CONFLICT) {
    return respondWithRunbook(
      res,
      409,
      {
        error: e.message,
        code: c,
        nextAction:
          'This Idempotency-Key is tied to an in-flight attempt for this order. Reuse the same key only after the attempt finishes, or omit the header.',
      },
      ctx,
    );
  }
  if (
    c === 'not_paid' ||
    c === FULFILLMENT_SERVICE_CODE.INVALID_STATE ||
    c === FULFILLMENT_SERVICE_CODE.DUPLICATE_DISPATCH
  ) {
    return respondWithRunbook(
      res,
      409,
      {
        error: e.message,
        code: c,
        nextAction:
          c === FULFILLMENT_SERVICE_CODE.DUPLICATE_DISPATCH
            ? 'Check GET fulfillment/diagnostics; fulfillment may already be in progress or complete.'
            : c === 'not_paid'
              ? 'Wait for payment confirmation (Stripe) before dispatch.'
              : 'Order is not in the expected fulfillment state for this action — see runbook.',
      },
      ctx,
    );
  }
  if (c === FULFILLMENT_SERVICE_CODE.PROVIDER_NOT_CONFIGURED) {
    return respondWithRunbook(
      res,
      503,
      {
        error: e.message,
        code: c,
        nextAction:
          'Reloadly is selected but not configured; set credentials or switch WEBTOPUP_FULFILLMENT_PROVIDER=mock.',
      },
      ctx,
    );
  }
  if (c === FULFILLMENT_SERVICE_CODE.OPERATOR_MAPPING_MISSING) {
    return respondWithRunbook(
      res,
      400,
      {
        error: e.message,
        code: c,
        nextAction:
          'Add RELOADLY_OPERATOR_MAP_JSON (or defaults) so this operatorKey maps to a Reloadly operatorId.',
      },
      ctx,
    );
  }
  if (c === FULFILLMENT_SERVICE_CODE.PROVIDER_UNSUPPORTED) {
    return respondWithRunbook(
      res,
      400,
      {
        error: e.message,
        code: c,
        nextAction:
          'Reloadly web path supports AF airtime only; use mock provider or an in-scope order.',
      },
      ctx,
    );
  }
  return null;
}

router.get(
  '/web-topup-fulfillment/sandbox-readiness',
  requireAuth,
  requireStaff,
  asyncHandler(async (req, res) => {
    res.status(200).json(buildSandboxProviderReadiness());
  }),
);

router.post(
  '/web-topup-order/:orderId/fulfillment/dispatch',
  requireAuth,
  fulfillmentAdminMutationLimiter,
  fulfillmentPerOrderLimiter,
  requireFulfillmentActor,
  requireFulfillmentActionReason,
  asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    if (!isValidTopupOrderId(orderId)) {
      return res.status(400).json(staffApiErrorBody('Invalid order id', 400));
    }
    const actor = /** @type {{ id: string, email: string, role: string }} */ (
      req.user
    );
    const reason = /** @type {string} */ (req.fulfillmentActionReason);
    try {
      const diag = await dispatchWebTopupFulfillment(orderId, req.log);
      await writeWebTopupFulfillmentAdminAudit({
        event: 'webtopup_fulfillment_dispatch',
        actor,
        action: 'dispatch',
        orderId,
        reason,
        ip: req.ip,
        extra: {
          outcome: 'completed',
          fulfillmentStatus: diag.fulfillmentStatus,
        },
      });
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(diag);
    } catch (e) {
      const ecode =
        e && typeof e === 'object' && 'code' in e ? String(e.code) : undefined;
      await writeWebTopupFulfillmentAdminAudit({
        event: 'webtopup_fulfillment_dispatch',
        actor,
        action: 'dispatch',
        orderId,
        reason,
        ip: req.ip,
        extra: { outcome: 'failed', code: ecode },
      }).catch(() => {});
      const mapped = await handleFulfillmentError(e, res, {
        orderId,
        log: req.log,
      });
      if (mapped) return mapped;
      throw e;
    }
  }),
);

router.post(
  '/web-topup-order/:orderId/fulfillment/retry',
  requireAuth,
  fulfillmentAdminMutationLimiter,
  fulfillmentPerOrderLimiter,
  requireFulfillmentActor,
  requireFulfillmentActionReason,
  asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    if (!isValidTopupOrderId(orderId)) {
      return res.status(400).json(staffApiErrorBody('Invalid order id', 400));
    }
    const actor = /** @type {{ id: string, email: string, role: string }} */ (
      req.user
    );
    const reason = /** @type {string} */ (req.fulfillmentActionReason);
    const idempotencyKey = req.get('Idempotency-Key') ?? undefined;
    const traceId = req.get('X-Request-Id') ?? undefined;
    try {
      const diag = await retryWebTopupFulfillment(orderId, req.log, {
        idempotencyKey,
        traceId,
      });
      const asyncAccepted = Boolean(
        diag && typeof diag === 'object' && 'asyncAccepted' in diag && diag.asyncAccepted,
      );
      await writeWebTopupFulfillmentAdminAudit({
        event: 'webtopup_fulfillment_retry',
        actor,
        action: 'retry',
        orderId,
        reason,
        ip: req.ip,
        extra: {
          outcome: asyncAccepted ? 'async_accepted' : 'completed',
          fulfillmentStatus: asyncAccepted
            ? undefined
            : /** @type {{ fulfillmentStatus?: string }} */ (diag).fulfillmentStatus,
          jobId: asyncAccepted
            ? /** @type {{ jobId?: string | null }} */ (diag).jobId
            : undefined,
        },
      });
      res.setHeader('Cache-Control', 'no-store');
      if (asyncAccepted) {
        return res.status(202).json(diag);
      }
      return res.status(200).json(diag);
    } catch (e) {
      const ecode =
        e && typeof e === 'object' && 'code' in e ? String(e.code) : undefined;
      await writeWebTopupFulfillmentAdminAudit({
        event: 'webtopup_fulfillment_retry',
        actor,
        action: 'retry',
        orderId,
        reason,
        ip: req.ip,
        extra: { outcome: 'failed', code: ecode },
      }).catch(() => {});
      const mapped = await handleFulfillmentError(e, res, {
        orderId,
        log: req.log,
      });
      if (mapped) return mapped;
      throw e;
    }
  }),
);

router.get(
  '/web-topup-order/:orderId/fulfillment/sandbox-preflight',
  requireAuth,
  requireStaff,
  asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    if (!isValidTopupOrderId(orderId)) {
      return res.status(400).json(staffApiErrorBody('Invalid order id', 400));
    }
    const preflight = await runReloadlySandboxDispatchPreflight(orderId);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(preflight);
  }),
);

router.get(
  '/web-topup-order/:orderId/fulfillment/diagnostics',
  requireAuth,
  requireStaff,
  asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    if (!isValidTopupOrderId(orderId)) {
      return res.status(400).json(staffApiErrorBody('Invalid order id', 400));
    }
    const diag = await getWebTopupFulfillmentDiagnostics(orderId, req.log, {
      includeRunbook: true,
    });
    res.setHeader('Cache-Control', 'no-store');
    if (!diag.ok) {
      const code =
        typeof diag.error === 'string'
          ? diag.error
          : FULFILLMENT_SERVICE_CODE.ORDER_NOT_FOUND;
      return res.status(404).json(clientErrorBody('Not found', code));
    }
    return res.status(200).json(diag);
  }),
);

export default router;
