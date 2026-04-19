/**
 * Process + PostgreSQL visibility for WebTopup ops (Phase 13 resource hardening).
 * Uses a single read on pg_stat_activity — does not allocate new DB connections beyond the pool query.
 */

import { prisma } from '../db.js';
import { env } from '../config/env.js';

/**
 * @param {Awaited<ReturnType<typeof import('../services/topupFulfillment/webtopFulfillmentJob.js').getWebTopupFulfillmentQueueHealthSnapshot>>} [queueHealth]
 */
export async function getWebtopResourceSnapshot(queueHealth) {
  const mem = process.memoryUsage();

  /** @type {Record<string, unknown> | null} */
  let pg = null;
  try {
    const rows = await prisma.$queryRaw`
      SELECT
        count(*)::int AS "connectionsTotal",
        count(*) FILTER (WHERE state = 'active')::int AS "connectionsActive",
        count(*) FILTER (WHERE wait_event_type IS NOT NULL)::int AS "connectionsWaiting",
        current_setting('max_connections', true)::int AS "maxConnectionsSetting"
      FROM pg_stat_activity
      WHERE datname = current_database()
    `;
    pg = rows[0] && typeof rows[0] === 'object' ? { ...rows[0] } : null;
  } catch {
    pg = { unavailable: true };
  }

  const qh = queueHealth ?? null;

  return {
    schemaVersion: 1,
    collectedAt: new Date().toISOString(),
    process: {
      uptimeSeconds: Math.floor(process.uptime()),
      pid: process.pid,
      memoryUsage: {
        rss: mem.rss,
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
        external: mem.external,
        arrayBuffers: mem.arrayBuffers ?? 0,
      },
    },
    database: {
      ...pg,
      prismaPoolNote:
        'Counts are server-wide for this database name (all clients), not Prisma-internal pool slots.',
    },
    queueDepth: qh
      ? {
          jobsByStatus: { ...qh.jobsByStatus },
          orderFulfillmentQueued: qh.orderFulfillment?.queued ?? 0,
          orderFulfillmentProcessing: qh.orderFulfillment?.processing ?? 0,
        }
      : null,
    workerActivity: {
      webtopupFulfillmentJobPollMs: env.webtopupFulfillmentJobPollMs,
      webtopupFulfillmentJobBatchSize: env.webtopupFulfillmentJobBatchSize,
      fulfillmentWorkerConcurrency: env.fulfillmentWorkerConcurrency,
      fulfillmentQueueEnabled: env.fulfillmentQueueEnabled,
    },
  };
}
