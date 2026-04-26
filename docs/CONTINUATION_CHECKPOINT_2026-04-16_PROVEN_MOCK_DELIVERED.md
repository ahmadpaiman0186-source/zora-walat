# Continuation checkpoint — 2026-04-16 (proven local money path + mock fulfillment)

Resume from this file; no re-discovery needed.

## Frozen proven state

- **Frontend localhost flow**: Works — Next.js `npm run dev` → **`http://localhost:3000`**, marketing top-up through Payment Element and checkout steps.
- **Backend**: Works on **`http://127.0.0.1:8787`** (health and money routes as exercised in session).
- **Stripe test payment**: Succeeded (PaymentIntent confirmed; webhook path exercised when Stripe CLI listen matches `STRIPE_WEBHOOK_SECRET`).
- **Order payment**: Reached **`paid`** for the referenced WebTopup order.
- **Mock fulfillment**: **Explicitly dispatched** — not automatic on webhook alone; used `dispatchWebTopupFulfillment` via ops script (same path as staff fulfillment admin).
- **Final fulfillment state**: **`delivered`** (mock provider reference recorded).

## Exact order (reference row)

| Field | Value |
|--------|--------|
| **WebTopupOrder id** | `tw_ord_6105db1e-8f3a-4f8e-b4df-c17fc2c2e612` |
| **Provider mode at dispatch** | **mock** (`WEBTOPUP_FULFILLMENT_PROVIDER` / `env.webTopupFulfillmentProvider` → `mock`) |

## How fulfillment was closed from Pending

- After payment, fulfillment stayed **`pending`** until **`dispatchWebTopupFulfillment`** ran (expected for current architecture: webhook/mark-paid do not auto-dispatch).
- Script used to progress the paid+pending row:

  ```bash
  cd server
  node scripts/close-webtopup-fulfillment-pending.mjs
  ```

  Optional: `node scripts/close-webtopup-fulfillment-pending.mjs --order=tw_ord_...`

## Related evidence / commands (optional re-verify)

- Payment Element smoke: `npm run smoke:stripe-pe` (root).
- End-to-end API proof (creates a **new** order): `node scripts/local-webtopup-money-path-proof.mjs` (from `server/`).

## Next recommended milestone

**Move from mock fulfillment to Reloadly sandbox fulfillment proof** — controlled dispatch against sandbox credentials and AF airtime scope, using existing repo scripts and runbooks (e.g. `WEBTOPUP_FULFILLMENT_PROVIDER=reloadly`, `RELOADLY_SANDBOX=true`, operator map, `webtopup-sandbox-dispatch-exercise` / phase1 sandbox proofs as applicable). Avoid duplicate live provider sends; use dry-run where offered.

---

*Checkpoint saved for the next session.*
