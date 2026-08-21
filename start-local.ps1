#Requires -Version 5.1
<#
.SYNOPSIS
  Start the Access-Invoicing API + frontend locally (Windows / PowerShell).

.USAGE
  From the repo root:
    .\start-local.ps1

  If PowerShell blocks scripts:
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
#>
$ErrorActionPreference = "Stop"

$Root = $PSScriptRoot
Set-Location $Root

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

function Get-PnpmCommand {
  $cmd = Get-Command pnpm.cmd -ErrorAction SilentlyContinue
  if ($cmd) {
    return $cmd.Source
  }

  $cmd = Get-Command pnpm -ErrorAction SilentlyContinue
  if ($cmd) {
    return $cmd.Source
  }

  throw "pnpm was not found on PATH. Install it with: corepack enable; corepack prepare pnpm@latest --activate"
}

function Invoke-Pnpm([string[]]$Args) {
  & $script:Pnpm @Args
  if ($LASTEXITCODE -ne 0) {
    throw "pnpm $($Args -join ' ') failed with exit code $LASTEXITCODE"
  }
}

function Wait-ApiHealthy([string]$Port, [int]$TimeoutSec = 60) {
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
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
$script:Pnpm = Get-PnpmCommand
$apiProcess = $null

Write-Host "Building API..."
$env:NODE_ENV = "development"
Invoke-Pnpm @("--filter", "@workspace/api-server", "run", "build")

Write-Host "Starting API on http://localhost:$ApiPort ..."
$apiProcess = Start-Process `
  -FilePath $script:Pnpm `
  -ArgumentList @("--filter", "@workspace/api-server", "run", "start") `
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
  if ($apiProcess -and -not $apiProcess.HasExited) {
    Stop-ProcessTree -ProcessId $apiProcess.Id
  }
}
