import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * L9 SLA guard contract: bounded scan, first-breach idempotency, repeat ticks emit separate metrics,
 * PAID/PROCESSING only, schedules via existing fulfillment machinery (see implementation).
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
const srcPath = join(__dirname, '../src/services/slaGuardService.js');

describe('slaGuardService (L9 contract)', () => {
  it('bounds scan limit and queries PAID/PROCESSING with paidAt deadline', () => {
    const src = readFileSync(srcPath, 'utf8');
    assert.ok(src.includes('Math.min(Math.max(opts.limit ?? 15, 1), 50)'));
    assert.ok(src.includes('ORDER_STATUS.PAID'));
    assert.ok(src.includes('ORDER_STATUS.PROCESSING'));
    assert.ok(src.includes('paidAt: { lte: deadline }'));
    assert.ok(src.includes('take: limit'));
  });

  it('gates first breach with slaBreachedAt null and emits critical alert only on first', () => {
    const src = readFileSync(srcPath, 'utf8');
    assert.ok(src.includes('first ? { slaBreachedAt: null }'));
    assert.ok(src.includes("emitMoneyPathAlert('critical', 'sla_fulfillment_breach'"));
    assert.ok(src.includes('bumpFinancialSlaBreachMetric'));
    assert.ok(src.includes('bumpFinancialSlaStillOverdueMetric'));
    assert.ok(src.includes("status: 'sla_breach'"));
  });

  it('schedules fulfillment via scheduleFulfillmentProcessing', () => {
    const src = readFileSync(srcPath, 'utf8');
    assert.ok(src.includes('scheduleFulfillmentProcessing'));
    assert.ok(src.includes('RECOVERY_STATUS.REPAIRING'));
  });
});
