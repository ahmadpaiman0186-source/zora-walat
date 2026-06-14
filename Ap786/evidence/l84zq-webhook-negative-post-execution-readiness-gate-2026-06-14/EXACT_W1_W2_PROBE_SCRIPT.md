# L-84ZQ — Exact W1/W2 probe script (NOT EXECUTED)

**Status:** **PREPARED ONLY — DO NOT RUN until operator approves a separate execution gate.**

**Base:** `https://zora-walat-api-staging.vercel.app`

## Constraints

- Body: `{}` only
- Headers: `Content-Type: application/json` only
- **No** `Authorization` / Bearer
- **No** `Stripe-Signature`
- **No** other POST paths

## PowerShell (operator execution gate — future)

```powershell
# L-84ZQ W1/W2 — DO NOT RUN in readiness gate L-84ZQ
$ErrorActionPreference = "Stop"
$base = "https://zora-walat-api-staging.vercel.app"
$probeUtc = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
Write-Output "PROBE_UTC=$probeUtc"

function Invoke-WebhookNegativeProbe {
  param(
    [Parameter(Mandatory = $true)][string]$Id,
    [Parameter(Mandatory = $true)][string]$Path
  )
  $url = "$base$Path"
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  $response = curl.exe -sS -w "`nHTTP_STATUS=%{http_code}`nELAPSED_MS=%{time_total}`n" `
    -X POST `
    --max-time 30 `
    -H "Content-Type: application/json" `
    -d "{}" `
    "$url"
  $sw.Stop()
  Write-Output "--- $Id POST $Path ---"
  Write-Output $response
}

Invoke-WebhookNegativeProbe -Id "W1" -Path "/api/webhooks/stripe"
Invoke-WebhookNegativeProbe -Id "W2" -Path "/webhooks/stripe"
```

## curl equivalents (future execution gate)

```bash
# W1 — NOT EXECUTED in L-84ZQ
curl -sS -X POST \
  -H "Content-Type: application/json" \
  -d '{}' \
  --max-time 30 \
  -w "\nHTTP_STATUS=%{http_code}\n" \
  "https://zora-walat-api-staging.vercel.app/api/webhooks/stripe"

# W2 — NOT EXECUTED in L-84ZQ
curl -sS -X POST \
  -H "Content-Type: application/json" \
  -d '{}' \
  --max-time 30 \
  -w "\nHTTP_STATUS=%{http_code}\n" \
  "https://zora-walat-api-staging.vercel.app/webhooks/stripe"
```

## Recording template (future gate)

For each probe record: probe UTC, method, path, HTTP status, content-type, body preview (max 300 chars), elapsed ms, secret/payment ID scan (must be absent).

---

*End.*
