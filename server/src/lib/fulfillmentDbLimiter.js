import pLimit from 'p-limit';

function parsePositiveInt(raw, fallback) {
  const n = parseInt(String(raw ?? '').trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const concurrency = parsePositiveInt(process.env.FULFILLMENT_DB_CONCURRENCY, 50);

/** Caps concurrent fulfillment DB transactions (claim + orchestration) across workers. */
export const fulfillmentDbLimit = pLimit(concurrency);
