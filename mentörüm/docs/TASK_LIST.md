# Mentörüm — Kodlama ve Uygulama Görev Listesi (Task List)

Bu liste, `URUN_PLANI.md`, `KOD_PLANI.md` ve `AJAN_KONUSMALARI_HATALAR_TESPITLER.md` belgelerinde alınan tüm mimari kararlara tam uyumlu olarak, sıfırdan canlıya kadar yapılacak kodlama adımlarını içerir.

## Aşama 1: Proje Temeli ve Altyapı
- `[x]` (24.09.2026) Git repository başlatılması ve kök dizine detaylı `.gitignore` eklenmesi (Backend, Frontend, Env dosyaları için)
- `[ ]` `ALTYAPI_KURULUM.md`'ye göre GitHub ortamlarının, secret'ların ve `git-secrets` konfigürasyonunun yapıldığının kullanıcıdan teyit edilmesi.
- `[x]` (24.09.2026) `Backend` ve `Frontend` ana klasörlerinin oluşturulması.

## Aşama 2: Backend — Veritabanı ve Temel Mimari
- `[x]` (24.09.2026) ASP.NET Core 9 Web API (`MentorumApi`) projesinin oluşturulması.
- `[x]` (24.09.2026) Bağımlılıkların (Dapper, Npgsql, Serilog, JWT, FluentValidation vb.) yüklenmesi.
- `[x]` (24.09.2026) `appsettings.json` ve `.env` üzerinden yapılandırma (Configuration) sisteminin kurulması.
- `[x]` (24.09.2026) Serilog loglama altyapısının console ve dosya bazlı kurulması.
- `[x]` (24.09.2026) **Veritabanı Katmanı (Kritik):** PostgreSQL bağlantı altyapısının (NpgsqlConnection) kurulması.
- `[x]` (24.09.2026) **IDOR Koruması (Kritik):** `Dapper.SqlBuilder` kullanılarak, zorunlu tenant_id (CoachId) filtresi enjekte eden `BaseRepository<T>` sınıfının yazılması.
- `[x]` (24.09.2026) Veritabanı tabloları için PostgreSQL `CREATE TABLE` (up/down migration) scriptlerinin yazılması (ExamScores ilişkisel tablosu ve Homework Snapshot'ları dahil).

## Aşama 3: Backend — Güvenlik ve Kimlik Doğrulama
- `[x]` (24.09.2026) JWT oluşturma ve doğrulama (Access + Refresh Token) servislerinin yazılması.
- `[x]` (24.09.2026) Google OAuth 2.0 token doğrulama servisinin eklenmesi.
- `[x]` (24.09.2026) Role-based Authorization (Coach, Student, Parent) attribute ve policy'lerinin tanımlanması.
- `[x]` (24.09.2026) İptal edilmiş/Soft delete yapılmış (IsActive=0) kullanıcıların JWT token'larını cache üzerinden engelleyecek Validation Middleware'in yazılması.

## Aşama 4: Backend — İş Mantığı ve API Geliştirme (Feature Bazlı)
- `[x]` (24.09.2026) **Auth:** `/api/v1/auth/` endpoint'leri (Login, Refresh, Register).
- `[x]` (24.09.2026) **Invite:** `/api/v1/invites/` endpoint'leri (Davet oluşturma, Doğrulama, Süresi dolan token'ı yenileme/resend).
- `[x]` (24.09.2026) **Students:** `/api/v1/students/` endpoint'leri (Koçun öğrenci yönetimi, koç notlarının DTO'dan tamamen izole edilmesi).
- `[x]` (24.09.2026) **Curriculum & Subjects:** Müfredat (yıl, konu) ve ders yönetimi endpoint'leri.
- `[x]` (24.09.2026) **Homework:** Şablon oluşturma ve ödev atama endpoint'leri. (Atama anında SnapshotTitle/Desc/Source alma mantığı).
- `[x]` (24.09.2026) **Idempotency (Kritik):** Ödev tamamlama ve finansal işlemler için Idempotency (mükerrer istek önleme) filtrelerinin yazılması.
- `[x]` (24.09.2026) **Exams:** İlişkisel tablo yapısıyla `ExamScores` üzerinden sınav sonuçları ekleme/okuma.
- `[x]` (24.09.2026) **Background Jobs:** `IJobScheduler` arayüzü ile `IHostedService` cron yapısının kurulması (gecikmiş ödev bildirimleri için, 100'erli chunk'lar halinde).

## Aşama 5: Backend — Testler
- `[x]` (24.09.2026) xUnit test projesinin kurulması.
- `[x]` (24.09.2026) **Cross-Tenant Security Test:** Başka koça ait öğrenci verisine erişildiğinde `BaseRepository`'nin `403` veya `NotFound` döndürdüğünü kanıtlayan zorunlu entegrasyon testlerinin yazılması.

## Aşama 5.5: Backend — Kapsamlı Güvenlik ve Mimari Düzeltmeleri (Senior Review Sonrası)
- `[x]` (24.09.2026) `/complete` endpoint'ine IDOR engellemesi için `coach_id`/`student_id` ownership kontrolü eklendi.
- `[x]` (24.09.2026) `AssignHomework` ve `ExamRepository` metotlarına, işlem yapılan öğrencinin ilgili koça ait olduğunu doğrulayan (ownership) kontroller eklendi.
- `[x]` (24.09.2026) `/register` ve `/invite/accept` endpoint'lerindeki birden çok tabloya veri yazma işlemleri `Transaction` içerisine alındı.
- `[x]` (24.09.2026) `RefreshToken` geri dönüşleri düz metinden `httpOnly`, `Secure` ve `SameSite=Strict` özellikli cookie yapısına taşındı.
- `[x]` (24.09.2026) `BaseRepository`'ye `additionalWhere` parametresi eklenerek kırılgan SQL oluşturma hataları giderildi.
- `[x]` (24.09.2026) `IdempotencyFilter`'ın yalnızca başarılı istekleri (`StatusCode < 400`) cache'lemesi sağlandı.

## Aşama 6: Frontend — Temel Kurulum ve State
- `[x]` `npm create vite@latest frontend` ile React 18 projesi başlatılması.
- `[x]` Axios interceptor yazılması (JWT Bearer token ekleme, 401'de Refresh Token, R2'de 403 alınırsa resmi yeniden fetch etme).
- `[x]` **State Management (Kritik):** Sunucu verisi (Server state) için `React Query`, UI/Auth durumu için `Zustand` kurulumu.
- `[x]` `date-fns-tz` ile timezone yönetimi, `react-i18next` ile çoklu dil/ton (buddy, formal) altyapısının kurulması.
- `[x]` CSS Modules yapısına uygun klasör hiyerarşisi oluşturulması.

## Aşama 7: Frontend — UI Bileşenleri ve Sayfalar
- `[x]` Ortak bileşenlerin (Button, Modal, Card, Input) tasarlanması.
- `[x]` Layout'ların (CoachLayout, StudentLayout) hazırlanması.
- `[x]` Login ve Davet Kabul (Onboarding) sayfaları.
- `[x]` **Coach Dashboard:** Öğrenci listesi, Takvim (`react-big-calendar`) bileşeni. Öğrenci takvimine `startDate` ve `endDate` parametrelerinin zorunlu eklenmesi.
- `[x]` **Ödev Modülü:** Öğrenci için ödev görüntüleme ve "Tamamla" butonu (React Query optimistic update ile offline senkronizasyon).

## Aşama 8: Son Testler ve Derleme
- `[x]` Koç -> Öğrenci davet -> Ödev atama -> Öğrencinin tamamlaması uçtan uca akışının manuel testi.
- `[x]` Tüm sistemin `dotnet build` ve `npm run build` ile yerel olarak başarıyla derlendiğinin doğrulanması.
- `[x]` `.github/workflows/deploy.yml` dosyasının çalıştırılabilir hale getirilmesi.
