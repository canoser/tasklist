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

## Aşama 1: P0 — Kritik Güvenlik Düzeltmeleri

### 1.1 Öğretmenler arası ödev/sınav veri sızıntısı (course_id filtresi) (DeepSeek)

- [ ] `Backend/MentorumApi/Data/SchoolAccessRepository.cs` → `GetTeacherCourseHomeworkAsync` sorgusuna `AND h.course_id = @CourseId` ekle. Şu an `WHERE h.program_id = (SELECT program_id FROM courses WHERE id = @CourseId) AND h.student_id IN (...)` var; `course_id` filtresi YOK → Biyoloji öğretmeni öğrencisinin Matematik/Fizik ödevlerini de görüyor. (DeepSeek)
- [ ] Aynı dosyada `GetTeacherCourseExamsAsync` sorgusuna `AND e.course_id = @CourseId` ekle. (DeepSeek)
- [ ] **Karar notu:** Koçun `AssignHomeworkAsync` ile atadığı `course_id = NULL` ödevler bu filtreyle öğretmene görünmeyecek. Bu en güvenli davranıştır; kabul edilip koda yorum olarak düşülmeli. (DeepSeek)
- [ ] **Ödev-Ders Bağlantısı Geliştirmesi (3.8 flash gemini):** Koçun atadığı `course_id = NULL` ödevlerin öğretmenden gizlenmesi veri sızıntısını önlemek için P0 aşamasında doğru karardır. Ancak pedagojik olarak koçun branşla ilgili atadığı ödevleri öğretmenin de görebilmesi istendiğinde, Aşama 3'te koçun `AssignHomeworkModal` formuna isteğe bağlı "Ders Seçimi (CourseId)" alanı eklenmelidir. Böylece koç dilerse ödevi derse bağlayıp öğretmenin takibine açabilir.
- [ ] **Güvenlik/Yazma Koruması (3.8 flash gemini):** Sadece okuma sorgularına değil, `CreateTeacherHomeworkAsync` ve `CreateTeacherExamAsync` yazma metodlarında da öğretmenin o derse atamasının anlık olarak aktif olduğu (`courses.teacher_id = @TeacherId AND courses.is_active = 1`) doğrulanmaya devam etmelidir.
- [ ] **IDOR testi:** `Backend/MentorumApi.Tests/CrossTenantSecurityTests.cs`'e "öğretmen, kendi dersindeki öğrencinin başka derse ait ödev/sınavını göremez" senaryosu ekle. (DeepSeek)

### 1.2 Veli yetkisiz profil okuma (is_accepted eksik) (DeepSeek)

- [ ] `Backend/MentorumApi/Endpoints/ParentEndpoints.cs` → `GET /parents/children/{studentId}` içindeki `student_parents` sorgusuna `AND is_accepted = 1` ekle (satır 42-44; `my-children` ve ödev ucunda bu kontrol var, burada unutulmuş). (DeepSeek)
- [ ] **Diğer Veliler Alt Sorgusunda is_accepted Güvencesi (3.8 flash gemini):** `GET /parents/children/{studentId}` içerisindeki `otherParents` sorgusunda da (`sp.parent_id != @ParentId`), diğer velinin ilişkisinin de onaylı (`AND sp.is_accepted = 1`) olduğu filtrelenmelidir. İptal edilmiş/reddedilmiş bir velinin ismi dahi maskelenerek bile olsa diğer veliye sızdırılmamalıdır.
- [ ] **IDOR testi:** kabul edilmemiş/iptal edilmiş veli ilişkisiyle çocuk profili isteği → `403 Forbid` dönmeli. (DeepSeek)

---

## Aşama 2: P1 — Mimari & UX

### 2.1 Öğretmen pasife alma global etkiliyor (DeepSeek)

- [ ] `Backend/MentorumApi/Data/TeacherRepository.cs` → `DeactivateTeacherAsync` içindeki `UPDATE teachers SET is_active = 0 WHERE id = @TeacherId` satırını kaldır. (DeepSeek)
- [ ] Yalnızca `UPDATE program_teachers SET is_active = 0 WHERE teacher_id = @TeacherId AND program_id = @ProgramId` çalışsın (o programdan düşsün). (DeepSeek)
- [ ] `UPDATE courses SET teacher_id = NULL WHERE teacher_id = @TeacherId AND program_id = @ProgramId` zaten program-scope'lu, koru. (DeepSeek)
- [ ] Öğretmenin aktif `program_teachers` kaydı hiç kalmadıysa `teachers.is_active = 0` yap (tüm programlardan düşünce). (DeepSeek)
- [ ] **Global Öğretmenlik Statüsünün Korunması (3.8 flash gemini):** Öğretmenin bir programdaki aktifliği bittiğinde sistem genelindeki `users.is_active = 1` ve `users.role = 'Teacher'` kaydı silinmemeli/kapatılmamalıdır. Çünkü öğretmen başka bir kurum veya koç tarafından gelecekte davet edilebilir. Yalnızca `program_teachers.is_active = 0` yapılmalıdır.
- [ ] **Geçmiş Ödev ve Sınav Kayıtları (3.8 flash gemini):** Öğretmen dersten veya programdan ayrıldığında, geçmişte oluşturduğu ödevlerin ve sınavların (`created_by = teacherId`) silinmediği ve ders havuzunda kalmaya devam ettiği IDOR testleriyle doğrulanmalıdır.
- [ ] **Test:** iki programda kayıtlı öğretmen, bir programdan pasife alınınca diğer programdaki derslerine erişmeye devam etmeli. (DeepSeek)

### 2.2 Çok çocuklu velinin programları karışıyor (DeepSeek)

- [ ] `Backend/MentorumApi/Data/ScheduleRepository.cs` → `GetParentSlotsAsync` metoduna `Guid? studentId` parametresi ekle; verilmişse `AND s.student_id = @StudentId` (veya course/group üyelikleri o çocukla sınırlı) filtrele. (DeepSeek)
- [ ] `ParentEndpoints.cs`'e çocuk bazlı `GET /parents/children/{studentId}/schedule` ucu ekle (is_accepted kontrolüyle). (DeepSeek)
- [ ] **UI / Tema & Dokunmatik Deneyim Tercihi (3.8 flash gemini):** Çok çocuklu veliler için standart bir HTML `<select>` dropdown yerine, sayfa başında çocukların isimlerini taşıyan **Hap/Sekme Butonları (`styles.childTab`, `activeChildId`)** kullanılmalıdır. Bu yapı mobil `ParentLayout` dokunmatik ergonomisine çok daha uygundur ve sistemin CSS token'ları (`var(--color-primary)`, `var(--bg-color-surface)`) ile Cyber/Nature temalarında kusursuz görünür.
- [ ] **Tek Çocuklu Veli UX Optimizasyonu (3.8 flash gemini):** Velinin tek bir çocuğu varsa bu seçici bileşen render edilmemeli (ekran kalabalığı önlenmeli), birden çok çocuk varsa ilk çocuk varsayılan aktif seçilmelidir.
- [ ] Frontend: `ParentSchedulePage.jsx` + `parentApi.js` → çocuk seçici sekme/butonlar; seçili çocuğun programını göster. (DeepSeek & 3.8 flash gemini)

### 2.3 Derse öğrenci/grup eklemede elle UUID girişi (DeepSeek)

- [ ] `Frontend/src/features/coach/courses/CoachCourseDetailPage.jsx` → "Öğrenci ID" ve "Grup ID" ham UUID input'larını kaldır. (DeepSeek)
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
- [ ] **Backend Tenant Doğrulaması (Kritik Güvenlik) (3.8 flash gemini):** `CourseRepository.CreateCourseAsync` ve `UpdateCourseAsync` içinde gönderilen `TeacherId`'nin gerçekten o programa ait bir öğretmen olduğu (`SELECT 1 FROM program_teachers WHERE teacher_id = @TeacherId AND program_id = @ProgramId AND is_active = 1`) mutlaka doğrulanmalıdır. Aksi halde yabancı öğretmen GUID'iyle ders açılmasına izin verilmiş olur.
- [ ] `CoachCourseDetailPage.jsx` → "İzinler" sekmesini salt okunurdan **düzenlenebilir** hale getir (switch + Kaydet → `PUT /programs/{id}/courses/{courseId}`). (DeepSeek)
- [ ] **Toggle Tema Uyumu (3.8 flash gemini):** Ders detayındaki izin switch'leri özel CSS modules ile yapılmalı, Cyber ve Nature temalarında parlayan yeşil/mavi tema değişkenlerini (`var(--color-primary)`, `var(--color-success)`) kullanmalıdır.
- [ ] Ders detayına öğretmen değiştirme dropdown'ı ekle. (DeepSeek)

### 3.2 Veliye sınav sonuçları erişimi (DeepSeek)

- [ ] `ParentEndpoints.cs` → `GET /parents/children/{studentId}/exams` ucu (is_accepted kontrolüyle; öğrencinin `exam_results` listesini döndür). (DeepSeek)
- [ ] Frontend: `ParentLayout` + `ParentHomework` yanına "Sınavlar" sekmesi; `parentApi.js`'e hook. (DeepSeek)
- [ ] **Mobil Alt Navigasyon (BottomNav) Taşma Koruması (3.8 flash gemini):** `ParentLayout` alt barda şu an 4 sekme (Özet, Takvim, Ödevler, Program) bulunmaktadır. 5. bir "Sınavlar" sekmesi eklendiğinde küçük ekranlı telefonlarda (iPhone SE / 360px genişlik) butonların sıkışıp taşmaması için ikon ve yazı boyutları responsive test edilmelidir.
- [ ] **Grafik ve Net Kartları Teması (3.8 flash gemini):** Sınav sonuçları listelenirken kullanılacak kartlar ve başarı rozetleri doğrudan `common/Card` ve `common/Badge` bileşenleriyle tasarlanmalı, Cyber Dark modda beyaz zemin patlaması yaratacak hardcoded renklerden kaçınılmalıdır.

### 3.3 Öğretmenin derse/gruba toplu ödev ataması (DeepSeek)

- [ ] `SchoolAccessRepository.CreateTeacherHomeworkAsync` → tek `StudentId` yerine dersin TÜM öğrencilerine (course_students ∪ course_groups) toplu atama desteği ekle. (DeepSeek)
- [ ] **Toplu Atamada Veritabanı Transaction Zorunluluğu (3.8 flash gemini):** 30 kişilik bir derse toplu ödev atanırken 30 ayrı kayıt `using var tx = conn.BeginTransaction()` bloğu içinde toplu (`batch INSERT`) olarak yazılmalıdır. Yarım kalan bağlantılarda sınıfta sadece bazı öğrencilere ödev gitmesi gibi veri tutarsızlıkları kesinlikle engellenmelidir.
- [ ] `TeacherCoursesPage.jsx` → "Tüm derse ödev ata" seçeneği (öğrenci seçmeden). (DeepSeek)

### 3.4 Ölü izin bayrakları (schedule / notes) (DeepSeek)

- [ ] Karar: `teacher_can_view_schedule`, `teacher_can_manage_schedule`, `teacher_can_view_notes`, `teacher_can_add_notes` ya uç+UI ile hayata geçir ya da modelden çıkar. (DeepSeek)
- [ ] Seçenek A: Öğretmen schedule/notes endpoint'leri + UI. Seçenek B: bu 4 bayrağı şemadan kaldır (önerilen: A, çünkü modelde öngörülmüş). (DeepSeek)
- [ ] **Seçenek A Kararı ve Hiyerarşi Dengesi (3.8 flash gemini):**
  - `teacher_can_view_schedule`: Kesinlikle hayata geçirilmelidir (öğretmen ders programını görmelidir).
  - `teacher_can_manage_schedule`: Koçun genel program hiyerarşisini bozmamak için öğretmene takvim düzenleme yetkisi verilmemeli veya sadece kendi ders saati için onaylı talep olarak sınırlandırılmalıdır.
  - `teacher_can_add_notes`: Öğretmenin dersteki öğrenciye ders içi performans notu bırakabilmesi çok kıymetli bir pedagojik özelliktir; Aşama 3'te `teacher_notes` ucuyla hayata geçirilmelidir.

### 3.5 `GetTeacherProgramIdAsync` `LIMIT 1` kısıtı (DeepSeek)

- [ ] `Backend/MentorumApi/Data/SchoolAccessRepository.cs` → `GetTeacherProgramIdAsync` yerine öğretmenin TÜM aktif programlarını döndüren `GetTeacherProgramIdsAsync` ekle; çağıranları buna göre güncelle. (DeepSeek)
- [ ] **Çoklu Program Rozeti (Badge) UX (3.8 flash gemini):** Öğretmen birden çok kurumda/programda görev alıyorsa, `TeacherLayout` üst barında veya ders kartlarında dersin hangi koçluk programına ait olduğunu belirten renkli program rozetleri (`badge`) gösterilmelidir.

---

## Aşama 4: P3 — Altyapı

### 4.1 Merkezi `ProgramAccessGuard`'ı yaygınlaştır (DeepSeek)

- [ ] `Backend/MentorumApi/Services/ProgramAccessGuard.cs` (EnsureCoachInProgramAsync / EnsureCoachOwnsStudentAsync / IsParentOfStudentAsync / IsTeacherOfCourseAsync) şu an yalnız `ExamEndpoints`'te kullanılıyor. (DeepSeek)
- [ ] `StudentEndpoints`, `CourseEndpoints`, `GroupEndpoints`, `HomeworkEndpoints`'te dağınık `IsMemberAsync`/inline sahiplik kontrollerini bu guard'a taşı (defense-in-depth olarak SQL'deki filtreler kalır). (DeepSeek)
- [ ] **Defense-in-Depth Yaklaşımı (3.8 flash gemini):** `ProgramAccessGuard` kullanıldığında dahi SQL sorgularındaki `AND program_id = @ProgramId` koşulları asla kaldırılmamalıdır (katmanlı savunma).
- [ ] `.agents/rules/security_guidelines.md` → `ProgramAccessGuard` zorunlu kalıp olarak işaretli; tüm repoların buna uyması sağlanmalı. (DeepSeek)

---

## Doğrulama Kontrol Listesi

- [ ] `dotnet build Mentorum.sln` → 0 hata. (DeepSeek)
- [ ] `dotnet test Mentorum.sln` → tümü yeşil (yeni IDOR testleri dahil). (DeepSeek)
- [ ] `cd Frontend && npm run build` + `npm run lint` → 0 hata. (DeepSeek)
- [ ] P0 güvenlik düzeltmeleri (1.1, 1.2) diğerlerinden önce merge edilir. (DeepSeek)

