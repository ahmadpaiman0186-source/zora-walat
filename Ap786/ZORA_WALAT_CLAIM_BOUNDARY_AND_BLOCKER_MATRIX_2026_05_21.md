# Zora-Walat — Claim Boundary and Blocker Matrix

**Date:** 2026-05-21  
**Index:** [ZORA_WALAT_FINAL_INVESTOR_READINESS_INDEX_2026_05_21.md](./ZORA_WALAT_FINAL_INVESTOR_READINESS_INDEX_2026_05_21.md)  
**Purpose:** Define **allowed**, **conditional**, and **forbidden** external claims; map **blockers** by domain.

---

## 1. Purpose

Prevent diligence materials, board decks, and fundraising copy from **over-interpreting** PR #35–#39 evidence. Documentation strength **≠** launch approval.

---

## 2. Allowed claims

| Claim | Condition |
|-------|-----------|
| Investor-hard screenshots **10/10 captured** | Cite PR #35 manifest |
| Investor review materials are **REVIEW-READY** | Cite PR #39 export |
| Governance / claim boundary **documented** | Cite PR #36, #39 |
| Staging **test-mode** L-1…L-11 passes | Label **Stripe test mode** |
| Fail-closed payment UX **designed and partially evidenced** | PNGs + audit |
| Super-System Guard + secrets scan **active in CI** | CI evidence |
| Self-healing **apply disabled** by policy | G-10 |
| Observability **requirements defined** | PR #37 — **not** live |

---

## 3. Conditional claims

| Claim | Required qualification |
|-------|------------------------|
| “Strong frontend evidence” | **Visual only** — QA PASS **not claimed** |
| “Money-path proven” | **Staging test mode only** — not global/live |
| “Observability program exists” | **Plan only** — prod **NOT PROVEN** |
| “Sign-off process ready” | **PENDING** outcomes — no signatures filed |
| “Engineering ~68% ready” | **Program PARTIAL** — not production |

---

## 4. Forbidden claims

| Forbidden claim | Why |
|---------------|-----|
| **Production-ready** | BL-07; multi-gate open |
| **Real-money-ready** | G-04; BL-06 |
| **QA passed** | BL-02 |
| **Stakeholder approved** | BL-01; no SIGN-APPR filed |
| **Live-money certified** | No G-04 evidence |
| **Production observability proven** | BL-03; OBS manifest empty |
| **Self-healing apply enabled** | G-10 **BLOCKED** |
| **Duplicate refund proof complete** | L-13 **BLOCKED** |
| **Full money-path globally proven** | L-12/L-13; live gap |
| **Credentials rotated** (execute) | G-01 **BLOCKED** |
| **Live users approved** | LAUNCH gate **BLOCKED** |
| **10/10 screenshots = payment proof** | Category error |
| **PR #39 = board launch approval** | Export ≠ motion |

---

## 5. Blocker matrix (master)

| ID | Blocker | Domain | Status | Unblocks |
|----|---------|--------|--------|----------|
| BL-01 | Stakeholder sign-off | Governance | **PENDING** | SIGN-* filed |
| BL-02 | QA PASS not claimed | QA | **OPEN** | Manual QA + policy |
| BL-03 | Prod observability | Ops | **NOT PROVEN** | OBS manifest |
| BL-04 | L-13 | Money | **BLOCKED** | G-02 + execution |
| BL-05 | L-12 | Money | **PENDING** | G-03 |
| BL-06 | Live-money | Money | **BLOCKED** | G-04 program |
| BL-07 | Production launch | Launch | **BLOCKED** | Gates 1–8 |
| BL-08 | Credential rotation | Security | **BLOCKED** | G-01 |
| BL-09 | Manual a11y | UX | **PENDING** | SIGN-A11Y |
| BL-10 | Neon/Vercel confirm | Ops | **BLOCKED** | Operator checklist |

---

## 6. Money-path blocker matrix

| Item | Staging | Production | Status |
|------|---------|------------|--------|
| L-1…L-11 harness | **PASS (test mode)** | N/A | **PROVEN (staging)** |
| L-4/L-5 duplicate webhook | **PASS** | **NOT PROVEN** | **PARTIAL** |
| L-12 partial refund | — | — | **NOT PROVEN** |
| L-13 duplicate refund | — | — | **BLOCKED** |
| No-pay-no-service gates | Code + L-9 | Monitors **PENDING** | **PARTIAL** |
| Live Stripe mode | — | — | **BLOCKED (G-04)** |

**Safe language:** “**PARTIAL / BLOCKED** for global launch; **staging test-mode evidence strong**.”

---

## 7. Production blocker matrix

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Stakeholder sign-off | **PENDING** | Tracker |
| QA sign-off | **PENDING** | QA-G |
| OBS proof | **NOT PROVEN** | OBS manifest |
| Security rotation | **BLOCKED** | G-01 |
| Money-path gates | **BLOCKED** | G-02–G-04 |
| Deploy approval | **BLOCKED** | LAUNCH |
| **Production-ready claim** | **FORBIDDEN** | — |

---

## 8. Observability blocker matrix

| Artifact | Status |
|----------|--------|
| Proof plan | **FILED** |
| Evidence manifest rows | **PENDING EVIDENCE** |
| Dashboards / APM / alerts prod | **NOT PROVEN** |
| SLO report | **NOT PROVEN** |
| Drills | **PENDING** |
| **Claim “OBS proven”** | **FORBIDDEN** |

---

## 9. Stakeholder blocker matrix

| Row | Status | Filed artifact |
|-----|--------|----------------|
| T-01…T-07 | **PENDING REVIEW** | None |
| T-08 money-path | **BLOCKED** | — |
| T-09 production | **BLOCKED** | — |
| Template disposition | **PENDING SIGNOFF** | — |
| **Claim “approved”** | **FORBIDDEN** | — |

---

## 10. Security / credential blocker matrix

| Control | Status |
|---------|--------|
| secrets:scan CI | **PASS** |
| Security audit docs | **PASS (scope)** |
| Rotation **execute** | **BLOCKED (G-01)** |
| Prod security monitoring | **NOT PROVEN** |
| **Claim “credentials rotated”** | **FORBIDDEN** unless G-01 evidence |

---

## 11. Self-healing blocker matrix

| Control | Status |
|---------|--------|
| Detect / propose (zw-doctor) | **PASS (CI-static)** |
| Apply on money path | **FORBIDDEN** |
| G-10 approval | **None** |
| **Claim “self-healing enabled”** | **FORBIDDEN** |

---

## 12. Risk acceptance requirements

| Waiver topic | Artifact | Board visibility | Launch allowed? |
|--------------|----------|------------------|-----------------|
| a11y visual-only | `SIGN-RISK-A11Y-001` | Required | **No** |
| OBS plan-only diligence | `SIGN-RISK-OBS-001` | Required | **No** |
| Production launch | — | — | **Never via waiver alone** |
| Live-money | — | — | **Never via waiver alone** |

Waivers **do not** clear BL-06, BL-07, or forbidden claims without gate evidence.

---

*Claim Boundary and Blocker Matrix · use with Final Readiness Index · not launch-ready*
