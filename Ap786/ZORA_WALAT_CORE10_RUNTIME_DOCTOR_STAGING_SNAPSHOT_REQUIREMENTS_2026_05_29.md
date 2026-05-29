# CORE-10 Runtime Doctor Staging Snapshot Requirements

**Date:** 2026-05-29  
**Aligns with:** CORE-04 `ReliabilityScanSnapshot` (in-memory schema)  
**Capture status:** **NOT EXECUTED**

---

## 1. Export rules

| Rule | Requirement |
|------|-------------|
| Method | **Read-only** SQL / admin export / approved script — **no** ORM auto-sync writes |
| Scope | Staging branch / staging Neon (or documented staging DB) — **not** production |
| Window | Defined time range (UTC start/end in DR) |
| Format | JSON object matching CORE-04 snapshot shape |
| Redaction | **Before** doctor run and **before** Ap786 filing |

---

## 2. Required top-level snapshot fields

| Field | Content |
|-------|---------|
| `schemaVersion` | `1` |
| `exportedAt` | ISO-8601 UTC |
| `environmentLabel` | e.g. `staging-2026-05` (no secrets) |
| `orders` | See §3 |
| `stripeWebhookEvents` | See §4 |
| `paymentEvents` | See §5 |
| `fulfillmentAttempts` | Embedded in orders or top-level |
| `auditLogs` | See §6 |
| `idempotencyRegistry` | Optional read-only export |
| `runtimeDoctorFindings` | **Output** — not input (filled post-scan) |
| `repairDryRunPlans` | **Output** — post CORE-08 |

---

## 3. Order records (minimum per order)

| Field | Required | Notes |
|-------|----------|-------|
| `orderId` | Yes | Redact or hash if policy requires |
| `orderStatus` | Yes | PENDING / PAID / PROCESSING / FULFILLED / etc. |
| `stripePaid` | Yes | boolean |
| `idempotencyKey` | If present | Checkout key |
| `fulfillmentAttempts` | Yes | Array (may be empty) |
| `userId` | Optional | **Redact** — prefer opaque pilot id |

### Per fulfillment attempt

| Field | Required |
|-------|----------|
| `attemptId` | Yes |
| `status` | Yes |
| `providerReference` | If any |
| `providerReportedSuccess` | If known |
| `ambiguous` | If known |
| `lastAttemptStatus` | If known |

---

## 4. Webhook events

| Field | Required |
|-------|----------|
| `eventId` | Yes |
| `eventType` | Yes |
| `deliveryCount` | If tracked |
| `orderId` | If correlated |

**Exclude:** raw payload bodies with secrets.

---

## 5. Payment events

| Field | Required |
|-------|----------|
| `paymentIntentId` | Redacted suffix ok |
| `checkoutSessionId` | Redacted suffix ok |
| `status` | Yes |
| `orderId` | Yes |

---

## 6. Audit logs

| Field | Required |
|-------|----------|
| `eventType` | Yes |
| `orderId` | If applicable |
| `occurredAt` | Yes |
| `correlationId` | If present |

Align with CORE-04 `missing_audit` scanner expectations.

---

## 7. Idempotency keys

| Source | Export |
|--------|--------|
| Order `idempotencyKey` | Yes |
| Provider `customIdentifier` / attempt key | Yes |
| Webhook idempotency row | If table exists — read-only |

For CORE-05 offline classify bundle.

---

## 8. Post-export outputs (file separately)

| Artifact | Producer |
|----------|----------|
| `doctor_report.json` | `zw-doctor reliability --fixture` |
| `idempotency_decisions.json` | CORE-05 batch classify |
| `npns_decisions.json` | CORE-06 per-order bundles |
| `repair_plans.json` | CORE-08 dry-run |

---

## 9. Redaction checklist (mandatory)

| Remove / mask | Examples |
|---------------|----------|
| API secrets | Stripe, Reloadly, JWT |
| Full webhook signatures | — |
| Email / phone / MSISDN | Customer PII |
| Full payment URLs | Checkout URLs with tokens |
| Live API keys in env dumps | — |

Evidence: **CORE10-EV-SNAPSHOT-REDACT-001**.

---

## 10. Conservative verdict

Snapshot requirements **filed only**. No staging export executed.

---

*End of snapshot requirements.*
