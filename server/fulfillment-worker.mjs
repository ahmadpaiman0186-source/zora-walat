/**
 * Dedicated Phase 1 fulfillment worker (BullMQ).
 * Requires FULFILLMENT_QUEUE_ENABLED=true and REDIS_URL.
 *
 *   node fulfillment-worker.mjs
 */
import './bootstrap.js';
import { env } from './src/config/env.js';
import {
  startPhase1FulfillmentWorker,
  stopPhase1FulfillmentWorker,
} from './src/queues/phase1FulfillmentWorker.js';

if (!env.fulfillmentQueueEnabled) {
  console.error(
    '[fulfillment-worker] Set FULFILLMENT_QUEUE_ENABLED=true and REDIS_URL (see .env.example)',
  );
  process.exit(1);
}

const worker = startPhase1FulfillmentWorker();
if (!worker) {
  console.error(
    '[fulfillment-worker] Worker did not start (check REDIS_URL, Memurai, and FULFILLMENT_QUEUE_ENABLED=true)',
  );
  process.exit(1);
}

const shutdown = async () => {
  await stopPhase1FulfillmentWorker();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
