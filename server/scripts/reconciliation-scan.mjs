/**
 * Read-only reconciliation JSON to stdout (ops / cron). No mutations.
 * Usage: npm run reconciliation:scan
 */
import '../bootstrap.js';
import { runReconciliationScan } from '../src/services/reconciliationService.js';

const result = await runReconciliationScan();
console.log(JSON.stringify(result, null, 2));
