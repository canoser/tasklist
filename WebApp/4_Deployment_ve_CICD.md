# 🚀 Deployment Mimarisi & CI/CD Planı
## taskia.dersmatris.com — Tam Yığın SaaS Deployment Kılavuzu

> **Proje Durumu:** Backend (Faz 1-2) ve Frontend (Faz 2) tamamlandı. Bu plan, uygulamayı üretim ortamına taşımak için tasarlanmıştır.
> **İlgili Aşama:** [3_Ilerleme_ve_Yol_Haritasi.md](./3_Ilerleme_ve_Yol_Haritasi.md) → Faz 5

---

## 🏗️ Mimari Genel Bakış

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLOUDFLARE (DNS & CDN)                      │
│  dersmatris.com      taskia.dersmatris.com   cdn.dersmatris.com │
│  (Landing Page)      (React PWA)             (R2 Storage)       │
└────────┬─────────────────────┬───────────────────────┬──────────┘
         │                     │                       │
    Cloudflare Pages     Cloudflare Pages         Cloudflare R2
    (dersmatris.com)     (React/Vite PWA)         (10 GB Free)
                              │
                              │ HTTPS API Calls
                              ▼
                    ┌─────────────────────┐
                    │   Fly.io (Önerilen) │
                    │   .NET 9 Web API    │
                    │   Dockerized        │
                    │   256 MB RAM / Free │
                    └─────────┬───────────┘
                              │
                 ┌────────────┴────────────┐
                 │                         │
          Neon PostgreSQL           Cloudflare R2
          (500 MB Free)       (Presigned URL ile
          Scale-to-Zero        doğrudan yükleme)
```

---

## 📊 Backend Hosting Seçenekleri — Karşılaştırma

| Platform | Ücretsiz Plan | RAM | Sleep/Wake | Custom Domain | .NET 9 | CI/CD | Tavsiye |
|:---|:---|:---|:---|:---|:---|:---|:---|
| **Fly.io** | 3 shared-cpu VM + 160 GB bant | 256 MB | ❌ (Her zaman açık) | ✅ Ücretsiz | ✅ Docker | ✅ GitHub Actions | ⭐ **En İyi** |
| **Render** | 750 saat/ay (1 uygulama = tam) | 512 MB | ✅ (15 dk sonra uyur) | ✅ Ücretsiz | ✅ Docker | ✅ Git Push | ✅ Alternatif |
| **Railway** | $5 kredi/ay | 512 MB | ❌ Kredi biter | ✅ Ücretsiz | ✅ Docker | ✅ GitHub | ⚠️ Sınırlı |
| **Azure App Service** | F1 (60 dk CPU/gün) | 1 GB | ✅ (Sürekli uyur) | ❌ Ücretli | ✅ Yerleşik | ✅ Kapsamlı | ❌ Zayıf |
| **Google Cloud Run** | 2M istek/ay ücretsiz | Ölçeklenir | ✅ Scale-to-Zero | ✅ | ✅ Docker | ✅ | ✅ Güçlü Alt. |

### ✅ Karar: Fly.io — Neden?

1. **Neon + Fly.io Frankfurt sinerji:** Neon'un en yakın region'u Frankfurt (`eu-central-1`). Fly.io'nun Frankfurt makineleri (`fra`) sayesinde DB gecikmeleri sıfıra yakın.
2. **Ücretsiz kotada hep açık:** 3 adet `shared-cpu-1x` + 256 MB RAM ücretsiz. Bir makine API için yeterli.
3. **Presigned URL mimarinle mükemmel uyum:** Fly.io sadece JSON trafiği taşır, büyük dosyalar R2'ye gider. 256 MB RAM ile rahat çalışır.
4. **`flyctl deploy` = tek komutlu deploy.**

> **Not:** Eğer API çok nadir kullanılacaksa (haftada birkaç istek) Render da makul bir alternatif. İlk istek 15-20 saniye gecikmeli gelir (cold start) ama ücretsiz kotası tam 750 saat.

---

## 🐳 Adım 1: .NET 9 API'yi Dockerize Et

`WebApp/Backend/` dizinine aşağıdaki iki dosyayı ekle:

### `Dockerfile`

```dockerfile
# ─── Build Stage ────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Proje dosyalarını kopyala ve restore et (cache layer için önce)
COPY ["PlanlamaApp.Api/PlanlamaApp.Api.csproj", "PlanlamaApp.Api/"]
COPY ["PlanlamaApp.Application/PlanlamaApp.Application.csproj", "PlanlamaApp.Application/"]
COPY ["PlanlamaApp.Domain/PlanlamaApp.Domain.csproj", "PlanlamaApp.Domain/"]
COPY ["PlanlamaApp.Infrastructure/PlanlamaApp.Infrastructure.csproj", "PlanlamaApp.Infrastructure/"]
RUN dotnet restore "PlanlamaApp.Api/PlanlamaApp.Api.csproj"

# Tüm kaynak dosyaları kopyala ve publish et
COPY . .
RUN dotnet publish "PlanlamaApp.Api/PlanlamaApp.Api.csproj" \
    -c Release \
    -o /app/publish \
    --no-restore

# ─── Runtime Stage ──────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

# Güvenlik: root olmayan kullanıcı ile çalıştır
RUN adduser --disabled-password --gecos "" appuser && chown -R appuser /app
USER appuser

COPY --from=build /app/publish .

# Fly.io PORT env değişkenini kullanır
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "PlanlamaApp.Api.dll"]
```

### `.dockerignore`

```
**/bin/
**/obj/
**/.git/
**/node_modules/
*.md
*.sqlite
*.db
```

---

## ✈️ Adım 2: Fly.io Kurulumu

### 2.1 Fly.io CLI Kurulumu (PowerShell)

```powershell
# Fly.io CLI'yi kur
iwr https://fly.io/install.ps1 -useb | iex

# Giriş yap (tarayıcı açılır)
flyctl auth login
```

### 2.2 Uygulamayı Başlat (Backend dizininde)

```powershell
cd WebApp/Backend
flyctl launch --name taskia-api --region fra --no-deploy
```

Bu komut `fly.toml` dosyasını oluşturur. İçeriğini şöyle düzenle:

### `fly.toml`

```toml
app = "taskia-api"
primary_region = "fra"  # Frankfurt — Neon ile aynı bölge!

[build]
  dockerfile = "Dockerfile"

[env]
  ASPNETCORE_ENVIRONMENT = "Production"
  ASPNETCORE_URLS = "http://+:8080"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = false   # Ücretsiz kota içinde hep açık tut
  auto_start_machines = true
  min_machines_running = 1

  [http_service.concurrency]
    type = "connections"
    hard_limit = 100
    soft_limit = 80

[[vm]]
  size = "shared-cpu-1x"
  memory = "256mb"
```

### 2.3 Gizli Anahtarları (Secrets) Ayarla

```powershell
# Neon PostgreSQL bağlantı dizesi
flyctl secrets set ConnectionStrings__DefaultConnection="Host=...neon.tech;Database=...;Username=...;Password=...;SslMode=Require"

# Firebase JWT doğrulama
flyctl secrets set Firebase__ProjectId="your-firebase-project-id"

# Cloudflare R2 erişim anahtarları (Presigned URL için)
flyctl secrets set Cloudflare__R2__AccountId="your-account-id"
flyctl secrets set Cloudflare__R2__AccessKeyId="your-r2-access-key"
flyctl secrets set Cloudflare__R2__SecretAccessKey="your-r2-secret-key"
flyctl secrets set Cloudflare__R2__BucketName="taskia-files"

# JWT imzalama anahtarı
flyctl secrets set Jwt__Secret="super-secret-min-32-chars-production-key"
```

### 2.4 İlk Manuel Deploy

```powershell
flyctl deploy
```

---

## 🗄️ Adım 3: Neon PostgreSQL — Dapper Uyumu

> **ÖNEMLİ:** Projenin şu anki `Microsoft.Data.Sqlite` + Dapper altyapısını PostgreSQL'e taşıman gerekiyor. Bu, yalnızca `Infrastructure` katmanında tek seferlik bir değişiklik.

### 3.1 NuGet Paket Değişimi

```powershell
# SQLite'ı kaldır
dotnet remove package Microsoft.Data.Sqlite

# PostgreSQL sürücüsünü ekle
dotnet add package Npgsql
```

### 3.2 DatabaseHelper Değişimi

```csharp
// Infrastructure/Data/DatabaseHelper.cs
using Npgsql;
using System.Data;

public class DatabaseHelper
{
    private readonly string _connectionString;

    public DatabaseHelper(IConfiguration config)
    {
        _connectionString = config.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string missing.");
    }

    public IDbConnection CreateConnection()
        => new NpgsqlConnection(_connectionString);
}
```

### 3.3 Migration Stratejisi (Dapper ile — ORM yok)

`Infrastructure/Migrations/` klasörüne SQL dosyaları ekle:

```sql
-- Infrastructure/Migrations/001_InitialSchema.sql
CREATE TABLE IF NOT EXISTS "IdempotencyKeys" (
    "Id"        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "Key"       VARCHAR(255) NOT NULL UNIQUE,
    "TenantId"  UUID NOT NULL,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "ExpiresAt" TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS "AppUsers" (
    "Id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "TenantId"    UUID NOT NULL,
    "FirebaseUid" VARCHAR(128) NOT NULL UNIQUE,
    "CreatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_idempotency_key   ON "IdempotencyKeys"("Key");
CREATE INDEX IF NOT EXISTS idx_appusers_tenantid ON "AppUsers"("TenantId");
```

---

## ☁️ Adım 4: Cloudflare R2 — Presigned URL Entegrasyonu

### 4.1 NuGet Paketi

```powershell
dotnet add package AWSSDK.S3
```

### 4.2 Servis Arayüzü ve Implementasyonu

```csharp
// Application/Interfaces/IStorageService.cs
public interface IStorageService
{
    Task<string> GenerateUploadUrlAsync(string fileName, string contentType, TimeSpan expiry);
    Task<string> GenerateDownloadUrlAsync(string fileKey, TimeSpan expiry);
}

// Infrastructure/Services/CloudflareR2Service.cs
using Amazon.S3;
using Amazon.S3.Model;

public class CloudflareR2Service : IStorageService
{
    private readonly IAmazonS3 _s3Client;
    private readonly string _bucketName;

    public CloudflareR2Service(IConfiguration config)
    {
        var accountId = config["Cloudflare:R2:AccountId"];
        _bucketName   = config["Cloudflare:R2:BucketName"]!;

        _s3Client = new AmazonS3Client(
            config["Cloudflare:R2:AccessKeyId"],
            config["Cloudflare:R2:SecretAccessKey"],
            new AmazonS3Config
            {
                ServiceURL   = $"https://{accountId}.r2.cloudflarestorage.com",
                ForcePathStyle = true
            }
        );
    }

    public async Task<string> GenerateUploadUrlAsync(
        string fileName, string contentType, TimeSpan expiry)
    {
        var request = new GetPreSignedUrlRequest
        {
            BucketName  = _bucketName,
            Key         = $"uploads/{Guid.NewGuid()}/{fileName}",
            Verb        = HttpVerb.PUT,
            ContentType = contentType,
            Expires     = DateTime.UtcNow.Add(expiry)
        };
        return await _s3Client.GetPreSignedURLAsync(request);
    }

    public async Task<string> GenerateDownloadUrlAsync(string fileKey, TimeSpan expiry)
    {
        var request = new GetPreSignedUrlRequest
        {
            BucketName = _bucketName,
            Key        = fileKey,
            Verb       = HttpVerb.GET,
            Expires    = DateTime.UtcNow.Add(expiry)
        };
        return await _s3Client.GetPreSignedURLAsync(request);
    }
}
```

### 4.3 DI Kaydı (Program.cs)

```csharp
builder.Services.AddSingleton<IStorageService, CloudflareR2Service>();
```

---

## 🔄 Adım 5: GitHub Actions — CI/CD Pipeline

### Dizin Yapısı

```
.github/
└── workflows/
    ├── backend-deploy.yml    # .NET 9 → Fly.io
    └── frontend-deploy.yml   # React/Vite → Cloudflare Pages
```

### `backend-deploy.yml`

```yaml
name: 🚀 Backend Deploy → Fly.io

on:
  push:
    branches: [main]
    paths:
      - 'WebApp/Backend/**'   # Sadece backend değişince tetikle
  workflow_dispatch:           # Manuel tetikleme

jobs:
  test:
    name: 🧪 Test & Build
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: WebApp/Backend

    steps:
      - name: 📥 Checkout
        uses: actions/checkout@v4

      - name: 🔧 Setup .NET 9
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '9.0.x'

      - name: 📦 Restore Dependencies
        run: dotnet restore PlanlamaApp.sln

      - name: 🔨 Build (0 Hata kontrolü)
        run: dotnet build PlanlamaApp.sln -c Release --no-restore

      - name: 🧪 Run Tests
        run: dotnet test PlanlamaApp.sln --no-build -c Release \
               --logger "trx;LogFileName=results.trx" \
               --results-directory ./TestResults

      - name: 📊 Publish Test Results
        uses: dorny/test-reporter@v1
        if: always()
        with:
          name: .NET Test Results
          path: WebApp/Backend/TestResults/*.trx
          reporter: dotnet-trx

  deploy:
    name: ✈️ Deploy → Fly.io
    runs-on: ubuntu-latest
    needs: test              # Test geçmeden deploy yok!
    if: github.ref == 'refs/heads/main'

    steps:
      - name: 📥 Checkout
        uses: actions/checkout@v4

      - name: 🔧 Setup Fly.io CLI
        uses: superfly/flyctl-actions/setup-flyctl@master

      - name: 🚀 Deploy to Fly.io
        run: flyctl deploy --remote-only
        working-directory: WebApp/Backend
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

### `frontend-deploy.yml`

```yaml
name: 🌐 Frontend Deploy → Cloudflare Pages

on:
  push:
    branches: [main]
    paths:
      - 'WebApp/Frontend/**'
  workflow_dispatch:

jobs:
  build-and-deploy:
    name: 🏗️ Build & Deploy
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: WebApp/Frontend

    steps:
      - name: 📥 Checkout
        uses: actions/checkout@v4

      - name: 🔧 Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: WebApp/Frontend/package-lock.json

      - name: 📦 Install Dependencies
        run: npm ci

      - name: 🔨 Build Production Bundle
        run: npm run build
        env:
          VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL }}
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
          VITE_CDN_URL: https://cdn.dersmatris.com

      - name: ☁️ Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy dist --project-name=taskia --branch=main
          workingDirectory: WebApp/Frontend
```

### GitHub Secrets Listesi

GitHub repo → **Settings → Secrets and variables → Actions** ekranına gir:

| Secret Adı | Değer |
|:---|:---|
| `FLY_API_TOKEN` | `flyctl auth token` çıktısı |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token (Pages:Edit yetkili) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare hesap ID'si |
| `VITE_API_BASE_URL` | `https://api.dersmatris.com` |
| `VITE_FIREBASE_API_KEY` | Firebase proje API anahtarı |
| `VITE_FIREBASE_PROJECT_ID` | Firebase proje ID'si |

---

## 🌐 Adım 6: DNS & Domain Yapılandırması (Cloudflare)

### Cloudflare DNS Kayıtları

| Tür | İsim | Değer | Proxy |
|:---|:---|:---|:---|
| `CNAME` | `taskia` | `taskia.pages.dev` | ✅ Proxied |
| `CNAME` | `cdn` | `<bucket>.r2.cloudflarestorage.com` | ✅ Proxied |
| `CNAME` | `api` | `taskia-api.fly.dev` | ✅ Proxied |
| `A` | `@` | Cloudflare Pages IP | ✅ Proxied |

> **İpucu:** `api.dersmatris.com` → `taskia-api.fly.dev` yönlendirmesi sayesinde backend URL'ini hiç değiştirmek zorunda kalmazsın. Fly.io'dan başka bir platforma geçsen bile yalnızca Cloudflare DNS'i güncellemek yeterli olur.

### Fly.io'ya Custom Domain Bağlama

```powershell
flyctl certs add api.dersmatris.com
flyctl certs show api.dersmatris.com
```

---

## 🔐 Adım 7: Production Ortam Değişkenleri

`WebApp/Backend/PlanlamaApp.Api/appsettings.Production.json`:

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Warning",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "api.dersmatris.com;taskia-api.fly.dev",
  "AllowedOrigins": [
    "https://taskia.dersmatris.com",
    "https://taskia.pages.dev",
    "capacitor://localhost",
    "http://localhost"
  ]
}
```

> **DİKKAT:** `appsettings.Production.json` içine asla gerçek şifre veya API anahtarı yazma. Tüm sırlar `flyctl secrets set` ile enjekte edilmeli. Bu dosya `.gitignore`'a eklenmemeli; üretim konfigürasyonunun şemasını göstermek için repo'da kalabilir.

---

## 📋 Portability Notları — Bu Plandan Etkilenecek Alanlar

[PORTABILITY.md](../PORTABILITY.md) dosyasındaki açık maddelerden deploy öncesi yapılması gerekenler:

| Alan | Öncelik | Açıklama |
|:---|:---|:---|
| Cookie → Bearer Token (`AuthController.cs`) | 🔴 Kritik | Deploy öncesi yapılmalı |
| JWT okuma (`Program.cs`) | 🔴 Kritik | Deploy öncesi yapılmalı |
| CORS — Capacitor origin'leri | 🟠 Orta | `appsettings.Production.json`'da zaten var (bu planda) |
| `signInWithPopup` → Native OAuth | 🔴 Kritik | Mobil paketleme başlamadan önce yapılmalı |

---

## 🗓️ Önerilen Uygulama Sırası

### Hafta 1 — Altyapı Hazırlığı
- [ ] Neon.tech hesabı aç, schema migration SQL'lerini çalıştır
- [ ] Cloudflare R2 bucket oluştur ve CORS policy'sini ayarla
- [ ] `Microsoft.Data.Sqlite` → `Npgsql` geçişini yap (`DatabaseHelper.cs`)
- [ ] `Dockerfile` ve `.dockerignore`'u oluştur
- [ ] Lokal Docker'da `docker build` ve `docker run` ile test et

### Hafta 2 — Deploy
- [ ] PORTABILITY.md'deki 🔴 Kritik maddeleri tamamla (Cookie → Bearer)
- [ ] Fly.io hesabı aç, `flyctl launch` çalıştır (`fra` region)
- [ ] `flyctl secrets set` ile tüm gizli anahtarları gir
- [ ] `flyctl deploy` ile ilk manual deploy'u yap, Swagger UI'ı kontrol et
- [ ] GitHub Secrets'ları gir
- [ ] `.github/workflows/` workflow dosyalarını ekle ve push ile test et

### Hafta 3 — DNS & Doğrulama
- [ ] Cloudflare Pages'e frontend bağla (`taskia.dersmatris.com`)
- [ ] `api.dersmatris.com` → Fly.io custom domain ekle
- [ ] `cdn.dersmatris.com` → R2 custom domain bağla
- [ ] End-to-end tüm akışı (Auth → API → DB → R2) test et
- [ ] Bu dosyadaki tüm adımları ✅ olarak işaretle

---

*Oluşturulma: 2 Ağustos 2026 — Antigravity*
