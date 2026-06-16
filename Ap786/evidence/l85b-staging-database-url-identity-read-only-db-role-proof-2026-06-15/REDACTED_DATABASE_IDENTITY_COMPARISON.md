# L-85B — Redacted database identity comparison

**Comparison goal:** Determine whether Vercel staging `DATABASE_URL` points to the same Neon endpoint queried in [L-85A](../l85a-direct-db-audit-zero-write-verification-2026-06-15/DB_ACCESS_SAFETY_ATTESTATION.md).

**No secret values printed in this document.**

---

## Side A — L-85A queried Neon endpoint (SELECT session evidence)

Source: L-85A ephemeral SELECT-only script via `server/bootstrap.js` (local operator credentials).

| Field | Redacted value |
|-------|----------------|
| Host suffix | `ep-wild-wind-appeopzn-pooler.c-7.us-east-1.aws.neon.tech` |
| Port | `5432` |
| Database name | `neondb` |
| DB session user (`current_user`) | `neondb_owner` |
| SSL mode | `require` |
| Username in URL | present (not printed) |
| Password in URL | present (not printed) |

---

## Side B — Vercel staging `DATABASE_URL` (operator / CLI evidence)

Source: `vercel env list production --scope ahmadpaiman0186-sources-projects` (encrypted values only) + **pending** operator dashboard redacted inspection.

| Field | Redacted value |
|-------|----------------|
| Project | **`zora-walat-api-staging`** |
| Env var name | `DATABASE_URL` |
| Environment scope | **Production** (staging project) |
| Host suffix | **UNKNOWN** — not extracted (secret not pulled) |
| Port | **UNKNOWN** |
| Database name | **UNKNOWN** |
| Username presence | **UNKNOWN** |
| SSL mode | **UNKNOWN** |
| Password / full URL | **NOT RECORDED** |

---

## Comparison result

| Check | Result |
|-------|--------|
| Host suffix match (A ↔ B) | **NOT VERIFIED** |
| Database name match | **NOT VERIFIED** |
| Port match | **NOT VERIFIED** |
| SSL mode match | **NOT VERIFIED** |
| User role match | **NOT VERIFIED** |
| Overall staging identity = L-85A endpoint | **NOT PROVEN** |

## Contradiction check

| Check | Result |
|-------|--------|
| L-85A counts contradicted by new evidence | **NO** — no staging hostname obtained to compare |
| Secret exposure during L-85B | **NO** |

---

*End.*
