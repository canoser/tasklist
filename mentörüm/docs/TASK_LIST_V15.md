# 🧭 Mentörüm — V15 Görev Listesi (Mimari Sağlamlaştırma, Veri Bütünlüğü ve Denetim İzi)

> **Tarih:** 29 Ekim 2026  
> **Kaynak:** `Mentorum_Mobil_Uygulama_v0_1` referans mimari analizi ve `mentörüm` (.NET 9 + React 19 + PostgreSQL) entegrasyonu.  
> **Amaç:** Sınav ve konu testlerinde veri doğrulama (`CHECK`) + tek merkezli net hesaplama (`NetCalculator`), ödev teslimlerinde iyimser kilitleme (`version` / Concurrency 409), takvim çakışma denetim motoru, kurumsal denetim izi (`audit_logs`) ve dinamik müfredat–ödev–sınav entegrasyonunu tamamlamak.  
> **Görev Durum Kuralı:** Henüz uygulanmamış maddeler `[ ]`, tamamlananlar `[x]`.

---

## Mutabakat Özeti (Nihai)

- **Net hesabı:** Tek otorite C# `NetCalculator`. Katsayı `track` ve `exam_type`'tan çözülür: `Okul`/`Diğer` → `0` (yanlış eksiltmez), `LGS` veya `ORTAOKUL` (ortaokul denemeleri dahil) → `3`, `TYT`/`AYT` veya lise (`SAY/EA/SOZ` denemeleri dahil) → `4`. **Veritabanında serbest `penalty` veya `GENERATED` net kolonu yoktur.**
- **Sınav dual-mode:** `Okul`/`Diğer` → ham puan (`score`/`max_score`, net `NULL`); `TYT`/`AYT`/`LGS`/`Deneme` → D/Y/B → `net`.
- **`exam_scores`:** `id UUID PRIMARY KEY` + `subject_id` + `curriculum_topic_id` + `question_count / correct / wrong / blank / net` + snapshot kolonları (`subject_name`, `unit_name`, `topic_name`) + `chk_score_question_sum` (`correct + wrong + blank = question_count`).
- **`exam_results.total_net`:** Alt ders (`scores`) doluysa `SUM(exam_scores.net)` olarak sunucuda hesaplanır (`req.TotalNet` yok sayılır); `scores` boşsa manuel `total_net` korunur.
- **Ödev concurrency:** `homework_assignments.version` → `WHERE id = @Id AND version = @ExpectedVersion`; etkilenen satır 0 ise `409 Conflict` (`CONCURRENCY_CONFLICT`).
- **Takvim çakışma:** `schedule_slots` (`day_of_week` + `start_time`/`end_time` + `valid_from`/`valid_to`); öğretmen + öğrenci/grup çakışması denetlenir (`classroom` kolonu yoktur).
- **Denetim:** `audit_logs` (`program_id REFERENCES coaching_programs(id)`) + `AuditLogRepository` / `AuditLogService`.
- **Altyapı/Güvenlik:** E1–E6 (bkz. Bölüm 4).
- **Müfredat & Konu Bazlı Ölçüm:** `exam_scores.curriculum_topic_id` + snapshot (`subject_name`/`unit_name`/`topic_name`) ile ders → ünite → konu ölçümü; müfredat değişse de eski netler ve raporlar korunur (`M4`, `M5`, `B6`, `B8`, `F6`).

---

## 0. Mimari Gerekçe ve Referans Bulguları

1. **Sınav Neti Tutarsızlıkları:** Mevcut sistemde sınav netleri (`total_net`) istemciden tek sayı olarak alınıp veritabanına yazılmaktadır. Farklı katsayılar (LGS 3 yanlış, YKS 4 yanlış, okul sınavı 0) için C# `NetCalculator` tek otorite yapılmalı, `doğru + yanlış + boş != soru sayısı` gibi veri tutarsızlıkları ise veritabanı `CHECK` kısıtlaması ile engellenmelidir.
   > **Düzeltme Notu (Eski Hali & Sebebi):** Eski metinde net hesabının PostgreSQL `GENERATED STORED` kolonu ile yapılacağı yazıyordu. Ancak PostgreSQL `GENERATED` kolonları başka tablolardaki kolonlara (`students.track`, `exam_results.exam_type`) referans veremediği ve mutabakatta tek otorite `NetCalculator` seçildiği için `GENERATED` ifadesi kaldırıldı.
2. **Yarış Durumu (Race Condition) Veri Kaybı:** Öğrenci ödevi teslim ederken öğretmenin veya koçun aynı anda eski ekran üzerinden işlem yapması durumunda sessiz üzerine yazma (silent overwrite) engellenmeli; iyimser kilitleme (`version`) ile `HTTP 409 Conflict` dönmelidir.
3. **Takvimde Çakışma Kontrolsüzlüğü:** Koç ders/etüt planlarken öğretmenin veya dersteki öğrenci/grubun aynı gün ve saat aralığında başka bir aktif dersi olup olmadığı denetlenmelidir.
4. **Denetim İzi (Audit Trail) Eksikliği:** Not girme, ödev onaylama, öğrenci taşıma/silme gibi işlemlerin kim tarafından ne zaman yapıldığını tutan `audit_logs` tablosu eklenecektir.

---

## 1. Veritabanı Değişiklikleri (Migration 026)

> **Tek Dosya Kuralı:** `M1`, `M2`, `M3`, `M4` ve `M5` şema değişikliklerinin tamamı **`Backend/MentorumApi/Data/Migrations/026_v15_exam_analytics_and_audit_logs.sql`** adlı tek bir idempotent migration dosyasına yazılacaktır.

### [x] M1 — `exam_scores` Tablosuna Soru Analitiği, PK Dönüşümü ve Veri Doğrulama Kısıtlamaları
- **Dosya:** `Backend/MentorumApi/Data/Migrations/026_v15_exam_analytics_and_audit_logs.sql`
- **Düzeltme Notu (Eski Hali & Sebebi):** Eski maddede `exam_scores` tablosunun mevcut `PRIMARY KEY (exam_id, subject_code)` (`001_schema.sql:78`) kısıtı göz ardı edilmişti. Bu PK varken `subject_code` `NULL` yapılamaz ve aynı sınavda aynı dersten birden fazla konu (`curriculum_topic_id`) girildiğinde `23505 duplicate key` hatası oluşur. Bu sebeple eski bileşik PK kaldırılıp `id UUID PRIMARY KEY` eklendi ve `subject_code` nullable yapıldı.
- **Nasıl Yapılacak (Adım Adım SQL):**
  ```sql
  -- 1. Mevcut (exam_id, subject_code) PK kısıtını kaldır, id UUID PK ekle, subject_code'u NULL yapılabilir yap
  ALTER TABLE exam_scores DROP CONSTRAINT IF EXISTS exam_scores_pkey;
  ALTER TABLE exam_scores ADD COLUMN IF NOT EXISTS id UUID NOT NULL DEFAULT gen_random_uuid();
  DO $$
  BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exam_scores_pkey' AND conrelid = 'exam_scores'::regclass) THEN
          ALTER TABLE exam_scores ADD CONSTRAINT exam_scores_pkey PRIMARY KEY (id);
      END IF;
  END $$;
  ALTER TABLE exam_scores ALTER COLUMN subject_code DROP NOT NULL;

  -- 2. Soru analitiği kolonlarını ekle
  ALTER TABLE exam_scores
      ADD COLUMN IF NOT EXISTS question_count INTEGER NULL CHECK (question_count IS NULL OR question_count BETWEEN 1 AND 250),
      ADD COLUMN IF NOT EXISTS correct INTEGER NULL CHECK (correct IS NULL OR correct >= 0),
      ADD COLUMN IF NOT EXISTS wrong INTEGER NULL CHECK (wrong IS NULL OR wrong >= 0),
      ADD COLUMN IF NOT EXISTS blank INTEGER NULL CHECK (blank IS NULL OR blank >= 0),
      ADD COLUMN IF NOT EXISTS net NUMERIC(6,2) NULL;

  -- 3. Soru toplamı bütünlüğü CHECK kısıtını idempotent ekle
  DO $$
  BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_score_question_sum' AND conrelid = 'exam_scores'::regclass) THEN
          ALTER TABLE exam_scores
          ADD CONSTRAINT chk_score_question_sum CHECK (
              (correct IS NULL AND wrong IS NULL AND blank IS NULL AND question_count IS NULL) OR
              (correct IS NOT NULL AND wrong IS NOT NULL AND blank IS NOT NULL AND question_count IS NOT NULL AND correct + wrong + blank = question_count)
          );
      END IF;
  END $$;
  ```
- **Kabul:** Soru dağılımı toplamı soru sayısına uymayan kayıtlar DB seviyesinde (`23514`) reddedilir; aynı sınav içinde birden fazla konu satırı eklenebilir.

---

### [x] M2 — `homework_assignments` Tablosuna İyimser Kilitleme (`version`) Ekleme
- **Dosya:** `Backend/MentorumApi/Data/Migrations/026_v15_exam_analytics_and_audit_logs.sql`
- **Nasıl Yapılacak:**
  ```sql
  ALTER TABLE homework_assignments
      ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
  ```
- **Kabul:** Tüm mevcut ve yeni ödev atamalarında `version` 1'den başlar.

---

### [x] M3 — Denetim İzi Tablosu (`audit_logs`) Oluşturma
- **Dosya:** `Backend/MentorumApi/Data/Migrations/026_v15_exam_analytics_and_audit_logs.sql`
- **Düzeltme Notu (Eski Hali & Sebebi):** Eski SQL'de `program_id UUID NOT NULL REFERENCES programs(id)` yazıyordu. Veritabanında `programs` adında bir tablo yoktur; tablonun gerçek adı `coaching_programs`'tır (`001_schema.sql:473`). Ayrıca sistem genelinde (programa bağlı olmayan) işlemlerin de loglanabilmesi için `program_id` `NULL` yapılabilir (`UUID NULL REFERENCES coaching_programs(id)`) olarak düzeltildi.
- **Nasıl Yapılacak:**
  ```sql
  CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      program_id UUID NULL REFERENCES coaching_programs(id) ON DELETE CASCADE,
      actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id UUID NOT NULL,
      details JSONB NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_audit_logs_program_time ON audit_logs(program_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id, created_at DESC);
  ```
- **Kabul:** `audit_logs` tablosu hatasız oluşur ve `coaching_programs` ile FK bağlantısı kurulur.

---

### [x] M4 & M5 — `exam_scores` Ders (`subject_id`), Konu (`curriculum_topic_id`) ve Snapshot Kolonları
- **Dosya:** `Backend/MentorumApi/Data/Migrations/026_v15_exam_analytics_and_audit_logs.sql`
- **Düzeltme Notu (Eski Hali & Sebebi):** Eski metinde `M4`'te iki seçenek ("Minimal" ve "Güçlü") ucu açık bırakılmıştı. Kodlayıcı modelin kararsız kalmaması için kesin şema (`subject_id UUID NULL REFERENCES subjects(id) ON DELETE SET NULL` + mevcut `subject_code` verisinin `subjects.short_code` üzerinden backfill edilmesi) tek adımda birleştirildi.
- **Nasıl Yapılacak:**
  ```sql
  ALTER TABLE exam_scores
      ADD COLUMN IF NOT EXISTS subject_id UUID NULL REFERENCES subjects(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS curriculum_topic_id UUID NULL REFERENCES curriculum_topics(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS subject_name TEXT NULL,
      ADD COLUMN IF NOT EXISTS unit_name TEXT NULL,
      ADD COLUMN IF NOT EXISTS topic_name TEXT NULL;

  -- Mevcut kayıtlarda subject_code üzerinden subject_id ve subject_name geri doldurma (backfill)
  UPDATE exam_scores es
  SET subject_id = s.id,
      subject_name = COALESCE(es.subject_name, s.name)
  FROM subjects s
  WHERE es.subject_id IS NULL
    AND es.subject_code IS NOT NULL
    AND UPPER(es.subject_code) = UPPER(s.short_code);

  CREATE INDEX IF NOT EXISTS idx_exam_scores_exam_id ON exam_scores(exam_id);
  CREATE INDEX IF NOT EXISTS idx_exam_scores_subject_id ON exam_scores(subject_id);
  CREATE INDEX IF NOT EXISTS idx_exam_scores_topic_id ON exam_scores(curriculum_topic_id);
  ```
- **Kabul:** Ders ve konu bağlantıları FK ile korunur; konu veya ders silinse dahi `ON DELETE SET NULL` ve snapshot kolonları (`subject_name`, `unit_name`, `topic_name`) sayesinde geçmiş sınav verisi kaybolmaz.

---

## 2. Backend Geliştirmeleri (.NET 9 Minimal API & Dapper)

### [x] B1 — Denetim İzi Servisi, Repository'si ve Endpoint'i
- **Dosyalar:**
  - Yeni: `Backend/MentorumApi/DTOs/AuditLogDtos.cs`
  - Yeni: `Backend/MentorumApi/Data/AuditLogRepository.cs`
  - Yeni: `Backend/MentorumApi/Services/AuditLogService.cs`
  - Güncelle: `Backend/MentorumApi/Program.cs`, `Backend/MentorumApi/Endpoints/ProgramEndpoints.cs`
- **Düzeltme Notu (Eski Hali & Sebebi):** Eski maddede DI kaydı, DTO yapısı ve yetkilendirme kontrolünün nasıl yapılacağı belirtilmemişti. `ProgramEndpoints.cs` içindeki mevcut `IsCoachInProgram` kontrolüyle uyumlu olacak şekilde detaylandırıldı.
- **Nasıl Yapılacak:**
  1. `AuditLogDtos.cs` içinde `AuditLogItemDto` oluştur: `Id (Guid)`, `ProgramId (Guid?)`, `ActorId (Guid)`, `ActorName (string)`, `Action (string)`, `ResourceType (string)`, `ResourceId (Guid)`, `Details (string? — JSON)`, `CreatedAt (DateTime)`.
  2. `AuditLogRepository.cs` içinde:
     - `InsertAsync(Guid? programId, Guid actorId, string action, string resourceType, Guid resourceId, string? detailsJson)`: `INSERT INTO audit_logs (id, program_id, actor_id, action, resource_type, resource_id, details) VALUES (gen_random_uuid(), @ProgramId, @ActorId, @Action, @ResourceType, @ResourceId, @Details::jsonb)` sorgusunu çalıştırır.
     - `GetByProgramAsync(Guid programId, int limit = 100)`: `audit_logs a JOIN users u ON u.id = a.actor_id WHERE a.program_id = @ProgramId ORDER BY a.created_at DESC LIMIT @Limit` sorgusuyla `a.details::text AS Details` ve `u.full_name AS ActorName` döndürür.
  3. `AuditLogService.cs` içinde `LogAsync(Guid? programId, Guid actorId, string action, string resourceType, Guid resourceId, object? details = null)` metodunu yaz. Log yazımı sırasında oluşan olası bir hata ana iş akışını bozmamalıdır (`try/catch` içinde `Serilog.Log.Warning` ile yutulur).
  4. `Program.cs`'e `builder.Services.AddScoped<AuditLogRepository>();` ve `builder.Services.AddScoped<AuditLogService>();` ekle.
  5. `ProgramEndpoints.cs` içine `GET /api/v1/programs/{programId:guid}/audit-logs` uç noktasını ekle (`RequireCoachRole`). Koçun programa erişimini `program_coaches` üzerinden doğrula (`SELECT 1 FROM program_coaches WHERE program_id = @ProgramId AND coach_id = @CoachId`), yetkisizse `Results.Forbid()` döndür.
  6. Kritik uçlara (`HomeworkEndpoints` ödev tamamlama, `ExamEndpoints` sınav ekleme, `StudentFlexibilityEndpoints` gruba/bireysele taşıma, `StudentEndpoints` öğrenci silme) `AuditLogService.LogAsync` çağrısı ekle.
- **Kabul:** Kritik işlemler `audit_logs` tablosuna kaydedilir ve koç tarafından listelenebilir.

---

### [x] B2 — Ödev Teslimlerinde Concurrency Kontrolü (409 Conflict)
- **Dosyalar:**
  - `Backend/MentorumApi/DTOs/HomeworkDtos.cs`
  - `Backend/MentorumApi/DTOs/SchoolModelDtos.cs`
  - `Backend/MentorumApi/Data/HomeworkRepository.cs`
  - `Backend/MentorumApi/Data/SchoolAccessRepository.cs`
  - `Backend/MentorumApi/Endpoints/HomeworkEndpoints.cs`
  - `Backend/MentorumApi/Endpoints/TeacherEndpoints.cs`
- **Düzeltme Notu (Eski Hali & Sebebi):** Eski maddede var olmayan `UpdateAssignmentStatusAsync` metodundan bahsediliyordu. Mevcut kodda öğrenci/koç tamamlama işlemi `HomeworkEndpoints.cs:79-117` içinde inline SQL ile, öğretmen değerlendirmesi ise `SchoolAccessRepository.cs:292-324` (`ReviewTeacherHomeworkAsync`) içinde yapılmaktadır. Ayrıca geriye dönük uyumluluk (eski istemci veya mevcut testler `expectedVersion` göndermezse kırılmaması) için `ExpectedVersion` `int?` (opsiyonel) olarak tanımlanmalıdır.
- **Nasıl Yapılacak:**
  1. `HomeworkDtos.cs`:
     - `CompleteHomeworkRequest` sınıfına `public int? ExpectedVersion { get; set; }` ekle.
     - `HomeworkItemDto` sınıfına `public int Version { get; set; } = 1;` ekle.
  2. `SchoolModelDtos.cs`:
     - `TeacherReviewHomeworkRequest` sınıfına `public int? ExpectedVersion { get; set; }` ekle.
  3. Okuma sorgularına `h.version AS Version` ekle:
     - `HomeworkRepository.GetStudentHomeworksAsync` (`HomeworkRepository.cs:122`)
     - `HomeworkEndpoints.cs` içindeki `/api/v1/homework/me` (`satır 130`) ve `/api/v1/homework/children/{studentId}` (`satır 205`)
     - `SchoolAccessRepository.GetTeacherCourseHomeworkAsync` (`SchoolAccessRepository.cs:153` — `h.version as "version"`)
  4. `HomeworkEndpoints.cs` içindeki `POST /api/v1/homework/assignments/{assignmentId:guid}/complete` (`satır 79`):
     - Önce kaydın varlığını ve yetkiyi kontrol et (`SELECT version FROM homework_assignments WHERE id = @Id {whereClause}`). Kayıt yoksa `400 BadRequest` dön.
     - Eğer `req.ExpectedVersion.HasValue` ise ve DB'deki `version != req.ExpectedVersion.Value` ise (veya `UPDATE ... SET ..., version = version + 1 WHERE id = @Id {whereClause} AND (@ExpectedVersion IS NULL OR version = @ExpectedVersion)` 0 satır döndürürse):
       `return Results.Conflict(new { error = "Bu kayıt başka bir oturumda güncellenmiş. Lütfen sayfayı yenileyip tekrar deneyin.", code = "CONCURRENCY_CONFLICT" });` döndür.
  5. `SchoolAccessRepository.ReviewTeacherHomeworkAsync` (`satır 292`) ve `TeacherEndpoints.cs`:
     - `UPDATE homework_assignments SET ..., version = version + 1 WHERE id = @AssignmentId AND course_id = @CourseId AND (@ExpectedVersion IS NULL OR version = @ExpectedVersion)` şeklinde güncelle.
     - Satır 0 dönerse `InvalidOperationException("CONCURRENCY_CONFLICT")` fırlat ve `TeacherEndpoints.cs` içinde bunu yakalayıp `Results.Conflict(new { error = "...", code = "CONCURRENCY_CONFLICT" })` (HTTP 409) döndür.
- **Kabul:** `expectedVersion` uyuşmadığında 409 Conflict döner; `expectedVersion` gönderilmeyen eski testler kırılmaz; her güncellemede `version` 1 artar.

---

### [x] B3 — Takvim Çakışma Denetim Motoru (Schedule Conflict Detection)
- **Dosyalar:** `Backend/MentorumApi/DTOs/SchoolModelDtos.cs`, `Backend/MentorumApi/Data/ScheduleRepository.cs`, `Backend/MentorumApi/Endpoints/ScheduleEndpoints.cs`
- **Düzeltme Notu (Eski Hali & Sebebi):** Eski maddede çakışma kontrolünün hangi SQL mantığıyla yapılacağı ve güncelleme (`UpdateSlotAsync`) sırasında mevcut slotun kendisiyle çakışmaması (`s.id != @ExcludeSlotId`) gerektiği belirtilmemişti. Ayrıca öğretmen ve öğrenci/grup çakışmasının aynı program içindeki aktif slotları nasıl tarayacağı netleştirildi.
- **Nasıl Yapılacak:**
  1. `ScheduleRepository.cs` içine `CheckConflictsAsync(Guid programId, int dayOfWeek, TimeSpan startTime, TimeSpan endTime, DateTime? validFrom, DateTime? validTo, Guid? courseId, Guid? groupId, Guid? studentId, Guid? excludeSlotId = null)` metodunu ekle:
     - **Zaman ve Tarih Kesişimi Koşulu:**
       - `s.is_active = 1 AND s.day_of_week = @DayOfWeek`
       - `AND (@ExcludeSlotId IS NULL OR s.id != @ExcludeSlotId)`
       - Saat kesişimi: `s.start_time < @EndTime AND s.end_time > @StartTime`
       - Tarih kesişimi: `(@ValidFrom IS NULL OR s.valid_to IS NULL OR s.valid_to >= @ValidFrom) AND (@ValidTo IS NULL OR s.valid_from IS NULL OR s.valid_from <= @ValidTo)`
     - **1. Öğretmen Çakışması (`courseId` doluysa):**
       Yeni slotun dersinin öğretmeni (`SELECT teacher_id FROM courses WHERE id = @CourseId AND is_active = 1`) varsa; aynı öğretmenin (`c.teacher_id = @TeacherId`) başka bir aktif slotu (`s.course_id = c.id`) yukarıdaki zaman/tarih koşulunda var mı kontrol et.
     - **2. Öğrenci / Grup Çakışması:**
       Yeni slottaki hedef öğrenci kümesini çıkar:
       - `studentId` doluysa: `{ studentId }`
       - `groupId` doluysa: `SELECT student_id FROM student_group_members WHERE group_id = @GroupId AND is_active = 1`
       - `courseId` doluysa: `SELECT student_id FROM course_students WHERE course_id = @CourseId AND is_active = 1 UNION SELECT sgm.student_id FROM course_groups cg JOIN student_group_members sgm ON sgm.group_id = cg.group_id AND sgm.is_active = 1 WHERE cg.course_id = @CourseId`
       Bu öğrenci kümesindeki herhangi bir öğrencinin mevcut aktif slotlarda (`s.student_id = ANY(@StudentIds)` veya `s.group_id IN (SELECT group_id FROM student_group_members WHERE student_id = ANY(@StudentIds) AND is_active = 1)` veya `s.course_id IN (SELECT course_id FROM course_students WHERE student_id = ANY(@StudentIds) AND is_active = 1 UNION SELECT cg.course_id FROM course_groups cg JOIN student_group_members sgm ON sgm.group_id = cg.group_id AND sgm.is_active = 1 WHERE sgm.student_id = ANY(@StudentIds))`) zaman/tarih kesişimi var mı kontrol et.
  2. Çakışma varsa `ScheduleConflictException` (veya `InvalidOperationException("SCHEDULE_CONFLICT")` + detay listesi) fırlat; `CreateSlotAsync` ve `UpdateSlotAsync` içinde bu kontrolü çalıştır.
  3. `ScheduleEndpoints.cs` içinde (`POST` ve `PUT`) bu hatayı yakalayıp `Results.Conflict(new { error = "Ders çakışması tespit edildi.", code = "SCHEDULE_CONFLICT", conflictDetails = ex.Conflicts })` (HTTP 409) döndür.
- **Kabul:** Aynı öğretmene veya aynı öğrenciye/gruba aynı gün ve kesişen saat aralığında iki ders atandığında 409 Conflict ve çakışan slot bilgileri döner.

---

### [x] B4 — Birleşik Kurs Öğrenci Kümesi (`roster`) Standardizasyonu
- **Dosyalar:** `Backend/MentorumApi/Data/SchoolAccessRepository.cs`, `Backend/MentorumApi/Data/CourseRepository.cs`, `Backend/MentorumApi/Data/TeacherRepository.cs`, `Backend/MentorumApi/Data/ScheduleRepository.cs`
- **Düzeltme Notu (Eski Hali & Sebebi):** Eski maddede `WHERE cg.course_id = @CourseId AND cg.is_active = 1` yazıyordu. Ancak `course_groups` tablosunda (`001_schema.sql:378-385`) `is_active` kolonu **yoktur** (kayıtlar silinerek çıkarılır); bu SQL çalıştırılırsa `column cg.is_active does not exist` hatası verir! Buna karşılık `student_group_members` tablosunda `is_active` kolonu vardır fakat birçok sorguda `sgm.is_active = 1` unutulmuştur. Ayrıca `CourseRepository.CourseSelect` içindeki `StudentCount` grup öğrencilerini saymamaktadır.
- **Nasıl Yapılacak:**
  1. Standart birleşik kurs öğrenci sorgusu (Roster SQL):
     ```sql
     SELECT cs.student_id FROM course_students cs WHERE cs.course_id = @CourseId AND cs.is_active = 1
     UNION
     SELECT sgm.student_id FROM course_groups cg
     JOIN student_group_members sgm ON sgm.group_id = cg.group_id AND sgm.is_active = 1
     WHERE cg.course_id = @CourseId
     ```
     *(Kesinlikle `cg.is_active` YAZILMAYACAK, `sgm.is_active = 1` YAZILACAK).*
  2. Bu standart sorguyu şu noktalarda uygula:
     - `SchoolAccessRepository.GetCourseStudentIdsAsync` (`satır 37-45`)
     - `SchoolAccessRepository.GetTeacherCourseStudentsAsync` (`satır 139-143`)
     - `SchoolAccessRepository.GetTeacherCourseHomeworkAsync` (`satır 158-162`)
     - `SchoolAccessRepository.GetTeacherCourseExamsAsync` (`satır 176-180`)
     - `SchoolAccessRepository.GetStudentCoursesAsync` (`satır 196-197`: `JOIN student_group_members sgm ON sgm.group_id = cg.group_id AND sgm.is_active = 1`)
     - `CourseRepository.GetCourseStudentsAsync` (`satır 228-237`: `JOIN student_group_members sgm ON sgm.group_id = cg.group_id AND sgm.is_active = 1`)
     - `CourseRepository.CourseSelect` (`satır 25`): `StudentCount` alt sorgusunu hem `course_students (is_active=1)` hem `course_groups + student_group_members (is_active=1)` birleşiminin tekil öğrenci sayısını (`COUNT(DISTINCT student_id)`) sayacak şekilde güncelle.
     - `TeacherRepository.GetTeacherDetailAsync` (`satır 247`: `AND sgm.is_active = 1` ekle).
     - `ScheduleRepository.GetStudentSlotsAsync` (`satır 157`) ve `GetParentSlotsAsync` (`satır 173`): `student_group_members` sorgularına `AND is_active = 1` ekle.
- **Kabul:** Gruptan çıkarılan (`sgm.is_active = 0`) öğrenciler kurs, öğretmen veya takvim listelerinde görünmez; grup üzerinden kursa dahil olan öğrenciler kurs öğrenci sayısına (`StudentCount`) doğru yansır.

---

### [x] B5 & E2 — Global Exception Handler ve `PostgresException` Eşlemesi
- **Dosya:** `Backend/MentorumApi/Program.cs`
- **Düzeltme Notu (Eski Hali & Sebebi):** `B5` ve `E2` aynı `app.UseExceptionHandler` bloğunu (`Program.cs:194-204`) değiştirdiği için tek adımda birleştirildi.
- **Nasıl Yapılacak:**
  `Program.cs` içindeki `app.UseExceptionHandler` bloğunu şu şekilde güncelle (`using Npgsql;` ekle):
  - Yakalanan hata `PostgresException pgEx` ise:
    - `pgEx.SqlState == "23505"` (Unique violation) → `StatusCode = 409`, `code = "DUPLICATE_RECORD"`, `error = "Bu kayıt zaten mevcut."`
    - `pgEx.SqlState == "23514"` (Check violation, ör. `chk_score_question_sum`) → `StatusCode = 400`, `code = "CHECK_VIOLATION"`, `error = "Girilen veriler doğrulama kurallarına uymuyor (soru sayısı toplamı doğru/yanlış/boş toplamına eşit olmalıdır)."`
    - `pgEx.SqlState == "23503"` (Foreign key violation) → `StatusCode = 400`, `code = "FOREIGN_KEY_VIOLATION"`, `error = "İlişkili kayıt bulunamadı."`
  - Diğer tüm beklenmeyen hatalarda:
    - `StatusCode = 500`, `code = "INTERNAL_ERROR"`, `error = "Sunucu hatası oluştu. Lütfen tekrar deneyin."`
  - Yanıt JSON formatı her durumda `{ error, code, timestamp = DateTime.UtcNow }` olmalıdır.
- **Kabul:** DB kısıt ihlalleri 500 yerine anlamlı 400/409 Türkçe mesaj ve standart `{ error, code, timestamp }` sözleşmesiyle döner.

---

### [x] B6 — Müfredat → Ödev Atama ve İlerleme ("Yapılmadılar" & Konu Netleri) Sorgusu
- **Dosyalar:** `Backend/MentorumApi/DTOs/StudentDtos.cs`, `Backend/MentorumApi/Data/CurriculumRepository.cs`, `Backend/MentorumApi/Endpoints/StudentEndpoints.cs`
- **Düzeltme Notu (Eski Hali & Sebebi):** Eski maddede yeni bir `/api/v1/programs/{id}/curriculum/progress` ucundan bahsediliyordu; ancak sistemde zaten `GET /api/v1/students/{id}/curriculum` (`StudentEndpoints.cs:58`) ve `CurriculumRepository.GetStudentCurriculumAsync` (`CurriculumRepository.cs:81`) mevcuttur ve frontend (`useCoachStudentCurriculum`) doğrudan bu ucu çağırmaktadır. Mevcut uç genişletilip yeni uç da alias olarak eklendiğinde hem mevcut frontend kırılmaz hem de V15 gereksinimi karşılanır.
- **Nasıl Yapılacak:**
  1. `StudentDtos.cs` içindeki `StudentCurriculumTopicDto` (`satır 96`) sınıfına şu alanları ekle (mevcut alanları koru):
     - `public Guid SubjectId { get; set; }`
     - `public string HomeworkStatus { get; set; } = "UNASSIGNED";` (`DONE`, `PENDING`, `OVERDUE`, `UNASSIGNED`)
     - `public int AssignedCount { get; set; }`
     - `public int CompletedCount { get; set; }`
     - `public decimal? LastNet { get; set; }`
     - `public decimal? AvgSuccessRate { get; set; }`
  2. `CurriculumRepository.GetStudentCurriculumAsync(Guid studentId)` (`satır 81`) sorgusunu güncelle:
     - Her `curriculum_topics ct` satırı için öğrencinin `homework_assignments` tablosundaki ödev sayılarını, son ödev durumunu (`DONE`/`LATE_DONE` varsa `DONE`, gecikmiş `PENDING` veya `OVERDUE` varsa `OVERDUE`, aktif `PENDING` varsa `PENDING`, hiç yoksa `UNASSIGNED`) ve `exam_scores` tablosunda `curriculum_topic_id = ct.id` olan kayıtların son netini (`LastNet`) ve ortalama başarı yüzdesini hesapla.
  3. Ayrıca `CurriculumEndpoints.cs` veya `ProgramEndpoints.cs` içine `GET /api/v1/programs/{programId:guid}/curriculum/progress?studentId={studentId}` ucunu ekleyip aynı `GetStudentCurriculumAsync(studentId)` metodunu döndür.
- **Kabul:** Öğrencinin müfredattaki hangi konularda ödev yapmadığı (`UNASSIGNED`/`PENDING`/`OVERDUE`) ve konu bazlı net/başarı oranı tek sorguda döner.

---

### [x] B7 — `NetCalculator` Güncelleme (Tek Net Otoritesi)
- **Dosya:** `Backend/MentorumApi/Services/NetCalculator.cs`
- **Düzeltme Notu (Eski Hali & Sebebi):** Mevcut `NetCalculator.ComputeNet(int correct, int wrong, int blank, string? track)` (`NetCalculator.cs:7`) 4 parametre almaktadır ve `StudySessionRepository.cs:187` ile `ReportsRepository.cs:159` tarafından bu imzayla çağrılmaktadır. Mevcut çağrıları kırmamak için `examType` parametresi `string? examType = null` olarak varsayılan değerli (optional) eklenmelidir.
- **Nasıl Yapılacak:**
  ```csharp
  public static class NetCalculator
  {
      public static decimal ResolveDivisor(string? examType, string? studentTrack)
      {
          if (string.Equals(examType, "Okul", StringComparison.OrdinalIgnoreCase) ||
              string.Equals(examType, "Diğer", StringComparison.OrdinalIgnoreCase))
              return 0m;

          if (string.Equals(examType, "LGS", StringComparison.OrdinalIgnoreCase) ||
              string.Equals(studentTrack, "ORTAOKUL", StringComparison.OrdinalIgnoreCase))
              return 3.0m;

          return 4.0m; // TYT, AYT, Deneme ve Lise (SAY, EA, SOZ)
      }

      public static decimal ComputeNet(int correct, int wrong, int blank, string? track, string? examType = null)
      {
          decimal divisor = ResolveDivisor(examType, track);
          if (divisor <= 0m)
              return correct;

          decimal rawNet = correct - (wrong / divisor);
          return Math.Round(rawNet, 2, MidpointRounding.AwayFromZero);
      }

      public static decimal ComputeSuccessRate(int correct, int questionCount)
      {
          if (questionCount <= 0) return 0m;
          return Math.Round((decimal)correct / questionCount * 100m, 2, MidpointRounding.AwayFromZero);
      }
  }
  ```
- **Kabul:** `StudySessionRepository` ve `ReportsRepository` hiçbir değişiklik gerekmeden derlenir; sınav tipine ve öğrenci alanına göre net hesabı tek merkezden yapılır.

---

### [x] B8 — `ExamRepository`, `StudentRepository` ve `ParentEndpoints` Sınav & Alt Ders/Konu Net Otomasyonu
- **Dosyalar:**
  - `Backend/MentorumApi/DTOs/ExamDtos.cs`
  - `Backend/MentorumApi/DTOs/StudentDtos.cs`
  - `Backend/MentorumApi/Data/ExamRepository.cs`
  - `Backend/MentorumApi/Data/StudentRepository.cs`
  - `Backend/MentorumApi/Endpoints/ParentEndpoints.cs`
- **Düzeltme Notu (Eski Hali & Sebebi):**
  1. `ExamDtos.cs:7` içinde `public required string SubjectCode { get; set; }` tanımlıdır. `required` kaldırılmazsa yeni formatta (`subjectId` ile, `subjectCode` olmadan) gelen JSON istekleri ASP.NET Core model binding aşamasında 400 hatasıyla reddedilir!
  2. `StudentRepository.GetStudentDetailAsync` (`satır 36-48`) ve `StudentDetailDto` (`StudentDtos.cs:29`) içinde `ExamResults` alanı hiç doldurulmamaktadır; bu yüzden `CoachStudentDetail.jsx` (`satır 534: student.examResults`) sınavları gösterememektedir.
- **Nasıl Yapılacak:**
  1. `ExamDtos.cs` içindeki `ExamScoreDto` sınıfını güncelle:
     ```csharp
     public class ExamScoreDto
     {
         public Guid? Id { get; set; }
         public Guid? SubjectId { get; set; }
         public string? SubjectCode { get; set; }
         public Guid? CurriculumTopicId { get; set; }
         public string? SubjectName { get; set; }
         public string? UnitName { get; set; }
         public string? TopicName { get; set; }
         public int? QuestionCount { get; set; }
         public int? Correct { get; set; }
         public int? Wrong { get; set; }
         public int? Blank { get; set; }
         public decimal? Net { get; set; }
         public float? Score { get; set; }
         public float? MaxScore { get; set; }
     }
     ```
  2. `StudentDtos.cs`:
     - `StudentExamDto` içine `public List<ExamScoreDto> Scores { get; set; } = new();` ekle.
     - `StudentDetailDto` içine `public List<StudentExamDto> ExamResults { get; set; } = new();` ekle.
  3. `ExamRepository.CreateExamResultAsync` (`ExamRepository.cs:10`):
     - Her hedef öğrenci için öğrencinin `track` bilgisini `students` tablosundan oku (`SELECT track FROM students WHERE id = @StudentId`).
     - Eğer `req.Scores != null && req.Scores.Count > 0` ise:
       - Her `score` öğesi için:
         - Eğer `score.QuestionCount.HasValue || score.Correct.HasValue || score.Wrong.HasValue || score.Blank.HasValue` ise: `correct + wrong + blank != questionCount` kontrolü yap, eşit değilse `ArgumentException("Doğru, yanlış ve boş toplamı soru sayısına eşit olmalıdır.")` fırlat (Endpoint'te 400 BadRequest dön).
         - `NetCalculator.ComputeNet(correct, wrong, blank, studentTrack, req.ExamType)` ile `computedNet` hesapla.
         - Snapshot çözümlemesi:
           - `CurriculumTopicId` doluysa `curriculum_topics ct JOIN subjects s ON s.id = ct.subject_id WHERE ct.id = @TopicId` sorgusuyla `SubjectId = s.id`, `SubjectCode = s.short_code`, `SubjectName = s.name`, `UnitName = ct.unit_name`, `TopicName = ct.topic_name` değerlerini doldur.
           - `CurriculumTopicId` boş ama `SubjectId` veya `SubjectCode` doluysa `subjects` tablosundan `SubjectId`, `SubjectCode`, `SubjectName` değerlerini doldur.
       - Deneme modunda (`computedNet` hesaplanan satırlar varsa) `exam_results.total_net = SUM(computedNet)` olarak yaz (`req.TotalNet`'i ez). Hiç `scores` gönderilmemişse `req.TotalNet` değerini koru.
  4. `StudentRepository.GetStudentDetailAsync` (`satır 36`) ve `GetStudentExamsAsync` (`satır 112`):
     - Öğrencinin sınavlarını (`exam_results`) ve alt ders/konu kırılımlarını (`exam_scores`) çekip `StudentDetailDto.ExamResults` ve `StudentExamDto.Scores` içine doldur.
  5. `ParentEndpoints.cs` (`GET /api/v1/parents/children/{studentId}/exams`, `satır 104`):
     - Her sınavın içine `scores` dizisini (`subjectName`, `unitName`, `topicName`, `questionCount`, `correct`, `wrong`, `blank`, `net`, `score`, `maxScore`) ekleyerek döndür (bkz. Bölüm 6 Referans Tasarım Özeti — Veli Görünümü).
- **Kabul:** Sınav ve konu testlerinde net sunucuda hesaplanır, `total_net` alt derslerin toplamına eşit olur, snapshot adları kaydedilir ve hem koç hem veli ekranlarında alt ders/konu kırılımı döner.

---

## 3. Frontend Geliştirmeleri (React 19 & Vite)

### [x] F1 — Sınav Giriş Formu: Doğru/Yanlış/Boş, Ders/Konu Seçici ve Canlı Net Hesabı
- **Dosya:** `Frontend/src/features/coach/student-detail/CoachStudentDetail.jsx` (`activeTab === 'exams'`, satır 530–588) ve `Frontend/src/features/parent/exams/ParentExamsPage.jsx`
- **Düzeltme Notu (Eski Hali & Sebebi):** Eski maddede `Frontend/src/features/coach/exams/AddExamModal.jsx` dosyasından bahsediliyordu; ancak projede böyle bir dosya yoktur. Sınav ekleme ve listeleme arayüzü doğrudan `CoachStudentDetail.jsx` içindeki `activeTab === 'exams'` sekmesinde yer almaktadır.
- **Nasıl Yapılacak:**
  1. `CoachStudentDetail.jsx` içindeki "Yeni Sınav Ekle" bölümünü (`satır 552-586`) geliştir:
     - Sınav Tipi seçici ekle (`TYT`, `AYT`, `LGS`, `Deneme`, `Okul`).
     - "Hızlı Toplam Net Girişi" ile "Ders / Konu Bazlı Detaylı Giriş" arasında geçiş veya alt ders satırı ekleme (`+ Ders/Konu Ekle`) desteği sun.
     - Detaylı satırlarda `useSubjects` ve opsiyonel `useUnits` / `useTopics` kullanarak **Ders → Ünite → Konu (Opsiyonel)** seçimi yaptır.
     - Sınav tipi `Okul` değilse her satırda `Soru Sayısı`, `Doğru`, `Yanlış`, `Boş` inputları göster; `Doğru + Yanlış + Boş === Soru Sayısı` kontrolünü canlı yap; öğrencinin `track` ve `examType` bilgisine göre (`Okul → 0`, `LGS/ORTAOKUL → 3`, diğer → `4`) satır netini ve genel toplam neti anlık hesaplayıp göster.
     - Sınav geçmişi kartlarında (`student.examResults`) varsa alt ders/konu (`scores`) listesini (`subjectName`, `topicName`, `D/Y/B`, `net`) göster.
  2. `ParentExamsPage.jsx` içinde sınavların altında `scores` kırılımı varsa ders/ünite/konu ve D/Y/B/Net detaylarını göster.
- **Kabul:** Koç ders veya konu bazında D/Y/B girebilir, toplam soru uyuşmazlığında uyarı alır ve kaydedilen sınavlar ders/konu kırılımıyla listelenir.

---

### [x] F2 — Ödev Tesliminde Sürüm Uyuşmazlığı (409) Yönetimi
- **Dosyalar:** `Frontend/src/features/student/homework/StudentHomework.jsx`, `Frontend/src/features/teacher/courses/TeacherCoursesPage.jsx`
- **Düzeltme Notu (Eski Hali & Sebebi):** Eski maddede klasör adı verilmişti; ödev tamamlama/değerlendirme çağrılarının yapıldığı tam dosya adları (`StudentHomework.jsx` ve `TeacherCoursesPage.jsx`) netleştirildi.
- **Nasıl Yapılacak:**
  1. `StudentHomework.jsx` içinde ödev tamamlama isteği (`/homework/assignments/${id}/complete`) gönderilirken payload'a `expectedVersion: hw.version` alanını ekle.
  2. `TeacherCoursesPage.jsx` içinde öğretmen ödev değerlendirme isteği gönderilirken payload'a `expectedVersion: hw.version` ekle.
  3. Her iki ekranda `onError` / `catch` bloğunda `err?.response?.status === 409` veya `err?.response?.data?.code === 'CONCURRENCY_CONFLICT'` yakalandığında kullanıcıya `"Bu ödev başka bir oturumda güncellendi. Güncel veriler yükleniyor..."` uyarısı göster ve ilgili React Query sorgularını (`invalidateQueries`) yenile.
- **Kabul:** Eşzamanlı güncelleme çakışmasında 409 yakalanır ve liste otomatik güncellenir.

---

### [x] F3 — Takvimde Çakışma Uyarısı Gösterimi
- **Dosya:** `Frontend/src/features/coach/schedule/WeeklySchedulePage.jsx`
- **Nasıl Yapılacak:**
  - Slot ekleme ve güncelleme mutasyonlarının hata yakalama bloğunda `err?.response?.status === 409` (veya `code === 'SCHEDULE_CONFLICT'`) geldiğinde, `err.response.data.conflictDetails` içindeki çakışan ders/öğretmen/öğrenci ve saat bilgilerini okunaklı bir uyarı/alert veya hata kutusu içinde göster.
- **Kabul:** Çakışma nedeniyle kaydedilemeyen ders slotunun hangi kayıtla çakıştığı kullanıcıya açıkça gösterilir.

---

### [x] F4 — Giriş Sayfasında (`LoginPage.jsx`) Bağlantı Hatası Denetimi
- **Dosya:** `Frontend/src/features/auth/LoginPage.jsx`
- **Nasıl Yapılacak:**
  - `handleSubmit` (`satır 59`) ve `handleGoogleCredential` (`satır 81`) `catch (err)` bloklarında:
    ```js
    if (!err?.response) {
      setError('Sunucuya bağlanılamadı. Lütfen sunucunun çalıştığından veya internet bağlantınızdan emin olun.');
      return;
    }
    ```
    kontrolünü en başa ekle.
- **Kabul:** API kapalıyken veya ağ koptuğunda "Bilgilerinizi kontrol edin" yerine bağlantı hatası mesajı gösterilir.

---

### [x] F5 — Koç Paneline "İşlem Geçmişi" (Denetim İzi) Sekmesi
- **Dosya:** `Frontend/src/features/coach/settings/CoachProgramSettingsPage.jsx` (veya yeni `Frontend/src/features/coach/audit/CoachAuditLogsPage.jsx` + `App.jsx` rotası)
- **Düzeltme Notu (Eski Hali & Sebebi):** Ayrı bir sayfa eklemek yerine hem `CoachProgramSettingsPage.jsx` içine "İşlem Geçmişi (Denetim İzi)" kartı/sekmesi eklenmesi hem de `/coach/programs/:programId/audit-logs` rotasıyla `CoachAuditLogsPage.jsx` oluşturulması seçeneği netleştirildi.
- **Nasıl Yapılacak:**
  1. `GET /api/v1/programs/${programId}/audit-logs` ucunu çağıran `useProgramAuditLogs(programId)` hook'unu `coachSchoolApi.js` içine ekle.
  2. `CoachAuditLogsPage.jsx` bileşenini oluştur ve `CoachProgramSettingsPage.jsx` içinden erişilebilir yap (ayrıca `App.jsx` içine `<Route path="programs/:programId/audit-logs" element={<CoachAuditLogsPage />} />` ekle).
  3. Tabloda İşlem Zamanı (`createdAt`), İşlemi Yapan (`actorName`), Eylem (`action`), Kaynak (`resourceType`) ve Detay (`details`) alanlarını filtre/arama kutusuyla listele.
- **Kabul:** Koç program içindeki denetim kayıtlarını kronolojik olarak görüntüleyebilir.

---

### [x] F6 — Müfredat Konu Seçici İyileştirmesi ve İlerleme/Eksik Raporu
- **Dosyalar:** `Frontend/src/features/coach/homework/AssignHomeworkModal.jsx`, `Frontend/src/features/coach/student-detail/CoachStudentDetail.jsx` (`activeTab === 'topics'`, satır 615–631)
- **Düzeltme Notu (Eski Hali & Sebebi):** `AssignHomeworkModal.jsx` incelendiğinde Seviye → Ders → Tema/Ünite → Konu seçicilerinin zaten mevcut olduğu (`satır 81-147`) görüldü. Eksik olan kısım: öğrencinin sınıf seviyesinin (`selectedStudent.grade`) otomatik seçilmesi, konu seçildiğinde başlık boşsa konu adının başlığa otomatik yazılması ve `CoachStudentDetail.jsx` içindeki "Konu Takibi" (`activeTab === 'topics'`) sekmesinin ünite gruplaması + ödev durumu (`DONE`/`PENDING`/`OVERDUE`/`UNASSIGNED`) + konu neti (`lastNet`) ve filtreleme ("Yapılmayanlar / Eksikler") ile zenginleştirilmesidir.
- **Nasıl Yapılacak:**
  1. `AssignHomeworkModal.jsx`:
     - Modal açıldığında `selectedStudent?.grade` varsa `level` state'ini `String(selectedStudent.grade)` olarak başlat (`useEffect`).
     - Konu seçildiğinde `title` boşsa seçilen konunun `topicName` değerini `title`'a otomatik doldur.
  2. `CoachStudentDetail.jsx` (`activeTab === 'topics'`):
     - Ders ve Durum filtresi (`Tümü`, `Yapılmayanlar / Atanmamış`, `Bekleyen / Geciken`, `Tamamlanan`) ekle.
     - Konuları Ders → Ünite (`unitName`) altında gruplayarak göster; her konunun yanında ödev durum rozetini (`Tamamlandı`, `Bekliyor`, `Gecikmiş`, `Atanmadı`), varsa `lastNet` / `avgSuccessRate` bilgisini ve hızlı `"Ödev Ver"` butonunu göster.
- **Kabul:** Koç öğrencinin müfredatta yapmadığı konuları filtreleyebilir, konu bazlı netlerini görür ve tek tıkla o konudan ödev atayabilir.

---

## 4. Altyapı & Güvenlik (E1–E6)

### [x] E1 — Güvenlik Başlıkları Middleware'i
- **Dosya:** `Backend/MentorumApi/Program.cs`
- **Nasıl Yapılacak:**
  `app.UseHttpsRedirection();` satırından hemen sonra inline middleware ekle:
  ```csharp
  app.Use(async (context, next) =>
  {
      context.Response.Headers["X-Content-Type-Options"] = "nosniff";
      context.Response.Headers["X-Frame-Options"] = "DENY";
      context.Response.Headers["Referrer-Policy"] = "same-origin";
      if (context.Request.Headers.ContainsKey("Authorization"))
      {
          context.Response.Headers["Cache-Control"] = "no-store";
      }
      await next();
  });
  ```
- **Kabul:** Tüm API yanıtlarında güvenlik başlıkları döner.

---

### [x] E3 — Refresh Token'ı SHA-256 ile Hash'leyerek Saklama
- **Dosya:** `Backend/MentorumApi/Endpoints/AuthEndpoints.cs`
- **Düzeltme Notu (Eski Hali & Sebebi):** Eski maddede `refresh_tokens.token` yerine `token_hash` kolonunun kullanılacağı yazıyordu; ancak `001_schema.sql:181` içinde `token TEXT UNIQUE NOT NULL` kısıtı vardır. Şemayı kırmadan ve `NOT NULL` hatası almadan en temiz çözüm, `HashToken(string rawToken)` yardımcı metoduyla üretilen SHA-256 hex değerini doğrudan `refresh_tokens.token` kolonuna yazmak ve sorgularda `WHERE token = @TokenHash` (geçiş sürecinde mevcut düz tokenlar için `WHERE (token = @TokenHash OR token = @RawToken)`) kullanmaktır.
- **Nasıl Yapılacak:**
  1. `AuthEndpoints.cs` içine yardımcı metot ekle:
     ```csharp
     private static string HashRefreshToken(string rawToken)
     {
         var bytes = System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(rawToken));
         return Convert.ToHexStringLower(bytes);
     }
     ```
  2. `/register`, `/login`, `/refresh`, `/google` ve davet kabul uçlarında `INSERT INTO refresh_tokens` yaparken `Token = HashRefreshToken(refreshToken)` kaydet (cookie'ye ise ham `refreshToken` yazılmaya devam eder).
  3. `/refresh` ve `/logout` uçlarında token ararken/iptal ederken `WHERE (token = @TokenHash OR token = @RawToken)` kullan (`TokenHash = HashRefreshToken(inputToken)`, `RawToken = inputToken`).
- **Kabul:** Veritabanı sızıntısında `refresh_tokens` tablosundan düz metin refresh token elde edilemez.

---

### [x] E4 — Frontend İstek Zaman Aşımı (`timeout`)
- **Dosya:** `Frontend/src/api/apiClient.js`
- **Nasıl Yapılacak:**
  - `axios.create` (`satır 7`) içine `timeout: 15000,` ekle.
  - Response interceptor'da `error.code === 'ECONNABORTED'` durumunda `error.userMessage = 'İstek zaman aşımına uğradı. Lütfen bağlantınızı kontrol edin.';` ata.
- **Kabul:** Asılı kalan istekler 15 saniye sonunda temiz bir şekilde sonlanır.

---

### [x] E5 — Sınırda Request Doğrulama (Cross-Field Check)
- **Dosyalar:** `Backend/MentorumApi/Endpoints/ExamEndpoints.cs`, `Backend/MentorumApi/Endpoints/HomeworkEndpoints.cs`
- **Nasıl Yapılacak:**
  - `ExamEndpoints.cs`: `req.Scores` içinde `QuestionCount`, `Correct`, `Wrong`, `Blank` değerlerinden herhangi biri negatifse veya `Correct + Wrong + Blank != QuestionCount` ise DB'ye gitmeden `Results.BadRequest(new { error = "Doğru, yanlış ve boş toplamı soru sayısına eşit olmalıdır.", code = "VALIDATION_ERROR" })` döndür.
  - `HomeworkEndpoints.cs`: `CompleteHomeworkRequest` içinde `CompletionPercentage < 0 || CompletionPercentage > 100` ise `400 BadRequest` döndür.
- **Kabul:** Geçersiz veri sınırda 400 ile reddedilir.

---

### [x] E6 — Merkezi Kurs Görünürlük Çözümleyicisi
- **Dosya:** `Backend/MentorumApi/Data/SchoolAccessRepository.cs`
- **Nasıl Yapılacak:**
  - `B4` maddesinde standartlaştırılan `GetCourseStudentIdsAsync(Guid courseId)` metodunu kurs içi öğrenci erişim doğrulamalarında (`IsStudentInCourseAsync`, öğretmen ödev/sınav/not işlemleri) tek kaynak olarak kullan.

---

## 5. Test & Doğrulama Kriterleri

- [x] `dotnet build Backend/Mentorum.sln` → 0 Hata.
- [x] `dotnet test Backend/Mentorum.sln` → 67/67 test başarılı ve yeşil.
- [x] `cd Frontend && npm run build` → 0 Hata.

---

## 6. Referans Tasarım Özeti (Derse ve Konuya Göre Net & Veli Görünümü)

### 6.1 İki Mod (Dual-Mode)
| Mod | Sınav Tipi | Girilen Alanlar | Net Hesabı |
|---|---|---|---|
| **Deneme / Konu Testi** | `TYT` / `AYT` / `LGS` / `Deneme` | `questionCount`, `correct`, `wrong`, `blank` | `NetCalculator.ComputeNet` (`correct - wrong/bölen`) |
| **Ham Puan (Yazılı)** | `Okul` / `Diğer` | `score`, `maxScore` | `net = NULL` (veya D/Y/B girilirse bölen `0` → `net = correct`) |

### 6.2 API İstek Şekli (`POST /api/v1/exams`)
```json
{
  "studentId": "…",
  "examType": "TYT",
  "examName": "TYT Deneme 1",
  "examDate": "2026-10-28",
  "scores": [
    { "subjectId": "…", "questionCount": 40, "correct": 30, "wrong": 8, "blank": 2 },
    { "subjectId": "…", "curriculumTopicId": "…", "questionCount": 14, "correct": 10, "wrong": 3, "blank": 1 }
  ]
}
```
- `scores[].net` sunucuda hesaplanır.
- `scores` doluysa `exam_results.total_net = SUM(scores[].net)` olarak yazılır; `scores` boşsa istemciden gelen `totalNet` korunur.
- Kayıt anında `subject_name`, `unit_name`, `topic_name` müfredat tablolarından okunarak `exam_scores` satırına snapshot olarak yazılır; böylece müfredat sonradan değişse veya konu silinse bile geçmiş sınav ve veli raporları bozulmaz.
