# Evidence Manifest - STR-08 Invalid-Signature Observability Probe

**Date:** 2026-05-25
**Status:** **SINGLE PROBE EXECUTED / LOG CAPTURE PENDING**

---

## Evidence IDs

| Evidence ID | Evidence | Status |
|-------------|----------|--------|
| STR08-001 | Branch/preflight clean evidence | **CAPTURED - GIT PREFLIGHT OUTPUT** |
| STR08-002 | Staging endpoint selected | **CAPTURED - APPROVED ENDPOINT DOCUMENTED** |
| STR08-003 | Single invalid-signature POST command/output | **CAPTURED - HTTP 400 / EMPTY BODY** |
| STR08-004 | Vercel log search `ZW_STRIPE_WEBHOOK_OBSERVABILITY` | **PENDING OPERATOR CAPTURE** |
| STR08-005 | Vercel log search `route_entry` | **PENDING OPERATOR CAPTURE** |
| STR08-006 | Vercel log search `signature_verification_failed` | **PENDING OPERATOR CAPTURE** |
| STR08-007 | Vercel log search `response_sent` | **PENDING OPERATOR CAPTURE** |
| STR08-008 | Conservative final verdict | **CAPTURED - NOT FULLY PROVEN / NO-GO** |

---

## Probe Boundary

| Item | Rule |
|------|------|
| Probe count | **EXECUTED ONCE** |
| Payload type | Synthetic invalid-signature JSON body |
| Stripe event source | **NO STRIPE EVENT / NO STRIPE CLI / NO REPLAY** |
| Result | HTTP `400`, empty response body |
| Payment proof | **NOT PROVEN BY THIS PROBE** |

---

*Manifest updated after the single approved STR-08 probe*
