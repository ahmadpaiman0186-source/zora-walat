# STR-03 Evidence Capture Matrix

**Date:** 2026-05-25
**Scope:** Controlled sandbox/test-mode `checkout.session.expired` webhook proof.

---

## Capture Matrix

| ID | Screenshot | Required Evidence | Pass Criterion | Current Status |
|----|------------|-------------------|----------------|----------------|
| STR03-001 | `STR03-STRIPE-SANDBOX-MODE-CONFIRMED-001.png` | Stripe dashboard is sandbox/test mode | Sandbox/test mode visible | **PENDING CAPTURE** |
| STR03-002 | `STR03-STAGING-WEBHOOK-ENDPOINT-CONFIRMED-002.png` | Approved endpoint | Exact staging webhook URL visible | **PENDING CAPTURE** |
| STR03-003 | `STR03-CHECKOUT-SESSION-EXPIRED-EVENT-SELECTED-003.png` | Event type selected | `checkout.session.expired` visible | **PENDING CAPTURE** |
| STR03-004 | `STR03-CHECKOUT-SESSION-EXPIRED-DELIVERY-RESULT-004.png` | Stripe delivery result | HTTP 2xx for success | **PENDING CAPTURE** |
| STR03-005 | `STR03-VERCEL-RUNTIME-LOG-WEBHOOK-RECEIVED-005.png` | Vercel request receipt | Matching webhook request visible | **PENDING CAPTURE** |
| STR03-006 | `STR03-VERCEL-RUNTIME-LOG-EVENT-ID-CORRELATION-006.png` | Event ID correlation | Stripe event ID matches Vercel log | **PENDING CAPTURE** |
| STR03-007 | `STR03-VERCEL-RUNTIME-LOG-IDEMPOTENCY-LIFECYCLE-007.png` | Idempotency/lifecycle | Lifecycle/idempotency log visible | **PENDING CAPTURE** |
| STR03-008 | `STR03-VERCEL-RUNTIME-LOG-FAST-ACK-OBSERVED-008.png` | Fast ACK | Fast ACK/lifecycle evidence visible | **PENDING CAPTURE** |

---

## Success Criteria

STR-03 can be marked **PASSED** only if all are true:

- Stripe sandbox/test mode captured.
- Correct staging endpoint captured.
- `checkout.session.expired` event captured.
- Stripe delivery result is HTTP 2xx.
- Vercel logs show matching webhook receipt.
- Vercel logs show matching event ID.
- Vercel logs show lifecycle/idempotency/fast ACK evidence.
- No production/live/real-money path was used.

---

## Failure / Inconclusive Criteria

If delivery is 404, 500, timeout, no logs, wrong endpoint, wrong mode, wrong event type, or missing evidence, mark STR-03 **FAILED / INCONCLUSIVE** and do not claim fix proven.

---

*Evidence matrix - all rows pending*
