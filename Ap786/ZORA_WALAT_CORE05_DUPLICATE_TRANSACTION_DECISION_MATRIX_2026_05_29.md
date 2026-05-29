# CORE-05 Duplicate Transaction Decision Matrix

**Date:** 2026-05-29

---

## Matrix

| Condition | Decision | Severity | Invariant | mutationAllowed |
|-----------|----------|----------|-----------|-----------------|
| Valid key + no prior entry + healthy state | ALLOW | info | INV-01 | false |
| Same canonical key, prior `completed` | BLOCK_DUPLICATE | critical | INV-01 | false |
| Same canonical key, prior `in_flight` | BLOCK_DUPLICATE | high | INV-01 | false |
| Duplicate Stripe `eventId` in registry | BLOCK_DUPLICATE | high | INV-01 | false |
| Provider ref on different order | BLOCK_DUPLICATE | critical | INV-01, INV-04 | false |
| Retry after provider SUCCESS | BLOCK_DUPLICATE | critical | INV-01 | false |
| Retry after TIMEOUT / UNKNOWN / ambiguous | RETRY_UNSAFE | high | INV-01, INV-04 | false |
| Retry after FAILED (non-ambiguous) | RETRY_SAFE | low | INV-01 | false |
| Stale PROCESSING beyond threshold | RETRY_UNSAFE | high | INV-01 | false |
| Missing / invalid key material | BLOCK_AMBIGUOUS | high | INV-01 | false |
| PAID, no provider proof | PENDING_REVIEW | critical | INV-02, INV-04 | false |
| FULFILLED, no provider proof | BLOCK_AMBIGUOUS | critical | INV-04 | false |

---

## Required next actions (never auto-applied)

| Code | Action |
|------|--------|
| `CORE5-DUP-CHK-001` | `reject_duplicate_attempt_do_not_mutate` |
| `CORE5-DUP-WH-001` | `ack_duplicate_webhook_without_replay` |
| `CORE5-DUP-PRVREF-001` | `halt_provider_retry_investigate_duplicate_reference` |
| `CORE5-RETRY-UNSAFE-001` | `manual_provider_state_reconciliation_before_retry` |
| `CORE5-PAID-NO-PROOF-001` | `reconcile_payment_before_provider_or_delivery_claim` |
| `CORE5-FULFILLED-NO-PROOF-001` | `never_mark_delivered_investigate_missing_provider_proof` |

---

## Relationship to CORE-04

| Layer | Role |
|-------|------|
| CORE-04 | Post-hoc scan of snapshots (8 scanners) |
| CORE-05 | Per-attempt classification before mutation (kernel) |

Future: CORE-04 may consume CORE-05 decisions in reports; **not wired in v1**.

---

*End of matrix.*
