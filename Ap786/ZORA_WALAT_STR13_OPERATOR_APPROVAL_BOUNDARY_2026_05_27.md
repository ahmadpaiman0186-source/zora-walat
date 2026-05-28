# STR-13 Operator Approval Boundary

**Date:** 2026-05-27
**Status:** **BOUNDARY FILED — NO EXECUTION AUTHORIZED**
**Companion:** [ZORA_WALAT_STR13_POST_STR12_RUNTIME_PROOF_SCAFFOLD_2026_05_27.md](./ZORA_WALAT_STR13_POST_STR12_RUNTIME_PROOF_SCAFFOLD_2026_05_27.md)

---

## 1. Purpose

Define what STR-13 allows by default (docs/evidence planning) versus what requires a separate explicit approval phrase before any operator or Agent action.

---

## 2. Allowed without extra approval (STR-13 scaffold scope)

| Action | Status |
|--------|--------|
| Create or update Ap786 Markdown planning/evidence docs | **ALLOWED** |
| Maintain STR13 evidence manifests and conservative verdict templates | **ALLOWED** |
| Reference existing merged Ap786 evidence (STR-02…STR-12, PR #87/#89) | **ALLOWED** |
| Read-only review of public program baseline stated by operator | **ALLOWED** |
| File **PENDING CAPTURE** statuses in capture matrix | **ALLOWED** |
| Run `secrets:scan` on docs-only changes if part of validation workflow | **ALLOWED** |

---

## 3. Requires explicit separate approval

| Action | Approval required | Default status |
|--------|-------------------|----------------|
| HTTP probe to staging `/webhooks/stripe` | `APPROVE STR-13 STAGING AUDIT DEPLOYMENT AND INVALID-SIGNATURE PROOF ONLY` (or future exact phrase) | **NOT AUTHORIZED** |
| Stripe resend / replay / test event / CLI trigger | Separate Stripe proof gate (not STR-13 scaffold) | **NOT AUTHORIZED** |
| Vercel deploy / redeploy / project settings / env / domain edits | Separate operator + platform approval | **NOT AUTHORIZED** |
| Vercel CLI or Vercel API calls | Separate operator approval | **NOT AUTHORIZED** |
| DB read / query against staging or production | Separate read-only approval if ever allowed | **NOT AUTHORIZED** |
| DB mutation (insert/update/delete/migration) | Separate approval; money-path gates | **FORBIDDEN** |
| Payment / wallet / order / refund mutation | G-02/G-04 and payments owner gates | **FORBIDDEN** |
| Production or live-mode Stripe/Vercel actions | Board + Gate 4 + G-04 | **FORBIDDEN** |
| Self-healing apply | G-10 policy | **GATED / NOT ENABLED** |

---

## 4. Agent hard locks (always)

| Lock | Status |
|------|--------|
| No app/server/workflow/Vercel config/env/package changes in STR-13 scaffold | **ENFORCED** |
| No claim that STR-12 merge proves runtime behavior | **ENFORCED** |
| No production-ready, real-money-ready, pilot-ready, or fix-proven claim | **ENFORCED** |
| No bundled approval for deploy + probe + replay in one step | **ENFORCED** |

---

## 5. Conservative verdict

| Item | Status |
|------|--------|
| STR-13 default scope | **DOCS / EVIDENCE PLANNING ONLY** |
| Runtime proof execution | **NOT AUTHORIZED** |
| Production / real-money / controlled pilot | **NO-GO** |

---

*STR-13 operator boundary — scaffold only*
