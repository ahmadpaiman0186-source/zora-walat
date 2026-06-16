# L-85H — Operator rotation attestation

**Gate:** L-85H credential hygiene / screenshot-exposure re-rotation  
**Date:** 2026-06-16

Operator-attested facts (no secret values recorded):

| Field | Attestation |
|-------|-------------|
| Possible prior visual exposure | Prior screenshots **may have** visually exposed secret material during L-85G setup — treated as exposure for hygiene purposes |
| Neon password reset for `zora_walat_readonly_audit` | **YES** |
| Connection pooling when copying URL | **OFF** |
| Direct non-pooled connection used locally | **YES** (safe-check `DIRECT_NON_POOLER_HOST=PASS`) |
| `READ_ONLY_DATABASE_URL` replaced in `server/.env.local` | **YES** |
| `DATABASE_URL` (owner) rotated | **NO** — not in scope |
| Vercel env updated | **NO** |
| Clipboard cleared after operation | **YES** |
| Password printed in chat / evidence / terminal | **NO** |
| Full URL / host printed | **NO** |

## Scope boundary

Only the **read-only audit role** credential was re-rotated. Application owner credentials and staging Vercel `DATABASE_URL` were **not** changed in this gate.

---

*End.*
