# Zora-Walat — Diligence Q&A and Risk Register

**Date:** 2026-05-21  
**Audience:** Investors, board, diligence operators, CTO  
**Export pack:** [ZORA_WALAT_INVESTOR_BOARD_DILIGENCE_EXPORT_PACK_2026_05_21.md](./ZORA_WALAT_INVESTOR_BOARD_DILIGENCE_EXPORT_PACK_2026_05_21.md)

---

## Product questions

| Question | Conservative answer | Evidence source | Status | Risk | Next proof |
|----------|---------------------|-----------------|--------|------|------------|
| What does the product do? | International mobile top-up; server-gated fulfillment | Executive brief | **PASS (docs)** | Low | — |
| Is it launched globally? | **No** production launch approval | Export pack §17 | **BLOCKED** | High if overclaimed | Board gate |
| Is delivery instant? | **Status-aware** — not guaranteed instant | PR #24 hero; PNGs | **PARTIAL** | Medium | Copy review sign-off |
| Is there real support ticketing? | In-page guidance only | SUPPORT anchor PNG | **PASS (scope)** | Low | Demo script |

---

## Frontend questions

| Question | Conservative answer | Evidence source | Status | Risk | Next proof |
|----------|---------------------|-----------------|--------|------|------------|
| Is the UI investor-presentable? | **10/10** investor-hard screenshots captured | PR #35 manifest | **CAPTURED** | Low | — |
| Are return routes safe? | Fail-closed success; cancel no-service | PNGs + PR #23–#24 | **PARTIAL** | Medium | Manual QA |
| Is RTL supported? | FA/AR/TR home visuals filed | PNGs | **PARTIAL** | Medium | Keyboard/SR QA |
| Does a missing Stripe key break UX safely? | Separate fail-closed PNG (PR #29) | Historical PNG | **PARTIAL (local)** | Low | — |

---

## QA questions

| Question | Conservative answer | Evidence source | Status | Risk | Next proof |
|----------|---------------------|-----------------|--------|------|------------|
| Did QA pass? | **No — QA PASS NOT CLAIMED** | Final QA packet | **NOT CLAIMED** | High if misread | Manual QA report |
| Are screenshots enough for QA? | **No** — visual only | Export pack §7 | **PARTIAL** | Medium | SIGN-QA artifacts |
| Is cross-browser tested? | **Not evidenced** in Ap786 | FRONTEND_QA_RUN_REPORT | **PENDING** | Medium | QA session filed |

---

## Security questions

| Question | Conservative answer | Evidence source | Status | Risk | Next proof |
|----------|---------------------|-----------------|--------|------|------------|
| Are secrets in the repo? | **secrets:scan PASS** in CI | Guard workflow | **PASS (CI)** | Low | Per-PR scan |
| Are secrets in screenshots? | Process requires none | Manifest rules | **PASS (process)** | Medium | Security review |
| Is there a security audit? | Documented PASS/WARN/BLOCKED | GLOBAL_SECURITY_AUDIT | **PASS (docs)** | Medium | Refresh post-PR #23 |
| Were credentials rotated? | **Execute not run** — plan only | P0 rotation plan | **BLOCKED** | High | G-01 execute |

---

## Money-path questions

| Question | Conservative answer | Evidence source | Status | Risk | Next proof |
|----------|---------------------|-----------------|--------|------|------------|
| Is payment-to-fulfillment proven? | **Yes in staging test mode** L-1…L-11 | AP786_ALL_PASSES | **PASS (staging)** | Scope creep | Label test mode |
| Is live-money proven? | **No** | G-04; export pack | **NOT PROVEN** | Critical | Live cert program |
| Can users get service without paying? | **No** by design; gates + UX | MONEY_PATH audit; L-9 | **PASS (staging)** | Critical | Prod monitors |
| Are duplicate payments impossible? | **No absolute claim** | L-4/L-5; L-13 open | **PARTIAL** | High | L-13 execution |
| Are refunds safe? | L-11 staging; L-12/L-13 gaps | L11 doc; DAY2 plan | **PARTIAL** | High | L-12 proof |

---

## Observability questions

| Question | Conservative answer | Evidence source | Status | Risk | Next proof |
|----------|---------------------|-----------------|--------|------|------------|
| Is production monitored? | **NOT PROVEN** — plan only | PR #37 proof plan | **NOT PROVEN** | High | OBS manifest filed |
| Are there on-call alerts? | **Not proven** in repo | OBS manifest | **PENDING** | High | Alert drill |
| Is there an incident runbook? | **Yes (documented)** | PR #37 runbook | **PASS (docs)** | Low | Drill evidence |
| What is uptime? | **No SLO proof filed** | OBS manifest | **NOT PROVEN** | High | 30d SLO report |

---

## Operations questions

| Question | Conservative answer | Evidence source | Status | Risk | Next proof |
|----------|---------------------|-----------------|--------|------|------------|
| Is CI reliable? | **PASS** (attested) | ci.yml; PR21 | **PASS** | Low | Per-release log |
| Can you roll back deploys? | **Manual procedure documented** | Rollback runbook | **PLAN** | Medium | RB drill filed |
| Is self-healing on? | **Apply NOT ENABLED** | Ops signoff; G-10 | **GATED** | Low (if honest) | — |
| Neon/Vercel confirmed? | **Dashboard confirm pending** | P0 Neon audit | **BLOCKED** | Medium | Operator checklist |

---

## Stakeholder sign-off questions

| Question | Conservative answer | Evidence source | Status | Risk | Next proof |
|----------|---------------------|-----------------|--------|------|------------|
| Who approved launch? | **Nobody — PENDING** | Approval tracker | **PENDING** | Critical | SIGN-APPR artifacts |
| Is the sign-off template signed? | **No** | STAKEHOLDER_SIGNOFF_TEMPLATE | **PENDING** | High | Filed PDF/ink |
| Can PR #38 be read as approval? | **No** — execution tracker only | PR #38 pack | **EXPLICIT** | Low | — |

---

## Production-readiness questions

| Question | Conservative answer | Evidence source | Status | Risk | Next proof |
|----------|---------------------|-----------------|--------|------|------------|
| Is the app production-ready? | **No** | Export pack; health ~68% | **NOT CLAIMED** | Critical | Blocker clearance |
| What blocks launch? | Sign-off, OBS, L-12/L-13, live-money, rotation | Blocker register below | **OPEN** | High | Program plan |
| When can we launch? | **Not determined** by this repo | — | **N/A** | — | Board + CTO gate |

---

## Risk register

| ID | Risk | Likelihood | Impact | Status | Mitigation |
|----|------|------------|--------|--------|------------|
| R-01 | Overclaim in investor materials | Medium | High | **Open** | Forbidden-claims tables |
| R-02 | Launch without observability | High | High | **Open** | PR #37 program |
| R-03 | L-13 duplicate refund gap | Low–Med | Critical | **Open** | G-02 gated execution |
| R-04 | Credential compromise | Low | Critical | **Open** | G-01 rotation |
| R-05 | a11y gaps | Medium | Medium | **Open** | Manual QA + disclosure |
| R-06 | Prod money-path drift | Low | Critical | **Open** | Live cert + monitors |
| R-07 | Fake sign-off in repo | Low | High | **Mitigated** | PR #38 policy |
| R-08 | Staging conflated with prod | Medium | High | **Open** | Test-mode labels |

---

## Blocker register

| ID | Blocker | Owner | Gate | Waivable for diligence? |
|----|---------|-------|------|-------------------------|
| BL-01 | Stakeholder sign-off PENDING | Program | SIGN manifest | **No** for launch |
| BL-02 | QA PASS not claimed | QA | Manual QA | **Yes** (disclose) |
| BL-03 | Prod observability NOT PROVEN | SRE | OBS-G1–G5 | **Yes** (disclose) |
| BL-04 | L-13 BLOCKED | Payments | G-02 | **No** for duplicate guarantee |
| BL-05 | Live-money NOT PROVEN | CTO | G-04 | **No** |
| BL-06 | Production-ready NOT CLAIMED | Board | Multi | **No** |
| BL-07 | Self-healing apply NOT ENABLED | Security | G-10 | **N/A** (correct) |

---

## Mitigation plan

| Blocker | Mitigation | Timeline (proposed) | Success criteria |
|---------|------------|----------------------|------------------|
| BL-01 | Stakeholder review sessions + file artifacts | Q0 | Tracker rows filed |
| BL-02 | Complete FRONTEND_QA_RUN_REPORT | Q0 | SIGN-QA-NOTES-001 |
| BL-03 | Implement OBS stack; file manifest | Q1 | OBS-DASH-* filed |
| BL-04 | Execute L-13 when approved | Q1+ | L13 PASS doc |
| BL-05 | Live-money certification program | Q2+ | G-04 evidence pack |
| BL-06 | Clear blockers; board re-vote | After above | Explicit board motion |

---

## Approval gates

| Gate | Operation | Status |
|------|-----------|--------|
| G-01 | Credential rotation execute | **BLOCKED** |
| G-02 | Webhook replay (non-harness) | **BLOCKED** |
| G-03 | L-12 partial refund | **PENDING** |
| G-04 | Live-money | **BLOCKED** |
| G-07 | DB migrate prod | **BLOCKED** |
| G-10 | Self-healing apply | **BLOCKED** |
| G-11 | Refund execute (non-harness) | **BLOCKED** |
| OBS-G4 | Observability evidence filed | **PENDING** |
| SIGN | Stakeholder approval filed | **PENDING** |
| **Board** | Production launch | **BLOCKED** |

---

*Diligence Q&A and Risk Register · conservative answers only · not production-ready*
