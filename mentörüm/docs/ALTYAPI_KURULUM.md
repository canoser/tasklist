# 🚀 Mentörüm — Altyapı Kurulum Kılavuzu (ALTYAPI_KURULUM.md)
> Versiyon: 1.0 — 23 Eylül 2026
> Bu kılavuz; Neon (yeni database), Fly.io (yeni uygulama), Cloudflare R2
> ve GitHub Actions kurulumunu adım adım, komut bazlı anlatır.
> Mevcut dersmatris-api uygulamasından BAĞIMSIZ bir kurulum yapılır.

---

## İÇİNDEKİLER
1. Genel Mimari — Mevcut ve Yeni
2. Neon — Yeni Database Oluşturma
3. Fly.io — Yeni Uygulama (mentorum-api)
4. Cloudflare R2 — Bucket ve API Key
5. GitHub — Secrets ve Environment Kurulumu
6. .gitignore ve .env Yapılandırması
7. git-secrets Kurulumu (Secret Sızma Koruması)
8. Lokal Geliştirme Ortamı
9. GitHub Actions CI/CD Pipeline
10. Subdomain Yönlendirme (mentorum.dersmatris.com)
11. Kurulum Sonrası Kontrol Listesi

---

## 1. Genel Mimari — Mevcut ve Yeni

MEVCUT (dokunulmaz):
  Fly app adı   : dersmatris-api
  Bölge         : fra (Frankfurt)
  URL           : app.dersmatris.com
  Neon DB       : dersmatris (mevcut database)

YENİ (mentörüm):
  Fly app adı   : mentorum-api         ← ayrı uygulama, ayrı VM
  Bölge         : fra (aynı bölge)     ← Neon'a olan gecikme düşük kalır
  URL           : mentorum.dersmatris.com/api
  Neon DB       : mentorum             ← AYNI Neon projesi, YENİ database

Neden ayrı Fly uygulaması?
  - Mentörüm patlarsa mevcut site etkilenmez
  - Deploy'lar bağımsız — iki projeyi aynı anda deploy etmek zorunda kalmazsın
  - Log'lar karışmaz, maliyet takibi netleşir
  - Fly free tier 3 VM'ye kadar ücretsiz: şu an 1 kullanılıyor, 1 daha açılıyor

---

## 2. Neon — Yeni Database Oluşturma

### 2.1 Neon Paneline Giriş
1. https://console.neon.tech adresine gir
2. Mevcut projeyi seç (dersmatris veya planlama-app — hangisi ise)

### 2.2 Yeni Database Oluştur (Aynı Proje İçinde)

Neon'da "proje" içinde birden fazla "database" açılabilir.
Mevcut dersmatris database'i ile aynı proje içinde yeni bir database açmak:

  Sol menü → Databases → "New Database" butonuna tıkla
  Database Name: mentorum
  Owner: neondb_owner (varsayılan — değiştirme)
  "Create" butonuna tıkla

Oluşan database için bağlantı bilgilerini al:
  Sol menü → Dashboard → Connection Details
  Database açılır listesinden "mentorum" seç
  "Connection string" kopyala:

  Örnek format:
  postgresql://neondb_owner:SIFRE@ep-xxx-yyy.eu-central-1.aws.neon.tech/mentorum?sslmode=require

  !!! Bu string'i güvenli bir yere kaydet — bir daha gösterilmez.
  !!! Şifreyi unutursan: Connection Details → "Reset password"

### 2.3 Neon Branch Oluştur (Geliştirme Ortamı İçin)

Production veritabanını geliştirme sırasında kirletmemek için:

  Sol menü → Branches → "New Branch"
  Branch Name  : mentorum-dev
  Parent Branch: main
  Add Database : mentorum (seç)
  "Create Branch" tıkla

  Dev bağlantı string'i ayrıca kopyala:
  postgresql://...@ep-xxx-dev.eu-central-1.aws.neon.tech/mentorum?sslmode=require

Bu sayede:
  Local geliştirme → mentorum-dev branch'ine bağlanır
  Production       → main branch'e bağlanır
  main branch'teki production veri hiç risk almaz

### 2.4 Bağlantı String Formatını Anla

postgresql://KULLANICI:SIFRE@HOST/DB?sslmode=require

KULLANICI : neondb_owner
SIFRE     : Neon'un atadığı rastgele şifre
HOST      : ep-xxx-yyy.eu-central-1.aws.neon.tech
DB        : mentorum
sslmode   : require (zorunlu — şifresiz bağlantı reddedilir)

!!! ASP.NET Core için Npgsql connection string formatı farklıdır.
    Neon'un verdiği PostgreSQL URL'ini Npgsql formatına dönüştür:
    Host=ep-xxx.eu-central-1.aws.neon.tech;
    Database=mentorum;
    Username=neondb_owner;
    Password=SIFRE;
    SSL Mode=Require;
    Trust Server Certificate=true;

---

## 3. Fly.io — Yeni Uygulama (mentorum-api)

### 3.1 Ön Koşul — Fly CLI Kurulu mu?
  fly version
  Kurulu değilse: https://fly.io/docs/hands-on/install-flyctl/
  Giriş: fly auth login

### 3.2 Yeni Fly Uygulaması Oluştur

!!! Bu komutu mentorum backend klasöründen çalıştır.
!!! Mevcut dersmatris-api'yi ASLA etkilemez.

  fly apps create mentorum-api

  Çıktı:
  New app created: mentorum-api

### 3.3 fly.toml Oluştur

mentörüm/backend/ klasörüne fly.toml dosyası oluştur:

─────────────────────────────────────────────
app = "mentorum-api"
primary_region = "fra"

[build]
  dockerfile = "Dockerfile"

[env]
  ASPNETCORE_ENVIRONMENT = "Production"
  ASPNETCORE_URLS = "http://+:8080"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1

  [http_service.concurrency]
    type = "connections"
    hard_limit = 100
    soft_limit = 80

[[vm]]
  size = "shared-cpu-1x"
  memory = "256mb"
─────────────────────────────────────────────

Farklar (mevcut dersmatris-api'den):
  app = "mentorum-api"    ← FARKLI — kendi adı
  Geri kalan ayarlar birebir aynı olabilir (fra bölgesi, 256mb)

### 3.4 Fly Secrets Yükle (Environment Variables)

Fly uygulamasına secret'ları yükle.
Bu komutlar YALNIZCA mentorum-api uygulamasını etkiler:

  fly secrets set \
    DATABASE_URL="postgresql://neondb_owner:SIFRE@ep-xxx.neon.tech/mentorum?sslmode=require" \
    JWT_SECRET="buraya-en-az-32-karakter-rastgele-string-gir" \
    GOOGLE_CLIENT_ID="xxxx.apps.googleusercontent.com" \
    GOOGLE_CLIENT_SECRET="GOCSPX-xxxx" \
    R2_ACCESS_KEY_ID="xxxx" \
    R2_SECRET_ACCESS_KEY="xxxx" \
    R2_BUCKET_NAME="mentorum-uploads" \
    R2_ENDPOINT_URL="https://ACCOUNT_ID.r2.cloudflarestorage.com" \
    --app mentorum-api

  !!! --app mentorum-api parametresi zorunlu.
  !!! Bu olmadan yanlış uygulamaya secret yüklenebilir.

Secret'ları kontrol et:
  fly secrets list --app mentorum-api

### 3.5 Dockerfile Yaz

mentörüm/backend/Dockerfile:

─────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /app

COPY *.sln .
COPY MentorumApi/*.csproj ./MentorumApi/
RUN dotnet restore

COPY . .
RUN dotnet publish MentorumApi/MentorumApi.csproj \
    -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

EXPOSE 8080
ENTRYPOINT ["dotnet", "MentorumApi.dll"]
─────────────────────────────────────────────

### 3.6 İlk Deploy (Manuel)

Otomatik CI/CD kurulmadan önce ilk deploy manüel yapılır:

  cd mentörüm/backend
  fly deploy --app mentorum-api

  Fly şunları yapar:
  1. Docker image oluşturur (build)
  2. Fly registry'ye push eder
  3. Fra bölgesinde VM başlatır
  4. Health check yapar
  5. Başarılıysa eski VM'yi kapatır

  Deploy tamamlanınca:
  fly status --app mentorum-api
  fly logs --app mentorum-api

### 3.7 Health Check Endpoint'i Test Et

  curl https://mentorum-api.fly.dev/health
  Beklenen cevap: {"status":"ok","db":"connected","version":"1.0.0"}

  200 dönmüyorsa:
  fly logs --app mentorum-api   ← hata mesajını buradan oku

### 3.8 Mevcut Uygulamayı Kontrol Et (Zarar Görmedi mi?)

Deploy sonrası mevcut siteyi test et:
  curl https://app.dersmatris.com/health
  fly status --app dersmatris-api

---

## 4. Cloudflare R2 — Bucket ve API Key

### 4.1 R2 Bucket Oluştur

1. https://dash.cloudflare.com adresine gir
2. Sol menü → R2 Object Storage
3. "Create bucket" butonuna tıkla
4. Bucket Name: mentorum-uploads
   !!! Bucket adı küçük harf, tire kullanılabilir, harf/rakamla başlamalı
5. Location: Automatic (veya Europe — Neon ve Fly ile aynı bölgeye yakın)
6. "Create bucket" tıkla

### 4.2 Public Erişimi Kapat (Zorunlu)

Bucket oluşturulunca:
  Bucket detay sayfası → Settings → Public Access
  "Allow Access" KAPALI olmalı — varsayılan kapalı gelir, dokunma.

Public access açık olursa herkes dosyaları URL ile indirebilir → Güvenlik açığı.

### 4.3 R2 API Token Oluştur

R2 ana sayfası → "Manage R2 API tokens" → "Create API token"

  Token Name    : mentorum-api-token
  Permissions   : Object Read & Write (List + Get + Put + Delete)
  Bucket Scope  : Specific bucket → mentorum-uploads seç
                  !!! "All buckets" SEÇME — yalnızca mentorum bucket'ı

"Create API Token" tıkla.

Gösterilen değerleri kopyala (bir daha gösterilmez):
  Access Key ID    : rclone formatında "access key"
  Secret Access Key: uzun string
  Endpoint URL     : https://ACCOUNT_ID.r2.cloudflarestorage.com
  ACCOUNT_ID       : URL'deki sayısal ID

Bu değerleri Fly secrets ve GitHub secrets'a ekle (yukarıda yapıldı).

### 4.4 Presigned URL Ömrü Ayarı

Kod içinde presigned URL üretilirken:
  Ömür: 3600 saniye (1 saat)
  Method: GET (indirme için) veya PUT (yükleme için)

PUT presigned URL: Frontend bu URL'e doğrudan yükler (backend üzerinden geçmez)
  Avantaj: Backend'e yük binmez
  Dikkat: Frontend backend'den PUT presigned URL ister, backend ownership kontrolü
  yapar, sonra URL döndürür. Frontend R2'ye direkt PUT atar.

GET presigned URL: Dosyayı görüntülemek için
  Kullanım: <img src="{presignedUrl}"> veya PDF viewer

---

## 5. GitHub — Secrets ve Environment Kurulumu

### 5.1 Repository Secrets Ekle

GitHub → mentorum repo → Settings → Secrets and variables → Actions

"New repository secret" ile her birini tek tek ekle:

  İSİM                    DEĞER
  ─────────────────────── ──────────────────────────────────────────────
  NEON_DATABASE_URL        postgresql://...@neon.tech/mentorum?sslmode=require
  NEON_DATABASE_URL_DEV    postgresql://...@neon.tech/mentorum?sslmode=require (dev branch)
  JWT_SECRET               (en az 32 karakter — openssl rand -base64 32 ile üret)
  GOOGLE_CLIENT_ID         xxxx.apps.googleusercontent.com
  GOOGLE_CLIENT_SECRET     GOCSPX-xxxx
  R2_ACCESS_KEY_ID         Cloudflare R2 Access Key
  R2_SECRET_ACCESS_KEY     Cloudflare R2 Secret Key
  R2_BUCKET_NAME           mentorum-uploads
  R2_ENDPOINT_URL          https://ACCOUNT_ID.r2.cloudflarestorage.com
  FLY_API_TOKEN            Fly.io API token (aşağıda nasıl alınır)

### 5.2 Fly API Token Al

  fly auth token

  Çıktıdaki token'ı kopyala.
  GitHub secrets'a FLY_API_TOKEN adıyla ekle.

  !!! Bu token tüm Fly uygulamalarına erişim sağlar.
  !!! Daha kısıtlı bir token için:
      fly tokens create deploy -a mentorum-api
      Böylece yalnızca mentorum-api'ye deploy yetkisi olan token oluşur.

### 5.3 Production Environment Kur

GitHub → Settings → Environments → "New environment"
  Name: production

"Required reviewers" bölümüne:
  → GitHub kullanıcı adını ekle
  → "Save protection rules"

Artık production'a deploy için senin onayın gerekiyor.
GitHub Actions çalışınca deploy adımı "Waiting for approval" durumunda bekler.
E-posta bildirimi gelir → GitHub'da onayla → deploy başlar.

### 5.4 Staging Environment Kur (Opsiyonel ama önerilir)

"New environment" → Name: staging
Required reviewers: boş (otomatik geçsin)

Staging ortamı her PR merge'inde otomatik deploy olur.
Production ortamı yalnızca sen onayladığında deploy olur.

---

## 6. .gitignore ve .env Yapılandırması

### 6.1 .gitignore (Repo kökünde)

─────────────────────────────────────────────
# Environment dosyaları — ASLA commit edilmez
.env
.env.local
.env.development
.env.production
.env.staging
.env.*.local

# ASP.NET Core — hassas config
backend/appsettings.Development.json
backend/appsettings.Production.json
backend/appsettings.Staging.json

# Build çıktıları
**/bin/
**/obj/
**/publish/

# Node modules
node_modules/
frontend/dist/

# IDE
.vscode/settings.json
.idea/
*.user

# Fly.io geçici dosyalar
.fly/

# Log dosyaları
*.log
logs/
─────────────────────────────────────────────

### 6.2 .env Dosyası (Lokal Geliştirme — Repo'ya GİRMEZ)

mentörüm/backend/.env:
─────────────────────────────────────────────
DATABASE_URL=postgresql://neondb_owner:SIFRE@ep-xxx-dev.neon.tech/mentorum?sslmode=require
JWT_SECRET=lokal-gelistirme-icin-rastgele-32-karakter-string
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx
R2_ACCESS_KEY_ID=xxxx
R2_SECRET_ACCESS_KEY=xxxx
R2_BUCKET_NAME=mentorum-uploads
R2_ENDPOINT_URL=https://ACCOUNT_ID.r2.cloudflarestorage.com
─────────────────────────────────────────────

!!! Bu dosyayı .gitignore'a eklediğini doğrula.
!!! Takım çalışmasında .env.example dosyası oluştur (değerler olmadan, şema olarak):

mentörüm/backend/.env.example (repo'ya girer, güvenli):
─────────────────────────────────────────────
DATABASE_URL=
JWT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_ENDPOINT_URL=
─────────────────────────────────────────────

### 6.3 appsettings.json (Varsayılan — Repo'ya girer, hassas değer yok)

{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*"
}

Hassas değerler appsettings.json'a yazılmaz.
Tüm hassas değerler ortam değişkeninden okunur:
  Environment.GetEnvironmentVariable("DATABASE_URL")
  veya ASP.NET Core IConfiguration ile:
  builder.Configuration["DATABASE_URL"]

---

## 7. git-secrets Kurulumu

git-secrets; şifre, API key veya connection string içeren dosyaların
yanlışlıkla commit edilmesini engeller.

### 7.1 Kurulum

Windows (winget ile):
  winget install --id Amazon.GitSecrets

macOS:
  brew install git-secrets

Manuel (tüm platformlar):
  git clone https://github.com/awslabs/git-secrets.git
  cd git-secrets
  make install   # Linux/macOS
  # Windows: scripts/install.ps1

### 7.2 Repository'ye Uygula

mentörüm repo kökünde:
  git secrets --install
  git secrets --register-aws   # AWS/R2 key pattern'larını ekler

Ek pattern'lar ekle (Neon ve JWT için):
  git secrets --add "postgresql://[^:]+:[^@]+"      # Neon connection string
  git secrets --add "neondb_owner:[A-Za-z0-9_-]+"  # Neon şifre formatı

### 7.3 Test Et

Zararlı içerik olan bir dosya commit etmeyi dene:
  echo "DATABASE_URL=postgresql://user:password@host/db" > test_secret.txt
  git add test_secret.txt
  git commit -m "test"

  Beklenen hata:
  test_secret.txt: (41) DATABASE_URL=postgresql://user:password@host/db
  [ERROR] Matched one or more prohibited patterns
  Commit rejected.

  Dosyayı sil:
  Remove-Item test_secret.txt

### 7.4 Mevcut Repo'yu Tara (Geçmişe Bak)

  git secrets --scan-history

  Eşleşme bulunursa önce Neon şifreni değiştir, sonra git history'yi temizle:
  git filter-repo --path backend/.env --invert-paths

---

## 8. Lokal Geliştirme Ortamı

### 8.1 Backend Başlatma

  cd mentörüm/backend
  # .env dosyasını yükle (PowerShell):
  Get-Content .env | ForEach-Object {
    if ($_ -match "^([^#][^=]*)=(.*)$") {
      [Environment]::SetEnvironmentVariable($matches[1], $matches[2])
    }
  }
  dotnet run --project MentorumApi/MentorumApi.csproj

  API adresi: http://localhost:5000 veya https://localhost:7000

### 8.2 Frontend Başlatma

  cd mentörüm/frontend
  npm install
  npm run dev

  Uygulama: http://localhost:5173

### 8.3 .env Dosyalarını dotnet user-secrets ile Yönet (Alternatif)

dotnet user-secrets init --project MentorumApi
dotnet user-secrets set "DATABASE_URL" "postgresql://...dev.neon.tech/mentorum?sslmode=require"
dotnet user-secrets set "JWT_SECRET" "lokal-secret"

Bu değerler %APPDATA%\Microsoft\UserSecrets\ altında şifreli saklanır.
.env dosyasına gerek kalmaz, daha güvenli.

---

## 9. GitHub Actions CI/CD Pipeline

### 9.1 Pipeline Dosyası

.github/workflows/deploy.yml:

─────────────────────────────────────────────
name: Mentorum CI/CD

on:
  push:
    branches: [main]
    paths:
      - 'mentorum/backend/**'
      - 'mentorum/frontend/**'
  pull_request:
    branches: [main]

jobs:
  # ─────────────────────────────────────
  # 1. Backend Test
  # ─────────────────────────────────────
  backend-test:
    name: Backend Testleri
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: .NET kurulum
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '9.0.x'

      - name: Bağımlılıkları yükle
        run: dotnet restore
        working-directory: mentorum/backend

      - name: Build
        run: dotnet build --no-restore
        working-directory: mentorum/backend

      - name: Testleri çalıştır
        run: dotnet test --no-build
        working-directory: mentorum/backend
        env:
          DATABASE_URL: ${{ secrets.NEON_DATABASE_URL_DEV }}

  # ─────────────────────────────────────
  # 2. Frontend Test
  # ─────────────────────────────────────
  frontend-test:
    name: Frontend Testleri
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Node.js kurulum
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: mentorum/frontend/package-lock.json

      - name: Bağımlılıkları yükle
        run: npm ci
        working-directory: mentorum/frontend

      - name: Testleri çalıştır
        run: npm test -- --run
        working-directory: mentorum/frontend

  # ─────────────────────────────────────
  # 3. Production Deploy (ONAY GEREKTİRİR)
  # ─────────────────────────────────────
  deploy:
    name: Production Deploy
    needs: [backend-test, frontend-test]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment: production          # ← GitHub'da onay bekle
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Fly.io CLI kurulum
        uses: superfly/flyctl-actions/setup-flyctl@master

      - name: Backend Deploy (Fly.io)
        run: flyctl deploy --remote-only --app mentorum-api
        working-directory: mentorum/backend
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

  # ─────────────────────────────────────
  # 4. Sağlık Kontrolü
  # ─────────────────────────────────────
  health-check:
    name: Sağlık Kontrolü
    needs: [deploy]
    runs-on: ubuntu-latest
    steps:
      - name: 30 saniye bekle (deploy yerleşsin)
        run: sleep 30

      - name: API sağlık kontrolü
        run: |
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://mentorum-api.fly.dev/health)
          if [ "$STATUS" != "200" ]; then
            echo "HATA: /health endpoint $STATUS döndürdü!"
            exit 1
          fi
          echo "Sağlık kontrolü geçti: $STATUS"
─────────────────────────────────────────────

### 9.2 Neon Migration Pipeline Adımı (Backend Test'e Ekle)

backend-test job'ına migration adımı eklenir:

      - name: Veritabanı migration çalıştır
        run: dotnet run --project MentorumApi -- --migrate-only
        working-directory: mentorum/backend
        env:
          DATABASE_URL: ${{ secrets.NEON_DATABASE_URL_DEV }}

!!! Migration dev branch'te çalışır, production'da test edilmiş olarak ilerler.
!!! Production deploy öncesinde production migration için:

  deploy job'ına şu adım eklenir (deploy'dan ÖNCE):
      - name: Production Migration
        run: dotnet run --project MentorumApi -- --migrate-only
        working-directory: mentorum/backend
        env:
          DATABASE_URL: ${{ secrets.NEON_DATABASE_URL }}

---

## 10. Subdomain Yönlendirme (mentorum.dersmatris.com)

### 10.1 Hedef

  mentorum.dersmatris.com       → Frontend (statik hosting: Cloudflare Pages / Vercel)
  mentorum.dersmatris.com/api   → Backend (Fly.io: mentorum-api.fly.dev)

### 10.2 Cloudflare DNS Ayarları

Cloudflare dashboard → dersmatris.com → DNS → Records

Frontend için (Cloudflare Pages kullanılıyorsa otomatik eklenir):
  Tür    : CNAME
  İsim   : mentorum
  Hedef  : mentorum.pages.dev (Cloudflare Pages adresi)
  Proxy  : Açık (turuncu bulut) ← CDN + DDoS koruması

Backend için API proxy (Cloudflare Worker veya basit CNAME):
  Tür    : CNAME
  İsim   : mentorum-api
  Hedef  : mentorum-api.fly.dev
  Proxy  : Açık

Fly.io'ya özel domain bağlamak için:
  fly certs create mentorum-api.dersmatris.com --app mentorum-api
  Çıktıdaki CNAME veya A kaydını Cloudflare DNS'e ekle.

### 10.3 Frontend Statik Hosting Seçenekleri

Seçenek A — Cloudflare Pages (önerilen, ücretsiz):
  Cloudflare Dashboard → Pages → "Create a project"
  GitHub repo bağla → mentorum/frontend klasörünü seç
  Build command: npm run build
  Build output: dist
  Ortam değişkeni: VITE_API_URL=https://mentorum-api.dersmatris.com
  Her GitHub push'ta otomatik deploy.

Seçenek B — Vercel (alternatif, ücretsiz):
  vercel.com → Import Project → GitHub repo
  Framework: Vite
  Root Directory: mentorum/frontend
  Ortam değişkeni: VITE_API_URL=...

Seçenek C — Fly.io statik serve (tek platform):
  Frontend build çıktısı (dist/) backend tarafından serve edilir.
  Fly toml'a statik dosya ayarı eklenir.
  Avantaj: Tek platform. Dezavantaj: CDN yok.

### 10.4 Panel ve Platform Ayarları (app'den mentorum'a Geçiş)

Eğer mevcut `app.dersmatris.com` yerine `mentorum.dersmatris.com` kullanmaya karar verirseniz, internet sitelerindeki (Cloudflare, GitHub, vb.) panellerde yapmanız gereken tek seferlik işlemler şunlardır:

**1. Cloudflare Paneli (DNS Ayarları):**
- Cloudflare'a girip `dersmatris.com` domainini seçin.
- `DNS > Records` sekmesine gelin.
- **Frontend için:** `mentorum` adında yeni bir CNAME kaydı açıp, Frontend'in barındırıldığı yere (örneğin GitHub Pages kullanıyorsanız `<kullanici_adiniz>.github.io`) yönlendirin.
- **Backend için:** `api.mentorum` (veya `mentorum-api`) adında bir CNAME açıp Fly.io adresinize (örn. `mentorum-api.fly.dev`) yönlendirin.

**2. GitHub Paneli (Sadece GitHub Pages kullanılıyorsa):**
- Projenizin GitHub deposuna (Repository) gidin.
- `Settings > Pages` (sol menüden) sekmesine tıklayın.
- **Custom domain** (Özel alan adı) kısmında yazan `app.dersmatris.com` adresini `mentorum.dersmatris.com` olarak değiştirin ve kaydedin.
- (GitHub Actions ile deploy yapılıyorsa CI/CD `deploy.yml` dosyasında bir domain değişikliğine gerek yoktur).

**3. Fly.io Paneli / CLI (Backend için):**
- Sadece yeni domaininiz için SSL sertifikası tanımlamanız yeterlidir. Bilgisayarınızın terminalinde şu komutu çalıştırın:
  `flyctl certs add mentorum.dersmatris.com --app mentorum-api` (Eğer api ayrı domaindeyse `api.mentorum.dersmatris.com` yapın).

**4. Neon Paneli (Veritabanı):**
- **Hiçbir değişiklik yapmanıza gerek yoktur.** Neon sadece bir Connection String verir ve domain adresinin ne olduğuyla ilgilenmez.

*(Not: Kod tarafında `MentorumApi/Program.cs` içindeki CORS ayarlarını ve `Frontend/.env.production` dosyasındaki `VITE_API_URL` ayarlarını `mentorum.dersmatris.com` olacak şekilde güncellemeyi unutmayın).*

---

## 11. Kurulum Sonrası Kontrol Listesi

Her adımı tamamladıkça işaretle:

NEON
  [ ] mentorum database oluşturuldu
  [ ] mentorum-dev branch oluşturuldu
  [ ] Production connection string kopyalandı (güvenli yerde saklandı)
  [ ] Dev connection string kopyalandı

FLY.IO
  [ ] mentorum-api uygulaması oluşturuldu (fly apps create mentorum-api)
  [ ] fly.toml oluşturuldu (app = "mentorum-api")
  [ ] Fly secrets yüklendi (fly secrets set ... --app mentorum-api)
  [ ] Fly secrets listesi kontrol edildi (fly secrets list --app mentorum-api)
  [ ] Dockerfile oluşturuldu
  [ ] İlk deploy başarılı (fly deploy --app mentorum-api)
  [ ] /health endpoint 200 dönüyor
  [ ] Mevcut dersmatris-api hâlâ çalışıyor (fly status --app dersmatris-api)

CLOUDFLARE R2
  [ ] mentorum-uploads bucket oluşturuldu
  [ ] Public access kapalı
  [ ] API token oluşturuldu (yalnızca mentorum-uploads için)
  [ ] Access Key ID ve Secret kopyalandı

GITHUB
  [ ] Tüm secrets eklendi (9 adet)
  [ ] FLY_API_TOKEN eklendi
  [ ] production Environment oluşturuldu
  [ ] Required reviewer eklendi
  [ ] staging Environment oluşturuldu (opsiyonel)

GİT GÜVENLİK
  [ ] .gitignore oluşturuldu ve hassas dosyalar eklendi
  [ ] .env.example oluşturuldu (değerler olmadan)
  [ ] git-secrets kuruldu
  [ ] git secrets --install çalıştırıldı
  [ ] git secrets --scan-history çalıştırıldı (temiz çıktı)

CI/CD
  [ ] .github/workflows/deploy.yml oluşturuldu
  [ ] İlk CI çalışması başarılı (GitHub Actions sekmesinden kontrol)
  [ ] Production deploy onay akışı test edildi

DNS
  [ ] mentorum.dersmatris.com Cloudflare DNS'e eklendi
  [ ] mentorum-api.dersmatris.com Cloudflare DNS'e eklendi
  [ ] SSL sertifikası aktif (Cloudflare otomatik yapar)

SON KONTROL
  [ ] https://mentorum.dersmatris.com açılıyor
  [ ] https://mentorum.dersmatris.com/api/health → 200 OK
  [ ] https://app.dersmatris.com hâlâ çalışıyor (mevcut site zarar görmemiş)
