$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   Planlama App - Wi-Fi Host Baslatici   " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Acik olan eski portlari temizle (5173: Vite, 5268: .NET API)
Write-Host "--> Eski baglantilar temizleniyor..." -ForegroundColor Yellow
$portsToClose = @(5173..5183) + @(5268, 7049)
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

# 2. Yerel IP Adresini Bul (192.168 ile baslayan)
$ipInfo = ipconfig | Select-String "IPv4" | Select-String "192.168."
if (-not $ipInfo) {
    Write-Host "HATA: 192.168.x.x formatinda bir Wi-Fi IP adresi bulunamadi!" -ForegroundColor Red
    Write-Host "Lutfen Wi-Fi'a bagli oldugunuzdan emin olun." -ForegroundColor Yellow
    exit
}

$ipAddress = ($ipInfo -split ": ")[-1].Trim()
Write-Host "--> Tespit edilen Wi-Fi IP Adresi: $ipAddress" -ForegroundColor Green

# 3. Frontend .env dosyasini guncelle (Proxy mimarisi)
# [MOBILE_PORT_TODO]: Mobil derlemelerinde (Capacitor) Proxy CALISMAZ. VITE_API_BASE_URL mutlak IP adresi olmalidir.
# VITE_API_BASE_URL=/api: Frontend Vite proxy uzerinden backend'e erisir (cookie same-origin olur)
# VITE_API_TARGET: Vite proxy'nin yonlendirecegi gercek backend adresi
$envPath = "WebApp\Frontend\.env"
$envContent = "VITE_API_BASE_URL=/api`r`nVITE_API_TARGET=http://$($ipAddress):5268`r`nVITE_GOOGLE_CLIENT_ID=679106587500-fui49dfsdkpvb3qtvi6cl1krdpt64alh.apps.googleusercontent.com"
Set-Content -Path $envPath -Value $envContent
Write-Host "--> Frontend .env dosyasi guncellendi (Proxy: /api -> http://$($ipAddress):5268)" -ForegroundColor Green

# 4. Backend'i baslat (Yeni pencerede)
Write-Host "--> Backend (API) baslatiliyor..." -ForegroundColor Yellow
Start-Process "powershell.exe" -ArgumentList "-NoExit -Command `"cd WebApp\Backend\PlanlamaApp.Api; dotnet run`""

# 5. Frontend'i baslat (Yeni pencerede)
Write-Host "--> Frontend (React/Vite) baslatiliyor..." -ForegroundColor Yellow
Start-Process "powershell.exe" -ArgumentList "-NoExit -Command `"cd WebApp\Frontend; npm run dev --host`""

Write-Host ""
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "Tebrikler! Sistem basariyla yerel aga acildi." -ForegroundColor White
Write-Host "Telefonunuzdan VEYA ayni agdaki baska bir cihazdan su adrese girin:" -ForegroundColor White
Write-Host "👉 http://$($ipAddress):5173" -ForegroundColor Yellow
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "Kapatmak isterseniz acilan iki yeni siyah pencereyi (Backend ve Frontend) kapatabilirsiniz." -ForegroundColor Gray
