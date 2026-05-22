# Zora-Walat — Gate 1 Approval Routing Matrix

**Date:** 2026-05-22
**Gate:** 1 — Stakeholder sign-off
**Review packet:** [ZORA_WALAT_GATE1_STAKEHOLDER_SIGNOFF_REVIEW_PACKET_2026_05_22.md](./ZORA_WALAT_GATE1_STAKEHOLDER_SIGNOFF_REVIEW_PACKET_2026_05_22.md)

> **No invented approver rule:** Use **role placeholders only**. Do not enter human names or signatures in repo unless real artifacts are filed by authorized persons.

---

## 1. Purpose

Define **who** must review **what**, **what** they may decide, and **how** decisions escalate — without granting launch authority at Gate 1.

---

## 2. Approval routing principles

| # | Principle |
|---|-----------|
| 1 | Gate 1 approves **diligence readiness** — not production or live-money |
| 2 | **NO-GO** for prod/live-money is default until Go/No-Go pack gates **MET** |
| 3 | One role cannot override **BLOCKED** money-path / OBS rows alone |
| 4 | All outcomes recorded in tracker + optional `SIGN-APPR-DECISION-*` |
| 5 | Agents **cannot** mark APPROVED in git |

---

## 3. Required approval roles

| Role ID | Placeholder role |
|---------|------------------|
| R-FND | Founder / Product Owner |
| R-ENG | Engineering Owner |
| R-SEC | Security Owner |
| R-PAY | Payments Owner |
| R-QA | QA Owner |
| R-OPS | Operations Owner |
| R-LEG | Compliance / Legal Reviewer |
| R-BRD | Investor / Board Reviewer |
| R-PGM | Program Lead (orchestrator) |

---

## 4. Role-to-decision matrix

| Role | May select outcomes | May block Gate 1 |
|------|---------------------|------------------|
| R-FND | All except unilateral GO for launch | Yes |
| R-ENG | APPROVE FOR NEXT GATE · CONDITIONS · REQUEST CHANGES · DEFERRED | Yes |
| R-SEC | Same + enforces claim boundary | Yes |
| R-PAY | Same + blocks live-money language | Yes |
| R-QA | Same; cannot claim QA PASS without evidence | Yes |
| R-OPS | Same; OBS **NOT PROVEN** must stand | Yes |
| R-LEG | DEFERRED · REQUEST CHANGES · CONDITIONS | Yes |
| R-BRD | Same; no launch implied | Yes |
| R-PGM | Consolidates; **cannot** forge signatures | Coordinates |

---

## 5. Master routing table

| Role | Required decision | Evidence to review | Risk owned | Can approve? | Can block? | Current status | Required artifact | Exit criteria |
|------|-----------------|-------------------|------------|--------------|----------|----------------|-------------------|---------------|
| **Founder / Product Owner** | Demo-safe copy; GTM boundary | PR #35 PNGs; market pack; Gate1 packet §15 | Overclaim to market | Next-gate only | Yes | **PENDING REVIEW** | `SIGN-APPR-MEETING-001` + role notes | Outcome recorded |
| **Engineering Owner** | Technical accuracy of evidence refs | Master table; reboot brief; staging proof scope | Scope creep to “built=shipped” | Next-gate only | Yes | **PENDING REVIEW** | `SIGN-APPR-DECISION-001` row | Outcome recorded |
| **Security Owner** | Claim boundary; secrets in PNGs | Claim matrix; secrets:scan; security audit | Unsafe external claims | Next-gate only | Yes | **PENDING REVIEW** | Security review notes | Outcome recorded |
| **Payments Owner** | Money-path staging scope; no live-money | L-1…L11; MONEY_PATH; fail-closed PNGs | Live-money false confidence | Next-gate only | Yes | **PENDING REVIEW** | `SIGN-PAY-NOTES-001` | Outcome recorded |
| **QA Owner** | Screenshot vs QA PASS distinction | 10/10 manifest; FRONTEND_QA_RUN_REPORT | False QA PASS | Next-gate only | Yes | **PENDING REVIEW** | `SIGN-QA-NOTES-001` | Outcome recorded |
| **Operations Owner** | OBS plan only; IR runbook | PR #37; Go/No-Go Gate 3 | OBS overclaim | Next-gate only | Yes | **PENDING REVIEW** | `SIGN-OBS-NOTES-001` | Outcome recorded |
| **Compliance / Legal Reviewer** | Market/legal placeholders | Gate1 packet; LEG checklist rows | Regulatory narrative | Conditions only | Yes | **PENDING REVIEW** | Legal memo (external) | Outcome recorded |
| **Investor / Board Reviewer** | REVIEW-READY vs launch | PR #39–#40; board summary | Investor misunderstanding | Next-gate only | Yes | **PENDING REVIEW** | Board review minutes | Outcome recorded |
| **Program Lead** | Consolidate outcomes | Full Gate 1 pack | Process integrity | Coordinates | Yes | **PENDING REVIEW** | Updated tracker | All roles recorded |

---

## 6. Evidence each role must review (minimum)

| Role | Minimum paths |
|------|---------------|
| All | Gate 1 review packet §14 (what PRs do **not** prove) |
| R-FND | `ZORA_WALAT_INVESTOR_SAFE_MARKET_READINESS_PACK_2026_05_20.md` |
| R-ENG | `ZORA_WALAT_MASTER_EVIDENCE_TABLE_2026_05_21.md` |
| R-SEC | `ZORA_WALAT_CLAIM_BOUNDARY_AND_BLOCKER_MATRIX_2026_05_21.md` |
| R-PAY | `AP786_ALL_PASSES_INVESTOR_PROOF.md` (**test mode**) |
| R-QA | `SCREENSHOT_MANIFEST_2026_05_21_INVESTOR_HARD.md` |
| R-OPS | `ZORA_WALAT_PRODUCTION_OBSERVABILITY_PROOF_PLAN_2026_05_21.md` |
| R-BRD | `ZORA_WALAT_BOARD_READY_EXECUTIVE_SUMMARY_2026_05_21.md` |

---

## 7. Gate dependency matrix

| Gate | Depends on Gate 1 | Gate 1 alone clears? |
|------|-------------------|----------------------|
| Gate 2 QA | Partial prep | **No** |
| Gate 3 OBS | Parallel prep | **No** |
| Gate 4 Security | Partial prep | **No** |
| Gate 5–8 Money | **No** | **No** |
| Gate 9–12 Ops/Launch | **No** | **No** |
| LAUNCH | **No** | **No** |

---

## 8. Escalation path

```text
Role REVIEW → REQUEST CHANGES → Program Lead → Working group
             → unresolved BLOCKER → R-BRD + R-PGM → DEFERRED or NO-GO
             → claim boundary dispute → R-SEC + R-LEG
```

---

## 9. Rejection path

| Step | Action |
|------|--------|
| 1 | Role selects **REQUEST CHANGES** or **NO-GO** |
| 2 | Log in `SIGN-APPR-DECISION-001` with evidence gaps |
| 3 | Update [BLOCKER_TO_OWNER_MATRIX](./ZORA_WALAT_GATE1_BLOCKER_TO_OWNER_MATRIX_2026_05_22.md) |
| 4 | Re-review after artifacts filed |

---

## 10. Conditional approval path

| Step | Action |
|------|--------|
| 1 | Role selects **APPROVE WITH CONDITIONS** |
| 2 | Conditions enumerated (max 5 per role) |
| 3 | File `SIGN-APPR-RISK-001` if waiver-style |
| 4 | **No** launch language in conditions |

---

## 11. Audit trail requirements

| Field | Required |
|-------|----------|
| `review_id` | UUID or `G1-REV-YYYY-MM-DD-##` |
| Role ID | R-FND … R-BRD |
| Outcome | Allowed enum only |
| UTC timestamp | ISO-8601 |
| Evidence IDs reviewed | List |
| Filer | Human name **only** in filed artifact — not agent-invented |

---

## 12. Signature placeholder rules

| Rule | Requirement |
|------|-------------|
| 1 | Signatures live in `Ap786/evidence/signoff-2026-05-21/approvals/` |
| 2 | Template: `STAKEHOLDER_SIGNOFF_TEMPLATE_2026_05_21.md` — ink/PDF when real |
| 3 | Repo markdown tables stay **PENDING** until artifact committed |
| 4 | Agents must not commit signature images or names |

---

## 13. No invented approver rule

**Forbidden:** Filling “Name” columns in tracker with plausible names. **Forbidden:** Marking **APPROVED FOR NEXT GATE REVIEW** without a dated human-filed decision log.

---

*Gate 1 Approval Routing Matrix · all roles PENDING REVIEW · placeholder roles only*
