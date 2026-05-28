# Zora-Walat — Next Engineering Tracks

**Date:** 2026-05-21
**Post-phase:** Investor evidence / diligence / readiness (PR #35–#40 merged)
**Reboot:** [ZORA_WALAT_FINAL_REBOOT_BRIEF_2026_05_21.md](./ZORA_WALAT_FINAL_REBOOT_BRIEF_2026_05_21.md)
**Gates:** [ZORA_WALAT_FINAL_APPROVAL_GATE_ROADMAP_2026_05_21.md](./ZORA_WALAT_FINAL_APPROVAL_GATE_ROADMAP_2026_05_21.md)

**Rule:** **Track H (implementation)** must not start without **explicit user approval**. Dangerous operations remain **approval-gated**.

---

## 1. Purpose

Define **safe, parallelizable workstreams** after the documentation phase — with allowed scope, forbidden operations, validation, exit criteria, and dependencies — so agents and humans do not drift into launch or live-money work without gates.

---

## 2. Track overview matrix

| Track | ID | Default mode | Gate dependency | Launch impact |
|-------|-----|--------------|-----------------|---------------|
| Stakeholder sign-off execution | **A** | Docs + human review | — | High (governance) |
| Production observability evidence | **B** | Docs + ops filing | OBS-G* | High |
| Money-path gated proof planning | **C** | Docs only | G-02–G-04 | Critical |
| Credential rotation approval planning | **D** | Docs only | G-01 | High |
| L-12 / L-13 proof readiness | **E** | Docs + gated execute | G-02/G-03 | Critical |
| Production Go/No-Go Gate Pack | **F** | Docs only | Gates 1–8 | Critical |
| Investor demo / export refinement | **G** | Docs only | — | Low (diligence) |
| Real implementation | **H** | Code/ops | **Explicit approval** | Critical |

---

## Track A — Stakeholder Sign-off Execution

| Field | Value |
|-------|-------|
| **Gate 1 packet (2026-05-22)** | [ZORA_WALAT_GATE1_STAKEHOLDER_SIGNOFF_REVIEW_PACKET_2026_05_22.md](./ZORA_WALAT_GATE1_STAKEHOLDER_SIGNOFF_REVIEW_PACKET_2026_05_22.md) + routing + checklist + blocker matrix |
| **Objective** | Convert **PENDING** tracker rows to filed `SIGN-APPR-*` without fake approval |
| **Allowed files** | `Ap786/**`, `evidence/signoff-2026-05-21/**` |
| **Forbidden** | Invented names/signatures; APPROVED without artifacts; app/env/payment |
| **Validation** | `secrets:scan`; tracker matches manifest; template disposition honest |
| **Exit criteria** | T-01…T-07 → **APPROVED FOR INVESTOR REVIEW ONLY** or **WITH CONDITIONS**; artifacts filed |
| **Business impact** | Enables honest investor conversations — **not** launch |
| **Technical risk** | Low (process) |
| **Dependencies** | PR #38 manifest; human reviewers |

**Key docs:** `ZORA_WALAT_STAKEHOLDER_APPROVAL_TRACKER_2026_05_21.md`, `ZORA_WALAT_SIGNOFF_EVIDENCE_MANIFEST_2026_05_21.md`.

---

## Track B — Production Observability Evidence Capture

| Field | Value |
|-------|-------|
| **Gate 3 pack (2026-05-22)** | [ZORA_WALAT_GATE3_PRODUCTION_OBSERVABILITY_EVIDENCE_CAPTURE_2026_05_22.md](./ZORA_WALAT_GATE3_PRODUCTION_OBSERVABILITY_EVIDENCE_CAPTURE_2026_05_22.md) + control matrix + checklists |
| **Objective** | File OBS manifest rows — move prod observability from **NOT PROVEN** toward **PROVEN** |
| **Allowed files** | `Ap786/evidence/observability-2026-05-21/**`, Ap786 docs updates |
| **Forbidden** | Fake dashboard PNGs; uptime claims without artifacts; autonomous deploy |
| **Validation** | `secrets:scan`; redacted logs only; manifest INDEX updated |
| **Exit criteria** | Minimum set per proof plan §26 (dashboards, alert test, synthetics) |
| **Business impact** | Reduces launch blind-spot risk |
| **Technical risk** | Medium (misconfiguration if ops mistakes) |
| **Dependencies** | OBS-G1 vendor selection; SRE time; **not** docs-only if implementing tooling (→ Track H) |

---

## Track C — Money-path Gated Proof Planning

| Field | Value |
|-------|-------|
| **Stripe webhook failure (2026-05-22)** | [ZORA_WALAT_STRIPE_WEBHOOK_FAILURE_EVIDENCE_ADDENDUM_2026_05_22.md](./ZORA_WALAT_STRIPE_WEBHOOK_FAILURE_EVIDENCE_ADDENDUM_2026_05_22.md) — staging **FAILED / PENDING INVESTIGATION**; fix **NOT EXECUTED** |
| **Checkout expired remediation (2026-05-23)** | [ZORA_WALAT_CHECKOUT_EXPIRED_TIMEOUT_REMEDIATION_PLAN_2026_05_23.md](./ZORA_WALAT_CHECKOUT_EXPIRED_TIMEOUT_REMEDIATION_PLAN_2026_05_23.md) — **PLAN ONLY**; PR #50 evidence **FILED**; root cause **NOT CONFIRMED** |
| **Fast ACK implementation approval (2026-05-23)** | [ZORA_WALAT_STRIPE_WEBHOOK_FAST_ACK_IMPLEMENTATION_APPROVAL_GATE_2026_05_23.md](./ZORA_WALAT_STRIPE_WEBHOOK_FAST_ACK_IMPLEMENTATION_APPROVAL_GATE_2026_05_23.md) — **APPROVAL PENDING**; branch **NOT CREATED**; code **NOT STARTED** |
| **STR-02 route intelligence (2026-05-24)** | [ZORA_WALAT_SUPER_SYSTEM_ROUTE_INTELLIGENCE_PACK_2026_05_24.md](./ZORA_WALAT_SUPER_SYSTEM_ROUTE_INTELLIGENCE_PACK_2026_05_24.md) — static route bridge verification **PASS**; deployed route surface **PARTIAL DEPLOYMENT EVIDENCE CAPTURED**; HTTP 200 **NOT ACHIEVED** |
| **STR-02 post-fix HTTP proof (2026-05-24)** | [ZORA_WALAT_STR02_POSTFIX_SANDBOX_HTTP_PROOF_2026_05_24.md](./ZORA_WALAT_STR02_POSTFIX_SANDBOX_HTTP_PROOF_2026_05_24.md) — invalid-signature route reachability **PROVEN PARTIAL**; Stripe processing **NOT PROVEN** |
| **STR-02 sandbox resend proof (2026-05-24)** | [ZORA_WALAT_STR02_SANDBOX_CHECKOUT_EXPIRED_RESEND_PROOF_2026_05_24.md](./ZORA_WALAT_STR02_SANDBOX_CHECKOUT_EXPIRED_RESEND_PROOF_2026_05_24.md) — sandbox + `checkout.session.expired` filter captured; no event deliveries found; resend **NOT EXECUTED** |
| **STR-03 controlled sandbox proof (2026-05-25)** | [evidence/str03-controlled-sandbox-checkout-expired-proof-2026-05-25/README.md](./evidence/str03-controlled-sandbox-checkout-expired-proof-2026-05-25/README.md) — screenshots ingested; Stripe-side trigger/delivery proof **PARTIAL PROOF CAPTURED**; Vercel runtime correlation **NOT FOUND / INCONCLUSIVE**; fix **PARTIAL / NOT FULLY PROVEN** |
| **STR-04 runtime correlation gap (2026-05-25)** | [ZORA_WALAT_STR04_VERCEL_RUNTIME_CORRELATION_GAP_INVESTIGATION_2026_05_25.md](./ZORA_WALAT_STR04_VERCEL_RUNTIME_CORRELATION_GAP_INVESTIGATION_2026_05_25.md) — investigation pack filed; future read-only Vercel log capture and static route/logging review required; root cause **NOT CLAIMED** |
| **STR-05 route/logging source review (2026-05-25)** | [ZORA_WALAT_STR05_ROUTE_LOGGING_SOURCE_REVIEW_2026_05_25.md](./ZORA_WALAT_STR05_ROUTE_LOGGING_SOURCE_REVIEW_2026_05_25.md) — source review filed; route map and logging gaps documented; minimal observability fix candidate **GATED / NOT APPROVED** |
| **STR-07 deployment readiness (2026-05-25)** | [ZORA_WALAT_STR07_POSTMERGE_OBSERVABILITY_DEPLOYMENT_READINESS_2026_05_25.md](./ZORA_WALAT_STR07_POSTMERGE_OBSERVABILITY_DEPLOYMENT_READINESS_2026_05_25.md) — post-merge evidence scaffold filed; STR-08 probe requires separate exact approval phrase |
| **STR-08 invalid-signature observability probe (2026-05-25)** | [ZORA_WALAT_STR08_INVALID_SIGNATURE_OBSERVABILITY_PROBE_2026_05_25.md](./ZORA_WALAT_STR08_INVALID_SIGNATURE_OBSERVABILITY_PROBE_2026_05_25.md) — one synthetic invalid-signature staging POST returned HTTP `400`; Vercel marker captures ingested as **NOT FOUND / NO LOGS FOUND**; full processing **NOT PROVEN** |
| **STR-09 Stripe resumed email evidence (2026-05-25)** | [ZORA_WALAT_STR09_STRIPE_WEBHOOK_DELIVERY_RESUMED_EMAIL_2026_05_25.md](./ZORA_WALAT_STR09_STRIPE_WEBHOOK_DELIVERY_RESUMED_EMAIL_2026_05_25.md) — Stripe-side test-mode delivery resumption email captured; app/runtime processing **NOT PROVEN** |
| **STR-10 processing proof decision gate (2026-05-25)** | [ZORA_WALAT_STR10_WEBHOOK_PROCESSING_PROOF_GAP_DECISION_GATE_2026_05_25.md](./ZORA_WALAT_STR10_WEBHOOK_PROCESSING_PROOF_GAP_DECISION_GATE_2026_05_25.md) — decision gate filed; durable non-money audit evidence recommended but **NOT APPROVED / NOT EXECUTED** |
| **STR-11 durable audit approval pack (2026-05-25)** | [ZORA_WALAT_STR11_DURABLE_NON_MONEY_WEBHOOK_AUDIT_APPROVAL_GATE_2026_05_25.md](./ZORA_WALAT_STR11_DURABLE_NON_MONEY_WEBHOOK_AUDIT_APPROVAL_GATE_2026_05_25.md) — STR-12/13/14 future gates defined; implementation/deploy/probe/replay **NOT APPROVED** |
| **STR-12 durable audit local implementation (2026-05-25)** | [ZORA_WALAT_STR12_DURABLE_NON_MONEY_WEBHOOK_AUDIT_IMPLEMENTATION_2026_05_25.md](./ZORA_WALAT_STR12_DURABLE_NON_MONEY_WEBHOOK_AUDIT_IMPLEMENTATION_2026_05_25.md) — local audit-only support on PR #87; deployment/proof gates still required |
| **STR-12 PR #87 Vercel rate-limit blocker (2026-05-27)** | [ZORA_WALAT_STR12_PR87_VERCEL_RATE_LIMIT_BLOCKER_2026_05_27.md](./ZORA_WALAT_STR12_PR87_VERCEL_RATE_LIMIT_BLOCKER_2026_05_27.md) — **HISTORICAL** external rate limit; PR **#87** later **MERGED** |
| **STR-13 post-STR-12 runtime proof scaffold (2026-05-27)** | [ZORA_WALAT_STR13_POST_STR12_RUNTIME_PROOF_SCAFFOLD_2026_05_27.md](./ZORA_WALAT_STR13_POST_STR12_RUNTIME_PROOF_SCAFFOLD_2026_05_27.md) — **MERGED (PR #90)**; STR13-001..008 **PENDING CAPTURE** |
| **STR-14 runtime proof execution gate (2026-05-27)** | [ZORA_WALAT_STR14_RUNTIME_PROOF_EXECUTION_APPROVAL_GATE_2026_05_27.md](./ZORA_WALAT_STR14_RUNTIME_PROOF_EXECUTION_APPROVAL_GATE_2026_05_27.md) — **MERGED (PR #91)**; execution **NOT AUTHORIZED**; runtime proof **PENDING** |
| **XCH-00 future remittance/exchange architecture (2026-05-27)** | [ZORA_WALAT_XCH00_GLOBAL_REMITTANCE_EXCHANGE_ARCHITECTURE_2026_05_27.md](./ZORA_WALAT_XCH00_GLOBAL_REMITTANCE_EXCHANGE_ARCHITECTURE_2026_05_27.md) — **FUTURE ONLY**; no money movement; licensing **NOT OBTAINED**; launch **NO-GO** |
| **Objective** | Plan L-12/L-13 and live-money cert **without** executing without approval |
| **Allowed files** | `Ap786/**` plans, checklists, gate records |
| **Forbidden** | Stripe refund/replay; DB writes; claiming global money-path **proven** |
| **Validation** | Plans reference G-02/G-03/G-04; no PASS without execution evidence |
| **Exit criteria** | Approved runbooks + board ack for execution window |
| **Business impact** | Unblocks money-path narrative for launch path |
| **Technical risk** | High if executed without gates |
| **Dependencies** | Track E; payments owner approval |

---

## Track D — Credential Rotation Approval Planning

| Field | Value |
|-------|-------|
| **Gate 4 pack (2026-05-22)** | [ZORA_WALAT_GATE4_SECURITY_CREDENTIAL_APPROVAL_PACK_2026_05_22.md](./ZORA_WALAT_GATE4_SECURITY_CREDENTIAL_APPROVAL_PACK_2026_05_22.md) + rotation matrix + custody checklist + blocker register |
| **Objective** | Complete G-01 approval package for rotation **execute** when authorized |
| **Allowed files** | `Ap786/**`, `P0_OPERATOR_AUTH_*` updates (docs) |
| **Forbidden** | rotation execute; env commits; credential values in repo |
| **Validation** | `secrets:scan`; dry-run evidence only |
| **Exit criteria** | Written approval + ticket; execute deferred to Track H with G-01 |
| **Business impact** | Security hygiene before launch |
| **Technical risk** | High on execute — **gated** |
| **Dependencies** | Security + ops sign-off |

---

## Track E — L-12 / L-13 Proof Readiness

| Field | Value |
|-------|-------|
| **Objective** | Move L-12 from **NOT PROVEN** and L-13 from **BLOCKED** to executable readiness |
| **Allowed files** | `Ap786/**`, `L13_*` checklist updates (docs) |
| **Forbidden** | L-13 execution without G-02; fake PASS rows |
| **Validation** | Checklist complete; harness scope documented |
| **Exit criteria** | Ap786 PASS docs after **approved** execution (Track H) |
| **Business impact** | Refund/duplicate safety for investors |
| **Technical risk** | Critical on execution |
| **Dependencies** | Track C; L-11 stable |

---

## Track F — Production Go/No-Go Gate Pack

| Field | Value |
|-------|-------|
| **Objective** | Board-ready **go/no-go** gates 1–12 + blocker register + decision template |
| **Delivered (2026-05-22)** | [ZORA_WALAT_PRODUCTION_GO_NO_GO_GATE_PACK_2026_05_22.md](./ZORA_WALAT_PRODUCTION_GO_NO_GO_GATE_PACK_2026_05_22.md) and companions |
| **Current verdict** | **NO-GO** prod/real-money — **not** production-ready |
| **Allowed files** | `Ap786/**` go/no-go docs only |
| **Forbidden** | Pre-filled GO; fake signatures; production-ready claim |
| **Exit criteria** | Gates MET + decision record **GO** — **not met today** |
| **Dependencies** | Tracks A, B, E progress |

---

## Track G — Investor Demo / Export Refinement

| Field | Value |
|-------|-------|
| **Objective** | Refine demo script, export PDFs, diligence deck alignment — **no** new claims |
| **Allowed files** | `Ap786/**`, external deck copies (not in repo if marketing) |
| **Forbidden** | Production-ready language; live-money demo without G-04 |
| **Validation** | Claim matrix review; test-mode labels |
| **Exit criteria** | Rehearsal notes filed; T-10 tracker ready for review |
| **Business impact** | Better diligence meetings |
| **Technical risk** | Medium (overclaim in live demo) |
| **Dependencies** | PR #35 PNGs; market readiness pack |

---

## Track H — Real Implementation (approval required)

| Field | Value |
|-------|-------|
| **Objective** | Code, infra, Stripe, DB, deploy — **only** when user explicitly approves scope |
| **Allowed files** | Per approved scope — `app/`, `server/`, infra, etc. |
| **Forbidden** | Starting without written approval; any row in dangerous-op matrix without gate |
| **Validation** | CI + Guard + scoped tests; no secrets in commits |
| **Exit criteria** | Per approved ticket — evidence filed in Ap786 |
| **Business impact** | Can unblock launch **only** with gates |
| **Technical risk** | **Critical** |
| **Dependencies** | Tracks A–F as applicable; G-01–G-11, LAUNCH |

### Dangerous operations (Track H — always gated)

| Operation | Gate |
|-----------|------|
| Credential rotation execute | G-01 |
| Env changes | G-09 |
| DB writes / migrations | G-07 |
| Stripe refunds | G-03 / G-11 |
| Webhook replays | G-02 · STR-02 **404 FAILED**; PR #72 route bridge **MERGED**; PR72 Vercel route evidence **PARTIAL DEPLOYMENT EVIDENCE CAPTURED**; invalid-signature route reachability **PROVEN PARTIAL**; STR-03 controlled sandbox proof **SCREENSHOTS INGESTED / PARTIAL INCONCLUSIVE** with Vercel runtime correlation **NOT FOUND**; STR-04 correlation gap investigation **FILED / READ-ONLY ONLY**; STR-05 source review **FILED**; STR-07 readiness scaffold **PENDING CAPTURE / NO PROBE** |
| Webhook remediation (fast ACK / async) | Track H + [remediation plan](./ZORA_WALAT_CHECKOUT_EXPIRED_TIMEOUT_REMEDIATION_PLAN_2026_05_23.md) + [implementation approval gate](./ZORA_WALAT_STRIPE_WEBHOOK_FAST_ACK_IMPLEMENTATION_APPROVAL_GATE_2026_05_23.md) |
| Wallet credits | Human + payments |
| Service fulfillment | Human + payments |
| Production deploy | LAUNCH |
| Self-healing apply | G-10 |

---

## 3. Dangerous-operation controls (all tracks)

| Control | Policy |
|---------|--------|
| Autonomous agents | **Docs default** — Ap786 only |
| CI | May run zw-doctor read-only — **not** apply |
| Human | Only gate holders execute dangerous ops |
| Evidence | Enum-only, sanitized — Ap786 rules |

---

## 4. Recommended sequencing

```text
Parallel (docs-safe):  A + G + F (planning)
Then:                  B (OBS filing, may need H for tooling)
Then:                  C + D + E (plans)
Gate review:           F → board
Only if approved:      H (scoped implementation)
```

---

## 5. Per-track validation checklist

| Check | All doc tracks | Track H only |
|-------|----------------|--------------|
| `git diff` Ap786-only (or approved paths) | Yes | Per scope |
| `git diff --check` | Yes | Yes |
| `npm run secrets:scan` | Yes | Yes |
| No QA PASS / prod-ready in new docs | Yes | N/A |
| User track selection recorded | Yes | Yes + approval phrase |

---

*Next Engineering Tracks · ask user which track · Track H requires explicit approval · not launch-ready*
