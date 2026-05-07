import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Ensures the supervised live-simulation pin stays in bootstrap (regression guard).
 */
test('bootstrap pins ZW_LIVE_SIMULATION_PROOF production-like env after dotenv', () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(dir, '../bootstrap.js'), 'utf8');
  assert.ok(src.includes('ZW_LIVE_SIMULATION_PROOF'));
  assert.ok(src.includes("process.env.NODE_ENV = 'production'"));
  assert.ok(src.includes("process.env.PHASE1_FULFILLMENT_OUTBOUND_ENABLED = 'false'"));
});
