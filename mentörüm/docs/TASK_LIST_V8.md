# 🧭 Mentörüm — V8 Görev Listesi (Okul Modeli Güvenlik & UX Düzeltmeleri)

> **Tarih:** 16 Ekim 2026
> **Amaç:** `docs/OKUL_MODELI_DURUM_RAPORU.md` sentezindeki "Ortak Eylem Listesi" (P0–P3) kalemlerini somut, test edilebilir görevlere dönüştürmek.
> **Kaynak:** `docs/OKUL_MODELI_DURUM_RAPORU.md` → BÖLÜM 3 §4 (Ortak Eylem Listesi)
> **Model:** DeepSeek

---

## ⚠️ Güvenlik Konvansiyonu (tüm aşamalar için zorunlu)

- Her yeni/değişen endpoint **tenant + sahiplik** doğrulamalı: öğretmen `course.teacher_id` + `course_id`, veli `student_parents` + `is_accepted=1`, koç `program_coaches`, öğrenci `student_id`. (DeepSeek)
- Öğretmen ödev/sınav/not uçları her zaman `course_id` ile filtrelenir. (DeepSeek)
- Öğrenci verisi `MaskStudent` ile izin bazlı maskelenir. (DeepSeek)
- Her backend değişikliğinde **IDOR senaryolu entegrasyon testi** (Testcontainers) zorunludur. (DeepSeek)
- Hard-delete yok; `is_active=0` / `ON DELETE SET NULL` kalıbı korunur. (DeepSeek)

---

## Aşama 1: P0 — Kritik Güvenlik Düzeltmeleri

### 1.1 Öğretmenler arası ödev/sınav veri sızıntısı (course_id filtresi) (DeepSeek)

- [ ] `Backend/MentorumApi/Data/SchoolAccessRepository.cs` → `GetTeacherCourseHomeworkAsync` sorgusuna `AND h.course_id = @CourseId` ekle. Şu an `WHERE h.program_id = (SELECT program_id FROM courses WHERE id = @CourseId) AND h.student_id IN (...)` var; `course_id` filtresi YOK → Biyoloji öğretmeni öğrencisinin Matematik/Fizik ödevlerini de görüyor. (DeepSeek)
- [ ] Aynı dosyada `GetTeacherCourseExamsAsync` sorgusuna `AND e.course_id = @CourseId` ekle. (DeepSeek)
- [ ] **Karar notu:** Koçun `AssignHomeworkAsync` ile atadığı `course_id = NULL` ödevler bu filtreyle öğretmene görünmeyecek. Bu en güvenli davranıştır; kabul edilip koda yorum olarak düşülmeli. (DeepSeek)
- [ ] **IDOR testi:** `Backend/MentorumApi.Tests/CrossTenantSecurityTests.cs`'e "öğretmen, kendi dersindeki öğrencinin başka derse ait ödev/sınavını göremez" senaryosu ekle. (DeepSeek)

### 1.2 Veli yetkisiz profil okuma (is_accepted eksik) (DeepSeek)

- [ ] `Backend/MentorumApi/Endpoints/ParentEndpoints.cs` → `GET /parents/children/{studentId}` içindeki `student_parents` sorgusuna `AND is_accepted = 1` ekle (satır 42-44; `my-children` ve ödev ucunda bu kontrol var, burada unutulmuş). (DeepSeek)
- [ ] **IDOR testi:** kabul edilmemiş/iptal edilmiş veli ilişkisiyle çocuk profili isteği → `403 Forbid` dönmeli. (DeepSeek)

---

## Aşama 2: P1 — Mimari & UX

### 2.1 Öğretmen pasife alma global etkiliyor (DeepSeek)

- [ ] `Backend/MentorumApi/Data/TeacherRepository.cs` → `DeactivateTeacherAsync` içindeki `UPDATE teachers SET is_active = 0 WHERE id = @TeacherId` satırını kaldır. (DeepSeek)
- [ ] Yalnızca `UPDATE program_teachers SET is_active = 0 WHERE teacher_id = @TeacherId AND program_id = @ProgramId` çalışsın (o programdan düşsün). (DeepSeek)
- [ ] `UPDATE courses SET teacher_id = NULL WHERE teacher_id = @TeacherId AND program_id = @ProgramId` zaten program-scope'lu, koru. (DeepSeek)
- [ ] Öğretmenin aktif `program_teachers` kaydı hiç kalmadıysa `teachers.is_active = 0` yap (tüm programlardan düşünce). (DeepSeek)
- [ ] **Test:** iki programda kayıtlı öğretmen, bir programdan pasife alınınca diğer programdaki derslerine erişmeye devam etmeli. (DeepSeek)

### 2.2 Çok çocuklu velinin programları karışıyor (DeepSeek)

- [ ] `Backend/MentorumApi/Data/ScheduleRepository.cs` → `GetParentSlotsAsync` metoduna `Guid? studentId` parametresi ekle; verilmişse `AND s.student_id = @StudentId` (veya course/group üyelikleri o çocukla sınırlı) filtrele. (DeepSeek)
- [ ] `ParentEndpoints.cs`'e çocuk bazlı `GET /parents/children/{studentId}/schedule` ucu ekle (is_accepted kontrolüyle). (DeepSeek)
- [ ] Frontend: `ParentSchedulePage.jsx` + `parentApi.js` → çocuk seçici dropdown; seçili çocuğun programını göster. (DeepSeek)

### 2.3 Derse öğrenci/grup eklemede elle UUID girişi (DeepSeek)

- [ ] `Frontend/src/features/coach/courses/CoachCourseDetailPage.jsx` → "Öğrenci ID" ve "Grup ID" ham UUID input'larını kaldır. (DeepSeek)
- [ ] Mevcut `useStudents` / `useGroups` hook'larıyla arama destekli dropdown/modal seçici yap (isimle ara, seç, ekle). (DeepSeek)
- [ ] Aynı düzeltmeyi gerekirse `CoachGroupsPage.jsx` üye ekleme alanına da uygula. (DeepSeek)

---

## Aşama 3: P2 — UI / Fonksiyon / Temizlik

### 3.1 Koça öğretmen atama + 10 izin düzenleme arayüzü (DeepSeek)

- [ ] `Frontend/src/features/coach/courses/CoachCoursesPage.jsx` → ders oluşturma formuna öğretmen `<select>` (programın öğretmenleri) + ders tipi + renk + 10 izin toggle'ı ekle. Backend `CreateCourseRequest.TeacherId` + `teacher_can_*` alanları hazır. (DeepSeek)
- [ ] `CoachCourseDetailPage.jsx` → "İzinler" sekmesini salt okunurdan **düzenlenebilir** hale getir (switch + Kaydet → `PUT /programs/{id}/courses/{courseId}`). (DeepSeek)
- [ ] Ders detayına öğretmen değiştirme dropdown'ı ekle. (DeepSeek)

### 3.2 Veliye sınav sonuçları erişimi (DeepSeek)

- [ ] `ParentEndpoints.cs` → `GET /parents/children/{studentId}/exams` ucu (is_accepted kontrolüyle; öğrencinin `exam_results` listesini döndür). (DeepSeek)
- [ ] Frontend: `ParentLayout` + `ParentHomework` yanına "Sınavlar" sekmesi; `parentApi.js`'e hook. (DeepSeek)

### 3.3 Öğretmenin derse/gruba toplu ödev ataması (DeepSeek)

- [ ] `SchoolAccessRepository.CreateTeacherHomeworkAsync` → tek `StudentId` yerine dersin TÜM öğrencilerine (course_students ∪ course_groups) toplu atama desteği ekle. (DeepSeek)
- [ ] `TeacherCoursesPage.jsx` → "Tüm derse ödev ata" seçeneği (öğrenci seçmeden). (DeepSeek)

### 3.4 Ölü izin bayrakları (schedule / notes) (DeepSeek)

- [ ] Karar: `teacher_can_view_schedule`, `teacher_can_manage_schedule`, `teacher_can_view_notes`, `teacher_can_add_notes` ya uç+UI ile hayata geçir ya da modelden çıkar. (DeepSeek)
- [ ] Seçenek A: Öğretmen schedule/notes endpoint'leri + UI. Seçenek B: bu 4 bayrağı şemadan kaldır (önerilen: A, çünkü modelde öngörülmüş). (DeepSeek)

### 3.5 `GetTeacherProgramIdAsync` `LIMIT 1` kısıtı (DeepSeek)

- [ ] `Backend/MentorumApi/Data/SchoolAccessRepository.cs` → `GetTeacherProgramIdAsync` yerine öğretmenin TÜM aktif programlarını döndüren `GetTeacherProgramIdsAsync` ekle; çağıranları buna göre güncelle. (DeepSeek)

---

## Aşama 4: P3 — Altyapı

### 4.1 Merkezi `ProgramAccessGuard`'ı yaygınlaştır (DeepSeek)

- [ ] `Backend/MentorumApi/Services/ProgramAccessGuard.cs` (EnsureCoachInProgramAsync / EnsureCoachOwnsStudentAsync / IsParentOfStudentAsync / IsTeacherOfCourseAsync) şu an yalnız `ExamEndpoints`'te kullanılıyor. (DeepSeek)
- [ ] `StudentEndpoints`, `CourseEndpoints`, `GroupEndpoints`, `HomeworkEndpoints`'te dağınık `IsMemberAsync`/inline sahiplik kontrollerini bu guard'a taşı (defense-in-depth olarak SQL'deki filtreler kalır). (DeepSeek)
- [ ] `.agents/rules/security_guidelines.md` → `ProgramAccessGuard` zorunlu kalıp olarak işaretli; tüm repoların buna uyması sağlanmalı. (DeepSeek)

---

## Doğrulama Kontrol Listesi

- [ ] `dotnet build Mentorum.sln` → 0 hata. (DeepSeek)
- [ ] `dotnet test Mentorum.sln` → tümü yeşil (yeni IDOR testleri dahil). (DeepSeek)
- [ ] `cd Frontend && npm run build` + `npm run lint` → 0 hata. (DeepSeek)
- [ ] P0 güvenlik düzeltmeleri (1.1, 1.2) diğerlerinden önce merge edilir. (DeepSeek)

