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

## 🎨 Tema ve Tasarım Konvansiyonu (UI geliştirmelerinde ZORUNLU) (3.8 flash gemini)
- **Sıfır Hardcoded Renk:** Yeni eklenecek hiçbir bileşende doğrudan hex renk (`#fff`, `#000`, `#ccc`, `#f8fafc` vb.) yazılmamalıdır. Renkler mutlaka sistem CSS token'larından (`var(--bg-color-surface)`, `var(--text-color-main)`, `var(--text-color-muted)`, `var(--border-color)`, `var(--color-primary)` vb.) alınmalıdır. Aksi halde **Cyber (Koyu)** ve **Nature (Yeşil)** temaları anında kırılır.
- **Cam ve Arka Plan Bütünlüğü (Backdrop Blur):** Açılır pencereler ve seçiciler `common/Modal` bileşeni üzerinden portal ile açılmalı; arkadaki `ThemeDecor` dinamik gök cisimlerini ve doğa dallarını örtmeyen şeffaf cam efektlerine saygı duymalıdır.
- **Mobil ve Tablet Duyarlılığı (Responsive):** Eklenen yeni sekmeler (ör. Veli Sınavlar sekmesi) alt navigasyon barında (`bottomNav`) sıkışma veya taşma yapmamalı, yatay kaydırma veya uygun ikon/metin ölçeklemesiyle yerleştirilmelidir.

## 🖥️ UI Erişilebilirlik Konvansiyonu (her özellik için zorunlu) (DeepSeek)
- Her kullanıcıya görünen özellik için bir **UI erişim noktası** (buton/sekme/sayfa/rota) tanımlanmalı; yalnızca backend endpoint'i eklenip arayüzde karşılığı olmayan özellik kabul edilmez. (DeepSeek)
- Salt güvenlik düzeltmeleri ve iç refactorlar (1.1, 1.2, 2.1, 4.1) yeni UI gerektirmez; etkileri mevcut arayüzden doğrulanabilir olmalıdır. (DeepSeek)
- Yeni sekme/buton eklenirken ilgili layout (CoachLayout/StudentLayout/ParentLayout/TeacherLayout) ve rota (`App.jsx`) birlikte güncellenmelidir. (DeepSeek)

---

## ✅ Tamamlanan (Son Uygulama — 16 Ekim 2026) (DeepSeek)

- [x] **Koç öğretmen yetki paneli:** `CoachCourseDetailPage` "İzinler" sekmesi artık düzenlenebilir — 11 izin için tıkla-aç/kapat + "İzinleri Kaydet" (`useUpdateCourse` → `PUT /courses/{id}`). (DeepSeek)
- [x] **Yeni bayrak:** `courses.teacher_can_process_homework` (migration `002_teacher_process_homework.sql`) + `homework_assignments.feedback` kolonu + `completed_by` CHECK'e `'Teacher'`. (DeepSeek)
- [x] **Öğretmen ödevi işleme ucu:** `POST /teacher/courses/{id}/homework/{assignmentId}/review` — `CanProcessHomework` + ödev `course_id` eşleşmesi zorunlu (cross-course korumalı). (DeepSeek)
- [x] **Öğretmen ödev onay arayüzü:** `TeacherCoursesPage` ödev kartında "Onayla / Geri Bildir" (geri bildirim + DONE). (DeepSeek)
- [x] **Sınav yönet toggle'ı:** `teacher_can_manage_exams` artık koçun izin panelinden açılıp kapatılabiliyor. (DeepSeek)
- [x] `useUpdateCourse` (coachSchoolApi) + `useReviewTeacherHomework` (teacherApi) hook'ları eklendi. (DeepSeek)
- [x] Doğrulama: backend build 0 hata, `dotnet test` 43/43, frontend build ✓. (DeepSeek)
- [x] **P0 (1.1):** `GetTeacherCourseHomeworkAsync` + `GetTeacherCourseExamsAsync` → `AND h/e.course_id = @CourseId` eklendi (çapraz ders sızıntısı kapatıldı). (Cline)
- [x] **P0 (1.2):** `GET /parents/children/{id}` ana sorgu + `otherParents` alt sorgusu → `AND is_accepted = 1`. (Cline)
- [x] **2.1:** `DeactivateTeacherAsync` program-scope'lu; `teachers.is_active=0` yalnızca aktif `program_teachers` kalmayınca. (Cline)
- [x] **2.2:** `GET /parent/children/{studentId}/schedule` (is_accepted kontrollü) + `ParentSchedulePage` çocuk seçici dropdown. (Cline)
- [x] **2.3:** `CoachCourseDetailPage` Öğrenci/Grup ham UUID input yerine `<select>` dropdown. (Cline)
- [x] **3.1:** Ders oluşturma formuna öğretmen `<select>`; `CreateCourseAsync`/`UpdateCourseAsync` → `TeacherId` tenant doğrulama (`TEACHER_NOT_IN_PROGRAM`); ders detayına öğretmen değiştirme dropdown; `teacher_id = COALESCE(@TeacherId, teacher_id)` (izin kaydederken öğretmenin düşmesi düzeltildi). (Cline)
- [x] **3.2:** `GET /parents/children/{studentId}/exams` (is_accepted kontrollü) + `useParentChildExams` hook. (Cline)
- [x] **3.3:** `CreateTeacherHomeworkAsync` toplu atama (StudentId opsiyonel → tüm sınıf, transaction) + "Tüm sınıfa ata" UI. (Cline)
- [x] **3.4 (kısmi):** `teacher_notes` tablosu (`003_teacher_notes.sql`) + `AddTeacherNoteAsync`/`GetTeacherNotesAsync` + add/view endpoint'leri (CanAddNotes/CanViewNotes). `teacher_can_manage_schedule` (onaylı talep akışı) ertelendi. (Cline)
- [x] **3.5:** `GetTeacherProgramIdsAsync` (LIMIT 1 kaldırıldı) + test güncellendi. (Cline)

**Kalan (ertelenen):** 1.1c/1.2c IDOR entegrasyon testleri, 3.2 "Sınavlar" sekmesi UI'si (hook hazır), 3.4 `view_schedule` flag gate + `manage_schedule` onaylı talep, 4.1 `ProgramAccessGuard` yaygınlaştırma (P3).

---

## Aşama 1: P0 — Kritik Güvenlik Düzeltmeleri

### 1.1 Öğretmenler arası ödev/sınav veri sızıntısı (course_id filtresi) (DeepSeek)

- [x] `Backend/MentorumApi/Data/SchoolAccessRepository.cs` → `GetTeacherCourseHomeworkAsync` sorgusuna `AND h.course_id = @CourseId` ekle. Şu an `WHERE h.program_id = (SELECT program_id FROM courses WHERE id = @CourseId) AND h.student_id IN (...)` var; `course_id` filtresi YOK → Biyoloji öğretmeni öğrencisinin Matematik/Fizik ödevlerini de görüyor. (DeepSeek)
- [x] Aynı dosyada `GetTeacherCourseExamsAsync` sorgusuna `AND e.course_id = @CourseId` ekle. (DeepSeek)
- [x] **Karar notu:** Koçun `AssignHomeworkAsync` ile atadığı `course_id = NULL` ödevler bu filtreyle öğretmene görünmeyecek. Bu en güvenli davranıştır; kabul edilip koda yorum olarak düşülmeli. (DeepSeek)
- [ ] **Ödev-Ders Bağlantısı Geliştirmesi (3.8 flash gemini):** Koçun atadığı `course_id = NULL` ödevlerin öğretmenden gizlenmesi veri sızıntısını önlemek için P0 aşamasında doğru karardır. Ancak pedagojik olarak koçun branşla ilgili atadığı ödevleri öğretmenin de görebilmesi istendiğinde, Aşama 3'te koçun `AssignHomeworkModal` formuna isteğe bağlı "Ders Seçimi (CourseId)" alanı eklenmelidir. Böylece koç dilerse ödevi derse bağlayıp öğretmenin takibine açabilir.
- [x] **Güvenlik/Yazma Koruması (3.8 flash gemini):** Sadece okuma sorgularına değil, `CreateTeacherHomeworkAsync` ve `CreateTeacherExamAsync` yazma metodlarında da öğretmenin o derse atamasının anlık olarak aktif olduğu (`courses.teacher_id = @TeacherId AND courses.is_active = 1`) doğrulanmaya devam etmelidir.
- [ ] **IDOR testi:** `Backend/MentorumApi.Tests/CrossTenantSecurityTests.cs`'e "öğretmen, kendi dersindeki öğrencinin başka derse ait ödev/sınavını göremez" senaryosu ekle. (DeepSeek)
- [ ] **1.1 Test Tasarım Tavsiyesi (3.8 flash gemini):** Test kurgulanırken bir öğrenci iki farklı derse (ör. Matematik ve Fizik) atanmalı; Matematik öğretmeninin token'ı ile `GET /api/v1/teacher/courses/{matematikCourseId}/homework` sorgulandığında Fizik ödevinin listede dönmediği (`Assert.DoesNotContain`) doğrulanmalıdır.

### 1.2 Veli yetkisiz profil okuma (is_accepted eksik) (DeepSeek)

- [x] `Backend/MentorumApi/Endpoints/ParentEndpoints.cs` → `GET /parents/children/{studentId}` içindeki `student_parents` sorgusuna `AND is_accepted = 1` ekle (satır 42-44; `my-children` ve ödev ucunda bu kontrol var, burada unutulmuş). (DeepSeek)
- [x] **Diğer Veliler Alt Sorgusunda is_accepted Güvencesi (3.8 flash gemini):** `GET /parents/children/{studentId}` içerisindeki `otherParents` sorgusunda da (`sp.parent_id != @ParentId`), diğer velinin ilişkisinin de onaylı (`AND sp.is_accepted = 1`) olduğu filtrelenmelidir. İptal edilmiş/reddedilmiş bir velinin ismi dahi maskelenerek bile olsa diğer veliye sızdırılmamalıdır.
- [ ] **IDOR testi:** kabul edilmemiş/iptal edilmiş veli ilişkisiyle çocuk profili isteği → `403 Forbid` dönmeli. (DeepSeek)
- [ ] **1.2 Test Tasarım Tavsiyesi (3.8 flash gemini):** Test senaryosunda `student_parents` ilişkisi `is_accepted = 0` (bekleyen davet) olan veliyle yalnızca `GET /parents/children/{id}` değil, yeni açılan `/schedule` ve `/exams` uçları da sorgulanmalı ve tümünden `403 Forbid` alındığı doğrulanmalıdır.

---

## Aşama 2: P1 — Mimari & UX

### 2.1 Öğretmen pasife alma global etkiliyor (DeepSeek)

- [x] `Backend/MentorumApi/Data/TeacherRepository.cs` → `DeactivateTeacherAsync` içindeki `UPDATE teachers SET is_active = 0 WHERE id = @TeacherId` satırını kaldır. (DeepSeek)
- [x] Yalnızca `UPDATE program_teachers SET is_active = 0 WHERE teacher_id = @TeacherId AND program_id = @ProgramId` çalışsın (o programdan düşsün). (DeepSeek)
- [x] `UPDATE courses SET teacher_id = NULL WHERE teacher_id = @TeacherId AND program_id = @ProgramId` zaten program-scope'lu, koru. (DeepSeek)
- [x] Öğretmenin aktif `program_teachers` kaydı hiç kalmadıysa `teachers.is_active = 0` yap (tüm programlardan düşünce). (DeepSeek)
- [x] **Global Öğretmenlik Statüsünün Korunması (3.8 flash gemini):** Öğretmenin bir programdaki aktifliği bittiğinde sistem genelindeki `users.is_active = 1` ve `users.role = 'Teacher'` kaydı silinmemeli/kapatılmamalıdır. Çünkü öğretmen başka bir kurum veya koç tarafından gelecekte davet edilebilir. Yalnızca `program_teachers.is_active = 0` yapılmalıdır.
- [ ] **Geçmiş Ödev ve Sınav Kayıtları (3.8 flash gemini):** Öğretmen dersten veya programdan ayrıldığında, geçmişte oluşturduğu ödevlerin ve sınavların (`created_by = teacherId`) silinmediği ve ders havuzunda kalmaya devam ettiği IDOR testleriyle doğrulanmalıdır.
- [ ] **Test:** iki programda kayıtlı öğretmen, bir programdan pasife alınınca diğer programdaki derslerine erişmeye devam etmeli. (DeepSeek)
- [ ] **2.1 Test Tasarım Tavsiyesi (3.8 flash gemini):** Testte öğretmenin Program A'dan pasife alındıktan sonra Program B'deki `GetTeacherCoursesAsync` ders listesinin eksilmediği ve Program B derslerine ödev ekleme yetkisinin korunduğu doğrulanmalıdır.

### 2.2 Çok çocuklu velinin programları karışıyor (DeepSeek)

- [ ] `Backend/MentorumApi/Data/ScheduleRepository.cs` → `GetParentSlotsAsync` metoduna `Guid? studentId` parametresi ekle; verilmişse `AND s.student_id = @StudentId` (veya course/group üyelikleri o çocukla sınırlı) filtrele. (DeepSeek)
- [x] `ParentEndpoints.cs`'e çocuk bazlı `GET /parents/children/{studentId}/schedule` ucu ekle (is_accepted kontrolüyle). (DeepSeek)
- [ ] **UI / Tema & Dokunmatik Deneyim Tercihi (3.8 flash gemini):** Çok çocuklu veliler için standart bir HTML `<select>` dropdown yerine, sayfa başında çocukların isimlerini taşıyan **Hap/Sekme Butonları (`styles.childTab`, `activeChildId`)** kullanılmalıdır. Bu yapı mobil `ParentLayout` dokunmatik ergonomisine çok daha uygundur ve sistemin CSS token'ları (`var(--color-primary)`, `var(--bg-color-surface)`) ile Cyber/Nature temalarında kusursuz görünür.
- [ ] **Tek Çocuklu Veli UX Optimizasyonu (3.8 flash gemini):** Velinin tek bir çocuğu varsa bu seçici bileşen render edilmemeli (ekran kalabalığı önlenmeli), birden çok çocuk varsa ilk çocuk varsayılan aktif seçilmelidir.
- [x] Frontend: `ParentSchedulePage.jsx` + `parentApi.js` → çocuk seçici sekme/butonlar; seçili çocuğun programını göster. (DeepSeek & 3.8 flash gemini)

### 2.3 Derse öğrenci/grup eklemede elle UUID girişi (DeepSeek)

- [x] `Frontend/src/features/coach/courses/CoachCourseDetailPage.jsx` → "Öğrenci ID" ve "Grup ID" ham UUID input'larını kaldır. (DeepSeek)
- [ ] **Modal + Arama Tabanlı Çoklu Seçici (Checkbox) (3.8 flash gemini):** 50-100 öğrencili bir koçluk programında açılır dropdown menü hantal kalır. Bunun yerine `common/Modal` içinde açılan, canlı arama input'lu ve çoklu seçim (checkbox) destekli bir `AddStudentsToCourseModal` bileşeni yapılmalıdır. Koç aynı anda birden fazla öğrenciyi işaretleyip tek tıkla derse ekleyebilmelidir.
- [ ] **Tema & Z-Index Güvencesi (3.8 flash gemini):** Bu modal kesinlikle `components/common/Modal` portali üzerinden açılmalı; Nature, Cyber ve Classic temalarındaki z-index ve arka plan blur efektlerini (`ThemeDecor`) bozmayacak şekilde `Modal.module.css` standartlarını kullanmalıdır.
- [ ] **Mevcut Üyelerin Korunması (3.8 flash gemini):** Halihazırda derste veya grupta olan öğrenciler listede "Zaten Eklendi" rozetiyle pasifize edilmeli, mükerrer istekler engellenmelidir.
- [ ] Mevcut `useStudents` / `useGroups` hook'larıyla arama destekli modal seçici yap (isimle ara, seç, ekle). (DeepSeek & 3.8 flash gemini)
- [ ] Aynı düzeltmeyi gerekirse `CoachGroupsPage.jsx` üye ekleme alanına da uygula. (DeepSeek)

---

## Aşama 3: P2 — UI / Fonksiyon / Temizlik

### 3.1 Koça öğretmen atama + 10 izin düzenleme arayüzü (DeepSeek)

- [ ] `Frontend/src/features/coach/courses/CoachCoursesPage.jsx` → ders oluşturma formuna öğretmen `<select>` (programın öğretmenleri) + ders tipi + renk + 10 izin toggle'ı ekle. Backend `CreateCourseRequest.TeacherId` + `teacher_can_*` alanları hazır. (DeepSeek)
- [ ] **Ders Oluşturma Formunu Şişirmeme / Akordeon UX (3.8 flash gemini):** Ders oluşturma anında 10 izin toggle'ını doğrudan ekrana yığmak koç için kafa karıştırıcıdır. Ders oluştururken sadece "Öğretmen Seçimi (Opsiyonel)" ve "Varsayılan İzinleri Kullan" seçeneği sunulmalı; 10 izin ayarı ise "Gelişmiş İzinler" başlığı altında daraltılabilir (akordeon) bir alanda tutulmalıdır.
- [ ] **Ders Oluşturma Formu Varsayılan İzin Tavsiyesi (3.8 flash gemini):** Ders oluşturma formu sade tutulduğu için koçu 11 izinle boğmamak doğru bir karardır. Ancak formun altına "Varsayılan: Temel Profil ve Ödev İzinleri Açık, İleri İzinler Kapalı" şeklinde bir bilgilendirme metni konulmalı; özel yetkilendirmeler oluşturulduktan sonra ders detayındaki "İzinler" sekmesinden yönetilmeye devam edilmelidir.
- [x] **Backend Tenant Doğrulaması (Kritik Güvenlik) (3.8 flash gemini):** `CourseRepository.CreateCourseAsync` ve `UpdateCourseAsync` içinde gönderilen `TeacherId`'nin gerçekten o programa ait bir öğretmen olduğu (`SELECT 1 FROM program_teachers WHERE teacher_id = @TeacherId AND program_id = @ProgramId AND is_active = 1`) mutlaka doğrulanmalıdır. Aksi halde yabancı öğretmen GUID'iyle ders açılmasına izin verilmiş olur.
- [x] `CoachCourseDetailPage.jsx` → "İzinler" sekmesini salt okunurdan **düzenlenebilir** hale getir (switch + Kaydet → `PUT /programs/{id}/courses/{courseId}`). (DeepSeek)
- [ ] **Toggle Tema Uyumu (3.8 flash gemini):** Ders detayındaki izin switch'leri özel CSS modules ile yapılmalı, Cyber ve Nature temalarında parlayan yeşil/mavi tema değişkenlerini (`var(--color-primary)`, `var(--color-success)`) kullanmalıdır.
- [x] Ders detayına öğretmen değiştirme dropdown'ı ekle. (DeepSeek)

### 3.2 Veliye sınav sonuçları erişimi (DeepSeek)

- [x] `ParentEndpoints.cs` → `GET /parents/children/{studentId}/exams` ucu (is_accepted kontrolüyle; öğrencinin `exam_results` listesini döndür). (DeepSeek)
- [ ] Frontend: `ParentLayout` + `ParentHomework` yanına "Sınavlar" sekmesi; `parentApi.js`'e hook. (DeepSeek)
- [ ] **Veli Sınavlar Sekmesi Tasarım Tavsiyesi (3.8 flash gemini):** Hook ve backend hazır olduğundan, `ParentLayout` altına doğrudan 5. sekme eklemek yerine `ParentHomeworkPage` yapısına benzer bağımsız bir `ParentExamsPage` yapılmalı; rotası `/parent/exams` olarak `App.jsx`'e eklenmelidir. Kartlarda `common/Card` ve `common/Badge` kullanılarak sınav adı, tarihi, neti ve ders bazlı dağılımı gösterilmelidir.
- [ ] **Mobil Alt Navigasyon (BottomNav) Taşma Koruması (3.8 flash gemini):** `ParentLayout` alt barda şu an 4 sekme (Özet, Takvim, Ödevler, Program) bulunmaktadır. 5. bir "Sınavlar" sekmesi eklendiğinde küçük ekranlı telefonlarda (iPhone SE / 360px genişlik) butonların sıkışıp taşmaması için ikon ve yazı boyutları responsive test edilmelidir.
- [ ] **Grafik ve Net Kartları Teması (3.8 flash gemini):** Sınav sonuçları listelenirken kullanılacak kartlar ve başarı rozetleri doğrudan `common/Card` ve `common/Badge` bileşenleriyle tasarlanmalı, Cyber Dark modda beyaz zemin patlaması yaratacak hardcoded renklerden kaçınılmalıdır.

### 3.3 Öğretmenin derse/gruba toplu ödev ataması (DeepSeek)

- [x] `SchoolAccessRepository.CreateTeacherHomeworkAsync` → tek `StudentId` yerine dersin TÜM öğrencilerine (course_students ∪ course_groups) toplu atama desteği ekle. (DeepSeek)
- [x] **Toplu Atamada Veritabanı Transaction Zorunluluğu (3.8 flash gemini):** 30 kişilik bir derse toplu ödev atanırken 30 ayrı kayıt `using var tx = conn.BeginTransaction()` bloğu içinde toplu (`batch INSERT`) olarak yazılmalıdır. Yarım kalan bağlantılarda sınıfta sadece bazı öğrencilere ödev gitmesi gibi veri tutarsızlıkları kesinlikle engellenmelidir.
- [x] `TeacherCoursesPage.jsx` → "Tüm derse ödev ata" seçeneği (öğrenci seçmeden). (DeepSeek)

### 3.4 Ölü izin bayrakları (schedule / notes) (DeepSeek)

- [x] Karar: `teacher_can_view_schedule`, `teacher_can_manage_schedule`, `teacher_can_view_notes`, `teacher_can_add_notes` ya uç+UI ile hayata geçir ya da modelden çıkar. (DeepSeek)
- [x] Seçenek A: Öğretmen schedule/notes endpoint'leri + UI. Seçenek B: bu 4 bayrağı şemadan kaldır (önerilen: A, çünkü modelde öngörülmüş). (DeepSeek)
- [ ] **Seçenek A Kararı ve Hiyerarşi Dengesi (3.8 flash gemini):**
  - `teacher_can_view_schedule`: Kesinlikle hayata geçirilmelidir (öğretmen ders programını görmelidir).
  - `teacher_can_manage_schedule`: Koçun genel program hiyerarşisini bozmamak için öğretmene takvim düzenleme yetkisi verilmemeli veya sadece kendi ders saati için onaylı talep olarak sınırlandırılmalıdır.
  - `teacher_can_add_notes`: Öğretmenin dersteki öğrenciye ders içi performans notu bırakabilmesi çok kıymetli bir pedagojik özelliktir; Aşama 3'te `teacher_notes` ucuyla hayata geçirilmelidir.
- [ ] **3.4 Kapsam & Yol Haritası Tavsiyesi (3.8 flash gemini):** Öğretmen notları (`teacher_notes`) ve ödev işleme (`review`) başarıyla tamamlanmıştır. Kalan `teacher_can_view_schedule` için öğretmenin kendi dersi ve öğrencileriyle sınırlı salt-okunur bir `/teacher/courses/{id}/schedule` ucu açılmalı; `teacher_can_manage_schedule` (onaylı talep) ise bildirim akışıyla birlikte V9 sürümüne bırakılmalıdır.

### 3.5 `GetTeacherProgramIdAsync` `LIMIT 1` kısıtı (DeepSeek)

- [x] `Backend/MentorumApi/Data/SchoolAccessRepository.cs` → `GetTeacherProgramIdAsync` yerine öğretmenin TÜM aktif programlarını döndüren `GetTeacherProgramIdsAsync` ekle; çağıranları buna göre güncelle. (DeepSeek)
- [ ] **Çoklu Program Rozeti (Badge) UX (3.8 flash gemini):** Öğretmen birden çok kurumda/programda görev alıyorsa, `TeacherLayout` üst barında veya ders kartlarında dersin hangi koçluk programına ait olduğunu belirten renkli program rozetleri (`badge`) gösterilmelidir.
- [ ] **3.5 Program Adı Entegrasyon Tavsiyesi (3.8 flash gemini):** Öğretmenin ders listesi sorgusuna (`SchoolAccessRepository.GetTeacherCoursesAsync`) `cp.name AS ProgramName` kolonu JOIN ile eklenmeli; `TeacherCoursesPage` ders kartlarında başlığın yanında `var(--color-primary)` ve `var(--bg-color-surface)` uyumlu minik bir program rozeti (`badge`) basılmalıdır.

---

## Aşama 4: P3 — Altyapı

### 4.1 Merkezi `ProgramAccessGuard`'ı yaygınlaştır (DeepSeek)

- [ ] `Backend/MentorumApi/Services/ProgramAccessGuard.cs` (EnsureCoachInProgramAsync / EnsureCoachOwnsStudentAsync / IsParentOfStudentAsync / IsTeacherOfCourseAsync) şu an yalnız `ExamEndpoints`'te kullanılıyor. (DeepSeek)
- [ ] `StudentEndpoints`, `CourseEndpoints`, `GroupEndpoints`, `HomeworkEndpoints`'te dağınık `IsMemberAsync`/inline sahiplik kontrollerini bu guard'a taşı (defense-in-depth olarak SQL'deki filtreler kalır). (DeepSeek)
- [ ] **Defense-in-Depth Yaklaşımı (3.8 flash gemini):** `ProgramAccessGuard` kullanıldığında dahi SQL sorgularındaki `AND program_id = @ProgramId` koşulları asla kaldırılmamalıdır (katmanlı savunma).
- [ ] **4.1 Kademeli Geçiş Tavsiyesi (3.8 flash gemini):** Tek seferde tüm modülleri guard'a geçirmek regresyon riski yaratır. İlk etapta sadece `HomeworkEndpoints` ve `CourseEndpoints` dönüştürülmeli; test suite (`dotnet test`) ile doğrulandıktan sonra `StudentEndpoints` ve `GroupEndpoints`'e geçilmelidir.
- [ ] `.agents/rules/security_guidelines.md` → `ProgramAccessGuard` zorunlu kalıp olarak işaretli; tüm repoların buna uyması sağlanmalı. (DeepSeek)

---

## Doğrulama Kontrol Listesi

- [x] `dotnet build Mentorum.sln` → 0 hata. (Cline)
- [x] `dotnet test Mentorum.sln` → 43/43 yeşil. (Cline)
- [x] `cd Frontend && npm run build` → ✓ (0 hata). (Cline)
- [x] P0 güvenlik düzeltmeleri (1.1, 1.2) diğerlerinden önce merge edilir. (DeepSeek)
- [ ] **Inline Stilleri CSS Modules'e Taşıma (3.8 flash gemini):** `CoachCourseDetailPage.jsx`, `CoachCoursesPage.jsx` ve `TeacherCoursesPage.jsx` içerisindeki inline `style={{ ... }}` blokları (select menüleri, buton kapsayıcıları) ilgili `.module.css` dosyalarına taşınarak mimari temizlik sağlanmalıdır.

