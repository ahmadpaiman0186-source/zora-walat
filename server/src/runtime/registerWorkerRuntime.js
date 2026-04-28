/** Dedicated background worker (`fulfillment-worker.mjs`). Must load before `bootstrap.js`. */
process.env.ZW_RUNTIME_KIND = 'worker';
