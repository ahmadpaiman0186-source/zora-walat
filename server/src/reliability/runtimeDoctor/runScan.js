import { normalizeSnapshot } from './snapshotTypes.js';
import { buildScanReport } from './types.js';
import { scanDuplicateTransaction } from './scanners/duplicateTransaction.js';
import { scanNoPayNoService } from './scanners/noPayNoService.js';
import { scanProviderProof } from './scanners/providerProof.js';
import { scanStalePending } from './scanners/stalePending.js';
import { scanPaymentOrderProviderMismatch } from './scanners/paymentOrderProviderMismatch.js';
import { scanCompletedWithoutProof } from './scanners/completedWithoutProof.js';
import { scanMissingAudit } from './scanners/missingAudit.js';
import { scanAmbiguousProvider } from './scanners/ambiguousProvider.js';

/** All registered scanners (pure, no I/O). */
export const SCANNERS = [
  { name: 'duplicate_transaction', run: scanDuplicateTransaction },
  { name: 'no_pay_no_service', run: scanNoPayNoService },
  { name: 'provider_proof', run: scanProviderProof },
  { name: 'stale_pending', run: scanStalePending },
  { name: 'payment_order_provider_mismatch', run: scanPaymentOrderProviderMismatch },
  { name: 'completed_without_proof', run: scanCompletedWithoutProof },
  { name: 'missing_audit', run: scanMissingAudit },
  { name: 'ambiguous_provider', run: scanAmbiguousProvider },
];

/**
 * Run all invariant scanners on an in-memory snapshot (detect-only).
 * @param {import('./snapshotTypes.js').ReliabilityScanSnapshot | unknown} rawSnapshot
 * @returns {import('./types.js').ReliabilityScanReport}
 */
export function runReliabilityDetectOnlyScan(rawSnapshot) {
  const snapshot = normalizeSnapshot(rawSnapshot);
  if (!snapshot.scanAt) {
    snapshot.scanAt = new Date().toISOString();
  }

  /** @type {import('./types.js').DiagnosticFinding[]} */
  const findings = [];
  for (const { run } of SCANNERS) {
    findings.push(...run(snapshot));
  }

  return buildScanReport(findings, snapshot.scanAt);
}
