# STR-11 Allowed Changeset

**Date:** 2026-05-25
**Status:** **FUTURE CHANGESET DEFINITION / NOT APPROVED FOR IMPLEMENTATION**

---

## 1. Allowed In Future STR-12 Only If Explicitly Approved

| Area | Future Allowance |
|------|------------------|
| Webhook audit helper | Minimal helper for non-secret audit event creation |
| Webhook route integration | Route-entry, signature status, handler stage, idempotency, ACK metadata recording |
| Tests | Focused unit/integration tests for audit behavior and redaction |
| Docs | Ap786 implementation, test, rollback, and proof docs |
| Persistence | Only if separately approved; schema change requires DB migration approval |

---

## 2. Forbidden In STR-11

| Action | Status |
|--------|--------|
| App/server implementation | **FORBIDDEN** |
| DB migration or schema change | **FORBIDDEN** |
| Stripe action | **FORBIDDEN** |
| Vercel action | **FORBIDDEN** |
| Deploy/redeploy | **FORBIDDEN** |
| HTTP probe | **FORBIDDEN** |
| Resend/replay/test event | **FORBIDDEN** |
| Payment/order/wallet mutation | **FORBIDDEN** |
| Env/config/secret change | **FORBIDDEN** |
| Production/live/real-money/pilot claim | **FORBIDDEN** |

---

## 3. Future Files Must Be Named Before Approval

A future STR-12 request must identify exact files allowed to change. If persistence is selected, it must state whether it uses:

- Existing `AuditLog` with strict typed event payloads.
- Existing `StripeWebhookEvent` extension, only if a schema change is separately approved.
- A new dedicated audit table, only if a DB migration is separately approved.
- A no-schema alternative, if sufficient for staging proof.

No file list is approved by STR-11.

---

## 4. Safety Invariants

Future implementation must preserve:

- No-pay-no-service.
- Idempotent duplicate handling.
- No customer-visible service activation from audit-only work.
- No raw Stripe body storage.
- No Stripe signature header storage.
- No webhook secret or API key storage.
- No card, bank, customer PII, or unredacted metadata storage.

---

*Allowed changeset definition - approval planning only.*
