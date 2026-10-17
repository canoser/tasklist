# 🧭 Mentörüm — V9 Kodlama Spesifikasyonu

> **Tarih:** 17 Ekim 2026 · **Uygulayıcı:** Gemini (kodlama)
> **Amaç:** Aşağıdaki görevler, verilen dosya yolu, endpoint, DTO alanı, SQL kolonu ve isimler **birebir** kullanılarak uygulanır. Yorum yapılmaz; belgede verilmeyen bir detay **icat edilmez**. Bir görevde belirsizlik varsa uygulama durdurulur ve kullanıcıya sorulur (AGENTS.md C2).
> **Sıralama:** Görevler **T01 → T99** artan sırada uygulanır: önce migration (T01–T07), sonra backend, sonra frontend, sonra test. Bir görev `dotnet build` + `dotnet test` (backend) veya `npm run build` (frontend) geçmeden sonrakine geçilmez.

---

## 0. Zorunlu Kurallar

### 0.1 Güvenlik / Tenant / IDOR (her endpoint için)
- Sahiplik doğrulaması:
  - **Koç:** `ProgramAccessGuard.EnsureCoachInProgramAsync(coachId, programId)` veya `EnsureCoachOwnsStudentAsync(coachId, studentId)`.
  - **Öğretmen:** `ProgramAccessGuard.IsTeacherOfCourseAsync(teacherId, courseId)`.
  - **Veli:** `ProgramAccessGuard.IsParentOfStudentAsync(parentId, studentId)` + `student_parents.is_accepted = 1`.
  - **Öğrenci:** JWT içindeki `student_id` claim'i.
- Guard çağrılsa bile SQL'de `AND program_id = @ProgramId` / `AND student_id = @StudentId` koşulları korunur (defense-in-depth).
- Öğrenci verisi `MaskStudent` ile maskelenir; veli/öğretmen koç özel notunu asla göremez.
- **Finans verisi yalnızca koç + yetkili veli:** öğretmen/öğrenci finans endpoint'lerine `403`.
- Hard-delete yok; pasife alma `is_active = 0` / `status = 'CANCELLED'`.
- Birden çok tabloya yazan her işlem `using var tx = conn.BeginTransaction()` içinde.

### 0.2 Frontend
- Renk yalnızca token (`var(--color-*)`, `var(--bg-*)`, `var(--text-*)`, `var(--border-color)`); hex yasak.
- Metin doğrudan Türkçe (i18n zorunlu değil). CSS Modules kullanılır. Modal `common/Modal` portalı üzerinden açılır.
- Yeni sekme/buton eklenirken ilgili layout + `App.jsx` rotası **birlikte** güncellenir.

### 0.3 Doğrulama komutları
- Backend: `dotnet build Mentorum.sln` → 0 hata; `dotnet test Mentorum.sln` → tümü yeşil (Testcontainers, Docker gerekir).
- Frontend: `cd Frontend && npm run build` → 0 hata.

---

## 1. Migration Planı (T01–T07, sıralı)

> Dosyalar `Backend/MentorumApi/Data/Migrations/` altına, **tam olarak** aşağıdaki içerikle yazılır. Ek kolon/indeks/constraint eklenmez.

### T01 — `004_teacher_assignment_status.sql`
```sql
ALTER TABLE courses ADD COLUMN IF NOT EXISTS assignment_status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ NULL;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS end_reason VARCHAR(255) NULL;
ALTER TABLE program_teachers ADD COLUMN IF NOT EXISTS assignment_status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE program_teachers ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ NULL;
ALTER TABLE program_teachers ADD COLUMN IF NOT EXISTS end_reason VARCHAR(255) NULL;
```

### T02 — `005_parent_visibility_flags.sql`
```sql
ALTER TABLE student_parents ADD COLUMN IF NOT EXISTS can_view_exams INTEGER NOT NULL DEFAULT 0;
ALTER TABLE student_parents ADD COLUMN IF NOT EXISTS can_view_homework INTEGER NOT NULL DEFAULT 0;
ALTER TABLE student_parents ADD COLUMN IF NOT EXISTS can_view_calendar INTEGER NOT NULL DEFAULT 0;
ALTER TABLE student_parents ADD COLUMN IF NOT EXISTS can_view_study_stats INTEGER NOT NULL DEFAULT 0;
ALTER TABLE student_parents ADD COLUMN IF NOT EXISTS can_view_payments INTEGER NOT NULL DEFAULT 0;
```
> Tümü `INTEGER DEFAULT 0` (fail-closed). Anne/baba ayrı `student_parents` satırları olduğu için yetki veli başına bağımsızdır.

### T03 — `006_approval_items.sql`
```sql
CREATE TABLE IF NOT EXISTS approval_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL,
  entity_type VARCHAR(32) NOT NULL,
  entity_id UUID NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ NULL,
  resolved_by UUID NULL,
  rejection_reason VARCHAR(255) NULL,
  UNIQUE (entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_approval_items_program_status ON approval_items(program_id, status);
```
> `entity_type`: `HOMEWORK_DONE` | `SCHEDULE_CHANGE` | `PAYMENT_CLAIM`. `status`: `PENDING` | `APPROVED` | `REJECTED`. `UNIQUE(entity_type, entity_id)` mükerrer talebi engeller.

### T04 — `007_teacher_notes_visibility.sql`
```sql
ALTER TABLE teacher_notes ADD COLUMN IF NOT EXISTS visibility VARCHAR(16) NOT NULL DEFAULT 'STUDENT_VISIBLE';
ALTER TABLE teacher_notes ADD COLUMN IF NOT EXISTS summary TEXT NULL;
```
> `visibility`: `STUDENT_VISIBLE` | `COACH_ONLY`. Mevcut `note` kolonu = tam not (yalnızca koç görür); `summary` = öğrenci/veliye gösterilen kısa özet.

### T05 — `008_study_sessions.sql`
```sql
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL,
  student_id UUID NOT NULL,
  subject_id UUID NULL,
  curriculum_topic_id UUID NULL,
  minutes INTEGER NOT NULL DEFAULT 0,
  question_count INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  wrong INTEGER NOT NULL DEFAULT 0,
  blank INTEGER NOT NULL DEFAULT 0,
  source_type VARCHAR(16) NOT NULL DEFAULT 'MANUAL',
  started_at TIMESTAMPTZ NULL,
  ended_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_study_sessions_student ON study_sessions(student_id);
```
> `source_type`: `CHRONOMETER` | `MANUAL` | `QUICK_LOG`.

### T06 — `009_personal_events_category.sql`
```sql
ALTER TABLE personal_events ADD COLUMN IF NOT EXISTS category VARCHAR(16) NULL;
```
> `category`: `SLEEP` | `SPORT` | `SOCIAL` | `SCHOOL` | `REST`.

### T07 — `010_payments.sql`
```sql
CREATE TABLE IF NOT EXISTS payment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL,
  student_id UUID NOT NULL,
  parent_id UUID NULL,
  period_type VARCHAR(16) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'TRY',
  month_day INTEGER NULL,
  start_date DATE NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS payment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL,
  due_date DATE NOT NULL,
  base_amount NUMERIC(12,2) NOT NULL,
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  currency VARCHAR(8) NOT NULL DEFAULT 'TRY',
  paid_at TIMESTAMPTZ NULL,
  rolled_from_item_id UUID NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  method VARCHAR(32) NULL,
  recorded_by UUID NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(16) NOT NULL DEFAULT 'PAID',
  receipt_url TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
> `period_type`: `FOUR_WEEK` | `MONTHLY_DAY` | `PER_LESSON` | `PER_SESSION`. `payment_items.status`: `PENDING` | `PARTIAL` | `PAID` | `OVERDUE` | `CANCELLED` | `ROLLED_OVER`. Tüm tutarlar `NUMERIC(12,2)`.

## 2. Backend Görevleri

### T08 — Derse öğrenci eklemede program izolasyonu (§1.1)
- **Dosya:** `Backend/MentorumApi/Data/CourseRepository.cs`
- **Yap:** Derse öğrenci ekleyen metotta, eklemeden önce öğrencinin dersin `program_id`'sine ait olduğunu doğrula (`students.program_id = @ProgramId`). Ait değilse istisna fırlat. Ekleme SQL'ine `AND course.program_id = @ProgramId` koşulunu koru.
- **Kabul:** Program dışı öğrenci derse eklenemez; IDOR testi yeşil.

### T09 — Öğretmen görev sonlandırma → `assignment_status` (§1.3)
- **Dosya:** `Backend/MentorumApi/Data/TeacherRepository.cs`
- **Yap:** `DeactivateTeacherAsync` metodunda `program_teachers.is_active = 0` yapılan yere ek olarak `program_teachers.assignment_status = 'ENDED'`, `ended_at = NOW()`, `end_reason = @Reason` yaz. İlgili `courses` satırlarına da `teacher_id = NULL` + `assignment_status = 'ENDED'`, `ended_at = NOW()` yaz. Global `teachers.is_active = 0` davranışı (başka aktif program yoksa) korunur.
- **Kabul:** Pasife alınan öğretmenin `program_teachers.assignment_status = 'ENDED'` ve `courses.assignment_status = 'ENDED'` olur; tarihsel veriler korunur.

### T10 — Guard'a öğretmen aktiflik kontrolü (§1.3)
- **Dosya:** `Backend/MentorumApi/Services/ProgramAccessGuard.cs`
- **Yap:** Öğretmen yetkisini doğrulayan kontrollere `assignment_status = 'ACTIVE'` koşulunu ekle (`is_active = 1` yanında).
- **Kabul:** `ENDED` durumundaki öğretmen derslerine erişemez (403).

### T11 — Grup ödev atamasında fork (transaction) (§1.4)
- **Dosya:** `Backend/MentorumApi/Data/HomeworkRepository.cs`
- **Yap:** Grup ataması yapılan metodda, gruptaki her öğrenci için ayrı `homework_assignments` satırı `using var tx = conn.BeginTransaction()` içinde oluştur. Her öğrencinin `completion_percentage`/`status` bağımsızdır.
- **Kabul:** Aynı grup ödevinde öğrenci A %100, öğrenci B %50 olabilir; atama tek transaction'da ya tam olur ya hiç olmaz.

### T12 — Sınav + video/kaynak fork (§1.5)
- **Dosya:** `Backend/MentorumApi/Data/ExamRepository.cs` + `Backend/MentorumApi/Data/CourseResourceRepository.cs`
- **Yap:** Grup bazlı sınav/kaynak atamalarında her öğrenci için bağımsız `exam_results` ve `course_resource_progress` satırı aç. **Kural:** Gruba sonradan eklenen öğrenciye geçmiş ödev/sınav/kaynak kopyalanmaz; yalnızca ekleme anından sonraki atamalar geçerlidir.
- **Kabul:** Geç katılan öğrenciye geçmiş kayıt açılmaz; yeni atamalar her öğrenciye bağımsız açılır.

### T13 — Koç takvimi çoklu filtre (§2.1)
- **Dosya:** `Backend/MentorumApi/Data/CalendarRepository.cs`
- **Yap:** Koç takvim sorgusuna filtre parametreleri ekle: `program_id`, `student_id`, `course_id`, `teacher_id`, `event_type`. `HOMEWORK_DUE` ve `PAYMENT_DUE` dallarını `UNION ALL`'a ekle ve her dala `@From`/`@To` tarih aralığı koşulunu enjekte et.
- **Kabul:** Koç takvimi bu 5 filtre + tarih aralığıyla filtrelenir; tüm dallar tarih aralığına uyar.

### T14 — Takvim endpoint filtre parametreleri (§2.1)
- **Dosya:** `Backend/MentorumApi/Endpoints/CalendarEndpoints.cs`
- **Yap:** Koç takvim GET ucuna optional query parametreleri ekle: `programId`, `studentId`, `courseId`, `teacherId`, `eventType` (`COACHING_SESSION|TEACHER_LESSON|EXAM|HOMEWORK_DUE|PAYMENT_DUE`). Bunları T13'teki repository metoduna geçir.
- **Kabul:** Parametresiz çağrı eski davranışı korur; parametreli çağrı filtre uygular.

### T15 — Veli görünürlük bayrakları repository (§2.2)
- **Dosya:** Yeni `Backend/MentorumApi/Data/ParentVisibilityRepository.cs`
- **Yap:** `GetParentPermissionsAsync(studentId, parentId)` (5 bayrağı döner) ve `UpdateParentPermissionsAsync(studentId, parentId, flags)` metotları ekle. Güncelleme SQL'i yalnızca 5 bayrağı (`can_view_exams, can_view_homework, can_view_calendar, can_view_study_stats, can_view_payments`) günceller.
- **Kabul:** Bayraklar `student_parents` tablosundan okunur/yazılır; başka kolon değişmez.

### T16 — Veli yetkileri endpoint'leri (§2.2)
- **Dosya:** `Backend/MentorumApi/Endpoints/StudentEndpoints.cs`
- **Yap:** `GET /api/v1/students/{studentId}/parents/{parentId}/permissions` (koç, `EnsureCoachOwnsStudentAsync`) ve `PUT` aynı yolda. PUT body DTO `UpdateParentPermissionsRequest { bool CanViewExams; bool CanViewHomework; bool CanViewCalendar; bool CanViewStudyStats; bool CanViewPayments; }`.
- **Kabul:** Koç veli bayraklarını okur/yazar; yetkisiz koç 403.

### T17 — Onay merkezi repository + endpoint (§2.3)
- **Dosya:** Yeni `Backend/MentorumApi/Data/ApprovalRepository.cs` + `Backend/MentorumApi/Endpoints/ApprovalEndpoints.cs`
- **Yap:** `approval_items` için: `ListAsync(programId, status?)`, `ApproveAsync(id, coachId)`, `RejectAsync(id, coachId, reason)`. Endpoint'ler:
  - `GET /api/v1/programs/{programId}/approvals?status=PENDING` (koç, `EnsureCoachInProgramAsync`)
  - `POST /api/v1/approvals/{id}/approve` (koç, program sahipliği + `status='PENDING'` kontrolü)
  - `POST /api/v1/approvals/{id}/reject` (koç, body `{ reason }`)
  - Onay/red `using var tx` içinde: `approval_items.status/resolved_at/resolved_by/rejection_reason` güncelle + ilgili `COACH_APPROVAL_*` bildirimi yaz.
- **Kabul:** Aynı öğe iki kez onaylanamaz; `Program.cs`'e `app.MapApprovalEndpoints()` eklenir.

### T18 — Öğretmen takviminde meşguliyet maskesi (§3.1)
- **Dosya:** `Backend/MentorumApi/Data/ScheduleRepository.cs` + `Backend/MentorumApi/Endpoints/ScheduleEndpoints.cs`
- **Yap:** Öğretmen takvim/schedule ucunda, öğretmenin yetkili olmadığı ders/koçluk seansı aralıklarını `{ start, end, isBusyOnly: true }` olarak dön. Bu bloklarda `title`, öğrenci adı ve diğer öğretmenin kimliği **hiçbir alanda** dönmez. DTO seviyesinde `isBusyOnly=true` ise yalnızca `start`/`end`/`isBusyOnly` alanları serileştirilir.
- **Kabul:** Öğretmen başka öğretmenin ders başlığını/öğrenci adını göremez; yalnızca gri "Meşgul" bloğu görür.

### T19 — Öğretmen notu görünürlük + CRUD (§3.2, §3.5)
- **Dosya:** `Backend/MentorumApi/Data/TeacherRepository.cs` + `Backend/MentorumApi/Endpoints/TeacherEndpoints.cs`
- **Yap:**
  1. Mevcut `POST /api/v1/teacher/courses/{courseId}/students/{studentId}/notes` body'sine `visibility` (`STUDENT_VISIBLE`|`COACH_ONLY`) ve `summary` (nullable) alanlarını ekle; `note` tam not olarak yazılır.
  2. Mevcut `GET` (öğretmen) notların tamamını döner (`note` + `summary` + `visibility` + `createdAt`).
  3. Yeni `GET /api/v1/student/teacher-notes` (öğrenci, kendi) ve `GET /api/v1/parent/children/{studentId}/teacher-notes` (veli, `IsParentOfStudentAsync`): yalnızca `visibility='STUDENT_VISIBLE'` olanların `summary`+`createdAt` alanlarını döner; `note` ve `COACH_ONLY` kayıtlar **dönmez**.
- **Kabul:** Öğrenci/veli koç-özel notu ve `COACH_ONLY` kaydı göremez; öğretmen/koç tam notu görür.

### T20 — Öğretmen ders kaynakları endpoint'i (§3.6)
- **Dosya:** `Backend/MentorumApi/Endpoints/TeacherEndpoints.cs` + `Backend/MentorumApi/Data/CourseResourceRepository.cs`
- **Yap:** `GET /api/v1/teacher/courses/{courseId}/resources` ekle (`IsTeacherOfCourseAsync`). Sorumlu olduğu dersin kaynaklarını (id, title, type, url) ve varsa öğrenci tamamlama sayısını döner.
- **Kabul:** Öğretmen yalnızca kendi dersinin kaynaklarını görür; başka ders 403.

### T21 — Çalışma oturumu repository + endpoint'leri (§4.1, §4.3, §7.2)
- **Dosya:** Yeni `Backend/MentorumApi/Data/StudySessionRepository.cs` + `Backend/MentorumApi/Endpoints/StudentEndpoints.cs`
- **Yap:**
  - `CreateAsync(session)` (kronometre/manual/quick-log; `source_type` set edilir).
  - `ListAsync(studentId, from, to)`.
  - `UpdatePrepAsync(sessionId, prepNotes)` — mevcut `/student/sessions/{id}/prep` davranışı.
  - `POST /api/v1/student/study-sessions` body: `{ subjectId?, curriculumTopicId?, minutes, questionCount, correct, wrong, blank, sourceType, startedAt?, endedAt? }`.
  - `GET /api/v1/student/study-sessions?from=&to=`.
- **Kabul:** Oturum `program_id` öğrencinin programından alınır; öğrenci yalnızca kendi oturumlarını görür.

### T22 — Net hesaplama servisi (§4.2)
- **Dosya:** Yeni `Backend/MentorumApi/Services/NetCalculator.cs`
- **Yap:** `ComputeNet(correct, wrong, blank, track)` → `decimal`. Kural: `track='ORTAOKUL'` ise `correct - (wrong/3.0)`; diğer (`SAY`/`EA`/`SOZ`) ise `correct - (wrong/4.0)`. Sonuç `NUMERIC(6,2)`'ye yuvarlanır. Başarı % = `correct / questionCount * 100`.
- **Kabul:** T22 servisi T21 ve T23'te kullanılır; LGS 3Y=1D, YKS 4Y=1D.

### T23 — Konu istatistik + haftalık zaman bütçesi (§4.4, §4.6)
- **Dosya:** `Backend/MentorumApi/Data/ReportsRepository.cs`
- **Yap:** `GetStudentSubjectStatsAsync(studentId)` (ders/konu başına toplam dakika + soru + net) ve `GetWeeklyTimeBudgetAsync(studentId)` (çalışma süreleri + `personal_events` kategori süreleri) ekle.
- **Kabul:** Koç/öğrenci bu verileri T23'ü çağıran endpoint'lerden alır; sahiplik doğrulanır.

### T24 — Kişisel etkinlik kategorisi (§4.5)
- **Dosya:** `Backend/MentorumApi/Data/CalendarRepository.cs` (kişisel etkinlik ekleyen metod)
- **Yap:** `personal_events` ekleme/güncelleme SQL'ine `category` kolonunu dahil et (`SLEEP|SPORT|SOCIAL|SCHOOL|REST`).
- **Kabul:** Etkinlik `category` ile kaydedilir ve okunur.

### T25 — Veli çalışma istatistiği özeti endpoint'i (§5.3)
- **Dosya:** `Backend/MentorumApi/Endpoints/ParentEndpoints.cs`
- **Yap:** `GET /api/v1/parent/children/{studentId}/study-stats` ekle (`IsParentOfStudentAsync` + `can_view_study_stats=1`). Haftalık toplam dakika + soru döner.
- **Kabul:** İzin verilmemişse 403; izinli veli yalnızca kendi çocuğunun verisini görür.

### T26 — Ödeme plan servisi + endpoint'leri (§6.2, §6.3)
- **Dosya:** Yeni `Backend/MentorumApi/Services/PaymentPlanService.cs` + `Backend/MentorumApi/Endpoints/PaymentEndpoints.cs` + `Backend/MentorumApi/Data/PaymentRepository.cs`
- **Yap:** `PaymentPlanService.GenerateItemsAsync(plan)` periyoda göre kalem üretir: `FOUR_WEEK` (28 gün), `MONTHLY_DAY` (`month_day`), `PER_LESSON` (schedule_slots `DERS`), `PER_SESSION` (coaching_sessions). Endpoint'ler:
  - `GET/POST/PUT/DELETE /api/v1/programs/{programId}/payment-plans` (koç)
  - `POST /api/v1/payment-items/{itemId}/collect` (koç; body `{ amount, method }`) → `payments` satırı + `payment_items.paid_amount`/`status` güncelle (transaction)
  - `GET /api/v1/parent/children/{studentId}/payments` (veli; `IsParentOfStudentAsync` + `can_view_payments=1` + `is_accepted=1`)
- **Kabul:** Öğretmen/öğrenci finans uçlarına 403; koç plan CRUD + tahsilat yapar; veli salt-okunur. `Program.cs`'e `app.MapPaymentEndpoints()` eklenir.

### T27 — Kısmi ödeme + bakiye devri (§6.5)
- **Dosya:** `Backend/MentorumApi/Data/PaymentRepository.cs`
- **Yap:** Tahsilatta `amount < base_amount` ise item `PARTIAL` kalır; kalan `base_amount - paid_amount` sonraki `PENDING` kaleme devredilir (`rolled_from_item_id` bağı kurulur). İşlem `using var tx` içinde.
- **Kabul:** `paid_amount` + "Kalan Bakiye" aynı satırda izlenir; rollover izlenebilir.

### T28 — Ders/seans iptali → ödeme kalemi rollover (§6.6)
- **Dosya:** `Backend/MentorumApi/Data/ScheduleRepository.cs` (iptal/erteleme metodu) + `Backend/MentorumApi/Data/PaymentRepository.cs`
- **Yap:** `PER_LESSON`/`PER_SESSION` planlarında ilgili ders/seans `İptal`/`Ertelendi` olduğunda bağlı `payment_item` `CANCELLED`/`ROLLED_OVER` olur ve sonraki kaleme kayar; tek transaction.
- **Kabul:** İptal edilen ders için ödeme talep edilmez; bakiye doğru kayar.

### T29 — Veli "ödeme yaptım" bildirimi → onay (§6.7)
- **Dosya:** `Backend/MentorumApi/Endpoints/PaymentEndpoints.cs` + `Backend/MentorumApi/Data/ApprovalRepository.cs`
- **Yap:** `POST /api/v1/parent/children/{studentId}/payment-claims` (veli) → `approval_items`'a `PAYMENT_CLAIM` (`entity_id=payment_item.id`) kaydı düşer (idempotent). Koç onayladığında (T17 `Approve`) transaction içinde: `payments` satırı + `payment_item` `PAID`/`PARTIAL` + onay kapanır.
- **Kabul:** Veli ödeme bildirimi koç onay merkezine düşer; onay tek transaction'da tamamlanır.

### T30 — Koç için öğretmen notları endpoint'i (§8, koç görünümü)
- **Dosya:** `Backend/MentorumApi/Endpoints/StudentEndpoints.cs`
- **Yap:** `GET /api/v1/students/{studentId}/teacher-notes` (koç, `EnsureCoachOwnsStudentAsync`) → öğrencinin tüm öğretmen notlarını (`note` + `summary` + `visibility` + `teacherId` + `createdAt`) döner.
- **Kabul:** Koç öğretmenin pedagojik notlarını görür; başka öğrenci 403.

### T31 — "Rol Gözüyle Gör" (View As) sandbox (§7.1)
- **Dosya:** Yeni `Backend/MentorumApi/Middleware/ViewAsMiddleware.cs`
- **Yap:** Koç `X-View-As-Student-Id` / `X-View-As-Parent-Id` / `X-View-As-Teacher-Id` header'ıyla istek atar. Middleware, hedef rolün yetki hesaplamasını uygular ama **tüm mutasyonları (POST/PUT/PATCH/DELETE) 403** ile reddeder. `Program.cs`'e `app.UseViewAs()` ekle.
- **Kabul:** View-As salt-okunur; koç kendi yetkisi dışındaki veriye simülasyonla bile erişemez.

### T32 — `ProgramAccessGuard` yaygınlaştır (§8 refactor)
- **Dosya:** `Backend/MentorumApi/Endpoints/StudentEndpoints.cs`, `CourseEndpoints.cs`, `GroupEndpoints.cs`, `HomeworkEndpoints.cs`
- **Yap:** Dağınık `IsMemberAsync`/inline sahiplik kontrollerini `ProgramAccessGuard` metotlarına taşı. Sıra: önce `HomeworkEndpoints` + `CourseEndpoints` (test yeşil kalır), sonra `StudentEndpoints` + `GroupEndpoints`.
- **Kabul:** Davranış değişmez; `dotnet test` tamamı yeşil.

## 3. Frontend Görevleri

### T33 — Şifre Sıfırlama Sayfası (P0)
- **Dosya:** Yeni `Frontend/src/features/auth/ResetPasswordPage.jsx` + `Frontend/src/App.jsx` + `Frontend/src/features/auth/LoginPage.jsx`
- **Yap:**
  - `ResetPasswordPage`: `useSearchParams()` ile `?token=` oku; "Yeni Şifre" + "Şifre Tekrarı" formu; `POST /auth/reset-password` body `{ token, newPassword }`; başarıda `/login`'e yönlendir.
  - `App.jsx`: `<Route path="/reset-password" element={<ResetPasswordPage />} />` (korumasız, catch-all'dan önce).
  - `LoginPage`: "Şifremi unuttum" bağlantısı → e-posta alanı → `POST /auth/forgot-password`; başarıda "Eğer e-posta kayıtlıysa sıfırlama bağlantısı gönderildi." mesajı.
- **Kabul:** E-postadaki `/reset-password?token=...` linki formu açar; kullanıcı yeni şifre belirleyip giriş yapar.

### T34 — Onay merkezi ekranı + menü (§2.4, §2.5)
- **Dosya:** Yeni `Frontend/src/features/coach/approvals/ApprovalsPage.jsx` + `Frontend/src/components/layout/CoachLayout/CoachLayout.jsx` + `Frontend/src/App.jsx`
- **Yap:** Onay kuyruğu listesi (`GET /api/v1/programs/{programId}/approvals?status=`), "Onayla"/"Reddet" (`POST .../approve`, `.../reject`), "Tümünü Onayla" ve durum filtresi. `CoachLayout` menüsüne `{ path: '/coach/approvals', label: 'Onaylar' }` ekle; `App.jsx`'e `/coach/approvals` rotası.
- **Kabul:** Koç onayları tek ekrandan onaylar/reddeder; tekrar onay engellenir.

### T35 — Koç takvimi filtre barı (§2.1)
- **Dosya:** `Frontend/src/features/coach/calendar/CalendarPage.jsx` + `Frontend/src/features/coach/coachApi.js`
- **Yap:** `useCalendarEvents` hook'una filtre parametreleri ekle (`programId, studentId, courseId, teacherId, eventType`). `CalendarPage`'e çip/dropdown filtre barı ekle.
- **Kabul:** Filtre seçildiğinde takvim o filtrelere göre güncellenir.

### T36 — Veli yetkileri paneli (§2.2)
- **Dosya:** `Frontend/src/features/coach/student-detail/CoachStudentDetail.jsx` + `Frontend/src/features/coach/coachApi.js`
- **Yap:** Veli sekmesine, her veli için 5 toggle (`can_view_exams`, `can_view_homework`, `can_view_calendar`, `can_view_study_stats`, `can_view_payments`). `GET/PUT /api/v1/students/{id}/parents/{parentId}/permissions` hook'ları.
- **Kabul:** Koç her velinin görünürlüğünü ayrı ayrı açar/kapar.

### T37 — Öğretmen not modalı (§3.5)
- **Dosya:** `Frontend/src/features/teacher/teacherApi.js` + `Frontend/src/features/teacher/courses/TeacherCoursesPage.jsx`
- **Yap:** `useTeacherStudentNotes(courseId, studentId)` (GET) + `useCreateTeacherNote()` (POST) hook'ları. `TeacherCoursesPage` "Öğrenciler" sekmesindeki her öğrenci kartına "Ders Notları" butonu + modal: geçmiş notlar (tarih sırası) + yeni not (alanlar: `note`, `summary`, `visibility` seçici).
- **Kabul:** Öğretmen öğrenciye not yazar ve geçmiş notları görür.

### T38 — Öğretmen ders kaynakları sekmesi (§3.6)
- **Dosya:** `Frontend/src/features/teacher/teacherApi.js` + `Frontend/src/features/teacher/courses/TeacherCoursesPage.jsx`
- **Yap:** `useTeacherCourseResources(courseId)` hook'u (`GET /api/v1/teacher/courses/{courseId}/resources`). `TeacherCoursesPage`'e "Kaynaklar" sekmesi ekle (liste + tamamlanma durumu).
- **Kabul:** Öğretmen kendi dersinin kaynaklarını görür.

### T39 — Öğretmen meşguliyet + ders tamamlama (§3.1, §3.3)
- **Dosya:** `Frontend/src/features/teacher/schedule/TeacherSchedulePage.jsx` + `Frontend/src/features/teacher/courses/TeacherCoursesPage.jsx`
- **Yap:** Öğretmen programında `isBusyOnly` bloklarını gri "Öğrenci Meşgul" olarak göster. `TeacherCoursesPage`'e "Dersi Tamamla" aksiyonu: tamamlandığında iki alan (özet + koça özel) açılır ve not kaydedilir.
- **Kabul:** Meşgul bloklar içerik göstermez; ders tamamlama iki not tipi kaydeder.

### T40 — Öğrenci kronometresi (§4.3)
- **Dosya:** `Frontend/src/features/student/home/StudentHome.jsx` + `Frontend/src/features/student/studentApi.js`
- **Yap:** Canlı Pomodoro/sayaç + manuel "45 dk" girişi; kaydet `POST /api/v1/student/study-sessions` (`sourceType: 'CHRONOMETER'`).
- **Kabul:** Öğrenci çalışma oturumunu kronometreyle kaydeder.

### T41 — Konu bazlı istatistik ekranı (§4.4)
- **Dosya:** `Frontend/src/features/student/profile/StudentProfilePage.jsx` + `Frontend/src/features/student/studentApi.js`
- **Yap:** Ders/konu başına toplam dakika + soru + net grafikleri (T23 verisi).
- **Kabul:** Öğrenci konu istatistiklerini görür.

### T42 — Kişisel etkinlik kategorisi (§4.5)
- **Dosya:** `Frontend/src/components/common/PersonalEventModal/PersonalEventModal.jsx`
- **Yap:** Etkinlik türü seçimine `category` alanı ekle (`SLEEP|SPORT|SOCIAL|SCHOOL|REST`); kaydederken gönder.
- **Kabul:** Etkinlik kategoriyle kaydedilir.

### T43 — Haftalık zaman bütçesi grafiği (koç) (§4.6)
- **Dosya:** `Frontend/src/features/coach/student-detail/CoachStudentDetail.jsx` + `Frontend/src/features/coach/coachApi.js`
- **Yap:** "Ders vs Ders Dışı" haftalık grafik (çalışma süreleri + `personal_events` kategori süreleri, T23 verisi).
- **Kabul:** Koç öğrencinin haftalık zaman dağılımını görür.

### T44 — Öğrenci seans/video görünümü (§4.7)
- **Dosya:** `Frontend/src/features/student/calendar/StudentCalendarPage.jsx`
- **Yap:** Öğrenci takviminde geçmiş/gelecek koçluk seansları + dersler; video "izlendi/tamamlandı" işareti.
- **Kabul:** Öğrenci seans ve video durumunu takvimde görür.

### T45 — Öğrenci layout + rotalar (§4.8)
- **Dosya:** `Frontend/src/components/layout/StudentLayout/StudentLayout.jsx` + `Frontend/src/App.jsx`
- **Yap:** Yeni öğrenci ekranları için rotaları ve menü girişlerini tamamla (metinler doğrudan Türkçe).
- **Kabul:** Tüm yeni öğrenci ekranları menüden ulaşılabilir.

### T46 — Öğrenci takvim sekmesi (§4.9)
- **Dosya:** `Frontend/src/components/layout/StudentLayout/StudentLayout.jsx` + `StudentLayout.module.css`
- **Yap:** `tabs` dizisine `{ path: '/student/calendar', label: 'Takvim', icon: '🗓️' }` ekle. `bottomNav` için `overflow-x: auto` + `min-width: 56px` + `safe-area-inset` uyumu.
- **Kabul:** Öğrenci takvime alt menüden ulaşır; 6 sekme dar ekranda taşmaz.

### T47 — Veli dinamik sekmeler + EmptyState (§5.2)
- **Dosya:** `Frontend/src/components/layout/ParentLayout/ParentLayout.jsx` + `Frontend/src/features/parent/parentApi.js`
- **Yap:** Sekmeleri velinin bayraklarına göre dinamik göster (`GET` permissions). İzin verilmemiş sekme yerine nazik EmptyState: "Koçunuz henüz bu alanı erişime açmadı."
- **Kabul:** Veli yalnızca izinli sekmeleri görür; izinsiz alanda boş beyaz ekran yok.

### T48 — Veli sınavlar sekmesi (§5.4)
- **Dosya:** `Frontend/src/components/layout/ParentLayout/ParentLayout.jsx` + `ParentLayout.module.css`
- **Yap:** `tabs` dizisine `{ path: '/parent/exams', label: 'Sınavlar', icon: '📝' }` ekle. 5 sekme mobil uyumu (taşma + safe-area).
- **Kabul:** Veli sınavlara alt menüden doğrudan ulaşır.

### T49 — Veli ödeme ekranı + canlı paylaşım (§6.4)
- **Dosya:** Yeni `Frontend/src/features/parent/payments/ParentPaymentsPage.jsx` + `Frontend/src/features/parent/parentApi.js` + `Frontend/src/App.jsx`
- **Yap:** Plan + ödeme tablosu; koç tutar girdiğinde `refetchInterval` polling ile güncellenir. `GET /api/v1/parent/children/{studentId}/payments`.
- **Kabul:** Veli ödeme durumunu canlı görür (salt-okunur).

### T50 — Koç finans özeti (§6.8)
- **Dosya:** `Frontend/src/features/coach/dashboard/CoachDashboard.jsx`
- **Yap:** Geciken ödeme/bakiye rozetleri + takvimde "Ödeme Günü" etkinliği.
- **Kabul:** Koç geciken ödemeleri panelde görür.

### T51 — "Rol Gözüyle Gör" (View As) UI (§7.1)
- **Dosya:** `Frontend/src/components/layout/CoachLayout/CoachLayout.jsx` + `Frontend/src/features/coach/coachApi.js`
- **Yap:** Koç menüsüne "Gözüyle Gör" modu: veli/öğretmen seç → ilgili `X-View-As-*` header'ıyla salt-okunur önizleme. Mutasyon butonları gizlenir/devre dışı kalır.
- **Kabul:** Koç veli/öğretmen gözünden görür; hiçbir yazma işlemi yapılamaz.

### T52 — Quick-Log (tek tık veri girişi) (§7.2)
- **Dosya:** `Frontend/src/features/student/home/StudentHome.jsx` + `Frontend/src/features/student/studentApi.js`
- **Yap:** Video/konu kartı altında mini kutu ("Kaç soru? Kaç dakika?"), `sourceType: 'QUICK_LOG'` ile `study_sessions`'a yazar.
- **Kabul:** Öğrenci 5 sn içinde oturum kaydeder; başka sayfaya gitmez.

### T53 — Semantik durum rozeti (`StatusBadge`) (§7.3)
- **Dosya:** Yeni `Frontend/src/components/common/StatusBadge/StatusBadge.jsx`
- **Yap:** Tek bileşen: `Gecikti` → `var(--color-danger)`, `Bugün Son` → `var(--color-warning)`, `Tamamlandı` → `var(--color-success)`. Ödev + video + ödeme kalemlerinde kullan; `OverdueHomeworkJob` rozetlerini bu standarda taşı.
- **Kabul:** Tüm durum rozetleri aynı bileşenden, token renklerle.

### T54 — Ödev-ders bağlantısı (form) (§8)
- **Dosya:** `Frontend/src/features/coach/homework/AssignHomeworkModal.jsx` + `Frontend/src/features/coach/coachApi.js`
- **Yap:** Forma opsiyonel "Ders Seçimi" (`<select>`) ekle; `useAssignHomework` body'sine `courseId` ekle.
- **Kabul:** Koç ödevi derse bağlayınca ödev, o dersin öğretmeninin "Ödevler" sekmesinde görünür.

### T55 — Koç ekranında öğretmen notları (§8)
- **Dosya:** `Frontend/src/features/coach/student-detail/CoachStudentDetail.jsx` + `Frontend/src/features/coach/coachApi.js`
- **Yap:** "Öğretmen Notları" sekmesi/kartı ekle; `GET /api/v1/students/{id}/teacher-notes` çağırır.
- **Kabul:** Koç öğretmenin pedagojik notlarını görür.

### T56 — Ölü kod temizliği (P3)
- **Dosya:** `Frontend/src/features/parent/parentApi.js` + `Frontend/src/components/common/Card/ComingSoon.jsx`
- **Yap:** `useParentChildDetails` hook'unu kaldır; `ComingSoon.jsx` dosyasını sil (import kalmadı).
- **Kabul:** `npm run build` 0 hata; silinen dosyalara referans yok.

### T57 — Arama tabanlı çoklu seçici (§8)
- **Dosya:** `Frontend/src/components/common/Modal` tabanlı yeni `AddStudentsToCourseModal` + `CoachCoursesPage`/`CoachGroupsPage`
- **Yap:** `<select>` yerine canlı arama + çoklu seçim; mevcut üyeler "Zaten Eklendi" rozetiyle pasif.
- **Kabul:** 50–100 öğrencili programda öğrenci/üye ekleme arama ile çalışır.

### T58 — Ders renk + gelişmiş izinler akordeonu (§8)
- **Dosya:** `Frontend/src/features/coach/courses/CoachCoursesPage.jsx` / ders oluşturma formu
- **Yap:** Ders oluşturma formuna renk seçici + "Gelişmiş İzinler" akordeonu; izin switch'leri `var(--color-primary)`/`var(--color-success)` token kullanır.
- **Kabul:** Ders renk ve izinleri kaydedilir; tema kırılmaz.

## 4. Test & Doğrulama

### T59 — IDOR senaryolu entegrasyon testleri
- **Dosya:** `Backend/MentorumApi.Tests/` (Testcontainers PostgreSQL)
- **Yap:** Aşağıdakiler için test yaz:
  - Finans: öğretmen/öğrenci finans endpoint'lerine erişemez (403); veli yalnızca kendi çocuğu + `can_view_payments=1`.
  - Veli izolasyonu: veli A, veli B'nin çocuğuna/ödemesine erişemez (404/403).
  - Meşguliyet maskesi: öğretmen diğer dersin başlığını/öğrenci adını göremez (`isBusyOnly`).
  - View-As: koç mutasyon header'ıyla POST/PUT/DELETE → 403.
  - Öğretmen notu: öğrenci/veli `COACH_ONLY` ve `note` alanını göremez.
  - Study: öğrenci yalnızca kendi oturumlarını görür.
- **Kabul:** Tüm testler yeşil.

### T60 — Build & test doğrulaması
- **Yap:** `dotnet build Mentorum.sln` → 0 hata; `dotnet test Mentorum.sln` → tümü yeşil; `cd Frontend && npm run build` → 0 hata.
- **Kabul:** Üç komut da temiz.

### T61 — Canlı smoke test (her rol)
- **Yap:** Koç (takvim+onay+finans), Öğretmen (meşguliyet+not), Öğrenci (kronometre+istatistik+quick-log), Veli (izolasyon+ödeme+sınav) elle doğrulanır.
- **Kabul:** Her rol kendi akışını hatasız tamamlar.

---

## 5. Bitirme Kriterleri (Doğrulama Kontrol Listesi)

- [ ] Tüm yeni UI metinleri nazik Türkçe (i18n zorunlu değil).
- [ ] Tüm renkler token (`var(--color-*)`, `var(--bg-*)`, `var(--text-*)`, `var(--border-color)`); Cyber/Nature temaları kırılmadı.
- [ ] `bottomNav` yeni sekmelerle taşmıyor; `100dvh` + `safe-area-inset` uyumlu.
- [ ] Finansta hard-delete yok; `is_active=0` / `CANCELLED` kalıbı korundu.
- [ ] Yeni endpoint'lerin tamamı `ProgramAccessGuard` + SQL sahiplik filtresi (defense-in-depth) içeriyor.
- [ ] Hiçbir görev `TODO`/yer tutucu içermiyor; belirsizlik durumunda uygulama durdurulup kullanıcıya soruldu (C2).

