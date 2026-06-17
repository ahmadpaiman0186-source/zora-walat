# L-85V — Operator env remediation attestation

**Gate UTC:** 2026-06-17  
**Method:** Operator manual Vercel UI — **key metadata only, no values**

---

## Target

| Field | Value |
|-------|-------|
| Vercel project | **`zora-walat-api-staging`** |
| Authorized env key added | **`READ_ONLY_DATABASE_URL`** |
| Scope | **Production only** |
| Sensitive | **ON** |

## Value handling (no value recorded)

| Field | Operator attestation |
|-------|---------------------|
| Value source | Operator-held rotated read-only Neon **direct non-pooled** connection string for role **`zora_walat_readonly_audit`** |
| Value opened/copied/printed in evidence or chat | **NO** |
| Screenshot with value | **NO** |
| Clipboard cleared after operation | **YES** — operator command: `Set-Clipboard -Value "CLIPBOARD_CLEARED_NO_SECRET"` |

## Keys not mutated (operator attested)

| Key | Mutated |
|-----|---------|
| `DATABASE_URL` | **NO** |
| `OPS_HEALTH_TOKEN` | **NO** |
| Stripe/payment/provider env | **NO** |

## Vercel platform signal

| Signal | Operator attestation |
|--------|---------------------|
| Vercel indicated new deployment needed for env changes | **YES** |
| Manual redeploy performed in this gate | **NO** |

## Proof boundaries (this gate)

| Action | Performed |
|--------|-----------|
| Deploy / redeploy | **NO** |
| Live endpoint call | **NO** |
| `OPS_HEALTH_TOKEN` use | **NO** |
| Authenticated proof | **NO** |
| Runtime DB proof | **NO** |

---

*End.*
