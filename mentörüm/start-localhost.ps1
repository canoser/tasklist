$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   Mentorum - Localhost Baslatici        " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Acik olan eski portlari temizle (5130: .NET API, 5173: Vite)
Write-Host "--> Eski baglantilar kontrol ediliyor (5130, 5173)..." -ForegroundColor Yellow
$portsToClose = @(5130, 5173)
foreach ($port in $portsToClose) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($conn in $connections) {
            if ($conn.OwningProcess -gt 0) {
                Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
            }
        }
        Write-Host "    Port $port temizlendi." -ForegroundColor Green
    }
}

# 2. Dizinleri belirle
$scriptDir = $PSScriptRoot
if (-not $scriptDir) { $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition }
if (-not $scriptDir) { $scriptDir = $PWD.Path }

$backendPath = Join-Path $scriptDir "Backend\MentorumApi"
$frontendPath = Join-Path $scriptDir "Frontend"

# 3. Backend'i baslat (Ayrı pencerede)
Write-Host "--> Backend (API - Port 5130) baslatiliyor..." -ForegroundColor Yellow
Start-Process "powershell.exe" -ArgumentList "-NoExit -Command `"Set-Location -LiteralPath '$backendPath'; Write-Host '--- MENTORUM BACKEND (Port 5130) ---' -ForegroundColor Cyan; dotnet run`""

# 4. Frontend'i baslat (Ayrı pencerede)
Write-Host "--> Frontend (React/Vite - Port 5173) baslatiliyor..." -ForegroundColor Yellow
Start-Process "powershell.exe" -ArgumentList "-NoExit -Command `"Set-Location -LiteralPath '$frontendPath'; Write-Host '--- MENTORUM FRONTEND (Port 5173) ---' -ForegroundColor Green; npm run dev`""

Write-Host ""
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "Tebrikler! Mentorum servisleri basariyla baslatildi." -ForegroundColor White
Write-Host ""
Write-Host "  >> Frontend : http://localhost:5173" -ForegroundColor Yellow
Write-Host "  >> Backend  : http://localhost:5130" -ForegroundColor Yellow
Write-Host ""
Write-Host "(Tarayicinizdan yukaridaki Frontend adresine gidebilirsiniz)" -ForegroundColor Gray
Write-Host "Kapatmak isterseniz acilan pencereleri kapatabilirsiniz." -ForegroundColor Gray
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host ""
Read-Host "Pencereyi kapatmak icin Enter'a basin..."
