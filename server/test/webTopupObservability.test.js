import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, it } from 'node:test';

import {
  clearWebtopDurableLogEnabledOverrideForTests,
  clearWebtopDurableLogPathOverrideForTests,
  setWebtopDurableLogEnabledOverrideForTests,
  setWebtopDurableLogPathOverrideForTests,
} from '../src/lib/webtopDurableLogSink.js';
import {
  queryWebTopupObservations,
  sanitizeWebTopupObservationFields,
  webTopupLog,
} from '../src/lib/webTopupObservability.js';

describe('webTopupObservability', () => {
  afterEach(() => {
    clearWebtopDurableLogPathOverrideForTests();
    clearWebtopDurableLogEnabledOverrideForTests();
  });

  it('sanitizeWebTopupObservationFields removes risky keys', () => {
    const o = sanitizeWebTopupObservationFields({
      orderId: 'tw_ord_x',
      token: 'secret',
      nested: { password: 'x', ok: true },
    });
    assert.equal(o.orderId, 'tw_ord_x');
    assert.equal(o.token, undefined);
    assert.equal(o.nested.password, undefined);
    assert.equal(o.nested.ok, true);
  });

  it('queryWebTopupObservations filters by orderId', () => {
    webTopupLog(undefined, 'info', 'payment_received', {
      orderId: 'tw_ord_filter_test',
      traceId: 't1',
    });
    const rows = queryWebTopupObservations({
      orderId: 'tw_ord_filter_test',
      limit: 20,
    });
    assert.ok(rows.length >= 1);
    const last = rows[rows.length - 1];
    assert.equal(last.event, 'payment_received');
    assert.equal(last.orderId, 'tw_ord_filter_test');
  });

  it('webTopupLog does not throw when durable sink cannot write', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'wt-obs-bad-'));
    try {
      setWebtopDurableLogEnabledOverrideForTests(true);
      setWebtopDurableLogPathOverrideForTests(dir);
      webTopupLog(undefined, 'info', 'payment_received', {
        orderId: 'tw_ord_sink_fail',
        traceId: 't-sink',
      });
      const rows = queryWebTopupObservations({ orderId: 'tw_ord_sink_fail', limit: 5 });
      assert.ok(rows.length >= 1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
