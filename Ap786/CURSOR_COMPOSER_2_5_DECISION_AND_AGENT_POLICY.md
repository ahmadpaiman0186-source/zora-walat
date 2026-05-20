# Cursor Composer / Agent — Decision and operating policy

**Date:** 2026-05-20  
**Repository:** zora_walat  
**Branch context:** Post–PR #21 merge (`main` green); planning branch `chore/composer-frontend-investor-plan`  
**Sanitization:** No secrets, env values, credentials, or PII in this document.

---

## 1. Plan decision (Composer vs Ultra)

| Decision | Rationale |
|----------|-----------|
| **Current plan: Cursor Pro+** | **Sufficient** for audit, docs, refactors, tests, and controlled implementation tranches on this repo. |
| **Ultra upgrade** | **Not recommended now** — no material gap identified that requires Ultra for Zora-Walat’s current phase (post-merge stabilization, frontend investor-grade uplift, remaining L-12/L-13/operator gates). |
| **Usage** | Stay within **included Pro+ usage**; avoid on-demand spend spikes. |
| **Fast mode** | **Not default** — prefer accuracy on money-path, security, and evidence tasks. |

Re-evaluate Ultra only if: sustained multi-repo parallel agents, very large automated refactors, or explicit product need — with CTO approval.

---

## 2. Super-System standard (mandatory for all agents)

Every Composer/Agent prompt on Zora-Walat must treat the product as a **Super-System Intelligent Production Platform**:

- Automatically **detect** failures and **classify** errors (zw-doctor, incidents, intelligence — read-only in CI).
- **Protect the money path** — no duplicate charges/fulfillments; unpaid usage blocked server-side.
- **Fail closed** on payment/env ambiguity.
- Produce **sanitized, investor-grade evidence** (Ap786) — no false PASS claims.
- **Never** perform unsafe autonomous DB, env, payment, refund, webhook resend, or credential rotation **execute** without explicit human approval.

Reference: `SUPER_SYSTEM_INTELLIGENT_APP_AUDIT.md`, `SUPER_SYSTEM_INCIDENT_RESPONSE_AND_APPROVAL_WORKFLOW.md`, `PR21_POST_MERGE_VERIFICATION.md`.

---

## 3. Allowed agent work (default)

| Category | Examples |
|----------|----------|
| **Audit & evidence** | Ap786 docs, CI repair notes, investor summaries, diff analysis |
| **Read-only diagnostics** | `zw-doctor` summary/incidents/intelligence `--ci-static`, `secrets:scan` |
| **Refactor (non-money)** | Copy, UI structure, types, dead-code removal — with tests |
| **Tests** | Unit/integration additions; no live Stripe in CI without existing harness |
| **Frontend/backend code** | When explicitly scoped in a tranche; follow existing conventions |
| **CI/workflow** | Guard workflows, static checks — no secret injection |

---

## 4. Forbidden agent work (unless explicit approval)

| Action | Policy |
|--------|--------|
| `credential-rotation-execute` | **Forbidden** — separate approval phrase + operator only |
| Set `STAGING_OPERATOR_ROTATION_APPROVAL` | **Forbidden** in agent automation |
| DB mutation / migrations | **Forbidden** |
| Vercel / Neon env change | **Forbidden** |
| Payments, refunds, webhook resend | **Forbidden** |
| L-13 duplicate refund proof execution | **Forbidden** without written approval |
| Deploy to production/staging | **Forbidden** unless operator explicitly requests |
| Print/log secrets | **Forbidden** — DATABASE_URL, tokens, JWTs, Stripe keys, PII |
| Self-healing money apply (`ZW_SELF_HEALING_APPLY=true`) | **Forbidden** without explicit approval |
| False PASS / go-live claims | **Forbidden** |

---

## 5. Human-in-the-loop gates

Sensitive operations require **named operator approval** documented in Ap786 before execution:

- L-11 refund execute (`Approved: L-11 execute full refund`)
- L-13 webhook resend proof
- Credential rotation execute
- Neon branch delete/expire
- Production env/payment mode changes
- Any production deploy affecting money path

Agents may **propose** commands and checklists; operators **execute**.

---

## 6. Composer session practices

| Practice | Rule |
|----------|------|
| **Preflight** | `git status`, branch name, no dirty surprise on `main` for evidence-only tranches |
| **Scope** | One tranche per PR; docs-only vs code clearly labeled |
| **Validation** | `secrets:scan`, targeted `node --test`, relevant `zw:doctor` modes — not full money harness in CI agents |
| **Evidence** | Update `AP786_EVIDENCE_INDEX.txt` for material milestones |
| **Spending** | Keep on-demand usage **capped**; stop and ask if hitting limits |
| **Model** | Pro+ Composer is default; do not upgrade to Ultra without CTO sign-off |

---

## 7. Prompt template (recommended)

When starting work, include:

1. Branch name and whether merge to `main` is in scope  
2. Super-System safety rules (copy from §4)  
3. Explicit **no** DB/env/payment/refund/webhook/rotation execute  
4. Deliverable: code / docs / tests only  
5. Required validation commands  
6. Honest non-claims for any PASS language  

---

## 8. Current platform honesty (post–PR #21)

| Item | Status |
|------|--------|
| `main` CI + Super-System Guard | **Green** (per post-merge evidence) |
| Global readiness | **PARTIAL (~68%)** |
| L-13 / L-12 / rotation execute | **Pending / not PASS** |
| Production live-money certification | **Not claimed** |

Agents must not imply merge or green CI equals production certification.

---

## 9. Related documents

- `FRONTEND_INVESTOR_GRADE_UPGRADE_PLAN.md`  
- `FRONTEND_PRODUCTION_UX_AUDIT_2026_05_19.md`  
- `PR21_POST_MERGE_VERIFICATION.md`  
- `AP786_EVIDENCE_INDEX.txt`
