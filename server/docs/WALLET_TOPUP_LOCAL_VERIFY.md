# Wallet top-up — local verification and load testing

`POST /api/wallet/topup` is **authenticated** (`requireAuth`). A bare POST without `Authorization: Bearer <accessToken>` returns **401** `{"error":"Authentication required"}` — that is expected.

## Contract

| Requirement | Value |
|-------------|--------|
| Method / path | `POST /api/wallet/topup` |
| `Content-Type` | `application/json` |
| Body | `{"amount": <positive number>}` (USD; also accepts `amountUsd`) |
| Auth | `Authorization: Bearer <JWT>` **or** dev bypass (below) |
| Idempotency | When `REQUIRE_WALLET_TOPUP_IDEMPOTENCY_KEY=true`: header **`Idempotency-Key`** = **UUID v4** |

## Path A — Real JWT (recommended)

1. Register or log in:

```http
POST /api/auth/register
Content-Type: application/json

{"email":"you@local.test","password":"AtLeast10Chars!"}
```

2. Use `accessToken` from the response.

3. Top up:

```http
POST /api/wallet/topup
Content-Type: application/json
Authorization: Bearer <accessToken>
Idempotency-Key: <uuid-v4>

{"amount":1}
```

### Automated script

From `server/` with API running:

```bash
npm run verify:wallet-topup-http
npm run verify:wallet-topup-http -- --replay
```

Reuse the same user:

```bash
set WALLET_VERIFY_EMAIL=you@local.test
set WALLET_VERIFY_PASSWORD=AtLeast10Chars!
npm run verify:wallet-topup-http -- --replay
```

## Path B — Dev header bypass (non-production only)

When `DEV_CHECKOUT_AUTH_BYPASS=true`, `DEV_CHECKOUT_BYPASS_SECRET` (≥16 chars), and `DEV_CHECKOUT_BYPASS_USER_ID` are set, **any** route using `requireAuth` accepts:

- Header: `X-ZW-Dev-Checkout: <same value as DEV_CHECKOUT_BYPASS_SECRET>`
- No `Authorization` header required

`DEV_CHECKOUT_BYPASS_USER_ID` must be an existing `User.id` in the database. **Never enable in production** (`NODE_ENV=production` startup fails if bypass is on).

## PowerShell (JWT)

Replace `TOKEN` and generate a new UUID per logical top-up (or reuse UUID only for replay tests):

```powershell
$base = 'http://127.0.0.1:8787'
$token = 'PASTE_ACCESS_TOKEN'
$idem = [guid]::NewGuid().ToString()
$body = '{"amount":1}'
Invoke-RestMethod -Method Post -Uri "$base/api/wallet/topup" `
  -ContentType 'application/json' `
  -Headers @{
    Authorization = "Bearer $token"
    'Idempotency-Key' = $idem
  } `
  -Body $body
```

## Load testing (truthful)

1. **Do not** load-test **without** auth: you will only measure **401s**.
2. **Obtain tokens** per virtual user (register/login) or use a pool of users; respect **rate limits** on `/api/auth/*` and `/api/wallet/*`.
3. **Idempotency**:
   - **New UUID per request** → exercises first-apply path (real credit each time, until business limits).
   - **Same UUID repeated** → **200** with `idempotentReplay: true` (no extra credit); throughput reflects replay safety, not “payments per second.”
4. Tools (k6, hey, etc.) must send **`Authorization`** and **`Idempotency-Key`** on each request. Script `wallet-topup-local-verify.mjs` is for **functional** proof, not substitute for a full load harness.
