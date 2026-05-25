# STR-02 Sandbox checkout.expired Resend Operator Checklist

**Date:** 2026-05-24
**Approval phrase received:** `APPROVE STR-02 SANDBOX CHECKOUT.EXPIRED RESEND ONLY`
**Status:** **BLOCKED - NO ELIGIBLE CHECKOUT.EXPIRED EVENT DELIVERY FOUND**

---

## 1. Mandatory Checks Before Any Resend

| # | Check | Status |
|---|-------|--------|
| 1 | Stripe Dashboard is in TEST MODE / sandbox only | **CAPTURED** |
| 2 | `checkout.session.expired` search/filter is applied | **CAPTURED** |
| 3 | Date range checked | **CAPTURED** |
| 4 | Result shows no event deliveries found | **CAPTURED** |
| 5 | Eligible event delivery exists for resend | **NO** |
| 6 | Exactly one resend is allowed | **ACKNOWLEDGED IN APPROVAL** |
| 7 | No live mode, bulk replay, arbitrary test event, or new payment is involved | **CAPTURED / NO ACTION TAKEN** |

---

## 2. STOP Rules

Stop immediately if any condition is true:

| Condition | Action |
|-----------|--------|
| Dashboard is live mode | **STOP** |
| Event type is not `checkout.expired` | **STOP** |
| Endpoint differs from approved URL | **STOP** |
| Stripe suggests multiple events / bulk retry / broad replay | **STOP** |
| A resend was already clicked for this proof | **STOP** |
| Any settings/env/deploy action is required | **STOP** |
| No eligible `checkout.session.expired` event delivery is found | **STOP** |

---

## 3. Ready Phrase

Only after all mandatory checks are confirmed, mark:

```text
READY FOR SINGLE RESEND
```

Current state:

```text
BLOCKED - NO ELIGIBLE CHECKOUT.EXPIRED EVENT DELIVERY FOUND
```

---

## 4. Evidence To Capture After Exactly One Resend

| Evidence | Requirement |
|----------|-------------|
| Stripe mode | TEST / sandbox visible |
| Event type | `checkout.expired` visible |
| Endpoint URL | Approved staging webhook URL visible |
| Delivery result | HTTP status and timestamp |
| Response summary | Body/header summary if visible |
| Vercel logs | `/webhooks/stripe`, `stripe`, and `checkout.expired` searches |
| Count | Exactly one resend, no second attempt |

---

## 5. Conservative Boundary

This checklist does not authorize production readiness, real-money readiness, controlled pilot, live mode, broad replay, settings/env edits, deploy/redeploy, manual data mutation, or self-healing apply.

---

*Operator checklist - blocked because no eligible checkout.expired delivery was found*
