import { env } from './env.js';

/**
 * Opt-in stricter production checks when horizontal scaling / shared Redis is expected.
 * See `.env.example` (`ZW_PRODUCTION_EXPECT_HORIZONAL`).
 */
export function assertProductionDeploymentContractOrExit() {
  if (process.env.NODE_ENV === 'test') return;
  if (env.nodeEnv !== 'production') return;

  const expectHorizontal =
    String(process.env.ZW_PRODUCTION_EXPECT_HORIZONAL ?? '').trim() === 'true';
  if (!expectHorizontal) return;

  const redis = String(process.env.REDIS_URL ?? env.redisUrl ?? '').trim();
  if (!redis) {
    console.error(
      '[fatal] ZW_PRODUCTION_EXPECT_HORIZONAL=true requires REDIS_URL (queues, shared limits, idempotency).',
    );
    process.exit(1);
  }
  if (String(process.env.RATE_LIMIT_USE_REDIS ?? '').trim() !== 'true') {
    console.error(
      '[fatal] ZW_PRODUCTION_EXPECT_HORIZONAL=true requires RATE_LIMIT_USE_REDIS=true so HTTP rate limits are not per-process only.',
    );
    process.exit(1);
  }
}
