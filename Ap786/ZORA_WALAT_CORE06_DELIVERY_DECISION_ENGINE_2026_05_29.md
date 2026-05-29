# CORE-06 Delivery Decision Engine

**Date:** 2026-05-29

---

## Evaluation order (fail-closed)

1. Sandbox non-money proof → `ALLOW_DELIVERY`  
2. FULFILLED without provider reference → `BLOCK_AMBIGUOUS`  
3. Delivered claim without payment → `BLOCK_NO_PAYMENT`  
4. Delivered claim without provider proof → `BLOCK_NO_PROVIDER_PROOF`  
5. Provider success without payment → `BLOCK_NO_PAYMENT`  
6. Provider executed without payment → `BLOCK_NO_PAYMENT`  
7. Provider ambiguous/timeout → `BLOCK_AMBIGUOUS`  
8. Idempotency duplicate risk → `FAIL_CLOSED` / `PENDING_REVIEW`  
9. Stale PROCESSING + paid → `PENDING_REVIEW`  
10. Paid, no provider (not executed) → `PENDING_REVIEW`  
11. Paid, provider executed, no proof → `BLOCK_NO_PROVIDER_PROOF`  
12. Audit gap on money path → `FAIL_CLOSED` / `PENDING_REVIEW`  
13. Failed payment, no provider → `FAIL_CLOSED` (safe)  
14. No payment → `BLOCK_NO_PAYMENT`  
15. No provider → `BLOCK_NO_PROVIDER_PROOF`  
16. All proofs → `ALLOW_DELIVERY`  

---

## Decision codes (sample)

| Code | Decision |
|------|----------|
| `CORE6-ALLOW-001` | ALLOW_DELIVERY |
| `CORE6-NPAY-DELIVERED-001` | BLOCK_NO_PAYMENT |
| `CORE6-NOPRV-DELIVERED-001` | BLOCK_NO_PROVIDER_PROOF |
| `CORE6-PAID-NO-PRV-001` | PENDING_REVIEW |
| `CORE6-FULFILLED-NO-REF-001` | BLOCK_AMBIGUOUS |
| `CORE6-PRV-AMBIG-001` | BLOCK_AMBIGUOUS |
| `CORE6-IDEM-FAIL-001` | FAIL_CLOSED |
| `CORE6-STALE-PENDING-001` | PENDING_REVIEW |
| `CORE6-SANDBOX-ALLOW-001` | ALLOW_DELIVERY (fixture only) |

---

## Invariants

| INV | Rule |
|-----|------|
| INV-02 | No delivery without provider proof |
| INV-03 | No service without payment |
| INV-04 | Provider reference integrity |
| INV-05 | Audit trail completeness |
| INV-06 | Ambiguous provider → no fulfill claim |

---

*End of engine spec.*
