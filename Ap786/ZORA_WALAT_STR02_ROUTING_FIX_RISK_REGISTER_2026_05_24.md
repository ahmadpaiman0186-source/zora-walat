# STR-02 — Routing Fix Risk Register

**Date:** 2026-05-24
**Parent:** [approval gate](./ZORA_WALAT_STR02_ROUTING_FIX_APPROVAL_GATE_2026_05_24.md)

**Policy:** All risks **OPEN** until implementation reviewed. No fix claim.

---

## 1. Risk table

| ID | Risk | Likelihood | Impact | Mitigation | Owner | Status |
|----|------|------------|--------|------------|-------|--------|
| R-01 | Fix targets wrong layer (Next pages vs API) | Medium | High — 404 persists | Static inventory + Vercel functions evidence post-deploy | Engineering | **OPEN** |
| R-02 | Root Directory `./` unchanged; code-only fix insufficient | Medium | High | Plan Option A as follow-up; verify route surface before resend | Engineering | **OPEN** |
| R-03 | Regression on `/`, `/success`, `/cancel`, `/history` | Low | Medium | Minimal diff; local + CI tests | Engineering | **OPEN** |
| R-04 | Duplicate route definitions (Express + slim + rewrite) | Medium | Medium | Single canonical path `/webhooks/stripe`; grep audit | Engineering | **OPEN** |
| R-05 | Deploy without approval phrase boundary | Low | High | Separate deploy gate; checklist | SRE | **OPEN** |
| R-06 | Premature Stripe Resend after code merge | Medium | High | Require `APPROVE STR-02 SANDBOX CHECKOUT.EXPIRED RESEND ONLY` | Payments | **OPEN** |
| R-07 | False PASS — claim HTTP 200 without evidence | Medium | Critical | [Test plan](./ZORA_WALAT_STR02_ROUTING_FIX_TEST_AND_EVIDENCE_PLAN_2026_05_24.md) — no fake pass | Engineering | **OPEN** |
| R-08 | Env / signing secret mismatch after routing fix | Low | High | No env edits in implementation phrase; verify DEST-01 unchanged | Payments | **OPEN** |
| R-09 | Scope creep into Track H fast-ACK / async | Medium | Medium | Routing-only PR; defer H gate | Engineering | **OPEN** |
| R-10 | Production deploy accidental | Low | Critical | Implementation phrase excludes prod; NO-GO register | SRE | **OPEN** |
| R-11 | Self-healing apply triggered | Low | Critical | GATED / NOT ENABLED — no wiring in routing PR | Engineering | **OPEN** |
| R-12 | Root cause marked CONFIRMED without human sign-off | Medium | High | Verdict matrix unchanged until review | All | **OPEN** |

---

## 2. Residual risk acceptance

| Question | Answer |
|----------|--------|
| Accept residual risk without deploy proof? | **NO** |
| Accept without STR-02 replay evidence? | **NO** |
| Accept for production? | **NO** |

---

## 3. Verdict

| Item | Status |
|------|--------|
| Risks documented | **YES** |
| All risks | **OPEN** |
| Fix implemented | **NOT IMPLEMENTED** |
| Production / pilot | **NO-GO** |

---

*Risk register · all OPEN · no implementation*
