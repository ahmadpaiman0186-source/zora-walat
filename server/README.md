# Zora-Walat API (production-oriented BFF)

Secure backend for **Stripe** payments, **Reloadly** airtime fulfillment, **ledger + audit logs**, fraud checks, and admin wallet visibility.

## Quick start (Node 20+)

```bash
cd server
cp .env.example .env
# Fill STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, RELOADLY_* and operator IDs.
npm install
npx prisma db push
npm run dev
```

## Reloadly operator IDs

1. Obtain OAuth client credentials in the Reloadly dashboard.  
2. List Afghanistan operators: sandbox/prod Airtime API `GET /operators?countryCode=AF` (see [Reloadly docs](https://docs.reloadly.com/airtime/)).  
3. Map each Zora-Walat operator to numeric `RELOADLY_OPERATOR_*` in `.env`.

## Stripe webhook

Point Stripe to `POST https://your-host/webhooks/stripe` with signing secret `STRIPE_WEBHOOK_SECRET`. On `payment_intent.succeeded`, the server:

1. Validates the DB order
2. Calls Reloadly for `service_line=airtime`
3. Credits the **platform commission wallet** (10% of captured amount) only after Reloadly succeeds
4. Refunds the charge automatically if Reloadly fails (configure alerts for refund failures)

Non-airtime SKUs (e.g. data) accrue commission without Reloadly until a data API is wired.

## Flutter

```bash
flutter run \
  --dart-define=PAYMENTS_API_BASE_URL=http://10.0.2.2:8787 \
  --dart-define=STRIPE_PUBLISHABLE_KEY=YOUR_STRIPE_PUBLISHABLE_KEY \
  --dart-define=BFF_API_KEY=your-shared-secret
```

Use your LAN IP instead of `10.0.2.2` for physical devices.

## Admin

`GET /admin/wallet` with header `X-Admin-Key: <ADMIN_API_KEY>` returns commission balance, recent ledger rows, and orders.

## Firebase alternative

The same routes can run under **Firebase Cloud Functions** (Express adapter) or **Cloud Run**. Move env vars to Secret Manager; keep **webhook raw body** verification unchanged.

## DT One

See `src/providers/dtone.placeholder.js` for extension point to swap or dual-route providers.
