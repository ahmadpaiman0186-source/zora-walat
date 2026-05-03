# Controlled Prisma deploy loop: baseline recovery when objects already exist (42P07 / 42701).
# Also handles P3009 after P3018 (failed migration record for duplicate-object deploy).
# Does NOT reset, drop, or db push.
$ErrorActionPreference = "Continue"
Set-Location $PSScriptRoot\..
$bt = [char]0x60
$max = 60
for ($i = 1; $i -le $max; $i++) {
  Write-Host "=== MIGRATE ATTEMPT $i ==="
  $out = npm run db:migrate 2>&1 | Out-String
  Write-Host $out

  if ($LASTEXITCODE -eq 0) {
    Write-Host "MIGRATIONS COMPLETE"
    exit 0
  }

  # P3018: duplicate object — Migration name: <id>
  $isAlreadyExists =
    $out -match "already exists" -or
    $out -match "42P07" -or
    $out -match "42701"

  $hasMigrationName = $out -match "Migration name:\s*(\S+)"

  if ($isAlreadyExists -and $hasMigrationName) {
    $mig = $Matches[1].Trim()
    if ($mig -match "^\d{14}_") {
      Write-Host "Resolving already-applied migration (P3018 duplicate): $mig"
      npx prisma migrate resolve --applied $mig
      if ($LASTEXITCODE -ne 0) {
        Write-Host "STOP: migrate resolve failed for $mig"
        exit 1
      }
      continue
    }
  }

  # P3009: failed migration row — e.g. after P3018; same migration must be marked applied if DB matches
  if ($out -match "P3009") {
    $pat = 'The ' + $bt + '(\d{14}_[a-zA-Z0-9_]+)' + $bt + ' migration'
    $m = [regex]::Match($out, $pat)
    if ($m.Success) {
      $mig = $m.Groups[1].Value
      Write-Host "Resolving stuck failed migration (P3009, assume duplicate-object baseline): $mig"
      npx prisma migrate resolve --applied $mig
      if ($LASTEXITCODE -ne 0) {
        Write-Host "STOP: migrate resolve failed for $mig"
        exit 1
      }
      continue
    }
  }

  Write-Host "STOP: non-baseline migration error (no safe resolve). Manual review required."
  exit 1
}
Write-Host "STOP: max attempts $max"
exit 1
