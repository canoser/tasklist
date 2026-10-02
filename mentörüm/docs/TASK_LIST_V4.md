# 🏁 Mentörüm — V4 Master Plan (Proje Tamamlama Yol Haritası)
> **Tarih:** 2 Ekim 2026 (Güncelleme: 2 Ekim 2026, 21:55)
> **Durum:** MVP V3 kodlaması yazıldı ancak üç ajan analizi (DeepSeek, Gemini, Claude) 5 kritik bug tespit etti.
> ⚠️ "Yazıldı" ≠ "Çalışıyor" — canlıya geçmeden önce Aşama 17.5 (Kritik Bug Fix) zorunludur.
> Görevler sıralıdır — her aşama bir öncekinin tamamlanmış olduğunu varsayar.

---

## Mevcut Durum Özeti

| Katman | Durum | Notlar |
|---|---|---|
| Backend API | ⚠️ Kırık | 5 kritik bug var — Aşama 17.5'te düzeltilecek |
| Frontend (Koç) | ⚠️ Kırık | API double .data — her liste boş görünür |
| Frontend (Öğrenci) | ⚠️ Kırık | /complete endpoint erişilemiyor (Coach-only group) |
| Frontend (Veli) | ⚠️ Kırık | ParentEndpoints: yanlış claim + yanlış kolon adı |
| Migration | ⚠️ Çakışıyor | 001+002 aynı kolonları tanımlıyor — çalıştırılamaz |
| Mobil Uyumluluk | ✅ Düzeltildi | 100dvh uygulandı (Aşama 17) |
| Altyapı (Fly, Neon) | Kurulmadı | Canlı sunucu yok |
| CI/CD | Kurulmadı | GitHub Actions aktif değil |
| Test | Yok | Mock-tabanlı — gerçek PostgreSQL entegrasyon testi yok |
| Capacitor (Native) | Faz 2 | Android/iOS paketleme henüz yok |

---

## ~~Aşama 17: Kritik CSS Düzeltmesi (100vh → 100dvh)~~ ✅ TAMAMLANDI

> 2 Ekim 2026 — StudentLayout, CoachLayout, ParentLayout ve globals.css güncellendi. Commit: `cccb193`

- [x] StudentLayout.module.css — 100dvh/100dvw
- [x] CoachLayout.module.css — 100dvh/100dvw
- [x] ParentLayout.module.css — 100dvh/100dvw
- [x] globals.css — 100vh yasak kuralı eklendi

---

## Aşama 17.5: Kritik Bug Fix (Canlıya Geçmeden Zorunlu)

> ⚠️ Bu aşama DeepSeek V4 Pro statik analizi + Claude/Gemini doğrulamasıyla eklendi (2 Ekim 2026, 21:52)
> Öncelik sırası: Şema → Backend → Frontend → Entegrasyon Testi
> **Bu aşama tamamlanmadan Aşama 19'a (altyapı) geçmek yasaktır.**

### 17.5.1 Migration Şemasını Konsolide Et (KRİTİK 3)
- [ ] `001_InitialSchema.sql` ile `002_Phase10_11.sql` karşılaştır — çakışan kolonları tespit et:
  - `completion_percentage` → 001'de zaten var, 002'de tekrar ekleniyor
  - `curriculum_topic_id` → 001 `homework_templates`'te zaten var
  - `curriculum_subjects` vs `subjects` tablosu — hangisi canonical? Birini sil
- [ ] 002'yi düzelt: zaten var olan `ALTER TABLE` satırlarını çıkar, çakışan tablo tanımlarını kaldır
- [ ] Düzeltilmiş migration'ları sıfırdan boş bir PostgreSQL DB'ye çalıştır → hata yoksa onaylanmış şema

### 17.5.2 Backend Endpoint Düzeltmeleri (KRİTİK 2, 4, 5 + YÜKSEK 6)
- [ ] **ParentEndpoints.cs** — `ctx.User.FindFirst("id")` → `ctx.User.FindFirst(ClaimTypes.NameIdentifier)`
- [ ] **ParentEndpoints.cs** — `s.area` → `s.track` (şema adıyla eşleştir)
- [ ] **HomeworkEndpoints.cs** — `/assignments/{id}/complete` endpoint'ini Coach-only gruptan çıkar, Student rolünü doğru yakala
- [ ] **NotificationRepository.cs** — `action_url AS ActionUrl` ya şemaya kolon ekle ya sorgudan çıkar
- [ ] **AuthEndpoints.cs satır 201-209** — Google OAuth ilk kaydını `BeginTransaction` ile sar

### 17.5.3 Frontend API Katmanını Düzelt (KRİTİK 1)
- [ ] Strateji kararı ver (tek seferlik, tutarlı): 
  - **Seçenek A:** `apiClient.js` interceptor'ı `response` döndürsün (`.data` açmadan); tüm hook'lar `response.data` okusun
  - **Seçenek B:** interceptor `response.data` döndürmeye devam etsin; tüm hook'lardaki `response.data` → `response` olarak güncellenir
- [ ] Seçilen stratejiyi tüm `coachApi.js`, `studentApi.js`, `parentApi.js` hook'larına uygula
- [ ] `useStudents`, `useReportsOverview`, `useCalendarEvents`, `useStudent`, `useStudentNotes`, `useStudentHomework`, `useParentChildren`, `useParentChildDetails`, `useParentChildHomework` — hepsini doğrula

### 17.5.4 Gerçek PostgreSQL Entegrasyon Testi (KRİTİK 7)
- [ ] `Testcontainers.PostgreSql` NuGet paketi ekle
- [ ] `WebApplicationFactory` ile in-process test sunucusu kur — repository mock'lama yok
- [ ] Test setup'ında migration'ları gerçekten çalıştır (17.5.1'in doğrulanması da burada olur)
- [ ] Minimum test senaryoları:
  - Migration başarıyla çalışıyor mu?
  - Coach A, Coach B'nin öğrencisini göremez mi? (gerçek IDOR — SQLBuilder filtresi)
  - Öğrenci `/complete` ile kendi ödevini tamamlayabiliyor mu?
  - Veli yalnızca kendi çocuğunun verisini görüyor mu?

---

## Aşama 18: Capacitor Hazırlık (Native Mobil Temeli)

**Neden:** Gelecekte Android/iOS uygulaması için doğru temeli şimdi atmak, sonradan büyük refactor yapmaktan kurtarır.

- [ ] mentörüm/Frontend/capacitor.config.json oluştur (appId: com.dersmatris.mentorum, webDir: dist, androidScheme: https)
- [ ] src/utils/platform.js oluştur — localStorage ve navigasyon Capacitor wrapper'ı üzerinden yapılacak
- [ ] package.json'a Capacitor bağımlılıklarını not düş (kurma — Aşama 25'te yapılacak)
- [ ] PORTABILITY.md güncelle — Capacitor hazırlığı tamamlandı

---

## Aşama 19: Backend Altyapısı (Neon + Fly.io)

**Önkoşul:** ALTYAPI_KURULUM.md tam kılavuz olarak hazır, sırayla uygulanacak.

### 19.1 Neon PostgreSQL
- [ ] Neon Console — mevcut proje içinde mentorum adlı yeni database oluştur
- [ ] mentorum-dev branch oluştur (yerel geliştirme için)
- [ ] Production ve Dev connection string'leri güvenli yerde sakla
- [ ] Konsolide edilmiş migration (Aşama 17.5.1'den çıkan düzeltilmiş SQL) — dev branch'te çalıştır ve doğrula

### 19.2 Fly.io Uygulaması
- [ ] fly apps create mentorum-api
- [ ] mentörüm/Backend/fly.toml oluştur (ALTYAPI_KURULUM.md §3.3 şablonu)
- [ ] mentörüm/Backend/Dockerfile oluştur (ALTYAPI_KURULUM.md §3.5 şablonu)
- [ ] fly secrets set ... --app mentorum-api ile ortam değişkenlerini yükle
- [ ] fly deploy --app mentorum-api — ilk manuel deploy
- [ ] curl https://mentorum-api.fly.dev/health — 200 OK doğrula
- [ ] fly status --app dersmatris-api — mevcut site zarar görmedi mi?

### 19.3 Backend Kodu — Production Hazırlık
- [ ] Program.cs — CORS izin listesine mentorum.dersmatris.com ekle
- [ ] Program.cs — /health endpoint ekle (DB bağlantı kontrolü, Fly.io için zorunlu)
- [ ] Program.cs — Başlangıçta SQL migration dosyalarını otomatik çalıştır

---

## Aşama 20: Frontend Altyapısı (Cloudflare Pages)

- [ ] mentörüm/Frontend/.env.production oluştur: VITE_API_URL=https://mentorum-api.dersmatris.com/api/v1
- [ ] apiClient.js — import.meta.env.VITE_API_URL kullanıldığını doğrula (zaten var)
- [ ] Cloudflare Dashboard → Pages → Create project:
  - GitHub repo: canoser/tasklist
  - Root Directory: mentörüm/Frontend
  - Build command: npm run build
  - Output directory: dist
  - Ortam değişkeni: VITE_API_URL ayarla
- [ ] Cloudflare DNS: mentorum CNAME → Pages (Frontend), mentorum-api CNAME → fly.dev (Backend)
- [ ] Fly SSL: flyctl certs add mentorum-api.dersmatris.com --app mentorum-api

---

## Aşama 21: GitHub Actions CI/CD Pipeline

**Neden:** Mevcut deploy.yml WebApp için yazılmış. mentörüm için path-filtered ayrı pipeline gerekiyor.

- [ ] .github/workflows/mentorum-deploy.yml oluştur:
  - Trigger: mentörüm/Backend/** veya mentörüm/Frontend/** değişikliklerinde
  - Job 1 (backend-test): dotnet build + dotnet test (Neon dev DB)
  - Job 2 (frontend-test): npm ci + npm test -- --run
  - Job 3 (deploy): Testler + production environment onayı → flyctl deploy --app mentorum-api
  - Job 4 (health-check): Deploy sonrası /health kontrolü
- [ ] GitHub Secrets ekle (10 adet — ALTYAPI_KURULUM.md §5.1 listesi)
- [ ] GitHub → Settings → Environments → production oluştur, Required reviewer ekle
- [ ] İlk CI çalışmasını doğrula

---

## Aşama 22: Veritabanı Seed Verisi

**Neden:** Müfredat konuları olmadan koç ödev atamasında konu seçemez — zorunlu.

- [ ] Backend/MentorumApi/Data/Seeds/Curriculum2026.sql oluştur:
  - 8. Sınıf (LGS): Matematik, Türkçe, Fen, İnkılap, İngilizce
  - 12. Sınıf (TYT/AYT): Matematik, Türk Dili, Fizik, Kimya, Biyoloji, Tarih
- [ ] Subjects tablosu seed: Sistem dersleri başlangıçta yüklenecek
- [ ] Production Neon DB'de seed script'leri tek seferlik elle çalıştır

---

## Aşama 23: Smoke Test (Canlı Ortam Doğrulama)

### 23.1 Auth Akışları
- [ ] POST /auth/register — Koç kaydı → JWT alındı mı?
- [ ] POST /auth/login → Dashboard açılıyor mu?
- [ ] Token refresh çalışıyor mu?
- [ ] Google OAuth callback URL doğru mu?

### 23.2 Kritik İş Akışları
- [ ] Öğrenci ekle → Veli davet maili gidiyor mu?
- [ ] Ödev ata → Öğrenci panelinde görünüyor mu?
- [ ] Tamamladım → Koça bildirim gidiyor mu?
- [ ] Veli davet linki → Aktivasyon → Panel açılıyor mu?
- [ ] Takvim → Ödevler doğru tarihlerde görünüyor mu?

### 23.3 Güvenlik (IDOR) Kontrolleri
- [ ] Öğrenci token'ı → başka öğrencinin ödevi → 403 mü?
- [ ] Veli token'ı → koç notları → 403 mü?
- [ ] Koç token'ı → başka koçun öğrencisi → 404 mü?

### 23.4 Bildirim ve Cron
- [ ] Fly logs'ta OverdueHomeworkJob log'u görünüyor mu?
- [ ] due_date geçmiş ödev → cron sonrası OVERDUE oluyor mu?

---

## Aşama 24: E-posta Servisi

- [ ] SMTP provider seç: Resend (önerilen — ücretsiz 100/gün) veya SendGrid
- [ ] EmailService.cs tamamla — SMTP bağlantısı kur, secret'ları ekle
- [ ] Davet maili HTML şablonu oluştur
- [ ] Haftalık özet maili — Cron'a her Pazar 09:00 görevi ekle
- [ ] Gerçek adrese test maili gönder ve linki doğrula

---

## Aşama 25: Android Uygulaması (Capacitor)

**Önkoşul:** Aşama 17 ve 18 tamamlanmış olmalı.

- [ ] npm install @capacitor/cli @capacitor/core @capacitor/android
- [ ] npx cap add android
- [ ] platform.js'te native URL kontrolü — Capacitor ortamında baseURL prod sunucu olmalı
- [ ] npm run build && npx cap sync android && npx cap open android
- [ ] Android Studio emülatöründe giriş, ödev listesi, takvim test et
- [ ] S24 ve Pixel 8'de safe area kontrol et
- [ ] Google Play: App ID, Signing Key, build.gradle ayarları

---

## Aşama 26: iOS Uygulaması (Faz 3 — Mac Gerektirir)

- [ ] Mac ortamında npx cap add ios
- [ ] Xcode'da build + Simulator testi
- [ ] Apple Developer Account gerekli

---

## Güvenlik Kontrol Listesi (Canlıya Almadan Önce Zorunlu)

| Kontrol | Durum |
|---|---|
| .env dosyası .gitignore'da | Var |
| git-secrets kurulu | Kurulacak (ALTYAPI_KURULUM.md §7) |
| Rate limiting aktif | Kod var, test edilmedi |
| JWT access token süresi 15dk | Kodda var |
| httpOnly cookie refresh token | Kodda var |
| Tüm IDOR kontrolleri Backend'de | BaseRepository var |
| Coach Notes ayrı endpoint'te | Var |
| Davet token UUID + 48h + tek kullanım | Var |
| HTTPS zorunlu (Fly force_https) | fly.toml'a eklenecek |
| SQL Injection (Dapper parametrik) | Var |
| XSS (React escape) | Var |

---

## Sıradaki Görev

**Aşama 17** ile başla: 3 CSS dosyasında 100vh → 100dvh.
Sonrasında **Aşama 19** (Neon + Fly.io) ile canlıya geçiş.
