# STR-11 Test Matrix

**Date:** 2026-05-25
**Status:** **FUTURE TEST REQUIREMENTS / NOT EXECUTED**

---

## 1. Future Required Tests

| Test Area | Required Coverage |
|-----------|-------------------|
| Audit field allowlist | Only approved fields can be recorded |
| Secret redaction | Raw body, signature header, webhook secret, API keys, auth headers are absent |
| PII exclusion | Customer email, phone, card/bank data, and raw metadata are absent |
| Invalid signature path | Records `signature_verification_status=invalid` without processing event payload |
| Missing signature path | Records `missing` status without secrets |
| Verified event path | Records event id/type only after verification |
| Idempotency status | Records new/duplicate/skipped/error status without side effects |
| ACK status | Records response status and latency |
| No payment mutation | Audit-only writes do not change payment/order/wallet/balance/service state |
| Duplicate safety | Duplicate events do not create duplicate transaction side effects |
| Failure path | Redacted error code only; no stack trace or payload leakage |

---

## 2. Future Validation Commands

A future STR-12 implementation should define exact commands, likely including:

```text
git diff --check
npm --prefix server run secrets:scan
focused webhook audit tests
focused slim webhook regression tests
```

Broad test suites must remain capped and must not be run concurrently.

---

## 3. Exit Criteria

STR-12 cannot be considered ready unless:

- Focused tests pass.
- Secrets scan passes.
- No env/config/secret files are changed unless separately approved.
- No payment/order/wallet behavior changes are introduced.
- No raw payload/signature/PII persistence is possible.
- Rollback and abort plan are documented.

---

## 4. Conservative Verdict

No tests were run for STR-11 beyond documentation validation. This matrix defines future implementation requirements only.

---

*Test matrix - future implementation gate only.*
