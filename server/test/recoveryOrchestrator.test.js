import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * Static contract: composed tick must not fail closed when one stage throws — operators rely on
 * SLA/repair/verification running even if e.g. processing recovery errors.
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
const srcPath = join(__dirname, '../src/services/recoveryOrchestrator.js');

describe('recoveryOrchestrator (composition contract)', () => {
  it('isolates each stage with try/catch and aggregates errors', () => {
    const src = readFileSync(srcPath, 'utf8');
    assert.ok(src.includes('errors.processingRecovery'));
    assert.ok(src.includes('errors.reconciliationRepair'));
    assert.ok(src.includes('errors.providerVerification'));
    assert.ok(src.includes('errors.safeQueueRetry'));
    assert.ok(src.includes("emitResilienceStructuredLog({"));
    assert.ok(src.includes('tick_complete'));
    const tryCount = (src.match(/\btry\s*\{/g) ?? []).length;
    assert.ok(tryCount >= 7, `expected per-stage try blocks, got ${tryCount}`);
  });

  it('invokes stages in runtime order (await bodies, not import lines)', () => {
    const src = readFileSync(srcPath, 'utf8');
    /** First occurrence in tick body — imports also mention repair/sla; slice past imports. */
    const body = src.slice(src.indexOf('export async function runRecoveryOrchestratorTick'));
    const idx = (fn) => body.indexOf(`await ${fn}`);
    const order = [
      idx('runProcessingRecoveryTick'),
      idx('runPaymentFulfillmentReconciliationTick'),
      idx('runSlaGuardTick'),
      idx('runReconciliationRepairTick'),
      idx('runRecoveryClosedLoopTick'),
      idx('runProviderTruthVerificationTick'),
      idx('executePhase1RecoveryScanOnce'),
    ];
    assert.ok(order.every((n) => n >= 0), 'all stages present in tick body');
    for (let i = 1; i < order.length; i++) {
      assert.ok(order[i - 1] < order[i], `stage ${i} after ${i - 1}`);
    }
  });
});
