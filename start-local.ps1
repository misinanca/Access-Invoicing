#Requires -Version 5.1
<#
.SYNOPSIS
  Start the Access-Invoicing API + frontend locally (Windows / PowerShell).

.USAGE
  From the repo root (no admin required):
    .\start-local.ps1

  If PowerShell still blocks this script:
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
#>
$ErrorActionPreference = "Stop"

$Root = $PSScriptRoot
Set-Location $Root

# CurrentUser scope does not need admin. Helps if pnpm.ps1 is blocked.
try {
  Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force -ErrorAction Stop
}
catch {
  # Ignore — we call pnpm.cmd via cmd.exe anyway.
}

function Import-DotEnv([string]$Path) {
  Get-Content -Path $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) {
      return
    }

    $parts = $line -split "=", 2
    if ($parts.Count -ne 2) {
      return
    }

    $name = $parts[0].Trim()
    $value = $parts[1].Trim().Trim('"').Trim("'")
    Set-Item -Path "Env:$name" -Value $value
  }
}

function Resolve-PnpmCmd {
  $fromPath = Get-Command "pnpm.cmd" -CommandType Application -ErrorAction SilentlyContinue
  if ($fromPath) {
    return $fromPath.Source
  }

  try {
    $npmBin = (& npm.cmd bin -g 2>$null | Select-Object -First 1)
    if ($npmBin) {
      $candidate = Join-Path $npmBin.Trim() "pnpm.cmd"
      if (Test-Path $candidate) {
        return $candidate
      }
    }
  }
  catch {
    # continue
  }

  $nodeCmd = Get-Command "node.exe" -CommandType Application -ErrorAction SilentlyContinue
  if ($nodeCmd) {
    $nodeDir = Split-Path -Parent $nodeCmd.Source
    foreach ($name in @("pnpm.cmd", "pnpm")) {
      $candidate = Join-Path $nodeDir $name
      if (Test-Path $candidate) {
        return $candidate
      }
    }
  }

  throw @"
pnpm.cmd was not found on PATH.

Install without admin:
  corepack enable
  corepack prepare pnpm@latest --activate

Or:
  npm install -g pnpm

Then open a new PowerShell window and retry.
"@
}

function Invoke-Pnpm([string[]]$PnArgs) {
  # Use cmd.exe + pnpm.cmd so PowerShell execution policy cannot block the pnpm shim.
  $quoted = $PnArgs | ForEach-Object {
    if ($_ -match '[\s"]') {
      '"' + ($_ -replace '"', '\"') + '"'
    }
    else {
      $_
    }
  }
  $commandLine = '"' + $script:PnpmCmd + '" ' + ($quoted -join " ")

  Write-Host ">$ commandLine"
  & cmd.exe /c $commandLine
  if ($LASTEXITCODE -ne 0) {
    throw "pnpm failed (exit $LASTEXITCODE): $commandLine"
  }
}

function Wait-ApiHealthy([string]$Port, [int]$TimeoutSec = 90) {
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    if ($script:ApiProcess -and $script:ApiProcess.HasExited) {
      throw "API process exited early with code $($script:ApiProcess.ExitCode). Check the API output above."
    }

    try {
      $response = Invoke-WebRequest -Uri "http://localhost:$Port/api/healthz" -UseBasicParsing -TimeoutSec 2
      if ($response.StatusCode -eq 200) {
        return
      }
    }
    catch {
      # keep waiting
    }

    Start-Sleep -Seconds 1
  }

  throw "API did not become healthy on http://localhost:$Port/api/healthz"
}

function Stop-ProcessTree([int]$ProcessId) {
  if ($ProcessId -le 0) {
    return
  }

  & taskkill.exe /PID $ProcessId /T /F 2>$null | Out-Null
}

if (-not (Test-Path (Join-Path $Root ".env.local"))) {
  throw "Missing .env.local. Run: Copy-Item .env .env.local  then fill in DATABASE_URL and other values."
}

Import-DotEnv (Join-Path $Root ".env.local")

if (-not $env:DATABASE_URL) {
  throw "DATABASE_URL is empty in .env.local"
}

if (-not $env:PORT) {
  $env:PORT = "8080"
}

$ApiPort = $env:PORT
$FrontendPort = "19044"
$script:PnpmCmd = Resolve-PnpmCmd
$script:ApiProcess = $null

Write-Host "Using pnpm: $script:PnpmCmd"
Write-Host "Building API..."
$env:NODE_ENV = "development"
Invoke-Pnpm @("--filter", "@workspace/api-server", "run", "build")

Write-Host "Starting API on http://localhost:$ApiPort ..."
$apiCmd = '"' + $script:PnpmCmd + '" --filter @workspace/api-server run start'
$script:ApiProcess = Start-Process `
  -FilePath "cmd.exe" `
  -ArgumentList @("/c", $apiCmd) `
  -WorkingDirectory $Root `
  -PassThru `
  -NoNewWindow

try {
  Wait-ApiHealthy -Port $ApiPort
  Write-Host "API is healthy."
  Write-Host "Starting frontend on http://localhost:$FrontendPort/"
  Write-Host "Press Ctrl+C to stop both."

  $env:PORT = $FrontendPort
  $env:BASE_PATH = "/"
  Invoke-Pnpm @("--filter", "@workspace/invoicing-db", "run", "dev")
}
finally {
  Write-Host "`nStopping API..."
  if ($script:ApiProcess -and -not $script:ApiProcess.HasExited) {
    Stop-ProcessTree -ProcessId $script:ApiProcess.Id
  }
}
