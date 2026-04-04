/**
 * Structured audit trail in `AuditLog` — never pass card numbers, tokens, or raw webhook bodies.
 * @param {import('@prisma/client').Prisma.TransactionClient | import('@prisma/client').PrismaClient} db
 */
export async function writeOrderAudit(db, { event, payload, ip }) {
  const safe = { ...payload };
  delete safe.authorization;
  delete safe.stripeSignature;
  await db.auditLog.create({
    data: {
      event: String(event),
      payload: JSON.stringify(safe),
      ip: ip ? String(ip).slice(0, 64) : null,
    },
  });
}
