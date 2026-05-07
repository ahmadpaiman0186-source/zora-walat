import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { afterEach, test } from 'node:test';

import {
  incrementWindow,
  getWindowCount,
  resetTestStore,
  addDistinctToWindow,
} from '../src/fraud/velocityStore.js';

afterEach(() => {
  resetTestStore();
});

test('incrementWindow and getWindowCount (in-memory path)', async () => {
  const k = `fraud:user:test-velocity-${randomUUID()}`;
  const a = await incrementWindow(k, 120);
  const b = await incrementWindow(k, 120);
  assert.equal(a, 1);
  assert.equal(b, 2);
  const g = await getWindowCount(k);
  assert.equal(g, b);
});

test('addDistinctToWindow counts unique members', async () => {
  const k = `fraud:idempotency_rotation:${randomUUID()}`;
  const n1 = await addDistinctToWindow(k, 'idem-a', 120);
  const n2 = await addDistinctToWindow(k, 'idem-b', 120);
  const n3 = await addDistinctToWindow(k, 'idem-a', 120);
  assert.equal(n1, 1);
  assert.equal(n2, 2);
  assert.equal(n3, 2);
});

