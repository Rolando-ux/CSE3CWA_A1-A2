<#
.SYNOPSIS
  Runs the JMeter load test at one or more staged user levels.

.DESCRIPTION
  For every level this script
    1. builds a fresh throwaway database (test.db) so levels never affect each other,
    2. starts the production server on port 3100,
    3. samples the server's memory and CPU every 2 seconds while JMeter runs,
    4. runs the JMeter plan headless and writes an HTML report,
    5. stops the server.
  Raw output goes to jmeter\results\x<users>\ (git-ignored). Run
  `node jmeter/summarize-results.mjs` afterwards to build jmeter\RESULTS.md.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File jmeter\run-load-test.ps1 -Levels "1,10,100"
#>
param(
  # A comma-separated list in one string, because `powershell -File` does not
  # turn "1,10,100" into an array by itself.
  [string]$Levels = "1,10,100,1000,10000",
  [string]$JMeterHome = "C:\Users\yusva\tools\apache-jmeter-5.6.3",
  [int]$Port = 3100,
  [int]$ThinkMs = 300,
  [int]$LoopsOverride = 0,  # 0 = use the per-level default below
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$levelList = @($Levels -split "[,\s]+" | Where-Object { $_ } | ForEach-Object { [int]$_ })
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

# Users, ramp-up (seconds) and loops per user for each level. Smaller levels loop
# more so that every level produces a meaningful number of samples.
$plans = @{
  1     = @{ RampUp = 1;  Loops = 40 }
  10    = @{ RampUp = 5;  Loops = 20 }
  100   = @{ RampUp = 10; Loops = 10 }
  1000  = @{ RampUp = 30; Loops = 3 }
  10000 = @{ RampUp = 60; Loops = 1 }
}

$jmeter = Join-Path $JMeterHome "bin\jmeter.bat"
$plan = Join-Path $PSScriptRoot "phoneme-builder-load-test.jmx"
if (-not (Test-Path $jmeter)) { throw "JMeter not found at $jmeter" }

function Stop-Server {
  $listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($id in $listeners) { Stop-Process -Id $id -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Seconds 2
}

function Wait-Healthy {
  for ($i = 0; $i -lt 90; $i++) {
    try {
      $r = Invoke-WebRequest "http://localhost:$Port/health" -UseBasicParsing -TimeoutSec 2
      if ($r.StatusCode -eq 200) { return }
    } catch { }
    Start-Sleep -Seconds 1
  }
  throw "Server did not become healthy on port $Port"
}

if (-not $SkipBuild) {
  Write-Host "[load-test] Building the production app once..."
  npm run build | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Build failed" }
}

foreach ($level in $levelList) {
  $cfg = if ($plans.ContainsKey($level)) { $plans[$level] } else { @{ RampUp = [math]::Max(1, [math]::Ceiling($level / 20)); Loops = 1 } }
  # NB: PowerShell variable names are case-insensitive, so this must not be
  # called $loops while a parameter called $Loops exists (it would overwrite it).
  $userLoops = if ($LoopsOverride -gt 0) { $LoopsOverride } else { $cfg.Loops }
  $dir = Join-Path $PSScriptRoot "results\x$level"
  if (Test-Path $dir) { Remove-Item -LiteralPath $dir -Recurse -Force }
  New-Item -ItemType Directory -Force $dir | Out-Null

  Write-Host ""
  Write-Host "=== Level x$level : $level users, ramp-up $($cfg.RampUp)s, $userLoops loop(s) each ==="

  Stop-Server
  $env:DATABASE_URL = "file:./test.db"
  node tests/setup/prepare-test-db.mjs | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Could not prepare the test database" }
  $dbBefore = (node jmeter/count-records.mjs test.db) | ConvertFrom-Json

  $server = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "start", "--", "-p", "$Port" `
    -WorkingDirectory $root -PassThru -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $dir "server.out.log") -RedirectStandardError (Join-Path $dir "server.err.log")
  Wait-Healthy
  $serverPid = (Get-NetTCPConnection -LocalPort $Port -State Listen | Select-Object -First 1).OwningProcess
  Write-Host "[load-test] Server up (pid $serverPid)"

  # Sample the server every 2 s: CPU (percent of one core), memory, handles, open connections.
  $monitorFile = Join-Path $dir "server-metrics.csv"
  $monitor = Start-Job -ArgumentList $serverPid, $monitorFile, $Port -ScriptBlock {
    param($procId, $file, $port)
    "seconds,server_cpu_pct_of_one_core,server_memory_mb,server_handles,connections_on_port,system_cpu_pct" | Out-File $file -Encoding ascii
    $start = Get-Date
    $last = (Get-Process -Id $procId).TotalProcessorTime.TotalSeconds
    $lastTime = $start
    while ($true) {
      Start-Sleep -Seconds 2
      try {
        $p = Get-Process -Id $procId -ErrorAction Stop
        $now = Get-Date
        $cpu = $p.TotalProcessorTime.TotalSeconds
        $pct = [math]::Round(($cpu - $last) / ($now - $lastTime).TotalSeconds * 100, 1)
        $last = $cpu; $lastTime = $now
        $conns = ([Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpConnections() |
          Where-Object { $_.LocalEndPoint.Port -eq $port }).Count
        $sys = (Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor -Filter "Name='_Total'").PercentProcessorTime
        "{0},{1},{2},{3},{4},{5}" -f [math]::Round(($now - $start).TotalSeconds), $pct, [math]::Round($p.WorkingSet64 / 1MB), $p.HandleCount, $conns, $sys |
          Out-File $file -Append -Encoding ascii
      } catch { break }
    }
  }

  $env:JVM_ARGS = "-Xms2g -Xmx8g"
  $started = Get-Date
  & $jmeter -n -t $plan `
    -l (Join-Path $dir "results.jtl") -j (Join-Path $dir "jmeter.log") `
    -e -o (Join-Path $dir "report") `
    "-Jthreads=$level" "-Jrampup=$($cfg.RampUp)" "-Jloops=$userLoops" "-Jthink=$ThinkMs" "-Jport=$Port" `
    *> (Join-Path $dir "jmeter.console.log")
  $jmeterExit = $LASTEXITCODE
  $seconds = [math]::Round(((Get-Date) - $started).TotalSeconds)

  # jmeter.bat prints "Press any key to continue" and still returns 0 when it
  # cannot load the plan, so the exit code alone is not trustworthy.
  $results = Join-Path $dir "results.jtl"
  $console = Get-Content (Join-Path $dir "jmeter.console.log") -Raw -ErrorAction SilentlyContinue
  $failed = (-not (Test-Path $results)) -or ((Get-Item $results).Length -lt 100) -or ($console -match "errorlevel=")
  if ($failed) {
    Stop-Job $monitor -ErrorAction SilentlyContinue; Remove-Job $monitor -Force -ErrorAction SilentlyContinue
    Stop-Server
    throw "JMeter did not produce results for x$level. See $dir\jmeter.console.log"
  }

  Stop-Job $monitor -ErrorAction SilentlyContinue; Remove-Job $monitor -Force -ErrorAction SilentlyContinue
  Stop-Server
  $dbAfter = (node jmeter/count-records.mjs test.db) | ConvertFrom-Json

  @{
    level = $level; threads = $level; rampUpSeconds = $cfg.RampUp; loops = $userLoops; thinkMs = $ThinkMs
    jmeterExitCode = $jmeterExit; wallClockSeconds = $seconds; startedAt = $started.ToString("o")
    dbBefore = $dbBefore; dbAfter = $dbAfter
  } | ConvertTo-Json -Depth 4 | Out-File (Join-Path $dir "run-info.json") -Encoding ascii

  Write-Host "[load-test] x$level finished in ${seconds}s (JMeter exit code $jmeterExit)"
}

Write-Host ""
Write-Host "[load-test] All levels done. Run: node jmeter/summarize-results.mjs"
