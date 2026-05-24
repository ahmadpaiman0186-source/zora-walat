# G-02 — Staging Replay Evidence Matrix

**Date:** 2026-05-24 (updated)
**Gate:** G-02
**Folder:** [evidence/staging-stripe-webhook-replay-proof-pr55-2026-05-23/](./evidence/staging-stripe-webhook-replay-proof-pr55-2026-05-23/README.md)
**Parent:** [UNBLOCK_APPROVAL](./ZORA_WALAT_G02_STAGING_WEBHOOK_DESTINATION_UNBLOCK_APPROVAL_2026_05_23.md) · [CAPTURE_MAP](./ZORA_WALAT_G02_SCREENSHOT_CAPTURE_MAP_2026_05_23.md)

---

## 1. Evidence status matrix

| ID | Filename | Status | Proves (when captured) |
|----|----------|--------|------------------------|
| **DEP-01** | `VERCEL-STAGING-DEPLOYMENT-PR55-COMMIT-001.png` | **CAPTURED / REVIEW PENDING** | Staging **Ready** on PR #55+ `main` |
| **BLK-01** | `STRIPE-SANDBOX-WEBHOOK-DESTINATION-NOT-FOUND-001.png` | **CAPTURED / BLOCKER EVIDENCE** | No sandbox destination; create flow shown |
| **BLK-02** | `STRIPE-SANDBOX-CHECKOUT-EXPIRED-NO-EVENT-DELIVERIES-001.png` | **CAPTURED / BLOCKER EVIDENCE** | No `checkout.session.expired` deliveries |
| **DEST-01** | `STRIPE-SANDBOX-WEBHOOK-DESTINATION-ACTIVE-EXISTING-001.png` | **CAPTURED / REVIEW PENDING** | Existing sandbox destination **Active** at staging URL |
| **DEST-01A** | `STRIPE-SANDBOX-WEBHOOK-DESTINATION-DETAILS-002.png` | **CAPTURED / REVIEW PENDING** | Destination overview corroboration |
| **DEST-01B** | `STRIPE-SANDBOX-WEBHOOK-SIGNING-SECRET-MASKED-003.png` | **CAPTURED / REVIEW PENDING** | **7 events**; signing secret masked |
| **STR-01** | `STRIPE-SANDBOX-CHECKOUT-EXPIRED-PRE-REPLAY-EVENT-DETAIL-001.png` | **CAPTURED / PRE-REPLAY BASELINE** | Pre-replay event detail; failed delivery visible |
| **STR-01A** | `STRIPE-SANDBOX-CHECKOUT-EXPIRED-PRE-REPLAY-FAILED-DELIVERY-002.png` | **CAPTURED / PRE-REPLAY BASELINE** | Failed delivery row (pre-replay) |
| **STR-01B** | `STRIPE-SANDBOX-CHECKOUT-EXPIRED-PRE-REPLAY-TIMEOUT-ATTEMPTS-003.png` | **CAPTURED / PRE-REPLAY BASELINE** | **3× Timed out** before replay |
| **STR-02** | `STRIPE-TEST-CHECKOUT-EXPIRED-REPLAY-AFTER-200-001.png` | **NOT EXECUTED / NOT CAPTURED** | Post-replay HTTP 200 |
| **LOG-01** | `VERCEL-STAGING-LOG-WEBHOOK-RECEIVED-001.png` | **NOT CAPTURED** | `webhook_received` |
| **LOG-02** | `VERCEL-STAGING-LOG-SIGNATURE-VERIFIED-001.png` | **NOT CAPTURED** | `signature_verified` |
| **LOG-03** | `VERCEL-STAGING-LOG-EVENT-PERSISTED-001.png` | **NOT CAPTURED** | `event_persisted` |
| **LOG-04** | `VERCEL-STAGING-LOG-ACK-RETURNED-001.png` | **NOT CAPTURED** | `ack_returned` |
| **LOG-05** | `VERCEL-STAGING-LOG-DUPLICATE-BLOCKED-001.png` | **OPTIONAL / BLOCKED** | `duplicate_event_blocked` |

---

## 2. Dependency chain

```text
APPROVAL (decision record)
    → DEST-01 (destination create)
        → STR-01 (event + pre-replay)
            → STR-02 (replay 200)
                → LOG-01…LOG-04 (Vercel correlation)
                    → LOG-05 (optional duplicate)
                        → conservative verdict update
```

---

## 3. Blocker resolution map

| Blocker | Resolved by | Current |
|---------|-------------|---------|
| BLK-01 | DEST-01 + approval | **RESOLVED** (existing active destination filed) |
| BLK-02 | Phase 3 event + STR-01 | **PARTIAL** — STR-01 baseline filed; BLK-02 historical remains |
| Replay inconclusive | STR-02 + LOG-01…04 | **OPEN** |

---

## 4. Verdict

| Item | Status |
|------|--------|
| G-02 execution dry-run | **FILED / EXECUTION NOT AUTHORIZED** |
| G-02 approver review | **PENDING REVIEW / NOT APPROVED** |
| G-02 approval decision | **PENDING / NOT APPROVED** |
| G-02 sandbox webhook destination setup | **SATISFIED BY EXISTING ACTIVE DESTINATION / REVIEW PENDING** |
| STR-01 pre-replay baseline | **CAPTURED / PRE-REPLAY BASELINE** |
| Staging replay | **BLOCKED / INCONCLUSIVE** |
| Fix proven | **NOT YET** |
| Production launch | **NO-GO** |
| Real-money launch | **NO-GO** |
| Controlled pilot | **NO-GO** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

*Evidence matrix · initial statuses · no fabricated captures*
