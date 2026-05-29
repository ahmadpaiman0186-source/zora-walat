# CORE-05 Duplicate Transaction + Idempotency Control Kernel

**Date:** 2026-05-29  
**Repo:** zora_walat  
**Mode:** classify-only · audit-first · **no mutations**

---

## Purpose

Production-grade **duplicate transaction / idempotency control foundation** for the Super-System platform. Classifies transaction and provider attempts as allowed, duplicate, ambiguous, blocked, stale, retry-safe, retry-unsafe, or approval-required — **without applying** repairs, retries, or state changes.

Builds on:

- **CORE-03** — reliability invariants INV-01..07  
- **CORE-04** — detect-only runtime doctor (post-hoc scan)

CORE-05 is **pre-execution classification** (kernel), not wired into live checkout/webhook/provider paths in v1.

---

## Module location

```
server/src/reliability/idempotencyKernel/
  types.js           — decision schema, DECISION enum
  keyModel.js        — canonical key builder + validation
  registry.js        — in-memory registry (fixtures/tests only)
  classify.js        — classifyIdempotencyAttempt
  attemptContext.js  — AttemptContext types
  index.js           — public exports (unused by live money path)
```

---

## Decision types

| Decision | Meaning |
|----------|---------|
| `ALLOW` | First safe attempt (classify-only; no execution) |
| `BLOCK_DUPLICATE` | Duplicate checkout/webhook/provider/wallet intent |
| `BLOCK_AMBIGUOUS` | Missing/invalid key material or fulfilled-without-proof |
| `PENDING_REVIEW` | Paid without provider proof — ops review |
| `RETRY_SAFE` | Failed prior attempt; retry candidate (not executed) |
| `RETRY_UNSAFE` | Timeout/ambiguous/stale — manual reconciliation first |

All decisions: `mutationAllowed: false`.

---

## Classifiers (v1)

| Scenario | Code (example) |
|----------|----------------|
| Duplicate checkout | `CORE5-DUP-CHK-001` |
| Duplicate webhook | `CORE5-DUP-WH-001` |
| Duplicate provider execution | `CORE5-DUP-PRVEXEC-001` |
| Duplicate provider reference | `CORE5-DUP-PRVREF-001` |
| Retry after timeout | `CORE5-RETRY-UNSAFE-001` |
| Retry after success | `CORE5-RETRY-AFTER-SUCCESS-001` |
| Missing key material | `CORE5-KEY-001` |
| Stale pending retry | `CORE5-STALE-PENDING-001` |
| Paid, no provider proof | `CORE5-PAID-NO-PROOF-001` |
| Fulfilled, no proof | `CORE5-FULFILLED-NO-PROOF-001` |

---

## Verification

```bash
cd server
npm run test:idempotency-kernel
```

---

## Explicit non-goals (v1)

- No Stripe / Reloadly / Vercel / DB calls  
- No live duplicate prevention claim  
- No auto-repair apply  
- No production deploy  

---

*See also: [Key model](./ZORA_WALAT_CORE05_IDEMPOTENCY_KEY_MODEL_2026_05_29.md), [Decision matrix](./ZORA_WALAT_CORE05_DUPLICATE_TRANSACTION_DECISION_MATRIX_2026_05_29.md), [Integration boundary](./ZORA_WALAT_CORE05_INTEGRATION_BOUNDARY_2026_05_29.md), [Test evidence](./ZORA_WALAT_CORE05_RUNTIME_TEST_EVIDENCE_2026_05_29.md), [Verdict](./ZORA_WALAT_CORE05_CONSERVATIVE_VERDICT_2026_05_29.md).*
