# L-85M-R1 — DB readonly proof route reconciliation

---

## Question checklist

| Question | Answer |
|----------|--------|
| Present in tracked source? | **YES** |
| Mounted in Express app? | **YES** — `ops.routes.js` → `GET /db-readonly-proof` |
| Pre-bootstrap handler? | **YES** — `server/api/index.mjs` + `slimDbReadonlyProofPrebootstrapHandler.mjs` (L-85P) |
| Reachable via **root** Vercel mapping? | **NO** |
| Reachable via **server/** Vercel mapping? | **YES** (tracked config) |
| Blocked by missing registration? | **NO** — registration exists |
| Blocked by Vercel routing mismatch? | **YES** — on root deploy (L-85X / L-85M) |
| Absent from current `main`? | **NO** |

## Tracked handler chain (server deploy path)

```text
GET /ops/db-readonly-proof
  → server/api/index.mjs (pre-bootstrap)
       → evaluatePrebootstrapDbReadonlyProof (token / READ_ONLY_DATABASE_URL)
       → blocked: JSON fail-closed (401/503)
       → passThrough: getHandler() → Express ops.routes.js → executeDbReadonlyProof
```

## Root deploy gap

| Layer | Status |
|-------|--------|
| Express route | Exists but **not invoked** — request never reaches `server/api/index.mjs` |
| Root `api/` bridge | **Missing** — no equivalent to `api/webhooks/stripe.mjs` for ops proof |
| Root `vercel.json` rewrite | **Missing** for `/ops/db-readonly-proof` |

## L-85M 404 reconciliation

**Consistent:** Git-connected staging at repo root builds Next.js + root bridges. L-85M **404 HTML** on `/ops/db-readonly-proof` matches **missing root mapping**, not missing source registration.

## Runtime proof status

| Proof type | Status |
|------------|--------|
| Tracked source audit | **PASS** (route exists) |
| Root deploy exposure | **FAIL** (not mapped) |
| L-85M authenticated DB identity | **NOT PROVEN** |
| L-85M PASS | **NO** |

---

*End.*
