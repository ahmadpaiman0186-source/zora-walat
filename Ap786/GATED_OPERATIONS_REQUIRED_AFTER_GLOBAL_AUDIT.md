# Gated operations required after global audit

**Date:** 2026-05-20  
**Purpose:** Runbooks for operations that **must not** run in CI, agents, or unattended automation.  
**Policy:** Propose only in audits; execute only with documented human approval.

**Sanitization:** No secrets, approval phrases quoted as policy labels only.

---

## 1. Operations deferred (forbidden without approval)

| ID | Operation | Why gated | Prerequisites | Evidence to capture |
|----|-----------|-----------|---------------|---------------------|
| G-01 | `credential-rotation-execute` | Account takeover risk | Exact `STAGING_OPERATOR_ROTATION_APPROVAL`; gitignored email; dry-run PASS | Enum-only login result |
| G-02 | L-13 duplicate `charge.refunded` resend | Double-refund state risk | L-11 stable; Neon branch confirmed; approval phrase | Before/after status-check |
| G-03 | L-12 partial refund | New money semantics | Product/legal sign-off; harness modes | Ap786 L-12 doc |
| G-04 | Production Stripe live mode | Real money | Production preflight; key rotation; monitoring | Separate cert program |
| G-05 | Vercel env change | Wrong URL/key blast | Change ticket; zw-doctor post-check | Redacted env **names** only in ticket |
| G-06 | Neon branch delete/expire | Data loss | P0 governance; explicit approval | Dashboard screenshot policy (no secrets) |
| G-07 | Prisma migrate deploy (prod) | Schema drift | Staging migrate PASS; backup | Migration id only |
| G-08 | `l11-refund-execute` | Money out | `Approved: L-11 execute full refund` | L11 post-refund verify |
| G-09 | Webhook Dashboard resend (L-4/L-13) | Duplicate processing | Test mode; approval phrase | Operator enums unchanged |
| G-10 | `ZW_SELF_HEALING_APPLY=true` | Autonomous repair | Security review; incident commander | Drift scan output |
| G-11 | Production deploy | Customer impact | CI green; rollback plan | Deploy id + smoke |

---

## 2. Safe pre-steps (allowed before gated op)

| Step | Command / action |
|------|------------------|
| Read-only diagnose | `npm run zw:doctor -- summary --strict` |
| CI static | `npm run zw:doctor -- incidents --ci-static` |
| Secrets scan | `npm run secrets:scan` |
| Rotation dry-run | `credential-rotation-dry-run` (no execute) |
| L-11 preflight | `l11-preflight`, `l11-refund-target` |
| Neon governance read | `P0_NEON_STAGING_BRANCH_GOVERNANCE_AUDIT.md` |

---

## 3. G-01 — Credential rotation execute (runbook sketch)

1. Confirm LOGIN_HTTP 401 documented.  
2. Complete `P0_OPERATOR_LOCAL_CONFIG_GUIDE.md` local gitignored config.  
3. Run `credential-rotation-diagnose` → `plan` → `dry-run` (must PASS).  
4. Set approval env to **exact** phrase (operator only, not agent).  
5. Run `credential-rotation-execute` once.  
6. Run `login` + `status-check` — capture HTTP codes and enums only.  
7. Record in Ap786; **never** commit tokens.

**Agent rule:** Never set `STAGING_OPERATOR_ROTATION_APPROVAL`.

---

## 4. G-02 — L-13 duplicate refund proof (runbook sketch)

1. Confirm target order suffix and REFUNDED incident from L-11.  
2. Confirm Neon branch `staging-stripe-test-2026-05-12` (name only).  
3. Stripe Dashboard test mode → resend `charge.refunded` once.  
4. `status-check` + `phase1-truth-check` before/after — enums must match.  
5. Confirm duplicate manual refund denied in checklist.  
6. Update `L13_*` evidence — **only** mark PASS if executed.

**Agent rule:** Never resend webhooks.

---

## 5. G-11 — Production deploy (runbook sketch)

1. `main` CI + Guard green.  
2. `productionDeploymentPreflight` PASS.  
3. Confirm deploy root = `server/`.  
4. Deploy via Vercel (human).  
5. `/api/health` + `/ready` 200.  
6. Optional: staging smoke first.

**Agent rule:** Never deploy.

---

## 6. Rollback

| Layer | Action |
|-------|--------|
| Git | Revert merge commit on `main` |
| Vercel | Promote previous deployment |
| DB | **No** autonomous rollback — DBA approval |

---

*This document does not authorize execution — it gates it.*
