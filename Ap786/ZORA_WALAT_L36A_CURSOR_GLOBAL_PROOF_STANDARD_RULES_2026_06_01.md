# L-36A — Cursor Global Proof Standard Rules (Governance Only)



**Date:** 2026-06-01

**Roadmap:** Zora-Walat L-1 … L-150 Global Engineering / Super-System

**L-step:** **L-36A** — Cursor global proof standard rules (no runtime)

**Branch:** `docs/l36a-cursor-global-proof-standard-rules-2026-06-01`

**Base:** `eb8bfd2` — Merge PR #151 (L-35 dashboard screenshot intake gate)



---



## 1. Authorization — CORE10-L36A-AUTH-001



| Field | Value |

|-------|-------|

| Required phrase (verbatim) | `APPROVE L-36A CURSOR GLOBAL PROOF STANDARD RULES ONLY` |

| **AUTHORIZATION_RECEIVED** | **true** |



**Engineering objective:** File persistent Cursor rules enforcing **real production proof** for global launch claims — **rules/governance only**; **no** runtime execution in L-36A.



---



## 2. Required evidence matrix



| Field | Value |

|-------|-------|

| **L36A_MODE** | `cursor_global_proof_standard_rules_only` |

| **STARTING_MAIN_COMMIT** | `eb8bfd2` |

| **MAIN_CLEAN_SYNCED** | **true** |

| **L35_MERGED_CONFIRMED** | **true** (PR #151) |

| **RUNTIME_EXECUTED** | **false** |

| **RULES_FILE_CREATED** | **true** |

| **CURSOR_RULE_PATH** | `.cursor/rules/global-proof-standard.mdc` |

| **CURSORRULES_UPDATED** | **true** (created) |

| **GLOBAL_LAUNCH_GOAL_DOCUMENTED** | **true** |

| **REAL_PROOF_STANDARD_DOCUMENTED** | **true** |

| **VERDICT_ENUM_DOCUMENTED** | **true** |

| **FORBIDDEN_ACTIONS_DOCUMENTED** | **true** |

| **TASK_WORKFLOW_DOCUMENTED** | **true** |

| **PRODUCTION_READY** | **false** |

| **REAL_MONEY_READY** | **false** |

| **CONTROLLED_PILOT_READY** | **false** |

| **MARKET_READY** | **false** |

| **LAUNCH_PROOF_FILED** | **false** |

| **NEXT_GATE** | L-36B+ operational proof tracks per program gates; operator-filed production evidence (L-35 PNGs, Gate 3, CORE-11) |



---



## 3. Verdict — CORE10-L36A-VERDICT-001



| Item | Status |

|------|--------|

| **CORE10-L36A-VERDICT-001** | **L36A_RULES_FILED_NOT_LAUNCH_PROOF** |



Rules filed. **No** launch proof. **No** production observability **PROVEN** by this step alone.



---



## 4. Artifacts created/updated



| Path | Action |

|------|--------|

| [.cursor/rules/global-proof-standard.mdc](../.cursor/rules/global-proof-standard.mdc) | **Created** — `alwaysApply: true` |

| [.cursorrules](../.cursorrules) | **Created** — summary pointer |

| This document | L-36A evidence record |



---



## 5. Rule summary (canonical text)



**GLOBAL PROOF STANDARD**



- **Goal** = International / Global Public Launch.

- **Standard** = Real production proof, not documents alone.



**Distinctions:** Docs ≠ proof · Plan ≠ readiness · Staging ≠ production · Partial ≠ launch · Manifest ≠ proven · Token valid ≠ money-ready · Snapshot ≠ production-ready · Self-healing design ≠ self-healing apply-ready.



**Verdicts only:** `PASS_WITH_REAL_PROOF` · `PARTIAL` · `BLOCKED` · `NOT_PROVEN` · `PENDING_EVIDENCE` · `NO-GO`



**Preserve:** no-pay-no-service, zero duplicate transaction, fail-closed, idempotency, auditability, observability, rollback safety, security-first, least privilege, redacted evidence, gated production ops, gated self-healing.



**Forbidden without exact operator approval:** deploy/redeploy, API probes, login/token refresh, env/secret edit, secret print, mutations, provider/Stripe/Reloadly actions, Runtime Doctor apply, self-healing apply, unscoped code fix, launch-ready claims.



**Task workflow:** clean `main` → scoped branch → narrow scope → `git diff --check` → `secrets:scan` → conservative evidence → no commit until operator review → merge cleanup verification.



**Conduct:** If proof is incomplete, say so. Do not guess. Do not beautify.



---



## 6. No-runtime attestation



| Domain | Executed in L-36A? |

|--------|---------------------|

| Deploy / probe / login / logs | **NO** |

| Ap786 evidence capture | **NO** (rules filing only) |

| Production-ready claim | **NO** |



---



**Filed by:** Cursor agent session (governance only)

**Commit:** Pending operator review — **no commit** unless operator requests.
