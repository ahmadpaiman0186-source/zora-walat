# STR-11 Proposed Audit Event Model

**Date:** 2026-05-25
**Status:** **PROPOSED MODEL ONLY / NO SCHEMA CHANGE APPROVED**

---

## 1. Purpose

Define the future non-money webhook audit metadata needed to prove route ingress, signature outcome, handler stage, idempotency decision, and ACK behavior without storing sensitive Stripe payloads or mutating money-path state.

---

## 2. Proposed Fields

| Field | Purpose | Sensitivity Rule |
|-------|---------|------------------|
| `event_id` | Stripe event id after successful verification | Store only after verification; no raw payload required |
| `event_type` | Stripe event type after verification | Allowlisted string |
| `stripe_account_mode` | `test` / `sandbox` only for staging proof | No live-mode assertion under STR-11 |
| `route` | Route path such as `/webhooks/stripe` | No query secrets |
| `received_at` | Ingress timestamp | Server-generated |
| `signature_verification_status` | `missing`, `invalid`, `verified`, `not_attempted`, `error` | No signature value |
| `idempotency_status` | `not_applicable`, `new`, `duplicate_shadow_ack`, `duplicate_db`, `skipped`, `error` | No raw event body |
| `handler_stage` | `route_entry`, `signature_checked`, `slim_path`, `express_replay`, `ack_sent`, `error_ack` | Controlled enum |
| `response_status` | HTTP status returned | Number only |
| `ack_latency_ms` | Time from route entry to ACK | Number only |
| `correlation_id` | Internal trace/correlation id | Non-secret identifier only |
| `redacted_error_code` | Stable redacted error code | No stack trace or secret |
| `created_at` | Audit row creation timestamp | Server-generated |
| `updated_at` | Audit row update timestamp | Server-generated |

---

## 3. Explicitly Forbidden Fields

Future implementation must not store:

- Raw Stripe payloads.
- Stripe signature headers.
- Webhook secrets.
- API keys.
- Card data.
- Bank data.
- Customer PII.
- Customer email or phone.
- Raw checkout metadata.
- Unredacted error stack traces.
- Authorization headers.

---

## 4. Model Shape Constraints

| Constraint | Requirement |
|------------|-------------|
| Audit-only | Must not drive service delivery or money mutation |
| Duplicate-safe | Must not introduce duplicate transaction side effects |
| Bounded | Retention and cleanup must be defined before persistence is approved |
| Queryable | Must allow evidence retrieval for staging proof |
| Redacted | Must support secrets scan and code review |

---

*Proposed audit model - no database schema or implementation change approved.*
