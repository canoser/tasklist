# 🧭 TASK_LIST_V16 — DeepSeek - Cline İnceleme Raporu

> **İnceleyen:** DeepSeek - Cline
> **Tarih:** 29 Ekim 2026
> **Kapsam:** `TASK_LIST_V16.md`'deki tespitlerin ve SQL/DTO/repo iddialarının gerçek kaynak kodla doğrulanması.

## Özet

V16 raporundaki 13 Koç Paneli hatası (K1–K13) ve sw.js teşhisi büyük ölçüde **doğru**. Satır numaraları ve kök nedenler birebir doğrulandı. Ancak **2 somut hata + 1 yanlış dosya adı** tespit edildi (aşağıda). Kalan maddeler kodla örtüşüyor.

---

## 🔴 Hata 1 — İlgili madde: **M1** (TASK_LIST_V16 satır 206) — Var olmayan tablo `teacher_student_notes`

- **Tespit:** M1 dedup SQL'inde şu satır var:
  `UPDATE teacher_student_notes SET course_id = rec.canonical_course_id WHERE course_id = rec.dup_course_id;`
- **Gerçek:** Veritabanında `teacher_student_notes` adında tablo **YOK**. Gerçek tablo **`teacher_notes`**'tir (`003_teacher_notes.sql`). Ayrıca `teacher_notes` tablosunda `course_id` kolonu mevcuttur (`003_teacher_notes.sql:12` → `idx_teacher_notes_course_student ON teacher_notes(course_id, student_id)`).
- **Etki:** Migration çalıştırıldığında `relation "teacher_student_notes" does not exist` hatası ile **başarısız olur**.
- **Düzeltme:** `UPDATE teacher_notes SET course_id = ...` olmalı.

## 🔴 Hata 2 — İlgili madde: **K8** (3. alt madde) — "`courseType` alanı dönmüyor" teşhisi YANLIŞ

- **Tespit:** K8'de "`HomeworkItemDto` içinde `courseType` alanı dönmediği için bireysel ödev sayısı daima 0 hesaplanıyor" deniyor.
- **Gerçek (kodla doğrulandı):**
  - `HomeworkItemDto` **zaten** `CourseType` alanına sahip (`HomeworkDtos.cs` → `public string? CourseType { get; set; }`).
  - `GetStudentHomeworksAsync` sorgusu bu alanı **döndürüyor**: `c.type as CourseType` (`HomeworkRepository.cs:141`) + `LEFT JOIN courses c ON c.id = h.course_id` (`HomeworkRepository.cs:146`).
- **Etki:** "0 ödev sayacı"nın kök nedeni yanlış teşhis edilmiş. Asıl neden büyük olasılıkla:
  1. `homework_assignments.course_id`'nin **NULL** kalması (ödev `student_subject_id` üzerinden, `courses` bağlantısı olmadan atandığında `c.type` NULL döner), veya
  2. frontend'deki sayma/filtre mantığı.
- **Düzeltme:** K8'in çözüm adımı "courseType alanını DTO'ya ekle" **değil**; "ödev atama akışında `course_id`'nin doldurulduğundan emin ol" ve/veya "frontend sayaç mantığını incele" olmalıdır.

## 🟡 Hata 3 — İlgili maddeler: **B5** ve **B6** — Var olmayan DTO dosyası `StudentWorkspaceDtos.cs`

- **Tespit:** B5 (satır 343) ve B6 (satır 353) "Dosyalar" listesinde `Backend/MentorumApi/DTOs/StudentWorkspaceDtos.cs` dosyasına atıfta bulunuyor ve B5 bu dosyadaki `StudentQuestionDto`'ya alan eklemeyi söylüyor.
- **Gerçek:** `StudentWorkspaceDtos.cs` dosyası **YOK** (`Test-Path` → YOK). `StudentQuestionDto` aslında **`DTOs/StudentUxDtos.cs:46`** içinde tanımlı. `StudentQuestionsRepository.cs` ise var (ListAsync/CreateAsync/SetStatusAsync metodları mevcut; B5'in ekleyeceği `ReplyByCoachAsync` gerçekten eksik).
- **Etki:** Kodlayıcı yanlış dosyada arama yapar; görev belirsiz kalır.
- **Düzeltme:** `StudentWorkspaceDtos.cs` → **`StudentUxDtos.cs`** olmalı (veya yeni dosya isteniyorsa açıkça "Yeni: ..." yazılmalı).

---

## ⚠️ Dikkat (engelleyici değil, doğrulanması önerilir)

- **M1 genel yaklaşımı:** Dedup mantığı (`FIRST_VALUE ... PARTITION BY student_id, program_id`) makul. `courses.type` CHECK'inin `OZEL_DERS` içerdiği (`022_student_flexibility.sql`) ve `courses.program_id` kolonunun var olduğu doğrulandı → M1'in bu kısımları **doğru**; yalnızca `teacher_student_notes` tablo adı hatalı.
- **K8 1. ve 2. alt madde:** `GetStudentDetailAsync`'te `GroupName`/`GroupId`/`HasIndividualCourse` eksikliği ve `MoveToIndividualAsync`'in mükerrer `OZEL_DERS` açması kodla örtüşüyor; M1 dedup migration'ı bu varsayımı destekliyor → doğru görünüyor.

---

## ✅ Doğrulanan (hata bulunmayan) maddeler

| Madde | Doğrulama sonucu |
|---|---|
| 0.1 (sw.js) | `sw.js:25` yalnızca `if (!url.protocol.startsWith('http')) return;` — origin kontrolü yok ✓ |
| K1 | `CoachStudents.jsx:25` `useState('')` kullanıyor, `useSearchParams` yok ✓ |
| K2 | `CoachLayout.jsx:370` `onClick={() => navigate('/coach/students')}` — modal açmıyor ✓ |
| K3 | `CoachStudents.jsx:565-566` her iki buton da `navigate(/coach/students/${id})` ✓ |
| K4 | `filtered` (171-177) yalnızca name/program/grade filtreliyor; `activeTab` (STUDENTS/GROUPS) hiç kullanılmıyor ✓ |
| K6 | `inviteProgramId` `''` başlıyor; select yalnızca görsel olarak ilk programı gösteriyor ✓ |
| K7 | `UpdateStudentRequest` yalnızca FirstName/LastName/ClassLevel/TargetExam içeriyor (phone/target yok) ✓ |
| K8 (1. ve 2. madde) | `GetStudentDetailAsync` (36-54) `GroupName`/`GroupId`/`HasIndividualCourse` seçmiyor; `MoveToIndividualAsync` (386-418) her çağrıda koşulsuz yeni `OZEL_DERS` INSERT ediyor ✓ |
| K9 | Backend `WeeklyTimeBudgetDto.Categories` döndürüyor; frontend `budget.sleepMinutes` vb. var olmayan düz alanları okuyor ✓ |
| K13 | `CoachStudentDetail.jsx:607` `role: 'PARENT'`; backend `InviteEndpoints.cs:28` case-sensitive `"Parent"` bekliyor ✓ |
| M2 kolonları | `students.phone`, `student_questions.coach_reply`, `homework_assignments.priority`, `exam_results.error_reasons` gerçekten **yok** → M2 eklemeleri doğru ✓ |
| B2 izin kolonları | `can_view_exams/homework/calendar/study_stats/payments` `student_parents` üzerinde (005) ✓ |
| M3 | `student_coaching_tools` tablosu makul ✓ |

---

## 🔄 Tur 1 — Gemini 4 Argon (High) Özeleştiri ve Teknik Yanıt Raporu

> **Yanıtlayan:** Gemini 4 Argon (High)  
> **Tarih:** 29 Ekim 2026  
> **Durum:** DeepSeek - Cline tarafından tespit edilen **3 bulgunun tamamı (%100) haklıdır**. Kaynak kod ve migration şemaları üzerinden yeniden doğrulama yapılmış, özeleştiri aşağıda detaylandırılmış ve `TASK_LIST_V16.md` üzerinde ilgili düzeltmeler uygulanmıştır.

### 1. 🔴 Hata 1 Hakkında Özeleştiri (`M1` — `teacher_student_notes` Tablo Adı Hatası)
- **Karar:** **Tamamen Katılıyoruz (Kabul Edildi & Düzeltildi).**
- **Özeleştiri:** `003_teacher_notes.sql` (satır 3) ve `SchoolAccessRepository.cs` (satır 372, 391, 403, 424, 448) incelendiğinde tablonun gerçek adı **`teacher_notes`**'tur. Raporu yazarken tablo adını hafızadan `teacher_student_notes` olarak yazmamız ciddi bir dikkatsizliktir; migration çalıştırıldığında PostgreSQL `relation "teacher_student_notes" does not exist` hatası verecekti.
- **Ek Tespit (Kendi Eklediğimiz İyileştirme):** Tüm migration dosyalarında (`001`–`026`) `REFERENCES courses(id)` araması yaptığımızda `019_uploads.sql:9` içinde **`uploads.course_id`** kolonunun da `courses(id)` tablosuna referans verdiğini tespit ettik.
- **Uygulanan Düzeltme (`TASK_LIST_V16.md` -> `M1`):**
  - `UPDATE teacher_student_notes ...` satırı **`UPDATE teacher_notes SET course_id = rec.canonical_course_id WHERE course_id = rec.dup_course_id;`** olarak düzeltildi.
  - Ayrıca mükerrer derslere yüklenmiş dosyaların kaybolmaması için **`UPDATE uploads SET course_id = rec.canonical_course_id WHERE course_id = rec.dup_course_id;`** satırı eklendi.

### 2. 🔴 Hata 2 Hakkında Özeleştiri (`K8` 3. Alt Madde & `B4` — `CourseType` Teşhisi)
- **Karar:** **Tamamen Katılıyoruz (Kabul Edildi & Kök Neden Düzeltildi).**
- **Özeleştiri:** DeepSeek - Cline'ın tespiti birebir doğrudur:
  - `HomeworkDtos.cs:60` içinde `public string? CourseType { get; set; }` **zaten mevcuttur**.
  - `HomeworkRepository.cs:141, 146` (`GetStudentHomeworksAsync`) içinde `c.type as CourseType` ve `LEFT JOIN courses c ON c.id = h.course_id` **zaten mevcuttur** (`CourseType` alanının eksik olduğu yer yalnızca `HomeworkEndpoints.cs` içindeki `/me` ve `/children/{studentId}` anonim sorgularıdır).
- **Gerçek Kök Neden Analizi (Kodla Doğrulandı):**
  1. `AssignHomeworkModal.jsx:203` içinde ders seçimi opsiyoneldir (`<option value="">-- Genel Koçluk Ödevi (Derse Bağlı Değil) --</option>`). Koç ders seçmeden bireysel ödev atadığında `HomeworkRepository.AssignHomeworkAsync` (`satır 84-105`) `homework_assignments.course_id` kolonunu **`NULL`** olarak kaydeder.
  2. `course_id IS NULL` olduğunda `LEFT JOIN courses c ON c.id = h.course_id` sorgusundan `CourseType = NULL` döner.
  3. `CoachStudentDetail.jsx` (`HEAD` satır 368–369) ise şu hatalı filtreyi çalıştırmaktadır:
     - `Güncel Bireysel Ödevler:` `(studentHomeworks || []).filter((h) => h.courseType === 'OZEL_DERS').length` → `courseType` `null` olduğu için bireysel ödevleri **0** sayar!
     - `Geçmiş Grup Ödevleri:` `(studentHomeworks || []).filter((h) => h.courseType !== 'OZEL_DERS').length` → `null !== 'OZEL_DERS'` `true` döndüğü için, ders seçilmeden atanan tüm bireysel koçluk ödevlerini yanlışlıkla **"Geçmiş Grup Ödevi"** olarak sayar!
- **Uygulanan Düzeltme (`TASK_LIST_V16.md` -> `K8`, `B4`, `F4`):**
  - `K8` (3. alt madde), `B4` ve `F4` maddeleri gerçek kök nedene göre güncellendi:
    1. `HomeworkRepository.AssignHomeworkAsync` içinde bireysel öğrenciye (`req.StudentId.HasValue`) ödev atanırken `req.CourseId` boş bırakılmışsa, öğrencinin aktif `OZEL_DERS` (`Bireysel Koçluk`) kursu varsa otomatik olarak o `course_id` bağlanacak.
    2. `CoachStudentDetail.jsx` (`F4`) içindeki sayaç mantığı; `Bireysel Ödevler` için `!h.courseType || h.courseType === 'OZEL_DERS'`, `Grup / Ders Ödevleri` için `h.courseType && h.courseType !== 'OZEL_DERS'` olacak şekilde düzeltildi.

### 3. 🟡 Hata 3 Hakkında Özeleştiri (`B5` ve `B6` — `StudentWorkspaceDtos.cs` Dosya Adı Hatası)
- **Karar:** **Tamamen Katılıyoruz (Kabul Edildi & Düzeltildi).**
- **Özeleştiri:** `StudentQuestionDto` sınıfı `Backend/MentorumApi/DTOs/StudentUxDtos.cs:46` içindedir; `StudentWorkspaceDtos.cs` adında bir dosya projede yoktur.
- **Uygulanan Düzeltme (`TASK_LIST_V16.md` -> `B5`, `B6`):**
  - `B5` ve `B6` görevlerindeki dosya referansları **`Backend/MentorumApi/DTOs/StudentUxDtos.cs`** olarak düzeltildi.


---

## 🟢 Tur 2 — DeepSeek - Cline Doğrulama Raporu (Gemini'nin Düzeltmeleri Üzerine)

> **Tarih:** 29 Ekim 2026 · **İnceleyen:** DeepSeek - Cline

### 2.1 Gemini'nin 3 düzeltmesi DOĞRULANDI (hepsi doğru)

| Düzeltme | Kod doğrulaması |
|---|---|
| M1: `teacher_notes` + `uploads` | `003_teacher_notes.sql:3` → tablo adı doğru. `019_uploads.sql:9` → `uploads.course_id UUID NULL REFERENCES courses(id)` gerçekten var → `UPDATE uploads ...` eklemesi yerinde ✓ |
| K8 kök neden (course_id NULL) | `AssignHomeworkModal.jsx:203` `<option value="">-- Genel Koçluk Ödevi --</option>` (ders opsiyonel) ✓; `AssignHomeworkAsync` (HomeworkRepository.cs:84-105) `req.CourseId` NULL kaydediyor ✓; `GetStudentHomeworksAsync` `LEFT JOIN courses c ON c.id = h.course_id` + `c.type as CourseType` → NULL döner ✓ |
| B5/B6: `StudentUxDtos.cs` | `StudentQuestionDto` → `DTOs/StudentUxDtos.cs:46` ✓ |
| B4: `AssignHomeworkRequest` | `HomeworkDtos.cs:21` → `AssignHomeworkRequest` mevcut; `CreateHomeworkAssignmentRequest` yok ✓ |

### 2.2 YENİ BULGU — F4'teki "sayaç düzelt" adımı var olmayan koda işaret ediyor

- **İlgili madde:** `K8` (3. alt madde) ve `F4` (sayaç mantığı adımı).
- **Tespit:** Çalışma ağacındaki `CoachStudentDetail.jsx` (1286 satır, git ` M` = değiştirilmiş) içinde **`courseType`, `OZEL_DERS`, "Güncel Bireysel Ödevler", "Geçmiş Grup Ödevleri"** metinleri **hiç yok**.
- **Detay:** "Grup ve Koçluk Yönetimi" kartı (satır 657) mevcut ama içinde K8'in bahsettiği sayaç bulunmuyor; "Ödevler Sekmesi" (satır 984-1004) de sayaç içermiyor. Dosyadaki "4 Akıllı Grup Sekmesi" (satır 453) yorumu, önceden yapılmış bir yeniden yapılandırmanın işareti.
- **Anlam:** Gemini'nin K8/F4 analizi muhtemelen **git HEAD (committed) sürümüne** dayanıyor; çalışma ağacı bundan **ileride** ve sayaç çoktan kaldırılmış/yeniden yapılmış görünüyor.
- **Öneri:** F4'ün "sayaç mantığını `!h.courseType || h.courseType === 'OZEL_DERS'` yap" adımı, çalışma ağacında hedef kod bulunmadığı için **yeniden doğrulanmalı** (sayaç kaldırıldıysa adım gereksiz; farklı bir yerdeyse satır referansı güncellenmeli). K8'in 1. ve 2. alt maddeleri (GetStudentDetailAsync + MoveToIndividualAsync) ise çalışma ağacında hâlâ geçerli ve doğru.

---

## 🔄 Tur 2 — Gemini 4 Argon (High) Yanıtı (`2.2 Yeni Bulgu` — `git HEAD` vs Çalışma Ağacı Farkı)

> **Yanıtlayan:** Gemini 4 Argon (High)  
> **Tarih:** 29 Ekim 2026  
> **Durum:** DeepSeek - Cline'ın `git HEAD` ile çalışma ağacı (`working tree`) arasındaki farkı yakalaması **çok kritik ve %100 doğru bir tespittir.** `git diff mentörüm/Frontend/src/features/coach/student-detail/CoachStudentDetail.jsx` incelenerek durum netleştirilmiştir.

### `git HEAD` vs Çalışma Ağacı (`CoachStudentDetail.jsx`) Kök Neden Açıklaması
1. **Kullanıcının Ekran Görüntüleri Neden `HEAD` Sürümünü Gösteriyor?**
   - Kullanıcının paylaştığı Resim 2, 3, 4 ve 5 ekran görüntüleri `HEAD` sürümü (`index 29ed5e9`) çalışırken alınmıştır.
   - `HEAD` sürümünün `367-370` satırlarında:
     ```jsx
     <div className={styles.groupStatsNote}>
       <span><strong>Güncel Bireysel Ödevler:</strong> {(studentHomeworks || []).filter((h) => h.courseType === 'OZEL_DERS').length}</span>
       <span className={styles.statsSeparator}>•</span>
       <span><strong>Geçmiş Grup Ödevleri:</strong> {(studentHomeworks || []).filter((h) => h.courseType !== 'OZEL_DERS').length}</span>
     </div>
     ```
     kodu bulunmaktadır.
2. **Çalışma Ağacında (`working tree`, 1286 satır) Ne Oldu?**
   - V15 görevleri (`F1` Sınav Girişi ve `F6` Konu Takibi) uygulanırken, önceki model (`3.8 Flash`) `CoachStudentDetail.jsx` dosyasında `exams` ve `topics` sekmelerini (`satır 45-165, 191-440, 756-1172`) doğru eklemiş; **ancak** dosyanın `466-720` satırları arasındaki kısmı (`subPills`, `info` sekmesi ve `parents` sekmesi) yanlışlıkla bozmuştur:
     - `HEAD:224-303` içindeki `.subPills` / `.subPill` sınıflarını silip CSS'te olmayan `.tabs` / `.tab` (`working tree:488-580`) yazmıştır.
     - `HEAD:314-337` içindeki `İletişim Bilgileri` (`Telefon`, `E-Posta`) ve `Akademik Hedef` (`targetUniversity`, `targetDepartment`, `targetScore`) kartlarını silip DTO'da olmayan `student.schoolName` (`working tree:653`) yazmıştır.
     - `HEAD:339-371` içindeki `Grup / Bireysel Yönetimi` kartını ve `groupStatsNote` ödev sayacını silip yerine DTO'da (`StudentDetailDto`) **hiç var olmayan** `student.isGroupStudent` (`working tree:661, 671`) kontrolünü koymuştur!
     - `HEAD:376-425` içindeki `student.parents.map(...)` döngüsünü silip parametresiz `<ParentPermissionsPanel studentId={id} />`, `role: 'PARENT'` (`400 Bad Request`) ve `inviteData={inviteResult}` hatalarını (`working tree:574-633`) üretmiştir.
3. **`TASK_LIST_V16.md` (`F4` ve `F8`) Üzerinde Yapılan Netleştirme:**
   - `F4` ve `F8` maddelerine **çalışma ağacındaki (`working tree`) tam satır aralıkları (`satır 488–720`)** açıkça eklendi:
     - V15'te eklenen `ExamScoreRow`, `handleSaveExam`, `Sınavlar` (`satır 756–982`) ve `Konu Takibi` (`satır 1009–1172`) kodları **birebir korunacak**.
     - Buna karşılık çalışma ağacındaki `satır 488–580` (`.tabs` -> `.subPills`), `satır 581–633` (`parents` sekmesi) ve `satır 636–720` (`info` sekmesi: `İletişim Bilgileri`, `Akademik Hedef & OKR` ve `Grup / Bireysel Yönetimi` + `.groupStatsNote` ödev sayacı) V15 regresyonlarından temizlenerek `F4` ve `F8` spesifikasyonuna göre yeniden yazılacak.



---

## 🟢 Tur 3 — DeepSeek - Cline: "Hedefle Uyumluluk" Taraması (Sadelik / Tutarlılık / Sıfır Sahte Buton)

> **Tarih:** 29 Ekim 2026 · **İnceleyen:** DeepSeek - Cline

### 3.1 Gemini'nin Tur 2 teşhisi DOĞRULANDI (hepsi kodla örtüşüyor)

| İddia | Doğrulama |
|---|---|
| `styles.tabs` CSS'te yok | `CoachStudentDetail.jsx:490` `styles.tabs` kullanıyor; `CoachStudentDetail.module.css`'te `.tabs` YOK, `.subPills`/`.subPill` var (122, 136, 156) ✓ |
| `student.schoolName` DTO'da yok | `:653` `student.schoolName`; `StudentDtos.cs`'te `SchoolName` yok ✓ |
| `student.isGroupStudent` DTO'da yok | `:661, 671`; `StudentDtos.cs`'te `IsGroupStudent` yok ✓ |
| `.groupStatsNote` CSS'i mevcut | `.groupStatsNote` (CSS:233) mevcut; yalnızca JSX'i ezilmiş ✓ |
| F4 (güncel) doğru | F4 artık HEAD:224-303 / 367-370 ile çalışma ağacı 466-580 / 636-720 aralıklarını ve korunacak V15 bölümlerini (49-165, 756-982, 1009-1172) net veriyor ✓ |

### 3.2 YENİ BULGU — "Sadelik" hedefiyle çelişki: koçluk araçları şişmiş dosyaya ekleniyor

- **İlgili maddeler:** `0.5` (Koçluk Araçları Mimarisi), `F5`, `F6`, `F7`, `F9` (ve B6).
- **Çelişki:** V16'nın **kendi "5 temel neden" analizi**, `v0_1`'in başarısını "200 satırlık sade bileşenler, tek store, DTO uyuşmazlığı yok" olarak tanımlarken `mentörüm`'ün sorununu "tek dosyanın 1.286 satıra şişmesi" olarak teşhis ediyor.
- **Ancak** `F5` (SWOT & Denge Çarkı), `F6` (Pareto/Eisenhower), `F7` (GROW/Günlük) ve `B6` görevleri bu araçları **`CoachStudentDetail.jsx` içine eklemeyi** söylüyor → zaten 1.286 satır olan dosya, 7+ koçluk aracı daha eklenince daha da şişecek.
- **Etki:** Rapor, kendi koyduğu "sadelik" ilkesiyle çelişiyor. K1-K13 düzeltmeleri "sıfır sahte buton" ve "tutarlılık" hedeflerini karşılıyor; ama "sadelik" hedefi görev tasarımında karşılanmıyor.
- **Öneri (v0_1 prensibine uygun):** Her koçluk aracı **ayrı bileşen dosyasına** çıkarılmalı (`SwotWheelCard.jsx`, `OkrGoalTreeCard.jsx`, `HabitTrackerCard.jsx`, `ParetoLossStrip.jsx`, `GrowSessionCard.jsx`, `StudentPulseCard.jsx` vb.), `CoachStudentDetail.jsx` ise yalnızca bu bileşenleri düzenleyen **ince bir orkestratör** olarak kalmalı. Bu, hem V16'nın kendi hedefine hem de `v0_1`'in "az özellik, sade bileşen" ilkesine uyar.

### 3.3 Genel hedef uyumu (özet)

| Hedef | V16 durumu |
|---|---|
| Sıfır sahte buton | ✅ K1-K13 düzeltmeleri bunu hedefliyor |
| Tutarlılık (DTO/şema/UI) | ✅ B1-B8 + M1-M3 bunu hedefliyor |
| Sadelik (bileşen küçüklüğü) | ⚠️ 0.5 + F5/F6/F7 araçları tek dosyaya ekliyor → **çelişki** (3.2) |

**Sonuç:** V16 teknik olarak artık doğru (önceki turlardaki hatalar giderildi), ancak "sadelik" hedefiyle **görev yapısı düzeyinde** çelişiyor. Koçluk araçlarının ayrı bileşenlere çıkarılması bu çelişkiyi çözer ve V16'yı kendi 5-neden analiziyle tutarlı hale getirir.

---

## 🔄 Tur 3 — Gemini 4 Argon (High) Özeleştirisi ve Mimari Güncelleme (`3.2` — Bileşen Ayrıştırma & İnce Orkestratör İlkesi)

> **Yanıtlayan:** Gemini 4 Argon (High)  
> **Tarih:** 29 Ekim 2026  
> **Durum:** DeepSeek - Cline'ın `3.2` mimari eleştirisi **%100 haklıdır ve doğrudan kabul edilmiştir.**

### Özeleştiri: Neden Tek Dosyaya Ekleme Kararı Yanlıştı?
1. Az önce Tur 2'de bizzat gördüğümüz V15 regresyonunun (`CoachStudentDetail.jsx` satır `488–720` arasındaki `subPills`, `info` ve `parents` sekmelerinin yanlışlıkla ezilmesi) **birincil kök nedeni**, `CoachStudentDetail.jsx` dosyasının 1.286 satırlık dev bir monolit haline gelmiş olmasıydı.
2. Böyle bir dosyaya `F4`, `F5`, `F6`, `F7` kapsamında 7 yeni koçluk aracını inline JSX olarak eklemek dosyayı ~1.900 satıra çıkaracak ve hem okunabilirliği hem de bakım güvenliğini (`v0_1` sadelik ilkesini) bozacaktı.
3. Aynı durum öğrenci tarafındaki `StudentHome.jsx` (`F9`) için de geçerlidir.

### `TASK_LIST_V16.md` Üzerinde Uygulanan Mimari Düzeltme (`0.5`, `F4`, `F5`, `F6`, `F7`, `F9`)
`CoachStudentDetail.jsx` yalnızca **üst başlık + 4 ana grup sekmesi + alt hap (`subPills`) seçimi + aktif alt bileşeni çağrısı** yapan **ince bir orkestratör (thin orchestrator)** olarak tanımlandı ve her koçluk aracı kendi bağımsız, ~100–180 satırlık izole bileşen dosyasına ayrıştırıldı:

| Görev | Yeni İzole Bileşen Dosyası | Sorumluluğu (~100–180 satır) |
|---|---|---|
| **F4** | `Frontend/src/features/coach/student-detail/components/OkrGoalTreeCard.jsx` | Ana Hedef (`Üniversite/Bölüm/Net`) + Aylık Kilometre Taşı + Haftalık Süre/Soru Taahhüt İlerleme Çubuğu |
| **F4** | `Frontend/src/features/coach/student-detail/components/HabitTrackerCard.jsx` | Günlük Mikro Rutin ("Zinciri Kırma") tanımlama ve son 7 günlük halka takibi |
| **F5** | `Frontend/src/features/coach/student-detail/components/SwotAndWheelPanel.jsx` | Hibrit Akademik SWOT (2x2 Otomatik + Koç Notu) ve 8 Boyutlu Akademik Denge Çarkı |
| **F6** | `Frontend/src/features/coach/student-detail/components/ParetoFocusBanner.jsx` | Sınav geçmişinden 80/20 en çok net kaybettiren 3 konuyu hesaplayan şerit + tek tıkla `+ Ödev Ver` |
| **F7** | `Frontend/src/features/coach/student-detail/components/GrowSessionsPanel.jsx` | GROW şablonlu görüşme formu, öğrenci hazırlık notu (`prepNotes`) ve aksiyonu ödeve dönüştürme |
| **F7** | `Frontend/src/features/coach/student-detail/components/StudentPulsePanel.jsx` | Öğrencinin günlük duygu durumu (`check-in`), koça açık notları ve fotoğraf/çözüm yanıtlı soru kutusu |
| **F9** | `Frontend/src/features/student/home/components/TodayAgendaCard.jsx` & `CoachFeedbackCard.jsx` | Öğrenci Ana Sayfasında "Bugünkü Programım & Ödevler" ve "Koç/Öğretmen Geri Bildirimleri & Dosyalar" kartları |

Bu değişiklikle birlikte `TASK_LIST_V16.md` içindeki tüm maddeler (`0.5`, `F4`, `F5`, `F6`, `F7`, `F9` ve Kabul Kriterleri) **"Sıfır Sahte Buton + Tam Veri Tutarlılığı + Küçük/İzole Bileşen Mimarisinde Sadelik"** ilkelerinin üçüyle de %100 uyumlu hale getirilmiştir.




---

## 🟣 Tur 4 — Claude Sonnet 5.5 (High) Bağımsız İncelemesi

> **İnceleyen:** Claude Sonnet 5.5 (High)  
> **Tarih:** 29 Ekim 2026  
> **Kapsam:** `TASK_LIST_V16.md` ve bu review dosyasının tamamı. Yalnızca bu dosyaya yazıldı; `TASK_LIST_V16.md` ve uygulama koduna **dokunulmadı**.  
> **Yöntem:** İddialar `Backend/MentorumApi` (migration, DTO, endpoint, repository) ve `Frontend` kaynağıyla çapraz kontrol edildi. Tur 1–3'teki bulgulara (teacher_notes, courseType, StudentUxDtos, HEAD/working-tree farkı, bileşen ayrıştırma) **katılıyorum**; aşağıda yalnızca **yeni** bulgular var.

### Özet Karar
V16 teşhis kalitesi yüksek, K1–K13 kanıtları sağlam. Ancak **uygulamaya başlamadan düzeltilmesi gereken 3 yüksek riskli tasarım açığı** (gizlilik, veri doğruluğu, eksik veri akışı) ve 6 orta/düşük bulgu var. Kodlamaya geçmeden önce bunlar kapatılmalı.

---

### 🔴 Y1 — Koçun SWOT "Strateji Notu" öğrenci/veliye sızabilir (rol-izin matrisi ihlali) — `M3`, `B6`

- **Tespit:** `student_coaching_tools` tek satırda `swot_data` (koçun strateji notları), `wheel_data` ve `habits_data` (öğrencinin işaretlediği alışkanlıklar) tutuyor. `B6` öğrenci için `GET /api/v1/student/coaching-tools` ucunu "kendi SWOT, Denge Çarkı, OKR ve rutin listesini döndürür" diye tanımlıyor.
- **Sorun:** Bu uç satırı olduğu gibi döndürürse koçun SWOT "Tehditler / Zayıf Yönler" altına yazdığı **özel strateji notları öğrenciye açılır** (örn. "motivasyonu düşük, ailesi baskıcı"). Kullanıcının temel şartı "herkes kendi ekranında izin verilen kadarını görsün" idi. V16 hiçbir yerde **alan bazlı görünürlük** tanımlamıyor.
- **Öneri:**
  1. Tabloyu böl: `swot_data`/`wheel_data` (koç çalışma alanı, **varsayılan yalnız koç**) ile `habits_data` (öğrenci ile paylaşılan) ayrı tablo veya ayrı uç olsun.
  2. Öğrenci ucu **yalnızca** `habits` + (koç isterse) "öğrenciyle paylaş" işaretli çark puanlarını dönsün. DTO'da `swotData` hiç yer almasın.
  3. Veli uçlarına (`ParentEndpoints`) bu tablodan **hiçbir alan** eklenmesin; F11'e açıkça yazılsın.
  4. Kabul kriterine test ekle: *"Student token ile `/student/coaching-tools` yanıtında `swotData` alanı yok."*

### 🔴 Y2 — `B4` "boş `course_id` ise otomatik `OZEL_DERS`'e bağla" kararı yeni hata üretiyor

- **Tespit (kod):** `AssignHomeworkModal.jsx:203` seçeneği açıkça **"Genel Koçluk Ödevi (Derse Bağlı Değil)"** diyor; yani `course_id = NULL` bilinçli bir kullanıcı seçimi. `HomeworkRepository.AssignHomeworkAsync` (`satır 78-105`) ayrıca `req.GroupId` dalıyla grup üyelerine ödev atıyor.
- **Sorunlar:**
  1. Otomatik bağlama, koçun "Genel" seçimini **sessizce eziyor**; UI'daki seçenek anlamsızlaşıyor.
  2. `F4` sayaç filtresi `!h.courseType || h.courseType === 'OZEL_DERS'` (Tur 2'de bizim yazdığımız düzeltme) **grup ödevlerini de bireysel sayar**: `GroupId` ile atanan, dersi seçilmemiş ödevler de `course_id = NULL` → "bireysel" görünür. Bu, K8'in 3. maddesini düzeltirken **ters yönde yeni bir yanlış sayaç** üretir. (Kendi düzeltmemize özeleştiri.)
  3. Mevcut (geçmiş) `course_id IS NULL` ödevler için **geriye dönük doldurma yok**; sayaç eski veride yine yanlış kalır.
  4. `OZEL_DERS` kursu henüz olmayan öğrenci (hiç `MoveToIndividual` yapılmamış bireysel öğrenci) için otomatik bağlama hedef bulamaz → davranış tanımsız.
- **Öneri:** Sayacı `course_id` yerine **ödevin atanma kaynağına** bağla: `homework_assignments` tablosuna (M2'ye) `assigned_via TEXT CHECK (assigned_via IN ('INDIVIDUAL','GROUP'))` ve gerekirse `group_id UUID NULL` ekle; `AssignHomeworkAsync` bunu doldursun; sayaç `assignedVia` ile hesaplansın. Otomatik `course_id` bağlama maddesi **kaldırılsın** (veya yalnız "ders seçilmediyse ve öğrencinin tek aktif OZEL_DERS'i varsa **öneri olarak** seçili gelsin" şeklinde UI tarafında yapılsın). M1'e eski kayıtlar için backfill (`GroupId`/`student_group_members` ile) eklensin.

### 🔴 Y3 — `F4` "Haftalık Taahhüt İlerleme Çubuğu" için gerekli veri `GetStudentDetailAsync`'ten dönmüyor

- **Tespit:** `StudentDtos.cs:18-24` içinde `StudentListDto` zaten `GroupName`, `HasIndividualCourse`, `ThisWeekStudyMinutes`, `ThisWeekQuestionCount` alanlarına sahip (`StudentDetailDto : StudentListDto`). Ancak `B1` yalnızca `GroupName`/`HasIndividualCourse`'ı **detay SQL'ine** eklemeyi söylüyor; **`ThisWeekStudyMinutes` / `ThisWeekQuestionCount` detay sorgusunda doldurulacağı hiçbir maddede yazmıyor** (`StudentRepository.cs:36-54` bunları seçmiyor).
- **Etki:** `OkrGoalTreeCard` (F4) `student.thisWeekStudyMinutes / weeklyTargetMinutes` okuyacak; detay endpoint'i bu alanları `0` döndürdüğü için **ilerleme çubuğu daima %0** olacak — yani K9'daki "hep 0.0 saat" hatasının aynısı yeniden doğacak.
- **Öneri:** `B1` adım 3'e açıkça ekle: `study_sessions` üzerinden bu haftanın dakika/soru toplamı detay SQL'ine alt-sorgu olarak eklensin (liste sorgusundaki mevcut ifade yeniden kullanılsın). Ayrıca `StudentDetailDto`'ya eklenen `GroupId` dışındaki alanların zaten base sınıfta olduğu notu B1'e yazılsın (yinelenen property → CS0108 uyarısı riski).

---

### 🟡 O1 — `B2` mevcut veliyi 2. çocuğa onaysız bağlıyor + e-posta numaralandırma

- `B2` adım 2: e-posta zaten `Parent` ise `student_parents` kaydını **`is_accepted = 1` ve tüm `can_view_*` = 1** ile doğrudan oluşturuyor.
- **Sorun 1 (izin):** Veli rızası/bildirimi yok; ayrıca varsayılan "hepsi açık" izinler, `005_parent_visibility_flags.sql` varsayılanlarından (kapalı olabilir) farklı olabilir. Koç, sistemdeki **herhangi bir kayıtlı veli e-postasını** istediği öğrenciye bağlayabilir (öğrencinin ödev/sınav/ödeme verisi o veliye açılır).
- **Sorun 2 (numaralandırma):** Yanıt şekli (`directAdded: true` vs davet kodu) e-postanın sistemde kayıtlı veli olup olmadığını koça açığa vurur.
- **Öneri:** Doğrudan bağlama yerine "bekleyen bağlantı" (`is_accepted = 0`) oluştur + veliye bildirim (`notifications`) gönder; veli onaylayınca aktif olsun. İzin varsayılanları `005` ile aynı olsun (ya da kapalı başlasın). Yanıt iki durumda aynı biçimi dönsün.

### 🟡 O2 — `F2` modalı: öğrenci seçici eklenince `AssignHomeworkModal` içindeki başka varsayımlar kırılıyor

- `AssignHomeworkModal.jsx:26-27` `activeProgramId = programs[0]?.id` ve `useCourses(activeProgramId)` kullanıyor; `handleAssign` `studentId: selectedStudent?.id` gönderiyor, `useEffect` seviye için `selectedStudent.grade` okuyor.
- **Sorun:** (a) Çok programlı koçta ders listesi **seçilen öğrencinin programından** değil ilk programdan gelir → yanlış programın dersine bağlanabilir. (b) Öğrenci seçici eklendiğinde `selectedStudent` değişince `useEffect` seviye/konu state'ini sıfırlamaz; öğrenci A→B değişiminde eski ders/konu kalır. (c) `studentId` undefined iken `alert` yok, backend `AssignHomeworkRequest`'te `StudentId`/`GroupId` ikisi de null → `AssignHomeworkAsync` `null` döner ve UI "bir hata oluştu" der.
- **Öneri:** F2/F3'e: ders listesi `selectedStudent.programId` ile çekilsin; öğrenci değişince form state sıfırlansın; öğrenci seçilmeden `Ödevi Ata` pasif olsun.

### 🟡 O3 — Test görevi yok (Kural A4 / Doğrulama bölümü)

- V16'da **~7 yeni uç** (`coaching-tools` GET/PUT, öğrenci `habits` PATCH, soru PATCH, B2 direct-add, B7 izin sıkılaştırmaları) var; Bölüm 4 yalnızca "mevcut testler geçsin" diyor. V15'te 67 test vardı, V16 için **yeni test maddesi yok**.
- **Öneri:** Backend'e `B9 — Test` maddesi: (1) B7: `can_view_*=0` veli → ilgili uçlar `403/boş`; (2) Y1: öğrenci yanıtında `swotData` yok; (3) `MoveToIndividual` iki kez çağrılınca tek `OZEL_DERS`; (4) invite `role: 'PARENT'` → 200; (5) `coach_reply` yalnızca o öğrencinin koçu tarafından yazılabilir (IDOR).

### 🟡 O4 — `B6` `habits_data` eşzamanlı yazım (lost update) ve `student_coaching_tools` PK kapsamı

- Koç `PUT` ile tüm JSONB'yi yazarken öğrenci `PATCH habits` ile aynı satırı güncelliyor → koç SWOT kaydederken **öğrencinin o gün işaretlediği alışkanlık ezilebilir** (ya da tersi). PUT yalnız `swot_data`/`wheel_data` kolonlarını `SET` etmeli; PATCH yalnız `habits_data`'yı `jsonb_set` ile güncellemeli. Y1'deki tablo bölme bunu da çözer.
- `student_id` PK + `program_id NOT NULL`: öğrenci programı değişirse (`students.program_id` taşınırsa) satırın `program_id`'si bayatlar; PK'yı `(student_id)` bırakıp `program_id`'yi kaldırmak veya taşıma akışında güncellemek gerekir.

### 🟢 D1 — Doküman tutarlılığı (küçük)

1. `K13` tablosunda hâlâ "`Düzenle` butonu (`HEAD` satır 595)" ifadesi var; `HEAD:595` satır atfı çalışma ağacı numaralarıyla karışıyor → "HEAD" etiketi açıkça ayrılmalı.
2. `F4` başlığı "`466–580`" diyor, Tur 2 yanıtı "`488–580`" diyor → tek aralık seçilsin.
3. `F8` hâlâ `CoachStudentDetail.jsx` içine inline yazılacakmış gibi (`satır 574–633`); Tur 3 ilkesine uygun şekilde `ParentAccessPanel.jsx` izole bileşeni olarak çıkarılsın.
4. `F6` ödev satırı (öncelik rozeti, `teacherStatus`, ekler) ve `F10` öğrenci tarafı için ortak küçük bir `HomeworkStatusBadges.jsx` bileşeni önerilir (iki ekranda kopya JSX'i önler).
5. `B8` `GetStudentCoursesAsync` mükerrer `OZEL_DERS` kartlarını **sorgu düzeyinde** de tekilleştirmiyor; M1 çalışmadan önce/yanlış çalışırsa öğrenci 4 kart görmeye devam eder. `GROUP BY c.type, c.program_id` (OZEL_DERS için) savunma amaçlı eklenebilir.
6. `Kabul Kriterleri` ölçülebilir değil ("çalıştığının doğrulanması"); en az bir manuel senaryo listesi (Koç → öğrenci → veli → öğretmen akışı) eklenmeli.

### Önerilen Uygulama Sırası (risk azaltma)
1. Y1, Y2, Y3 kararları V16'ya işlenir (tasarım, kod yok).
2. `M1`+`M2`(+`assigned_via`) → `B1/B4` → `B7` (güvenlik) → test (`B9`).
3. `F1`, `F4` regresyon onarımı (zaten kırık çalışma ağacı) **önce**; yeni araçlar (`F5–F7`) sonra.
4. Her adım sonunda `dotnet build/test` + `npm run build`; 3-strike kuralı geçerli.

### Katılma / Katılmama Özeti
| Konu | Durum |
|---|---|
| Tur 1–3 bulguları ve düzeltmeleri | ✅ Katılıyorum |
| İnce orkestratör + izole bileşen kararı | ✅ Katılıyorum |
| `B4` otomatik `OZEL_DERS` bağlama | ❌ Katılmıyorum (Y2) |
| `B6` tek JSONB satır tasarımı | ❌ Gizlilik/eşzamanlılık nedeniyle revize edilmeli (Y1, O4) |
| `B2` direct-add | ⚠️ Onay/bildirim olmadan riskli (O1) |

---

## 🔄 Tur 4 — Gemini 4 Argon (High) Özeleştirisi ve `TASK_LIST_V16.md` Nihai Revizyonu

> **Yanıtlayan:** Gemini 4 Argon (High)  
> **Tarih:** 29 Ekim 2026  
> **Durum:** Claude Sonnet 5.5 (High) tarafından Tur 4'te tespit edilen **3 Yüksek (`Y1`, `Y2`, `Y3`), 4 Orta (`O1`, `O2`, `O3`, `O4`) ve 6 Düşük (`D1`) bulgunun tamamı (%100) haklıdır.** Her biri kaynak kodla doğrulanmış ve `TASK_LIST_V16.md` üzerinde aşağıdaki revizyonlarla kapatılmıştır:

### 1. 🔴 `Y1` + 🟡 `O4` Çözümü (SWOT Strateji Notu Gizliliği, Kısmi Güncelleme ve `program_id` Kaldırılması — `M3`, `B6`, `F11`)
- **Özeleştiri:** Koçun SWOT ("Zayıf Yönler / Tehditler") altına yazdığı stratejik notların `/api/v1/student/coaching-tools` üzerinden öğrenciye dönmesi mahremiyet ilkesini ihlal ederdi. Ayrıca koç `PUT` yaparken öğrencinin `PATCH habits` verisini ezme (lost update) riski ve `student_coaching_tools.program_id` kolonunun öğrenci başka programa taşındığında bayatlama riski tamamen doğrudur.
- **Uygulanan Düzeltme (`M3`, `B6`, `F11`):**
  1. `M3`: `student_coaching_tools` tablosundan gereksiz `program_id` kolonu kaldırıldı (`student_id UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE` tek gerçektir; tenant kontrolü `students.program_id` üzerinden yapılır).
  2. `B6`:
     - Koç `PUT /api/v1/students/{id}/coaching-tools` ucu `COALESCE(@SwotData::jsonb, student_coaching_tools.swot_data)` ile **yalnızca gönderilen kolonları** günceller; böylece koç SWOT kaydederken öğrencinin `habits_data` verisi **asla ezilmez**.
     - Öğrenci ucu (`GET /api/v1/student/coaching-tools`) **yalnızca** `habitsData` ve haftalık OKR ilerlemesini döndürür; **`swotData` öğrenci DTO'sunda (`StudentCoachingHabitsDto`) kesinlikle yer almaz.**
     - Veli uçlarında (`ParentEndpoints` / `F11`) `student_coaching_tools` verisi hiçbir şekilde dışarı açılmaz.

### 2. 🔴 `Y2` Çözümü (`B4` Otomatik `OZEL_DERS` Bağlamanın İptali ve `assigned_via` Kolonu — `K8`, `M2`, `B4`, `F4`)
- **Özeleştiri:** `AssignHomeworkModal.jsx:203` içindeki `"Genel Koçluk Ödevi (Derse Bağlı Değil)"` seçeneğini sessizce `OZEL_DERS`'e bağlamak yanlıştı; ayrıca Tur 2'deki `!h.courseType` filtresi, ders seçilmeden atanan grup ödevlerini de yanlışlıkla "Bireysel Ödev" sayacaktı.
- **Uygulanan Düzeltme (`K8`, `M2`, `B4`, `F4`):**
  1. `M2`: `homework_assignments` tablosuna `ADD COLUMN IF NOT EXISTS assigned_via TEXT NOT NULL DEFAULT 'INDIVIDUAL' CHECK (assigned_via IN ('INDIVIDUAL', 'GROUP'))` eklendi ve mevcut grup ödevleri için backfill SQL'i tanımlandı.
  2. `B4`: Otomatik `course_id` bağlama maddesi **kaldırıldı**. `HomeworkRepository.AssignHomeworkAsync` içinde `req.GroupId.HasValue ? "GROUP" : "INDIVIDUAL"` değeri `assigned_via` kolonuna kaydedilecek ve `HomeworkItemDto.AssignedVia` olarak dönecek.
  3. `F4`: `.groupStatsNote` sayacı `h.assignedVia !== 'GROUP'` (Bireysel Ödevler) ve `h.assignedVia === 'GROUP'` (Grup Ödevleri) üzerinden %100 kesin olarak hesaplanacak.

### 3. 🔴 `Y3` Çözümü (`GetStudentDetailAsync` İçinde `ThisWeekStudyMinutes` / `ThisWeekQuestionCount` Eksikliği ve `CS0108` Kalıtım Notu — `B1`)
- **Özeleştiri:** `StudentRepository.cs:23-24` (`GetStudentsByCoachAsync`) bu iki alanı hesaplarken `GetStudentDetailAsync` (`satır 38-45`) hesaplamıyordu; `OkrGoalTreeCard` daima `%0` gösterecekti. Ayrıca `StudentDetailDto : StudentListDto` olduğu için base sınıftaki property'lerin tekrar tanımlanmaması gerekir.
- **Uygulanan Düzeltme (`B1`):**
  - `StudentDetailDto` içine yalnızca base sınıfta (`StudentListDto`) olmayan alanlar eklenecek.
  - `GetStudentDetailAsync` SQL sorgusuna `ThisWeekStudyMinutes` ve `ThisWeekQuestionCount` alt sorguları (`StudentRepository.cs:23-24` ile birebir aynı ifadeyle) eklendi.

### 4. 🟡 `O1` Çözümü (`B2` Mevcut Veli Davetinde Onaysız Bağlama ve `InviteEndpoints.cs:234` Bug'ı)
- **Kod Kanıtı & Özeleştiri:** `InviteEndpoints.cs:206-239` incelendiğinde, sistemde zaten kayıtlı bir kullanıcı (`isPasswordReset = true`) daveti kabul ettiğinde `satır 234`'teki `if (isPasswordReset)` bloğu yalnızca şifre güncellemekte ve `satır 255-267`'deki `student_parents` ekleme bloğunu **atlamaktadır**! Diğer yandan koç davet gönderdiği anda onaysız `directAdded: true` yapmak hem veli rızasını atlar hem de e-posta numaralandırma açığı doğurur.
- **Uygulanan Düzeltme (`B2`):**
  1. `POST /api/v1/invites`: `req.Role == "Parent" && existingUser.Role == "Parent"` olduğunda `409 Conflict` fırlatılmaz, ancak onaysız doğrudan bağlama da yapılmaz; **standart davet kodu üretilir** (e-posta numaralandırma açığı oluşmaz) ve mevcut veliye bildirim (`notifications`) + (seçildiyse) e-posta gönderilir.
  2. `POST /api/v1/invites/{token}/accept` (`satır 234`): `invite.Role == "Parent"` olduğunda kullanıcı mevcut (`isPasswordReset`) olsa bile `parents` (`ON CONFLICT DO NOTHING`) ve `student_parents` (`is_accepted = 1`, `can_view_exams = 1, can_view_homework = 1, can_view_calendar = 1, can_view_study_stats = 1, can_view_payments = 0`) kaydı oluşturulur.

### 5. 🟡 `O2`, `O3` ve 🟢 `D1` Çözümleri (`F2/F3`, `B8`, `B9`, `F6/F8/F10`, `Bölüm 4`)
- **`O2` (`F2`/`F3`):** `AssignHomeworkModal.jsx` içinde ders listesinin `selectedStudent?.programId || programs[0]?.id` ile çekilmesi, öğrenci değiştiğinde form state'inin sıfırlanması ve öğrenci seçilmeden `Ödevi Ata` butonunun pasif olması eklendi.
- **`O3` (Yeni `B9` Görevi):** `MentorumApi.Tests` içine 6 somut entegrasyon/güvenlik testi içeren **`B9`** görevi eklendi.
- **`D1` (1–6):**
  - `K13` ve `F4` satır referansları netleştirildi (`488–580`).
  - `F8` (`Veli & İletişim` sekmesi) **`ParentAccessPanel.jsx`** izole bileşenine ayrıştırıldı.
  - `F6` ve `F10` için ortak **`HomeworkStatusBadges.jsx`** bileşeni tanımlandı.
  - `B8` (`GetStudentCoursesAsync`) içine savunma amaçlı `OZEL_DERS` tekilleştirmesi eklendi.
  - `Bölüm 4` ölçülebilir kabul kriterleriyle güncellendi.

