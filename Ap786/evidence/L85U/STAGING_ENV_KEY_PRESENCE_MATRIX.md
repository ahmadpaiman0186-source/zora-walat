# L-85U — Staging env-key presence matrix

**Target:** `zora-walat-api-staging`  
**Future route:** `GET /ops/db-readonly-proof`  
**Values:** **NOT RECORDED**

---

## Required keys for future L-85M

| Env key name | Key present (operator) | Scope (operator) | Value inspected | Value validity proven | Runtime binding proven |
|--------------|------------------------|------------------|-----------------|----------------------|------------------------|
| `READ_ONLY_DATABASE_URL` | **NO** | **NONE / NOT PRESENT** (All Environments search) | **NO** | **NO** | **NO** |
| `OPS_HEALTH_TOKEN` | **YES** | **Production** | **NO** | **NO** | **NO** |

## Scope summary

| Key | Scope |
|-----|-------|
| `READ_ONLY_DATABASE_URL` | **NONE / NOT PRESENT** |
| `OPS_HEALTH_TOKEN` | **Production** |

---

## Derived flags

| Flag | Value | Rule |
|------|-------|------|
| `KEY_NAME_PRESENCE_ATTESTED` | **NO** | `READ_ONLY_DATABASE_URL` absent — both keys required YES |
| `VALUE_VALIDITY_PROVEN` | **NO** | No value inspection in this gate |
| `RUNTIME_BINDING_PROVEN` | **NO** | No deploy, no live proof |
| `L85M_GO` | **NO** | `READ_ONLY_DATABASE_URL` absent |
| `L85M_BLOCKED` | **YES** | Missing required readonly env key |

---

## Keys explicitly not attested in this gate

| Key | Reason |
|-----|--------|
| `DATABASE_URL` | Out of scope — owner connection; must not be used for readonly proof |
| Stripe/payment/provider keys | Out of scope |

---

*End.*
