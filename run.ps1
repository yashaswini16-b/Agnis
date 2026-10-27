# =========================================================
# AegisSOC Mini SIEM Platform One-Click Launcher
# =========================================================

Write-Host "Starting AegisSOC Mini SIEM Platform..." -ForegroundColor Cyan

$backendDir = Join-Path $PSScriptRoot "backend"
$frontendDir = Join-Path $PSScriptRoot "frontend"

# Check if dist exists, build if not
$distDir = Join-Path $frontendDir "dist"
if (-not (Test-Path $distDir)) {
    Write-Host "Building frontend assets..." -ForegroundColor Yellow
    Push-Location $frontendDir
    npm run build
    Pop-Location
}

Write-Host "Launching unified SIEM server on http://127.0.0.1:8000 ..." -ForegroundColor Green
Start-Process "http://127.0.0.1:8000"

Push-Location $backendDir
python -m uvicorn main:app --host 127.0.0.1 --port 8000
Pop-Location
