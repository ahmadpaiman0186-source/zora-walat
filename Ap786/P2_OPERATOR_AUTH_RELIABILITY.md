# P-2 — Operator auth reliability (staging harness)

**Status:** **Harness PASS** — **full P-2 PASS** (operator login + status-check **200** on staging)  
**Date:** 2026-05-18 (full pass verified same day)  
**Rules:** No secrets, JWTs, passwords, raw env values, or API keys in this file.

---

## 1. Symptoms observed

| Symptom | Meaning |
|---------|---------|
| `LOCAL_VALIDATION_ERROR password_required` | `STAGING_OPERATOR_PASSWORD` empty in **this** process (common on Windows PowerShell when env not set in same session) |
| `LOGIN_HTTP 401` + `TOKEN_OK false` | Staging API rejected email/password (wrong creds, inactive user, or email not registered on staging) |
| `STATUS_CHECK_HTTP 401` | **Missing or expired** token in `.staging-token.local` (`TOKEN_MISSING_OR_EXPIRED`), or API rejected Bearer (`TOKEN_REJECTED_BY_API`) |
| `LOGIN_HTTP 401` with password present | Invalid staging credentials, unknown user, or inactive account — **not** a harness/token-save bug |
| Interactive hang on `login` | Agent/non-TTY ran old flow that prompted for email before checking env |

---

## 2. Root cause (confirmed)

| # | Cause | Detail |
|---|--------|--------|
| 1 | **Env not in process** | PowerShell `Read-Host` does **not** set `STAGING_OPERATOR_PASSWORD`. Copy/paste or a different shell window leaves `process.env` empty → `password_required`. |
| 2 | **Login ignored env-first pattern** | `login` called `resolveEmail()` (interactive) before password; unlike `register`, it did not fail fast without TTY when env missing. |
| 3 | **No `.env.local` load** | Operator did not load `server/.env.local`, so credentials stored only there were invisible to the script. |
| 4 | **`LOGIN_HTTP 401`** (when password present) | Staging `POST /api/auth/login` returned **401** `auth_invalid_credentials` — password not accepted for that email on staging (operator must use staging-registered account or fix password). Not a token-path bug. |
| 5 | **Status-check 401 after expired token** | `.staging-token.local` JWT expired; status-check called API with bad Bearer → **401**, previously reported as generic `auth_token_invalid_or_denied`. |

**Not root cause:** Slim operator order-status route mismatch (would be **503** `staging_operator_order_status_disabled`, not login **401**).

---

## 3. Fix (repository)

| Change | File |
|--------|------|
| Load `server/.env` + `server/.env.local` at startup | `tools/staging-auth-checkout-operator.mjs` |
| Env-first `resolveLoginCredentials()` (fail fast, no hang) | same |
| `auth-env-check` mode — HAS_EMAIL / HAS_PASSWORD / PASSWORD_LENGTH only | same |
| `auth-check` mode — login + token + status-check | same |
| Login diagnostics (origin, path, HTTP, safe codes) | same |
| Token file path, expiry ISO, TOKEN_MISSING_OR_EXPIRED | same |
| Status-check: ORDER_AUTH_FAILURE / ORDER_STATE_UNAVAILABLE on auth errors | same |
| Pure helpers + tests | `tools/stagingOperatorAuthEnv.mjs`, `test/stagingOperatorAuthEnv.test.js` |

**Unchanged:** Staging API auth model (`POST /api/auth/login`, bcrypt, JWT). No payment/webhook changes.

---

## 4. Environment variables

| Variable | Required for | Notes |
|----------|----------------|-------|
| `STAGING_OPERATOR_EMAIL` | `login`, `auth-check` | Normalized to lowercase |
| `STAGING_OPERATOR_PASSWORD` | `login`, `auth-check` | Never printed; length only in diagnostics |
| `STAGING_OPERATOR_OTP` | `verify-otp` only | Optional |

**Vercel staging (API side, names only):** `OWNER_ALLOWED_EMAIL` — if set, login email must match or API returns **403** (not 401). `STAGING_ALLOW_OPERATOR_ORDER_STATUS` — required for slim status-check (else fallback/503).

---

## 5. Commands to run (Windows PowerShell)

Set env in the **same** session, then:

```powershell
cd C:\Users\ahmad\zora_walat\server
$env:STAGING_OPERATOR_EMAIL = "you@example.com"
$env:STAGING_OPERATOR_PASSWORD = "YourStagingPassword"
node tools/staging-auth-checkout-operator.mjs auth-env-check
node tools/staging-auth-checkout-operator.mjs login
node tools/staging-auth-checkout-operator.mjs status-check
```

Or one-shot verification:

```powershell
node tools/staging-auth-checkout-operator.mjs auth-check
```

Optional: put `STAGING_OPERATOR_*` in gitignored `server/.env.local` (loaded automatically).

---

## 6. Pass criteria (P-2)

| Check | Pass |
|-------|------|
| `auth-env-check` → HAS_EMAIL/HAS_PASSWORD true, PASSWORD_LENGTH ≥ 1 | Env wired |
| `login` → LOGIN_HTTP **200**, TOKEN_OK **true**, TOKEN_SAVED **true** | Staging creds valid |
| `status-check` → STATUS_CHECK_HTTP **200**, ORDER_FOUND **true** | Token + order valid |

---

## 7. P-2 verdict

| Layer | Verdict |
|-------|---------|
| Harness reliability (no hang, diagnostics) | **PASS** |
| Staging operator login (`LOGIN_HTTP` **200**, token saved) | **PASS** |
| Full P-2 (`status-check` **200**, terminal order enums) | **PASS** |

Harness commit: `5d6fa2f` (`test(auth): harden staging operator login diagnostics`).

---

## 8. Verified full P-2 run (sanitized enums only)

Operator machine run against `https://zora-walat-api-staging.vercel.app` after valid `STAGING_OPERATOR_*` were set in-process (no secrets recorded here).

| Field | Value |
|-------|--------|
| Operator login | **Succeeded** (`LOGIN_HTTP` **200**, `TOKEN_OK` **true**) |
| `TOKEN_STATE` | present |
| `TOKEN_EXPIRED` | **false** |
| `STATUS_CHECK_HTTP` | **200** |
| `ORDER_FOUND` | **true** |
| `ORDER_STATUS` | `FULFILLED` |
| `PAYMENT_STATUS` | `RECHARGE_COMPLETED` |
| `PAID_CONFIRMED` | **true** |
| `FULFILLMENT_ATTEMPT_COUNT` | **1** |
| `FULFILLMENT_DUPLICATE_SAFE` | **true** |

---

## 9. If LOGIN_HTTP stays 401 (historical / recovery)

1. Confirm `auth-env-check` shows `PASSWORD_LENGTH` ≥ 1 (password actually in process).  
2. Register or reset password on staging (`register` or Dashboard DB).  
3. Confirm email matches Vercel `OWNER_ALLOWED_EMAIL` if owner-only mode is enabled (**403** if mismatch).  
4. Use `verify-otp` path if staging requires email verification before password login.

Do not commit `.env.local` or token files.
