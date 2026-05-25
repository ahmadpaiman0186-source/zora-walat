# STR-08 Invalid-Signature Observability Probe Evidence

**Date:** 2026-05-25
**Approval phrase:** `APPROVE STR-08 STAGING INVALID-SIGNATURE OBSERVABILITY PROBE ONLY`
**Status:** **PROBE EXECUTED ONCE / LOG CAPTURE PENDING**

---

## Scope

Exactly one non-Stripe invalid-signature HTTP `POST` is approved to:

```text
https://zora-walat-api-staging.vercel.app/webhooks/stripe
```

No Stripe resend/replay/test event, Stripe CLI trigger, live mode, production endpoint, deploy/redeploy, Vercel settings/env/domain edit, DB/payment/wallet/order mutation, credential rotation, self-healing apply, or second HTTP probe is authorized.

---

## Evidence Files

| File | Purpose |
|------|---------|
| `EVIDENCE_MANIFEST.md` | Evidence IDs STR08-001 through STR08-008 |
| `STR08_OPERATOR_RUNBOOK.md` | Probe and capture rules |
| `STR08_CAPTURE_MATRIX.md` | Marker capture matrix |
| `STR08_FINAL_CONSERVATIVE_VERDICT.md` | Final conservative verdict |

---

## Conservative Baseline

| Item | Status |
|------|--------|
| STR-08 invalid-signature probe | **EXECUTED ONCE** |
| Stripe resend/replay/test event | **NOT EXECUTED** |
| Payment processing proof | **NOT PROVEN** |
| Full webhook processing proof | **NOT PROVEN** |
| STR-06 observability runtime visibility | **PENDING OPERATOR LOG CAPTURE** |
| Fix | **NOT FULLY PROVEN** |
| Production / real-money / controlled pilot | **NO-GO** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

## Probe Result

| Field | Value |
|-------|-------|
| Timestamp UTC | `2026-05-25T21:07:23.278Z` |
| Endpoint | `https://zora-walat-api-staging.vercel.app/webhooks/stripe` |
| Method | `POST` |
| Request type | Synthetic invalid-signature payload |
| HTTP status | `400` |
| Body summary | Empty response body |
| Probe count | Exactly one |
| Retry | Not executed |

---

*STR-08 evidence folder - one approved invalid-signature probe executed*
