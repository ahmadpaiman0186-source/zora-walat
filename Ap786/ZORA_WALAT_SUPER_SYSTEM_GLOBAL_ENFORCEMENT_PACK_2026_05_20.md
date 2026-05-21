# Zora-Walat — Super-System Global Enforcement Pack

**Date:** 2026-05-20  
**Audience:** CTO, SRE, security, payments safety, incident command, investors (technical)  
**Main HEAD:** `81c4275` — Merge pull request #26 (market readiness pack + frontend QA checklist)  
**Prior merges:** PR #22–#26 (audit → frontend → investor docs)  
**Sanitization:** No secrets, env values, keys, PII, or raw webhooks.  
**Authoring:** Docs/evidence only — **no dangerous operation executed** in creating this pack.

---

## 1. Executive Control Verdict

Zora-Walat has **strong Super-System direction and evidence**: zw-doctor control plane, Super-System Guard CI, incident taxonomy, money-path staging proofs (L-1…L-11), Ap786 discipline, and fail-closed frontend return routes (PR #23–#24).

**The project is not production-ready yet.** Production Super-System enforcement (live-money probes, production APM, full abuse analytics at scale, autonomous repair apply) is **not fully proven**.

| Capability | Status |
|------------|--------|
| Diagnostics + Guard on `main` | **Meaningful progress** — **PASS** (CI-static; operator attested post–PR #26) |
| Self-healing **apply** | **BLOCKED** by design — `SELF_HEALING_APPLY_ALLOWED false` |
| Production APM / alerting | **NOT PROVEN YET** |
| L-12 / L-13 | **NOT PROVEN YET** / **BLOCKED** (gated) |
| Credential rotation **execute** | **BLOCKED** (G-01) |
| Live-money operations | **NOT PROVEN YET** (G-04) |

**This document did not:** modify code, mutate DB, call Stripe, resend webhooks, rotate credentials, execute L-12/L-13, deploy production, or enable self-healing apply.

---

## 2. Global Engineering Super-System Doctrine

### 2.1 Mandatory control loop

```text
Detect → Classify → Contain → Repair-plan → Approval gate → Apply (if allowed) → Verify → Evidence → Rollback (if needed)
```

| Stage | Requirement | Zora-Walat today |
|-------|-------------|------------------|
| **Detect** | Errors, degradation, broken routes, money drift | zw-doctor, Guard, health/ready, integration tests |
| **Classify** | Severity, blast radius, money vs non-money | `zw-doctor incidents` taxonomy (~21 types) |
| **Contain** | Stop spread; fail-closed on ambiguity | Payment gate denials; no auto env/DB switch |
| **Repair-plan** | Documented, sanitized steps | Runbooks in incidents + `GATED_OPERATIONS_*` |
| **Approval gate** | Human phrase / ticket for dangerous ops | G-01…G-11 |
| **Apply** | Only pre-approved, reversible, scoped | **Off** for money/credentials/DB/prod by default |
| **Verify** | Enum-only operator readouts | status-check, phase1-truth, Ap786 |
| **Evidence** | Ap786 + CI artifacts | Index + pass matrix |
| **Rollback** | Git/Vercel manual | **PARTIAL** — no autonomous rollback |

### 2.2 Non-negotiable principles

1. **Automatic detection ≠ automatic unsafe mutation.** CI may run zw-doctor; it must not execute payments, refunds, migrations, or env edits.

2. **Money, credentials, DB, and production** require **explicit human approval** (see `GATED_OPERATIONS_REQUIRED_AFTER_GLOBAL_AUDIT.md`).

3. **Repair automation** is allowed only for **safe, pre-approved, reversible, non-money, non-credential, non-production** changes — and only when `selfHealingApplyRepairs` / `ZW_SELF_HEALING_APPLY` governance explicitly permits (currently **disabled** for money path).

4. **Fail-closed** is mandatory for money-path uncertainty: unknown/pending payment status must not grant service, wallet credit, or fulfillment.

---

## 3. Control Matrix

**Verdict legend:** **PASS** = repo/staging evidence supports · **PARTIAL** = design or staging only · **BLOCKED** = gated/approval required · **NOT PROVEN YET** = insufficient evidence

| # | Control Area | Required Behavior | Current Verdict | Evidence | Gap | Risk if Missing | Next Required Action |
|---|--------------|-------------------|-----------------|----------|-----|-----------------|----------------------|
| 1 | Error detection | Classify API/UI/config errors; surface in CI | **PARTIAL** | `zw-doctor intelligence`; Guard workflow | No prod error budget/APM | Silent prod regressions | Day 2 observability plan |
| 2 | Degraded service detection | Queue/provider/Redis degradation signals | **PARTIAL** | `webtopIncidentSignals.js`, queue health in monitoring | Prod metrics not filed | Stuck fulfillment | Wire APM to queue depth |
| 3 | Broken server detection | Deploy root, API HTML-on-JSON, health failures | **PARTIAL** | zw-doctor invariants; `/api/health` patterns | No 24/7 prod probe proof | Total outage undetected | Staging smoke + prod health SLO |
| 4 | Incident classification | Typed incidents + severity | **PASS** | `server/tools/zwDoctor/incidents.mjs`; CI `--ci-static` | Live incident drill not documented | Triage chaos | Keep classifier tests green |
| 5 | Incident containment | Limit blast radius; fail-closed money | **PARTIAL** | Gate denials; fraud/abuse blocks (partial) | No auto-contain runbook executed in prod | Spread of bad state | Document contain playbooks per type |
| 6 | Money-path anomaly detection | Unpaid fulfill, duplicate PAID, drift | **PARTIAL** | `moneyPathDriftScan`; `UNPAID_FULFILLMENT_ATTEMPT`; L-1…L-11 | Live-money drift unproven | Financial loss | Operator periodic truth-check |
| 7 | Duplicate transaction prevention | Zero duplicate **target** | **PASS** (staging) | L-4/L-5; UI duplicate copy; idempotency tests | L-13 refund replay; live scale | Double charge/delivery | Execute L-13 only when approved |
| 8 | Payment idempotency | Webhook/event dedup | **PASS** | Webhook PK; chaos tests `stripeWebhookHttpChaos` | Prod replay at scale | Double PAID | Maintain slim path tests |
| 9 | No-pay-no-service enforcement | No fulfill without server PAID | **PASS** | `phase1FulfillmentPaymentGate.js`; L-8–L-10 | Absolute global proof not claimed | Free airtime | Continue status-check audits |
| 10 | Cancelled payment access prevention | Cancel → no service | **PASS** | L-9 staging; `returnCancel.noService` (PR #23–#24) | QA screenshots pending | User confusion | File QA checklist evidence |
| 11 | Unknown payment status fail-closed | Pending/unknown ≠ paid | **PASS** | `classifyTopupPaymentStatus`; `CheckoutSuccessReturnPage.tsx` | E2E screenshot not filed | False confidence | QA capture §pending |
| 12 | Repeated unpaid attempt detection | Track safe identifiers | **PARTIAL** | `riskSlidingWindow.js`; abuse evaluation paths | End-to-end unpaid burst proof | Abuse cost | Day 3 abuse policy proof |
| 13 | Abuse blocking / rate-limit policy | Rate-limit, block, escalate | **PARTIAL** | `rateLimits.js`; `fraudControlsPolicy.js`; `webtopDeploymentConfig` abuse | Full pen-test / prod analytics | API abuse | Metrics + thresholds review |
| 14 | Support escalation path | User path without fake systems | **PARTIAL** | `#support-guidance`; `returnSuccess.supportNote` | No ticket integration (by design) | Support load | Keep in-page guidance honest |
| 15 | Safe retry behavior | No duplicate charge from UI retry | **PASS** (UX) | Cancel `retryNote`; success refresh GET only | Backend retry idempotency at scale | Duplicate checkout | Load test retry paths |
| 16 | Webhook replay safety | Idempotent replay | **PASS** (checkout completed) | L-4/L-5 | L-13 `charge.refunded` replay **BLOCKED** | Refund state corruption | G-02 planning only |
| 17 | Refund safety | Single refund; mirror incident | **PARTIAL** | L-11 **PASS** | L-12/L-13 **NOT PROVEN** | Wrong refund semantics | Day 6 gated planning |
| 18 | Credential exposure detection | Scan + rotation signals | **PARTIAL** | `secrets:scan` **PASS**; LOGIN_HTTP 401 documented | Rotation not complete | Account takeover | G-01 when approved |
| 19 | Credential rotation readiness | Dry-run + approval gate | **PARTIAL** | `P0_OPERATOR_AUTH_CREDENTIAL_ROTATION_PLAN.md` | Execute **BLOCKED** | Stale harness | Dry-run → approved execute |
| 20 | Secrets scanning | Block high-confidence secrets in git | **PASS** | `secret-scan.mjs`; Guard step | New files must stay clean | Credential leak | Keep on every PR |
| 21 | CI gate | Tests + money-path certification | **PASS** | `.github/workflows/ci.yml` | Full `test:ci` not every session | Regression | CI screenshot on `main` |
| 22 | Super-System Guard gate | secrets + zw-doctor + incidents | **PASS** | `super-system-guard.yml`; PR #21 verification | PR #26-specific log export optional | Guard bypass | Maintain intelligence wiring |
| 23 | Production APM | Metrics/traces in prod | **NOT PROVEN YET** | Health report § observability | No Datadog/etc. proof in repo | Blind incidents | Day 2 APM plan |
| 24 | Alerting | Page/on-call for money incidents | **NOT PROVEN YET** | In-process `abuse_blocked_spike` signals | No paging evidence | Delayed response | Define alert routes |
| 25 | Audit trail | Sanitized evidence + enums | **PASS** | `Ap786/`; operator harness suffix-only | Not immutable external SIEM | Dispute resolution | Optional log shipping |
| 26 | Rollback plan | Revert deploy/schema safely | **PARTIAL** | Git revert; Vercel rollback manual; G-11 | No drilled rollback evidence | Bad deploy persistence | Document rollback drill |
| 27 | Self-healing plan | Propose repairs | **PASS** | zw-doctor runbooks; `selfHealingOrchestrator` tests | — | No guidance | Keep propose-only |
| 28 | Self-healing apply control | Block money/credential apply | **BLOCKED** (by design) | `SELF_HEALING_APPLY_ALLOWED false`; G-10 | Env misuse if enabled | Autonomous loss | Never set without G-10 |
| 29 | Production deploy safety | Preflight before prod | **PARTIAL** | `productionDeploymentPreflight` tests; G-11 | Prod deploy not certified | Customer impact | Human deploy only |
| 30 | Investor claim boundary | No overclaim | **PASS** | Pass matrix §7; market readiness pack; this §9 | Team discipline | Reputational | Use tables in all decks |

### 3.1 Verdict counts (30 controls)

| Verdict | Count |
|---------|-------|
| **PASS** | **11** |
| **PARTIAL** | **15** |
| **BLOCKED** | **2** (self-healing apply; L-13 replay under G-02 — counted in blocked ops, also reflected in partial rows 16–17) |
| **NOT PROVEN YET** | **2** (production APM, alerting) |

*Note: Several **PARTIAL** rows include staging **PASS** sub-scope (e.g. money-path L-1…L-11). Do not read PARTIAL as FAIL; read as “not globally/production proven.”*

---

## 4. Money-Path Enforcement Model

### 4.1 Required model

| Rule | Requirement |
|------|-------------|
| Service access | No package/airtime/data without **server-verified** payment |
| Client wallet | **No** client-side wallet credit |
| Client grant | **No** client-side service grant from return URLs |
| Paid state | **No** fake paid UI; PAID only when server status confirms |
| Authority | **Server-confirmed PAID** (webhook + DB) before fulfillment |
| Unknown/pending | **Fail-closed** — verifying copy, no delivery claim |
| Cancel route | **No service**, no charge, no auto-retry payment |
| Duplicates | **Zero duplicate target** — idempotency + UX warnings |
| Retries | Must not create duplicate charges (idempotent handlers + UI discipline) |
| Abuse | Repeated unpaid/cancel attempts tracked and controlled |

### 4.2 Evidence map

| Rule | Evidenced | Partial | Blocked | Not proven |
|------|-----------|---------|---------|------------|
| Server PAID authority | ✓ L-3, gate, webhooks | | | Live prod |
| No fulfill unpaid | ✓ L-8–L-10 | | | |
| Idempotency | ✓ L-4/L-5, tests | | | L-13 replay |
| UI fail-closed | ✓ PR #23–#24, `checkoutReturnUtils.ts` | QA screenshots | | |
| No client wallet credit | ✓ Flutter `walletTopUpHint`; no return-page credit | Mobile ar/tr | | |
| Refund mirror | ✓ L-11 | | L-12 | L-13 event |
| Abuse unpaid bursts | | ✓ rate/abuse libs | | Scale proof |

*Deep audit:* `MONEY_PATH_ZERO_DUPLICATE_NO_PAY_NO_SERVICE_AUDIT.md`

---

## 5. Abuse / Unpaid Attempt Control Policy

### 5.1 Production-grade policy (required)

| Control | Policy |
|---------|--------|
| Detection | Detect repeated cancelled/unpaid checkout and API patterns |
| Tracking | Use **safe identifiers** (session key, hashed IP, device fingerprint where legal) — no unnecessary PII in logs |
| Rate-limit | Throttle burst checkout/create attempts per key |
| Temporary block | HTTP 429 or soft block for high-severity abuse (`fraudControlsPolicy.js` pattern) |
| Quarantine | Flag sessions for manual review before high-value actions |
| Escalation | Operator/support path with order suffix + timestamp |
| Disclosure | Do **not** expose detection rules to attackers in UI |
| False positive | Paid users must have **review path** — never hard-block without appeal |

### 5.2 Current implementation vs required

| Policy element | Implemented (repo evidence) | Required / gap |
|----------------|----------------------------|----------------|
| Fulfill-without-pay block | **Yes** — `phase1FulfillmentPaymentGate` | Maintain |
| Webhook duplicate | **Yes** — idempotency + L-4/L-5 | L-13 separate |
| Sliding-window counters | **Yes** — `riskSlidingWindow.js` | Prod validation |
| Express rate limits | **Yes** — `rateLimits.js`, Redis when configured | Pen-test |
| Abuse severity / 429 checkout | **Yes** — `fraudControlsPolicy.js`, webtop abuse config | Document thresholds |
| Incident spike signal | **Yes** — `abuse_blocked_spike` in `webtopIncidentSignals.js` | Wire to alerting |
| Cancel-route abuse copy | **Yes** — `returnCancel.abuseNote` | i18n filed PR #24 |
| Distributed WAF/analytics | **No** | **NOT PROVEN YET** |
| Quarantine workflow UI | **Partial** | Operator runbook |

**Verdict:** Abuse/unpaid control — **PARTIAL** (code + signals exist; production-scale proof and alerting **NOT PROVEN YET**).

---

## 6. Self-Healing and Auto-Repair Boundary

| Level | Definition | Zora-Walat |
|-------|------------|------------|
| **0** | Detect only | **Active** — zw-doctor, secrets scan, tests |
| **1** | Detect + notify | **PARTIAL** — CI fails PR; no prod pager |
| **2** | Detect + contain | **PARTIAL** — gates/fail-closed; not full auto-contain |
| **3** | Safe reversible non-money repair | **PARTIAL** — orchestrator exists; apply **off** |
| **4** | Gated repair with approval | **Required** for any money-adjacent fix |
| **5** | Forbidden auto repair for money/credentials/DB/prod | **Enforced** — G-10; `selfHealingApplyRepairs` default false |

**Honest current level:** **Level 0–1** in CI; **Level 2 partial** in runtime gates; **Level 3+ not enabled** for money path. **Apply = BLOCKED.**

*Evidence:* `SUPER_SYSTEM_FAILURE_DETECTION_AND_AUTO_REPAIR_REPORT.md`; `server/src/selfHealing/selfHealingRunner.js`; `PR21_POST_MERGE_VERIFICATION.md`.

---

## 7. Failover and Recovery Requirements

| Requirement | Required behavior | Evidence | Gap |
|-------------|-------------------|----------|-----|
| Degraded fallback | Safe user messaging; no silent wrong DB | UI error copy; API health | Prod failover unproven |
| No money mutation in uncertainty | Fail-closed | Payment gate | — |
| Queue retry | Idempotent workers only | BullMQ patterns in architecture | Worker death detection weak |
| Rollback-safe changes | Revert deploy/migration | Manual Vercel/git | Drill **NOT PROVEN** |
| Operator notes | Incident + Ap786 | zw-doctor runbooks | — |
| Recovery verification | status-check enums | L-1…L-11 harness | Post-incident template |

**Verdict:** Failover/recovery — **PARTIAL** (staging discipline strong; production automation **NOT PROVEN YET**).

---

## 8. Evidence Index

### 8.1 Ap786 documents

| Document | Role |
|----------|------|
| `PROJECT_MEMORY_ZORA_WALAT_MASTER.md` | Architecture + safety models |
| `ZORA_WALAT_REBOOT_BRIEF_FOR_CHATGPT_AND_AGENT.md` | Handoff |
| `ZORA_WALAT_PROJECT_EXECUTIVE_ENGINEERING_BRIEF.md` | Executive summary |
| `GLOBAL_SECURITY_AUDIT_2026_03_28_TO_2026_05_20.md` | S-01…S-24 controls |
| `SUPER_SYSTEM_FAILURE_DETECTION_AND_AUTO_REPAIR_REPORT.md` | Detect/repair bounds |
| `MONEY_PATH_ZERO_DUPLICATE_NO_PAY_NO_SERVICE_AUDIT.md` | Money path |
| `GLOBAL_ENGINEERING_HEALTH_REPORT_2026_05_20.md` | 68% PARTIAL |
| `GATED_OPERATIONS_REQUIRED_AFTER_GLOBAL_AUDIT.md` | G-01…G-11 |
| `ZORA_WALAT_INVESTOR_REQUIRED_PASSES_2026_05_20.md` | 30 investor passes |
| `ZORA_WALAT_INVESTOR_SAFE_MARKET_READINESS_PACK_2026_05_20.md` | Demo + GTM boundary |
| `ZORA_WALAT_FRONTEND_QA_EVIDENCE_CHECKLIST_2026_05_20.md` | QA pending |
| `AP786_ALL_PASSES_INVESTOR_PROOF.md` | L-1…L-11 staging |
| `PR21_POST_MERGE_VERIFICATION.md` | Guard + zw-doctor signals |

### 8.2 PR / commit lineage (`main`)

| PR | Merge | Topic |
|----|-------|-------|
| #22 | `d5b6c86` | Global audit + exec brief |
| #23 | `32584e3` | Frontend Phase A return routes |
| #24 | `54e0615` | Phase B i18n polish |
| #25 | `864e884` | Investor pass matrix |
| #26 | `81c4275` | Market readiness + QA checklist |

### 8.3 Code references (read-only audit)

| Area | Path |
|------|------|
| zw-doctor CLI | `server/tools/zw-doctor.mjs`, `server/tools/zwDoctor/` |
| Incidents | `server/tools/zwDoctor/incidents.mjs` |
| Guard CI | `.github/workflows/super-system-guard.yml` |
| CI | `.github/workflows/ci.yml` |
| Secrets scan | `server/scripts/secret-scan.mjs` |
| Payment gate | `server/src/lib/phase1FulfillmentPaymentGate.js` |
| Success return | `components/topup/CheckoutSuccessReturnPage.tsx` |
| Cancel return | `components/topup/CheckoutCancelReturnPage.tsx` |
| Status classify | `components/topup/checkoutReturnUtils.ts` |
| Abuse / rate | `server/src/middleware/rateLimits.js`, `server/src/services/risk/riskSlidingWindow.js`, `server/src/lib/fraudControlsPolicy.js` |
| Self-healing | `server/src/selfHealing/selfHealingRunner.js` |

### 8.4 Safe validation commands

```bash
git diff --check
cd server && npm run secrets:scan
cd server && npm run zw:doctor -- summary --strict --no-operator --no-staging
cd server && npm run zw:doctor -- incidents --strict --ci-static
```

---

## 9. Investor / CTO Claim Boundary

| Claim | Allowed? | Safe Wording | Unsafe Wording |
|-------|----------|--------------|----------------|
| Super-System automatic repair | **No** (apply) | “Detects and **proposes** repairs; apply **disabled** on money path” | “Super-System automatically fixes production” |
| No duplicate transactions | **No** (absolute) | “**Zero duplicate target**; staging L-4/L-5; UX warnings; L-13 pending” | “Duplicate transactions impossible” |
| No-pay-no-service | **Yes** (scoped) | “Server gate + staging proofs + return-route copy” | “100% impossible without payment in all cases” |
| Abuse blocking | **Partial only** | “Rate-limit and abuse signals **implemented**; production scale **not proven**” | “All abuse blocked automatically” |
| Production-ready | **No** | “**Not production-ready**; ~68% PARTIAL” | “Production-ready”, “launch-ready” |
| Live-money ready | **No** | “Stripe **test-mode** staging evidence” | “Live-money certified” |
| Global engineering standard | **Partial** | “Super-System **baseline adopted**; enforcement pack defines gaps” | “Fully meets global production standard” |

---

## 10. 7-Day Super-System Hardening Plan

**No dangerous execution without explicit approval.**

| Day | Focus | Actions |
|-----|-------|---------|
| **Day 1** | QA evidence + screenshots | Execute `ZORA_WALAT_FRONTEND_QA_EVIDENCE_CHECKLIST_2026_05_20.md`; capture CI/Guard on `main` |
| **Day 2** | Observability / APM plan | Define prod metrics (queue, webhook lag, abuse blocks); **plan only** |
| **Day 3** | Incident / abuse policy proof | Document thresholds for `abuse_blocked_spike`; unpaid burst test on staging |
| **Day 4** | No-pay-no-service backend review | Re-read gate + L-8–L-10 enums; update Ap786 if drift |
| **Day 5** | Idempotency + duplicate review | Re-verify L-4/L-5 evidence; webhook test matrix |
| **Day 6** | L-12 / L-13 | **Planning only** — G-02/G-03 runbooks; no webhook resend |
| **Day 7** | Readiness decision | Stakeholder sign-off; go/no-go for **investor demo** only — **not** prod launch |

---

## 11. Final CTO Verdict

Zora-Walat is on a **strong Super-System trajectory**: Guard CI, zw-doctor classification, fail-closed money gates, staging proofs, and investor-grade frontend return discipline.

The **investor-safe Super-System story is credible** when this enforcement pack is paired with the pass matrix and gated-ops runbooks.

**Production Super-System is not fully proven** — APM, alerting, L-12/L-13, rotation execute, and live-money remain open.

**Next evidence** must prioritize: QA screenshots, observability plan, backend payment enum audits, and gated money-path proofs — **not** autonomous execution.

**Dangerous operations remain gated** per G-01…G-11. Agents and CI must stay read-only on money, credentials, DB, and production.

---

*Super-System Global Enforcement Pack · docs only · main @ `81c4275` (PR #26) · NO_FALSE_PASS*
