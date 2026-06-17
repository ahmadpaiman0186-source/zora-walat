# L-85U — Staging env-key presence matrix

**Target:** `zora-walat-api-staging`  
**Future route:** `GET /ops/db-readonly-proof`  
**Values:** **NOT RECORDED**

---

## Required keys for future L-85M

| Env key name | Key present (operator) | Value inspected | Value validity proven | Runtime binding proven |
|--------------|------------------------|-----------------|----------------------|------------------------|
| `READ_ONLY_DATABASE_URL` | **UNKNOWN** | **NO** | **NO** | **NO** |
| `OPS_HEALTH_TOKEN` | **UNKNOWN** | **NO** | **NO** | **NO** |

## Scope

| Field | Operator answer |
|-------|-----------------|
| Vercel environment scope | **UNKNOWN** |

---

## Derived flags

| Flag | Value | Rule |
|------|-------|------|
| `KEY_NAME_PRESENCE_ATTESTED` | **NO** | Both keys must be YES for YES |
| `VALUE_VALIDITY_PROVEN` | **NO** | No value inspection in this gate |
| `RUNTIME_BINDING_PROVEN` | **NO** | No deploy, no live proof |
| `L85M_GO` | **NO** | Blockers remain |
| `L85M_BLOCKED` | **YES** | UNKNOWN or absent key → blocked |

---

## Keys explicitly not attested in this gate

| Key | Reason |
|-----|--------|
| `DATABASE_URL` | Out of scope — owner connection; must not be used for readonly proof |
| Stripe/payment/provider keys | Out of scope |

---

*End.*
