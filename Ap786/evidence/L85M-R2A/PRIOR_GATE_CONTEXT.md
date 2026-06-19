# L-85M-R2A — Prior gate context

---

## L-85M — Runtime DB proof

| Fact | Value |
|------|--------|
| `GET /ops/db-readonly-proof` on staging | **HTTP 404** HTML |
| L-85M verdict | **BLOCKED** |

## L-85X — Route exposure

| Classification | **VERCEL_ENTRYPOINT_MISMATCH** |
| Root deploy | Next.js + limited rewrites — **no `/ops/*`** |
| `server/` deploy | Catch-all → `server/api/index.mjs` |

## L-85M-R1 — Reconciliation (merged)

| Finding | Detail |
|---------|--------|
| DB proof in source | **YES** — `ops.routes.js` + L-85P pre-bootstrap |
| DB proof root mapping | **NO** |
| Webhook root mapping | **YES** — `vercel.json` → `api/webhooks/stripe.mjs` |
| Next remediation class | **R2** — route mapping fix (design only in R2A) |

## L-86E-0

| Fact | Value |
|------|--------|
| L-86E-1 | **DEFERRED** until runtime/webhook surface stable |
| PR #5 | **KEEP_OPEN_BLOCKED** |

---

*End.*
