# Zora-Walat — Master Handoff After PR #40

**Date:** 2026-05-21  
**Purpose:** Canonical **next-session** handoff for ChatGPT, Cursor Agent, founders, and technical reviewers after the investor evidence phase.  
**Reboot entry:** [ZORA_WALAT_FINAL_REBOOT_BRIEF_2026_05_21.md](./ZORA_WALAT_FINAL_REBOOT_BRIEF_2026_05_21.md)

---

## 1. Purpose

Consolidate **branch history**, **evidence hierarchy**, **operating rules**, and **agent instructions** so no session conflates documentation strength with production or live-money approval.

---

## 2. Branch / merge history summary

| Phase | PRs | Branch pattern | Scope |
|-------|-----|----------------|-------|
| Investor screenshots | #35 | `evidence/final-investor-hard-screenshots-*` | PNGs + manifest |
| Governance packs | #36 | `docs/stakeholder-signoff-pack-*` | 3 packs |
| Observability program | #37 | `docs/production-observability-proof-plan-*` | 3 docs |
| Sign-off execution | #38 | `docs/stakeholder-signoff-execution-evidence-*` | Tracker + manifest |
| Board diligence | #39 | `docs/investor-board-diligence-export-pack-*` | 4 docs |
| Readiness index | #40 | `docs/final-investor-readiness-index-*` | 4 docs + index |
| **Reboot handoff (this tranche)** | — | `docs/final-project-reboot-brief-*` | 3 docs |

All listed PRs: **docs/evidence only** — no app/env/payment/DB changes in those merges.

---

## 3. Current canonical main commit status

| Field | Placeholder (verify in session) |
|-------|--------------------------------|
| **Branch** | `main` |
| **HEAD (at authoring)** | `5cca137` — Merge PR #40 |
| **Sync** | User attested `origin/main` synced — re-verify with `git fetch && git status` |
| **PR #35 merge (index)** | `986c552` |

**Rule:** Never cite HEAD from memory — run `git log -1 --oneline main`.

---

## 4. Evidence hierarchy

```text
Level 0 — Single source of truth
  ZORA_WALAT_FINAL_INVESTOR_READINESS_INDEX_2026_05_21.md

Level 1 — Row-level truth
  ZORA_WALAT_MASTER_EVIDENCE_TABLE_2026_05_21.md

Level 2 — Boundaries & gates
  ZORA_WALAT_CLAIM_BOUNDARY_AND_BLOCKER_MATRIX_2026_05_21.md
  ZORA_WALAT_FINAL_APPROVAL_GATE_ROADMAP_2026_05_21.md

Level 3 — PR-themed packs (#35–#39)
  Screenshots, sign-off, OBS, execution, board export

Level 4 — Session handoff (this tranche)
  FINAL_REBOOT_BRIEF, MASTER_HANDOFF (this file), NEXT_ENGINEERING_TRACKS

Level 5 — Legacy / deep architecture
  REBOOT_BRIEF_FOR_CHATGPT_AND_AGENT, PROJECT_MEMORY, Day-1 Ap786
```

**Higher level does not upgrade lower evidence status without new artifacts.**

---

## 5. Start-here file map

| Audience | Read first |
|----------|------------|
| **Any new session** | `ZORA_WALAT_FINAL_REBOOT_BRIEF_2026_05_21.md` |
| **Agent continuing work** | This file + `ZORA_WALAT_NEXT_ENGINEERING_TRACKS_2026_05_21.md` |
| **Investor / board** | `ZORA_WALAT_BOARD_READY_EXECUTIVE_SUMMARY_2026_05_21.md` |
| **Diligence operator** | `ZORA_WALAT_FINAL_INVESTOR_READINESS_INDEX_2026_05_21.md` |
| **Evidence row lookup** | `ZORA_WALAT_MASTER_EVIDENCE_TABLE_2026_05_21.md` |
| **Architecture pre-#35** | `ZORA_WALAT_REBOOT_BRIEF_FOR_CHATGPT_AND_AGENT.md` |

**Ap786 README:** [README.md](./README.md) — all Start Here sections.

---

## 6–11. PR evidence summaries (#35–#40)

| PR | Summary | Key paths |
|----|---------|-----------|
| **#35** | **10/10 CAPTURED** — Playwright local UI PNGs | `evidence/frontend-qa-2026-05-20/`, manifest |
| **#36** | Governance: sign-off pack, Final QA, Super-System ops | 3 × `ZORA_WALAT_*_2026_05_21.md` |
| **#37** | OBS proof plan, OBS manifest, IR/rollback runbook | 3 × observability docs |
| **#38** | Sign-off execution + tracker (all **PENDING**) + manifest | 3 × sign-off execution docs |
| **#39** | Board diligence export (4 docs) — **REVIEW-READY** | Export pack + Q&A + map |
| **#40** | Readiness index, master table, claim matrix, gate roadmap | 4 × final index docs |

---

## 12. Current claims allowed

| Claim | Citation |
|-------|----------|
| 10/10 investor-hard screenshots **CAPTURED** | PR #35 |
| Investor materials **REVIEW-READY** | PR #39, #40 |
| Staging **test-mode** L-1…L-11 documented | Ap786 staging proof |
| Fail-closed UX **partially evidenced** | PNGs + audit |
| Self-healing apply **disabled** | G-10 |
| Observability **requirements defined** | PR #37 |

Full list: [CLAIM_BOUNDARY_AND_BLOCKER_MATRIX](./ZORA_WALAT_CLAIM_BOUNDARY_AND_BLOCKER_MATRIX_2026_05_21.md) §2.

---

## 13. Current claims forbidden

| Forbidden |
|-----------|
| Production-ready · Real-money-ready · QA passed |
| Stakeholder approved · Live-money certified |
| Production observability proven · Self-healing apply enabled |
| Duplicate refund proof complete · Full global money-path proven |
| Credentials rotated (execute) · Live users approved |

Full list: Claim matrix §4.

---

## 14. Current blockers

| ID | Blocker | Status |
|----|---------|--------|
| BL-01 | Stakeholder sign-off | **PENDING** |
| BL-02 | QA PASS | **NOT CLAIMED** |
| BL-03 | Prod observability | **NOT PROVEN** |
| BL-04 | L-13 | **BLOCKED** |
| BL-05 | L-12 | **PENDING** |
| BL-06 | Live-money | **BLOCKED** |
| BL-07 | Production launch | **BLOCKED** |

---

## 15. Current approval gates

| Gate | Status |
|------|--------|
| SIGN (stakeholder artifacts) | **PENDING** |
| QA-G | **PENDING** |
| OBS-G4 | **PENDING** |
| G-01 … G-11 | **BLOCKED** / **PENDING** |
| LAUNCH | **BLOCKED** |

Sequence: [FINAL_APPROVAL_GATE_ROADMAP](./ZORA_WALAT_FINAL_APPROVAL_GATE_ROADMAP_2026_05_21.md).

---

## 16. Super-System operating rules

| Rule | Enforcement |
|------|-------------|
| Detect ≠ mutate | CI zw-doctor read-only |
| Incidents classify enums only | No raw webhooks in Ap786 |
| Apply off on money | G-10 |
| No alert→refund/fulfill | Runbook + ops signoff |
| Guard on every PR | secrets:scan + strict |

---

## 17. Money-path operating rules

| Rule | Detail |
|------|--------|
| Server PAID authority | UI does not grant service |
| Staging proofs | Label **Stripe test mode** |
| L-13 | **Not executed** — no duplicate-refund guarantee |
| Live-money | G-04 **BLOCKED** |

---

## 18. No-pay-no-service operating rules

| Layer | Rule |
|-------|------|
| UX | Cancel + success footnotes |
| Server | Fulfillment gate requires PAID |
| Evidence | L-9 staging; prod monitors **PENDING** |
| Forbidden | Auto-fulfill from return URL alone |

---

## 19. Zero duplicate transaction operating rules

| Layer | Rule |
|-------|------|
| UX | Duplicate warning — education only |
| Webhook | L-4/L-5 staging idempotency |
| Refund duplicate | L-13 **BLOCKED** |
| Forbidden claim | “Impossible to duplicate” globally |

---

## 20. Self-repair / auto-repair boundary

| Allowed | Forbidden |
|---------|-----------|
| zw-doctor diagnose (read-only) | Apply on money without G-10 |
| CI Guard | Env/DB/Stripe mutations |
| Propose repairs in tickets | Autonomous `selfHealingApplyRepairs` |

**Status:** **GATED / NOT ENABLED**.

---

## 21. Future agent instructions

### Mandatory first question

Future sessions **must first ask** which safe track to continue:

1. **Stakeholder sign-off execution**  
2. **Production observability evidence capture**  
3. **Money-path gated proof planning**  
4. **Credential / security approval planning**  
5. **Production Go/No-Go Gate Pack**  
6. **Investor demo / export refinement**  
7. **Track H — Implementation** — **only** after explicit user approval for dangerous operations  

### Agent policy

| Do | Do not |
|----|--------|
| Read Final Reboot Brief first | Assume QA PASS or prod-ready |
| Stay in Ap786 for docs tranches | Edit app/server/env without approval |
| Use conservative status labels | Invent signatures or OBS proof |
| Run secrets:scan on doc commits | Run Stripe/DB/deploy/self-heal apply |
| Cite MASTER_EVIDENCE_TABLE for claims | Upgrade verdict via summary docs alone |

### ChatGPT paste block (short)

```text
Zora-Walat post-PR#40: REVIEW-READY, NOT launch-ready. 10/10 screenshots CAPTURED.
Sign-off PENDING. QA PASS NOT CLAIMED. OBS PLAN ONLY. Self-heal apply NOT ENABLED.
Money-path PARTIAL/BLOCKED (staging test mode OK). Read Ap786/ZORA_WALAT_FINAL_REBOOT_BRIEF_2026_05_21.md first.
Ask which track: sign-off | OBS evidence | money-path plan | security plan | go/no-go | demo | implementation (approved only).
```

---

*Master Handoff After PR #40 · canonical next-session · not launch-ready*
