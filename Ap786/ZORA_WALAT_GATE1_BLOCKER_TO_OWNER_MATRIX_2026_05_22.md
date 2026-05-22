# Zora-Walat — Gate 1 Blocker-to-Owner Matrix

**Date:** 2026-05-22
**Gate:** 1
**Blocker register (program):** [ZORA_WALAT_PRODUCTION_READINESS_BLOCKER_REGISTER_2026_05_22.md](./ZORA_WALAT_PRODUCTION_READINESS_BLOCKER_REGISTER_2026_05_22.md)
**Routing:** [ZORA_WALAT_GATE1_APPROVAL_ROUTING_MATRIX_2026_05_22.md](./ZORA_WALAT_GATE1_APPROVAL_ROUTING_MATRIX_2026_05_22.md)

> **Placeholder owner roles only** — assign humans outside repo or in filed artifacts; **do not invent names**.

---

## 1. Purpose

Map each blocker to a **placeholder owner role**, escalation rule, and Gate 1 burn-down action — without implying clearance.

---

## 2. Blocker-to-owner model

| Field | Use |
|-------|-----|
| **Blocker ID** | Aligns with BL-* / G1-* |
| **Placeholder owner role** | Accountability role — not a person name |
| **Blocks Gate 1?** | If yes, Gate 1 cannot fully clear |
| **Blocks later gates?** | Always possible even if Gate 1 clears |

---

## 3. Master blocker table

| Blocker ID | Domain | Description | Current status | Risk | Placeholder owner role | Why blocks Gate 1 / later | Required evidence | Required approval | Exit criteria | Next action |
|------------|--------|-------------|----------------|------|------------------------|---------------------------|-------------------|-------------------|---------------|-------------|
| **G1-B01** | Stakeholder | No filed `SIGN-APPR-*` | **PENDING EVIDENCE** | Critical | Program Lead | Gate 1 not closable | SIGN-APPR artifacts | Role outcomes | Artifacts filed | Schedule reviews |
| **G1-B02** | Stakeholder | Tracker all PENDING | **PENDING REVIEW** | High | Program Lead | No recorded decisions | Updated tracker | Each role | Rows not PENDING | Route matrix |
| **G1-B03** | QA | QA PASS NOT CLAIMED | **BLOCKED** | High | QA Owner | False QA narrative | SIGN-QA-* | QA lead | Scoped sign-off | Manual QA plan |
| **G1-B04** | QA | Manual a11y open | **PENDING EVIDENCE** | Medium | QA Owner + Engineering | a11y liability | SIGN-A11Y-* | UX/QA | Smoke filed | Schedule SR/KB |
| **G1-B05** | OBS | Prod OBS NOT PROVEN | **PENDING EVIDENCE** | Critical | Operations Owner | Launch blind spot | OBS manifest | SRE | OBS rows filed | OBS track B |
| **G1-B06** | Security | Rotation execute BLOCKED | **BLOCKED** | High | Security Owner | G-01 open | G-01 evidence | Security+ops | Rotation verified | G-01 plan |
| **G1-B07** | Money | L-13 BLOCKED | **BLOCKED** | Critical | Payments Owner | Dup refund gap | L13 PASS | G-02 | L-13 executed | Track E |
| **G1-B08** | Money | L-12 NOT PROVEN | **PENDING** | High | Payments Owner | Refund semantics | L12 PASS | G-03 | L-12 executed | Track E plan |
| **G1-B09** | Money | Live-money BLOCKED | **BLOCKED** | Critical | Payments Owner + Program | G-04 | Live cert | CTO+payments | G-04 pack | **No action** at G1 |
| **G1-B10** | Launch | Prod launch NO-GO | **BLOCKED** | Critical | Program Lead | Go/No-Go default | Gates 1-12 | Board | GO record | Maintain NO-GO |
| **G1-B11** | Legal | Compliance NOT STARTED | **NOT STARTED** | Medium | Compliance / Legal Reviewer | Market claims | Counsel memo | Legal | External review | Engage counsel |
| **G1-B12** | Process | Self-heal apply OFF | **COMPLETE** | Low | Security Owner | Policy OK | G-10 doc | — | Remains off | Monitor |

---

## 4. Critical blockers

G1-B01, G1-B05, G1-B07, G1-B09, G1-B10 — see table.

---

## 5. High-risk blockers

G1-B02, G1-B03, G1-B06, G1-B08 — see table.

---

## 6. Stakeholder blockers

| ID | Owner role | Status |
|----|------------|--------|
| G1-B01 | Program Lead | **PENDING EVIDENCE** |
| G1-B02 | Program Lead | **PENDING REVIEW** |

---

## 7. QA blockers

| ID | Owner role | Status |
|----|------------|--------|
| G1-B03 | QA Owner | **BLOCKED** (NOT CLAIMED) |
| G1-B04 | QA Owner | **PENDING EVIDENCE** |

---

## 8. Observability blockers

| ID | Owner role | Status |
|----|------------|--------|
| G1-B05 | Operations Owner | **PENDING EVIDENCE** |

---

## 9. Security / credential blockers

| ID | Owner role | Status |
|----|------------|--------|
| G1-B06 | Security Owner | **BLOCKED** |

---

## 10. Money-path blockers

| ID | Owner role | Status |
|----|------------|--------|
| G1-B07 | Payments Owner | **BLOCKED** |
| G1-B08 | Payments Owner | **PENDING** |
| G1-B09 | Payments Owner | **BLOCKED** |

---

## 11. L-12 / L-13 blockers

See G1-B07, G1-B08 — **cannot** mark complete at Gate 1.

---

## 12. Rollback blockers

| ID | Description | Owner | Status |
|----|-------------|-------|--------|
| G1-RB01 | Drills not filed | Operations Owner | **PENDING EVIDENCE** |

---

## 13. Compliance / legal placeholder blockers

| ID | Owner | Status |
|----|-------|--------|
| G1-B11 | Compliance / Legal Reviewer | **NOT STARTED** |

---

## 14. Owner assignment placeholders

| Role | Assign human (outside repo) |
|------|----------------------------|
| Program Lead | ________________ |
| Engineering Owner | ________________ |
| Security Owner | ________________ |
| Payments Owner | ________________ |
| QA Owner | ________________ |
| Operations Owner | ________________ |
| Compliance / Legal Reviewer | ________________ |
| Investor / Board Reviewer | ________________ |

---

## 15. Escalation rules

| Condition | Escalate to |
|-----------|-------------|
| Role DEFERRED > 14 days | Program Lead → Board Reviewer |
| REQUEST CHANGES on claim boundary | Security + Legal |
| Payments blocks live-money language | Payments + Program |
| Critical blocker dispute | Board Reviewer + Program |

---

## 16. Exit criteria (Gate 1 program)

| Criterion | Met? |
|-----------|------|
| All roles recorded allowed outcome | **No** |
| G1-B01 artifacts filed | **No** |
| No launch approval language | **Yes** (docs) |
| Go/No-Go NO-GO acknowledged | **Yes** |

---

## 17. Gate 1 burn-down roadmap

| Week | Focus | Blockers | Owner role |
|------|-------|----------|------------|
| W1 | Distribute Gate 1 packet | G1-B01, G1-B02 | Program Lead |
| W1 | Security + QA review sessions | G1-B03, G1-B04 | QA, Security |
| W2 | File meeting + decision log | G1-B01 | Program Lead |
| W2–4 | OBS evidence (parallel, not Gate 1 exit) | G1-B05 | Operations |
| Later | L-12/L-13, live-money | G1-B07–B09 | Payments |

**Gate 1 does not wait for G1-B05–B09** to start review — but **cannot** claim launch cleared.

---

*Gate 1 Blocker-to-Owner Matrix · placeholder owners only · NOT APPROVED YET*
