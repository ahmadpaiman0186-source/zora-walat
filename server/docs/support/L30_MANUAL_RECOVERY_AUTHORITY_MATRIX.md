# L30 — Manual recovery authority matrix

**Purpose:** Who may approve **risky** operational actions. This is a **policy template** — assign named roles in your org chart.

**Evidence first:** For any money-path action, require ticket id + correlation id suffixes + engineering/finance checklist complete.

---

## Actions and authority

| Action | L1 support | L2 support | On-call engineer | Engineering lead | Finance | Security (L31) | Infra/DBA |
|--------|------------|------------|------------------|------------------|---------|----------------|-----------|
| **Approve customer refund (standard policy)** | No | No | No | No | **Yes** (within limit) | Consult if fraud | No |
| **Approve goodwill / exception refund** | No | No | No | **Yes** + Finance | **Yes** | Consult | No |
| **Retry fulfillment / kick job** | No | No | **Yes** (runbook) | **Yes** | No | No | No |
| **DLQ replay** | No | No | **Yes** (dual review) | **Yes** | No if money ambiguity | No | No |
| **Replay Stripe webhook / send test event** | No | No | **Yes** (staging); prod **dual** | **Yes** | No | No | No |
| **Touch provider dashboard (Reloadly)** | No | No | **Yes** (designated) | **Yes** | No | No | No |
| **Change production env / secrets** | No | No | No | **Yes** (change control) | No | No | No |
| **Run DB restore / failover** | No | No | No | Escalate | **Sign-off** if money impact | No | **Execute** |
| **Silence P0/P1 alerts** | No | No | **Yes** (time-boxed) | **Yes** | Required for ledger class | No | No |
| **Block / delete user (fraud)** | No | No | No | No | No | **Yes** | No |

---

## Two-person review (money path)

Required for:

- DLQ replay when `manualReviewRequired` or recon shows **duplicate fulfillment** risk
- Any production webhook replay that could create side effects
- Refunds above **currency threshold** (define: e.g. **$X** per transaction or **$Y** daily aggregate)

Reviewers: **on-call engineer + engineering lead** OR **engineer + finance** per action type.

---

## Required evidence before action

| Action | Minimum evidence |
|--------|------------------|
| Refund | Stripe charge id, order correlation, policy citation, approver name |
| Fulfillment retry | `phase1-truth` or admin health snapshot, PI succeeded, no dispute hold |
| Webhook replay | Stripe event id, reason, blast-radius note |
| DB restore | L25-approved runbook, backup id, incident commander |

---

## Forbidden without written exception

- Single-person production money-path change for high-value orders
- SQL `UPDATE`/`DELETE` on ledger journal tables (immutable) — see `BACKUP_RESTORE_DRILL.md`
- Using **personal** Stripe accounts or keys
- Silence alerts to avoid staffing a Sev-1

---

## References

- [`L30_SUPPORT_INCIDENT_RECOVERY.md`](../runbooks/L30_SUPPORT_INCIDENT_RECOVERY.md)
- [`../runbooks/INCIDENT_SCENARIOS.md`](../runbooks/INCIDENT_SCENARIOS.md)
- [`../PHASE1_REFUND_AND_DISPUTE.md`](../PHASE1_REFUND_AND_DISPUTE.md)
