# P0 — Operator auth credential rotation plan (read-only diagnosis)

**Date:** 2026-05-19  
**Context:** P0 Neon/Vercel staging smoke passed; operator `login` failed with credential rejection.  
**Sanitization:** No passwords, tokens, hashes, `DATABASE_URL`, Stripe keys, full emails, or PII in this file.

---

## Executive status

| Field | Value |
|-------|--------|
| **OPERATOR_AUTH_STATUS** | `BLOCKED_INVALID_CREDENTIALS` |
| **PASSWORD_EXPOSURE_STATUS** | `ROTATION_REQUIRED` |
| **LOGIN_HTTP** | `401` |
| **ROUTE_DIAGNOSIS** | `invalid_credentials` |
| **API_SURFACE_LIKELY** | `api_serverless` |
| **TOKEN_OK** | `false` |
| **TOKEN_SAVED** | `false` |
| **USING_ENV_EMAIL** | `true` |
| **USING_ENV_PASSWORD** | `true` |
| **EMAIL_LENGTH** | `25` |
| **PASSWORD_LENGTH** | `17` |
| **DB/ENV mutation performed** | `no` |
| **Recommended next step** | Guarded staging-only credential rotation after read-only existence checks |

**Interpretation:** HTTP **401** on `POST /api/auth/login` with diagnosis `invalid_credentials` means the request reached the **API auth handler** (not a Next.js 404/HTML mis-deploy). The API intentionally returns the same code for missing user, inactive user, and wrong password — client output cannot distinguish them.

**Password exposure:** Operator password was visible in a screenshot and must be treated as **compromised**. Rotate credentials even if the immediate failure is wrong password, stale hash, or wrong staging database.

---

## 1. Auth flow (repository)

| Layer | Path / artifact | Role |
|-------|-----------------|------|
| Slim login handler | `server/api/slimAuthLoginHandler.mjs` | `POST /api/auth/login` on Vercel fast path |
| Login service | `server/src/services/authService.js` → `loginUser()` | Prisma lookup by email; `bcrypt.compare`; issues JWT |
| Owner gate | `server/src/middleware/ownerOnlyAccessGuard.js` | If `OWNER_ALLOWED_EMAIL` set, mismatch → **403** (not 401) |
| Operator harness | `server/tools/staging-auth-checkout-operator.mjs` | `login`, `register`, `auth-env-check`, `auth-check` |
| Env helpers | `server/tools/stagingOperatorAuthEnv.mjs` | Loads `.env` + `.env.local`; length-only diagnostics |
| Route classifier | `server/tools/stagingOperatorRouteDiagnostics.mjs` | Maps login **401** → `invalid_credentials` |
| Email verify (staging) | `server/scripts/staging-verify-operator-email.mjs` | Remote/local DB row check — **can mutate** `emailVerifiedAt` (see §3) |

### `loginUser()` failure modes (all → HTTP 401, same error code)

| Condition | Server behavior |
|-----------|-----------------|
| No user row for email | 401 `auth_invalid_credentials` |
| `isActive === false` | 401 `auth_invalid_credentials` |
| Password does not match `passwordHash` | 401 `auth_invalid_credentials` |

**Not this failure:** `OWNER_ALLOWED_EMAIL` mismatch → **403** `owner_only_access_denied`.

---

## 2. Root-cause hypothesis (ranked)

| Rank | Hypothesis | Evidence for | Evidence against |
|------|------------|--------------|------------------|
| 1 | **Wrong or compromised password** | 401 + `invalid_credentials`; env password present (length 17); exposure requires rotation | — |
| 2 | **Password hash mismatch** | Staging user exists but hash from older registration / manual DB edit | Would still show 401 |
| 3 | **Operator user missing on current staging DB** | Neon branch ambiguity (`P0_NEON_STAGING_BRANCH_GOVERNANCE_AUDIT.md`); Vercel `DATABASE_URL` not in repo | 401 same as wrong password |
| 4 | **Inactive user** | `isActive false` returns same 401 | No inactive flag in harness output |
| 5 | **Wrong staging database branch** | Branch `staging-stripe-test-2026-05-12` may not match user that passed P-2 earlier | API surface is correct serverless |
| 6 | **Env mismatch** | Local `STAGING_OPERATOR_*` differs from Vercel `OWNER_ALLOWED_EMAIL` / registered email | `USING_ENV_EMAIL/PASSWORD true`; would be **403** if owner email wrong |
| 7 | **Role/permission** | Unlikely for login | Login does not check role before password |

**Primary verdict:** Treat as **credential failure on the active staging API** plus **mandatory password rotation** due to screenshot exposure. Confirm user row + DB mapping before any write.

---

## 3. Safe diagnostic commands (read-only or low-risk)

### Already safe (no DB write)

```powershell
cd server
node tools/staging-auth-checkout-operator.mjs auth-env-check
node tools/staging-auth-checkout-operator.mjs login
```

`auth-env-check` prints: `HAS_EMAIL`, `HAS_PASSWORD`, `EMAIL_LENGTH`, `PASSWORD_LENGTH`, token file state — **no secret values**.

### Existence probe — register (use with care)

```powershell
node tools/staging-auth-checkout-operator.mjs register
```

| `REGISTER_HTTP` | Meaning |
|-----------------|--------|
| **409** + `USER_ALREADY_EXISTS_USE_LOGIN true` | Email **exists** on DB behind staging API |
| **201** | **Created new user** — stop; do not continue without governance approval |
| **403** | Owner-only or registration blocked |

**Do not use register** if creating a new staging user is forbidden. Prefer Neon read-only SQL or the remote verify flow below with eyes open.

### Staging user row check — remote verify (may mutate)

```powershell
# Requires Vercel: STAGING_ALLOW_OPERATOR_EMAIL_VERIFY, STAGING_OPERATOR_EMAIL, STAGING_OPERATOR_VERIFY_TOKEN
# Local: STAGING_OPERATOR_VERIFY_USE_REMOTE=true, STAGING_OPERATOR_VERIFY_TOKEN=<from Vercel>
node scripts/staging-verify-operator-email.mjs
```

| Output | Read-only? |
|--------|------------|
| `OPERATOR_EMAIL_ROW_FOUND true` | Informative |
| `OPERATOR_EMAIL_ROW_FOUND false` / `user_missing_or_inactive` | User missing or inactive |
| `emailVerifiedSet true` | **Not read-only** — sets `emailVerifiedAt` if was null |

**Use remote verify only** when operator accepts possible email-verify side effect, or email is already verified (response `emailWasAlreadyVerified`).

### No safe in-repo password reset

| Script | Status |
|--------|--------|
| `npm run auth:check-user` | Referenced in `package.json` but **script file not present** in tree — do not rely on |
| Forgot-password / admin reset API | **Not found** in staging operator tooling |
| `ensure-local-checkout-dev-user.mjs` | **Local dev only** — not staging rotation |

---

## 4. Proposed read-only enhancement (not implemented)

Add harness mode `operator-user-probe` (or slim `GET` ops route) returning booleans only:

- `OPERATOR_USER_EXISTS`
- `OPERATOR_USER_ACTIVE`
- `OPERATOR_EMAIL_VERIFIED`
- `EMAIL_HASH` (16-char sha256 prefix, same as verify handler)

Must **not** update rows, print passwords, or log `DATABASE_URL`. Requires unit tests before enable.

---

## 5. Guarded credential rotation plan (after diagnosis approval)

**Approval phrase (future execution only — not executed in this audit):**

```text
Approved: staging operator credential rotation
```

### Phase A — Confirm target database (read-only)

1. Complete Neon/Vercel mapping per `P0_NEON_STAGING_BRANCH_GOVERNANCE_AUDIT.md`.
2. Run `register` probe or approved remote verify to confirm `OPERATOR_EMAIL_ROW_FOUND`.
3. Confirm `OWNER_ALLOWED_EMAIL` on Vercel matches operator email (403 vs 401).

### Phase B — Rotate password (staging only)

1. Generate a **new** password offline (password manager; never screenshot, chat, or git).
2. Update password using **one** controlled path (operator choice):
   - **Preferred:** Neon SQL editor on confirmed staging branch — `UPDATE` `passwordHash` with bcrypt hash generated locally (`bcrypt` rounds **12**, same as `authService.js`). Use a one-off local Node snippet; do not commit script output containing hash.
   - **Alternative:** If user row missing, **governed** `register` once on staging API, then login — only with explicit approval (creates row).
3. Update **local only** (gitignored): `server/.env.local` `STAGING_OPERATOR_PASSWORD` — **not** committed.
4. Clear stale token: delete `server/.staging-token.local` if present.
5. Verify:
   ```powershell
   node tools/staging-auth-checkout-operator.mjs login
   node tools/staging-auth-checkout-operator.mjs status-check
   ```

### Phase C — Invalidate exposure

1. Assume old password known — rotation mandatory regardless of login outcome.
2. If JWT was ever issued to a compromised session, delete `.staging-token.local` and re-login after rotation.
3. Do not reuse old password in Vercel, Neon notes, or tickets.

### Rollback / safety

| Risk | Mitigation |
|------|------------|
| Wrong Neon branch | Confirm Vercel `DATABASE_URL` mapping before any `UPDATE` |
| Accidental user creation | Avoid `register` **201**; use 409 probe first |
| Lockout | Keep break-glass Neon role; document hash rollback only with backup |
| Email verify mutation | Skip `staging-verify-operator-email` until rotation done, or use when already verified |
| Production impact | Staging credentials only; never copy staging hash to production |

**Forbidden without separate approval:** production env changes, Neon branch delete/expire, migrations, payments, refunds, webhook resend.

---

## 6. Actions not performed (this audit)

| Action | Status |
|--------|--------|
| Database row updates | **No** |
| Password reset / hash update | **No** |
| User creation | **No** |
| Vercel env change | **No** |
| Neon change | **No** |
| Migrations | **No** |
| Money-moving operations | **No** |

---

## 7. Next safe command list

```powershell
cd server
npm run secrets:scan
node tools/staging-auth-checkout-operator.mjs auth-env-check
node tools/staging-auth-checkout-operator.mjs login
# Optional existence (409-only safe path):
node tools/staging-auth-checkout-operator.mjs register
npm run zw:doctor -- incidents --json --no-operator --no-staging
```

After approval: execute §5 rotation phases; record PASS in a new sanitized evidence file (enum-only login/status-check lines).

---

## 8. Implementation (2026-05-20) — workflow added, execution not run

| Item | Status |
|------|--------|
| Tool | `server/tools/stagingOperatorCredentialRotation.mjs` |
| Harness modes | `credential-rotation-diagnose`, `-plan`, `-dry-run`, `-execute` |
| Tests | `server/test/stagingOperatorCredentialRotation.test.js` |
| Credential rotation executed | **No** |
| DB mutation performed | **No** |
| Execute mode run (this session) | **No** |
| Rotation still pending | **Yes** — requires future operator phrase `Approved: staging operator credential rotation` |

### Arm staging rotation (required before diagnose/dry-run)

```powershell
cd server
$env:ZW_STAGING_CREDENTIAL_ROTATION = "true"
$env:STAGING_OPERATOR_EMAIL = "<staging operator email>"
# Do NOT reuse compromised password. For dry-run only (length check):
$env:STAGING_OPERATOR_NEW_PASSWORD = "<new password — never commit>"
```

### Safe commands (read-only / dry-run only until approved)

```powershell
node tools/staging-auth-checkout-operator.mjs credential-rotation-diagnose
node tools/staging-auth-checkout-operator.mjs credential-rotation-plan
node tools/staging-auth-checkout-operator.mjs credential-rotation-dry-run
# Execute blocked until STAGING_OPERATOR_ROTATION_APPROVAL exact phrase is set:
# node tools/staging-auth-checkout-operator.mjs credential-rotation-execute
```

---

## Related evidence

- `P2_OPERATOR_AUTH_RELIABILITY.md` (prior PASS — may be stale vs current DB/password)
- `P0_NEON_STAGING_BRANCH_GOVERNANCE_AUDIT.md`
- `SUPER_SYSTEM_STAGING_SMOKE_PROOF.md`
- `SUPER_SYSTEM_INCIDENT_RESPONSE_AND_APPROVAL_WORKFLOW.md`
