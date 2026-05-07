/**
 * Proof: LedgerJournalEntry/LedgerJournalLine are immutable in DB.
 *
 * - INSERT allowed (within a transaction that is rolled back)
 * - UPDATE blocked by trigger
 * - DELETE blocked by trigger
 *
 * Run: node --import ./test/setupTestEnv.mjs scripts/proof-ledger-immutability-local.mjs
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { prisma } from '../src/db.js';

function proofLine(obj) {
  // eslint-disable-next-line no-console -- proof contract
  console.log(JSON.stringify({ proof: 'ledger_immutability_local', ...obj }));
}

async function main() {
  /** @type {{ insertOk: boolean, updateBlocked: boolean, deleteBlocked: boolean, notes: string[] }} */
  const out = {
    insertOk: false,
    updateBlocked: false,
    deleteBlocked: false,
    notes: [],
  };

  const accounts = await prisma.ledgerAccount.findMany({
    select: { id: true },
    take: 2,
  });
  if (accounts.length < 2) {
    proofLine({ ok: false, reason: 'ledger_accounts_missing' });
    process.exit(1);
  }

  try {
    await prisma.$transaction(async (tx) => {
      const entry = await tx.ledgerJournalEntry.create({
        data: {
          idempotencyKey: `proof:immut:${randomUUID()}`,
          eventType: 'PROOF_IMMUTABILITY',
          metadataJson: { proof: true },
        },
      });
      await tx.ledgerJournalLine.createMany({
        data: [
          {
            entryId: entry.id,
            accountId: accounts[0].id,
            debitCents: 100,
            creditCents: 0,
            memo: 'proof_debit',
          },
          {
            entryId: entry.id,
            accountId: accounts[1].id,
            debitCents: 0,
            creditCents: 100,
            memo: 'proof_credit',
          },
        ],
      });
      out.insertOk = true;

      try {
        await tx.ledgerJournalEntry.update({
          where: { id: entry.id },
          data: { eventType: 'MUTATED' },
        });
      } catch (e) {
        const msg = typeof e?.message === 'string' ? e.message : String(e ?? '');
        // Prisma wraps DB exceptions; accept any clear immutability signature.
        out.updateBlocked =
          msg.includes('Ledger is immutable') ||
          msg.toLowerCase().includes('immutable') ||
          msg.includes('prevent_ledger_modification') ||
          msg.includes('P0001');
        if (!out.updateBlocked) {
          out.notes.push(`update_failed_unexpected:${msg.slice(0, 120)}`);
        }
      }

      const line = await tx.ledgerJournalLine.findFirst({
        where: { entryId: entry.id },
        select: { id: true },
      });
      assert.ok(line?.id);
      try {
        await tx.ledgerJournalLine.delete({ where: { id: line.id } });
      } catch (e) {
        const msg = typeof e?.message === 'string' ? e.message : String(e ?? '');
        out.deleteBlocked =
          msg.includes('Ledger is immutable') ||
          msg.toLowerCase().includes('immutable') ||
          msg.includes('prevent_ledger_modification') ||
          msg.includes('P0001');
        if (!out.deleteBlocked) {
          out.notes.push(`delete_failed_unexpected:${msg.slice(0, 120)}`);
        }
      }

      // Roll back proof inserts so we don't leave test ledger rows.
      throw Object.assign(new Error('proof_rollback'), { code: 'PROOF_ROLLBACK' });
    });
  } catch (e) {
    if (!(e && typeof e === 'object' && e.code === 'PROOF_ROLLBACK')) {
      proofLine({
        ok: false,
        error: typeof e?.message === 'string' ? e.message.slice(0, 200) : String(e),
      });
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect().catch(() => {});
  }

  const ok = out.insertOk && out.updateBlocked && out.deleteBlocked;
  proofLine({ ok, ...out });
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  proofLine({
    ok: false,
    error: typeof e?.message === 'string' ? e.message.slice(0, 200) : String(e),
  });
  process.exit(1);
});

