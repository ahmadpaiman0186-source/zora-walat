# Zora-Walat: free busy ports, start API :8787 + Next :3001, verify health + payment test.
# Usage: from repo root,  pwsh -ExecutionPolicy Bypass -File scripts/start-local.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

function Stop-ListenersOnPort([int] $Port) {
  try {
    Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
      ForEach-Object {
        $p = $_.OwningProcess
        if ($p -and $p -ne 0) {
          Write-Host "  [port $Port] stopping PID $p"
          Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
        }
      }
  } catch {
    Write-Host "  [port $Port] Get-NetTCPConnection failed; skip auto-kill."
  }
}

function Wait-Health([string] $Url, [int] $MaxSec = 45) {
  $dead = (Get-Date).AddSeconds($MaxSec)
  while ((Get-Date) -lt $dead) {
    try {
      $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
      if ($r.StatusCode -eq 200) { return $true }
    } catch { }
    Start-Sleep -Milliseconds 600
  }
  return $false
}

Write-Host "`n=== Zora-Walat local stack ===`n"

# 1) Backend
Write-Host "[1/4] Backend (port 8787)..."
$healthUrl = 'http://127.0.0.1:8787/health'
$ok = $false
try {
  $r = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 2
  $ok = ($r.StatusCode -eq 200)
} catch { $ok = $false }

if (-not $ok) {
  Write-Host "  No healthy API; freeing 8787 and starting server..."
  Stop-ListenersOnPort 8787
  Start-Sleep -Seconds 1
  $serverDir = Join-Path $root 'server'
  Start-Process -FilePath 'npm' -ArgumentList 'start' -WorkingDirectory $serverDir -WindowStyle Hidden
  $ok = Wait-Health $healthUrl 60
}

if ($ok) {
  Write-Host "  Backend running OK (GET /health -> 200)`n"
} else {
  Write-Host "  FAILED: backend not healthy. Check server/.env and run: cd server; npm start`n"
  exit 1
}

# 2) Free Next.js ports
Write-Host "[2/4] Free ports 3000 and 3001 (Next uses 3001)..."
Stop-ListenersOnPort 3000
Stop-ListenersOnPort 3001
Start-Sleep -Seconds 1
Write-Host "  Done`n"

# 3) Frontend
Write-Host "[3/4] Next.js (port 3001)..."
if (-not (Test-Path (Join-Path $root 'node_modules'))) {
  Write-Host "  npm install (root)..."
  npm install --silent
}
Start-Process -FilePath 'npm' -ArgumentList 'run', 'dev' -WorkingDirectory $root -WindowStyle Hidden
$frontOk = $false
$dead = (Get-Date).AddSeconds(90)
while ((Get-Date) -lt $dead) {
  try {
    $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3001' -UseBasicParsing -TimeoutSec 2
    if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { $frontOk = $true; break }
  } catch { }
  Start-Sleep -Seconds 2
}
if ($frontOk) {
  Write-Host "  Frontend running OK http://localhost:3001`n"
} else {
  Write-Host "  WARNING: Next not responding yet; it may still compile. Open http://localhost:3001`n"
}

# 4) Payment API
Write-Host "[4/4] POST /create-payment-intent..."
try {
  $body = '{"amount":500}'
  $pr = Invoke-WebRequest -Uri 'http://127.0.0.1:8787/create-payment-intent' -Method POST -ContentType 'application/json' -Body $body -UseBasicParsing
  $j = $pr.Content | ConvertFrom-Json
  if ($pr.StatusCode -eq 200 -and $j.clientSecret) {
    Write-Host "  Payment API working (clientSecret present)`n"
  } else {
    Write-Host "  Unexpected response: $($pr.StatusCode) $($pr.Content)`n"
  }
} catch {
  Write-Host "  Payment API check failed: $_"
  Write-Host "  Ensure STRIPE_SECRET_KEY=sk_test_... in server/.env`n"
}

Write-Host "=== Summary ==="
Write-Host "  Backend running   " -NoNewline; if ($ok) { Write-Host "OK" -ForegroundColor Green } else { Write-Host "FAIL" -ForegroundColor Red }
Write-Host "  Frontend (3001)   " -NoNewline; if ($frontOk) { Write-Host "OK" -ForegroundColor Green } else { Write-Host "pending/open browser" -ForegroundColor Yellow }
Write-Host "  Open: http://localhost:3001"
Write-Host "  API:  http://127.0.0.1:8787`n"
