# L34 — Data integrity post-failover checklist

**Use:** Immediately after **any** database promotion, restore, or major traffic cutover. **Status** values: `PASS` | `FAIL` | `NOT VERIFIED`.  
**Launch-blocking:** `Y` requires remediation before widening traffic.

| Check | Command / evidence source (when known) | Owner | Status | Launch-blocking |
|-------|----------------------------------------|-------|--------|-----------------|
| Prisma migration status | `npx prisma migrate status` against new primary | Eng | NOT VERIFIED | Y |
| Schema validate | `npx prisma validate` | Eng | NOT VERIFIED | Y |
| Ledger journal immutability | Confirm no unauthorized `UPDATE`/`DELETE` on journal tables | Finance+Eng | NOT VERIFIED | Y |
| Ledger balance consistency | Reconciliation scripts / admin views per `FINANCE_TRUTH_AND_RECONCILIATION.md` | Finance | NOT VERIFIED | Y |
| `StripeWebhookEvent` idempotency | Count duplicate `id` = 0; sample replay noop | Eng | NOT VERIFIED | Y |
| `PaymentCheckout` state consistency | `phase1-truth` / admin recon — no PAID without PI succeeded | Eng | NOT VERIFIED | Y |
| Fulfillment attempts | No duplicate terminal success for same order | Eng | NOT VERIFIED | Y |
| Refunds/disputes | Stripe Dashboard vs internal notes | Finance | NOT VERIFIED | N |
| Reconciliation scans | `phase1-fulfillment` recon — no open REQUIRED without owner | Eng | NOT VERIFIED | Y |
| Support/manual recovery records | Tickets linked; no orphan refunds | Support | NOT VERIFIED | N |
| Audit/event logs | Admin mutations traceable | Eng | NOT VERIFIED | N |
| No duplicate money movement | Stripe charges count vs internal captures | Finance | NOT VERIFIED | Y |
| No partial provider fulfillment | Attempt rows terminal; provider ref present or failed cleanly | Eng | NOT VERIFIED | Y |

---

## Sign-off

| Role | Name | Date (UTC) |
|------|------|------------|
| Engineering | | |
| Finance | | |

---

## References

- [`../runbooks/BACKUP_RESTORE_DRILL.md`](../runbooks/BACKUP_RESTORE_DRILL.md), [`../WALLET_LEDGER_INVARIANT.md`](../WALLET_LEDGER_INVARIANT.md), [`../FINANCE_TRUTH_AND_RECONCILIATION.md`](../FINANCE_TRUTH_AND_RECONCILIATION.md)
