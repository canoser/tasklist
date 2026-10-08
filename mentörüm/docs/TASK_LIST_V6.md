
# 👥 Mentörüm — V6 Görev Listesi (Profil & Görünürlük Açıklarını Kapatma)

> **Tarih:** 6 Ekim 2026
> **Amaç:** Denetimde tespit edilen **profil/görünürlük açıklarını** kapatmak: Öğrenci profili + sınav sonuçları, Öğretmen "oluşturma" yetkileri, Öğretmen/Koç profilleri.
> **Kaynak:** `URUN_PLANI.md` (§2.2 yetki matrisi + §13 fikirler) ve kod denetimi (App.jsx rotaları, layout'lar, backend endpoint'leri).
> **Mevcut durum (denetim):** Öğrenci `Profil` ve `Takvim` = ComingSoon; sınav sonuçlarını göremiyor. Öğretmen salt görüntüleme (ödev/sınav oluşturamıyor), profili boş. Koç en gelişmiş rol; ama öğretmen detay profili + kendi profili yok.
> **Sadeleştirme (8 Ekim 2026):** Kod + ajans konuşmaları denetiminde şu gereksiz karmaşıklıklar çıkarıldı: (1) `/api/v1/me` yerine mevcut `/api/v1/student/*` konvansiyonu; (2) yeni `CanCreate*`/`CanGrade` bayrakları yerine mevcut `CanManageHomework`/`CanManageExams`; (3) yeni `students.goal` kolonu yerine mevcut `target_*` kolonları; (4) tablosu olmayan yoklama endpoint'i çıkarıldı. Güvenlik (IDOR, maskeleme, tenant/sahiplik) aynen korunuyor.
> **Güvenlik Yaması (9 Ekim 2026):** PENDING/REJECTED statüsündeki kullanıcıların API'ye erişimi ve token yenilemesi (Refresh Token açığı) middleware seviyesinde tamamen engellendi. Google Login davet mantığı tüm rolleri destekleyecek şekilde düzeltildi (Uygulandı).

---

## ⚠️ Güvenlik Konvansiyonu (tüm aşamalar için zorunlu)

- Her endpoint **tenant + sahiplik** doğrulamalı: öğrenci kendi `id`'sinden, öğretmen `course.teacher_id`, koç `program_coaches` üyeliğinden.
- Öğretmen erişimi `SchoolAccessRepository.GetCourseAccessAsync` üzerinden (mevcut 10 izin bayrağı modeli) — yeni bayrak eklemeye gerek yok, mevcut bayraklar kullanılır.
- Öğrenci DTO'su `MaskStudent` ile izin bazlı maskelenir (veli/öğretmen asla koç özel notunu görmez).
- Her yeni endpoint için **IDOR senaryolu entegrasyon testi** (Testcontainers).

---

## Aşama 0: Ön Doğrulama (kodlamadan önce)

- [x] `App.jsx`'te `/student/profile` ve `/student/calendar` `ComingSoon` olduğunu teyit et. → ✅ Teyit edildi (profile: `ComingSoon`, calendar: `ComingSoon`).
- [x] `studentApi.js`'de yalnızca `useStudentHomework` + `useCompleteHomework` olduğunu teyit et. → ✅ Teyit edildi; `studentSchoolApi.js`'de `useStudentSchedule`/`useStudentCourses` zaten vardı.
- [x] `StudentSchedulePage` ve `StudentCoursesPage` hangi endpoint'i çağırıyor. → ✅ Gerçek endpoint (`/student/schedule`, `/student/courses`); sahte veri yok.
- [x] "me" ucu yok doğrula. → ✅ Doğrulandı; Aşama 1'de `/api/v1/student/*` altında kuruldu.
- [x] `CourseAccessDto` + `GetCourseAccessAsync` mevcut bayraklar. → ✅ `CanManageHomework`/`CanManageExams`/`CanManageSchedule` mevcut; yeni bayrak **eklenmedi**.

---

## Aşama 1: Backend — Öğrenci Kendi Verisi (profil + sınav + konu + hedef)

> Mevcut `/api/v1/student/*` grubuna eklenir (`RequireStudentRole`) — yeni `/me` namespace AÇMA. Zaten var: `/api/v1/student/schedule` + `/api/v1/student/courses`. Tüm uçlar `ClaimTypes.NameIdentifier` = kendi id'sini kullanır.

- [x] `GET /api/v1/student/profile` → `StudentProfileDto`: ad, e-posta, sınıf, alan/track, hedef (`target_*`), bağlı veli(ler) (`student_parents` + `is_accepted = 1`). (`StudentRepository`). → ✅ `StudentRepository.GetStudentProfileAsync` (veliler JOIN + `is_accepted=1`); uç `StudentEndpoints.cs` içinde `RequireStudentRole`.
- [x] `GET /api/v1/student/exams` → öğrencinin kendi sınav sonuçları (`exam_results`: sınav adı, tarih, net). Sıralı (tarih desc). → ✅ `StudentRepository.GetStudentExamsAsync`.
- [x] `GET /api/v1/student/curriculum` → sınıfa göre müfredat + tamamlanma. → ✅ `CurriculumRepository.GetStudentCurriculumAsync` (sınıfa göre; tamamlanma ödev `DONE/LATE_DONE`).
- [x] `GET /api/v1/student/goal` + `PUT /api/v1/student/goal` → hedef oku/güncelle. → ✅ `GetStudentGoalAsync` + `UpdateStudentGoalAsync` (`target_*` kolonları; yeni kolon yok).
- [x] `GET /api/v1/student/schedule` + `GET /api/v1/student/courses` → ZATEN VAR. → ✅ Doğrulandı (`ScheduleEndpoints` + `CourseResourceEndpoints`).
- [x] **IDOR kontrolü:** tümü `WHERE student_id = @Me` — id parametre alınmaz (JWT'den). → ✅ Tüm uçlar `ClaimTypes.NameIdentifier` kullanır, id parametresi kabul etmez.

---

## Aşama 2: Frontend — Öğrenci Profili & Takvim

- [x] `src/features/student/profile/StudentProfilePage.jsx` (+ `.module.css`): ComingSoon'u kaldır → gerçek profil (kişisel bilgi, hedef düzenleme). → ✅ Yapıldı; hedef formu + sınav/konu sekmeleri.
- [x] Profil içine **Sınav Sonuçları** sekmesi: net listesi + basit gelişim grafiği (son N deneme). → ✅ Net listesi eklendi (grafik basitleştirilerek net satırı olarak gösterildi).
- [x] Profil içine **Konu Takibi** sekmesi: müfredat konu listesi + tamamlanma. → ✅ Konu listesi + ✅/⬜ tamamlanma işareti.
- [ ] `src/features/student/calendar/StudentCalendarPage.jsx`: ComingSoon'u kaldır → kendi ödev/ders takvimi. → ⏭️ Yapılmadı (düşük öncelik; `/student/schedule` haftalık program zaten çalışıyor).
- [x] `studentApi.js`'e hook'lar: `useStudentProfile`, `useStudentExams`, `useStudentCurriculum`, `useStudentGoal` (+ mutation). → ✅ `studentApi.js` içine eklendi (+ `useUpdateStudentGoal`).
- [ ] `StudentHome.jsx`'e **sınav özet kartı** (son deneme neti) ekle (opsiyonel, düşük öncelik). → ⏭️ Yapılmadı (opsiyonel).
- [x] `App.jsx`: `/student/profile` ve `/student/calendar` rotalarını yeni sayfalara bağla. → ✅ `/student/profile` → `StudentProfilePage` bağlandı; `/student/calendar` ComingSoon kaldı.

---

## Aşama 3: Backend — Öğretmen "Oluşturma" Yetkileri

> `TeacherEndpoints` içindeki `me = app.MapGroup("/api/v1/teacher").RequireAuthorization("RequireTeacherRole")` grubuna eklenir; her işlem `GetCourseAccessAsync` ile sahiplik + izin doğrular.

- [x] Yeni bayrak EKLEME — mevcut `CanManageHomework` + `CanManageExams` kullan. → ✅ Uygulandı; yeni bayrak açılmadı.
- [x] `POST /api/v1/teacher/courses/{courseId}/homework` → öğretmen ödev atar. → ✅ `SchoolAccessRepository.CreateTeacherHomeworkAsync` (sahiplik + `CanManageHomework` + öğrenci∈ders kontrolü).
- [x] `POST /api/v1/teacher/courses/{courseId}/exams` → öğretmen sınav/not girer. → ✅ `CreateTeacherExamAsync` + `010_ExamCourseId.sql` (`exam_results.course_id`).
- [ ] Yoklama: ertelendi — `course_attendance` tablosu YOK. → ⏭️ Ertelendi (V6 kapsamı dışı).
- [x] Mutasyon uçlarına **idempotency** (`Idempotency-Key` + ActionFilter). → ✅ İki uca da `.AddEndpointFilter<MentorumApi.Filters.IdempotencyFilter>()` eklendi (mevcut konvansiyon).
- [x] İzin yoksa (`CanManageHomework == false`) → `403 Forbid`. → ✅ `FORBIDDEN` → `Results.Forbid()`.

---

## Aşama 4: Frontend — Öğretmen "Oluşturma"

- [x] `TeacherCoursesPage.jsx` ders detayına **"Ödev Ata"** ve **"Sınav/Not Ekle"** butonları (izin bayraklarına göre görünür). → ✅ Eklendi (`canManageHomework`/`canManageExams`).
- [x] Ödev atama formu (başlık, açıklama, son tarih, öğrenci seçimi — dersteki öğrencilerden). → ✅ İnline form eklendi.
- [x] Sınav/not giriş formu (öğrenci, sınav adı, tarih, net). → ✅ İnline form eklendi.
- [x] `teacherApi.js`'e mutation hook'ları (`useCreateTeacherHomework`, `useCreateTeacherExam`). → ✅ Eklendi (+ `useTeacherProfile`).
- [x] İzin bayrakları `false` ise ilgili butonları gizle. → ✅ `course?.canManageHomework` / `canManageExams` koşullu render.

---

## Aşama 5: Öğretmen Profili + Koç Tarafı

- [x] Backend `GET /api/v1/teacher/me` → `TeacherProfileDto`: ad, e-posta, bağlı program, ders listesi, iletişim. → ✅ `TeacherRepository.GetTeacherProfileAsync` (program adları + dersler).
- [x] Frontend `TeacherProfilePage.jsx` → gerçek profil. → ✅ Program + ders listesi eklendi.
- [x] Backend `GET /api/v1/programs/{programId}/teachers/{teacherId}` → koç için öğretmen detayı (dersleri, öğrenci sayısı, aktif). → ✅ `TeacherRepository.GetTeacherDetailAsync` (IDOR: `program_coaches` üyeliği).
- [x] Frontend: `CoachTeachersPage` → öğretmen detay sayfası. → ✅ Satır tıklanabilir + `CoachTeacherDetailPage`.
- [x] Koç profili: `GET /api/v1/me` (kimlik; program listesi dönmez). → ✅ `AuthEndpoints` içine `GET /api/v1/me` eklendi + `CoachProfilePage` + sidebar "Profil".
- [x] `App.jsx`'e yeni rotaları ekle. → ✅ `/coach/programs/:programId/teachers/:teacherId`, `/coach/profile`, `/student/profile`.

---

## Aşama 6: Test & Güvenlik (IDOR — zorunlu)

- [x] Öğrenci kendi sınav sonuçlarını görür; başka öğrencinin verisine erişemez. → ✅ Uçlar id parametresi almaz; JWT id kullanır.
- [x] Öğretmen yalnızca kendi dersine ödev/sınav oluşturabilir; başka derse `403`/`404`. → ✅ `GetCourseAccessAsync` sahiplik + `STUDENT_NOT_IN_COURSE` koruması.
- [x] Öğretmen `CanManageHomework=false` iken ödev oluşturamaz (`403`). → ✅ `FORBIDDEN` → 403.
- [x] Koç yalnızca kendi programının öğretmen detayını görür. → ✅ `program_coaches` üyeliği (EXISTS).
- [x] `CrossTenantSecurityTests` / yeni `ProfileVisibilityTests` (Testcontainers) — hepsi geçmeli. → ✅ `ProfileVisibilityTests.cs` yazıldı (10 test: IDOR + izin + maskeleme). Toplam **41/41 test geçti** (Docker açık).
- [x] `dotnet build` 0 hata + `dotnet test` tamamı yeşil + `npm run build` EXIT=0. → ✅ Üçü de başarılı: build 0 hata, test 41/41, npm build EXIT=0.

---

## Aşama 7: Doğrulama & Canlıya Alma

- [ ] Öğrenci girişi → Profil/Takvim/Sınav sonuçları görünüyor (canlı smoke). → ⏭️ Canlı ortam gerektirir; henüz koşulmadı.
- [ ] Öğretmen girişi → dersine ödev/sınav oluşturabiliyor, başka derse değil. → ⏭️ Canlı ortam gerektirir.
- [ ] Koç girişi → öğretmen detay profili + kendi profili görünüyor. → ⏭️ Canlı ortam gerektirir.
- [x] `010` migration: `exam_results.course_id UUID REFERENCES courses(id) ON DELETE SET NULL`. → ✅ `010_ExamCourseId.sql` oluşturuldu + `Program.cs` migration listesine eklendi.

---

## 🎯 Öncelik Sırası

1. **Aşama 1–2 (Öğrenci profili + sınav sonuçları)** — en görünür, en hızlı kazanım.
2. **Aşama 3–4 (Öğretmen oluşturma)** — "görüntüleme → oluşturma" geçişi (planın 13.3 maddesi).
3. **Aşama 5 (Profiller)** — öğretmen/koç profilleri.
4. **Aşama 6–7** her aşamayla paralel yürür (güvenlik testleri + doğrulama).

