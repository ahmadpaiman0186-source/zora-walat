/**
 * Dedicated background runtime: queue consumers plus recurring maintenance loops.
 * This is the authoritative owner of non-request work in all deployments.
 *
 *   node fulfillment-worker.mjs
 */
import './src/runtime/registerWorkerRuntime.js';
import './bootstrap.js';
import { startBackgroundWorkerRuntime } from './src/index.js';

const shutdownRuntime = startBackgroundWorkerRuntime();

const shutdown = async () => {
  await shutdownRuntime();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
