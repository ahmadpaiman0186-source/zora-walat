/**
 * Read-only reconciliation JSON to stdout (ops / cron). No mutations.
 *
 * Usage:
 *   npm run reconciliation:scan
 *   node scripts/reconciliation-scan.mjs --incremental
 *   node scripts/reconciliation-scan.mjs --full-chunk [--cursor=<paymentCheckoutId>]
 *   node scripts/reconciliation-scan.mjs --no-heavy
 */
import '../bootstrap.js';
import { runReconciliationScan } from '../src/services/reconciliationService.js';

const argv = process.argv.slice(2);
const incremental = argv.includes('--incremental');
const fullChunk = argv.includes('--full-chunk');
const updateWatermarks = !argv.includes('--no-watermark');
const heavyIntegrity = !argv.includes('--no-heavy');

let fullCursorId = null;
for (const a of argv) {
  if (a.startsWith('--cursor=')) {
    fullCursorId = a.slice('--cursor='.length).trim() || null;
  }
}

const result = await runReconciliationScan({
  incremental,
  fullChunk: fullChunk ? { cursorId: fullCursorId, size: undefined } : null,
  updateWatermarks,
  heavyIntegrity,
});

console.log(JSON.stringify(result, null, 2));
