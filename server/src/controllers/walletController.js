import { z } from 'zod';
import { env } from '../config/env.js';
import { recordMoneyPathOpsSignal } from '../lib/opsMetrics.js';
import { prisma } from '../db.js';
import { writeOrderAudit } from '../services/orderAuditService.js';
import * as userWalletService from '../services/wallet/userWalletService.js';
import { MONEY_PATH_OUTCOME } from '../constants/moneyPathOutcome.js';
import { clientErrorBody } from '../lib/clientErrorJson.js';

const uuidSchema = z.string().uuid();

/** @param {import('express').Request} req */
function walletInvestigationPayload(req, extra = {}) {
  return {
    userIdSuffix: req.user?.id?.slice(-8) ?? null,
    traceId: req.traceId ?? null,
    requestId: req.requestId ?? null,
    ...extra,
  };
}

/**
 * POST /api/wallet/topup
 *
 * Contract (Idempotency-Key):
 * - Header required, UUID v4.
 * - Same key + same JSON `amount`: 200, `idempotentReplay: true` on replay (no double credit).
 * - Same key + different `amount`: 409, `code: wallet_topup_idempotency_conflict`.
 * Header name is case-insensitive (`Idempotency-Key`).
 */

export async function getBalance(req, res) {
  const state = await userWalletService.getWalletState(req.user.id);
  return res.json(state);
}

export async function postTopup(req, res) {
  const amount = req.body?.amount ?? req.body?.amountUsd;
  const rawKey = req.get('Idempotency-Key')?.trim();
  const idemSuffix =
    rawKey && rawKey.length >= 8 ? rawKey.slice(-8) : rawKey || null;
  const amountRequestedUsd = Number(amount);

  try {
    const p = uuidSchema.safeParse(rawKey);
    if (!p.success) {
      recordMoneyPathOpsSignal('wallet_topup_reject_idempotency_required');
      await writeOrderAudit(prisma, {
        event: 'wallet_topup_idempotency_required',
        payload: walletInvestigationPayload(req, { idempotencyKeySuffix: idemSuffix }),
        ip: req.ip ? String(req.ip).slice(0, 64) : null,
      });
      return res.status(400).json({
        ...clientErrorBody(
          'Idempotency-Key header required (UUID v4)',
          'wallet_topup_idempotency_required',
        ),
        moneyPathOutcome: MONEY_PATH_OUTCOME.REJECTED,
      });
    }

    const r = await userWalletService.topupIdempotent(req.user.id, amount, p.data);
    if (r.idempotentReplay) {
      req.log?.info(
        {
          moneyPath: 'wallet_topup',
          outcome: 'idempotent_replay',
          userIdSuffix: req.user.id.slice(-8),
          idempotencyKeySuffix: idemSuffix,
          amountUsd: r.state.balance,
          traceId: req.traceId,
        },
        'wallet_topup replay (no new credit)',
      );
      await writeOrderAudit(prisma, {
        event: 'wallet_topup_replay',
        payload: walletInvestigationPayload(req, {
          idempotencyKeySuffix: idemSuffix,
          balanceAfterUsd: r.state.balance,
          currency: r.state.currency,
        }),
        ip: req.ip ? String(req.ip).slice(0, 64) : null,
      });
    } else {
      req.log?.info(
        {
          moneyPath: 'wallet_topup',
          outcome: 'applied',
          userIdSuffix: req.user.id.slice(-8),
          idempotencyKeySuffix: idemSuffix,
          balanceAfterUsd: r.state.balance,
          traceId: req.traceId,
        },
        'wallet_topup applied',
      );
      await writeOrderAudit(prisma, {
        event: 'wallet_topup_applied',
        payload: walletInvestigationPayload(req, {
          idempotencyKeySuffix: idemSuffix,
          amountRequestedUsd: Number.isFinite(amountRequestedUsd)
            ? amountRequestedUsd
            : null,
          balanceAfterUsd: r.state.balance,
          currency: r.state.currency,
        }),
        ip: req.ip ? String(req.ip).slice(0, 64) : null,
      });
    }
    return res.status(200).json({
      ok: true,
      ...r.state,
      idempotentReplay: r.idempotentReplay,
      moneyPathOutcome: r.moneyPathOutcome,
    });
  } catch (err) {
    if (err && typeof err === 'object' && err.code === 'wallet_idempotency_conflict') {
      /** Ops signal + structured log for amount misuse; avoid duplicate counter here. */
      await writeOrderAudit(prisma, {
        event: 'wallet_topup_idempotency_conflict',
        payload: walletInvestigationPayload(req, {
          idempotencyKeySuffix: idemSuffix,
          amountRequestedUsd: Number.isFinite(amountRequestedUsd)
            ? amountRequestedUsd
            : null,
        }),
        ip: req.ip ? String(req.ip).slice(0, 64) : null,
      });
      return res.status(409).json({
        ...clientErrorBody(
          env.nodeEnv === 'production'
            ? 'Conflict'
            : 'Idempotency-Key reused with different amount',
          'wallet_topup_idempotency_conflict',
        ),
        moneyPathOutcome: MONEY_PATH_OUTCOME.REJECTED,
      });
    }
    if (
      err &&
      typeof err === 'object' &&
      err.code === 'wallet_ledger_invariant_violation'
    ) {
      recordMoneyPathOpsSignal('wallet_topup_ledger_invariant_http');
      return res.status(500).json({
        ...clientErrorBody(
          env.nodeEnv === 'production'
            ? 'Internal error'
            : err.message || 'Ledger balance invariant failed',
          'wallet_ledger_invariant_violation',
        ),
        moneyPathOutcome: MONEY_PATH_OUTCOME.TERMINAL_FAILURE,
      });
    }
    if (
      err &&
      typeof err === 'object' &&
      err.code === 'wallet_topup_amount_out_of_range'
    ) {
      recordMoneyPathOpsSignal('wallet_topup_reject_amount_out_of_range');
      await writeOrderAudit(prisma, {
        event: 'wallet_topup_amount_rejected',
        payload: walletInvestigationPayload(req, {
          code: 'wallet_topup_amount_out_of_range',
          amountRequestedUsd: Number.isFinite(amountRequestedUsd)
            ? amountRequestedUsd
            : null,
          maxUsdCents: env.walletTopupMaxUsdCents,
        }),
        ip: req.ip ? String(req.ip).slice(0, 64) : null,
      });
      return res.status(400).json({
        ...clientErrorBody(
          env.nodeEnv === 'production'
            ? 'Invalid amount'
            : `Amount exceeds maximum (${env.walletTopupMaxUsdCents} USD cents)`,
          'wallet_topup_amount_out_of_range',
        ),
        moneyPathOutcome: MONEY_PATH_OUTCOME.REJECTED,
      });
    }
    const msg =
      env.nodeEnv === 'production'
        ? 'Invalid request'
        : err.message || 'Topup failed';
    return res
      .status(400)
      .json(clientErrorBody(msg, 'wallet_topup_request_invalid'));
  }
}
