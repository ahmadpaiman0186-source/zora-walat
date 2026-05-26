# STR-11 Rollback And Abort Plan

**Date:** 2026-05-25
**Status:** **PLAN ONLY / NO CHANGE TO ROLLBACK**

---

## 1. Rollback Scope

STR-11 makes no app/server, DB, deploy, Stripe, Vercel, env/config, or secret change. Therefore there is no runtime rollback for STR-11.

This document defines rollback requirements for a future STR-12 implementation if it is separately approved.

---

## 2. Future Rollback Requirements

| Area | Requirement |
|------|-------------|
| Code rollback | Revert audit-only implementation files cleanly |
| Migration rollback | Required if persistence schema change is separately approved |
| Feature gating | Prefer an explicit off switch if implementation risk warrants it |
| Data cleanup | Define whether audit rows are retained, deleted, or archived |
| Deployment rollback | Requires separate staging deployment rollback approval |
| Proof halt | Stop on any secret/PII leak, money mutation, duplicate side effect, or unexpected status |

---

## 3. Abort Criteria For Future STR-12/STR-13/STR-14

Abort immediately if any of the following occur:

- Raw Stripe payload is stored.
- Stripe signature header is stored.
- Webhook secret or API key is exposed.
- Customer PII is stored.
- Payment/order/wallet/balance/service state changes outside the approved proof scope.
- Duplicate transaction side effects appear.
- No-pay-no-service invariant is weakened.
- Production/live/real-money endpoint is touched.
- A second probe/replay occurs without approval.

---

## 4. Conservative Verdict

Rollback planning is mandatory before implementation. STR-11 does not authorize implementation, deployment, migration, proof run, or rollback execution.

---

*Rollback and abort plan - planning only.*
