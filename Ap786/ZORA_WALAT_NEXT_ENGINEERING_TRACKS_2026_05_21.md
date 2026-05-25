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
| Webhook replays | G-02 · STR-02 **404 FAILED**; Vercel diagnostics **COMPLETE** (webhook route **missing** on deploy); fix branch **`fix/str02-404-webhook-routing-staging-2026-05-24`** (not created) |
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
