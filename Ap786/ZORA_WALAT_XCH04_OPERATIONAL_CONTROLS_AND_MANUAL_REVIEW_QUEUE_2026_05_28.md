# XCH-04 Operational Controls And Manual Review Queue

**Date:** 2026-05-28
**Status:** **SPECIFICATION ONLY**

---

## 1. Manual review triggers

| Trigger | Queue |
|---------|-------|
| High-risk transaction score | `OPS-HIGH-RISK-*` |
| Reconciliation mismatch | `OPS-RECON-*` |
| Duplicate detection | `OPS-DUP-*` |
| Provider outage / degraded | `OPS-PROV-OUT-*` |
| Sanctions / AML hold (future) | `OPS-COMP-*` |
| Large amount threshold | `OPS-LARGE-*` |

All holds → **fail closed** — no release without approval.

---

## 2. Hold types

| Hold | Effect |
|------|--------|
| High-risk transaction hold | Block settlement release |
| Reconciliation mismatch hold | Block corridor close |
| Duplicate detection hold | Block payout + alert |
| Provider outage hold | Fail closed — no new settlements on affected rail |

---

## 3. Operator approval model

| Level | Scope |
|-------|-------|
| L1 Ops | Release low-severity recon exceptions |
| L2 Finance | Adjustments, write-offs |
| L3 Compliance / Legal | Regulatory holds, corridor unlock |

Dual control for material amounts → **finance gate**.

---

## 4. Escalation model

| Severity | SLA | Escalate to |
|----------|-----|-------------|
| Critical (duplicate, imbalance) | 1h | On-call + finance |
| High (recon critical) | 4h | Ops lead |
| Medium (aging recon) | 24h | Ops queue |

---

## 5. Release / rollback boundary

| Action | Boundary |
|--------|----------|
| Release hold | Documented approval + audit entry |
| Rollback spec | Revert Ap786 docs only — **no production ledger impact** |
| Emergency stop | Kill switch for settlement submission — **future gate** |

No self-healing auto-release.

---

*XCH-04 operational controls — spec only*
