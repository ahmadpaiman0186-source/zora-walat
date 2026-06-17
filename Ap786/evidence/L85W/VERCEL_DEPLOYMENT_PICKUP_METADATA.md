# L-85W — Vercel deployment pickup metadata

**Method:** Operator Vercel UI observation — **metadata only, no env values, no redeploy in this gate**  
**Project:** **`zora-walat-api-staging`**

---

## Operator-observed latest deployment (post-L-85V)

| Field | Operator attestation |
|-------|---------------------|
| Deployment visible after L-85V env add | **YES** |
| Deployment status | **Ready** |
| Source branch | **main** |
| Source commit short hash (UI) | **Not recorded** — operator attested commit is **at or after** PR #282 merge `3331918` |
| Deployment created time (UI) | **Not recorded** in this attestation |
| Commit at or after PR #282 merge (`3331918`) | **YES** |
| Vercel indicated deployment after `READ_ONLY_DATABASE_URL` addition | **YES** |
| Manual redeploy performed in L-85W | **NO** |
| Manual redeploy performed by operator (any time in gate) | **NO** (attested) |

---

## Classification

| Flag | Value | Rationale |
|------|-------|-----------|
| `DEPLOYMENT_PICKUP_METADATA` | **OBSERVED** | Ready deployment on `main` at/after L-85V merge; Vercel ties to post-env-add |
| `RUNTIME_ENV_VALUE_PICKUP` | **NOT PROVEN** | No live endpoint; no env value inspection; no authenticated path exercised |
| `RUNTIME_DB_IDENTITY_PROVEN` | **NO** | No DB proof |
| `L85M_GO` | **STILL NO** | Authenticated runtime proof not authorized/performed |

---

## What this gate does not prove

- Active serverless handler reads non-empty `READ_ONLY_DATABASE_URL` at runtime
- Connection string validity
- Role `zora_walat_readonly_audit` at runtime
- `readonly_url_missing` would not occur on authenticated request

---

*End.*
