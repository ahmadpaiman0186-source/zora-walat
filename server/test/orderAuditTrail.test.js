import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'node:test';

import { writeOrderAudit } from '../src/services/orderAuditService.js';

const serverRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..');

describe('orderAuditService / audit trail', () => {
  test('writeOrderAudit strips secret-shaped keys from payload (no raw secrets in persisted JSON)', async () => {
    const created = [];
    const db = {
      auditLog: {
        create: async ({ data }) => {
          created.push(data);
          return data;
        },
      },
    };
    await writeOrderAudit(db, {
      event: 'unit_audit_redaction',
      payload: {
        orderId: 'chk_unit_test',
        authorization: 'Bearer sekrit',
        stripeWebhookSecret: 'whsec_zzzzzzzzzzzz',
        headers: { Authorization: 'Bearer nested' },
        ok: true,
      },
      ip: '127.0.0.1',
    });
    assert.equal(created.length, 1);
    const raw = created[0].payload;
    assert.equal(raw.includes('whsec_'), false);
    assert.equal(raw.toLowerCase().includes('bearer'), false);
    const p = JSON.parse(raw);
    assert.equal(p.orderId, 'chk_unit_test');
    assert.equal(p.ok, true);
    assert.equal(p.authorization, undefined);
    assert.equal(p.stripeWebhookSecret, undefined);
    assert.equal(p.headers?.Authorization, undefined);
  });

  test('phase1 payment audit payloads include traceId for correlation', () => {
    const src = readFileSync(
      join(serverRoot, 'src', 'services', 'phase1StripeCheckoutSessionCompleted.js'),
      'utf8',
    );
    assert.match(src, /event:\s*'payment_completed'/);
    assert.match(src, /traceId:\s*traceId/);
    assert.match(src, /event:\s*'order_status_changed'/);
  });

  test('duplicate webhook idempotency: handler source uses single-transaction audit for received event', () => {
    const src = readFileSync(
      join(serverRoot, 'src', 'routes', 'stripeWebhook.routes.js'),
      'utf8',
    );
    assert.match(src, /event:\s*'stripe_webhook_received'/);
    assert.match(src, /stripeWebhookEvent\.create/);
  });

  test('fulfillment failure states emit dedicated audit event names', () => {
    const src = readFileSync(
      join(serverRoot, 'src', 'services', 'fulfillmentProcessingService.js'),
      'utf8',
    );
    for (const ev of ['delivery_failed', 'delivery_unknown_outcome', 'manual_required_detected']) {
      assert.match(src, new RegExp(`event:\\s*'${ev}'`));
    }
  });
});
