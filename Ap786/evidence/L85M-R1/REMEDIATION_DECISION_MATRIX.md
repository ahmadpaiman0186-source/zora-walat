# L-85M-R1 — Remediation decision matrix

---

## Options

| ID | Description | Allowed in L-85M-R1? | Operator authorization |
|----|-------------|----------------------|------------------------|
| **R1** | Evidence-only reconciliation; keep L-85M blocked | **YES** — this gate | None (read-only) |
| **R2** | Tracked route registration / Vercel mapping fix; **no deploy** | **Next planning gate** | **Required** for implementation |
| **R3** | Deployment pickup proof; **no live DB proof** | **Not in R1** | **Required** |
| **R4** | Live endpoint structural proof (401 JSON, not 404); **no token** | **Not in R1** | **Required** |
| **R5** | Authenticated read-only DB identity proof (L-85M retry) | **Not in R1** | **Required** — after R4 PASS |
| **R6** | Webhook runtime / money-path proof | **Not in R1** | **Required** — separate from R5 |

## R2 remediation paths (from L-85X, carried forward)

| Path | Change type | Fixes DB proof on root deploy? |
|------|-------------|-------------------------------|
| **A** — Vercel Root Directory = `server` | Platform config | **YES** (uses catch-all) |
| **B** — Root rewrite + `api/` bridge for `/ops/db-readonly-proof` | Tracked config + handler | **YES** (minimal surface) |
| **C** — Repeat CLI deploy from `server/` only | Operational | **Temporary** — git root deploy may overwrite |

## Sequencing (conservative)

```text
R1 (L-85M-R1) → R2 plan/implement → R3 deploy pickup → R4 structural 401 → R5 L-85M retry → R6 webhook proof
                                                      ↘ L-86E-1 still deferred until R4/R5 stable
```

## Current blockers

| Blocker | Blocks |
|---------|--------|
| Root deploy missing `/ops/db-readonly-proof` mapping | R4, R5 |
| L-85M PASS = NO | Global money/DB identity claims |
| L-86E-0 Option C defer | L-86E-1 implementation |

## PR #5

**KEEP_OPEN_BLOCKED** — no merge/close in any R1–R6 step without separate authorization.

---

*End.*
