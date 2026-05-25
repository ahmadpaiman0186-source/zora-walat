# Evidence Manifest - STR-08 Invalid-Signature Observability Probe

**Date:** 2026-05-25
**Status:** **SINGLE PROBE EXECUTED / MARKER CAPTURES INGESTED AS NOT FOUND**

---

## Evidence IDs

| Evidence ID | Evidence | Status |
|-------------|----------|--------|
| STR08-001 | Branch/preflight clean evidence | **CAPTURED - GIT PREFLIGHT OUTPUT** |
| STR08-002 | Staging endpoint selected | **CAPTURED - APPROVED ENDPOINT DOCUMENTED** |
| STR08-003 | Single invalid-signature POST command/output | **CAPTURED - HTTP 400 / EMPTY BODY** |
| STR08-004 | Vercel log search `ZW_STRIPE_WEBHOOK_OBSERVABILITY` | **CAPTURED - NOT FOUND / NO LOGS FOUND** |
| STR08-005 | Vercel log search `route_entry` | **CAPTURED - NOT FOUND / NO LOGS FOUND** |
| STR08-006 | Vercel log search `signature_verification_failed` | **CAPTURED - NOT FOUND / NO LOGS FOUND** |
| STR08-007 | Vercel log search `response_sent` | **CAPTURED - NOT FOUND / NO LOGS FOUND** |
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

## Screenshot Artifacts

| Evidence ID | File |
|-------------|------|
| STR08-004 | `STR08-VERCEL-LOG-ZW-OBSERVABILITY-004.png` |
| STR08-005 | `STR08-VERCEL-LOG-ROUTE-ENTRY-005.png` |
| STR08-006 | `STR08-VERCEL-LOG-SIGNATURE-FAILED-006.png` |
| STR08-007 | `STR08-VERCEL-LOG-RESPONSE-SENT-007.png` |

---

*Manifest updated after ingesting Vercel marker screenshots; marker correlation remains not found/inconclusive*
