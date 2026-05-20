# Zora-Walat Stripe Webhook Recovery Report — May 15, 2026

## 1. Executive summary

- **Symptom:** Stripe Dashboard showed **failed** deliveries for **`checkout.session.completed`** and **`payment_intent.succeeded`** to **`https://zora-walat-api-staging.vercel.app/webhooks/stripe`**, while Vercel logs showed **`webhook_slim_entry`** and **`webhook_signature_verified_handoff`** — so the endpoint was reachable and **signature verification succeeded**.
- **Root cause:** After the slim handoff, the handler called **`getHandler()`**, which **cold-loads** the full Express app (`bootstrap` + large import graph). That path could **exceed Stripe’s HTTP delivery window** before any bytes were returned, so Stripe reported failure and retried — even though fixture events would **not** change money state (missing `metadata.internalCheckoutId` / `tw_ord_*` correlation).
- **Fix:** After **`constructEvent`**, when the event **cannot** correlate to internal money paths by **payload shape alone** (no DB), respond **`200`** with **`{ ok: true, status: "ignored", reason: "unmatched_event" }`** **before** `getHandler()`. Suppress noisy **`[dotenv] ENOENT`** for missing **`server/.env`** on **production** (expected on Vercel).
- **Order safety:** No **`PaymentCheckout`** / **`WebTopupOrder`** row is marked **paid** from the slim unmatched path; paid transitions remain in the **Express** webhook route after **DB-backed** correlation and **`applyPhase1CheckoutSessionCompleted`** (or webtop PI handlers).

## 2. Exact failure cause

1. **Slim path** verified the Stripe signature and logged **`webhook_signature_verified_handoff`**.
2. **`await getHandler()`** then imported **`bootstrap.js`** (logs through **`redis_rate_limit_done`**) and **`src/index.js`** / **`createValidatedApp()`** — **high latency** on cold Lambda.
3. Stripe’s delivery **timed out or saw no 2xx body in time** → dashboard **Failed** and **retries**.
4. **Stripe CLI / test fixtures** typically omit **`metadata.internalCheckoutId`** on Checkout Sessions and **`metadata.topup_order_id`** (`tw_ord_…`) on PaymentIntents, so the **full** handler would **not** advance a real order anyway — the work was **cold start + idempotent event insert**, not business value.

## 3. Webhook architecture

| Stage | Location | Behavior |
|-------|-----------|----------|
| **Entry** | `server/api/index.mjs` | **`POST /webhooks/stripe`** → **`handleSlimStripeWebhookPost`** |
| **Slim** | `server/api/slimStripeWebhookHandler.mjs` | Bounded raw body read; **`constructEvent`**; **fast 200** for structurally unmatched events; else **replay** into Express |
| **Express** | `server/src/app.js` | **`express.raw`** + **`stripeWebhookLimiter`** + **`stripeWebhook.routes.js`** |
| **Verify again** | `stripeWebhook.routes.js` | Second **`constructEvent`** on **`req.body`** (buffer from replay stream) |
| **Process** | Same file + services | **`$transaction`**: insert **`StripeWebhookEvent`**, audit, type-specific handlers; **`P2002`** → duplicate path; post-commit scheduling |

## 4. Event handling matrix

| Event type | Slim unmatched fast 200 | Full handler (replay) |
|------------|-------------------------|------------------------|
| **`checkout.session.completed`** | No / invalid **`internalCheckoutId`** metadata shape | Correlates session → **`applyPhase1CheckoutSessionCompleted`** |
| **`checkout.session.expired`** | Same metadata rule | May cancel **pending** checkout |
| **`payment_intent.succeeded`** / **`payment_failed`** | No **`tw_ord_`** metadata | Webtop + fee capture side paths |
| **Other types** | No (always replay) | Charge refund, dispute, etc. |
| **Signature invalid** | Slim **400** JSON | — |
| **Duplicate (`P2002`)** | — | **200** `{ received: true }` + replay recovery logic |

## 5. Order state safety

- **Pending creation:** **`createInitiatedRow`** / checkout API creates **`PaymentCheckout`** in **`PENDING`** / payment-pending statuses (not in webhook slim path).
- **Paid authority:** **`checkout.session.completed`** → **`applyPhase1CheckoutSessionCompleted`** validates Stripe totals vs internal pricing, **`ORDER_STATUS`** / **`validateLayer3WebPaidTransition`**, ledger hooks — **only** inside the **full** transaction path.
- **Processing / fulfilled:** Post-commit **`scheduleFulfillmentProcessing`** and fulfillment workers — **not** triggered by slim unmatched ack.
- **Failed / refunded / cancelled:** Handled in full router branches (`payment_failed`, **`charge.refunded`**, session expired, etc.).
- **Duplicates:** **`StripeWebhookEvent`** unique on **`event.id`**; **`P2002`** returns **200** and may nudge fulfillment replay for pending checkouts.
- **Missing order:** Full path logs **`order_not_found`** / no-ops; **no** paid transition without a row.
- **Retries:** Slim **200** for unmatched fixtures stops **retry storms** for those shapes; Stripe still retries on **5xx** (mitigated by existing catch returning **200** `{ received: true }` on many transaction errors).

## 6. Files changed

- `server/api/slimStripeWebhookHandler.mjs` — **`stripeEventSlimUnmatchedFastAck`**, **`constructEvent`** result use, **`webhook_slim_unmatched_fast_ack`** log, **200** JSON body.
- `server/bootstrap.js` — suppress **`[dotenv]`** **ENOENT** for missing **`.env`** in **production** only.

## 7. Tests run

- **`npm run db:validate`** from **`server/`** (schema valid).
- **`npm run test`**: not re-run in this slice; local runs may hit **`db_unit_precheck`** if **`DATABASE_URL`** is invalid (known environment limitation).

## 8. Deployment URL

- Deploy from **`C:\Users\ahmad\zora_walat\server`** only (see commit after deploy for exact **`dpl_`** URL in operator’s Vercel UI).
- Alias: **`https://zora-walat-api-staging.vercel.app`**.

## 9. Stripe delivery results

- **Not verified in this environment** (no **`stripe trigger`** / Dashboard resend from the agent session). Operator should confirm **`checkout.session.completed`** and **`payment_intent.succeeded`** show **2xx** after deploy.
- **Expected:** Fixture **`checkout.session.completed`** → **200** body **`ignored`** in **&lt;1s**; fixture **`payment_intent.succeeded`** without **`tw_ord_`** metadata → same.

## 10. Remaining risks

- **Slim fast ack skips `StripeWebhookEvent` insert** for those unmatched shapes — acceptable for fixtures; **real** events must include correlation metadata or they are intentionally ignored at the edge (operator should fix Stripe metadata, not rely on DB-only correlation for those deliveries).
- **Cold `getHandler()`** remains for **correlated** events (first hit on a fresh instance may still be slow; warm instances are faster).
- **Authenticated checkout + real `checkout.session.completed`** still needs an end-to-end test with a **real** internal checkout id in session metadata.

## 11. Next step: authenticated checkout + real `checkout.session.completed`

1. Obtain **access JWT** (verified user) on staging.
2. **`POST /api/create-checkout-session`** with **`Idempotency-Key`**, valid body, and **`Authorization: Bearer …`**.
3. Complete payment in Stripe **test** Checkout.
4. Confirm Dashboard webhook delivery **2xx** and Vercel logs **`webhook_processed`** / DB **`orderStatus`** transition for that checkout id only.
