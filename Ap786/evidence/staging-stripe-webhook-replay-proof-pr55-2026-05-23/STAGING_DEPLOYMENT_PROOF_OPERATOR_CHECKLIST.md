# Staging Deployment Proof — Operator Checklist (PR #55)

**Date:** 2026-05-23
**Status:** **PENDING OPERATOR EXECUTION**
**Evidence ID:** DEP-01 → `VERCEL-STAGING-DEPLOYMENT-PR55-COMMIT-001.png`
**Target merge:** PR #55 @ `c521b0f` (contains `abb9531`)

---

## 1. Purpose

Confirm **staging** (not production) is running code that includes PR #55 before any Stripe replay. **Agent must not deploy or call Vercel APIs.**

---

## 2. Preconditions

| # | Check | Status |
|---|-------|--------|
| D-01 | PR #55 merged to `main` | **CONFIRMED** |
| D-02 | Operator has Vercel access to **staging** project only (or staging preview) | **PENDING OPERATOR** |
| D-03 | Ticket / change window ID recorded (no secret in git) | **REQUIRED** |
| D-04 | Production deploy **not** in scope | **CONFIRMED** |

---

## 3. Operator steps (dashboard only)

| Step | Action | Expected | Forbidden |
|------|--------|----------|-----------|
| 1 | Open Vercel → project **`zora-walat-api-staging`** (or documented staging alias) | Staging project visible | Production project promote |
| 2 | Deployments tab → locate deployment whose Git commit is **`c521b0f`** or merge descendant containing PR #55 | Commit SHA visible | Changing env vars |
| 3 | Verify deployment status **Ready** / **Active** for staging traffic | Green / active | CLI `vercel deploy --prod` |
| 4 | Optional: note deployment URL host matches `zora-walat-api-staging.vercel.app` | Hostname match | Hitting production URL |
| 5 | Screenshot → save as `VERCEL-STAGING-DEPLOYMENT-PR55-COMMIT-001.png` in this folder | PNG filed | Fabricated image |
| 6 | Update [EVIDENCE_MANIFEST.md](./EVIDENCE_MANIFEST.md) row DEP-01 to **EVIDENCE FILED (redacted)** | Manifest updated | Mark PASS without PNG |

---

## 4. Redaction rules

| Field | Rule |
|-------|------|
| Vercel team / personal tokens | **Never** in screenshot |
| Internal preview URLs (non-staging) | Crop or blur |
| Env var values | **Never** visible |
| Commit SHA | **Keep** (proves deploy) |

---

## 5. Exit criteria

| # | Criterion | Status |
|---|-----------|--------|
| E-DEP-01 | Staging deployment SHA includes PR #55 | **PENDING CAPTURE** |
| E-DEP-02 | DEP-01 PNG filed | **PENDING CAPTURE** |
| E-DEP-03 | Production unchanged attestation (operator note) | **PENDING OPERATOR** |

**Deployment proof:** **NOT PASS** until E-DEP-01 and E-DEP-02 met.

---

## 6. What this does not prove

| Claim | Status |
|-------|--------|
| Webhook timeout fixed | **NOT PROVEN** |
| Production ready | **NO-GO** |
| Real-money safe | **NO-GO** |
| Pilot approved | **NO-GO** |

---

*Staging deployment checklist · operator-only · no Agent deploy*
