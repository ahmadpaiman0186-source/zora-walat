# Wallet top-up — authenticated load verification

## Why 2xx alone is wrong

| Mode | What “success” means |
|------|----------------------|
| **replay** (`--mode=replay`) | Almost all responses should be **200** with `idempotentReplay: **true**` after the first **200** with `idempotentReplay: **false**`. You are **not** measuring dollars credited per second. |
| **apply** (`--mode=apply`) | Each request uses a **new** `Idempotency-Key` → each **200** with `idempotentReplay: false` is a **real credit**. Wallet balance grows; use a **dedicated test user** (`WALLET_VERIFY_EMAIL`). |

Non-2xx may be **expected**: **401** without Bearer, **400** missing/invalid idempotency header when enforcement is on, **429** if rate limits engage.

## Mode resolution (important on Windows)

The load script resolves `replay` vs `apply` in this order:

1. `--mode=replay` / `--mode=apply` on the command line  
2. `--mode replay` / `--mode apply` (two arguments)  
3. `npm_lifecycle_event` when invoked via **`npm run load:wallet:replay`** or **`npm run load:wallet:apply`** (so even if an argument were mangled, the npm script name still selects the mode)

Before any HTTP traffic, **apply mode** preflight checks that all planned `Idempotency-Key` values are **pairwise distinct**; **replay mode** checks they are **all identical**.

## Commands (API must be running)

```powershell
cd C:\Users\ahmad\zora_walat\server
npm run smoke:wallet:unauthed
npm run smoke:wallet:no-idem
npm run load:wallet:replay
npm run load:wallet:apply
```

Direct Node (same semantics):

```powershell
node scripts/wallet-topup-load.mjs --mode apply
node scripts/wallet-topup-load.mjs --mode=replay
```

Tune load (defaults: 30 requests, concurrency 6):

```powershell
$env:WALLET_LOAD_REQUESTS = "100"
$env:WALLET_LOAD_CONCURRENCY = "10"
$env:WALLET_LOAD_AMOUNT = "1"
$env:WALLET_VERIFY_EMAIL = "your_test_user@local.test"
$env:WALLET_VERIFY_PASSWORD = "TenCharsMin!"
npm run load:wallet:apply
```

## Output

The load script prints JSON with:

- `byKind` — counts of **`apply_ok`**, **`replay_ok`**, **`auth_required`**, **`idempotency_*`**, **`rate_limited`**, etc.
- `byStatus` — raw HTTP status histogram
- `defects` — mode-specific invariant violations (exit code **1** if any)

## PowerShell: single authenticated top-up (sanity)

```powershell
$base = 'http://127.0.0.1:8787'
# Register + login via npm run verify:wallet, or reuse token from your app
$token = 'PASTE_ACCESS_TOKEN'
$idem = [guid]::NewGuid().ToString()
$body = '{"amount":10}'
Invoke-RestMethod -Method Post -Uri "$base/api/wallet/topup" `
  -ContentType 'application/json' `
  -Headers @{ Authorization = "Bearer $token"; 'Idempotency-Key' = $idem } `
  -Body $body
```

See also: `docs/WALLET_TOPUP_LOCAL_VERIFY.md`.
