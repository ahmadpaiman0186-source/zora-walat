# Zora-Walat — Real-Money Launch Gate Checklist

**Date:** 2026-05-22  
**Go/No-Go pack:** [ZORA_WALAT_PRODUCTION_GO_NO_GO_GATE_PACK_2026_05_22.md](./ZORA_WALAT_PRODUCTION_GO_NO_GO_GATE_PACK_2026_05_22.md)  
**Default verdict:** **NO-GO** — do not mark production/real-money items **COMPLETE** without existing proof.

**Status vocabulary:** `NOT STARTED` · `PENDING EVIDENCE` · `BLOCKED` · `APPROVAL REQUIRED` · `READY FOR REVIEW` · `COMPLETE` (only with cited evidence)

---

## 1. Purpose

Operational checklist for **real-money** and **production** launch readiness. Each row requires **evidence ID** before **COMPLETE**.

---

## 2. Real-money launch definition

| Term | Definition |
|------|------------|
| **Real-money** | Stripe **live** mode; actual card/network settlement; customer financial impact |
| **Production launch** | Customer-facing prod URLs; prod DB; prod deploy |
| **Controlled pilot** | Scoped live-money test — still requires Gate 11 **GO** record |
| **Not real-money** | Staging harness; Stripe **test mode**; local Playwright captures |

---

## 3. Required preconditions

| # | Precondition | Status | Evidence |
|---|--------------|--------|----------|
| P-01 | Go/No-Go pack acknowledged | **READY FOR REVIEW** | This doc |
| P-02 | Default **NO-GO** understood | **COMPLETE** | Gate pack §3 |
| P-03 | Decision record template available | **COMPLETE** | Decision template |
| P-04 | All critical blockers reviewed | **PENDING EVIDENCE** | Blocker register |
| P-05 | Board/CTO launch motion | **NOT STARTED** | — |

---

## 4. Payment safety checklist

| ID | Item | Status | Evidence required |
|----|------|--------|-------------------|
| PAY-01 | Fail-closed success UX documented | **READY FOR REVIEW** | E35-006; code |
| PAY-02 | Cancel no-service UX documented | **READY FOR REVIEW** | E35-007 |
| PAY-03 | Server PAID authority documented | **READY FOR REVIEW** | MONEY_PATH audit |
| PAY-04 | Prod payment E2E cert | **NOT STARTED** | G-04 pack |
| PAY-05 | No false PAID in prod monitoring | **PENDING EVIDENCE** | OBS-MONEY-* |

---

## 5. Stripe checklist

| ID | Item | Status | Evidence |
|----|------|--------|----------|
| STR-01 | Test-mode L-1…L-11 staging | **COMPLETE** | AP786_ALL_PASSES (**test mode**) |
| STR-02 | Live mode keys governance | **APPROVAL REQUIRED** | G-04 — **not** in repo |
| STR-03 | Live webhook endpoint prod | **NOT STARTED** | Deploy + OBS |
| STR-04 | Live dashboard monitoring | **PENDING EVIDENCE** | OBS |
| STR-05 | Live Checkout pilot scope doc | **NOT STARTED** | Decision record |

---

## 6. Webhook checklist

| ID | Item | Status | Evidence |
|----|------|--------|----------|
| WH-01 | Slim path staging proof | **COMPLETE** | L-4/L-5 (**staging**) |
| WH-02 | Prod webhook 5xx alerting | **PENDING EVIDENCE** | A-04 |
| WH-03 | Signature failure handling prod | **PENDING EVIDENCE** | Logs sample |
| WH-04 | Webhook replay procedure gated | **COMPLETE** | G-02 policy |
| WH-05 | Replay executed without approval | **BLOCKED** | Forbidden |

---

## 7. Refund checklist

| ID | Item | Status | Evidence |
|----|------|--------|----------|
| REF-01 | L-11 staging refund proof | **COMPLETE** | L11 doc (**staging**) |
| REF-02 | L-12 partial refund | **BLOCKED** | G-03 |
| REF-03 | L-13 duplicate refund | **BLOCKED** | G-02 |
| REF-04 | Prod refund runbook | **READY FOR REVIEW** | Gated ops doc |
| REF-05 | Refund execute approval | **APPROVAL REQUIRED** | G-11 |

---

## 8. Wallet credit checklist

| ID | Item | Status | Evidence |
|----|------|--------|----------|
| WAL-01 | Wallet credit gated | **COMPLETE** | Policy — no auto credit |
| WAL-02 | Prod wallet credit proof | **NOT STARTED** | — |
| WAL-03 | Wallet credit approval | **APPROVAL REQUIRED** | IC + payments |

---

## 9. Service fulfillment checklist

| ID | Item | Status | Evidence |
|----|------|--------|----------|
| FUL-01 | Fulfillment gate requires PAID | **READY FOR REVIEW** | Code + staging |
| FUL-02 | Prod fulfillment monitoring | **PENDING EVIDENCE** | OBS |
| FUL-03 | Unpaid fulfill alert | **PENDING EVIDENCE** | A-05 |
| FUL-04 | Prod fulfillment execute w/o approval | **BLOCKED** | Forbidden |

---

## 10. No-pay-no-service checklist

| ID | Item | Status | Evidence |
|----|------|--------|----------|
| NPS-01 | Cancel no-service UX | **READY FOR REVIEW** | E35-007 |
| NPS-02 | L-9 staging cancel proof | **COMPLETE** | L9 doc |
| NPS-03 | Prod gate denial metrics | **PENDING EVIDENCE** | OBS-NPS-GATE-001 |
| NPS-04 | UI-only success → no fulfill | **READY FOR REVIEW** | Architecture |

---

## 11. Zero duplicate transaction checklist

| ID | Item | Status | Evidence |
|----|------|--------|----------|
| ZD-01 | L-4/L-5 staging idempotency | **COMPLETE** | L4/L5 (**staging**) |
| ZD-02 | L-13 duplicate refund | **BLOCKED** | Checklist only |
| ZD-03 | Prod duplicate PAID alert | **PENDING EVIDENCE** | A-06 |
| ZD-04 | Global zero-dup claim forbidden | **COMPLETE** | Claim matrix |

---

## 12. Repeat attempt / abuse-control checklist

| ID | Item | Status | Evidence |
|----|------|--------|----------|
| AB-01 | Abuse signal in code | **READY FOR REVIEW** | Health report |
| AB-02 | Prod abuse dashboard | **PENDING EVIDENCE** | OBS-SEC |
| AB-03 | Rate limits documented | **READY FOR REVIEW** | App policy |

---

## 13. Production observability checklist

| ID | Item | Status | Evidence |
|----|------|--------|----------|
| OBS-01 | Proof plan filed | **COMPLETE** | PR #37 |
| OBS-02 | Manifest prod rows filed | **PENDING EVIDENCE** | OBS-* |
| OBS-03 | Synthetics prod | **PENDING EVIDENCE** | SYN-* |
| OBS-04 | Alert drill | **PENDING EVIDENCE** | OBS-ALERT-TEST-001 |
| OBS-05 | SLO baseline | **NOT STARTED** | OBS-SLO-REPORT-001 |

---

## 14. Security checklist

| ID | Item | Status | Evidence |
|----|------|--------|----------|
| SEC-01 | secrets:scan CI | **COMPLETE** | Guard |
| SEC-02 | Security audit docs | **READY FOR REVIEW** | GLOBAL_SECURITY_AUDIT |
| SEC-03 | Prod security monitoring | **PENDING EVIDENCE** | OBS |
| SEC-04 | Claim boundary training | **READY FOR REVIEW** | Gate pack |

---

## 15. Credential checklist

| ID | Item | Status | Evidence |
|----|------|--------|----------|
| CRE-01 | Rotation plan | **READY FOR REVIEW** | P0 rotation plan |
| CRE-02 | Rotation execute | **BLOCKED** | G-01 |
| CRE-03 | No secrets in Ap786 | **COMPLETE** | Policy |

---

## 16. Customer support checklist

| ID | Item | Status | Evidence |
|----|------|--------|----------|
| SUP-01 | In-page guidance only | **READY FOR REVIEW** | E35-010 |
| SUP-02 | Launch comms template | **PENDING EVIDENCE** | IR runbook |
| SUP-03 | Support runbook for SEV1 money | **READY FOR REVIEW** | IR runbook |

---

## 17. Compliance / legal placeholder checklist

| ID | Item | Status | Evidence |
|----|------|--------|----------|
| LEG-01 | Market claims legal review | **NOT STARTED** | External counsel |
| LEG-02 | Payment licensing scope | **NOT STARTED** | External |
| LEG-03 | Privacy / DPIA | **NOT STARTED** | External |

---

## 18. Rollback checklist

| ID | Item | Status | Evidence |
|----|------|--------|----------|
| RB-01 | Rollback runbook filed | **COMPLETE** | PR #37 runbook |
| RB-02 | API rollback drill | **PENDING EVIDENCE** | OBS-RB-API-001 |
| RB-03 | Frontend rollback drill | **PENDING EVIDENCE** | OBS-RB-FE-001 |

---

## 19. Launch-day checklist

| ID | Item | Status | Evidence |
|----|------|--------|----------|
| LD-01 | Decision record **GO** | **NOT STARTED** | Template |
| LD-02 | IC assigned | **NOT STARTED** | — |
| LD-03 | Deploy freeze unless GO | **COMPLETE** | **NO-GO** default |
| LD-04 | Stripe mode verified live | **NOT STARTED** | — |
| LD-05 | OBS war room | **NOT STARTED** | — |

---

## 20. Post-launch monitoring checklist

| ID | Item | Status | Evidence |
|----|------|--------|----------|
| PL-01 | 24h enhanced monitoring | **NOT STARTED** | — |
| PL-02 | Money-path dashboard watch | **NOT STARTED** | OBS |
| PL-03 | PIR template ready | **READY FOR REVIEW** | IR runbook |

---

## 21. Required evidence before marking COMPLETE

| Rule | Requirement |
|------|-------------|
| 1 | Cite Ap786 path or `E##-###` from [MASTER_EVIDENCE_TABLE](./ZORA_WALAT_MASTER_EVIDENCE_TABLE_2026_05_21.md) |
| 2 | Label **staging** vs **production** vs **CI** |
| 3 | **COMPLETE** forbidden for prod/live rows without prod proof |
| 4 | Agent/docs cannot mark launch gates **COMPLETE** |
| 5 | Human approver initials in decision record |

---

## 22. Checklist summary

| Category | COMPLETE | PENDING/BLOCKED |
|----------|----------|-----------------|
| Preconditions | 2 | 3 |
| Payment/Stripe/Money | 0 prod | Majority |
| OBS/Security | 1–2 | Majority |
| Launch-day | 1 (freeze) | All else |

**Real-money launch:** **NOT READY** — checklist predominantly **PENDING** / **BLOCKED**.

---

*Real-Money Launch Gate Checklist · default NO-GO · evidence required for COMPLETE*
