# STR-08 Capture Matrix

**Date:** 2026-05-25
**Status:** **PROBE EXECUTED / MARKER CAPTURES INGESTED AS NOT FOUND**

---

## Capture Matrix

| Evidence ID | Capture | Acceptance Criteria | Status |
|-------------|---------|---------------------|--------|
| STR08-001 | Branch/preflight clean evidence | Correct branch and clean status captured | **CAPTURED - GIT PREFLIGHT OUTPUT** |
| STR08-002 | Staging endpoint selected | Endpoint is `https://zora-walat-api-staging.vercel.app/webhooks/stripe` | **CAPTURED - APPROVED ENDPOINT DOCUMENTED** |
| STR08-003 | Single invalid-signature POST command/output | Exactly one command output with HTTP status/body summary | **CAPTURED - `2026-05-25T21:07:23.278Z`, HTTP `400`, EMPTY BODY** |
| STR08-004 | `ZW_STRIPE_WEBHOOK_OBSERVABILITY` log search | Marker visible or no-result captured | **CAPTURED - NOT FOUND / NO LOGS FOUND** |
| STR08-005 | `route_entry` log search | Marker visible or no-result captured | **CAPTURED - NOT FOUND / NO LOGS FOUND** |
| STR08-006 | `signature_verification_failed` log search | Marker visible or no-result captured | **CAPTURED - NOT FOUND / NO LOGS FOUND** |
| STR08-007 | `response_sent` log search | Marker visible or no-result captured | **CAPTURED - NOT FOUND / NO LOGS FOUND** |
| STR08-008 | Conservative final verdict | Verdict updated without overclaiming | **CAPTURED - NOT FULLY PROVEN / NO-GO** |

---

## Stop Criteria

| Condition | Required Action |
|-----------|-----------------|
| One POST already executed | Do not repeat |
| Status is not expected | Document result; do not retry |
| Vercel markers absent | Mark runtime visibility as not captured/inconclusive |
| Operator screenshots ingested with no logs found | Mark marker correlation as **NOT FOUND / INCONCLUSIVE** |

---

*Capture matrix - screenshots ingested; Vercel marker correlation remains not found/inconclusive*
