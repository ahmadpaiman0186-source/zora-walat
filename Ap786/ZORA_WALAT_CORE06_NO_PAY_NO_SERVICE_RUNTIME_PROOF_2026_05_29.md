# CORE-06 No-Pay-No-Service Runtime Proof

**Date:** 2026-05-29  
**Repo:** zora_walat  
**Mode:** classify-only · audit-first · **no mutations**

---

## Purpose

Local runtime proof kernel for **INV-02** (no delivery without provider proof) and **INV-03** (no service without payment). Classifies whether delivery may be allowed, blocked, pending review, or fail-closed from supplied proof bundles — **without** marking delivered or mutating money/order/provider state.

Builds on CORE-03 control model, CORE-04 doctor (detect-only), CORE-05 idempotency kernel.

---

## Module

```
server/src/reliability/noPayNoServiceProof/
  types.js            — proof schemas + delivery decision
  proofEvaluators.js  — pure evidence helpers
  evaluateDelivery.js — delivery decision engine
  doctorExport.js     — optional CORE-04 finding mapping (not wired)
  index.js            — exports (unused by live money path)
```

---

## Delivery decisions

| Decision | Meaning |
|----------|---------|
| `ALLOW_DELIVERY` | Proof satisfied (classify-only; not applied) |
| `BLOCK_NO_PAYMENT` | Payment evidence missing or violated |
| `BLOCK_NO_PROVIDER_PROOF` | Provider success proof missing |
| `BLOCK_AMBIGUOUS` | Ambiguous provider / fulfilled without ref |
| `PENDING_REVIEW` | Paid without provider, stale pending, audit gap (non-fatal) |
| `FAIL_CLOSED` | Duplicate risk, audit fail on money path, failed payment safe |

All: `mutationAllowed: false`, `never_mark_delivered_in_module: true`.

---

## Verification

```bash
cd server
npm run test:no-pay-no-service
```

---

## Explicit non-goals

- No live no-pay-no-service enforcement claim  
- No Stripe / Reloadly / DB / deploy  
- No auto-repair apply  

---

*See companion docs in this CORE-06 pack.*
