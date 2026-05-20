# P0 — Operator local config guide (credential rotation dry-run)

**Date:** 2026-05-20  
**Audience:** Human operators only (not CI, not agents without gitignored config)  
**Sanitization:** No secrets, passwords, connection strings, tokens, or PII in this file.

---

## Why dry-run was BLOCKED

The guarded rotation workflow (`b460789`) is **working as designed**. Dry-run on 2026-05-20 returned:

| Signal | Value |
|--------|--------|
| **DRY_RUN_VERDICT** | `BLOCKED` |
| **Primary blocker** | `BLOCKED_MISSING_OPERATOR_EMAIL` |
| **Secondary signal** | `database_url_not_configured` (harness process had no usable `DATABASE_URL`) |
| **Tooling failure?** | **No** — local gitignored env was not configured on that host |

Until local config exists, dry-run **cannot** reach `DRY_RUN_VERDICT PASS` or `TARGET_OPERATOR_ROW_COUNT 1`.

---

## Gitignore coverage (do not commit these)

| Path | Ignored by | Purpose |
|------|------------|---------|
| `server/.env.local` | Root `.gitignore` (`.env.local`, `**/.env.*`); `server/.gitignore` (`.env*.local`) | Operator email, passwords, staging `DATABASE_URL` |
| `server/.env` | Root + `server/.gitignore` | Shared local overrides |
| `server/.staging-token.local` | `server/.gitignore` | JWT after login |
| `server/.staging-operator-email.local` | `server/.gitignore` | Cached operator email |
| `server/.staging-order-id.local` | `server/.gitignore` | L-11 order suffix reference |
| `server/.staging-checkout-url.local` | `server/.gitignore` | Checkout URL (never log) |
| `server/.staging-operator-verify-token.local` | `server/.gitignore` | Remote email-verify token |
| Repo root `.env.staging.local` | `**/.env.*` | Staging env variants |

**Tracked templates only:** `server/.env.local.example` (placeholders, no real secrets).

---

## Required local-only variables

Configure in **gitignored** `server/.env.local` and/or the **same PowerShell session** (values never committed).

| Variable | Required for | Notes |
|----------|--------------|-------|
| `STAGING_OPERATOR_EMAIL` | dry-run, diagnose, login | Must match staging user row / Vercel `OWNER_ALLOWED_EMAIL` if enforced |
| `DATABASE_URL` | diagnose, dry-run user lookup | Staging Neon branch URL from Vercel/Neon dashboard — **paste locally only** |
| `ZW_STAGING_CREDENTIAL_ROTATION` | all rotation modes | Set to `true` to arm staging-only guard |
| `STAGING_OPERATOR_NEW_PASSWORD` | dry-run (length gate) | **New** throwaway password for dry-run only; min 10 chars; never the exposed password |
| `STAGING_OPERATOR_PASSWORD` | optional for login test | Old password — treat as **compromised**; do not reuse after rotation |

### Must remain unset for dry-run

| Variable | Rule |
|----------|------|
| `STAGING_OPERATOR_ROTATION_APPROVAL` | **Unset** for dry-run. Any value (including a future approval line) causes `DRY_RUN_VERDICT BLOCKED`. |

### Forbidden in this guide

- Do **not** screenshot `.env.local`, passwords, tokens, or Neon/Vercel env screens.
- Do **not** commit `server/.env.local` or paste `DATABASE_URL` into Ap786, chat, or PRs.
- Do **not** invent credentials — use only staging accounts already provisioned in Neon/Vercel.

---

## Human-only setup steps (PowerShell)

Run from repository root. **Do not** run `credential-rotation-execute`.

### Step 1 — Create local config file (if missing)

```powershell
cd C:\Users\ahmad\zora_walat\server
Copy-Item .env.local.example .env.local -ErrorAction SilentlyContinue
# Edit .env.local in an editor — add STAGING_OPERATOR_EMAIL and DATABASE_URL locally only.
# Never commit .env.local.
```

### Step 2 — Arm rotation in the same session

```powershell
$env:ZW_STAGING_CREDENTIAL_ROTATION = "true"
# Optional session-only new password for dry-run (do not echo or screenshot):
# $env:STAGING_OPERATOR_NEW_PASSWORD = "<new password min 10 chars>"
Remove-Item Env:STAGING_OPERATOR_ROTATION_APPROVAL -ErrorAction SilentlyContinue
```

### Step 3 — Verify env wiring (read-only)

```powershell
node tools/staging-auth-checkout-operator.mjs auth-env-check
```

**Pass gate before dry-run:**

| Line | Expected |
|------|----------|
| `HAS_EMAIL` | `true` |
| `HAS_PASSWORD` | `true` or `false` (password optional for dry-run if `STAGING_OPERATOR_NEW_PASSWORD` set) |
| `EMAIL_LENGTH` | `> 0` |

### Step 4 — Diagnose (read-only)

```powershell
node tools/staging-auth-checkout-operator.mjs credential-rotation-diagnose
```

**Pass gate:**

| Line | Expected |
|------|----------|
| `STAGING_DB_REACHABLE` | `true` |
| `OPERATOR_USER_LOOKUP` | `found` |
| `DATABASE_URL_PRINTED` | `false` |

### Step 5 — Dry-run only

```powershell
node tools/staging-auth-checkout-operator.mjs credential-rotation-dry-run
```

**Pass gate:**

| Line | Expected |
|------|----------|
| `DRY_RUN_VERDICT` | `PASS` |
| `TARGET_OPERATOR_ROW_COUNT` | `1` |
| `DB_WRITE_PERFORMED` | `false` |
| `EXECUTE_MODE_RUN` | `false` |
| `CREDENTIAL_ROTATION_EXECUTED` | `false` |

### Step 6 — Clear session secrets

```powershell
Remove-Item Env:STAGING_OPERATOR_NEW_PASSWORD -ErrorAction SilentlyContinue
Remove-Item Env:ZW_STAGING_CREDENTIAL_ROTATION -ErrorAction SilentlyContinue
Remove-Item Env:STAGING_OPERATOR_ROTATION_APPROVAL -ErrorAction SilentlyContinue
```

---

## Execute remains forbidden here

`credential-rotation-execute` updates `passwordHash` in the database. It requires a **separate** operator approval step and exact approval env value. **Not** part of this guide.

After a future approved execute: re-run `login`, `status-check`, `phase1-truth-check`, and `npm run zw:smoke:staging`; archive enum-only evidence.

---

## Troubleshooting (sanitized)

| Symptom | Likely cause | Action |
|---------|--------------|--------|
| `HAS_EMAIL false` | `.env.local` missing or empty | Add `STAGING_OPERATOR_EMAIL` locally |
| `STAGING_DB_REACHABLE false` | `DATABASE_URL` missing/short | Copy staging URL from Vercel dashboard into `.env.local` only |
| `OPERATOR_USER_LOOKUP not_found` | Wrong DB branch or email | Confirm Neon branch per `P0_NEON_STAGING_BRANCH_GOVERNANCE_AUDIT.md` |
| `DRY_RUN_BLOCKERS approval_phrase...` | Approval env set | `Remove-Item Env:STAGING_OPERATOR_ROTATION_APPROVAL` |
| `LOGIN_HTTP 401` | Compromised/wrong password | Complete rotation only after dry-run PASS + separate approval |

---

## Related docs

- `P0_OPERATOR_AUTH_CREDENTIAL_ROTATION_PLAN.md`
- `P2_OPERATOR_AUTH_RELIABILITY.md`
- `P0_NEON_STAGING_BRANCH_GOVERNANCE_AUDIT.md`
