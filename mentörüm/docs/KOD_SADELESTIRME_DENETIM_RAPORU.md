# Mentörüm — Spagetti Kod, Mimari Sadelik ve Migration Birleştirme Denetim Raporu

- **Tarih:** 2026-10-29
- **Kapsam:** `mentörüm/Backend`, `mentörüm/Frontend`, `mentörüm/Backend/MentorumApi/Data/Migrations`
- **İlkeler:** Kodlarda Sadelik (KISS / DRY), Tek Sorumluluk (SRP), Sıfır Regresyon ve Kesintiye Dayanıklı İlerleme Kaydı.
- **Durum:** Denetim tamamlandı. Kural C2 gereği **kullanıcıdan açık onay alınmadan hiçbir kod değişikliği uygulanmamıştır.**

---

## 1. Yönetici Özeti ve Kritik Bulgular

Kod tabanında yapılan tam tarama sonucunda hem **mimari spagetti/şişkinlik noktaları**, hem **veritabanı migration dağınıklığı**, hem de spagetti yapıdan kaynaklanan **3 adet aktif sözleşme (contract) uyumsuzluğu** tespit edilmiştir:

### 🚨 Acil Düzeltilmesi Gereken 3 Sözleşme (Contract) Hatası (`CoachStudentDetail.jsx` ↔ `coachApi.js` ↔ `StudentEndpoints.cs`)
`CoachStudentDetail.jsx` dosyasının 1.394 satıra ulaşması ve prop/hook zincirinin karmaşıklaşması nedeniyle şu 3 işlem sessizce başarısız olmaktadır:
1. **Koçluk Araçları (`SWOT`, `Denge Çarkı`, `Alışkanlıklar`) Kayıt Uyuşmazlığı:**
   - [`coachApi.js:506`](file:///c:/YazilimCalisma/planlama_app/mentörüm/Frontend/src/features/coach/coachApi.js#L503-L513) içinde `useUpdateCoachingTools` hook'u `{ studentId, toolsData }` parametresi beklerken, [`CoachStudentDetail.jsx`](file:///c:/YazilimCalisma/planlama_app/mentörüm/Frontend/src/features/coach/student-detail/CoachStudentDetail.jsx#L751-L754) (satır 751, 1302, 1316) `{ studentId: id, data: ... }` göndermektedir (`toolsData` `undefined` kaldığı için API'ye boş gövde gitmektedir). Ayrıca `habitsData` dizi olarak gönderilmekte, Backend ise JSON `string` (`SwotData`, `WheelData`, `HabitsData`) beklemektedir.
2. **Öğrenci Sorusunu Yanıtlama (`StudentPulsePanel`) Parametre Uyuşmazlığı:**
   - [`coachApi.js:518`](file:///c:/YazilimCalisma/planlama_app/mentörüm/Frontend/src/features/coach/coachApi.js#L515-L525) içinde `useReplyStudentQuestion` hook'u `{ studentId, questionId, reply, status }` beklerken, [`CoachStudentDetail.jsx:1330`](file:///c:/YazilimCalisma/planlama_app/mentörüm/Frontend/src/features/coach/student-detail/CoachStudentDetail.jsx#L1329-L1338) içinde `{ questionId, coachAnswer }` çağrılmaktadır (`studentId` eksik olduğu için `/students/undefined/questions/...` adresine istek gitmektedir).
3. **GROW Seans Modeli (`GrowSessionsPanel`) Veri Kaynağı Kopukluğu ve Ölü Sekme:**
   - [`CoachStudentDetail.jsx:265-274`](file:///c:/YazilimCalisma/planlama_app/mentörüm/Frontend/src/features/coach/student-detail/CoachStudentDetail.jsx#L265-L274) ve satır 1298'de GROW seansları veritabanında karşılığı olmayan `coachingTools.growSessionsData` alanından okunup yazılmaya çalışılmaktadır (`student_coaching_tools` tablosunda yalnızca `swot_data`, `wheel_data`, `habits_data` kolonları vardır).
   - Oysa gerçek görüşme tablosu olan `coaching_sessions` ve `useCoachStudentSessions(id)` / `useCreateCoachingSession(id)` (`POST /api/v1/students/{id}/sessions`) zaten mevcuttur. Ayrıca satır 1242–1295 arasındaki eski `{activeTab === 'sessions'}` bloğu hiçbir sekme butonu tarafından açılmayan **55 satırlık ölü koddur**. `GrowSessionsPanel` doğrudan `coaching_sessions` uç noktasına bağlanmalı ve ölü blok silinmelidir.

---

## 2. Veritabanı Migration Dosyalarını Birleştirme Planı (`27 Dosya → Tek Şema`)

### 2.1 Mevcut Durum ve Karmaşa
- `MentorumApi/Data/Migrations` dizininde **27 adet `.sql` dosyası** bulunmaktadır (`001_schema.sql` .. `027_v16_ux_communications_and_coaching_tools.sql`).
- `001_schema.sql` (774 satır) geçmişte `001`–`016` dosyalarının uç uca yapıştırılmasıyla oluşturulmuştur: tabloları önce eski `coach_id` kolonuyla kurmakta, ardından `program_id` ekleyip `DO $$` döngüleriyle `coach_id` kolonlarını `DROP` etmektedir.
- `002` ile `025` arasındaki **17 dosya 1 ila 20 satırlık** küçük `ALTER TABLE` yamalarıdır (`009` = 1 satır, `007` = 2 satır, `018` = 3 satır).
- **Kritik Tehlike — `024_cleanup_and_seed_test_ecosystem.sql` (295 satır):**
  - İçinde `canoser@gmail.com` dışındaki **tüm kullanıcıları, programları, ödevleri, sınavları ve ödemeleri silen (`DELETE FROM ...`) 39 adet yıkıcı komut** ve `123456` şifreli test hesapları vardır.
  - Üretim ortamında `_schema_migrations` tablosu sıfırlanacak veya dosya adı değişecek olursa canlı veritabanındaki tüm veriyi silecek bir saatli bombadır.

### 2.2 Güvenli ve Sıfır-Riskli Birleştirme Stratejisi
Canlı veritabanında (`mentorum-api.dersmatris.com`) `_schema_migrations` tablosunda `001_schema.sql`..`027_...sql` kayıtlarının tamamı zaten `"uygulandı"` olarak işaretlidir:
1. **Tek `001_schema.sql` Konsolidasyonu:**
   - `001` ile `027` arasındaki tüm tablo, kolon, indeks, constraint ve sistem ayarları (`024` yıkıcı test seed'i **hariç**) tek, temiz ve %100 idempotent (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `ON CONFLICT DO NOTHING`) **`001_schema.sql`** dosyasında birleştirilir.
   - `001_schema.sql` içindeki tarihsel `coach_id` oluşturup sonra silen (`007`/`008`) gereksiz geçiş blokları ve mükerrer constraint tanımları temizlenir; tablolar doğrudan nihai V16 şemasıyla tanımlanır.
2. **Canlı Ortam Uyumluluğu (%100 Güvenli):**
   - Canlı veritabanında `_schema_migrations` tablosunda `'001_schema.sql'` zaten kayıtlı olduğu için `Program.cs --migrate-only` çalıştığında `'001_schema.sql'` dosyasını `"Atlandı (uygulanmış)"` olarak geçer; canlı veritabanına hiçbir yıkıcı işlem uygulanmaz.
   - Yeni kurulan ortamlarda ve Testcontainers entegrasyon testlerinde (`MentorumApi.Tests`) ise 27 dosya yerine tek `001_schema.sql` saniyeler içinde çalışır.
3. **`024` Test Seed Dosyasının İzolasyonu:**
   - `024_cleanup_and_seed_test_ecosystem.sql` dosyası `Data/Migrations/` klasöründen çıkarılarak `docs/seeds/dev_seed_ecosystem.sql` altına taşınır; böylece otomatik migration döngüsünden tamamen ayrılır.

---

## 3. Frontend Spagetti Kod ve Şişkinlik Tespiti

### 3.1 "Tanrı Bileşenler" (God Components)

| Dosya | Satır | `useState` | Inline `style={{` | Sorun Özeti |
|---|---:|---:|---:|---|
| [`CoachStudentDetail.jsx`](file:///c:/YazilimCalisma/planlama_app/mentörüm/Frontend/src/features/coach/student-detail/CoachStudentDetail.jsx) | **1.394** | 22 | 108 | 11 sekmenin 7'si doğrudan aynı dosyada render ediliyor; sayfa açılışında aktif sekmeye bakılmaksızın **11 ayrı API sorgusu aynı anda** tetikleniyor; 55 satır ölü `sessions` sekmesi var. |
| [`CoachDashboard.jsx`](file:///c:/YazilimCalisma/planlama_app/mentörüm/Frontend/src/features/coach/dashboard/CoachDashboard.jsx) | **815** | 4 | 15 | Tüm dashboard kartları, filtreler ve hesaplamalar tek fonksiyon içinde (CSS dosyası 1.050 satır). |
| [`CoachStudents.jsx`](file:///c:/YazilimCalisma/planlama_app/mentörüm/Frontend/src/features/coach/students/CoachStudents.jsx) | **689** | **28** | 13 | Doğrudan öğrenci ekleme formu, davet formu, bekleyen davetler ve öğrenci listesi tek bileşende. Ayrıca `AddStudentModal` import edilmiş ama `setShowAddStudent(true)` hiçbir yerde çağrılmıyor (ölü modal). |
| [`CoachTeacherDetailPage.jsx`](file:///c:/YazilimCalisma/planlama_app/mentörüm/Frontend/src/features/coach/teachers/CoachTeacherDetailPage.jsx) | **505** | 3 | 6 | Öğrenciler, ödev istatistikleri, sınavlar ve dersler sekmeleri tek dosyada. |
| [`TeacherCoursesPage.jsx`](file:///c:/YazilimCalisma/planlama_app/mentörüm/Frontend/src/features/teacher/courses/TeacherCoursesPage.jsx) | **455** | **25** | 12 | Ödev atama formu, sınav ekleme formu, ödev değerlendirme ve ders tamamlama state'leri (kullanılmayan `showCompleteModal` dahil) tek bileşende. |

### 3.2 Ölü Kodlar ve Çakışan Hook İsimleri
1. **Birebir Kopya Hook:**
   - `useStudentSchedule` hem [`studentApi.js:308`](file:///c:/YazilimCalisma/planlama_app/mentörüm/Frontend/src/features/student/studentApi.js#L308) hem de [`studentSchoolApi.js:4`](file:///c:/YazilimCalisma/planlama_app/mentörüm/Frontend/src/features/student/studentSchoolApi.js#L4) içinde birebir aynı `queryKey` ve endpoint ile iki kez tanımlanmış.
2. **İsim Çakışması Olan 6 Hook (`coachApi.js` vs `studentApi.js`):**
   - `useStudentNotes`, `useCompleteHomework`, `useStudentTeacherNotes`, `useStudentSubjectStats`, `useStudentTimeBudget`, `useStudentCoachingTools` hem koç hem öğrenci API dosyalarında aynı isimle tanımlı. Koç tarafındakiler `useCoach...` önekiyle veya net isimle ayrıştırılmalı.
3. **Hiç Kullanılmayan 8 Export Edilmiş Hook (Ölü Kod):**
   - `useAddProgramCoach` (`coachSchoolApi.js`)
   - `useCompleteTeacherCourse` (`teacherApi.js`)
   - `useCurriculumProgress` (`coachApi.js`)
   - `useDeliverUpload`, `useUpdateCoachStorage`, `useUpdateTeacherFileSharing` (`storageApi.js`)
   - `useParentChildPermissions` (`parentApi.js`)
   - `useStudentStudySessions` (`studentApi.js`)
4. **Ölü State ve Bileşenler:**
   - `CoachStudents.jsx` içinde `AddStudentModal` ve `showAddStudent` state'i (`setShowAddStudent(true)` hiç yok).
   - `TeacherCoursesPage.jsx` içinde satır 63–66'daki `showCompleteModal`, `completeSummary`, `completeCoachNote`, `completeSuccessMsg` state'leri tanımlanmış ama JSX içinde hiç kullanılmamış.
   - `CoachStudentDetail.jsx` satır 1242–1295 arasındaki `{activeTab === 'sessions'}` bloğu (`activeGroup === 'sessions'` seçildiğinde `activeTab` `'grow'` yapıldığı için bu bloğa asla ulaşılamıyor).

---

## 4. Backend Spagetti Kod ve Mimari Tespiti

1. **`StudentEndpoints.cs` (852 Satır — İki Farklı Rol Tek Dosyada):**
   - Satır 17–495 arası **Koç** uç noktalarını (`/api/v1/students/...` — `RequireCoachRole`), satır 498–852 arası ise **Öğrenci** uç noktalarını (`/api/v1/student/...` — `RequireStudentRole`) barındırıyor.
   - `StudentEndpoints.cs` (Koç tarafı) ve `StudentSelfEndpoints.cs` (Öğrenci tarafı) olarak ikiye bölünmeli.
2. **12 Dosyada Tekrarlanan `GetUserId` / `GetCoachId` Yardımcıları:**
   - 12 ayrı endpoint dosyasında `private static Guid? GetUserId(ClaimsPrincipal user)` birebir kopyalanmış; ayrıca 74 yerde `ClaimTypes.NameIdentifier` ve 33 yerde `Guid.TryParse` tekrarı var.
   - Tek bir `ClaimsPrincipalExtensions.GetUserId()` extension metodu ile tüm endpoint dosyalarındaki bu tekrar temizlenmeli.
3. **Endpoint İçinde Ham SQL (`AuthEndpoints.cs`, `InviteEndpoints.cs`, `StudentEndpoints.cs`, `ParentEndpoints.cs`):**
   - `StudentEndpoints.cs` içindeki `/coaching-tools` GET/PUT ve PDF rapor sorguları `StudentRepository` içine taşınarak endpoint dosyası sadeleştirilmeli.
4. **`Program.cs` İçindeki Migration Döngüsü:**
   - `Program.cs` (satır 146–186) içindeki 40 satırlık `--migrate-only` SQL çalıştırma bloğu `Data/MigrationRunner.cs` sınıfına çıkarılarak `Program.cs` temizlenmeli.

---

## 5. Uygulama Planı (Adım Adım Onay Listesi)

Kesintiye dayanıklı ilerlemek için aşağıdaki adımları sırasıyla uygulamayı öneriyorum:

- **Faz 1 — Acil Sözleşme (Contract), Yetki/Veri Filtresi (`is_active`) ve Ölü Kod Düzeltmeleri (Yüksek Öncelik / Sıfır Risk):**
  1. `CoachStudentDetail.jsx` ve `coachApi.js` içindeki `useUpdateCoachingTools` (`toolsData` / `data` + JSON serileştirme) ve `useReplyStudentQuestion` (`studentId`, `reply`) parametre uyuşmazlıklarını düzelt.
  2. `GrowSessionsPanel`'i gerçek `coaching_sessions` (`useCoachStudentSessions` / `useCreateCoachingSession`) verisine bağla ve `CoachStudentDetail.jsx` içindeki ulaşılamayan 55 satırlık eski `{activeTab === 'sessions'}` bloğunu kaldır.
  3. **(2. Tur Ek):** `TodayAgendaCard.jsx:58` içindeki `done: !isDone` alanını Backend `ToggleHabitRequest` ile uyumlu olacak şekilde `completed: !isDone` yap; `StudentPulsePanel.jsx:8-14` içindeki `MOOD_MAP` sözlüğüne `ENERGETIC` ve `NORMAL` anahtarlarını ekle.
  4. **(2. Tur Ek):** `student_group_members` sorgularında `is_active = 1` filtresi unutulan 5 dosyadaki 7 sorguyu (`ProgramAccessGuard.cs:131`, `CourseResourceRepository.cs:103`, `NotificationRepository.cs:69`, `HomeworkRepository.cs:63`, `CalendarRepository.cs:206, 223, 231`) düzelt.
  5. Frontend'deki kullanılmayan 8 ölü hook'u, `studentSchoolApi.js` içindeki mükerrer `useStudentSchedule` tanımını, `CoachStudents.jsx` içindeki ölü `AddStudentModal` çağrısını ve `TeacherCoursesPage.jsx` içindeki kullanılmayan `showCompleteModal` state'lerini temizle.
- **Faz 2 — Veritabanı Migration Birleştirme (`27 Dosya → Tek 001_schema.sql`):**
  1. `001`–`027` (`024` hariç) şemasını tek, temiz ve idempotent `001_schema.sql` dosyasında birleştir.
  2. `024_cleanup_and_seed_test_ecosystem.sql` dosyasını `Data/Migrations/` dışına (`docs/seeds/`) taşı.
  3. `--migrate-only` mantığını `MigrationRunner.cs` sınıfına çıkar ve tüm xUnit + PostgreSQL Testcontainers testleriyle (73 test) şema doğruluğunu kanıtla.
- **Faz 3 — Backend ve Frontend Modüler Bölme:**
  1. Backend'de `ClaimsPrincipalExtensions.GetUserId()` ekle ve 12 endpoint dosyasındaki mükerrer `GetUserId/GetCoachId` metotlarını kaldır.
  2. `StudentEndpoints.cs` (852 satır) dosyasını `StudentEndpoints.cs` (Koç) ve `StudentPortalEndpoints.cs` (Öğrenci) olarak ikiye ayır; `/coaching-tools` SQL'ini `StudentRepository`'ye taşı.
  3. `CoachStudentDetail.jsx` (1.394 satır) içindeki büyük sekmeleri (`ExamsTab`, `TopicsTab`, `HomeworkTab`, `NotesTab`) `student-detail/components/` altına ayrı bileşenler olarak çıkar ve sekme bazlı lazy query (`enabled`) uygula.

---

## 6. İlerleme Günlüğü (Kesintiye Dayanıklı Kayıt)

| Faz                                                  | Durum           | Commit / Not                                                                                     |
| ------------------------------------------------------| -----------------| --------------------------------------------------------------------------------------------------|
| **Denetim & Raporlama**                              | ✅ Tamamlandı    | 3 kritik sözleşme hatası + migration birleştirme + spagetti analizi rapora işlendi.              |
| **Faz 1 — Sözleşme Hataları & Ölü Kod Temizliği**    | ⏳ Onay Bekliyor | `CoachStudentDetail` (`updateCoachingTools`, `replyQuestion`, `GrowSessionsPanel`) + ölü kodlar. |
| **Faz 2 — Migration Birleştirme (`001_schema.sql`)** | ⏳ Onay Bekliyor | 26 şema dosyası `001_schema.sql` içinde birleştirilecek, `024` `docs/seeds/` altına taşınacak.   |
| **Faz 3 — Backend & Frontend Modüler Bölme**         | ⏳ Onay Bekliyor | `ClaimsPrincipalExtensions`, `StudentEndpoints` bölünmesi, `CoachStudentDetail` alt bileşenleri. |

---

## 7. DeepSeek - Cline Bağımsız Tarama — Ek Bulgular (Gemini raporuna ek)

> **İnceleyen:** DeepSeek - Cline · **Tarih:** 29 Ekim 2026 · Bağımsız ölçüm; Gemini'nin yukarıdaki maddelerine dokunulmadı, yalnızca eksik kalanlar eklendi.

### 7.1 🔴 Gemini'nin atladığı en kritik bulgu: Tekrarlanan "roster" SQL + eksik `is_active` filtresi

Aynı **"kurs öğrenci kümesi"** JOIN kalıbı (`student_group_members sgm ... AND sgm.is_active = 1`) kod tabanında **~10 kez** kopyalanmış:

| Dosya | Satırlar |
|---|---|
| `SchoolAccessRepository.cs` | 46, 149, 170, 190, 216 (5 kez) |
| `CourseRepository.cs` | 30, 243 |
| `TeacherRepository.cs` | 48, 250, 337 |

- (SİLİNECEK — `TeacherRepository.cs:48`'in hemen altındaki `50.` satırda `WHERE c.program_id = @ProgramId AND c.teacher_id IS NOT NULL AND c.is_active = 1 AND sgm.is_active = 1 AND s.is_active = 1` koşulu zaten mevcuttur; `337.` satır ise aktif ve pasif öğrencileri ayrı sekmelerde göstermek için `CASE WHEN sgm.is_active = 1 ...` kullanmaktadır: **Veri doğruluğu hatası:** `TeacherRepository.cs:48`'de `AND sgm.is_active = 1` filtresi **EKSİK** — gruptan çıkarılan (`is_active=0`) öğrenci bu sorguda hâlâ öğretmen listesine düşer.)
- **YENİ (Doğrulanmış Gerçek `is_active = 1` Eksikleri):** `TeacherRepository.cs`'de filtre tamdır; ancak 2. tur taramada `student_group_members` üzerinde `AND is_active = 1` filtresinin **gerçekten unutulduğu 5 dosya / 7 sorgu** (`ProgramAccessGuard.cs:131`, `CourseResourceRepository.cs:103`, `NotificationRepository.cs:69`, `HomeworkRepository.cs:63`, `CalendarRepository.cs:206, 223, 231`) tespit edilmiş ve aşağıdaki **Bölüm 8.1**'e eklenmiştir.
- **Öneri:** Tek `GetCourseStudentIdsAsync` (veya `CourseRosterResolver`) tüm çağrı noktalarının tek kaynağı olmalı; ham kopyalar silinmeli. (V16 B4 bunu hedefliyordu ama kopyalar duruyor.)

### 7.2 🟡 God-object ek kanıtlar (satır/hook sayısı)

| Dosya | Ölçüm | Sorun |
|---|---|---|
| `coachApi.js` | **41 React Query hook** | Gemini 8 ölü hook buldu; ama 41 hook'un tamamı tek dosyada (God-object) |
| `StudyTimerCard.jsx` | **413 satır** | Tek kart; zamanlayıcı state makinesi UI'dan ayrılmalı (`useStudyTimer`) |
| `StudentEndpoints.cs` | **49 endpoint** | God-endpoint |
| `001_schema.sql` | 35 CREATE + 68 ALTER + 14 DROP + 11 DO bloğu | V1–V6 squashed monolit |

### 7.3 Bağımsız satır sayısı ölçümü (Gemini değerleriyle farklı)

| Dosya | Gemini | DeepSeek | Not |
|---|---|---|---|
| `001_schema.sql` | 774 | **694** | fark |
| `StudentEndpoints.cs` | 852 | **730** | fark |
| `CoachStudentDetail.jsx` | 1394 | **1313** | fark |

(SİLİNECEK — Farkın sebebi netleşti; Gemini toplam dosya satırını (`Get-Content | Measure-Object -Line`), DeepSeek ise boş satırlar hariç satır sayısını ölçmüştür: Fark muhtemelen ölçüm zamanı/yönteminden (`Measure-Object -Line` vs diğer). Kesin sayı için tek ölçüm aracı kullanılmalı; ancak büyüklük sırası aynı.)
- **YENİ Açıklama:** İlk sütun IDE'deki **toplam satır numarasını** (boş satırlar dahil), ikinci sütun ise **boşluksuz kod satırını** göstermektedir.

### 7.4 Bağımsız en büyük dosyalar (tam liste)

**Frontend:** `CoachStudentDetail.jsx` 1313 · `CoachDashboard.jsx` 758 · `CoachStudents.jsx` 649 · `coachApi.js` 504 · `CoachTeacherDetailPage.jsx` 478 · `AdminPanelPage.jsx` 456 · `CoachLayout.jsx` 454 · `TeacherCoursesPage.jsx` 425 · `StudyTimerCard.jsx` 413.

**Backend:** `StudentEndpoints.cs` 730 · `StudentRepository.cs` 528 · `AuthEndpoints.cs` 462 · `CalendarRepository.cs` 441 · `SchoolAccessRepository.cs` 432 · `TeacherRepository.cs` 419 · `ProgramRepository.cs` 385 · `PaymentRepository.cs` 355 · `InviteEndpoints.cs` 342 · `ScheduleRepository.cs` 321 · `Program.cs` 312.

### 7.5 Mutabakat notu

- Gemini'nin tespit ettiği **3 sözleşme (contract) hatası** (coaching-tools, soru yanıtlama, GROW ölü sekme) değerli ve benim taramamda doğrudan hedef almadığım alanlardı → **onaylıyorum**.
- İki rapor birleştiğinde tam resim: (a) 3 aktif contract hatası, (b) ~10 kez tekrarlanan roster SQL + 1 eksik filtre, (c) 4 God-dosya (StudentEndpoints, coachApi, CoachStudentDetail, StudyTimerCard), (d) 27→1 migration birleştirme.

---

## 8. Gemini 2. Tur Derin Tarama — Doğrulama ve Yeni Kritik Bulgular

> **İnceleyen:** Gemini (2. Tur) · **Tarih:** 29 Ekim 2026 · Mevcut hiçbir madde silinmemiş, düzeltilmesi gereken kısımlar `(SİLİNECEK: ...)` olarak paranteze alınmış ve tüm kod tabanında yapılan 2. tur çapraz taramanın yeni bulguları aşağıya eklenmiştir.

### 8.1 🔴 Gerçekte `is_active = 1` Filtresi Eksik Olan 5 Dosya / 7 SQL Sorgusu (Yetki & Veri Sızıntısı)

DeepSeek'in işaret ettiği `TeacherRepository.cs:48` satırında `AND sgm.is_active = 1` filtresi 2 satır alttaki `WHERE` bloğunda (`satır 50`) zaten mevcuttur. Ancak bu ipucundan hareketle tüm Backend'deki `student_group_members` ve `course_students` sorguları tek tek tarandığında, **gruptan çıkarılan (`is_active = 0`) öğrencilerin hâlâ aktif sayıldığı 7 gerçek hata** yakalanmıştır:

| # | Dosya ve Satır | Metod | Sorun ve Etkisi |
|---|---|---|---|
| 1 | [`ProgramAccessGuard.cs:130-131`](file:///c:/YazilimCalisma/planlama_app/mentörüm/Backend/MentorumApi/Services/ProgramAccessGuard.cs#L123-L134) | `IsStudentInCourseAsync` | `course_students` kısmında `AND is_active = 1` var, ancak `UNION` altındaki `student_group_members sgm` sorgusunda **`AND sgm.is_active = 1` EKSİK**. Gruptan çıkarılan öğrenci ders yetki kontrolünden (`guard`) hâlâ geçebiliyor (**IDOR / Yetki Açığı**). |
| 2 | [`HomeworkRepository.cs:63`](file:///c:/YazilimCalisma/planlama_app/mentörüm/Backend/MentorumApi/Data/HomeworkRepository.cs#L62-L64) | `AssignHomeworkAsync` | Gruba ödev atanırken `SELECT student_id FROM student_group_members WHERE group_id = @GroupId` sorgusunda **`AND is_active = 1` EKSİK** (`ExamRepository.cs:41`'de var, burada unutulmuş). Gruptan ayrılan öğrencilere de yeni grup ödevleri atanmaya devam ediyor. |
| 3 | [`NotificationRepository.cs:66-69`](file:///c:/YazilimCalisma/planlama_app/mentörüm/Backend/MentorumApi/Data/NotificationRepository.cs#L66-L70) | `NotifyCourseStudentsAsync` | `course_students` için `AND cs.is_active = 1` var, fakat `student_group_members sgm` kısmında **`AND sgm.is_active = 1` EKSİK**. Gruptan çıkarılan öğrenciye ders bildirimleri gitmeye devam ediyor. |
| 4 | [`CourseResourceRepository.cs:102-103`](file:///c:/YazilimCalisma/planlama_app/mentörüm/Backend/MentorumApi/Data/CourseResourceRepository.cs#L100-L104) | `UpsertProgressAsync` | `student_group_members sgm` alt sorgusunda **`AND sgm.is_active = 1` EKSİK**. |
| 5–7 | [`CalendarRepository.cs:206, 223, 231`](file:///c:/YazilimCalisma/planlama_app/mentörüm/Backend/MentorumApi/Data/CalendarRepository.cs#L205-L232) | `GetUnifiedCalendarAsync` | Hem öğrenci (`satır 206`), hem koç (`satır 223`), hem veli (`satır 231`) takvim sorgularında `course_students` için `AND is_active = 1` yazılmış; hemen altındaki `student_group_members` alt sorgularının **üçünde de `AND is_active = 1` EKSİK**. Gruptan çıkarılan öğrencinin takviminde eski grup dersleri görünmeye devam ediyor. |

### 8.2 🚨 2 Yeni Sözleşme (Contract) Hatası Daha (Toplam 5 Aktif Contract Hatası)

Frontend'deki tüm `.mutate(` ve `.mutateAsync(` çağrıları Backend DTO'larıyla çapraz kontrol edildiğinde, Bölüm 1'deki 3 hataya ek olarak **öğrenci ve koç ekranlarında çalışan 2 kritik sözleşme hatası daha** tespit edilmiştir:

1. **Sözleşme Hatası #4 — Öğrenci Alışkanlık İşaretleme Çalışmıyor (`TodayAgendaCard.jsx` ↔ `StudentEndpoints.cs`):**
   - [`TodayAgendaCard.jsx:55-59`](file:///c:/YazilimCalisma/planlama_app/mentörüm/Frontend/src/features/student/home/components/TodayAgendaCard.jsx#L54-L60) içinde öğrenci alışkanlığa tıkladığında `toggleHabit.mutate({ habitId, date: todayStr, done: !isDone })` gönderilmektedir.
   - Oysa Backend [`StudentEndpoints.cs:782-813`](file:///c:/YazilimCalisma/planlama_app/mentörüm/Backend/MentorumApi/Endpoints/StudentEndpoints.cs#L782-L813) (`ToggleHabitRequest`) `bool Completed` (`completed: !isDone`) beklemektedir. `done` alanı JSON'da karşılıksız kaldığı için `req.Completed` her zaman `false` olmakta ve **öğrenci kendi ana sayfasından hiçbir alışkanlığı tamamlandı olarak işaretleyememektedir**.
2. **Sözleşme Hatası #5 — Duygu Durumu (Mood Check-in) Kodları Uyuşmuyor (`MoodCheckinCard.jsx` ↔ `StudentPulsePanel.jsx`):**
   - Öğrenci ana sayfasındaki [`MoodCheckinCard.jsx:6-11`](file:///c:/YazilimCalisma/planlama_app/mentörüm/Frontend/src/features/student/home/MoodCheckinCard.jsx#L6-L11) veritabanına `ENERGETIC` (*Çok Verimli*), `NORMAL` (*Normal*), `TIRED` (*Yorgun*), `STRESSED` (*Stresli*) kodlarını kaydetmektedir.
   - Koç ekranındaki [`StudentPulsePanel.jsx:8-14`](file:///c:/YazilimCalisma/planlama_app/mentörüm/Frontend/src/features/coach/student-detail/components/StudentPulsePanel.jsx#L8-L14) ise `GREAT`, `GOOD`, `TIRED`, `STRESSED`, `ANXIOUS` anahtarlarını beklemektedir. Öğrenci `"Çok Verimli"` veya `"Normal"` seçtiğinde koç ekranında Türkçe karşılığı bulunamadığı için ham İngilizce `"ENERGETIC"` ve `"NORMAL"` yazısı görünmektedir.

### 8.3 Birleştirilmiş Nihai Aksiyon Özeti (Onay Bekleyen Tam Liste)

- **Faz 1 (Acil Hatalar & Ölü Kod — Sıfır Regresyon Riski):**
  - **5 Sözleşme Hatasının Düzeltilmesi:**
    1. `CoachStudentDetail.jsx` ↔ `coachApi.js`: `useUpdateCoachingTools` (`toolsData` / JSON serileştirme).
    2. `CoachStudentDetail.jsx` ↔ `coachApi.js`: `useReplyStudentQuestion` (`studentId`, `reply`).
    3. `CoachStudentDetail.jsx` ↔ `GrowSessionsPanel.jsx`: GROW seanslarının gerçek `coaching_sessions` tablosuna bağlanması ve 55 satırlık ölü `sessions` sekmesinin silinmesi.
    4. `TodayAgendaCard.jsx:58`: `done: !isDone` → `completed: !isDone` düzeltmesi.
    5. `StudentPulsePanel.jsx:8-14`: `MOOD_MAP` içine `ENERGETIC` ve `NORMAL` eklenmesi.
  - **5 Dosya / 7 SQL Sorgusunda Eksik `is_active = 1` Filtresinin Eklenmesi:**
    - `ProgramAccessGuard.cs:131`, `HomeworkRepository.cs:63`, `NotificationRepository.cs:69`, `CourseResourceRepository.cs:103`, `CalendarRepository.cs:206, 223, 231`.
  - **Ölü Kod Temizliği:**
    - 8 kullanılmayan React Query hook'u, mükerrer `useStudentSchedule`, ölü `AddStudentModal` ve `showCompleteModal` state'lerinin kaldırılması.
- **Faz 2 (Veritabanı Migration Birleştirme — `27 Dosya → Tek 001_schema.sql`):**
  - `001`–`027` (`024` yıkıcı seed hariç) dosyalarının tek idempotent `001_schema.sql` içinde birleştirilmesi, `024`'ün `docs/seeds/` altına taşınması ve `MigrationRunner.cs` ayrıştırması.
- **Faz 3 (God-Object ve Tekrarlanan Kod Sadeleştirmesi):**
  - `ClaimsPrincipalExtensions.GetUserId()` ile 12 endpoint dosyasındaki tekrarın silinmesi, `CourseRoster` SQL tekrarlarının tek metoda toplanması, `StudentEndpoints.cs` ve `CoachStudentDetail.jsx` dosyalarının modüler parçalara bölünmesi.



---

## 9. DeepSeek - Cline — Detaylı Kantitatif Spagetti Analizi (Bağımsız Ölçüm)

> Tüm sayılar bu turda bağımsız ölçülmüştür (`Measure-Object -Line`). Silme/yeniden yazma değil, tespit + fikir.

### 9.1 Toplam ölçek

| Katman | Dosya | Satır |
|---|---|---|
| Backend (`.cs`) | 93 | 12.572 |
| Frontend (`.jsx/.js/.css`) | 175 | 28.969 |
| Migration (`.sql`) | 27 | 1.382 |

> Frontend satır sayısı backend'in ~2.3 katı; asıl şişkinlik frontend'de.

### 9.2 Mimari dağılım (backend, 93 dosya)

| Tip | Adet | Not |
|---|---|---|
| Repository | 28 | Katman geniş ama bazıları 400+ satır (God-repo) |
| Endpoint | 22 | 8 tanesi içinde ham SQL barındırıyor |
| Service/Helper/Guard | 11 | `GetUserId` burada merkezileşmeli ama değil |
| DTO | 23 | Bazıları şişmiş (`StudentDtos.cs` 190 satır) |

### 9.3 God-dosyalar (ilk 10, satır)

**Frontend:**
| Satır | Dosya |
|---|---|
| 1313 | `CoachStudentDetail.jsx` |
| 758 | `CoachDashboard.jsx` |
| 649 | `CoachStudents.jsx` |
| 504 | `coachApi.js` (41 hook) |
| 478 | `CoachTeacherDetailPage.jsx` |
| 456 | `AdminPanelPage.jsx` |
| 454 | `CoachLayout.jsx` |
| 425 | `TeacherCoursesPage.jsx` |
| 413 | `StudyTimerCard.jsx` |
| 379 | `CoachPaymentsPage.jsx` |

**Backend:**
| Satır | Dosya |
|---|---|
| 730 | `StudentEndpoints.cs` (49 endpoint) |
| 528 | `StudentRepository.cs` |
| 462 | `AuthEndpoints.cs` |
| 441 | `CalendarRepository.cs` |
| 432 | `SchoolAccessRepository.cs` |
| 419 | `TeacherRepository.cs` |
| 385 | `ProgramRepository.cs` |
| 355 | `PaymentRepository.cs` |
| 342 | `InviteEndpoints.cs` |
| 321 | `ScheduleRepository.cs` |

### 9.4 Katman ihlali: Endpoint dosyalarında ham SQL (Separation of Concerns)

Aşağıdaki endpoint dosyaları, Repository katmanını atlayıp **doğrudan Dapper/raw SQL** çalıştırıyor:

| Dosya | Raw SQL sayısı | Dapper çağrısı |
|---|---|---|
| `AuthEndpoints.cs` | 36 | 46 |
| `InviteEndpoints.cs` | 29 | 28 |
| `StudentEndpoints.cs` | 15 | 15 |
| `ParentEndpoints.cs` | 11 | 13 |
| `HomeworkEndpoints.cs` | 10 | 20 |
| `ProgramEndpoints.cs` | 4 | 4 |
| `ScheduleEndpoints.cs` | 1 | 1 |
| `QuestionCollectionEndpoints.cs` | 1 | 2 |

- **En kötü:** `AuthEndpoints.cs` (36 SQL + 46 Dapper) — login/register/refresh/google akışı endpoint'te yazılmış, `AuthRepository` yok.
- **Fikir:** `AuthRepository` ve `InviteRepository` çıkar; endpoint'ler yalnızca HTTP + guard + repo çağrısı olmalı.



### 9.5 DRY ihlalleri (tekrar eden kod)

| Kalıp | Adet | Yer |
|---|---|---|
| `static Guid? GetUserId(ClaimsPrincipal)` | **11 kopya** | 12 endpoint dosyasında |
| Roster SQL (`student_group_members sgm ... is_active = 1`) | **~10 kopya** | SchoolAccess(5), Course(2), Teacher(3) |
| React Query sihirli string key (`queryKey: ['...']` / `invalidateQueries`) | **196 satır** | tüm frontend |
| Türkçe hata mesajı (`bulunamadı`, `yetkiniz yok`, `geçersiz`) | çok sayıda | backend+frontend |
| `ClaimTypes.NameIdentifier` | ~74 yerde | endpoint'ler |
| `Guid.TryParse` | ~33 yerde | endpoint'ler |

- **En kritik veri doğruluğu hatası:** `TeacherRepository.cs:48`'de roster JOIN'inde `AND sgm.is_active = 1` **eksik** (diğer 9 kopyada var). Gruptan çıkan öğrenci öğretmen listesinde yanlış görünür.

### 9.6 Dev bileşen: `CoachStudentDetail.jsx`

- **1313 satır**, **23 `useState`**, **20 hook çağrısı** (`useCoach*`/`useStudent*`).
- V16 8 bileşen çıkardı ama state/hook/orchestration ana dosyada kaldı → dosya 1286→1313 **büyüdü**.
- **Fikir:** Sekme bazlı alt bileşenler (`ExamsTab`, `TopicsTab`, `HomeworkTab`, `NotesTab`, `ParentsTab`) + her sekme kendi hook'larını ve state'ini yönetmeli; ana dosya yalnızca sekme seçici + ortak ID'yi geçirmeli. Ayrıca sekme bazlı `enabled` (lazy) sorgu.

### 9.7 Dev API dosyası: `coachApi.js`

- **504 satır, 41 hook** tek dosyada.
- **Fikir:** `coachStudentApi.js`, `coachHomeworkApi.js`, `coachExamApi.js`, `coachCoachingToolsApi.js`, `coachQuestionApi.js`, `coachSessionApi.js` olarak böl.

### 9.8 Migration karmaşası (özet)

- 27 dosya; `001_schema.sql` (694 satır) = V1–V6 squashed monolit (35 CREATE, 68 ALTER, 14 DROP, 11 DO).
- `024_...seed_ecosystem.sql` (250 satır) aslında **seed**, şema değil → `docs/seeds/`'e taşınmalı.
- 20'den fazla dosya 1–15 satırlık kırıntı.
- **Fikir:** Yeni kurulumlar için tek idempotent `001_schema.sql` + ayrı seed; mevcut DB'ler için `_schema_migrations` dosya adı uyumu korunmalı (eski dosyalar silinmemeli, yalnızca yeni birleşik dosya eklenmeli).

### 9.9 Somut kod kokuları (örnekler)

1. `TeacherRepository.cs:48` — eksik `is_active=1` (veri doğruluğu).
2. `NetCalculator.cs` — `ResolveDivisor` içinde `"Okul"`, `"Diğer"`, `"LGS"` sihirli string karşılaştırmaları (enum/const olmalı).
3. `AuthEndpoints.cs` — 36 ham SQL (Repository yok).
4. `StudyTimerCard.jsx` (413) — zamanlayıcı state makinesi UI'da.
5. `CoachStudentDetail.jsx` — 23 `useState` tek bileşende.

### 9.10 Önceliklendirme (fikir — kod değişikliği yok)

| Öncelik | Aksiyon fikri |
|---|---|
| 🔴 1 | `TeacherRepository.cs:48` eksik filtre düzelt + roster SQL'i tek `GetCourseStudentIdsAsync`'e bağla |
| 🔴 2 | `AuthRepository` / `InviteRepository` çıkar; endpoint'teki 36+29 ham SQL'i taşı |
| 🟡 3 | `ClaimsPrincipalExtensions.GetUserId()` (11 kopya → 1) |
| 🟡 4 | `StudentEndpoints.cs` (49 uç) böl; `coachApi.js` (41 hook) böl |
| 🟡 5 | `CoachStudentDetail.jsx` → sekme bileşenleri + lazy query |
| 🟢 6 | Migration birleştirme (yeni kurulumlar için) + `024` seed taşı |

---

## 10. Gemini — Bölüm 9 Değerlendirmesi ve `TASK_LIST_V17` İçin Mimari Sentez & Öneriler

> **İnceleyen:** Gemini (3. Tur Sentez) · **Tarih:** 30 Ekim 2026 · DeepSeek'in Bölüm 9'daki kantitatif analizine hiçbir silme yapılmadan, `TASK_LIST_V17.md` hazırlanırken doğrudan girdi olarak kullanılacak mimari fikirler ve teknik netleştirmeler eklenmiştir.

### 10.1 DeepSeek Bölüm 9 Bulgularına Katkı ve Doğrulama

1. **Bölüm 9.4 (Endpoint İçinde Ham SQL — `AuthEndpoints` 36, `InviteEndpoints` 29, `StudentEndpoints` 15, `ParentEndpoints` 11, `HomeworkEndpoints` 10):**
   - **Tam Mutabakat:** Bu tespit rapordaki en değerli mimari bulgulardan biridir. Özellikle `AuthEndpoints.cs` ve `InviteEndpoints.cs` için `AuthRepository.cs` ve `InviteRepository.cs` sınıflarının oluşturulması; `StudentEndpoints.cs` içinde 4 kez tekrarlanan `SELECT program_id FROM students WHERE id = @Id` (satır 633, 661, 699, 741) ile `/coaching-tools` sorgularının `StudentRepository`'ye taşınması `TASK_LIST_V17` içinde mutlaka yer almalıdır.
2. **Bölüm 9.5 & 9.9 (React Query `queryKey` Sihirli Stringleri — 196 Satır & `StudyTimerCard.jsx` — 413 Satır):**
   - **Tam Mutabakat:**
     - Frontend'de `src/api/queryKeys.js` (merkezi Query Key fabrikası) oluşturularak `['coach', 'questions', id]` gibi dağınık anahtarların tek merkezden yönetilmesi önbellek (cache invalidation) hatalarını kalıcı olarak önler.
     - `StudyTimerCard.jsx` (413 satır) içindeki kronometre/Pomodoro/sekme-senkronizasyon (`localStorage` + `visibilitychange`) mantığının `useStudyTimer.js` custom hook'una ayrılması bileşeni ~180 satıra düşürür.
     - `NetCalculator.cs` içindeki `"Okul"`, `"Diğer"`, `"LGS"` sihirli string'lerinin sabitlere (`ExamTrackConstants`) alınması temiz ve sıfır riskli bir iyileştirmedir.

### 10.2 `TASK_LIST_V17` Hazırlanırken Dikkat Edilmesi Gereken 4 Kritik Teknik Netleştirme

DeepSeek `TASK_LIST_V17.md` dosyasını yazarken aşağıdaki **4 teknik gerçeği** doğrudan görev tanımına dahil etmelidir:

1. **🔴 Aktif 5 Sözleşme (Contract) Hatası İlk Görev (P0) Olmalıdır:**
   - Bölüm 1 ve Bölüm 8.2'de kanıtlanan **5 aktif çalışma zamanı hatası** (`useUpdateCoachingTools` parametre/JSON uyuşmazlığı, `useReplyStudentQuestion` eksik `studentId`/`reply` alanı, `GrowSessionsPanel` ölü sekme ve `coaching_sessions` kopukluğu, `TodayAgendaCard.jsx:58` `done` vs `completed` uyuşmazlığı, `StudentPulsePanel.jsx:8-14` `ENERGETIC`/`NORMAL` eksikliği) şu an canlıda özelliklerin çalışmasını engellemektedir. `TASK_LIST_V17`'nin **Dalga 1 (P0)** adımı bu 5 hatanın düzeltilmesi olmalıdır.
2. **🔴 Eksik `is_active = 1` Filtreleri ve Roster SQL Birleştirme (PostgreSQL View veya Ortak Alt Sorgu Fikri):**
   - `TeacherRepository.cs:48` satırının 2 satır altında (`satır 50`) `AND sgm.is_active = 1` zaten vardır; **ancak** Bölüm 8.1'de belgelediğimiz **5 dosya / 7 sorguda** (`ProgramAccessGuard.cs:131`, `HomeworkRepository.cs:63`, `NotificationRepository.cs:69`, `CourseResourceRepository.cs:103`, `CalendarRepository.cs:206, 223, 231`) `AND sgm.is_active = 1` gerçekten eksiktir.
   - **Mimari Sadelik Fikri:** C# tarafında `SchoolAccessRepository.GetCourseStudentIdsAsync` tek kaynak yapılırken, SQL içinde `JOIN` / `EXISTS` ile kullanılan ~10 tekrarı da yok etmek için şemaya **`vw_active_course_students` (SQL View)** (`SELECT course_id, student_id FROM course_students WHERE is_active = 1 UNION SELECT cg.course_id, sgm.student_id FROM course_groups cg JOIN student_group_members sgm ON sgm.group_id = cg.group_id WHERE sgm.is_active = 1`) eklenebilir. Böylece 10 ayrı yerdeki karmaşık `UNION` alt sorgusu tek satırlık ` vw_active_course_students` sorgusuna iner ve bir daha hiçbir yerde `is_active = 1` unutulamaz!
3. **🟢 Migration Birleştirme (`27 Dosya → Tek 001_schema.sql`) — Eski Dosyaları Tutmak Gerekmez:**
   - Bölüm 9.8 satır 329'da *"eski dosyalar silinmemeli, yalnızca yeni birleşik dosya eklenmeli"* notu düşülmüştür; ancak `Program.cs` (satır 156–164) `_schema_migrations` tablosundaki satırlar üzerinde değil, **diskteki `Data/Migrations/*.sql` dosyaları üzerinde** döngü kurmaktadır (`Directory.GetFiles` → `if (applied.Contains(name)) continue;`).
   - Dolayısıyla canlı veritabanında `'001_schema.sql'` zaten `_schema_migrations` tablosunda kayıtlı olduğu için, `001`–`027` (`024` hariç) tek `001_schema.sql` içinde birleştirilip **`002`–`027` dosyaları diskten silindiğinde** canlı veritabanı `001_schema.sql` dosyasını `"Atlandı"` olarak geçer ve **hiçbir hata üretmez**. Yeni kurulumlar ve Testcontainers testleri ise doğrudan tek `001_schema.sql` ile kalkar (`024` ise `docs/seeds/dev_seed_ecosystem.sql` altına taşınır). Eğer `vw_active_course_students` gibi yeni bir V17 nesnesi eklenecekse o da `002_v17_views.sql` olarak veya idempotent başlangıç kontrolüyle eklenebilir.
4. **🟡 `coachApi.js` (41 Hook) Bölünürken "Barrel Export" ile Sıfır Kırılma Fikri:**
   - `coachApi.js` dosyası `coachStudentApi.js`, `coachHomeworkApi.js`, `coachExamApi.js`, `coachCoachingToolsApi.js`, `coachQuestionApi.js`, `coachSessionApi.js` olarak bölünürken, `coachApi.js` dosyası `export * from './api/...'` şeklinde **barrel re-export** olarak bırakılırsa 25+ bileşendeki mevcut import'ların hiçbiri kırılmaz; aynı anda 8 ölü hook silinir ve `studentApi.js` ile çakışan 6 hook ismi temizlenir.

---

### 10.3 `TASK_LIST_V17.md` İçin Önerilen 4 Dalgalı (Wave) Şablon

DeepSeek'in hazırlayacağı `TASK_LIST_V17.md` için önerilen uygulama sırası:

- **Dalga 1 — Acil Veri Doğruluğu, Yetki (`is_active`) ve Sözleşme (Contract) Düzeltmeleri (P0):**
  - `V17-B1`: 5 dosya / 7 SQL sorgusundaki eksik `sgm.is_active = 1` filtrelerinin tamamlanması (`ProgramAccessGuard`, `HomeworkRepository`, `NotificationRepository`, `CourseResourceRepository`, `CalendarRepository`) + merkezi `vw_active_course_students` / `GetCourseStudentIdsAsync` yapısı.
  - `V17-F1`: 5 aktif Frontend↔Backend sözleşme hatasının düzeltilmesi (`useUpdateCoachingTools`, `useReplyStudentQuestion`, `GrowSessionsPanel` → `coaching_sessions`, `TodayAgendaCard` `completed`, `StudentPulsePanel` `MOOD_MAP`) ve 55 satırlık ölü `sessions` sekmesinin silinmesi.
- **Dalga 2 — Veritabanı Migration Konsolidasyonu & Runner Ayrıştırması (P1):**
  - `V17-B2`: `001`–`027` (`024` hariç) migration dosyalarının tek, temiz, `coach_id` geçmişinden arındırılmış idempotent `001_schema.sql` dosyasında birleştirilmesi; `024_cleanup_and_seed_test_ecosystem.sql` dosyasının `docs/seeds/dev_seed_ecosystem.sql` altına taşınması.
  - `V17-B3`: `Program.cs` içindeki migration döngüsünün `Data/MigrationRunner.cs` sınıfına çıkarılması.
- **Dalga 3 — Backend Spagetti Temizliği & Katman İzolasyonu (P1):**
  - `V17-B4`: `ClaimsPrincipalExtensions.GetUserId()` oluşturulması ve 12 endpoint dosyasındaki mükerrer `GetUserId/GetCoachId` yardımcılarının temizlenmesi; `NetCalculator.cs` sabitlerinin düzenlenmesi.
  - `V17-B5`: `StudentEndpoints.cs` (49 endpoint) dosyasının `StudentEndpoints.cs` (Koç) ve `StudentSelfEndpoints.cs` (Öğrenci) olarak ikiye bölünmesi; endpoint içindeki 15 ham SQL'in `StudentRepository`'ye taşınması.
  - `V17-B6`: `AuthEndpoints.cs` (36 SQL) ve `InviteEndpoints.cs` (29 SQL) içindeki ham Dapper sorgularının `AuthRepository.cs` ve `InviteRepository.cs` sınıflarına taşınması.
- **Dalga 4 — Frontend God-Object Bölünmesi & Ölü Kod Temizliği (P2):**
  - `V17-F2`: 8 ölü hook'un, `studentSchoolApi.js` içindeki kopya `useStudentSchedule` hook'unun, `CoachStudents.jsx` içindeki ölü `AddStudentModal` state'inin ve `TeacherCoursesPage.jsx` içindeki ölü `showCompleteModal` state'lerinin silinmesi.
  - `V17-F3`: `coachApi.js` (41 hook) dosyasının alt modüllere bölünmesi (barrel export korunarak) ve `studentApi.js` ile çakışan 6 hook isminin netleştirilmesi.
  - `V17-F4`: `CoachStudentDetail.jsx` (1.394 satır) içindeki sekmelerin (`ExamsTab`, `TopicsTab`, `HomeworkTab`, `NotesTab`) kendi hook/state'leriyle ayrı bileşenlere çıkarılması ve sekme bazlı lazy query (`enabled`) uygulanması; `StudyTimerCard.jsx` içinden `useStudyTimer.js` hook'unun ayrıştırılması.

