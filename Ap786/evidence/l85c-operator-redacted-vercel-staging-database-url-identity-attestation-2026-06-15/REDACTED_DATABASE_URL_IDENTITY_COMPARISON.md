# L-85C — Redacted DATABASE_URL identity comparison

**Purpose:** Compare Vercel staging `DATABASE_URL` identity (operator-redacted) to L-85A queried Neon endpoint.

**No secret values in this document.**

---

## Reference — L-85A queried DB identity (known)

| Field | Value |
|-------|-------|
| Host | `ep-wild-wind-appeopzn-pooler.c-7.us-east-1.aws.neon.tech` |
| Database | `neondb` |
| Session user (SELECT) | `neondb_owner` |
| Port | `5432` |
| SSL | `require` |

Source: [L-85A DB_ACCESS_SAFETY_ATTESTATION.md](../l85a-direct-db-audit-zero-write-verification-2026-06-15/DB_ACCESS_SAFETY_ATTESTATION.md)

---

## Vercel staging — Side B (L-85C operator attestation)

| Field | Recorded in L-85C |
|-------|-------------------|
| Project | **`zora-walat-api-staging`** |
| Operator opened `DATABASE_URL` in dashboard | **YES** |
| `DATABASE_URL` exists | **YES** |
| Environment scope | **Production** |
| Sensitive label | **YES** |
| Stored value visible in edit UI | **NO** — placeholder example only |
| Host | **NOT CAPTURED** |
| Database name | **NOT CAPTURED** |
| Port | **NOT CAPTURED** |
| SSL mode | **NOT CAPTURED** |
| Username presence | **NOT CAPTURED** |

---

## Field-by-field match matrix

| Field | L-85A (A) | Vercel staging (B) | Match |
|-------|-----------|-------------------|-------|
| Host | `ep-wild-wind-appeopzn-pooler.c-7.us-east-1.aws.neon.tech` | **NOT CAPTURED** | **UNPROVEN** |
| Database | `neondb` | **NOT CAPTURED** | **UNPROVEN** |
| Port | `5432` | **NOT CAPTURED** | **UNPROVEN** |
| SSL | `require` | **NOT CAPTURED** | **UNPROVEN** |
| Overall identity | — | — | **NOT DIRECTLY PROVEN** |

---

## Contradiction check

| Check | Result |
|-------|--------|
| Mismatch explicitly observed | **NO** — stored connection fields never visible |
| L-85A identity contradicted | **NO** |
| Operator attestation: secret exposure | **NO** |

---

*End.*
