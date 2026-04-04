# Zora-Walat API (Node / Express + Prisma)

Entry: **`index.js`** (repo `server/index.js`) loads **`bootstrap.js`** (reads **`server/.env`**, then optional **`server/.env.local`**) then **`src/index.js`**.

## Quick start (Node 20+)

```bash
cd server
cp .env.example .env
# Edit .env: DATABASE_URL, JWT_* secrets, STRIPE_SECRET_KEY for checkout tests
npm install
npm start
```

Default listen: **`http://127.0.0.1:8787`** (`PORT` in `.env`).

Dev with auto-restart: `npm run dev`

## Environment

- **Template:** `.env.example` (comments describe local vs production).  
- **Secrets:** never commit `.env` / `.env.local`. Optional **`stripe_secret.key`** (single line, gitignored) instead of `STRIPE_SECRET_KEY` in `.env`.  
- **Prisma:** `npm run db:validate` / `npm run db:migrate` — use these from `server/` so bootstrap loads env (see `.env.example` note).

## Flutter client

API base URL for local dev defaults in **`lib/core/config/app_config.dart`** (`http://127.0.0.1:8787`). Override: `--dart-define=API_BASE_URL=...`.

## Features (high level)

- **Auth:** `POST /auth/register`, `POST /auth/login`, JWT refresh.  
- **Stripe:** `POST /create-checkout-session` (authenticated).  
- **Fulfillment:** airtime via configured provider (e.g. Reloadly or mock); see `src/domain/delivery/`.  
- **Legacy placeholder:** `src/providers/dtone.placeholder.js` — not the primary integration path.
