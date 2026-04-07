# Phase 1 production safety gates

These checks run at **server startup** via `assertProductionMoneyPathSafetyOrExit()` (`server/src/config/productionSafetyGates.js`) after Reloadly / web-top-up validation. They apply when `NODE_ENV=production`.

## Dangerous flags / combinations (audited)

| Flag / setting | Risk |
|----------------|------|
| `DEV_CHECKOUT_AUTH_BYPASS=true` | Bypasses JWT for checkout; must never be enabled in production. |
| `AIRTIME_PROVIDER=mock` | Non-live airtime adapter; must not run in production unless explicitly allowed. |
| `WEBTOPUP_FULFILLMENT_PROVIDER=mock` (default if unset) | Non-live web-top-up fulfillment; same rule as airtime mock. |
| `RELOADLY_ALLOW_UNAVAILABLE_MOCK_FALLBACK=true` with `AIRTIME_PROVIDER=reloadly` | Forces mock airtime when Reloadly is unavailable — unsafe in production. |

Other dev-only behavior (e.g. `X-ZW-Dev-Checkout` header) is gated in `server/src/config/env.js`: `devCheckoutAuthBypass` is **false** when `NODE_ENV=production`, regardless of env strings.

## Explicit opt-in (tightly named)

| Variable | When required |
|----------|----------------|
| `ALLOW_MOCK_AIRTIME_IN_PRODUCTION=true` | `NODE_ENV=production` and `AIRTIME_PROVIDER=mock`. |
| `ALLOW_MOCK_WEBTOPUP_FULFILLMENT_IN_PRODUCTION=true` | `NODE_ENV=production` and `WEBTOPUP_FULFILLMENT_PROVIDER=mock`. |

Use only for **non-live** production-like environments (e.g. staged demos with fake providers), never for real customer money.

## Failure conditions enforced

Startup **exits with code 1** when:

1. `NODE_ENV=production` **and** `DEV_CHECKOUT_AUTH_BYPASS=true`.
2. `NODE_ENV=production` **and** `AIRTIME_PROVIDER=mock` **and** `ALLOW_MOCK_AIRTIME_IN_PRODUCTION` is not `true`.
3. `NODE_ENV=production` **and** `WEBTOPUP_FULFILLMENT_PROVIDER=mock` (including unset defaulting to mock) **and** `ALLOW_MOCK_WEBTOPUP_FULFILLMENT_IN_PRODUCTION` is not `true`.
4. `NODE_ENV=production` **and** `AIRTIME_PROVIDER=reloadly` **and** `RELOADLY_ALLOW_UNAVAILABLE_MOCK_FALLBACK=true`.

## Tests

`server/test/moneyPathLockdown.test.js` exercises `evaluateProductionMoneyPathSafety()` so CI fails if these rules regress.

## Related

- Legacy production checks (database URL, Stripe secrets, CORS, JWT TTL, etc.) remain in `server/src/index.js`.
