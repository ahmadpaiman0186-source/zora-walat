import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

import { emitMoneyPathAlert } from '../src/services/moneyPathAlertService.js';

describe('moneyPathAlertService (L14)', () => {
  it('emits structured JSON with severity and code (critical → stderr)', () => {
    const lines = [];
    const done = mock.method(console, 'error', (msg) => {
      lines.push(String(msg));
    });
    try {
      emitMoneyPathAlert('critical', 'unit_test_alert', {
        orderId: 'ord_x',
        traceId: 'tr_1',
        extra: { detail: 'ok' },
      });
    } finally {
      done.mock.restore();
    }
    assert.equal(lines.length, 1);
    const o = JSON.parse(lines[0]);
    assert.equal(o.moneyPathAlert, true);
    assert.equal(o.severity, 'critical');
    assert.equal(o.code, 'unit_test_alert');
    assert.equal(o.orderId, 'ord_x');
    assert.equal(o.traceId, 'tr_1');
    assert.equal(o.detail, 'ok');
    assert.ok(typeof o.t === 'string');
  });

  it('warn severity uses console.warn', () => {
    const lines = [];
    const done = mock.method(console, 'warn', (msg) => {
      lines.push(String(msg));
    });
    try {
      emitMoneyPathAlert('warn', 'unit_warn', { traceId: 't2' });
    } finally {
      done.mock.restore();
    }
    const o = JSON.parse(lines[0]);
    assert.equal(o.severity, 'warn');
  });

  it('sanitizes extra payload (no raw secrets / emails)', () => {
    const lines = [];
    const done = mock.method(console, 'error', (msg) => {
      lines.push(String(msg));
    });
    try {
      emitMoneyPathAlert('critical', 'sanitized_extra', {
        orderId: 'o1',
        extra: {
          contactEmail: 'user@example.com',
          webhookSecret: 'whsec_should_not_appear',
        },
      });
    } finally {
      done.mock.restore();
    }
    const o = JSON.parse(lines[0]);
    assert.ok(String(o.contactEmail).includes('@'));
    assert.ok(!String(o.contactEmail).includes('user'));
    assert.ok(!JSON.stringify(o).includes('whsec_'));
  });
});
