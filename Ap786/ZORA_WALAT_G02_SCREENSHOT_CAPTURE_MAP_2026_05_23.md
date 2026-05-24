# G-02 — Screenshot Capture Map

**Date:** 2026-05-23
**Gate:** G-02
**Folder:** [evidence/staging-stripe-webhook-replay-proof-pr55-2026-05-23/](./evidence/staging-stripe-webhook-replay-proof-pr55-2026-05-23/README.md)
**Parent:** [DRY_RUN_REHEARSAL](./ZORA_WALAT_G02_EXECUTION_DRY_RUN_REHEARSAL_2026_05_23.md)

**Policy:** Capture map for **future** operator execution. **All future captures default NOT CAPTURED / BLOCKED** until filed post-approval.

---

## 1. Capture map

| ID | Filename | Source | When to capture | Status |
|----|----------|--------|-----------------|--------|
| **DEST-01** | `STRIPE-SANDBOX-WEBHOOK-DESTINATION-CREATED-001.png` | Stripe Sandboxes → Webhooks → destination detail | After approved destination create; staging URL visible | **NOT CAPTURED / BLOCKED** |
| **STR-01** | `STRIPE-TEST-CHECKOUT-EXPIRED-REPLAY-BEFORE-001.png` | Stripe → destination → Event deliveries | **Before** any Resend; pre-replay baseline | **NOT CAPTURED / BLOCKED** |
| **STR-02** | `STRIPE-TEST-CHECKOUT-EXPIRED-REPLAY-AFTER-200-001.png` | Same — delivery detail | **After** single Resend; HTTP **200** visible | **NOT CAPTURED / BLOCKED** |
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
| Future captures DEST-01…LOG-05 | **NOT CAPTURED / BLOCKED** |
| G-02 approver review | **PENDING REVIEW / NOT APPROVED** |
| G-02 approval decision | **PENDING / NOT APPROVED** |
| Staging replay | **BLOCKED / INCONCLUSIVE** |
| Fix proven | **NOT YET** |

---

*Capture map · redaction rules · dry-run planning only*
