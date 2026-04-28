$ErrorActionPreference = "SilentlyContinue"
$killedPids = [System.Collections.Generic.List[string]]::new()

# 1) Stop all Node
$nodesBefore = Get-Process -Name node -ErrorAction SilentlyContinue
foreach ($p in $nodesBefore) { [void]$killedPids.Add([string]$p.Id) }
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# 2) Free port 8787
$port = 8787
$pids = netstat -ano | findstr ":$port" | ForEach-Object {
  ($_ -split '\s+')[-1]
} | Sort-Object -Unique

foreach ($pidStr in $pids) {
  if ($pidStr -match '^\d+$') {
    if (-not $killedPids.Contains($pidStr)) { [void]$killedPids.Add($pidStr) }
    Stop-Process -Id ([int]$pidStr) -Force -ErrorAction SilentlyContinue
  }
}

# 3) PowerShell jobs
Get-Job -ErrorAction SilentlyContinue | Stop-Job -Force -ErrorAction SilentlyContinue
Get-Job -ErrorAction SilentlyContinue | Remove-Job -Force -ErrorAction SilentlyContinue

# 4) Dev tools
$extra = Get-Process -Name "prisma-studio","node","postgres","psql" -ErrorAction SilentlyContinue
foreach ($p in $extra) {
  $sid = [string]$p.Id
  if (-not $killedPids.Contains($sid)) { [void]$killedPids.Add($sid) }
}
Get-Process -Name "prisma-studio","node","postgres","psql" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Milliseconds 500

# 5) Verify port 8787
$listen8787 = netstat -ano | findstr ":8787"
$port8787Listening = if ($listen8787) { "yes" } else { "no" }

# 6) Node remaining
$nodeAfter = @(Get-Process node -ErrorAction SilentlyContinue)
$nodeCount = $nodeAfter.Count

$jobsRemaining = @(Get-Job -ErrorAction SilentlyContinue).Count

Write-Output "---ZW_REPORT---"
Write-Output "nodeProcessesRemaining: $nodeCount"
Write-Output "port8787Listening: $port8787Listening"
Write-Output "jobsRemaining: $jobsRemaining"
Write-Output "killedPids: $($killedPids -join ', ')"
if ($listen8787) {
  Write-Output "port8787Detail:"
  $listen8787 | ForEach-Object { Write-Output $_ }
}
Write-Output "---END---"
