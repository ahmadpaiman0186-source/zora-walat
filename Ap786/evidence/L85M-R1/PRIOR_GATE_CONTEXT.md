# L-85M-R1 — Prior gate context

---

## L-85M — Authenticated runtime DB proof

| Fact | Value |
|------|--------|
| Verdict | **BLOCKED** — `L-85M_BLOCKED__NO_RUNTIME_PROOF` |
| Staging attempt | `GET /ops/db-readonly-proof` → **HTTP 404** HTML |
| `/health` on same host | **200** JSON |
| `/ops/health` | **404** HTML |
| Token used in gate | **NO** (missing in agent env) |

## L-85X — Route exposure audit

| Classification | Detail |
|----------------|--------|
| Cause | **VERCEL_ENTRYPOINT_MISMATCH** + **BUILD_TARGET_MISMATCH** |
| Root deploy | Next.js + limited rewrites — **no `/ops/*` mapping** |
| `server/` deploy | Catch-all → `server/api/index.mjs` — **ops routes exposed** |
| L-85O context | Staging project Root Directory attested **`.`** (repo root) |

## L-86D / L-86E-0 — PR #5 dispute contract

| Fact | Value |
|------|--------|
| PR #5 | **KEEP_OPEN_BLOCKED** — only open legacy PR |
| L-86E-1 | **DEFERRED** until runtime/webhook surface stabilized |
| Contract | Option C defer; Option B de facto on `main` source |

## Reconciliation trigger

L-85M 404 + L-85X classification remain the active blockers for **R5** (authenticated DB proof). This gate reconciles **tracked source vs deployed mapping** without live calls.

---

*End.*
