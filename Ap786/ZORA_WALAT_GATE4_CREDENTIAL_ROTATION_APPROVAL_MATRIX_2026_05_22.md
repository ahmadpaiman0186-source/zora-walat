# Zora-Walat — Gate 4 Credential Rotation Approval Matrix

**Date:** 2026-05-22
**Gate:** 4 — Credential rotation approval
**Approval pack:** [ZORA_WALAT_GATE4_SECURITY_CREDENTIAL_APPROVAL_PACK_2026_05_22.md](./ZORA_WALAT_GATE4_SECURITY_CREDENTIAL_APPROVAL_PACK_2026_05_22.md)

**Policy:** **No secret values** in this matrix. **Execution allowed = NO** for all rows until real approval is filed. Placeholder owner roles only.

---

## 1. Purpose

Define **who must approve**, **what evidence is required**, and **when rotation execute is permitted** for each credential class — without performing rotation in this task.

---

## 2. Rotation approval model

| Phase | Activity | Agent/automation allowed? |
|-------|----------|---------------------------|
| **Plan** | Document scope, rollback, validation | Docs only |
| **Approve** | Security + domain owner sign-off | Human only |
| **Execute** | Rotate in vendor console / hosting | Track H + G-01 only |
| **Validate** | Post-rotation health, webhooks, scans | Human + CI |
| **File** | Evidence in `Ap786/evidence/security-*` | Redacted only |

---

## 3. Credential classes

| Class | Vendor / system |
|-------|-----------------|
| Vercel project tokens / env | Vercel |
| Neon database credentials | Neon |
| Stripe publishable key | Stripe |
| Stripe secret key | Stripe |
| Stripe webhook signing secret | Stripe |
| Firebase config / service credentials | Firebase |
| CI/CD secrets | GitHub / CI |
| Admin / operator credentials | Application |
| External provider credentials | Third-party APIs |

---

## 4. Approval matrix

| Credential class | Environment | Risk level | Placeholder owner role | Approval required | Execution allowed? | Current status | Required evidence | Rollback requirement | Exit criteria |
|------------------|-------------|------------|------------------------|-------------------|--------------------|----------------|-------------------|----------------------|---------------|
| Vercel project tokens / env | production | Critical | SRE / Operations Owner | Security Owner + Engineering Owner | **NO** | **APPROVAL REQUIRED** | `SEC-ROT-PLAN-001`; custody checklist | Prior env snapshot procedure | Written approval + ticket |
| Vercel project tokens / env | staging | High | SRE / Operations Owner | Engineering Owner | **NO** | **PENDING REVIEW** | Rotation plan (staging) | Rebind prior staging env | Staging validation PASS |
| Neon database credentials | production | Critical | Engineering Owner | Security Owner + SRE / Operations Owner | **NO** | **NOT APPROVED** | `SEC-INV-003`; backup confirmation | Connection string rollback doc | DB connectivity test; no migration |
| Neon database credentials | staging | High | Engineering Owner | Engineering Owner | **NO** | **PENDING REVIEW** | Staging rotation plan | Staging rollback | Harness green |
| Stripe publishable key | production | High | Payments Owner | Payments Owner + Security Owner | **NO** | **NOT APPROVED** | Stripe Dashboard change record (redacted) | N/A (publishable) | Frontend checkout smoke (approved env) |
| Stripe secret key | production | Critical | Payments Owner | Payments Owner + Security Owner + Product Owner | **NO** | **NOT APPROVED** | G-01 execute auth; separation of duties | Revert key in Dashboard | Webhook + checkout test; zero live until G-04 |
| Stripe secret key | staging | Medium | Payments Owner | Payments Owner | **NO** | **IN USE (test)** | Test mode documented | Revert test key | L-1…L-11 harness — not prod proof |
| Stripe webhook signing secret | production | Critical | Payments Owner | Payments Owner + Security Owner | **NO** | **NOT APPROVED** | Webhook endpoint test plan | Prior secret invalidation procedure | Signed test event (test mode or approved window) |
| Stripe webhook signing secret | staging | High | Payments Owner | Payments Owner | **NO** | **PENDING REVIEW** | Staging webhook tests | Revert staging secret | L-4/L-5 replay docs |
| Firebase config / service credentials | production | High | Security Owner | Security Owner + Engineering Owner | **NO** | **NOT APPROVED** | Config review checklist | Prior service account disable | Auth flows verified |
| Firebase config / service credentials | staging | Medium | Security Owner | Engineering Owner | **NO** | **PENDING REVIEW** | Staging config doc | Rollback staging | Staging auth PASS |
| CI/CD secrets | CI | High | Engineering Owner | Security Owner | **NO** | **PENDING REVIEW** | `secrets:scan` + pipeline green | Revert secret in GH | CI green; no prod impact claim |
| Admin / operator credentials | production | Critical | Security Owner | Security Owner + Product Owner | **NO** | **NOT APPROVED** | MFA attestation; access list | Disable compromised accounts | Operator login audit (redacted) |
| Admin / operator credentials | staging | Medium | Security Owner | Engineering Owner | **NO** | **PARTIAL** (P-2 staging) | P-2 doc reference | Reset staging operators | P-2 PASS — not prod |
| External provider credentials | production | High | Engineering Owner | Security Owner + domain owner | **NO** | **PENDING EVIDENCE** | Provider inventory row | Provider rollback API doc | Provider health check |

---

## 5. Pre-rotation checks

| Check | Required | Status |
|-------|----------|--------|
| Incident ticket or planned maintenance ID | Yes | **PENDING EVIDENCE** |
| Rollback document approved | Yes | **PENDING EVIDENCE** |
| Custody checklist current | Yes | **PENDING EVIDENCE** |
| No concurrent deploy | Yes | **APPROVAL REQUIRED** |
| IC notified (prod classes) | Yes | **PENDING REVIEW** |
| `secrets:scan` baseline | Yes (if repo may change) | **COMPLETE (CI)** |

---

## 6. Rotation execution gates

| Gate | Condition | Status |
|------|-----------|--------|
| **Gate 4** | Security approval pack reviewed | **PENDING REVIEW** |
| **G-01** | Written execute authorization filed | **BLOCKED** |
| **G-04** | Required for live Stripe classes only | **BLOCKED** |
| **LAUNCH** | Prod deploy coordination | **NO-GO** |
| **Track H** | Explicit user approval for execute | **NOT APPROVED** |

**All execution:** **NO** until gates filed.

---

## 7. Post-rotation validation requirements

| Class | Validation (no secret logging) |
|-------|--------------------------------|
| Stripe | Test webhook signature; checkout smoke in approved env |
| Neon | `/api/ready` green; query smoke (read-only) |
| Vercel | Deploy preview smoke; env var presence check (names only) |
| Firebase | Auth token flow (staging first) |
| CI/CD | Pipeline run green |
| Operator | Login audit log enum |

---

## 8. Rollback requirements

| Class | Rollback | Max time target (proposed) |
|-------|----------|----------------------------|
| Stripe secret / webhook | Revert Dashboard keys; invalidate new secret | < 30m |
| Neon | Restore prior connection string | < 30m |
| Vercel env | Rebind previous env set | < 15m |
| Firebase | Disable new service account | < 30m |
| CI secret | Revert GH secret | < 15m |

Rollback execute = **Track H** + same approval gates as rotation.

---

## 9. Emergency rotation path

| Step | Requirement |
|------|-------------|
| 1 | IC declares credential incident (SEV1) |
| 2 | Security Owner authorizes emergency rotation |
| 3 | Separation of duties: approver ≠ sole executor |
| 4 | Execute in vendor console — **not** via agent automation |
| 5 | Post-rotation validation + redacted incident record |
| 6 | File `SEC-G01-EXEC-001` with ticket ID |

**Status:** Path **defined** — **NOT EXECUTED**.

---

## 10. Separation of duties

| Role | May approve? | May execute? |
|------|--------------|--------------|
| Security Owner | Yes | No (sole) |
| Payments Owner | Yes (Stripe) | With second operator |
| Engineering Owner | Yes (technical) | With Security approval |
| SRE / Operations Owner | Yes (hosting) | With Security approval |
| Agent / CI | **No** | **No** |

---

## 11. No-secret-recording rule

| Forbidden in evidence | Allowed |
|-----------------------|---------|
| Full API keys, tokens, `DATABASE_URL` values | Placeholder labels (`STRIPE_SECRET_KEY_*`) |
| Webhook signing secret strings | “rotated on [date]” + ticket ID |
| Screenshots with visible secrets | Redacted panels only |
| Env dumps in git | Name-only inventory |

---

## 12. Current approval status

| Summary | Count |
|---------|-------|
| Rows with execution **NO** | All |
| **NOT APPROVED** (prod) | Majority |
| **COMPLETE (CI scope)** | `secrets:scan` only |
| G-01 execute | **BLOCKED** |

---

## 13. Exit criteria (Gate 4 rotation plane)

Gate 4 rotation approval is **exit-ready** only when:

1. All **Critical** production rows have **APPROVED** status with filed `SEC-APPR-*` (not docs-only).
2. Custody checklist filed with no secret values.
3. Rotation plans exist per class (labels only).
4. G-01 execute authorization **still separate** — filing Gate 4 ≠ auto-enable G-01.
5. No launch claim until LAUNCH + G-04 as applicable.

**Current:** **APPROVAL REQUIRED / PENDING REVIEW** — matrix filed; **NOT EXECUTED**.

---

*Gate 4 Rotation Matrix · execution NO · placeholder roles only*
