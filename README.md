# Zora-Walat

Flutter client + Node.js API for mobile recharge (Afghanistan-focused), with Stripe Checkout and server-side fulfillment.

## Repository layout (where to look)

| Area | Path | Notes |
|------|------|--------|
| **Flutter app** | `lib/` | UI, features, `main.dart` entry |
| **API base URL (Flutter)** | `lib/core/config/app_config.dart` | Set at build time: `--dart-define=API_BASE_URL=https://…` (empty default — no hardcoded deploy URL) |
| **Auth (Flutter)** | `lib/features/auth/`, `lib/services/auth_api_service.dart` | `/api/auth/register`, `/api/auth/login` |
| **HTTP + payments** | `lib/services/api_service.dart`, `lib/services/payment_service.dart` | Authed API + Stripe Checkout session |
| **Backend** | `server/src/` | Express app, routes, Prisma |
| **Backend entry** | `server/start.js` (`npm start` from `server/`) → `bootstrap.js` (loads `server/.env` + optional `server/.env.local`) → `startApiRuntime()` in `server/src/index.js`. **Do not** run `node server/index.js` as the API — it exits with a “wrong entrypoint” message. |
| **Backend env template** | `server/.env.example` | Copy to `server/.env`; optional `server/.env.local` overrides |
| **Next.js (marketing / top-up web)** | **Repository root** (`vercel.json`, `next.config.mjs`, root `package.json`) | Vercel project **zora-walat** → **zorawalat.com** — **not** `server/` |
| **Node API on Vercel** | `server/` (`.vercel` → project **server**) | Separate `*.vercel.app` host; do **not** run the **frontend** production deploy from here |

## Usually **not** the first place to debug app↔API issues

- `build/`, `.dart_tool/` — generated build output  
- `packages/flutter_stripe_web/` — vendored override; change only if a Flutter/Stripe web bug requires it  
- `server/prisma/migrations/` — schema history, not runtime logic  
- `lib/l10n/app_localizations_*.dart` — generated from `.arb` files  

## Local development (quick)

1. **PostgreSQL** running and **`DATABASE_URL`** set in `server/.env` (`postgresql://…`).  
2. From **`server/`**: `npm install` → `npm start` → API on **`http://127.0.0.1:8787`** (default `PORT`). Same from repo root: **`npm run api`** (alias for `npm --prefix server start`).  
3. From repo root: `flutter pub get` → `flutter run -d chrome --dart-define=API_BASE_URL=http://127.0.0.1:8787` (or your public API HTTPS origin).  
4. **Stripe (test checkout):** set **`STRIPE_SECRET_KEY`** (`sk_test_…`) in `server/.env`. Webhooks: optional locally; use `stripe listen` and **`STRIPE_WEBHOOK_SECRET`**.  
5. **Quiet Reloadly logs** while testing auth only: in `server/.env` set **`RELOADLY_AF_PROBE_ON_STARTUP=false`** (Reloadly integration remains; only the startup AF probe is skipped).

Details and env variables: **`server/.env.example`** and **`server/README.md`**.

### Vercel — frontend (`zorawalat.com`)

1. **Deploy root:** repository root `C:\Users\ahmad\zora_walat` (same folder as `vercel.json` and Next.js `package.json`).
2. **Production deploy command:** `vercel --prod` (equivalently `vercel deploy --prod`).  
   **Do not** type `vercel prod` as a standalone “shortcut”; current CLI treats extra words as **Git branch / target names**, which triggers errors such as **branch … not found**.
3. **Project link:** `.vercel/project.json` here must be **zora-walat** (team **ahmadpaiman0186-sources-projects**). The API lives in a **different** Vercel project (**server**), linked from `server/.vercel/`.
4. **Required dashboard env vars (frontend project):** `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_…`), `NEXT_PUBLIC_API_URL` (HTTPS backend, **never** `localhost`). Inspect with `vercel env ls` from the repo root after `vercel link` if needed.

**Integration tests:** from **`server/`**, `npm run test:integration` needs PostgreSQL with **all Prisma migrations applied** on the effective URL: **`TEST_DATABASE_URL`** (if set in env / `.env`) **replaces `DATABASE_URL`** for those tests — stderr line **`[zw-integration] Effective DB: …`** shows which. Migrate it with **`npm run db:migrate:integration`**. See **`server/README.md`** if wallet tests fail with a missing-table error.

## Flutter / Dart docs

- [Flutter documentation](https://docs.flutter.dev/)
