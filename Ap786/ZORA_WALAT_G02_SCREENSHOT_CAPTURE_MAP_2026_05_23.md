# G-02 — Screenshot Capture Map

**Date:** 2026-05-24 (updated)
**Gate:** G-02
**Folder:** [evidence/staging-stripe-webhook-replay-proof-pr55-2026-05-23/](./evidence/staging-stripe-webhook-replay-proof-pr55-2026-05-23/README.md)
**Parent:** [DRY_RUN_REHEARSAL](./ZORA_WALAT_G02_EXECUTION_DRY_RUN_REHEARSAL_2026_05_23.md)

**Policy:** Capture map for **future** operator execution. **All future captures default NOT CAPTURED / BLOCKED** until filed post-approval.

---

## 1. Capture map

| ID | Filename | Source | When to capture | Status |
|----|----------|--------|-----------------|--------|
| **DEST-01** | `STRIPE-SANDBOX-WEBHOOK-DESTINATION-ACTIVE-EXISTING-001.png` | Stripe Sandboxes → Webhooks → `zora-walat-api-staging` **Active** | Existing destination; **no new destination created** | **CAPTURED / REVIEW PENDING** |
| **DEST-01A** | `STRIPE-SANDBOX-WEBHOOK-DESTINATION-DETAILS-002.png` | Destination overview | Corroboration; signing secret masked | **CAPTURED / REVIEW PENDING** |
| **DEST-01B** | `STRIPE-SANDBOX-WEBHOOK-SIGNING-SECRET-MASKED-003.png` | Destination details — **7 events** | Signing secret hidden only | **CAPTURED / REVIEW PENDING** |
| **STR-01** | `STRIPE-SANDBOX-CHECKOUT-EXPIRED-PRE-REPLAY-EVENT-DETAIL-001.png` | Stripe Sandboxes → Events → `checkout.session.expired` | **Before** any Resend; event detail + Failed tab | **CAPTURED / PRE-REPLAY BASELINE** |
| **STR-01A** | `STRIPE-SANDBOX-CHECKOUT-EXPIRED-PRE-REPLAY-FAILED-DELIVERY-002.png` | Same event — Failed delivery row | Pre-replay failed delivery to staging URL | **CAPTURED / PRE-REPLAY BASELINE** |
| **STR-01B** | `STRIPE-SANDBOX-CHECKOUT-EXPIRED-PRE-REPLAY-TIMEOUT-ATTEMPTS-003.png` | Same event — delivery attempts | **3× Timed out** (May 19, 2026) | **CAPTURED / PRE-REPLAY BASELINE** |
| **STR-02** | `STRIPE-TEST-CHECKOUT-EXPIRED-REPLAY-AFTER-200-001.png` | Same — delivery detail | **After** single Resend; HTTP **200** visible | **NOT EXECUTED / NOT CAPTURED** |
| **LOG-01** | `VERCEL-STAGING-LOG-WEBHOOK-RECEIVED-001.png` | Vercel → `zora-walat-api-staging` → Logs | Search `webhook_received`; ±15 min of STR-02 | **NOT CAPTURED / BLOCKED** |
| **LOG-02** | `VERCEL-STAGING-LOG-SIGNATURE-VERIFIED-001.png` | Same | Search `signature_verified`; same window | **NOT CAPTURED / BLOCKED** |
| **LOG-03** | `VERCEL-STAGING-LOG-EVENT-PERSISTED-001.png` | Same | Search `event_persisted`; same window | **NOT CAPTURED / BLOCKED** |
| **LOG-04** | `VERCEL-STAGING-LOG-ACK-RETURNED-001.png` | Same | Search `ack_returned`; same window | **NOT CAPTURED / BLOCKED** |
| **LOG-05** | `VERCEL-STAGING-LOG-DUPLICATE-BLOCKED-001.png` | Same | Search `duplicate_event_blocked`; optional duplicate replay | **OPTIONAL / NOT CAPTURED / BLOCKED** |

**Already filed (reference):** DEP-01, BLK-01, BLK-02 — see [evidence matrix](./ZORA_WALAT_G02_STAGING_REPLAY_EVIDENCE_MATRIX_2026_05_23.md).

---

## 2. Required redactions (all captures)

| Redact | Rule |
|--------|------|
| **Stripe account token in URL** | Replace with `REDACTED_STRIPE_ACCOUNT_ID` |
| **Webhook signing secret** | Never in screenshot; blur or omit |
| **Auth / session cookies** | Crop browser chrome; no session tokens |
| **Customer / user PII** | Redact emails, names, full event payloads with PII |
| **Full event IDs** (if policy requires) | Use `REDACTED_EVT_*` in manifest notes |

---

## 3. Capture order (future execution)

```text
DEST-01 → STR-01 → (approved Resend) → STR-02 → LOG-01 → LOG-02 → LOG-03 → LOG-04 → [LOG-05 optional]
```

**Dry-run:** Rehearse order on paper only — **no captures filed** until approved execution.

---

## 4. Acceptance reference

Minimum correlated proof: [evidence acceptance criteria](./ZORA_WALAT_G02_EVIDENCE_ACCEPTANCE_CRITERIA_2026_05_23.md).

---

## 5. Verdict

| Item | Status |
|------|--------|
| G-02 execution dry-run | **FILED / EXECUTION NOT AUTHORIZED** |
| DEST-01 (active-existing) | **CAPTURED / REVIEW PENDING** |
| STR-01 / STR-01A / STR-01B (pre-replay) | **CAPTURED / PRE-REPLAY BASELINE** |
| STR-02 / LOG-01…LOG-05 | **NOT EXECUTED / NOT CAPTURED** |
| G-02 approver review | **PENDING REVIEW / NOT APPROVED** |
| G-02 approval decision | **PENDING / NOT APPROVED** |
| Staging replay | **BLOCKED / INCONCLUSIVE** |
| Fix proven | **NOT YET** |

---

*Capture map · STR-01 ingested 2026-05-24 · no Resend clicked · no replay executed*
