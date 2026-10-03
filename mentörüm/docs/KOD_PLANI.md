# 🛠️ Mentörüm — Kod Planı (KOD_PLANI.md)
> Versiyon: 1.0 — 23 Eylül 2026
> Kodlamaya başlamadan önce okunması zorunlu teknik tasarım belgesi.

---

## İÇİNDEKİLER
1. Teknoloji Yığını
2. Klasör Yapısı
3. Veri Modeli (Tablolar ve İlişkiler)
4. API Tasarımı
5. Kimlik Doğrulama Akışı
6. Güvenlik Katmanları
7. Frontend Mimari
8. Backend Mimari
9. Bildirim Sistemi Teknik Detay
10. Müfredat Veri Yönetimi
11. Genişletilebilirlik Kararları
12. Bilinen Riskler ve Önlemler

---

## 1. Teknoloji Yığını

### Frontend
- Framework   : React 18 (Vite)
- CSS         : CSS Modules (scoped — global CSS yasak, AGENTS.md kuralı)
- Routing     : React Router v6
- State       : React Query (Server state / API cache), Zustand (Sadece UI ve Auth state)
- HTTP        : Axios (apiClient.js üzerinden — direkt fetch yasak)
- Takvim      : react-big-calendar veya özel bileşen
- Form        : react-hook-form + zod (validasyon)
- i18n        : react-i18next (şimdilik TR, altyapı hazır)
- Test        : Vitest + React Testing Library

### Backend
- Framework   : ASP.NET Core 9 Web API
- ORM         : Dapper (raw SQL yasak, BaseRepository + SqlBuilder ile zorunlu tenant id filtresi)
- Veritabanı  : Neon (PostgreSQL 16, serverless) — SQLite kullanılmaz
- Auth        : JWT (access 15dk + refresh 7gün) + Google OAuth
- Validation  : FluentValidation
- Loglama     : Serilog → dosya + console
- Test        : xUnit + CrossTenant Security Integration Tests (zorunlu)
- Arka Plan İşleri : IHostedService + IJobScheduler interface (MVP için basit, sonradan Hangfire'a taşınabilir)

### Altyapı
- Veritabanı  : Neon (serverless Postgres — bağlantı pool: pgBouncer dahili)
- Dosya Depo  : Cloudflare R2 (S3 uyumlu — egress ücretsiz)
- Kaynak Kod  : GitHub (zaten kullanılıyor)
- CI/CD       : GitHub Actions (build → test → deploy)
- Mobil       : Capacitor (Faz 2 — web kodu korunarak)

#### Neon Notları
- Connection string env variable olarak saklanır (asla koda gömme)
- Neon, serverless olduğu için soğuk başlangıç (cold start) olabilir
  → Bağlantı pool boyutu dikkatli ayarlanmalı (max 10 bağlantı MVP için)
- Ayrı Neon PROJESİ kullanılır (dersmatris projesinden bağımsız — 1 GB/proje bedava)
- Branch'ler: `production` (kök/prod, Console'da bu ad) + `mentorum-dev` (geliştirme/test)
- ⚠️ KOD DEĞİŞİKLİĞİ GEREKMEZ: kod `DATABASE_URL` env var'ını okur (DbConnectionFactory.cs) — branch/proje agnostik. Dev↔Prod geçişi yalnızca `DATABASE_URL` değişimidir (yerel `.env` veya `fly secrets`).
- Otomatik backup Neon tarafından yapılır

#### Cloudflare R2 Notları
- Dosya yükleme MVP'de kapsam dışı ama altyapı hazır
- R2 bucket: mentorum-uploads (public okuma kapalı)
- Dosya erişimi: Presigned URL ile (süreli, doğrudan linke erişim yok)
- İzin verilen dosya türleri: jpg, png, pdf (max 10MB)
- Presigned URL ömrü: 1 saat
- R2 API key çifti (Access Key + Secret) env variable

---

## 2. Klasör Yapısı

mentörüm/
├── docs/
│   ├── URUN_PLANI.md          ← Ürün kararları
│   └── KOD_PLANI.md           ← Bu dosya
│
├── frontend/                   ← React (Vite)
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   │   └── apiClient.js    ← Tüm HTTP istekleri buradan
│   │   ├── assets/
│   │   ├── components/         ← Ortak bileşenler
│   │   │   ├── common/
│   │   │   │   ├── Button/
│   │   │   │   │   ├── Button.jsx
│   │   │   │   │   └── Button.module.css
│   │   │   │   ├── Card/
│   │   │   │   ├── Modal/
│   │   │   │   ├── Badge/
│   │   │   │   └── Calendar/
│   │   │   └── layout/
│   │   │       ├── CoachLayout/    ← Sidebar + içerik
│   │   │       ├── StudentLayout/  ← Bottom tab bar
│   │   │       └── ParentLayout/
│   │   ├── features/           ← Vertical slice (özellik bazlı)
│   │   │   ├── auth/
│   │   │   │   ├── LoginPage.jsx
│   │   │   │   ├── LoginPage.module.css
│   │   │   │   ├── authStore.js
│   │   │   │   └── authApi.js
│   │   │   ├── coach/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── students/
│   │   │   │   ├── homework/
│   │   │   │   ├── calendar/
│   │   │   │   └── reports/
│   │   │   ├── student/
│   │   │   │   ├── home/
│   │   │   │   ├── homework/
│   │   │   │   ├── calendar/
│   │   │   │   └── subjects/
│   │   │   └── parent/
│   │   │       ├── summary/
│   │   │       ├── homework/
│   │   │       └── calendar/
│   │   ├── hooks/              ← Paylaşılan custom hook'lar
│   │   │   ├── useAuth.js
│   │   │   ├── useNotifications.js
│   │   │   └── useHomeworkStatus.js
│   │   ├── utils/
│   │   │   ├── platform.js     ← localStorage vs Capacitor Storage
│   │   │   ├── dateUtils.js    ← Tarih/timezone yardımcıları
│   │   │   └── homeworkUtils.js← Durum hesaplama (gecikmiş mi?)
│   │   ├── styles/
│   │   │   └── globals.css     ← YALNIZCA CSS değişkenleri ve reset
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── capacitor.config.json
│   └── vite.config.js
│
├── backend/                    ← ASP.NET Core Web API
│   ├── MentorumApi/
│   │   ├── Controllers/
│   │   │   ├── AuthController.cs
│   │   │   ├── StudentsController.cs
│   │   │   ├── SubjectsController.cs
│   │   │   ├── HomeworkController.cs
│   │   │   ├── CurriculumController.cs
│   │   │   ├── CalendarController.cs
│   │   │   └── NotificationsController.cs
│   │   ├── Features/           ← Vertical slice backend
│   │   │   ├── Auth/
│   │   │   ├── Students/
│   │   │   ├── Homework/
│   │   │   └── Curriculum/
│   │   ├── Data/
│   │   │   ├── BaseRepository.cs     ← Tenant filtresi burada
│   │   │   ├── DatabaseHelper.cs
│   │   │   └── Migrations/
│   │   ├── Models/             ← Tüm entity'ler
│   │   ├── DTOs/               ← Request/Response nesneleri
│   │   ├── Services/           ← İş mantığı
│   │   ├── Filters/            ← ActionFilter'lar (Idempotency vb)
│   │   ├── Middleware/         ← Auth, hata yakalama
│   │   └── Program.cs
│   └── MentorumApi.Tests/
│
└── .github/
    └── workflows/
        └── ci.yml

---

## 3. Veri Modeli

### 3.1 Tablo Listesi ve İlişkiler

Users (Kullanıcılar — tüm roller)
├── Id           UUID PK
├── Email        TEXT UNIQUE NOT NULL
├── PasswordHash TEXT (Google Auth'ta null)
├── GoogleId     TEXT (opsiyonel)
├── Role         TEXT CHECK(Role IN ('Coach','Student','Parent'))
├── FullName     TEXT NOT NULL
├── AvatarUrl    TEXT
├── IsActive     INTEGER DEFAULT 1
├── CreatedAt    TEXT (ISO8601)
└── UpdatedAt    TEXT

Coaches (Koç profili — Users'ı extend eder)
├── Id           UUID PK = Users.Id
└── PlanType     TEXT DEFAULT 'free'  ← ileride abonelik için

Students (Öğrenci profili)
├── Id           UUID PK = Users.Id
├── CoachId      UUID FK → Users(Coach)   ← TENANT KİLİDİ
├── Grade        INTEGER (5-12)
├── Track        TEXT ('SAY','EA','SOZ','ORTAOKUL',null)
├── TargetUniversity TEXT
├── TargetDepartment TEXT
├── TargetScore      REAL
├── CoachingStartDate TEXT
├── IsActive         INTEGER DEFAULT 1
└── UpdatedAt        TEXT

CoachNotes (Koç özel notları — öğrenciden ayrı tablo)
├── Id          UUID PK
├── StudentId   UUID FK → Students
├── CoachId     UUID FK → Coaches
├── Content     TEXT
├── CreatedAt   TEXT
└── UpdatedAt   TEXT

!!! Bu tablo yalnızca Coach rolü endpoint'i üzerinden erişilebilir.
!!! Ana student endpoint'e dahil edilmez — ASLA.

Parents (Veli profili)
├── Id          UUID PK = Users.Id
└── (ekstra alan gerekmez şimdilik)

StudentParents (Öğrenci-Veli çoka-çok ilişkisi, max 2)
├── Id          UUID PK
├── StudentId   UUID FK → Students
├── ParentId    UUID FK → Parents (null olabilir — henüz kayıt olmamış)
├── ParentEmail TEXT NOT NULL  ← davet e-postası
├── Relation    TEXT ('Anne','Baba','Veli','Diğer')
├── Phone       TEXT
├── InviteToken UUID           ← davet token'ı
├── InviteExpiry TEXT          ← 48 saat
├── IsAccepted  INTEGER DEFAULT 0
└── CreatedAt   TEXT

ExamResults (Geçmiş sınav sonuçları)
├── Id          UUID PK
├── StudentId   UUID FK → Students
├── CoachId     UUID FK → Coaches  ← filtre için
├── ExamDate    TEXT
├── ExamType    TEXT ('TYT','AYT','LGS','Okul','Deneme','Diğer')
├── ExamName    TEXT
├── TotalNet    REAL
├── Notes       TEXT
└── CreatedAt   TEXT

ExamScores (Sınav sonuçları ders bazlı kırılım — Analitik için)
├── ExamId      UUID FK → ExamResults
├── SubjectCode TEXT  (ör: 'mat', 'tur', 'fen' vb. curriculum ile uyumlu)
├── Score       REAL
└── MaxScore    REAL

Subjects (Ders şablonları — genel müfredat dersleri)
├── Id          UUID PK
├── Name        TEXT NOT NULL   (ör: "Matematik")
├── ShortCode   TEXT            (ör: "MAT")
├── DefaultColor TEXT           (ör: "#3B82F6")
└── IsSystemSubject INTEGER DEFAULT 1  ← sistem dersiyse 1, koç ekliyorsa 0

StudentSubjects (Öğrenci-Ders kaydı)
├── Id          UUID PK
├── StudentId   UUID FK → Students
├── SubjectId   UUID FK → Subjects
├── CoachId     UUID FK → Coaches  ← filtre
├── ResourceBook TEXT             ← hangi kitap/kaynak
├── Color       TEXT              ← özelleştirilmiş renk
├── IsActive    INTEGER DEFAULT 1
└── CreatedAt   TEXT

CurriculumYears (Müfredat yılları)
├── Id          UUID PK
├── YearLabel   TEXT  (ör: "2026-2027")
├── IsActive    INTEGER DEFAULT 1
└── CreatedAt   TEXT

CurriculumTopics (Konular — müfredattan)
├── Id          UUID PK
├── CurriculumYearId UUID FK → CurriculumYears
├── SubjectId        UUID FK → Subjects
├── Grade            INTEGER
├── CurriculumType   TEXT CHECK IN ('NEW','OLD')
├── UnitNumber       INTEGER
├── UnitName         TEXT
├── TopicNumber      TEXT     (ör: "1.2")
├── TopicName        TEXT
├── IsActive         INTEGER DEFAULT 1
└── SortOrder        INTEGER

HomeworkTemplates (Ödev şablonları — koçun oluşturduğu)
├── Id          UUID PK
├── CoachId     UUID FK → Coaches
├── SubjectId   UUID FK → Subjects  (hangi ders şablonu için)
├── Title       TEXT NOT NULL
├── Description TEXT
├── ResourceRef TEXT    ← "Birey Yayınları s.45-60"
├── CurriculumTopicId UUID FK → CurriculumTopics (opsiyonel)
├── FreeTopic   TEXT    ← müfredattan değil serbest konu
├── CreatedAt   TEXT
└── UpdatedAt   TEXT

HomeworkAssignments (Ödev atamaları — kişisel durum)
├── Id              UUID PK
├── TemplateId      UUID FK → HomeworkTemplates
├── SnapshotTitle   TEXT NOT NULL (Şablon güncellenirse eski atama etkilenmesin diye)
├── SnapshotDesc    TEXT
├── SnapshotSource  TEXT
├── TemplateVersion INTEGER DEFAULT 1
├── StudentId       UUID FK → Students
├── StudentSubjectId UUID FK → StudentSubjects
├── CoachId         UUID FK → Coaches  ← filtre
├── DueDate         TEXT NOT NULL
├── Status          TEXT CHECK IN ('PENDING','DONE','OVERDUE','LATE_DONE','CANCELLED')
├── CompletionPercentage SMALLINT NULL (0-100 arası, MVP'de UI'da yok, db'de toplanır)
├── CompletedAt     TEXT (null = yapılmamış)
├── CompletedBy     TEXT CHECK IN ('Student','Coach',null)
├── CancelledAt     TEXT
├── CancelReason    TEXT
├── CreatedAt       TEXT
└── UpdatedAt       TEXT

NOT: Status alanı her gece cron ile güncellenir:
PENDING + DueDate geçmişse → OVERDUE
Uygulama her açıldığında da kontrol edilir (frontend tarafı).

Notifications (Bildirimler)
├── Id          UUID PK
├── UserId      UUID FK → Users (alıcı)
├── Type        TEXT  ('HOMEWORK_ASSIGNED','HOMEWORK_DUE','HOMEWORK_OVERDUE','HOMEWORK_DONE')
├── Title       TEXT
├── Body        TEXT
├── Payload     TEXT  ← JSON (ör: homeworkId, studentId)
├── IsRead      INTEGER DEFAULT 0
├── CreatedAt   TEXT
└── ReadAt      TEXT

InviteTokens (Davet token'ları — veli ve öğrenci)
├── Id          UUID PK
├── Token       UUID UNIQUE NOT NULL
├── Email       TEXT NOT NULL
├── Role        TEXT ('Student','Parent')
├── RelatedId   UUID  ← StudentId veya StudentParentId
├── ExpiresAt   TEXT
├── IsUsed      INTEGER DEFAULT 0
└── CreatedAt   TEXT

RefreshTokens (JWT refresh)
├── Id          UUID PK
├── UserId      UUID FK → Users
├── Token       TEXT UNIQUE NOT NULL
├── ExpiresAt   TEXT
├── IsRevoked   INTEGER DEFAULT 0
├── CreatedAt   TEXT
└── LastUsedAt  TEXT

### 3.2 İlişki Özeti

Users 1─────N Students       (CoachId üzerinden)
Users 1─────N StudentParents (ParentId üzerinden)
Students N──M Parents        (StudentParents tablosu)
Students 1──N StudentSubjects
Students 1──N HomeworkAssignments
Students 1──N ExamResults
Students 1──N CoachNotes
Subjects 1──N StudentSubjects
Subjects 1──N HomeworkTemplates
Subjects 1──N CurriculumTopics
HomeworkTemplates 1──N HomeworkAssignments
CurriculumTopics 1──N HomeworkAssignments (opsiyonel ref)
CurriculumYears 1──N CurriculumTopics

---

## 4. API Tasarımı

### 4.1 Temel URL Yapısı
/api/v1/...

Versiyon URL'de tutulur — ileride v2 eklenirse eski istemciler bozulmaz.

### 4.2 Endpoint Listesi

AUTH
POST   /api/v1/auth/register          ← Koç kaydı (ilk giriş)
POST   /api/v1/auth/login             ← E-posta + şifre
POST   /api/v1/auth/google            ← Google OAuth token doğrulama
POST   /api/v1/auth/refresh           ← Access token yenile
POST   /api/v1/auth/logout            ← Refresh token iptal et
POST   /api/v1/auth/logout-all        ← Tüm cihazlardan çıkış
POST   /api/v1/auth/forgot-password   ← Şifre sıfırlama maili
POST   /api/v1/auth/reset-password    ← Token ile yeni şifre

STUDENTS (Yalnızca Coach rolü)
GET    /api/v1/students               ← Koçun öğrenci listesi
POST   /api/v1/students               ← Yeni öğrenci ekle
GET    /api/v1/students/:id           ← Öğrenci profili (coach_notes YOK)
PUT    /api/v1/students/:id           ← Profil güncelle
DELETE /api/v1/students/:id           ← Pasife al (silme yok)
GET    /api/v1/students/:id/coach-notes  ← Yalnızca Coach rolü
PUT    /api/v1/students/:id/coach-notes  ← Yalnızca Coach rolü
GET    /api/v1/students/:id/exam-results ← Sınav geçmişi
POST   /api/v1/students/:id/exam-results ← Sınav sonucu ekle

INVITES
POST   /api/v1/invites/send           ← Veli/öğrenci davet maili gönder
GET    /api/v1/invites/:token         ← Token bilgisi (geçerli mi?)
POST   /api/v1/invites/:token/accept  ← Şifre belirle, hesabı aktifleştir

SUBJECTS (Dersler)
GET    /api/v1/subjects               ← Sistem ders listesi
GET    /api/v1/students/:id/subjects  ← Öğrencinin aktif dersleri
POST   /api/v1/students/:id/subjects  ← Öğrenciye ders ekle
PUT    /api/v1/students/:id/subjects/:sid  ← Kaynak/renk güncelle
DELETE /api/v1/students/:id/subjects/:sid  ← Dersi pasife al

CURRICULUM (Müfredat)
GET    /api/v1/curriculum/years                      ← Müfredat yılları
GET    /api/v1/curriculum/topics?grade=11&year=...   ← Konu listesi
GET    /api/v1/curriculum/topics?subjectId=...       ← Derse göre konular

HOMEWORK
GET    /api/v1/homework/templates           ← Koçun şablonları
POST   /api/v1/homework/templates           ← Yeni şablon oluştur
POST   /api/v1/homework/assign              ← Ödev ata (çoklu öğrenci)
GET    /api/v1/students/:id/homework        ← Öğrencinin ödev listesi
PATCH  /api/v1/homework/assignments/:id     ← Durum güncelle (tamamla, iptal)
DELETE /api/v1/homework/assignments/:id     ← İptal et

STUDENT (kendi verisi — Student rolü)
GET    /api/v1/me/profile             ← Kendi profili
GET    /api/v1/me/homework            ← Kendi ödevleri
PATCH  /api/v1/me/homework/:id/complete ← Ödevi tamamlandı işaretle
GET    /api/v1/me/calendar            ← Kendi takvimi
GET    /api/v1/me/subjects            ← Kendi dersleri

PARENT (kendi çocuğunun verisi — Parent rolü)
GET    /api/v1/me/children            ← Bağlı çocuklar
GET    /api/v1/me/children/:id/summary ← Haftalık özet
GET    /api/v1/me/children/:id/homework ← Ödev listesi (salt okunur)
GET    /api/v1/me/children/:id/calendar ← Takvim

CALENDAR
GET    /api/v1/calendar?from=...&to=...&studentId=... ← Koç genel takvim

NOTIFICATIONS
GET    /api/v1/notifications          ← Okunmamış bildirimler
PATCH  /api/v1/notifications/:id/read ← Okundu işaretle
PATCH  /api/v1/notifications/read-all ← Hepsini okundu yap

REPORTS
GET    /api/v1/reports/students/:id   ← Öğrenci bazlı rapor
GET    /api/v1/reports/overview       ← Koç genel raporu

### 4.3 Response Formatı (Standart)

Başarılı:
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "total": 42 }  // listeler için
}

Hata:
{
  "success": false,
  "error": {
    "code": "HOMEWORK_NOT_FOUND",
    "message": "Ödev bulunamadı.",
    "details": []
  }
}

Hata kodları sabit string: STUDENT_NOT_FOUND, UNAUTHORIZED, RATE_LIMIT_EXCEEDED
Sayısal HTTP status da kullanılır (400, 401, 403, 404, 409, 422, 429, 500)

---

## 5. Kimlik Doğrulama Akışı

### 5.1 E-posta + Şifre

1. POST /auth/login → { email, password }
2. Backend: şifre bcrypt doğrula
3. Başarılı → access_token (JWT, 15dk) + refresh_token (httpOnly cookie, 7gün)
4. Frontend: access_token Zustand store'da tut (memory)
5. Her istek: Authorization: Bearer <access_token>
6. Token süresi dolunca: POST /auth/refresh → yeni access_token

!!! access_token localStorage'a kaydedilmez — XSS saldırısına karşı.
!!! refresh_token httpOnly cookie → JavaScript okuyamaz.

### 5.2 Google OAuth

1. Frontend: Google Sign-In popup
2. Google ID token alınır
3. POST /auth/google → { idToken }
4. Backend: Google'a token doğrulattır
5. Kullanıcı yoksa → e-posta ile hesap oluştur (rol ataması gerekir)
6. Kullanıcı varsa → normal token döndür

!!! Google ile giriş yapan kullanıcının rolü nasıl belirlenir?
   - Öğrenci/Veli davet token'ı varsa: token'dan rol alınır
   - Koç kaydı: ayrı kayıt formu (ilk girişte rol seçimi)

### 5.3 Öğrenci/Veli Aktivasyonu (Davet Akışı)

1. GET /invites/:token → token bilgisi (email, rol, isim)
2. Kullanıcı şifre girer veya Google ile devam eder
3. POST /invites/:token/accept → { password } veya { googleIdToken }
4. Hesap aktifleşir, token işaretlenir (IsUsed = 1)
5. Normal login akışına geçilir

---

## 6. Güvenlik Katmanları

### 6.1 Backend Güvenlik Kontrol Listesi

Her endpoint şu soruları yanıtlamalı:

Soru 1: Kullanıcı giriş yapmış mı?
→ JWT middleware: geçersiz/süresi dolmuş token → 401

Soru 2: Kullanıcının rolü bu işleme uygun mu?
→ Role-based authorization attribute
→ [Authorize(Roles = "Coach")] veya [Authorize(Roles = "Student")]

Soru 3: Erişilen kaynak bu kullanıcıya ait mi?
→ Her sorguda tenant/ownership kontrolü
→ ÖRN: Student'ı getirirken WHERE coach_id = @authenticatedCoachId
→ ÖRN: Homework getirirken WHERE student_id = @authenticatedStudentId
→ Bu kontrol HER endpoint'te tekrarlanır, soyutlanamaz (atlanabilir risk)

Soru 4: CoachNotes'a kimler erişebilir?
→ Ayrı endpoint, ayrı authorization, Student ve Parent token'ı → 403

### 6.2 Rate Limiting

Genel API:     100 istek/dakika/IP
Auth endpoint: 10  istek/dakika/IP (login, register, forgot-password)
Davet endpoint: 5  istek/dakika/IP

5 ardışık başarısız login → 15 dakika blok (IP + email bazlı)

### 6.3 Davet Token Güvenliği

- UUID v4 (tahmin edilemez)
- 48 saat geçerli
- Tek kullanımlık (IsUsed = 1 sonrası tekrar kullanılamaz)
- Kullanılan token için başka istek gelirse → 410 Gone

### 6.4 Veri Maskeleme Kuralları

API endpoint başına ne döner, ne dönmez:

GET /api/v1/students/:id (Coach erişir)
DÖNER:   id, fullName, grade, track, target*, examResults, parentInfo
DÖNMEZ:  coachNotes (ayrı endpoint)

GET /api/v1/me/profile (Student erişir)
DÖNER:   id, fullName, grade, track, target*
DÖNMEZ:  coachNotes, parentPhone/email, otherStudentsData

GET /api/v1/me/children/:id/summary (Parent erişir)
DÖNER:   fullName, grade, weeklyHomeworkStats
DÖNMEZ:  coachNotes, targetInfo (gizliyse), otherStudentsData

---

## 7. Frontend Mimari

### 7.1 State Yönetimi (Zustand)

authStore.js
- user: { id, email, role, fullName }
- accessToken: string (memory only)
- setAuth(), clearAuth()

homeworkStore.js
- assignments: []
- filters: { status, subjectId }
- setAssignments(), updateStatus()

notificationStore.js
- notifications: []
- unreadCount: number
- markRead(), markAllRead()

uiStore.js
- sidebarOpen: bool
- activeModal: string | null
- openModal(), closeModal()

### 7.2 Routing Yapısı

/                       → GirişSayfası (giriş yapılmışsa yönlendir)
/login                  → LoginPage
/invite/:token          → InviteAcceptPage

/coach/                 → CoachLayout (sidebar)
/coach/dashboard        → CoachDashboard
/coach/students         → StudentList
/coach/students/:id     → StudentProfile (4 sekme)
/coach/students/:id/subjects/:sid → SubjectDetail
/coach/calendar         → GeneralCalendar
/coach/reports          → Reports
/coach/settings         → Settings

/student/               → StudentLayout (bottom tab)
/student/home           → StudentHome
/student/homework       → StudentHomework
/student/calendar       → StudentCalendar
/student/subjects       → StudentSubjects
/student/profile        → StudentProfile

/parent/                → ParentLayout (bottom tab)
/parent/summary         → ParentSummary
/parent/homework        → ParentHomework
/parent/calendar        → ParentCalendar

PrivateRoute bileşeni: giriş yoksa /login'e yönlendir
RoleRoute bileşeni: yanlış rol ise 403 sayfası

### 7.3 apiClient.js — Merkezi HTTP Katmanı

Tüm API istekleri buradan geçer:
- Authorization header otomatik eklenir
- 401 hatası → token refresh denemesi → başarısızsa logout
- Hata loglama merkezi
- Base URL ortama göre değişir (dev/prod)

!!! Bileşenlerden direkt fetch/axios çağrısı yasak (AGENTS.md).

### 7.4 CSS Modül Stratejisi

- Her bileşenin kendi .module.css dosyası var
- Renk, spacing, font → globals.css'deki CSS değişkenlerinden
- globals.css'e class tanımı girmez, YALNIZCA :root değişkenleri
- Örnek değişkenler:
  --color-primary: #6366F1;
  --color-success: #22C55E;
  --color-warning: #F59E0B;
  --color-danger: #EF4444;
  --color-late: #F97316;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --radius-md: 12px;
  --font-body: 'Inter', sans-serif;

---

## 8. Backend Mimari

### 8.1 BaseRepository Tasarımı

Tüm repository'ler BaseRepository'den türer.
BaseRepository, aktif kullanıcının CoachId'sini HttpContext'ten alır ve
Dapper sorgularına otomatik WHERE koşulu ekler.

Desteklenen filtreler:
- CoachOwnedFilter: WHERE coach_id = @coachId
- StudentOwnedFilter: WHERE student_id = @studentId
- ActiveFilter: WHERE is_active = 1

Her sorguda filtre açıkça belirtilmeli — varsayılan filtre tehlikeli.

### 8.2 Vertical Slice Yapısı

Her özellik kendi klasöründe yaşar:
Features/Homework/
├── HomeworkController.cs
├── HomeworkService.cs         ← iş mantığı
├── HomeworkRepository.cs      ← veri erişimi (BaseRepository'den)
├── HomeworkModels.cs          ← entity
├── HomeworkDTOs.cs            ← request/response
└── HomeworkValidator.cs       ← FluentValidation

Özellikler arası direkt bağımlılık yasak — Interface üzerinden.

### 8.3 Status Otomatik Güncelleme (Cron)

Her gece 00:05'te çalışan background service:

UPDATE homework_assignments
SET status = 'OVERDUE'
WHERE status = 'PENDING'
  AND due_date < CURRENT_DATE;

Bu işlem uygulama açıldığında da tetiklenir (frontend tarafı anlık göstermek için).
Frontend, DueDate'i alınca hesaplar:
  DueDate geçmiş + status PENDING → gösterimdde OVERDUE olarak işle
  (backend güncellenmeden önce de doğru görünüm)

### 8.4 Hata Yönetimi

Global exception middleware:
- Beklenmeyen hatalar → 500 + loglama (Serilog)
- Validation hatası → 422 + hangi alan hatalı
- Not found → 404 + hata kodu
- Unauthorized → 401
- Forbidden → 403

Kullanıcıya asla stack trace verilmez.
Production'da hata detayı loglanır, kullanıcıya generic mesaj.

---

## 9. Bildirim Sistemi Teknik Detay

### 9.1 MVP: Polling ile Uygulama İçi Bildirim

Frontend her 30 saniyede GET /api/v1/notifications atar.
Okunmamış varsa badge gösterir.
Toast: ödev tamamlandığında koç sayfasındaysa anlık görünür.

Dezavantaj: Sunucuya sürekli istek.
Faz 2'de WebSocket veya Server-Sent Events ile değiştirilir.

### 9.2 Faz 2: Web Push Notifications

- Service Worker kayıt
- Push subscription backend'e kaydedilir
- Backend: web-push kütüphanesi ile gönderim
- Kullanıcı tarayıcı kapalıyken de çalışır

### 9.3 E-posta (Haftalık Özet)

Cron: Her Pazar 09:00
- Tüm velilere bağlı öğrencilerin haftalık özet maili
- Şablon: Tamamlanan / Gecikmiş / Yaklaşan ödevler

Mail gönderimi: SMTP (SendGrid veya Resend)

---

## 10. Müfredat Veri Yönetimi

### 10.1 Veri Kaynağı

Müfredat konuları MEB sitesinden alınır ve sisteme manuel girilir.
İlk yükleme: SQL seed dosyası (Data/Seeds/Curriculum2026.sql)

### 10.2 Yıllık Güncelleme Akışı

1. Yeni müfredat yılı oluştur (CurriculumYears)
2. Konuları yeni yıla kopyala (değişmeyenler)
3. Değiştirilen konuları güncelle / yenilerini ekle
4. Eski konular silinmez — is_active = 0

### 10.3 Koçun Müfredat Özelleştirmesi

Koç, müfredattan konuları pasife alabilir (kendi öğrencisi için).
Özel konu ekleyebilir (ör: "Özel pratik soruları").
Bu özelleştirmeler StudentSubjects veya HomeworkTemplates'e not olarak saklanır.

---

## 11. Genişletilebilirlik Kararları

### 11.1 Neden N:M Koç-Öğrenci İlişkisi?

MVP'de her öğrenci bir koçla çalışır.
ANCAK Students tablosunda coach_id tek kolon olarak tutulursa
ileride "birden fazla koç" özelliği eklemek tüm tabloyu değiştirir.

Karar: Students.CoachId ana koç için kalır (kısıt tutulur).
Gelecekte: StudentCoaches (N:M junction) tablosu eklenir, Students.CoachId primary koç olarak kalır.

### 11.2 Neden ExamScores Ayrı Bir İlişkisel Tablo?

TYT: mat, tur, fen, sosyal
AYT SAY: mat, fiz, kim, bio
AYT EA: mat, dil, sos
LGS: mat, tur, fen, ink, ing, din

Eskiden JSON ({"mat": 28, "tur": 35}) planlanmıştı. Ancak analitik sorgular (koçun "matematik netleri nasıl gelişiyor?" demesi) JSONB üzerinden `->> 'mat'` şeklinde yapıldığında tip güvenliğini bozar ve typo hatalarına (ör: 'Math' vs 'mat') çok açıktır.
Karar: Analitik raporlama ve tip güvenliği için JSON terk edilmiş, `ExamScores (ExamId, SubjectCode, Score, MaxScore)` şeklinde ayrı bir tablo kurulmuştur. `SubjectCode` müfredattaki `Subjects.ShortCode` ile uyumlu çalışır.

### 11.3 Neden Soft Delete?

Hiçbir kayıt gerçekten silinmez (is_active = 0).
- Öğrenci silindi → tarihçe korunur
- Ödev iptal edildi → kayıt tutulur (CANCELLED)
- Müfredat konusu kaldırıldı → bağlı ödevler korunur

Veri bütünlüğü ve audit trail için şart.

### 11.4 Neden UUID Primary Key?

Integer ID tahmin edilebilir → /api/students/1, 2, 3 ...
UUID: /api/students/a1b2c3d4-... → IDOR saldırılarına ekstra bariyer.
PostgreSQL'de UUID tipi native desteklenir (gen_random_uuid() ile üret).

---

## 12. Bilinen Riskler ve Önlemler

Risk 1: Neon soğuk başlangıç (cold start) gecikmesi
Ortam: Serverless Neon, uzun süre istek gelmeyince uyku moduna girer
Belirti: İlk istek ~500ms-1s yavaş
Önlem: pgBouncer pool açık tut; /health endpoint cron ile 5dk'da bir ping
Uzun vade: Neon Pro planında "always-on" bağlantı seçeneği

Risk 2: Cron job çalışmayınca ödev durumları güncellenmez
Belirti: PENDING ödev gecikmiş görünmez
Önlem: Frontend de DueDate'e bakarak anlık hesaplar; cron sadece DB tutarlılığı için

Risk 3: Google OAuth client_secret sızarsa
Önlem: Env variable, asla koda gömme; secret rotation planı

Risk 4: JWT secret sızarsa
Önlem: Env variable; token ömrü kısa (15dk); refresh token rotation

Risk 5: Yanlış role authorization
Senaryo: Öğrenci Coach endpoint'ine istek atar
Önlem: Her controller'da [Authorize(Roles="Coach")] + integration test

Risk 6: Büyük öğrenci listesi sayfalama yok
Belirti: 100+ öğrencide GET /students yavaş
Önlem: Sayfalama baştan (limit/offset), varsayılan limit=20

Risk 7: Müfredat konu listesi büyük → yavaş yükleme
Önlem: Sunucu taraflı filtreleme (grade, subjectId parametreli)
Konu listesi UI'da lazy load (ders seçilince yükle)

Risk 8: Davet maili spam kutusuna düşer
Önlem: SPF, DKIM, DMARC DNS kaydı; güvenilir SMTP sağlayıcı (Resend/SendGrid)

Risk 9: Öğrenci yanlış sınıf seçerse müfredat yanlış yüklenir
Önlem: Koç sınıfı değiştirebilir (Students.Grade güncellenebilir)
Müfredat bağlantıları güncellenerek özelleştirilir

Risk 10: Timezone sorunları — öğrenci Türkiye dışındaysa
MVP kapsamı: Tüm kullanıcılar Türkiye (UTC+3) varsayımı
Tüm tarihler ISO8601 UTC kaydedilir, gösterimde UTC+3'e çevrilir
Gelecekte: Kullanıcı timezone ayarı

Risk 11: Cloudflare R2 Presigned URL sızması
Senaryo: Öğrenci A, öğrenci B'nin ödev fotoğrafına ait presigned URL'yi ele geçirir.
Belirti: Yetkisiz dosya erişimi — sistem bunu loglamaz, tespit edilemez.

UYGULAMA ADIMLARI:
  Adım 1 — Backend'de ownership kontrolü (her presigned URL isteğinde):
    a. JWT'den aktif kullanıcının kimliğini al (studentId veya coachId)
    b. İstenen dosyanın DB kaydından owner'ını çek
    c. Eşleşmiyorsa → 403 Forbidden döndür, R2'ye hiç gitme
    d. Yalnızca eşleşiyorsa → Presigned URL üret ve döndür

  Adım 2 — Tahmin edilemez dosya path'i:
    Format: uploads/{randomUUID}/{studentId}/{timestamp}_{orijinalAd}
    Örnek:  uploads/f47ac10b-58cc/std_abc123/1727123456_odev.jpg
    Böylece URL'yi bilen biri bile path'den öğrenci kimliğini çıkaramaz.

  Adım 3 — Presigned URL ömrü: 3600 saniye (1 saat)
    URL sona erdiğinde tekrar backend'den alınması gerekir → kontrol tekrarlanır.
    "Kalıcı link" kullanmak kesinlikle yasak — R2'de public access kapalı tutulur.

  Adım 4 — DB'de dosya kaydı (Faz 2 için şimdiden modellenir):
    FileUploads tablosu:
      Id         UUID PK
      OwnerId    UUID (studentId veya coachId)
      OwnerType  TEXT ('Student','Coach')
      R2Key      TEXT (bucket içi tam path)
      FileName   TEXT (orijinal ad)
      MimeType   TEXT
      SizeBytes  INTEGER
      CreatedAt  TEXT

MALİYET: Tamamen ücretsiz (R2 free tier: 10 GB/ay, egress ücretsiz)
ÜCRETSİZ ALTERNATİF: Supabase Storage da aynı presigned URL modelini sunar,
  free tier 1 GB — MVP'de dosya yükleme yoksa şimdilik karar ertelenebilir.

---

Risk 12: Neon connection string GitHub'a push edilmesi
Senaryo: .env dosyası yanlışlıkla commit edilir, Neon credentials ifşa olur.
Belirti: Veritabanına yetkisiz erişim — tüm kullanıcı verisi risk altında.

UYGULAMA ADIMLARI (kodlamadan önce, bir kez yapılır):

  Adım 1 — .gitignore dosyasına ekle (repo kökünde):
    .env
    .env.local
    .env.development
    .env.production
    .env.*.local
    backend/appsettings.Development.json
    backend/appsettings.Production.json
    Bu dosyalar repo'ya hiç girmez.

  Adım 2 — GitHub Repository Secrets kur:
    GitHub repo → Settings → Secrets and variables → Actions → New secret
    Eklenecek secret'lar:
      NEON_DATABASE_URL      → postgresql://user:pass@host/db?sslmode=require
      GOOGLE_CLIENT_ID       → Google OAuth client id
      GOOGLE_CLIENT_SECRET   → Google OAuth secret
      JWT_SECRET             → minimum 32 karakter random string
      R2_ACCESS_KEY_ID       → Cloudflare R2 API key
      R2_SECRET_ACCESS_KEY   → Cloudflare R2 API secret
      R2_BUCKET_NAME         → mentorum-uploads
      R2_ENDPOINT_URL        → https://{accountId}.r2.cloudflarestorage.com

  Adım 3 — CI pipeline'da secret'ı env'e bağla (.github/workflows/ci.yml):
    env:
      NEON_DATABASE_URL: ${{ secrets.NEON_DATABASE_URL }}

  Adım 4 — git-secrets kur (yerel geliştirici makinesi, ücretsiz):
    Kurulum:
      brew install git-secrets   # macOS
      # veya: https://github.com/awslabs/git-secrets
    Aktifleştir:
      git secrets --install
      git secrets --add 'postgresql://.*:.*@'    # Neon bağlantı pattern'ı
      git secrets --add 'AKIA[0-9A-Z]{16}'       # AWS/R2 key pattern
    Artık bu pattern'ı içeren dosyayı commit etmeye çalışınca hata verir.

  Adım 5 — Sızma olursa acil müdahale:
    a. Neon paneli → Database → Reset password (30 saniye — eski string çalışmaz)
    b. GitHub repo → Settings → Secrets → Secret'ı güncelle
    c. git history'den temizle: git filter-repo veya BFG Repo Cleaner

MALİYET: Tamamen ücretsiz (GitHub Secrets builtin, git-secrets açık kaynak)

---

Risk 13: GitHub Actions deploy başarısız, uygulama bozuk yayında kalır
Senaryo: Test geçer, deploy başlar ama yarıda patlar; kullanıcılar bozuk sürümle karşılaşır.
Belirti: 500 hatalar, boş sayfalar, veri kaybı riski.

UYGULAMA ADIMLARI:

  Adım 1 — GitHub Environment kur (ücretsiz, builtin):
    GitHub repo → Settings → Environments → New environment → "production"
    "Required reviewers" alanına kendin ekle.
    Artık production deploy'u otomatik çalışmaz — sen onaylayana kadar bekler.

    .github/workflows/deploy.yml örnek yapısı:
      jobs:
        test:
          runs-on: ubuntu-latest
          steps: [ ... test adımları ... ]

        deploy:
          needs: [test]           # test geçmeden çalışmaz
          environment: production # ← sen onaylayana kadar bekler
          runs-on: ubuntu-latest
          steps: [ ... deploy adımları ... ]

        health-check:
          needs: [deploy]
          runs-on: ubuntu-latest
          steps:
            - name: Uygulama sağlık kontrolü
              run: |
                sleep 30   # deploy yerleşsin
                curl --fail https://dersmatris.com/health || exit 1

  Adım 2 — Backend'de /health endpoint'i (zorunlu):
    GET /health → 200 OK + { "status": "ok", "db": "connected", "version": "1.0.0" }
    Bu endpoint auth gerektirmez.
    DB bağlantısı kopuksa → 503 döndür → pipeline "başarısız" sayar.

  Adım 3 — Rollback stratejisi (MVP için basit yol):
    Fly.io veya Railway kullanılıyorsa: her ikisi de rolling deploy yapar.
    Yeni container sağlıklıysa → eskisi kapanır.
    Yeni container /health'e cevap vermiyorsa → deploy durdurulur, eski ayakta kalır.
    Bu davranış otomatiktir, ek yapılandırma gerekmez.

  Adım 4 — Neon migration güvenliği (kritik):
    DB migration deploy'dan ÖNCE ayrı adım olarak çalışır.
    Migration başarısızsa deploy adımı hiç çalışmaz.
    Migration'lar daima geri alınabilir (DOWN migration) yazılır.
    Örnek iş akışı:
      1. Migration çalış → başarısız → pipeline dur → deploy çalışmaz → mevcut sürüm ayakta
      2. Migration çalış → başarılı → deploy çalış → health-check → başarılı → bitti

MALİYET: Tamamen ücretsiz
  GitHub Environments: ücretsiz (public ve private repo)
  Fly.io free tier: 3 shared-cpu VM, rolling deploy dahil
  Railway free tier: $5 kredi/ay, rolling deploy dahil
  Kendi VPS varsa: mevcut sunucu yeterli, ek maliyet yok
