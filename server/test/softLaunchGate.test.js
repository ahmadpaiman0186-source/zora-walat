import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  SOFT_LAUNCH_GATE_SCHEMA,
  SOFT_LAUNCH_MANUAL_CHECKLIST,
} from '../src/lib/softLaunchGate.js';

test('manual checklist has required soft-launch items', () => {
  const ids = new Set(SOFT_LAUNCH_MANUAL_CHECKLIST.map((x) => x.id));
  assert.equal(SOFT_LAUNCH_MANUAL_CHECKLIST.length, 7);
  assert.ok(ids.has('stripe_live_keys_rotated'));
  assert.ok(ids.has('stripe_live_webhook_secret'));
  assert.ok(ids.has('reloadly_operator_ids_verified'));
  assert.ok(ids.has('reloadly_outbound_off_until_approval'));
  assert.ok(ids.has('restricted_regions_tested'));
  assert.ok(ids.has('monitoring_alerts_enabled'));
  assert.ok(ids.has('rollback_plan_written'));
  assert.equal(SOFT_LAUNCH_GATE_SCHEMA, 'zora.soft_launch_gate.v1');
});
