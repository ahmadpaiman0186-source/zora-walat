# L-86D — Risk and non-merge rationale

---

## Why PR #5 direct merge remains NO

| Risk | Detail |
|------|--------|
| **Stale branch** | 634+ commits behind `main` (L-86C) |
| **Duplicate logic** | Core modules already on `main` with **different** dispute failure contract |
| **Merge conflict** | High probability on webhook, incidents, health |
| **Behavior regression** | PR pre-tx 503 vs current in-tx graceful path — unreviewed blast radius |
| **Proof chain** | L-85M **NO PASS**; L-85X deploy routing unresolved for ops proof |
| **CI** | No fresh checks on current `main` |
| **Accidental merge** | Sole open legacy PR — HIGH governance risk |

## Payment / webhook specific risks if merged verbatim

| Surface | Risk |
|---------|------|
| Stripe webhook ack semantics | 503 vs 200 on lookup failure affects Stripe retry storms |
| Transaction boundaries | Pre-tx vs in-tx lookup changes idempotency / audit trail |
| Test override in `stripe.js` | Production guard required; absent on `main` today |
| Slim vs full Express webhook entry | L-85X — deploy root affects which handler runs |

## Rebuild vs merge

| Path | Safer? |
|------|--------|
| Merge PR #5 | **NO** |
| Rebuild selected tests on `main` after contract decision | **YES** (still requires L-86E authorization + proof gates) |

---

*End.*
