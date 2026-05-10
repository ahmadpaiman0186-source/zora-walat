# L31 — Payment risk and compliance matrix

**Use:** Map **risk events** to **owners**, **actions**, and **launch blockers**. Compliance column is **concern identification**, not legal determination.

| Risk event | Compliance / integrity concern | Detection source | Owner | Immediate action | Forbidden action | Evidence required | Customer/support handoff (L30) | Launch-blocking? |
|------------|----------------------------------|------------------|-------|------------------|------------------|-------------------|--------------------------------|------------------|
| Payment captured / no fulfillment | Customer harm; regulatory complaint risk | Recon, `stuckSignals`, Stripe PI succeeded | On-call + L2 support | Stop bulk replay; diagnose queue/DB | Manual provider send off-books | Order/PI suffixes, recon snapshot | Payment pending / fulfillment delayed | **Yes** if widespread |
| Refund request | Chargeback risk if mishandled | Support ticket, Stripe | Finance | Stripe Dashboard workflow per policy | Unauthorized goodwill refund | Ticket id, charge id suffix | Refund/dispute templates | No if process followed |
| Dispute / chargeback | Network rules; evidence deadlines | Stripe Disputes | Finance + legal counsel | Respond in window; gather fulfillment proof | Ignoring deadlines | Dispute id, fulfillment refs | Neutral comms | **Yes** if systematic failure to respond |
| Duplicate webhook | Double settlement / duplicate fulfillment | Logs, `StripeWebhookEvent`, Stripe events | Engineering | Fix handler; finance reconcile | Delete webhook rows | Event id histogram | Investigation wording | **Yes** if duplicate capture |
| Failed provider fulfillment | Service delivery failure | Fulfillment logs, provider codes | Ops + L28 owner | Classify kill-switch vs retry | Bypass amount limits | Attempt ids (redacted) | Fulfillment delayed | No if isolated |
| Ledger mismatch | Financial misstatement | `moneyPathAlert`, recon REQUIRED | Finance + engineering | Read-only analysis; freeze risky replay | SQL journal update | Recon export hash | Generic investigation | **Yes** until scoped |
| Suspicious high-volume activity | Fraud / AML concern (org-specific) | Velocity store, Stripe Radar | Security + finance | Throttle / hold | Public fraud accusation | Aggregated metrics | Neutral review message | **Yes** if unchecked ring |
| Country / geo restriction event | Sanctions / licensing (org-specific) | Geo block logs, signup metadata | Compliance + security | Block/limit per policy | Ad-hoc IP bans without record | Policy citation, log sample | Access limitation template | **Yes** if operating in wrong regions |
| Manual recovery request | Insider / social engineering | Admin audit, ticket pattern | Security champion | Verify requester; dual control | Single-person money move | Approver names, ticket | L30 authority matrix | **Yes** if dual control missing |
| Sandbox / live mode mismatch | Wrong money / wrong credentials | Startup logs, `/ready` Reloadly block | Engineering | Fix env; redeploy | Ignoring mismatch in prod | Env name checklist screenshot (blurred) | N/A internal | **Yes** if prod affected |

---

## Notes

- **KYC / AML / sanctions:** Program scope is **organization-defined**; this matrix flags where counsel typically engages.
- **PR #5:** Dispute webhook hardening may change retry/503 behavior — revisit matrix after L27 verified.
- **L30:** [`../support/L30_MANUAL_RECOVERY_AUTHORITY_MATRIX.md`](../support/L30_MANUAL_RECOVERY_AUTHORITY_MATRIX.md) for who may act.

---

## References

- [`../PHASE1_REFUND_AND_DISPUTE.md`](../PHASE1_REFUND_AND_DISPUTE.md)  
- [`../FINANCE_TRUTH_AND_RECONCILIATION.md`](../FINANCE_TRUTH_AND_RECONCILIATION.md)  
- [`L31_FRAUD_ABUSE_RESPONSE_RUNBOOK.md`](./L31_FRAUD_ABUSE_RESPONSE_RUNBOOK.md)
