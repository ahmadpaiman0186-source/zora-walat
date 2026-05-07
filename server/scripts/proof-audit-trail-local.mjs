/**
 * Local proof: audit trail redaction, reconciliation scan audit row, correlation field presence.
 *
 * - No Stripe / Reloadly outbound.
 * - Does not log secrets.
 *
 * Run: npm --prefix server run proof:audit-trail-local
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { prisma } from '../src/db.js';
import { writeOrderAudit } from '../src/services/orderAuditService.js';
import { runPhase1MoneyFulfillmentReconciliationScan } from '../src/services/phase1MoneyFulfillmentReconciliationEngine.js';

const serverRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..');

function proofLine(obj) {
  // eslint-disable-next-line no-console -- proof contract
  console.log(JSON.stringify({ proof: 'audit_trail_local', ...obj }));
}

async function main() {
  const dbUrl = String(process.env.DATABASE_URL ?? '').trim();
  if (!dbUrl) {
    proofLine({ ok: false, reason: 'DATABASE_URL_unset' });
    throw new Error('DATABASE_URL_unset');
  }

  const marker = `proof_audit_${randomUUID().slice(0, 12)}`;

  await writeOrderAudit(prisma, {
    event: 'audit_trail_local_proof_redaction',
    payload: {
      marker,
      authorization: 'Bearer must-not-persist',
      stripeWebhookSecret: 'whsec_must_not_persist_zzzzzzzzzzzzzzzz',
      headers: { Authorization: 'Bearer nested-must-strip' },
      ok: true,
    },
    ip: '127.0.0.1',
  });

  const redRow = await prisma.auditLog.findFirst({
    where: { event: 'audit_trail_local_proof_redaction', payload: { contains: marker } },
    orderBy: { createdAt: 'desc' },
  });
  assert.ok(redRow, 'expected redaction proof audit row');
  const redPayload = redRow.payload;
  assert.equal(redPayload.includes('whsec_'), false, 'audit payload must not contain whsec_');
  assert.equal(
    redPayload.toLowerCase().includes('bearer'),
    false,
    'audit payload must not contain bearer-shaped secrets',
  );
  const redObj = JSON.parse(redPayload);
  assert.equal(redObj.marker, marker);
  assert.equal(redObj.ok, true);
  assert.equal(redObj.authorization, undefined);
  assert.equal(redObj.stripeWebhookSecret, undefined);

  const traceMarker = `trace_${randomUUID().slice(0, 10)}`;
  await writeOrderAudit(prisma, {
    event: 'audit_trail_local_proof_correlation',
    payload: { marker: traceMarker, traceId: traceMarker },
    ip: null,
  });
  const corrRow = await prisma.auditLog.findFirst({
    where: { event: 'audit_trail_local_proof_correlation', payload: { contains: traceMarker } },
    orderBy: { createdAt: 'desc' },
  });
  assert.ok(corrRow);
  const corr = JSON.parse(corrRow.payload);
  assert.equal(corr.traceId, traceMarker, 'correlation id (traceId) must round-trip in audit JSON');

  const beforeRecon = new Date(Date.now() - 3000);
  await runPhase1MoneyFulfillmentReconciliationScan({ limit: 5, paidIdleMs: 120_000 });
  const reconAudit = await prisma.auditLog.findFirst({
    where: {
      event: 'phase1_reconciliation_scan',
      createdAt: { gte: beforeRecon },
    },
    orderBy: { createdAt: 'desc' },
  });
  assert.ok(reconAudit, 'expected phase1_reconciliation_scan audit after scan');
  const reconObj = JSON.parse(reconAudit.payload);
  assert.equal(reconObj.schema, 'zora.phase1_money_fulfillment_recon.v2');
  assert.equal(typeof reconObj.findingCount, 'number');
  assert.equal(reconAudit.payload.includes('whsec_'), false);

  const phase1Src = readFileSync(
    join(serverRoot, 'src', 'services', 'phase1StripeCheckoutSessionCompleted.js'),
    'utf8',
  );
  assert.match(
    phase1Src,
    /event:\s*'payment_completed'/,
    'payment_completed audit must exist in phase1 completion path',
  );
  assert.match(
    phase1Src,
    /traceId:\s*traceId/,
    'payment_completed path should carry traceId for correlation',
  );

  const fulfillSrc = readFileSync(
    join(serverRoot, 'src', 'services', 'fulfillmentProcessingService.js'),
    'utf8',
  );
  for (const ev of ['delivery_failed', 'delivery_unknown_outcome', 'manual_required_detected']) {
    assert.match(
      fulfillSrc,
      new RegExp(`event:\\s*'${ev}'`),
      `fulfillment audit must include traceable failure-ish event: ${ev}`,
    );
  }

  await prisma.auditLog.deleteMany({
    where: {
      event: {
        in: [
          'audit_trail_local_proof_redaction',
          'audit_trail_local_proof_correlation',
        ],
      },
    },
  });

  proofLine({
    ok: true,
    redactionProofOk: true,
    correlationFieldOk: true,
    reconciliationAuditEvent: 'phase1_reconciliation_scan',
    sourceContractChecksOk: true,
  });
}

(async () => {
  let code = 0;
  try {
    await main();
  } catch (err) {
    code = 1;
    proofLine({
      ok: false,
      error: typeof err?.message === 'string' ? err.message.slice(0, 200) : String(err),
    });
  } finally {
    try {
      await prisma.$disconnect();
    } catch {
      // ignore
    }
    process.exit(code);
  }
})();
