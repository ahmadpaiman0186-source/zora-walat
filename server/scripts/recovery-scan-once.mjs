/**
 * Safe recovery: re-run Phase 1 recon scan and dispatch fulfillment only for
 * SAFE_QUEUE_RETRY_CANDIDATE / SAFE_RETRY findings. No Stripe refunds.
 *
 * Run: npm --prefix server run recovery:scan-once
 */
import '../bootstrap.js';

import { randomUUID } from 'node:crypto';

import { executePhase1RecoveryScanOnce } from '../src/services/recoveryPhase1SafeQueueRetryService.js';

const out = await executePhase1RecoveryScanOnce({
  traceId: `recovery-cli:${randomUUID()}`,
});
// eslint-disable-next-line no-console -- CLI output
console.log(JSON.stringify({ script: 'recovery:scan-once', ...out }, null, 2));
