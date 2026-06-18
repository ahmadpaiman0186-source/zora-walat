# L-86C — PR #5 risk classification

**Scale:** LOW / MEDIUM / HIGH / UNKNOWN

---

## Per-dimension risk

| Dimension | Level | Drivers |
|-----------|-------|---------|
| **Governance** | **MEDIUM** | Sole remaining open legacy PR; audit ambiguity if left indefinitely |
| **Accidental merge** | **HIGH** | Only open PR; stale branch; runtime/payment paths |
| **Secret exposure** | **LOW** | Patch scan: no live-secret patterns; PR does not add env files |
| **Runtime / deploy** | **HIGH** | Webhook + health/readiness routes; post-L-85X deploy surface sensitivity |
| **Payment / provider** | **HIGH** | Stripe dispute/refund incident paths; `charges.retrieve` in webhook tx |
| **Proof-chain consistency** | **HIGH** | L-85M **NO PASS**; merging bypasses current Ap786 evidence chain |

## Comparison to L-86A / L-85R tiers

L-86A ranked PR #5 as highest-risk open PR. L-86C deep audit **confirms** tier — with added finding that **core runtime themes appear partially superseded on current `main`**, increasing merge-conflict and duplicate-logic risk if merged verbatim.

## Stale signals

| Signal | Value |
|--------|-------|
| Age | **~39 days** since last update |
| Behind `main` | **634 commits** |
| CI checks | Stale / empty at open time (L-86A) |
| Operator activity on PR | **None** since 2026-05-10 |

---

*End.*
