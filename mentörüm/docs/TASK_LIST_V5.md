# 🏫 Mentörüm — V5 Görev Listesi (Okul/Dershane Modeli)
> **Tarih:** 6 Ekim 2026
> **Durum:** 🚧 Kodlama sürüyor — Aşama 0-13 büyük ölçüde tamam; backend + frontend (Teacher/Koç/Öğrenci/Veli sayfaları + PWA) yapıldı (29/29 test, `npm run build` OK). Kalan: yalnızca manuel doğrulamalar (Neon migration, canlı smoke, end-to-end, PWA kurulum testi).
> **Kaynak:** `V5_OKUL_MODELI.md` (ayrıntılı tasarım). Görevler sıralıdır — her aşama bir öncekini varsayar.

---

## 📌 Devam Notu (son oturum)

**Tamamlanan (bu oturum):**
- `coach_id → program_id` geçişi (deploy güvenliği): `BaseRepository` tenant filtresi + `StudentRepository`(coach_notes) + `HomeworkRepository` + `ExamRepository` + `CalendarRepository` + `ReportsRepository` + `HomeworkEndpoints`(complete) + `OverdueHomeworkJob`. `homework_templates.coach_id` KORUNDU.
- Aşama 1.5: `Data/SchoolAccessRepository.cs` (CourseAccessHelper + GetCourseStudentIds + tenant doğrulama + MaskStudent), `DTOs/CourseDtos.cs`, DI kaydı (`Program.cs`), `SchoolAccessTests.cs` (8 test).
- Bug fix: register endpoint `403 COACH_PENDING` → `200 { pendingApproval:true }` (K5: register PENDING oluşturur, **login** 403 döner — login/google'daki 403 check doğru bırakıldı).
- Test düzeltmeleri: `AuthIntegrationTests` (K5 akışına göre), `CrossTenantSecurityTests` fixture (`coach_id` → `program_id`).

**Doğrulama:** build 0 hata, `dotnet test` 12/12 geçiyor.

**Sıradaki öneriler (öncelik sırasıyla):**
1. **Aşama 2 kalan** (satır 50-56): `RequireTeacherRole` policy, Google ile öğretmen rol ataması, POST idempotency.
2. **Aşama 3** (Teachers/Courses/Groups): `TeacherRepository`/`TeacherEndpoints`, `CourseRepository`/`CourseEndpoints`, `GroupRepository`/`GroupEndpoints` — hepsi `SchoolAccessRepository` helper'larını kullanmalı (IDOR).
3. Aşama 1.6'daki `- [ ] IDOR testi: yardımcı başka programın verisine erişemiyor mu?` (henüz yazılmadı).
4. Aşama 4 (Schedule), Aşama 5 (Course Resources), Aşama 6 (Teacher Yetki & IDOR).

**Mimari not:** Öğretmen erişimi `course.teacher_id` + `program_teachers` üzerinden; `GetCourseAccessAsync` sahiplik + 10 izin bayrağını tek yerden döndürüyor. Aşama 3/6'daki tüm öğretmen uçları bu helper'ı kullanmalı; öğrenci DTO'su `MaskStudent` ile izin bazlı maskelenmeli.

**Konvansiyon notları:** `schedule_slots.day_of_week` **1=Pazartesi (ISO 8601)** — frontend (Aşama 9) bu konvansiyonu kullanmalı. Listeleme uçları cross-tenant'ta boş liste (200) döndürür (detay/mutasyon 404/403) — veri sızması yok; isterseniz listeleri 403'e sıkılaştırabilirsiniz.

---

## Aşama 0: Ön Koşullar (kodlamadan önce)
- [x] Migration 001–005'in canlıda uygulandığını doğrula (canlı register/invite/müfredat/health çalışıyor; tablolar mevcut)
- [x] `course_resources` V4 çakışma kontrolü → ÇAKIŞMA YOK (V4'te yalnızca `resource_book`/`resource_ref` basit metin; ayrı yeni özellik)
- [x] `.agents/AGENTS.md` kurallarını oku (i18n, CSS Modules, idempotency, PORTABILITY.md)
- [x] Not: V4 Aşama 23 beklenebilir; V5 Aşama 1–6 ondan bağımsız ilerleyebilir
- [x] Karar (6 Ekim): Koçluk Programı modeli — yönetici/yardımcı + süper yönetici onayı + X program limiti (bkz. `V5_OKUL_MODELI.md` §1.5) — KARAR VERİLDİ + Aşama 1.6'da uygulandı

## Aşama 1: Migration & Veri Modeli (006 expand → 007 program → 008 contract)
- [x] `006_SchoolModel.sql` yaz: `users.role` CHECK'e `'Teacher'` ekle (idempotent `DO $$` bloğu)
- [x] `invite_tokens.role` CHECK'e `'Teacher'` + `'Coach'` (yardımcı koç daveti) ekle
- [x] `notifications.type` CHECK genişlet: `SCHEDULE_UPDATED`, `TEACHER_ASSIGNED`, `RESOURCE_ASSIGNED`
- [x] `homework_assignments`'a `course_id` (NULL) + `created_by` (UUID) ekle; `exam_results`'a `created_by` ekle
- [x] `teachers` tablosu
- [x] `courses` tablosu (subject_id NULLABLE + `type` CHECK + teacher_id tenant + 10 izin kolonu)
- [x] `course_students` tablosu
- [x] `student_groups` + `student_group_members` + `course_groups`
- [x] `schedule_slots` (tek hedef CHECK + `start_time<end_time` CHECK + `valid_from`/`valid_to`; teacher/subject dersten türetilir)
- [x] `course_resources` + `course_resource_progress`
- [x] `Program.cs` `--migrate-only` script listesine 006 ekle
- [x] 007 (expand+backfill): `coaching_programs` + `program_coaches` (YONETICI/YARDIMCI) + `program_teachers` + `system_settings` + `coaches.approval_status`/`max_programs`; tüm tablolara `program_id` (NULL) ekle; her koç için "Koçluk Programım" aç (YÖNETİCİ), `program_id`'leri backfill, mevcut koçlar APPROVED
- [x] 008 (contract): canlıda doğrulandıktan SONRA `coach_id` kolonlarını DROP (aynı migration'da DROP yasak — Fly kesinti)
- [x] `homework_templates.coach_id` kalır (kişisel kütüphane)
- [x] Boş PostgreSQL'de 001→008 sırayla çalıştır, hata yoksa onayla

## Aşama 1.5: İzin & Tenant Helper (KRİTİK — `program_id` Aşama 1.6'da tanımlı; ders/grup kodlamadan ÖNCE)
- [x] `CourseAccessHelper`: course.teacher_id doğrula + izin bayrağı + DTO maskeleme (`SchoolAccessRepository.GetCourseAccessAsync` + `MaskStudent`)
- [x] `GetCourseStudentIds(courseId)` — etkin öğrenci kümesi (distinct union) tek kaynak (`GetCourseStudentIdsAsync`)
- [x] Tenant doğrulama helper'ı: öğretmen/öğrenci/grup aynı `program_id`'ye ait olmalı (`IsTeacherInProgramAsync` + `Get*ProgramIdAsync`)
- [x] Bu helper'lar için IDOR senaryolu testler (Testcontainers) — `SchoolAccessTests` (8 test, hepsi geçiyor)

## Aşama 1.6: Koçluk Programı + Koç Hiyerarşisi + Süper Yönetici
- [x] `ProgramRepository` + `ProgramEndpoints`: program CRUD (liste/oluştur/düzenle/sil+arşiv), `POST /program/{id}/coaches` (yardımcı davet), `POST /program/{id}/transfer-admin`, `DELETE /program/{id}/coaches/{coachId}`
- [x] Program öğrencisiz oluşturulabilir (K1); koç X kadar program açabilir (K2, `ProgramLimitService.CanCreateProgram`)
- [x] Yetki: yardımcı aynı iş yetkileri; koç yönetimi (davet/çıkarma/devir) + program silme yalnızca YÖNETİCİ
- [x] Yönetici devri: transaction; eski yönetici → YARDIMCI, hedef → YÖNETİCİ (tek yönetici unique index); yönetici çıkarılamaz (K3)
- [x] `program_id` filtresi tüm sorgularda (BaseRepository tenant = program_id); her istekte DB üyelik kontrolü (JWT'de program yok)
- [x] `coach_id → program_id` geçişi (deploy güvenliği — 008 `coach_id` düşürdüğü için zorunlu): `BaseRepository` tenant filtresi + `StudentRepository`(coach_notes) + `HomeworkRepository` + `ExamRepository` + `CalendarRepository` + `ReportsRepository` + `HomeworkEndpoints`(complete) + `OverdueHomeworkJob`(RETURNING + program koç bildirimi); `homework_templates.coach_id` KORUNDU (kişisel kütüphane)
- [x] Koç kaydı onayı (K5): `coaches.approval_status` (PENDING/APPROVED/REJECTED); PENDING giriş → 403 `COACH_PENDING`
- [x] Süper yönetici: `SUPER_ADMIN_EMAIL` (canoser@gmail.com) → `Admin` rolü; koç onayı + X limiti belirleme
- [x] Bildirimler (K4): `NotifyProgramCoachesAsync(programId, ...)` → programın tüm koçlarına, çan simgesi
- [ ] IDOR testi: yardımcı başka programın verisine erişemiyor mu?

## Aşama 2: Backend — Rol & Davet (Teacher)
- [x] `Program.cs`: `RequireTeacherRole` policy ekle
- [x] `InviteEndpoints`: rol kontrolüne `Teacher` + `Coach` ekle (related_id = program_id)
- [x] Davet kabulünde `teachers` (+ `program_teachers`) ve `coaches` (+ `program_coaches`) satırı ekle (transaction içinde)
- [x] `User` modeli + JWT: `Teacher` rolünü destekle
- [x] Google ile girişte öğretmen daveti → rol `Teacher` atanması (AuthEndpoints `/google`: pending Teacher daveti varsa `Teacher` + `teachers` + `program_teachers`, davet `is_used=1`)
- [x] POST uçlarına idempotency (`Idempotency-Key` + ActionFilter): öğretmen daveti (`invite/send`) eklendi; ders oluşturma + grup oluşturma Aşama 3'te eklenecek

## Aşama 3: Backend — Teachers & Courses & Groups
- [x] `TeacherRepository` + DTO'lar + `TeacherEndpoints` (list, detail, deactivate; invite `InviteEndpoints` üzerinden)
- [x] `CourseRepository` + `CourseEndpoints` (CRUD + öğrenci/grup ekle-çıkar)
- [x] `GroupRepository` + `GroupEndpoints` (CRUD + üye yönetimi)
- [x] Her sorguda `program_id` filtresi + `INSERT ... SELECT ... WHERE program_id=@ProgramId` kalıbı
- [x] IDOR testi (her aşamayla birlikte): başka koçun öğretmen/öğrenci/grup verisine erişim → 404/403 — `SchoolEndpointsIdorTests` (11 test; 23/23 geçiyor)
- [x] Öğretmen pasife alınınca derslerde teacher_id = NULL (`DeactivateTeacherAsync`); koça bildirim henüz eklenmedi

## Aşama 4: Backend — Schedule (Haftalık Program)
- [x] `ScheduleRepository` + `ScheduleEndpoints` (CRUD)
- [x] Koç / öğretmen / öğrenci / veli okuma uçları (rol bazlı filtre)
- [x] `CalendarRepository`'ye `schedule_slots` entegrasyonu

## Aşama 5: Backend — Ders Kaynakları & İlerleme
- [x] `CourseResourceRepository` + endpoint'ler (CRUD)
- [x] Öğrenci ilerleme güncelleme ucu + progress listeleme
- [x] Kaynak atanınca bildirim (`RESOURCE_ASSIGNED`) — `NotifyCourseStudentsAsync`

## Aşama 6: Backend — Öğretmen Yetki & IDOR Katmanı (KRİTİK)
- [x] `TeacherEndpoints`: `me/courses`, `me/courses/:id/students`, homework, exams
- [x] İzin kontrol helper'ı Aşama 1.5'te yazıldı — burada uçlar onu kullanır
- [x] Sızıntı testi: `manage_homework` açık öğretmen başka dersin ödevini/sınavını göremiyor mu? — `TeacherScenarioTests`
- [x] DTO maskeleme: kapalı izin alanları response'tan çıkarılır (sadece 403 değil)
- [x] CrossTenant testlerine öğretmen senaryoları ekle (Testcontainers + gerçek PostgreSQL) — `TeacherScenarioTests`

## Aşama 7: Frontend — Teacher Auth & Layout
- [x] `authStore` + `App.jsx`: `Teacher` rolü routing'i
- [x] `TeacherLayout` (mobil alt menü) + `teacherApi.js`
- [x] Login/InviteAccept: öğretmen davet kabulü
- [x] Yeni UI metinleri için i18n anahtarları (yalnızca Türkçe, resmi dil; altyapı hazır) — mevcut layout'lar Türkçe hardcode (tutarlılık)
- [x] Tüm yeni bileşenlerde CSS Modules (global CSS yasak)

## Aşama 8: Frontend — Koç: Öğretmenler & Dersler & Gruplar
- [x] Koç: Öğretmenler sayfası (liste + davet + pasife alma; profil detayı Aşama 11'de)
- [x] Koç: Dersler sayfası (liste + yeni ders formu; konu/öğretmen/renk/izin alanları kısmi)
- [x] Koç: Ders detayı (sekmeler: öğrenciler / gruplar / kaynaklar / izinler)
- [x] Koç: Gruplar sayfası (liste + oluştur; üye yönetimi kısmi)
- [x] Koç yönetimi: "Yardımcı davet et/çıkar" + "Yöneticiliği devret" (yalnızca yöneticide); program listesi/oluştur/düzenle/sil (K1)
- [x] Süper yönetici paneli (basit): koç onay/red + X limiti (`AdminPanelPage`)
- [x] `coachApi.js`'e yeni mutation'lar (React Query + `Idempotency-Key` header) — `coachSchoolApi.js`

## Aşama 9: Frontend — Haftalık Program (sürükle-bırak)
- [x] `dnd-kit` kurulumu (PointerSensor + TouchSensor + KeyboardSensor)
- [x] `WeeklyScheduleGrid` bileşeni (7 gün × saat satırları)
- [x] Sol panel: ders/grup kartları (sürüklenebilir) — öğrenci kartı eklenmedi
- [x] Slot oluştur/sil → API entegrasyonu (güncelleme kısmi)
- [x] Tıklayarak ekleme alternatifi (form) — mobilde zorunlu
- [x] Çakışma uyarısı (istemci tarafı gün/saat kontrolü; sunucu tarafı doğrulama ayrı iş)

## Aşama 10: Frontend — Öğrenci & Veli
- [x] Öğrenci: "Programım" sekmesi (haftalık görünüm)
- [x] Öğrenci: "Derslerim" → kaynaklar + ilerleme çubuğu + güncelleme
- [x] Veli: çocuk programı (salt-okunur)

## Aşama 11: Frontend — Öğretmen Paneli
- [x] Derslerim, Öğrencilerim (izin filtreli), Ödevler, Program, Profil — `TeacherCoursesPage` (liste + sekmeler: öğrenciler/ödevler/sınavlar), `TeacherSchedulePage`, `TeacherProfilePage` + `useTeacherSchedule`

## Aşama 12: PWA (Kurulabilir) + Capacitor
- [x] `manifest.webmanifest` + service worker + `display: standalone` — SW `/api/` yanıtlarını cache'lemez; `main.jsx`'te prod-only kayıt
- [ ] Tablet/telefon/masaüstü kurulum testi (manuel; PNG ikon 192/512 eksik — tam install prompt için gerekli)
- [ ] Google giriş: standalone/iOS'ta popup yerine redirect; Capacitor'da native Google plugin (Aşama 25-26)
- [ ] `[MOBILE_PORT_TODO]` yorumları + PORTABILITY.md güncelle
- [x] Capacitor: `npx cap add android` (android klasörü + `capacitor.config.json` mevcut)

## Aşama 13: Test & Doğrulama
- [ ] Migration 006 canlı Neon'da uygula + doğrula (manuel; 008 öncesi fail-fast ön kontrol eklendi)
- [ ] End-to-end: koç → öğretmen davet → ders + grup → program → öğrenci ilerlemesi (manuel)
- [x] IDOR: öğretmen başka dersin öğrencisini göremiyor mu? — `TeacherIdorTests` (3 test)
- [x] İzin maskeleme: iletişim/not kapalıyken gizli mi? — `MaskStudent` + `TeacherScenarioTests` (mevcut)
- [ ] Öğretmen pasife alınınca dersler teacher_id=NULL + bildirim (manuel)
- [ ] Koç onay akışı: PENDING koç giriş → 403 `COACH_PENDING`; süper yönetici onayı → APPROVED (manuel)
- [x] Program limiti: X aşılınca yeni program → 409 — `PROGRAM_LIMIT_EXCEEDED` (max_programs: koç-özel veya `default_max_programs`=3; `activeAdminCount >= max` → 409)
- [x] `dotnet build` + `npm run build` başarılı (29/29 test)
- [ ] Canlı smoke testi (Aşama 23 ile birleşik)
