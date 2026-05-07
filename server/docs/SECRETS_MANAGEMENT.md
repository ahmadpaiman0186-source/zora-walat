# Secrets management (production)

## Classification (keep credentials separated)

| Class | Env keys (typical) | Notes |
|-------|---------------------|--------|
| **Stripe (payments)** | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, optional `STRIPE_PUBLISHABLE_KEY` | Restricted live keys only when `NODE_ENV=production` and gates allow; webhook signing secret is **distinct** from API secret — rotate separately in Dashboard. |
| **JWT (user sessions)** | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Separate from Stripe and admin; rotate with a forced re-login / refresh invalidation plan. |
| **Database** | `DATABASE_URL` | Postgres connection string (often contains password) — inject via platform secret, never commit. |
| **Redis** | `REDIS_URL` | Queue + optional rate-limit backing; treat URL password like DB. |
| **SMTP / email** | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, legacy `EMAIL_*`, `OTP_TRANSPORT` | Separate from payment secrets; use app passwords / SMTP credentials per provider. |
| **Reloadly (airtime)** | `RELOADLY_CLIENT_ID`, `RELOADLY_CLIENT_SECRET` | OAuth client — distinct from Stripe; sandbox vs prod audiences via `RELOADLY_SANDBOX`. |
| **Admin / operator** | `ADMIN_SECRET` or `ADMIN_SECRET_CURRENT` / `ADMIN_SECRET_PREVIOUS`, `OPS_HEALTH_TOKEN` | Bearer / header gates for admin APIs and infra endpoints — not interchangeable with JWT secrets. |

## Local vs production injection

- **Local / dev**: `server/bootstrap.js` loads `server/.env`, then optional `server/.env.local` (override). When `NODE_ENV !== production`, the first dotenv pass uses `override: true` so file wins over stale shell vars (except inherited `STRIPE_WEBHOOK_SECRET` / `PORT` — see `bootstrap.js`).
- **Production**: platform injects env **before** Node starts; `NODE_ENV=production` so dotenv **does not** override existing shell/env vars — vault/dashboard values win over committed templates.
- **Templates**: broad developer checklist in **`server/.env.example`**; production **checklist only** (empty placeholders) in **`server/.env.production.example`**.

## Rules

1. **Never commit secrets** to git: no API keys, JWT secrets, database passwords, Stripe keys, or webhook signing secrets in tracked files.
2. **`server/.env.production.example`** is the **production checklist** — empty placeholders only; inject real values at deploy time (host dashboard, sealed secrets, CI). Never commit `.env.production` / `.env.local` with real material (both gitignored from repo root rules).
3. Prefer a **secrets manager** or **runtime env injection**:
   - AWS Secrets Manager / SSM Parameter Store  
   - Google Secret Manager  
   - Azure Key Vault  
   - HashiCorp Vault  
   - **Doppler**, **1Password Secrets Automation**, **Infisical**, etc.  
   - PaaS: **Render / Fly.io / Railway / Vercel** environment variables (never paste into source).

## Rotation

- **Stripe**: rotate Dashboard secrets; update `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` with zero-downtime overlap where possible.
- **JWT**: rotate `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` with a planned session bump.
- **Admin**: use `ADMIN_SECRET_CURRENT` + `ADMIN_SECRET_PREVIOUS` during rotation (`adminSecretAuth.js`).
- **Database / Redis URLs**: rotate passwords at the provider, then update env and rolling-restart instances.
- **SMTP**: rotate app password / SMTP credential; update `SMTP_PASS` / `EMAIL_PASS`; revoke old app password at mail provider.
- **Reloadly**: rotate OAuth client secret in Reloadly dashboard; update `RELOADLY_CLIENT_SECRET` and restart workers/API.

## Verification

- Run `npm run preflight:production` before launch.
- Run **`npm --prefix server run secrets:scan`** — fails CI/script if tracked sources match high-confidence live-secret patterns (Stripe live key shape, long webhook material); excludes `.github` CI synth env.
- Confirm root `.gitignore` ignores `.env`, `.env.local`, `**/.env`, named variants under `**/.env.*`, with explicit exceptions only for **`*.env.example`**, **`server/.env.local.example`**, and **`server/.env.production.example`** (`server/.gitignore` also ignores `.env.production` files).
- Manual grep for accidental leaks (examples):  
  `git grep -E 'sk_live_|postgresql://[^:]+:[^@]+@'` — should show **only** docs/tests with intentional non-material strings on a clean branch. Prefer `secrets:scan` for consistent rules.
