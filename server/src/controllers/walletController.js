import { z } from 'zod';
import { env } from '../config/env.js';
import { recordMoneyPathOpsSignal } from '../lib/opsMetrics.js';
import { prisma } from '../db.js';
import { writeOrderAudit } from '../services/orderAuditService.js';
import * as userWalletService from '../services/wallet/userWalletService.js';

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
 * - When `REQUIRE_WALLET_TOPUP_IDEMPOTENCY_KEY=true` (recommended / scale gate): header required, UUID v4.
 * - When enforcement off: header optional; **omit** uses legacy path (no replay safety).
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

    if (env.requireWalletTopupIdempotencyKey) {
      const p = uuidSchema.safeParse(rawKey);
      if (!p.success) {
        recordMoneyPathOpsSignal('wallet_topup_reject_idempotency_required');
        await writeOrderAudit(prisma, {
          event: 'wallet_topup_idempotency_required',
          payload: walletInvestigationPayload(req, { idempotencyKeySuffix: idemSuffix }),
          ip: req.ip ? String(req.ip).slice(0, 64) : null,
        });
        return res.status(400).json({
          code: 'wallet_topup_idempotency_required',
          error: 'Idempotency-Key header required (UUID v4)',
        });
      }
    }

    if (rawKey) {
      const p = uuidSchema.safeParse(rawKey);
      if (!p.success) {
        recordMoneyPathOpsSignal('wallet_topup_reject_idempotency_invalid');
        await writeOrderAudit(prisma, {
          event: 'wallet_topup_idempotency_invalid',
          payload: walletInvestigationPayload(req, { idempotencyKeySuffix: idemSuffix }),
          ip: req.ip ? String(req.ip).slice(0, 64) : null,
        });
        return res.status(400).json({
          code: 'wallet_topup_idempotency_invalid',
          error: 'Invalid Idempotency-Key (UUID v4)',
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
      });
    }

    const nextState = await userWalletService.topup(req.user.id, amount);
    req.log?.info(
      {
        moneyPath: 'wallet_topup',
        outcome: 'legacy_applied',
        userIdSuffix: req.user.id.slice(-8),
        balanceAfterUsd: nextState.balance,
        traceId: req.traceId,
      },
      'wallet_topup legacy path (no Idempotency-Key)',
    );
    await writeOrderAudit(prisma, {
      event: 'wallet_topup_legacy_applied',
      payload: walletInvestigationPayload(req, {
        amountRequestedUsd: Number.isFinite(amountRequestedUsd)
          ? amountRequestedUsd
          : null,
        balanceAfterUsd: nextState.balance,
        currency: nextState.currency,
      }),
      ip: req.ip ? String(req.ip).slice(0, 64) : null,
    });
    return res.json({ ok: true, ...nextState });
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
        code: 'wallet_topup_idempotency_conflict',
        error:
          env.nodeEnv === 'production'
            ? 'Conflict'
            : 'Idempotency-Key reused with different amount',
      });
    }
    if (
      err &&
      typeof err === 'object' &&
      err.code === 'wallet_ledger_invariant_violation'
    ) {
      recordMoneyPathOpsSignal('wallet_topup_ledger_invariant_http');
      return res.status(500).json({
        code: 'wallet_ledger_invariant_violation',
        error:
          env.nodeEnv === 'production'
            ? 'Internal error'
            : err.message || 'Ledger balance invariant failed',
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
        code: 'wallet_topup_amount_out_of_range',
        error:
          env.nodeEnv === 'production'
            ? 'Invalid amount'
            : `Amount exceeds maximum (${env.walletTopupMaxUsdCents} USD cents)`,
      });
    }
    const msg =
      env.nodeEnv === 'production'
        ? 'Invalid request'
        : err.message || 'Topup failed';
    return res.status(400).json({ error: msg });
  }
}
