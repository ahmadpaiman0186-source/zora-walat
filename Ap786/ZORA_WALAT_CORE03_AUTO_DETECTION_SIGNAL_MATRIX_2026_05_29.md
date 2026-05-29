# CORE-03 Auto-Detection Signal Matrix

**Date:** 2026-05-29  
**Status:** **PLANNING — detectors NOT IMPLEMENTED (CORE-04)**  
**Repair classes:** [Self-repair classification](./ZORA_WALAT_CORE03_SELF_REPAIR_CLASSIFICATION_MODEL_2026_05_29.md)

**Legend:** Severity **C**ritical / **H**igh / **M**edium. Customer impact **$** money / **S** service / **T** trust.

---

## 1. Matrix

| FM | Detection signal | Data source | Sev | Cust | Money | Prov | Safe response | Repair class | Evidence to close |
|----|----------------|-------------|-----|------|-------|------|---------------|--------------|---------------------|
| FM-01 | `orderStatus=PAID|PROCESSING` + latest attempt FAILED terminal | DB `PaymentCheckout`, `FulfillmentAttempt` | H | S,T | $ | Y | Hold FULFILLED; ops playbook | B detect / C refund? | CORE3-EV-FM01 |
| FM-02 | Reloadly report SUCCESSFUL + order not FULFILLED | DB + provider inquiry | H | S | $ | Y | Reconcile; transition or manual | B metadata / C | CORE3-EV-FM02 |
| FM-03 | Attempt `pending_verification` / ambiguous classifier | Attempt summary JSON | H | S | $ | Y | Keep PROCESSING | A | CORE3-EV-FM03 |
| FM-04 | `stripe_webhook_duplicate_*` metric / P2002 log | Logs, `StripeWebhookEvent` | M | T | $ | N | 200 ack only | A | CORE3-EV-FM04 |
| FM-05 | `idempotency_hit` + multiple session URLs | Logs, DB unique key | M | T | $ | N | Return cached session | A | CORE3-EV-FM05 |
| FM-06 | Duplicate `customIdentifier` at provider | Provider inquiry + attempts | C | S | $ | Y | Stop POST; ops | A / C | CORE3-EV-FM06 |
| FM-07 | `PROCESSING` age > `PROCESSING_TIMEOUT_MS` | DB `updatedAt`, recovery metadata | H | S | $ | Y | Recovery tick or manual | B / C | CORE3-EV-FM07 |
| FM-08 | FULFILLED + empty provider ref | Attempt row | C | S,T | $ | Y | Reopen manual_required | B / C | CORE3-EV-FM08 |
| FM-09 | FULFILLED + `providerKey=mock` + prod env | DB + env snapshot names | C | S | $ | Y | Incident; disable corridor | C | CORE3-EV-FM09 |
| FM-10 | PAID + zero attempts + outbound disabled | DB + env flags | C | S | $ | N | Fail-closed UX; ops | C | CORE3-EV-FM10 |
| FM-11 | User notification delivered + order not FULFILLED | Notifications + order | H | S,T | $ | Y | Suppress notify; fix state | B | CORE3-EV-FM11 |
| FM-12 | Wallet ledger ≠ checkout amount | Ledger + checkout | H | T | $ | N | Block; recon | C | CORE3-EV-FM12 |
| FM-13 | Missing audit for status transition | `OrderAudit` table | M | T | N | N | Backfill metadata only | B | CORE3-EV-FM13 |
| FM-14 | Sandbox host + production NODE_ENV | Env names only | C | S | $ | Y | Abort drill | A | CORE3-EV-FM14 |
| FM-15 | Admin action without reason length | Admin audit | M | T | $ | Y | Reject action | D | CORE3-EV-FM15 |

---

## 2. Signal sources (future CORE-04)

| Source | Access mode |
|--------|-------------|
| PostgreSQL read-only | Doctor v1 |
| Redis keys (counts only) | Doctor v1 optional |
| Prometheus `/metrics` | Scrape read-only |
| Stripe Dashboard | Operator manual |
| Reloadly reports | Operator manual — **not** automated in v1 |
| Vercel logs | Operator manual |

**No external API calls from doctor v1 in unattended mode.**

---

## 3. Alerting posture (planning)

| Severity | Page? | Default |
|----------|-------|---------|
| C | Yes when doctor live + on-call defined | **NOT CONFIGURED** |
| H | Ticket | **NOT CONFIGURED** |
| M | Dashboard | **NOT CONFIGURED** |

---

## 4. Evidence before closing any FM

Each CORE3-EV-FM* requires: sanitized trace, order id suffix, decision record reference, and **NOT PROVEN** until accepted.

---

*End of auto-detection matrix.*
