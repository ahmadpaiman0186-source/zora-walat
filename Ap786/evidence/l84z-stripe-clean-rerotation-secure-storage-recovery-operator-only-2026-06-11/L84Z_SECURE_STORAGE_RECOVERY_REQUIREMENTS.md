# L-84Z — Secure storage recovery requirements

**Status:** **AUTHORIZED — OPERATOR EXECUTION PENDING**

## Problem statement

[L-84Y](../l84y-vercel-stripe-secret-key-update-blocked-dpapi-invalid-2026-06-11/L84Y_ABORT_REASON.md) blocked with **`DPAPI_FORMAT_BAD`**. Operator could not safely retrieve full live secret for a future Vercel paste gate. Stripe Dashboard keys list shows **masked** values only.

## Recovery requirements (operator)

| Requirement | Mandatory |
|-------------|-----------|
| Full live secret available to operator only | **YES** |
| Storage outside chat/Cursor/GitHub/repo | **YES** |
| Operator read/write validation **PASS** before gate close | **YES** |
| Plaintext secret file in repo | **NO** |
| Secret value recorded in evidence | **NO** |
| Storage product/path/name in evidence | **NO** — not required |

## Acceptable storage (operator choice — not prescribed)

Operator may use any method that satisfies validation **PASS**, for example:

- Password manager secure note (operator-controlled)
- OS-protected encrypted store with **verified** read/write
- Hardware/security tooling operator already uses

**Not acceptable for L-84Z close:**

- Storage validation **FAIL** or **BLOCKED**
- Operator uncertainty whether stored value is complete
- Reliance on masked Stripe list without local verified copy
- Reusing known-bad DPAPI blob without fix/replace

## Relationship to L-84X storage

L-84X attested DPAPI storage outside repo. L-84Y proved that path **invalid for retrieval**. L-84Z may replace storage method entirely; prior L-84X blob must not be assumed usable.

## L-84Z success does NOT mean

| Item | Status |
|------|--------|
| Vercel updated | **NO** |
| Deployment has new key | **NO** |
| L-84 proved | **NO** |

---

*End.*
