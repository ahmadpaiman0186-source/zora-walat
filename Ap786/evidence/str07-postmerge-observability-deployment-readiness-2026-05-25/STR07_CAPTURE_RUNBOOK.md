# STR-07 Capture Runbook

**Date:** 2026-05-25
**Status:** **PENDING OPERATOR CAPTURE - DO NOT EXECUTE PROBES**

---

## Allowed Scope

STR-07 permits read-only evidence capture only:

- GitHub merge evidence for STR-06.
- Local/main sync evidence for STR-06 merge commit.
- Vercel dashboard screenshots for project, deployment, status, functions/logs surface.
- Vercel log search baseline for `ZW_STRIPE_WEBHOOK_OBSERVABILITY` before any new probe/event.
- Decision gate evidence for STR-08 approval phrase.

---

## Forbidden Actions

| Action | Status |
|--------|--------|
| Deploy / redeploy | **NO** |
| Vercel settings/env/domain edit | **NO** |
| Stripe resend/replay/test event/live mode | **NO** |
| HTTP probe | **NO** |
| DB/payment/wallet/order mutation | **NO** |
| Credential rotation | **NO** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

## Capture Sequence

| Step | Evidence ID | Operator Action | Stop Condition |
|------|-------------|-----------------|----------------|
| 1 | STR07-001 | Capture GitHub PR merge evidence for STR-06 | Stop if PR is not merged |
| 2 | STR07-002 | Capture `main` synced with STR-06 merge commit | Stop if local/main does not include STR-06 |
| 3 | STR07-003 | Capture Vercel project `zora-walat-api-staging` | Stop if wrong project selected |
| 4 | STR07-004 | Capture latest deployment commit/SHA | Stop if deployment does not include STR-06 |
| 5 | STR07-005 | Capture deployment status `Ready` | Stop if not Ready |
| 6 | STR07-006 | Capture Functions/Logs surface for latest deployment | Stop if surface unavailable |
| 7 | STR07-007 | Capture pre-probe log search for `ZW_STRIPE_WEBHOOK_OBSERVABILITY` | Do not trigger any new event/probe |
| 8 | STR07-008 | Capture decision gate text for STR-08 | Stop unless exact STR-08 phrase is issued later |

---

## STR-08 Future Gate

Future STR-08 requires:

```text
APPROVE STR-08 STAGING INVALID-SIGNATURE OBSERVABILITY PROBE ONLY
```

If issued, STR-08 would allow exactly one non-Stripe invalid-signature `POST` to staging webhook endpoint only. It does not allow Stripe replay/resend, live mode, DB/payment mutation, deploy/redeploy, env/settings edit, or production claims.

---

## Current Verdict

STR-07 is a readiness scaffold only. Runtime proof after STR-06 is **NOT CAPTURED YET**, and the fix remains **NOT FULLY PROVEN**.

---

*Capture runbook - read-only evidence only*
