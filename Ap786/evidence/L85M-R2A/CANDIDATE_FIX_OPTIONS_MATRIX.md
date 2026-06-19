# L-85M-R2A — Candidate fix options matrix

---

| Option | Files that would change later | Scope of mutation | Blast radius | Impact `/webhooks/stripe` | Impact `/health` | Impact `/ops/db-readonly-proof` | Impact `/ops/health` | Deploy required | Endpoint proof | DB proof | Risk | Recommendation |
|--------|------------------------------|-------------------|--------------|---------------------------|------------------|-----------------------------------|----------------------|-----------------|----------------|----------|------|----------------|
| **A** — root `api/ops` bridges only | `api/ops/db-readonly-proof.mjs`, `api/ops/health.mjs` | New bridge files | **Low** — isolated handlers | **None** (if webhook untouched) | **None** | **Partial** — needs `/api/ops/*` URL unless paired with B | Same | **YES** after merge | R4 after deploy | R5 after R4 | **MEDIUM** without rewrites | **Insufficient alone** |
| **B** — root `vercel.json` rewrites | `vercel.json` | 2 targeted rewrites | **Low** if specific paths only | **None** if webhook rewrite preserved | **None** | **YES** when paired with A | **YES** when paired with A | **YES** | R4 | R5 | **MEDIUM** | **Required complement to A** |
| **A+B (minimal)** | `vercel.json`, `api/ops/db-readonly-proof.mjs`, `api/ops/health.mjs` | 3 files, ~same pattern as stripe bridge | **Low–medium** | **None** (additive) | **None** | **YES** — exposes L-85P pre-bootstrap path | **YES** — Express `/ops/health` via handler replay | **YES** (R3 pickup) | **R4** structural 401 | **R5** auth proof | **LOW–MEDIUM** | **RECOMMENDED** |
| **C** — Vercel Root Directory = `server` | Vercel project UI (not tracked) | Entire deploy surface | **HIGH** — Next.js root app dropped from project | **Breaks** root bridge path unless dual projects | Changes probe paths | **YES** via catch-all | **YES** | **YES** | R4/R6 | R5 | **HIGH** | **NOT RECOMMENDED** |
| **D** — defer | — | None | None | — | — | Stays 404 | Stays 404 | No | No | No | **LOW** (blocked) | Superseded — design complete in R2A |

---

## Option notes

### Why A alone is insufficient

Vercel root deploy maps `api/foo.mjs` → `/api/foo`, **not** `/ops/foo`. Without **specific** rewrites, public paths remain wrong for L-85M target URLs.

### Why not catch-all `/ops/:path*`

STR-02 verifier treats broad catch-alls as **dangerous**; risks intercepting unrelated traffic and complicating Next.js coexistence.

### Why not Option C

L-85O/L-85W attested git production deploy from **`main` at root**. Changing Root Directory to `server` mutates **platform config**, may orphan Next.js storefront on same project, and bypasses proven `api/webhooks/stripe.mjs` bridge without separate authorization.

---

*End.*
