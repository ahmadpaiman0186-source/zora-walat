# L-85M-R1 — Next gate recommendation

---

## Completed in this gate

**R1** — Evidence-only reconciliation filed. L-85M remains **BLOCKED**. No live calls.

## Recommended next gate: **R2 — route exposure fix (plan or authorized implementation)**

Choose one tracked remediation (operator authorization required for code/config changes):

| Priority | Gate | Action |
|----------|------|--------|
| 1 | **L-85Y / R2** | Document + optionally implement Root Directory **OR** root ops bridge (L-85X Option A or B) |
| 2 | **R3** | Deploy pickup evidence after R2 — no DB proof |
| 3 | **R4** | Unauthenticated `GET /ops/db-readonly-proof` → **401 JSON** (not 404 HTML) |
| 4 | **R5** | L-85M retry — authenticated read-only DB identity proof |
| 5 | **R6** | Webhook runtime proof — separate authorization |
| — | **L-86E-1** | **Remain deferred** until R4/R5 stabilize surface |

## Explicitly not allowed now

- R4 / R5 / R6 in L-85M-R1
- L-85M retry before structural 401 confirmed
- Merge PR #5
- L-86E-1 tests or runtime contract work

## Reconciliation summary

| Surface | Root deploy | Action needed for L-85M |
|---------|-------------|-------------------------|
| DB readonly proof | **Not mapped** | **R2 required** |
| Stripe webhook | **Mapped** | R6 only when authorized |
| `/health` | **Mapped** | None for L-85M |

---

*End.*
