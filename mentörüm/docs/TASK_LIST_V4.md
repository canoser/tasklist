# 🏁 Mentörüm — V4 Master Plan (Proje Tamamlama Yol Haritası)
> **Tarih:** 2 Ekim 2026 (Güncelleme: 2 Ekim 2026, 21:55)
> **Durum:** MVP V3 kodlaması yazıldı ancak üç ajan analizi (DeepSeek, Gemini, Claude) 5 kritik + 2 yüksek (toplam 12) hata tespit etti.
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
- [x] `001_InitialSchema.sql` ile `002_Phase10_11.sql` karşılaştır — çakışan kolonları tespit et:
  - `completion_percentage` → 001'de zaten var, 002'de tekrar ekleniyor
  - `curriculum_topic_id` → 001 `homework_templates`'te zaten var
  - `curriculum_subjects` vs `subjects` tablosu — hangisi canonical? Birini sil
- [x] 002'yi düzelt: zaten var olan `ALTER TABLE` satırlarını çıkar, çakışan tablo tanımlarını kaldır
- [x] Düzeltilmiş migration'ları sıfırdan boş bir PostgreSQL DB'ye çalıştır → hata yoksa onaylanmış şema

**💻 Nasıl kodlanacak (canonical karar dahil):**
- Canonical şema = `001_InitialSchema.sql`. `002` yalnızca seed dosyasına indirgenir.
- `completion_percentage`: 001'de `SMALLINT NULL` (CHECK 0-100) → **KALIR**; 002'deki `ALTER TABLE ... ADD COLUMN completion_percentage INT NOT NULL DEFAULT 0` **SİL** (tip çakışması: INT NOT NULL vs SMALLINT NULL).
- `curriculum_topics`: 001 ile 002'de **İKİ FARKLI şema** (001: `unit_number/unit_name/topic_number/topic_name/sort_order`; 002: `name/parent_topic_id/order_index`). **001 KALIR**; 002'deki `CREATE TABLE curriculum_topics` **SİL**.
- `curriculum_subjects` (002) vs `subjects` (001): 002'deki `CREATE TABLE curriculum_subjects` **SİL**; her yerde `subjects` kullan.
- `homework_templates`: 001'de `subject_id` + `curriculum_topic_id` zaten var → 002'deki `ALTER TABLE homework_templates ADD COLUMN curriculum_subject_id, curriculum_topic_id` **SİL**.
- 002'nin seed INSERT'lerini 001 sütunlarına göre YENİDEN yaz (`subjects` ve `curriculum_topics` için).
- Doğrulama: boş PostgreSQL'de `001` → `002` sırayla çalıştır; hata yoksa onay.

### 17.5.2 Backend Endpoint Düzeltmeleri (KRİTİK 2, 4, 5 + YÜKSEK 6)
- [x] **ParentEndpoints.cs** — `ctx.User.FindFirst("id")` → `ctx.User.FindFirst(ClaimTypes.NameIdentifier)`
- [x] **ParentEndpoints.cs** — `s.area` → `s.track` (şema adıyla eşleştir)
- [x] **HomeworkEndpoints.cs** — `/assignments/{id}/complete` endpoint'ini Coach-only gruptan çıkar, Student rolünü doğru yakala
- [x] **NotificationRepository.cs** — `action_url AS ActionUrl` ya şemaya kolon ekle ya sorgudan çıkar
- [x] **AuthEndpoints.cs satır 201-209** — Google OAuth ilk kaydını `BeginTransaction` ile sar

**💻 Nasıl kodlanacak:**
- **ParentEndpoints claim:** `ctx.User.FindFirst("id")` → `ctx.User.FindFirst(ClaimTypes.NameIdentifier)` (satır 16 VE 35). `using System.Security.Claims;` ekle. JWT'de `"id"` claim'i YOK; `sub` → `NameIdentifier` eşlenir.
- **ParentEndpoints kolon:** `s.area` → `s.track` (satır 23 VE 49). `students.track` CHECK'i: `('SAY','EA','SOZ','ORTAOKUL')`.
- **HomeworkEndpoints `/complete`:** endpoint'i Coach-only `group` (satır 12)'den ÇIKAR; ayrı `var completionGroup = app.MapGroup("/api/v1/homework").RequireAuthorization();` grubuna taşı. Mevcut `whereClause` (role göre `coach_id`/`student_id`) sahipliği zaten koruyor — değiştirme.
- **NotificationRepository `action_url`:** kolonu TAMAMEN kaldır (önerilen) → `SELECT`'ten `action_url AS ActionUrl` satırını sil; `NotificationDto.ActionUrl` property'sini sil. (`notifications` tablosunda `action_url` yok, kimse set etmiyor.)
- **AuthEndpoints Google transaction:** satır 201-209'daki users+coaches INSERT'lerini `using var tx = conn.BeginTransaction(); try { INSERT users (tx); INSERT coaches (tx); tx.Commit(); } catch { tx.Rollback(); throw; }` içine al. Refresh-token INSERT + cookie commit SONRASI kalsın.

### 17.5.3 Frontend API Katmanını Düzelt (KRİTİK 1)
- [x] Strateji kararı ver (tek seferlik, tutarlı): 
  - **Seçenek A:** `apiClient.js` interceptor'ı `response` döndürsün (`.data` açmadan); tüm hook'lar `response.data` okusun
  - **Seçenek B:** interceptor `response.data` döndürmeye devam etsin; tüm hook'lardaki `response.data` → `response` olarak güncellenir
- [x] Seçilen stratejiyi tüm `coachApi.js`, `studentApi.js`, `parentApi.js` hook'larına uygula
- [x] `useStudents`, `useReportsOverview`, `useCalendarEvents`, `useStudent`, `useStudentNotes`, `useStudentHomework`, `useParentChildren`, `useParentChildDetails`, `useParentChildHomework` — hepsini doğrula

**💻 Nasıl kodlanacak (Karar: Seçenek B — minimal + tutarlı):**
- `apiClient.js` interceptor'ı DEĞİŞME (`response.data` = body döndürmeye devam).
- `coachApi.js`, `studentApi.js`, `parentApi.js` içindeki TÜM `response.data` → `response`: `return response.data || []` → `return response || []`; `return response.data || null` → `return response || null`; `return response.data` → `return response`.
- `coachApi.js` satır 9'daki yanlış yorumu SİL: `// Standart API Response formatı: { success: true, data: [...] }`.
- `App.jsx` satır 48 `const data = response.data || response;` — zaten güvenli, DOKUNMA.
- `useCompleteHomework` zaten `return response` (body) döndürüyor — doğru.
- Doğrula: `useStudents`, `useReportsOverview`, `useCalendarEvents`, `useStudent`, `useStudentNotes`, `useStudentHomework`, `useParentChildren`, `useParentChildDetails`, `useParentChildHomework`, `useUpdateCoachNotes`, `useAssignHomework`, `useAddExamResult`.
- Test: `npm run build` + tarayıcıda listeler DOLU gelmeli.

### 17.5.4 Gerçek PostgreSQL Entegrasyon Testi (KRİTİK 7)
- [x] `Testcontainers.PostgreSql` NuGet paketi ekle
- [x] `WebApplicationFactory` ile in-process test sunucusu kur — repository mock'lama yok
- [x] Test setup'ında migration'ları gerçekten çalıştır (17.5.1'in doğrulanması da burada olur)
- [x] Minimum test senaryoları:
  - Migration başarıyla çalışıyor mu?
  - Coach A, Coach B'nin öğrencisini göremez mi? (gerçek IDOR — SQLBuilder filtresi)
  - Öğrenci `/complete` ile kendi ödevini tamamlayabiliyor mu?
  - Veli yalnızca kendi çocuğunun verisini görüyor mu?

**💻 Nasıl kodlanacak:**
- `MentorumApi.Tests` csproj'una ekle: `Testcontainers.PostgreSql`, `Testcontainers`, `Microsoft.AspNetCore.Mvc.Testing`, `xunit`.
- Fixture: `new PostgreSqlBuilder().Build()` → container başlat; `connectionString` al; `Environment.SetEnvironmentVariable("DATABASE_URL", connectionString)` (çünkü `DbConnectionFactory.CreateConnection()` bunu okuyor).
- `WebApplicationFactory<Program>` kullan; repository'leri MOCKLAMA. Sadece `DbConnectionFactory` container'a bağlı olsun.
- Setup'ta `001` + düzeltilmiş `002` migration'larını sırayla çalıştır (17.5.1 doğrulaması da burada).
- Mevcut `CrossTenantSecurityTests.cs`'i (SQLite + mock idi) SİL/değiştir.
- Not: Testcontainers DOCKER ister (CI'da mevcut). `action_url` gibi kaldırılan kolonlara dokunan sorgular bu testte patlar → 17.5.2 ile birlikte yap.

---

## Aşama 18: Capacitor Hazırlık (Native Mobil Temeli) ✅ TAMAMLANDI

> ⚠️ Aşama 17.5 (bug fix) tamamlanmadan bu aşamaya da geçme; çekirdek çalışmadan native hazırlığı zaman kaybıdır.

**Neden:** Gelecekte Android/iOS uygulaması için doğru temeli şimdi atmak, sonradan büyük refactor yapmaktan kurtarır.

- [x] mentörüm/Frontend/capacitor.config.json oluştur (appId: com.dersmatris.mentorum, webDir: dist, androidScheme: https)
- [x] src/utils/platform.js oluştur — localStorage ve navigasyon Capacitor wrapper'ı üzerinden yapılacak
- [x] package.json'a Capacitor bağımlılıklarını not düş (kurma — Aşama 25'te yapılacak)
- [x] PORTABILITY.md oluştur / güncelle — Capacitor hazırlığı tamamlandı

---

## Aşama 19: Backend Altyapısı (Neon + Fly.io)

**Önkoşul:** ALTYAPI_KURULUM.md tam kılavuz olarak hazır, sırayla uygulanacak.

### 19.1 Neon PostgreSQL
- [ ] Neon Console — **YENİ (ayrı) proje** oluştur: `mentorum` (mevcut dersmatris projesine DOKUNMA)
- [ ] mentorum projesi İÇİNDE `mentorum-dev` branch oluştur (yerel geliştirme için)
- [ ] Production ve Dev connection string'leri güvenli yerde sakla
- [ ] Konsolide edilmiş migration (Aşama 17.5.1'den çıkan düzeltilmiş SQL) — dev branch'te çalıştır ve doğrula

### 19.2 Fly.io Uygulaması
- [ ] fly apps create mentorum-api
- [x] mentörüm/Backend/fly.toml oluştur (ALTYAPI_KURULUM.md §3.3 şablonu)
- [x] mentörüm/Backend/Dockerfile oluştur (ALTYAPI_KURULUM.md §3.5 şablonu)
- [ ] fly secrets set ... --app mentorum-api ile ortam değişkenlerini yükle
- [ ] fly deploy --app mentorum-api — ilk manuel deploy
- [ ] fly ssh console -C "dotnet MentorumApi.dll --migrate-only" — Veritabanı şemasını (001 ve 002) oluştur
- [ ] curl https://mentorum-api.fly.dev/health — 200 OK doğrula
- [ ] fly status --app dersmatris-api — mevcut site zarar görmedi mi?

### 19.3 Backend Kodu — Production Hazırlık
- [x] Program.cs — CORS izin listesine mentorum.dersmatris.com ekle (ZATEN VAR, Program.cs satır 36 — sadece doğrula)
- [x] Program.cs — /health endpoint ekle (DB bağlantı kontrolü, Fly.io için zorunlu)
- [x] Program.cs — Migration `--migrate-only` bayrağıyla MANUEL çalışır (auto-startup yok; 19.2'de `fly ssh console` ile tetiklenir)

---

## Aşama 20: Frontend Altyapısı (Cloudflare Pages)

- [x] mentörüm/Frontend/.env.production oluştur: VITE_API_URL=https://mentorum-api.dersmatris.com/api/v1
- [x] apiClient.js — import.meta.env.VITE_API_URL kullanıldığını doğrula (zaten var)
- [ ] Cloudflare Dashboard → Pages → Create project:
  - GitHub repo: (Gerçek repo adınızı seçin, örn: canoser/tasklist)
  - Root Directory: mentörüm/Frontend
  - Build command: npm run build
  - Output directory: dist
  - Ortam değişkeni: VITE_API_URL=https://mentorum-api.dersmatris.com/api/v1
  - Ortam değişkeni: NODE_VERSION=20
- [ ] Cloudflare DNS: mentorum CNAME → Pages (Frontend), mentorum-api CNAME → fly.dev (Backend)
- [ ] Fly SSL: flyctl certs add mentorum-api.dersmatris.com --app mentorum-api

---

## Aşama 21: GitHub Actions CI/CD Pipeline

**Neden:** Mevcut deploy.yml WebApp için yazılmış. mentörüm için path-filtered ayrı pipeline gerekiyor.

- [ ] .github/workflows/mentorum-deploy.yml oluştur:
  - Trigger: mentörüm/Backend/** veya mentörüm/Frontend/** değişikliklerinde
  - Job 1 (backend-test): dotnet build + dotnet test (Testcontainers PostgreSQL — gerçek Neon dev DB'ye YAZMA)
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

> ⚠️ **Sıralama düzeltmesi:** "Davet maili" (SMTP + davet şablonu = ilk 3 madde) Aşama 23.2'deki "Veli davet maili gidiyor mu?" testinin ÖNKOŞULUDUR. Bu ilk 3 maddeyi Aşama 23'ten ÖNCE yap; sadece "haftalık özet maili" (cron) 23'ten sonraya kalabilir.

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

| Kontrol                               | Durum                             |
| ---------------------------------------| -----------------------------------|
| .env dosyası .gitignore'da            | Var                               |
| git-secrets kurulu                    | Kurulacak (ALTYAPI_KURULUM.md §7) |
| Rate limiting aktif                   | Kod var, test edilmedi            |
| JWT access token süresi 15dk          | Kodda var                         |
| httpOnly cookie refresh token         | Kodda var                         |
| Tüm IDOR kontrolleri Backend'de       | BaseRepository var                |
| Coach Notes ayrı endpoint'te          | Var                               |
| Davet token UUID + 48h + tek kullanım | Var                               |
| HTTPS zorunlu (Fly force_https)       | fly.toml'a eklenecek              |
| SQL Injection (Dapper parametrik)     | Var                               |
| XSS (React escape)                    | Var                               |

---

## Sıradaki Görev

**Aşama 18 (Capacitor Hazırlık) tamamlandı.**
Sonraki adım: **Aşama 19 (Backend Altyapısı - Neon + Fly.io)**. Altyapı kurulumuna başlanabilir.
