# L-85T — READ_ONLY_DATABASE_URL readiness

**Hygiene gate — no env values read or printed.**

---

## Tracked code consumption (current `main`)

| Location | Consumes `READ_ONLY_DATABASE_URL`? | Notes |
|----------|-----------------------------------|-------|
| `server/src/services/dbReadonlyProofService.js` | **YES** | Proof service only; no `DATABASE_URL` fallback |
| `server/lib/prebootstrapDbReadonlyProofGuard.mjs` | **YES** | Presence check only for pass-through |
| `server/src/routes/ops.routes.js` | **YES** (via service) | `GET /ops/db-readonly-proof` |
| Owner `server/src/db.js` | **NO** | Owner Prisma separate |

**Code readiness:** Implementation expects runtime env key **`READ_ONLY_DATABASE_URL`** on the deployment that serves the proof route.

---

## Staging runtime binding proof

| Question | Answer |
|----------|--------|
| Tracked evidence proves `READ_ONLY_DATABASE_URL` bound on **`zora-walat-api-staging`**? | **NO** |
| L-85M env attestation | **UNKNOWN / NOT VERIFIED** |
| L-85Q deploy mutated env? | **NO** |
| L-85L performed binding? | **NO** (authorization gate only) |

**Classification:** **`BLOCKER_FOR_L85M_AUTHENTICATED_PROOF`**

Without binding proof, authenticated request would hit pre-bootstrap or service path and return `readonly_url_missing` or fail closed — not a valid DB identity proof.

---

## Hygiene requirements (no execution in L-85T)

| Requirement | Purpose |
|-------------|---------|
| Do not read/print `.env.local` | Prevent secret disclosure |
| Do not print URL/host/password/token | Evidence safety |
| Operator binds **only** `READ_ONLY_DATABASE_URL` on staging | Per L-85L authorization scope |
| Do **not** mutate `DATABASE_URL` | Owner connection isolation |
| Value from secure storage only | Post-L-85H rotation hygiene |
| Redeploy staging after bind if env not hot-reloaded | Per L-85L/L-85M runbooks |

---

## Sanitized shape check (future authorized gate — not L-85T)

Operator may authorize a **separate** gate to verify **non-secret structural properties** only, for example:

- Key name is `READ_ONLY_DATABASE_URL` (not `DATABASE_URL`)
- Value non-empty in **process env on deployment** (boolean presence — no value logged)
- Or operator attests Vercel UI binding **without** pasting value into chat or evidence

**L-85T does not perform this check.**

---

## Credential validity

| Claim | Allowed? |
|-------|----------|
| L-85G proved role privileges locally | **YES** (historical, scoped) |
| Current password valid | **NOT CLAIMED** |
| Staging uses `zora_walat_readonly_audit` at runtime | **NOT CLAIMED** until L-85M PASS |

---

*End.*
