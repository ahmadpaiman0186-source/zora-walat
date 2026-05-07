/**
 * Integration-test-only: delete users created for wallet tests even when an older Postgres
 * deployment still has `trg_user_wallet_ledger_immutable` (BEFORE DELETE on `UserWalletLedgerEntry`).
 *
 * Uses `SET LOCAL session_replication_role = 'replica'` **inside a single Prisma transaction** so
 * row-level DELETE triggers that are not `ENABLE REPLICA` / `ENABLE ALWAYS` are skipped for that
 * transaction only (same connection). Foreign keys still apply; production application code must
 * never call this helper.
 *
 * Current migrations use `trg_user_wallet_ledger_no_update` (UPDATE only); CASCADE user delete
 * then works without this — the helper remains harmless.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string[]} userIds
 */
export async function deleteWalletIntegrationTestUsers(prisma, userIds) {
  if (!userIds.length) return;
  const ids = [...userIds];
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('session_replication_role', 'replica', true)`;
    await tx.user.deleteMany({ where: { id: { in: ids } } });
  });
}
