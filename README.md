# Zora-Walat

Flutter client + Node.js API for mobile recharge (Afghanistan-focused), with Stripe Checkout and server-side fulfillment.

## Repository layout (where to look)

| Area | Path | Notes |
|------|------|--------|
| **Flutter app** | `lib/` | UI, features, `main.dart` entry |
| **API base URL (Flutter)** | `lib/core/config/app_config.dart` | Default `http://127.0.0.1:8787`; override with `--dart-define=API_BASE_URL=...` |
| **Auth (Flutter)** | `lib/features/auth/`, `lib/services/auth_api_service.dart` | `/auth/register`, `/auth/login` |
| **HTTP + payments** | `lib/services/api_service.dart`, `lib/services/payment_service.dart` | Authed API + Stripe Checkout session |
| **Backend** | `server/src/` | Express app, routes, Prisma |
| **Backend entry** | `server/index.js` → `server/bootstrap.js` (loads `server/.env`) → `server/src/index.js` |
| **Backend env template** | `server/.env.example` | Copy to `server/.env`; optional `server/.env.local` overrides |

## Usually **not** the first place to debug app↔API issues

- `build/`, `.dart_tool/` — generated build output  
- `packages/flutter_stripe_web/` — vendored override; change only if a Flutter/Stripe web bug requires it  
- `server/prisma/migrations/` — schema history, not runtime logic  
- `lib/l10n/app_localizations_*.dart` — generated from `.arb` files  

## Local development (quick)

1. **PostgreSQL** running and **`DATABASE_URL`** set in `server/.env` (`postgresql://…`).  
2. From **`server/`**: `npm install` → `npm start` → API on **`http://127.0.0.1:8787`** (default `PORT`).  
3. From repo root: `flutter pub get` → `flutter run -d chrome` — Flutter uses **`AppConfig.apiBaseUrl`** (see table above).  
4. **Stripe (test checkout):** set **`STRIPE_SECRET_KEY`** (`sk_test_…`) in `server/.env`. Webhooks: optional locally; use `stripe listen` and **`STRIPE_WEBHOOK_SECRET`**.  
5. **Quiet Reloadly logs** while testing auth only: in `server/.env` set **`RELOADLY_AF_PROBE_ON_STARTUP=false`** (Reloadly integration remains; only the startup AF probe is skipped).

Details and env variables: **`server/.env.example`** and **`server/README.md`**.

**Integration tests:** from **`server/`**, `npm run test:integration` needs PostgreSQL with **all Prisma migrations applied** on the effective URL: **`TEST_DATABASE_URL`** (if set in env / `.env`) **replaces `DATABASE_URL`** for those tests — stderr line **`[zw-integration] Effective DB: …`** shows which. Migrate it with **`npm run db:migrate:integration`**. See **`server/README.md`** if wallet tests fail with a missing-table error.

## Flutter / Dart docs

- [Flutter documentation](https://docs.flutter.dev/)
