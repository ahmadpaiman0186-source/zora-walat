# STR-03 Operator Runbook - Controlled Sandbox checkout.session.expired Webhook Proof

**Approval phrase:** `APPROVE STR-03 CONTROLLED SANDBOX CHECKOUT.EXPIRED WEBHOOK PROOF ONLY`
**Status:** **PENDING OPERATOR ACTION**

---

## Allowed Scope

| Item | Value |
|------|-------|
| Stripe mode | Sandbox/test mode only |
| Event type | `checkout.session.expired` only |
| Endpoint | `https://zora-walat-api-staging.vercel.app/webhooks/stripe` |
| Evidence | Screenshots listed in `EVIDENCE_MANIFEST.md` |

---

## Stop Conditions

Stop immediately if any condition is true:

| Condition | Action |
|-----------|--------|
| Dashboard is live mode | **STOP** |
| Endpoint is not the approved staging webhook URL | **STOP** |
| Event type is not `checkout.session.expired` | **STOP** |
| Stripe suggests bulk replay / arbitrary test event | **STOP** |
| Production endpoint or real money appears | **STOP** |
| Any deploy/env/settings edit is required | **STOP** |
| Any manual DB/payment/wallet/order mutation is requested | **STOP** |

---

## Evidence Capture Sequence

1. Capture sandbox/test mode.
2. Capture approved staging endpoint.
3. Capture selected `checkout.session.expired` event.
4. Capture Stripe delivery result.
5. Capture Vercel runtime receipt log.
6. Capture event ID correlation.
7. Capture idempotency/lifecycle log evidence.
8. Capture fast ACK lifecycle evidence.

---

## Verdict Rules

| Result | Verdict |
|--------|---------|
| All success criteria captured | STR-03 **PASSED** in sandbox only |
| Delivery is 404, 500, timeout, wrong endpoint, wrong mode, wrong event, no logs, or missing evidence | STR-03 **FAILED / INCONCLUSIVE** |
| Any production/live/real-money path used | **STOP / INVALID EVIDENCE** |

Do not claim production-ready, real-money-ready, controlled-pilot-ready, or fix-proven without the full success criteria.

---

*Operator runbook - controlled sandbox only*
