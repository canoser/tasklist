# 🏫 Mentörüm — V5 Görev Listesi (Okul/Dershane Modeli)
> **Tarih:** 4 Ekim 2026
> **Durum:** ⏳ Planlandı — Sonnet incelemesiyle güncellendi; kodlanmadı.
> **Kaynak:** `V5_OKUL_MODELI.md` (ayrıntılı tasarım). Görevler sıralıdır — her aşama bir öncekini varsayar.

---

## Aşama 0: Ön Koşullar (kodlamadan önce)
- [ ] Migration 001–005'in canlıda uygulandığını doğrula
- [ ] `course_resources` V4'teki benzer özellikle (kitap/video/soru takibi) çakışıyor mu? kontrol et — çakışma varsa tekrar yazma
- [ ] `.agents/AGENTS.md` kurallarını oku (i18n, CSS Modules, idempotency, PORTABILITY.md)
- [ ] Not: V4 Aşama 23 beklenebilir; V5 Aşama 1–6 ondan bağımsız ilerleyebilir

## Aşama 1: Migration & Veri Modeli (006_SchoolModel.sql)
- [ ] `006_SchoolModel.sql` yaz: `users.role` CHECK'e `'Teacher'` ekle (idempotent `DO $$` bloğu)
- [ ] `invite_tokens.role` CHECK'e `'Teacher'` ekle
- [ ] `notifications.type` CHECK genişlet: `SCHEDULE_UPDATED`, `TEACHER_ASSIGNED`, `RESOURCE_ASSIGNED`
- [ ] `homework_assignments`'a `course_id` (NULL) + `created_by` (UUID) ekle; `exam_results`'a `created_by` ekle
- [ ] `teachers` tablosu
- [ ] `courses` tablosu (subject_id NULLABLE + `type` CHECK + teacher_id tenant + 10 izin kolonu)
- [ ] `course_students` tablosu
- [ ] `student_groups` + `student_group_members` + `course_groups`
- [ ] `schedule_slots` (tek hedef CHECK + `start_time<end_time` CHECK + `valid_from`/`valid_to`; teacher/subject dersten türetilir)
- [ ] `course_resources` + `course_resource_progress`
- [ ] `Program.cs` `--migrate-only` script listesine 006 ekle
- [ ] Boş PostgreSQL'de 001→006 sırayla çalıştır, hata yoksa onayla

## Aşama 1.5: İzin & Tenant Helper (KRİTİK — ders/grup kodlamadan ÖNCE)
- [ ] `CourseAccessHelper`: course.teacher_id doğrula + izin bayrağı + DTO maskeleme
- [ ] `GetCourseStudentIds(courseId)` — etkin öğrenci kümesi (distinct union) tek kaynak
- [ ] Tenant doğrulama helper'ı: öğretmen/öğrenci/grup aynı coach_id'ye ait olmalı
- [ ] Bu helper'lar için IDOR senaryolu testler (Testcontainers)

## Aşama 2: Backend — Rol & Davet (Teacher)
- [ ] `Program.cs`: `RequireTeacherRole` policy ekle
- [ ] `InviteEndpoints`: rol kontrolüne `Teacher` ekle (related_id = coach_id)
- [ ] Davet kabulünde `teachers` tablosuna satır ekle (transaction içinde)
- [ ] `User` modeli + JWT: `Teacher` rolünü destekle
- [ ] Google ile girişte öğretmen daveti → rol `Teacher` atanması
- [ ] POST uçlarına idempotency (`Idempotency-Key` + ActionFilter): ders oluşturma, öğretmen daveti, grup oluşturma

## Aşama 3: Backend — Teachers & Courses & Groups
- [ ] `TeacherRepository` + DTO'lar + `TeacherEndpoints` (list, invite, detail, update, deactivate)
- [ ] `CourseRepository` + `CourseEndpoints` (CRUD + öğrenci/grup ekle-çıkar)
- [ ] `GroupRepository` + `GroupEndpoints` (CRUD + üye yönetimi)
- [ ] Her sorguda `coach_id` filtresi + `INSERT ... SELECT ... WHERE coach_id=@CoachId` kalıbı
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
- [ ] Capacitor: `npx cap add android` / `ios` (Aşama 25-26'ya bağla)

## Aşama 13: Test & Doğrulama
- [ ] Migration 006 canlı Neon'da uygula + doğrula
- [ ] End-to-end: koç → öğretmen davet → ders + grup → program → öğrenci ilerlemesi
- [ ] IDOR: öğretmen başka dersin öğrencisini göremiyor mu?
- [ ] İzin maskeleme: iletişim/not kapalıyken gizli mi?
- [ ] Öğretmen pasife alınınca dersler teacher_id=NULL + bildirim
- [ ] `dotnet build` + `npm run build` başarılı
- [ ] Canlı smoke testi (Aşama 23 ile birleşik)
