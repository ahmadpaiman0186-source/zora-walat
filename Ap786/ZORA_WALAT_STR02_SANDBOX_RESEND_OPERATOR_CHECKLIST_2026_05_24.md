# STR-02 Sandbox checkout.expired Resend Operator Checklist

**Date:** 2026-05-24
**Approval phrase received:** `APPROVE STR-02 SANDBOX CHECKOUT.EXPIRED RESEND ONLY`
**Status:** **NOT READY - OPERATOR CONDITIONS NOT CONFIRMED**

---

## 1. Mandatory Checks Before Any Resend

| # | Check | Status |
|---|-------|--------|
| 1 | Stripe Dashboard is in TEST MODE / sandbox only | **NOT CONFIRMED** |
| 2 | Selected event is an existing event | **NOT CONFIRMED** |
| 3 | Selected event type is exactly `checkout.expired` | **NOT CONFIRMED** |
| 4 | Destination endpoint is `https://zora-walat-api-staging.vercel.app/webhooks/stripe` | **NOT CONFIRMED** |
| 5 | Resend count for this proof window is zero before click | **NOT CONFIRMED** |
| 6 | Operator understands exactly one resend is allowed | **NOT CONFIRMED** |
| 7 | No live mode, bulk replay, arbitrary test event, or new payment is involved | **NOT CONFIRMED** |

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

---

## 3. Ready Phrase

Only after all mandatory checks are confirmed, mark:

```text
READY FOR SINGLE RESEND
```

Current state:

```text
NOT READY FOR SINGLE RESEND
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

*Operator checklist - not ready until dashboard conditions are confirmed*
