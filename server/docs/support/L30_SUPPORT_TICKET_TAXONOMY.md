# L30 — Support ticket taxonomy

**Purpose:** Consistent ticket types, fields, and closure for support/recovery. Aligns with [`L30_SUPPORT_RECOVERY_OVERVIEW.md`](./L30_SUPPORT_RECOVERY_OVERVIEW.md).

---

## Ticket types

| Type code | Description | Default priority |
|-----------|-------------|------------------|
| `OUTAGE` | App or payment path unavailable at scale | P1 |
| `PAYMENT` | Checkout failed, card errors, authorization | P2 |
| `FULFILLMENT` | Paid, delivery not completed / failed | P2 |
| `REFUND_DISPUTE` | Refund request, chargeback, dispute | P2 |
| `PROVIDER` | Carrier/partner-side failure pattern | P2–P1 |
| `ACCESS` | Login, OTP, email delivery | P3 |
| `BALANCE` | Missing credit / wrong balance display | P2 |
| `RECON_LEDGER` | Internal recon flag / finance escalation | P1 |
| `FRAUD_SECURITY` | Suspected abuse, ATO, stolen instrument | P2 |
| `GENERAL` | Product questions, non-incident | P4 |

---

## Priority definitions

| Priority | First response target | Update cadence |
|----------|----------------------|----------------|
| **P1** | ≤ 30 min business hours | ≤ 1 h while active |
| **P2** | ≤ 4 h | ≤ 24 h |
| **P3** | ≤ 24 h | Per SLA |
| **P4** | Best effort | Per backlog policy |

*Adjust for 24/7 launch — document actual contract in ops wiki.*

---

## Required fields (minimum)

- **Customer identifier** (account id or email — per privacy policy)
- **Ticket type** (code above)
- **Time of first failure** (customer-local ok)
- **Order reference** or “none / pre-payment”
- **Environment** (prod vs staging — customers rarely know; infer from URL)
- **One-sentence summary** (non-technical)
- **Linked incident** id (if any)

---

## Evidence requirements

| Severity | Required evidence |
|----------|-------------------|
| Money-path (P1–P2) | Order ref suffix, PI/charge id **suffix** (if available), timestamp window |
| Access | Email domain, last successful login approx (if known) |
| Fraud | Do **not** paste full device fingerprints in public queue — use secure escalation attachment |

Store full Stripe ids only in **secured** finance/engineering tools — not general ticketing if policy forbids.

---

## Redaction rules

- Mask: phone numbers (show last 2–4 digits only if needed), full card numbers, API keys, webhook secrets, JWTs.
- Do not paste: server stack traces to customers; internal hostnames.
- Follow [`L29_LOG_AUDIT_RETENTION_POLICY.md`](../observability/L29_LOG_AUDIT_RETENTION_POLICY.md) for log exports.

---

## SLA targets (support-facing)

Operational targets are **organization-defined**. Initial placeholders:

- **P1** acknowledgement: 30 min  
- **P2** acknowledgement: 4 h  
- **Resolution SLA** varies by type — refunds/disputes may be **days** (Stripe/network latency).

---

## Owner routing

| Type | Default owner |
|------|----------------|
| `OUTAGE`, `RECON_LEDGER` | On-call bridge + L1 coordinator |
| `PAYMENT`, `FULFILLMENT`, `PROVIDER` | L2 support → engineering |
| `REFUND_DISPUTE` | Finance queue |
| `ACCESS` | L2 support → engineering if infra |
| `FRAUD_SECURITY` | Security (L31) |

---

## Duplicate / linked incident handling

- **Duplicate customer tickets** → merge under one **parent**; child tickets linked.
- **Same root cause** as active incident → link to **incident** record; do not close until incident commander clears.
- **Different root cause** but same symptom → separate tickets after triage.

---

## Closure codes

| Code | Meaning |
|------|---------|
| `RESOLVED_FIXED` | Underlying issue fixed; customer confirmed |
| `RESOLVED_EXPLAINED` | No defect; education / user error documented politely |
| `RESOLVED_REFUND` | Money returned per policy |
| `RESOLVED_WORKAROUND` | Temporary workaround applied |
| `CLOSED_DUPLICATE` | Merged to parent |
| `CLOSED_NO_RESPONSE` | Customer ghosted after N attempts (policy-defined) |
| `CANCELLED_SPAM` | Abuse / spam |
| `ESCALATED_EXTERNAL` | Handed to Stripe/bank/regulator — track externally |

---

## References

- [`L30_SUPPORT_INCIDENT_RECOVERY.md`](../runbooks/L30_SUPPORT_INCIDENT_RECOVERY.md)
- [`L30_MANUAL_RECOVERY_AUTHORITY_MATRIX.md`](./L30_MANUAL_RECOVERY_AUTHORITY_MATRIX.md)
