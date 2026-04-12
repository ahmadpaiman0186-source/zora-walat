# Local Stripe webhook verification (Stripe CLI)

This describes the **real** path the Zora-Walat API uses: **POST** `/webhooks/stripe` on the same process that loads `server/.env`.

## Prerequisites

- Node **≥ 20** (see `server/package.json` `engines`).
- **Stripe CLI** installed and on `PATH` (Windows notes: [`STRIPE_CLI_WINDOWS.md`](./STRIPE_CLI_WINDOWS.md)).
- `server/.env` with a valid **`STRIPE_SECRET_KEY`** (`sk_test_…`, `sk_live_…`, or supported restricted keys — see `src/config/stripeEnv.js`).
- **`STRIPE_WEBHOOK_SECRET`**: must be the exact **`whsec_…`** string Stripe uses to sign forwarded events. **Do not invent or placeholder this value.**

## Why `whsec_` must match the *current* `stripe listen`

Each `stripe listen` session can emit a **new** signing secret. The API verifies every payload with:

`stripe.webhooks.constructEvent(rawBody, stripe-signature header, STRIPE_WEBHOOK_SECRET)`

If `.env` has an old `whsec_` from a previous listen (or a placeholder), verification fails with **400** and a `Webhook Error: …` message in logs.

**After you change `STRIPE_WEBHOOK_SECRET` in `server/.env`, restart the Node process** so `process.env` reloads.

## Middleware order (already enforced in code)

`server/src/app.js` mounts `/webhooks/stripe` **before** global `express.json()`, using `express.raw({ type: 'application/json' })` so the raw body reaches `constructEvent`. Do not reorder this without a deliberate security/body review.

## Operator flow (ordered)

1. **Terminal A — API** (from repo):

   ```powershell
   cd C:\Users\ahmad\zora_walat\server
   node index.js
   ```

   Expect: `Server running on http://127.0.0.1:8787` (or your `PORT`) and `Webhook endpoint: POST http://127.0.0.1:8787/webhooks/stripe`.

   Quick liveness: **GET** `http://127.0.0.1:8787/health` → plain text **`OK`**.

2. **Terminal B — Stripe CLI** (keep this running):

   ```powershell
   stripe listen --forward-to http://127.0.0.1:8787/webhooks/stripe
   ```

   On start, the CLI prints a **`Ready! Your webhook signing secret is whsec_…`** (or similar). **Copy that exact value.**

   Optional: `stripe listen --print-secret` (prints signing secret; still forward with `--forward-to` as usual).

3. **Edit `server/.env`**:

   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

   Save the file.

4. **Restart Terminal A** (`node index.js`) so the new secret is loaded.

5. **Trigger a test event** (Terminal B can stay open):

   ```powershell
   stripe trigger payment_intent.succeeded
   ```

## Expected API logs (operator-facing)

On each POST (first — if this never appears, the request is not reaching **this** Node process):

- `[stripe-webhook] ingress POST /webhooks/stripe stripe-signature=present|absent content-length=…`

Then the handler runs:

- `📬 WEBHOOK: Stripe route hit`

After successful verification:

- `✅ WEBHOOK RECEIVED: <event.type>`
- For `payment_intent.succeeded`: `💰 PAYMENT SUCCESS: <pi_…>`

On signature / payload problems:

- `❌ WEBHOOK ERROR: <message>` — response **400**.

If Stripe or webhook secret is not configured, the handler returns **503**; startup should also show guidance (see `server/bootstrap.js` for missing or malformed `STRIPE_WEBHOOK_SECRET`).

## Business logic (not stripped for local dev)

`server/src/routes/stripeWebhook.routes.js` contains **production** idempotency, persistence, fulfillment, and incident handling. Local CLI events are still verified the same way; only use **test mode** keys and non-production data.

## Troubleshooting

| Symptom | Likely cause |
|--------|----------------|
| No logs at all (no `[stripe-webhook] ingress`, no `📬`) | POST is not hitting this API: wrong **host/port** or **URL path**, **`stripe listen` running in WSL** while API on Windows host (`127.0.0.1` in WSL is not Windows loopback — use Windows Terminal for the CLI, or forward to the Windows host IP from WSL), **different `node` process** bound to the port, or **local firewall**. Watch the `stripe listen` window for the HTTP status of the forward; you should see a request to your `--forward-to` URL. |
| `[stripe-webhook] ingress` but no `📬` | Extremely rare at default limits; implies the request was blocked **after** ingress (e.g. rate limit **429** — check API logs / response body). |
| 400 `Webhook Error` | `STRIPE_WEBHOOK_SECRET` does not match **this** `stripe listen` session; or body was parsed as JSON before the webhook route (should not happen with current `app.js`). |
| 503 on webhook | Missing `STRIPE_WEBHOOK_SECRET` or Stripe client not configured. |
| CLI not found | PATH / new terminal / IDE restart — see `STRIPE_CLI_WINDOWS.md`. |
| Wrong port | Set `PORT=8787` in `server/.env` or match `stripe listen` URL to your `PORT`. |
| `https://127.0.0.1:8787/...` in `--forward-to` | Local API speaks **HTTP** by default; use `http://` unless you terminate TLS elsewhere. |

## Related

- Windows Stripe CLI install/PATH: [`STRIPE_CLI_WINDOWS.md`](./STRIPE_CLI_WINDOWS.md)
- Example env template: `server/.env.example`
