# 🏫 Mentörüm — V5 Görev Listesi (Okul/Dershane Modeli)
> **Tarih:** 6 Ekim 2026
> **Durum:** ⏳ Planlandı — Koçluk Programı modeli (6 Ekim) ile güncellendi; kodlanmadı.
> **Kaynak:** `V5_OKUL_MODELI.md` (ayrıntılı tasarım). Görevler sıralıdır — her aşama bir öncekini varsayar.

---

## Aşama 0: Ön Koşullar (kodlamadan önce)
- [x] Migration 001–005'in canlıda uygulandığını doğrula (canlı register/invite/müfredat/health çalışıyor; tablolar mevcut)
- [x] `course_resources` V4 çakışma kontrolü → ÇAKIŞMA YOK (V4'te yalnızca `resource_book`/`resource_ref` basit metin; ayrı yeni özellik)
- [ ] `.agents/AGENTS.md` kurallarını oku (i18n, CSS Modules, idempotency, PORTABILITY.md)
- [x] Not: V4 Aşama 23 beklenebilir; V5 Aşama 1–6 ondan bağımsız ilerleyebilir
- [ ] Karar (6 Ekim): Koçluk Programı modeli — yönetici/yardımcı + süper yönetici onayı + X program limiti (bkz. `V5_OKUL_MODELI.md` §1.5)

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
- [ ] `CourseAccessHelper`: course.teacher_id doğrula + izin bayrağı + DTO maskeleme
- [ ] `GetCourseStudentIds(courseId)` — etkin öğrenci kümesi (distinct union) tek kaynak
- [ ] Tenant doğrulama helper'ı: öğretmen/öğrenci/grup aynı `program_id`'ye ait olmalı
- [ ] Bu helper'lar için IDOR senaryolu testler (Testcontainers)

## Aşama 1.6: Koçluk Programı + Koç Hiyerarşisi + Süper Yönetici
- [x] `ProgramRepository` + `ProgramEndpoints`: program CRUD (liste/oluştur/düzenle/sil+arşiv), `POST /program/{id}/coaches` (yardımcı davet), `POST /program/{id}/transfer-admin`, `DELETE /program/{id}/coaches/{coachId}`
- [x] Program öğrencisiz oluşturulabilir (K1); koç X kadar program açabilir (K2, `ProgramLimitService.CanCreateProgram`)
- [x] Yetki: yardımcı aynı iş yetkileri; koç yönetimi (davet/çıkarma/devir) + program silme yalnızca YÖNETİCİ
- [x] Yönetici devri: transaction; eski yönetici → YARDIMCI, hedef → YÖNETİCİ (tek yönetici unique index); yönetici çıkarılamaz (K3)
- [x] `program_id` filtresi tüm sorgularda (BaseRepository tenant = program_id); her istekte DB üyelik kontrolü (JWT'de program yok)
- [x] Koç kaydı onayı (K5): `coaches.approval_status` (PENDING/APPROVED/REJECTED); PENDING giriş → 403 `COACH_PENDING`
- [x] Süper yönetici: `SUPER_ADMIN_EMAIL` (canoser@gmail.com) → `Admin` rolü; koç onayı + X limiti belirleme
- [x] Bildirimler (K4): `NotifyProgramCoachesAsync(programId, ...)` → programın tüm koçlarına, çan simgesi
- [ ] IDOR testi: yardımcı başka programın verisine erişemiyor mu?

## Aşama 2: Backend — Rol & Davet (Teacher)
- [ ] `Program.cs`: `RequireTeacherRole` policy ekle
- [x] `InviteEndpoints`: rol kontrolüne `Teacher` + `Coach` ekle (related_id = program_id)
- [x] Davet kabulünde `teachers` (+ `program_teachers`) ve `coaches` (+ `program_coaches`) satırı ekle (transaction içinde)
- [x] `User` modeli + JWT: `Teacher` rolünü destekle
- [ ] Google ile girişte öğretmen daveti → rol `Teacher` atanması
- [ ] POST uçlarına idempotency (`Idempotency-Key` + ActionFilter): ders oluşturma, öğretmen daveti, grup oluşturma

## Aşama 3: Backend — Teachers & Courses & Groups
- [ ] `TeacherRepository` + DTO'lar + `TeacherEndpoints` (list, invite, detail, update, deactivate)
- [ ] `CourseRepository` + `CourseEndpoints` (CRUD + öğrenci/grup ekle-çıkar)
- [ ] `GroupRepository` + `GroupEndpoints` (CRUD + üye yönetimi)
- [ ] Her sorguda `program_id` filtresi + `INSERT ... SELECT ... WHERE program_id=@ProgramId` kalıbı
- [ ] IDOR testi (her aşamayla birlikte): başka koçun öğretmen/öğrenci/grup verisine erişim → 404/403
- [ ] Öğretmen pasife alınınca derslerde teacher_id = NULL + koça bildirim

## Aşama 4: Backend — Schedule (Haftalık Program)
- [ ] `ScheduleRepository` + `ScheduleEndpoints` (CRUD)
- [ ] Koç / öğretmen / öğrenci / veli okuma uçları (rol bazlı filtre)
- [ ] `CalendarRepository`'ye `schedule_slots` entegrasyonu

## Aşama 5: Backend — Ders Kaynakları & İlerleme
- [ ] `CourseResourceRepository` + endpoint'ler (CRUD)
- [ ] Öğrenci ilerleme güncelleme ucu + progress listeleme
- [ ] Kaynak atanınca bildirim (`RESOURCE_ASSIGNED`)

## Aşama 6: Backend — Öğretmen Yetki & IDOR Katmanı (KRİTİK)
- [ ] `TeacherEndpoints`: `me/courses`, `me/courses/:id/students`, homework, exams
- [ ] İzin kontrol helper'ı Aşama 1.5'te yazıldı — burada uçlar onu kullanır
- [ ] Sızıntı testi: `manage_homework` açık öğretmen başka dersin ödevini/sınavını göremiyor mu?
- [ ] DTO maskeleme: kapalı izin alanları response'tan çıkarılır (sadece 403 değil)
- [ ] CrossTenant testlerine öğretmen senaryoları ekle (Testcontainers + gerçek PostgreSQL)

## Aşama 7: Frontend — Teacher Auth & Layout
- [ ] `authStore` + `App.jsx`: `Teacher` rolü routing'i
- [ ] `TeacherLayout` (mobil alt menü) + `teacherApi.js`
- [ ] Login/InviteAccept: öğretmen davet kabulü
- [ ] Yeni UI metinleri için i18n anahtarları (yalnızca Türkçe, resmi dil; altyapı hazır)
- [ ] Tüm yeni bileşenlerde CSS Modules (global CSS yasak)

## Aşama 8: Frontend — Koç: Öğretmenler & Dersler & Gruplar
- [ ] Koç: Öğretmenler sayfası (liste + davet + profil)
- [ ] Koç: Dersler sayfası (liste + yeni ders formu: konu + öğretmen + renk + izinler)
- [ ] Koç: Ders detayı (sekmeler: öğrenciler / gruplar / kaynaklar / izinler)
- [ ] Koç: Gruplar sayfası (liste + üye yönetimi)
- [ ] Koç yönetimi: "Yardımcı davet et/çıkar" + "Yöneticiliği devret" (yalnızca yöneticide); program listesi/oluştur/düzenle/sil (K1)
- [ ] Süper yönetici paneli (basit): koç onay/red + X limiti + program listesi (`AdminLayout`)
- [ ] `coachApi.js`'e yeni mutation'lar (React Query + `Idempotency-Key` header)

## Aşama 9: Frontend — Haftalık Program (sürükle-bırak)
- [ ] `dnd-kit` kurulumu (PointerSensor + TouchSensor + KeyboardSensor)
- [ ] `WeeklyScheduleGrid` bileşeni (7 gün × saat satırları)
- [ ] Sol panel: ders/grup/öğrenci kartları (sürüklenebilir)
- [ ] Slot oluştur/güncelle/sil → API entegrasyonu
- [ ] Tıklayarak ekleme alternatifi (form) — mobilde zorunlu
- [ ] Çakışma uyarısı (sunucu hesabı; bilgilendirme, engelleme değil)

## Aşama 10: Frontend — Öğrenci & Veli
- [ ] Öğrenci: "Programım" sekmesi (haftalık görünüm)
- [ ] Öğrenci: "Derslerim" → kaynaklar + ilerleme çubuğu + güncelleme
- [ ] Veli: çocuk programı (salt-okunur)

## Aşama 11: Frontend — Öğretmen Paneli
- [ ] Derslerim, Öğrencilerim (izin filtreli), Ödevler, Program, Profil

## Aşama 12: PWA (Kurulabilir) + Capacitor
- [ ] `manifest.webmanifest` + service worker + `display: standalone` — service worker kimlikli API yanıtlarını cache'lemez (çıkışta veri sızmasın)
- [ ] Tablet/telefon/masaüstü kurulum testi
- [ ] Google giriş: standalone/iOS'ta popup yerine redirect; Capacitor'da native Google plugin
- [ ] `[MOBILE_PORT_TODO]` yorumları + PORTABILITY.md güncelle
- [ ] Capacitor: `npx cap add android` (iOS yayınlanmayacak — atlandı)

## Aşama 13: Test & Doğrulama
- [ ] Migration 006 canlı Neon'da uygula + doğrula
- [ ] End-to-end: koç → öğretmen davet → ders + grup → program → öğrenci ilerlemesi
- [ ] IDOR: öğretmen başka dersin öğrencisini göremiyor mu?
- [ ] İzin maskeleme: iletişim/not kapalıyken gizli mi?
- [ ] Öğretmen pasife alınınca dersler teacher_id=NULL + bildirim
- [ ] Koç onay akışı: PENDING koç giriş → 403 `COACH_PENDING`; süper yönetici onayı → APPROVED
- [ ] Program limiti: X aşılınca yeni program → 409
- [ ] `dotnet build` + `npm run build` başarılı
- [ ] Canlı smoke testi (Aşama 23 ile birleşik)
