import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, it } from 'node:test';

import {
  appendWebtopDurableLogLine,
  clearWebtopDurableLogEnabledOverrideForTests,
  clearWebtopDurableLogMaxBytesOverrideForTests,
  clearWebtopDurableLogPathOverrideForTests,
  setWebtopDurableLogEnabledOverrideForTests,
  setWebtopDurableLogMaxBytesOverrideForTests,
  setWebtopDurableLogPathOverrideForTests,
} from '../src/lib/webtopDurableLogSink.js';

describe('webtopDurableLogSink', () => {
  afterEach(() => {
    clearWebtopDurableLogPathOverrideForTests();
    clearWebtopDurableLogEnabledOverrideForTests();
    clearWebtopDurableLogMaxBytesOverrideForTests();
  });

  it('writes structured NDJSON when enabled', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'wt-dur-'));
    const filePath = join(dir, 'evt.ndjson');
    try {
      setWebtopDurableLogEnabledOverrideForTests(true);
      setWebtopDurableLogPathOverrideForTests(filePath);
      await appendWebtopDurableLogLine({
        event: 'payment_received',
        orderId: 'tw_ord_x',
        domain: 'webtopup',
      });
      const raw = await readFile(filePath, 'utf8');
      const line = raw.trim().split('\n')[0];
      const row = JSON.parse(line);
      assert.equal(row.event, 'payment_received');
      assert.equal(row.orderId, 'tw_ord_x');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('does not throw when append target is invalid (directory path)', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'wt-bad-'));
    try {
      setWebtopDurableLogEnabledOverrideForTests(true);
      setWebtopDurableLogPathOverrideForTests(dir);
      await appendWebtopDurableLogLine({ event: 'payment_received', domain: 'webtopup' });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('rotates when file exceeds max bytes (override path)', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'wt-rot-'));
    const filePath = join(dir, 'big.ndjson');
    try {
      setWebtopDurableLogEnabledOverrideForTests(true);
      setWebtopDurableLogPathOverrideForTests(filePath);
      setWebtopDurableLogMaxBytesOverrideForTests(50);
      await writeFile(filePath, 'x'.repeat(60), 'utf8');
      await appendWebtopDurableLogLine({ event: 'fulfillment_succeeded', domain: 'webtopup' });
      const { readdir } = await import('node:fs/promises');
      const names = await readdir(dir);
      assert.ok(names.some((n) => n.includes('.rotated.ndjson')));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
