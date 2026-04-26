/**
 * DB-backed Reloadly WebTopup circuit breaker (multi-instance safe).
 * Gates outbound Reloadly calls used by `executeTopupWithReliability` / legacy executor path.
 */

import { prisma } from '../../db.js';
import { webTopupLog } from '../../lib/webTopupObservability.js';
import { env } from '../../config/env.js';

export const RELOADLY_WEBTOPUP_PROVIDER_ID = 'reloadly';

export function isReloadlyWebtopupDurableCircuitEnabled() {
  return env.webtopupReloadlyDurableCircuitEnabled;
}

/** @returns {{ enabled: boolean, failureThreshold: number, windowMs: number, cooldownMs: number, halfOpenMaxProbes: number }} */
export function getReloadlyWebtopupDurableCircuitConfig() {
  return {
    enabled: isReloadlyWebtopupDurableCircuitEnabled(),
    failureThreshold: env.webtopupReloadlyCircuitFailureThreshold,
    windowMs: env.webtopupReloadlyCircuitWindowMs,
    cooldownMs: env.webtopupReloadlyCircuitCooldownMs,
    halfOpenMaxProbes: env.webtopupReloadlyCircuitHalfOpenMaxProbes,
  };
}

/**
 * @param {unknown} raw
 * @returns {number[]}
 */
function normalizeFailureTs(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const x of raw) {
    const n = typeof x === 'number' ? x : Number(x);
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {string} providerId
 */
async function lockCircuitRow(tx, providerId) {
  await tx.$executeRaw`
    SELECT 1 FROM "WebtopupProviderCircuitState"
    WHERE "providerId" = ${providerId}
    FOR UPDATE
  `;
}

/**
 * Whether outbound Reloadly HTTP may proceed.
 * @param {object} [ctx]
 * @param {import('pino').Logger | undefined} [ctx.log]
 * @param {string | null | undefined} [ctx.traceId]
 * @param {string | undefined} [ctx.orderIdSuffix]
 * @returns {Promise<{ allowed: boolean, state: string, bypassed?: boolean, cooldownUntil?: string | null, reason?: string, isProbe?: boolean }>}
 */
export async function checkAllowReloadlyWebtopupCall(ctx = {}) {
  const { log, traceId, orderIdSuffix } = ctx;
  const cfg = getReloadlyWebtopupDurableCircuitConfig();
  if (!cfg.enabled) {
    return { allowed: true, state: 'closed', bypassed: true };
  }

  const pid = RELOADLY_WEBTOPUP_PROVIDER_ID;
  const now = Date.now();

  return await prisma.$transaction(async (tx) => {
    await tx.webtopupProviderCircuitState.upsert({
      where: { providerId: pid },
      create: {
        providerId: pid,
        state: 'closed',
        failureTimestamps: [],
      },
      update: {},
    });

    await lockCircuitRow(tx, pid);

    const row = await tx.webtopupProviderCircuitState.findUniqueOrThrow({
      where: { providerId: pid },
    });

    let failureTimestamps = normalizeFailureTs(row.failureTimestamps);
    failureTimestamps = failureTimestamps.filter((t) => now - t <= cfg.windowMs);

    let state = String(row.state ?? 'closed');

    if (state === 'closed' && failureTimestamps.length >= cfg.failureThreshold) {
      const cooldownUntil = new Date(now + cfg.cooldownMs);
      await tx.webtopupProviderCircuitState.update({
        where: { providerId: pid },
        data: {
          state: 'open',
          openedAt: new Date(now),
          cooldownUntil,
          failureTimestamps,
          halfOpenProbesUsed: 0,
        },
      });
      webTopupLog(log, 'warn', 'provider_circuit_opened', {
        traceId,
        orderIdSuffix,
        provider: pid,
        reason: 'failure_threshold_at_gate',
        failureCount: failureTimestamps.length,
        failureThreshold: cfg.failureThreshold,
        windowMs: cfg.windowMs,
        cooldownUntil: cooldownUntil.toISOString(),
      });
      return {
        allowed: false,
        state: 'open',
        cooldownUntil: cooldownUntil.toISOString(),
        reason: 'failure_threshold_at_gate',
      };
    }

    if (state === 'open') {
      const cu = row.cooldownUntil ? new Date(row.cooldownUntil).getTime() : 0;
      if (cu > now) {
        webTopupLog(log, 'warn', 'provider_call_blocked_by_circuit', {
          traceId,
          orderIdSuffix,
          provider: pid,
          state: 'open',
          cooldownUntil: row.cooldownUntil?.toISOString?.() ?? null,
          reason: 'cooldown',
        });
        await tx.webtopupProviderCircuitState.update({
          where: { providerId: pid },
          data: { failureTimestamps },
        });
        return {
          allowed: false,
          state: 'open',
          cooldownUntil: row.cooldownUntil?.toISOString?.() ?? null,
          reason: 'cooldown',
        };
      }

      await tx.webtopupProviderCircuitState.update({
        where: { providerId: pid },
        data: {
          state: 'half_open',
          halfOpenProbesUsed: 0,
          cooldownUntil: null,
          failureTimestamps,
        },
      });
      webTopupLog(log, 'info', 'provider_circuit_half_open', {
        traceId,
        orderIdSuffix,
        provider: pid,
        failureThreshold: cfg.failureThreshold,
        windowMs: cfg.windowMs,
      });
    }

    const rowActive = await tx.webtopupProviderCircuitState.findUniqueOrThrow({
      where: { providerId: pid },
    });
    const activeState = String(rowActive.state ?? 'closed');

    if (activeState === 'half_open') {
      const probes = rowActive.halfOpenProbesUsed ?? 0;
      if (probes >= cfg.halfOpenMaxProbes) {
        webTopupLog(log, 'warn', 'provider_call_blocked_by_circuit', {
          traceId,
          orderIdSuffix,
          provider: pid,
          state: 'half_open',
          reason: 'half_open_probe_limit',
          halfOpenProbesUsed: probes,
          halfOpenMaxProbes: cfg.halfOpenMaxProbes,
        });
        return {
          allowed: false,
          state: 'half_open',
          reason: 'half_open_probe_limit',
        };
      }

      let ftProbe = normalizeFailureTs(rowActive.failureTimestamps);
      ftProbe = ftProbe.filter((t) => now - t <= cfg.windowMs);

      await tx.webtopupProviderCircuitState.update({
        where: { providerId: pid },
        data: {
          halfOpenProbesUsed: probes + 1,
          failureTimestamps: ftProbe,
        },
      });

      return {
        allowed: true,
        state: 'half_open',
        isProbe: true,
        reason: 'half_open_probe',
      };
    }

    if (activeState === 'open') {
      return {
        allowed: false,
        state: 'open',
        reason: 'stale_open_state',
      };
    }

    await tx.webtopupProviderCircuitState.update({
      where: { providerId: pid },
      data: { failureTimestamps },
    });

    return { allowed: true, state: 'closed' };
  });
}

/**
 * Record outcome after an actual Reloadly attempt (success clears; failure may open breaker).
 * @param {object} ctx
 * @param {boolean} ctx.success
 * @param {import('pino').Logger | undefined} [ctx.log]
 * @param {string | null | undefined} [ctx.traceId]
 */
export async function recordReloadlyWebtopupProviderOutcome(ctx) {
  const { success, log, traceId } = ctx;
  const cfg = getReloadlyWebtopupDurableCircuitConfig();
  if (!cfg.enabled) return;

  const pid = RELOADLY_WEBTOPUP_PROVIDER_ID;
  const now = Date.now();

  await prisma.$transaction(async (tx) => {
    await tx.webtopupProviderCircuitState.upsert({
      where: { providerId: pid },
      create: {
        providerId: pid,
        state: 'closed',
        failureTimestamps: [],
      },
      update: {},
    });

    await lockCircuitRow(tx, pid);

    const row = await tx.webtopupProviderCircuitState.findUniqueOrThrow({
      where: { providerId: pid },
    });

    const prevState = String(row.state ?? 'closed');

    if (success) {
      await tx.webtopupProviderCircuitState.update({
        where: { providerId: pid },
        data: {
          state: 'closed',
          failureTimestamps: [],
          halfOpenProbesUsed: 0,
          cooldownUntil: null,
          openedAt: null,
          lastSuccessAt: new Date(now),
        },
      });
      if (prevState === 'open' || prevState === 'half_open') {
        webTopupLog(log, 'info', 'provider_circuit_closed', {
          traceId,
          provider: pid,
          reason: 'success',
        });
      }
      return;
    }

    let failureTimestamps = normalizeFailureTs(row.failureTimestamps);
    failureTimestamps = failureTimestamps.filter((t) => now - t <= cfg.windowMs);
    failureTimestamps.push(now);

    if (prevState === 'half_open') {
      const cooldownUntil = new Date(now + cfg.cooldownMs);
      await tx.webtopupProviderCircuitState.update({
        where: { providerId: pid },
        data: {
          state: 'open',
          openedAt: new Date(now),
          cooldownUntil,
          failureTimestamps,
          halfOpenProbesUsed: 0,
          lastFailureAt: new Date(now),
        },
      });
      webTopupLog(log, 'warn', 'provider_circuit_opened', {
        traceId,
        provider: pid,
        reason: 'half_open_probe_failed',
        cooldownUntil: cooldownUntil.toISOString(),
      });
      return;
    }

    if (failureTimestamps.length >= cfg.failureThreshold) {
      const cooldownUntil = new Date(now + cfg.cooldownMs);
      await tx.webtopupProviderCircuitState.update({
        where: { providerId: pid },
        data: {
          state: 'open',
          openedAt: new Date(now),
          cooldownUntil,
          failureTimestamps,
          halfOpenProbesUsed: 0,
          lastFailureAt: new Date(now),
        },
      });
      webTopupLog(log, 'warn', 'provider_circuit_opened', {
        traceId,
        provider: pid,
        reason: 'failure_threshold',
        failureCount: failureTimestamps.length,
        failureThreshold: cfg.failureThreshold,
        windowMs: cfg.windowMs,
        cooldownUntil: cooldownUntil.toISOString(),
      });
      return;
    }

    await tx.webtopupProviderCircuitState.update({
      where: { providerId: pid },
      data: {
        failureTimestamps,
        lastFailureAt: new Date(now),
      },
    });
  });
}

/**
 * Admin / readiness snapshot (reads DB row).
 */
export async function getReloadlyWebtopupDurableCircuitAdminSnapshot() {
  const cfg = getReloadlyWebtopupDurableCircuitConfig();
  const pid = RELOADLY_WEBTOPUP_PROVIDER_ID;
  const row = await prisma.webtopupProviderCircuitState.findUnique({
    where: { providerId: pid },
  });
  const now = Date.now();
  const failureTs = row ? normalizeFailureTs(row.failureTimestamps).filter((t) => now - t <= cfg.windowMs) : [];

  return {
    provider: pid,
    durableCircuitEnabled: cfg.enabled,
    state: row?.state ?? 'closed',
    recentFailureCount: failureTs.length,
    failureThreshold: cfg.failureThreshold,
    windowMs: cfg.windowMs,
    cooldownMs: cfg.cooldownMs,
    halfOpenMaxProbes: cfg.halfOpenMaxProbes,
    cooldownUntil: row?.cooldownUntil?.toISOString?.() ?? null,
    openedAt: row?.openedAt?.toISOString?.() ?? null,
    halfOpenProbesUsed: row?.halfOpenProbesUsed ?? 0,
    lastSuccessAt: row?.lastSuccessAt?.toISOString?.() ?? null,
    lastFailureAt: row?.lastFailureAt?.toISOString?.() ?? null,
    lastUpdatedAt: row?.updatedAt?.toISOString?.() ?? null,
  };
}

/** Test helper — removes durable row for Reloadly. */
export async function resetReloadlyWebtopupDurableCircuitForTests() {
  await prisma.webtopupProviderCircuitState.deleteMany({
    where: { providerId: RELOADLY_WEBTOPUP_PROVIDER_ID },
  });
}
