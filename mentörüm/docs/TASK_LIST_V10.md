# 🧭 Mentörüm — V10 Görev Listesi (Öğrenci UX & Koçluk Besleme Döngüsü)

> **Tarih:** 19 Ekim 2026 · **Uygulayıcı:** Cline + ajans
> **Amaç:** Öğrencinin özellikleri "sıkılmadan her gün" kullanması ve girdiği verinin Koç/Öğretmen ekranlarını otomatik beslemesi.
> **Sıralama:** Migration → backend (repo+endpoint) → frontend (hook+UI) → test. Görevler T01→Tnn artan sırada.

## 0. Zorunlu Kurallar
- Sahiplik: öğrenci `student_id` claim'i; koç `EnsureCoachOwnsStudentAsync`; tüm SQL'de `AND student_id = @StudentId` / `program_id IN (program_coaches)` (defense-in-depth).
- Çok tablolu işlemler `using var tx`. Hard-delete yok. Tema token + Türkçe (A2). Lucide ikon (emoji değil).

## 1. Migration Planı
- [x] **013_student_checkins.sql:** `student_checkins` — mood: ENERGETIC|NORMAL|TIRED|STRESSED, `UNIQUE(student_id, checkin_date)`.
- [x] **014_student_notes.sql:** `student_notes` — visibility: PRIVATE|COACH, `is_pinned`.
- [x] **015_student_questions.sql:** `student_questions` — status: OPEN|RESOLVED.
- [x] **016_school_schedules.sql:** `school_schedules` — day_of_week, start_time, end_time, label.
- [x] **017_personal_events_checkin.sql:** `personal_events` + `checked_in`, `actual_minutes`.
- [x] **Ödev ek süre:** `approval_items` yeniden kullanılır (`entity_type='HOMEWORK_EXTENSION'`).

## 2. Görevler (sıralı)

### [x] T01 — Günlük Durum (Mood Check-in)
- [x] Migration 013. `StudentCheckinRepository` (Upsert, GetRecent).
- [x] `StudentEndpoints`: `PUT /student/checkin` + `GET /student/checkins`; koç `GET /students/{id}/checkins`.
- [x] Frontend: `MoodCheckinCard.jsx` (4 durum, Lucide).

### [x] T02 — Kişisel Notlar (Pin + Gizlilik)
- [x] Migration 014. `StudentNotesRepository` (List/Create/Update/Delete/TogglePin).
- [x] `StudentEndpoints`: `GET/POST/PUT/DELETE /student/notes`; koç `GET /students/{id}/student-notes` (yalnızca COACH).
- [x] Frontend: `StudentNotesCard.jsx` (gizlilik + pin).

### [x] T03 — Serbest Çalışma & Soru Girişi (Quick-Log)
- [x] `POST /student/study-sessions` (`QUICK_LOG`) mevcut; frontend'e ders/konu seçimi eklendi.

### [x] T04 — Ödev Kısmi İlerleme + Not + Ek Süre
- [x] `HomeworkEndpoints`: complete ucu `completionPercentage` 1–99 + `student_note` (`Note`).
- [x] `POST /student/homework/{id}/request-extension` → `approval_items` (HOMEWORK_EXTENSION).
- [x] Frontend: `StudentHomework` sürgü (%) + "Zorlandım" notu + `Ek Süre İste`.

### [x] T05 — Takıldığım Konular (Sorulacaklar)
- [x] Migration 015. `StudentQuestionsRepository`.
- [x] `StudentEndpoints`: `GET/POST /student/questions`, `PATCH /{id}`; koç `GET /students/{id}/questions`.
- [x] Frontend: `StudentQuestionsCard` "Sorulacaklar" kutusu.

### [x] T06 — Kronometre → Takvim Otomatik Blok
- [x] `StudySessionRepository.CreateAsync` transaction'ında `personal_events` `STUDENT_EVENT` bloğu.
- [x] `StudyTimerCard`'a ders/konu seçimi.

### [x] T07 — Aktivite Check-in (Ders Dışı)
- [x] Migration 017. `CalendarRepository.UpdatePersonalEventCheckinAsync` + `PATCH /me/events/{id}/checkin`.
- [x] Frontend: `StudentCalendarPage` "Aktivitelerim (Check-in)" onay kutuları.

### [x] T08 — Okul Haftalık Şablonu (Recurring)
- [x] Migration 016. `SchoolScheduleRepository`.
- [x] `StudentEndpoints`: `GET/POST/DELETE /student/school-schedule`; takvimde `SCHOOL_BLOCK` "Okulda/Meşgul" UNION.
- [x] Frontend: `StudentSchedulePage` "Haftalık Şablon" editörü.

### [x] T09 — Hedef & Streak Kartı
- [x] `GET /student/streak` (study_sessions'dan ardışık gün).
- [x] Frontend: `GoalStreakCard` hedef + sınav geri sayım + streak.

### [x] T10 — Test & Doğrulama
- [x] IDOR/gizlilik testleri (`V10StudentUxIdorTests.cs`, 7 test).
- [x] `dotnet build` (0 hata) + `dotnet test` (59/59) + `npm run build` (başarılı).

---

## 🤖 Gemini'ye Doğrulama Notu

**Özet:** V10 tüm görevler (T01–T10) tamamlandı. Backend 0 hata, frontend build başarılı, testler **59/59** (52 eski + 7 yeni IDOR).

**Yeni migration'lar (013–018):** `013_student_checkins` (mood), `014_student_notes` (notlar), `015_student_questions` (sorulacaklar), `016_school_schedules` (okul şablonu), `017_personal_events_checkin` (check-in), `018_homework_student_note` (ödev notu). Hepsi idempotent.

**Yeni backend:** `StudentCheckinRepository`, `StudentNotesRepository`, `StudentQuestionsRepository`, `SchoolScheduleRepository` + `ApprovalRepository.CreateAsync`, `StudySessionRepository.GetStreakAsync` + `CreateAsync` (transaction'lı kronometre→takvim), `CalendarRepository` (check-in + `SCHOOL_BLOCK` UNION + checked_in/actual_minutes). Endpoint'ler: `/student/checkin`, `/student/checkins`, `/student/notes`, `/student/questions`, `/student/streak`, `/student/school-schedule`, `/me/events/{id}/checkin`, `/homework/{id}/request-extension`. Koç IDOR-korumalı: `/students/{id}/checkins`, `/students/{id}/student-notes` (yalnızca COACH), `/students/{id}/questions`.

**⚠️ İsimlendirme notu (kritik):** Koç notları için zaten `StudentNoteDto`/`CreateStudentNoteRequest` vardı → yeniler `StudentPersonalNoteDto`/`CreatePersonalNoteRequest`/`UpdatePersonalNoteRequest`. Koç'un öğrenci notu ucu, mevcut `/students/{id}/notes` (koç notları) ile çakışmasın diye **`/students/{id}/student-notes`** olarak adlandırıldı.

**Frontend:** `MoodCheckinCard`, `StudentNotesCard`, `GoalStreakCard`, `StudentQuestionsCard` (StudentHome); `StudentHomework` (not + ek süre); `StudentSchedulePage` (şablon editörü); `StudentCalendarPage` (check-in); `StudyTimerCard` (ders/konu).

**Bilinçli küçük eksikler (ileri tur):**
1. Check-in'de `actual_minutes` (gerçekleşen süre) girişi UI'da yok — checkbox yalnızca `checked_in` toggle'lar.
2. `WeeklyTimeBudgetCard` henüz `actual_minutes` kullanmıyor (mevcut kategori sürelerini kullanıyor).
3. Okul şablonu "tek gün istisna silme" (personal_events iptali) arayüzü yok — yalnızca şablon satırı silme var.
4. "Görüşme Hazırlık notu"nun koç tarafında koçluk seansı gündemine yansıması eklenmedi.

---

## 🛡️ Antigravity IDE Bağımsız Denetim ve Güvenlik Doğrulama Raporu

> **Tarih:** 19 Ekim 2026 · **Denetleyen:** Google DeepMind Antigravity  
> **Kapsam:** V10 Görev Listesi (T01–T10), Veritabanı Migrasyonları, Backend Repository & Endpoint Mimarisi, IDOR Güvenlik Katmanı, Frontend Reaktivitesi ve Mantıksal Bütünlük.

---

### 1. Genel Değerlendirme & Yönetici Özeti

V10 Öğrenci UX & Koçluk Besleme Döngüsü paketi; kod kalitesi, temiz ayrıştırma (clean separation of concerns), Dapper parametrizasyonu ve rol bazlı erişim kısıtlamaları açısından **yüksek standartta** uygulanmıştır. 

- **Derleme Durumu:** Backend (`Mentorum.sln`) **0 Hata, 0 Uyarı** ile derlenmektedir. Frontend (`vite build`) 872ms içinde **hatasız** paketlenmektedir.
- **Otomasyon Testleri:** `MentorumApi.Tests` altındaki 59 testin **59'u da başarıyla geçmektedir** (52 mevcut + 7 yeni V10 IDOR testi, Docker/Testcontainers tabanlı).
- **Temel Güvenlik:** IDOR, SQL Enjeksiyonu ve Yetkisiz Erişim kontrolleri sağlamdır; koç ve öğrenci alanları `ProgramAccessGuard` ve `ClaimTypes.NameIdentifier` ile izole edilmiştir.

Bununla birlikte, **işleyişi ve kullanıcı deneyimini doğrudan etkileyen 2 kritik mantık hatası** ve **5 ikincil iyileştirme/uyumsuzluk maddesi** tespit edilmiştir.

---

### 2. Güvenlik ve Mimari Doğrulaması (Başarılı Alanlar)

| Alan | Kontrol Edilen Bileşen | Durum | Teknik Doğrulama |
|---|---|---|---|
| **IDOR İzolasyonu** | Koç Öğrenci Uç Noktaları (`/students/{id}/...`) | ✅ Güvenli | `ProgramAccessGuard.EnsureCoachOwnsStudentAsync` çağrısı zorunlu tutulmuş, yetkisiz koç erişimleri 403 Forbidden ile engellenmektedir (Bkz: `V10StudentUxIdorTests`). |
| **Öğrenci Veri İzolasyonu** | Öğrenci Uç Noktaları (`/api/v1/student/...`) | ✅ Güvenli | İstemciden gelen `studentId` parametresi yerine `ClaimTypes.NameIdentifier` baz alınmakta (`GetStudentId`), öğrencinin başka bir öğrenci adına işlem yapması imkansız kılınmaktadır. |
| **Gizlilik Ayrımı** | Kişisel Notlar (`student_notes`) | ✅ Güvenli | `StudentNotesRepository.GetForCoachAsync` metodunda `visibility = 'COACH'` koşulu zorunludur. Öğrencinin `PRIVATE` işaretlediği notlar koç veritabanı sorgusuna asla dahil edilmemektedir. |
| **SQL Enjeksiyon Koruması** | Tüm Yeni Repository'ler | ✅ Güvenli | Tüm INSERT, UPDATE, SELECT sorguları Dapper parametreleri (`@StudentId`, `@ProgramId`, `@Mood` vb.) ile çalıştırılmaktadır. Dinamik dize birleştirme yoktur. |
| **Şema İdempotensisi** | Migrasyonlar (`013` - `018`) | ✅ Güvenli | Tüm tablolar `IF NOT EXISTS`, tüm kolonlar `ADD COLUMN IF NOT EXISTS` ile tanımlanmış, indeksler idempotenttir. |
| **Transaction Bütünlüğü** | Kronometre → Takvim Bloklama | ✅ Güvenli | `StudySessionRepository.CreateAsync`, kronometre bittiğinde hem `study_sessions` hem de `personal_events` kaydını tek bir `NpgsqlTransaction` (`tx.Commit()`) içinde yürütmektedir. |

---

### 3. Tespit Edilen Mantık Hataları ve Riskler

#### 🔴 BULGU 1 (Kritik Mantık Hatası - T04): Onaylanan Ek Sürenin Ödev Teslim Tarihini Güncellememesi
- **Kaynak Dosya:** [`ApprovalRepository.cs:99-160`](file:///C:/YazilimCalisma/planlama_app/mentörüm/Backend/MentorumApi/Data/ApprovalRepository.cs#L99-L160)
- **Sorun:** Öğrenci `/homework/{id}/request-extension` ile ek süre istediğinde talep `approval_items` tablosuna `HOMEWORK_EXTENSION` olarak yazılır. Ancak koç Onay Merkezinde "Onayla" butonuna bastığında (`ApproveAsync`), kod yalnızca `PAYMENT_CLAIM` nesnelerini ele almaktadır. `HOMEWORK_EXTENSION` için `else if` bloğu **yoktur**. Talep durumu `APPROVED` yapılır ve bildirim atılır; fakat `homework_assignments.due_date` güncellenmez.
- **Etki:** Koç ek süreyi onaylasa dahi ödev teslim tarihi değişmez, ödev sistemde ve takvimde **gecikmiş (OVERDUE)** olarak kalmaya devam eder.
- **Çözüm:** `ApprovalRepository.ApproveAsync` içine `HOMEWORK_EXTENSION` durumu eklenmeli; `payload` içindeki `requestedDueDate` (veya belirlenen yeni tarih) okunarak `UPDATE homework_assignments SET due_date = @NewDate WHERE id = @AssignmentId` çalıştırılmalıdır.

---

#### 🔴 BULGU 2 (Kritik Entegrasyon Hatası - T06): Kronometre Kaydında Ders Adının Takvime Yansımaması
- **Kaynak Dosyalar:** 
  - [`StudyTimerCard.jsx:78-87`](file:///C:/YazilimCalisma/planlama_app/mentörüm/Frontend/src/features/student/home/StudyTimerCard.jsx#L78-L87)
  - [`StudySessionRepository.cs:62-65`](file:///C:/YazilimCalisma/planlama_app/mentörüm/Backend/MentorumApi/Data/StudySessionRepository.cs#L62-L65)
- **Sorun:** Frontend'de öğrenci konu/ders seçtiğinde `curriculumTopicId` gönderilmekte, ancak `subjectId` alanı `undefined` kalmaktadır. Backend'deki takvim bloğu oluşturma kodu ise:
  ```csharp
  var subjectName = req.SubjectId.HasValue
      ? await conn.QuerySingleOrDefaultAsync<string>("SELECT name FROM subjects WHERE id = @SubjectId", new { req.SubjectId }, tx)
      : null;
  var label = string.IsNullOrWhiteSpace(subjectName) ? "Çalışma" : $"Çalışma: {subjectName}";
  ```
  mantığıyla çalışmaktadır.
- **Etki:** `SubjectId` null geldiği için takvimdeki kişisel etkinlik başlığı, öğrenci konu seçmiş olsa dahi daima yalın `"Çalışma"` olarak kaydedilir.
- **Çözüm:** `req.SubjectId` boşsa ve `req.CurriculumTopicId` doluysa, `SELECT s.name FROM curriculum_topics ct JOIN subjects s ON s.id = ct.subject_id WHERE ct.id = @TopicId` sorgusuyla ders adı çözümlenmelidir.

---

#### 🟡 BULGU 3 (Mantık / Zaman Dilimi Riski - T09): Streak (Seri) Hesabında UTC/Yerel Saat Kayması
- **Kaynak Dosya:** [`StudySessionRepository.cs:88, 94-96`](file:///C:/YazilimCalisma/planlama_app/mentörüm/Backend/MentorumApi/Data/StudySessionRepository.cs#L88-L96)
- **Sorun:** 
  ```csharp
  SELECT DISTINCT COALESCE(started_at::date, created_at::date) AS d FROM study_sessions WHERE student_id = @StudentId;
  ...
  var cursor = DateTime.UtcNow.Date;
  ```
  PostgreSQL'de `started_at::date`, UTC `timestamptz` değerini sunucu yerel saatine veya UTC'ye göre tarihe çevirir. Türkiye UTC+3 dilimindedir. Gece 00:00–02:59 arasında (örneğin 19 Ekim 01:00 TSİ = 18 Ekim 22:00 UTC) çalışma kaydeden bir öğrencinin çalışması UTC olarak 18 Ekim sayılır. Bu durum, gece çalışan öğrencilerin çalışma serisinin hatalı şekilde sıfırlanmasına (zincirin kopmasına) neden olabilir.
- **Çözüm:** SQL sorgusunda oturum tarihi Türkiye saat dilimine göre gruplanmalıdır: `COALESCE((started_at AT TIME ZONE 'Europe/Istanbul')::date, (created_at AT TIME ZONE 'Europe/Istanbul')::date)`.

---

#### 🟡 BULGU 4 (Frontend / UX Mantık Hatası - T01): Mood Check-in Kartında Geçmiş Günün Durumunun Aktif Görünmesi
- **Kaynak Dosya:** [`MoodCheckinCard.jsx:18, 35`](file:///C:/YazilimCalisma/planlama_app/mentörüm/Frontend/src/features/student/home/MoodCheckinCard.jsx#L18-L35)
- **Sorun:** 
  ```javascript
  const today = checkins[0];
  const active = today?.mood === m.id;
  ```
  Backend son 30 check-in'i tarihe göre azalan sırada döner. Eğer öğrenci bugün henüz check-in yapmadıysa, ancak 2 gün önce yaptıysa `checkins[0]` o 2 gün öncesine ait kaydı temsil eder.
- **Etki:** Öğrenci ana sayfayı açtığında, bugüne ait durum girmemiş olmasına rağmen 2 gün önceki durumu seçili (aktif) olarak görür ve check-in yapma ihtiyacı duymaz.
- **Çözüm:** `const isToday = today && new Date(today.checkinDate).toDateString() === new Date().toDateString();` kontrolü yapılarak butonların aktiflik durumu sadece `isToday` geçerli olduğunda yakılmalıdır.

---

#### 🟡 BULGU 5 (Frontend / Statik Değer - T09): Sınav Geri Sayımının Sabit Geçmiş Tarihe Bağlı Olması
- **Kaynak Dosya:** [`GoalStreakCard.jsx:6, 16`](file:///C:/YazilimCalisma/planlama_app/mentörüm/Frontend/src/features/student/home/GoalStreakCard.jsx#L6-L16)
- **Sorun:** Bileşende `const EXAM_DATE = new Date('2026-06-20T00:00:00');` hardcoded olarak tanımlanmıştır. Çalışma takviminin 19 Ekim 2026 olduğu bir senaryoda bu tarih geçmişte kaldığı için `daysLeft` daima **0 gün** üretmektedir.
- **Çözüm:** Öğrencinin kayıtlı olduğu programdaki hedef sınav tarihi ya da dinamik bir sonraki sınav takvimi kullanılmalıdır.

---

#### ⚪ BULGU 6 (Kural ve Stil Uyumsuzluğu - C1 & Bölüm A): Kalan Sistem Emojileri
- **Kaynak Dosyalar:** 
  - [`StudentHome.jsx:52, 60, 68, 76, 84, 121`](file:///C:/YazilimCalisma/planlama_app/mentörüm/Frontend/src/features/student/home/StudentHome.jsx#L52-L121) (`🚀`, `📚`, `🎯`, `🧪`, `📖`, `✏️`)
  - [`StudentHomework.jsx:119`](file:///C:/YazilimCalisma/planlama_app/mentörüm/Frontend/src/features/student/homework/StudentHomework.jsx#L119) (`🎉`)
- **Sorun:** Proje kuralları ve V10 tanımındaki "Lucide SVG ikon (sistem emojisi değil)" direktifine rağmen bu bileşenlerde işletim sistemi emojileri kalmıştır.
- **Çözüm:** İlgili simgeler `BookOpen`, `Target`, `FlaskConical`, `Edit3`, `PartyPopper` Lucide ikonlarıyla değiştirilmelidir.

---

#### ⚪ BULGU 7 (Kod Standartları / Defansif Programlama): Bağlantı Durumu Kontrolü
- **Kaynak Dosya:** [`StudySessionRepository.cs:56`](file:///C:/YazilimCalisma/planlama_app/mentörüm/Backend/MentorumApi/Data/StudySessionRepository.cs#L56)
- **Sorun:** `conn.Open();` çağrısı bağlantı durumu kontrol edilmeden doğrudan yapılmıştır. Dapper bağlantı havuzu durumuna göre bağlantı önceden açık kalırsa istisna fırlatabilir.
- **Çözüm:** `if (conn.State != System.Data.ConnectionState.Open) conn.Open();` şeklinde defansif hale getirilmelidir.

---

### 4. Bilinçli Bırakılan Maddelerin Doğrulaması

TASK_LIST_V10.md dosyasında "Bilinçli küçük eksikler" olarak listelenen 4 maddenin backend şeması ve DTO altyapısı incelenmiş; `actual_minutes`, `personal_events_checkin` ve `coaching_sessions.prep_notes` kolonlarının veritabanında hazır olduğu, bu maddelerin gerçekten ileri turlara ertelenebilecek UI kapsamı düzeyinde kaldığı teyit edilmiştir.

---

### 5. Denetim Sonuç Tablosu

| Metrik | Sonuç | Not |
|---|---|---|
| **Kod ve Derleme Bütünlüğü** | 🟢 BAŞARILI | 0 Derleme Hatası, 59/59 Birim & Entegrasyon Testi Yeşil. |
| **Yetki ve IDOR Güvenliği** | 🟢 BAŞARILI | Koç ve Öğrenci rolleri tam izole, veri sızıntısı yok. |
| **İşleyiş ve Mantık Doğruluğu** | 🟡 DÜZELTME GEREKİYOR | Ek süre onayı (Bulgu 1) ve Kronometre konu eşleşmesi (Bulgu 2) düzeltilmelidir. |

---

### 6. Düzeltme Uygulama Kaydı (Cline — 19 Ekim 2026)

Rapor incelendi; **7/7 bulgu geçerli bulundu ve tamamı düzeltildi**:

| # | Bulgu | Düzeltme |
|---|---|---|
| 1 | 🔴 Ek süre onayı `due_date` güncellemiyor | `ApprovalRepository.ApproveAsync` içine `HOMEWORK_EXTENSION` dalı eklendi: `payload.requestedDueDate` okunur; yoksa mevcut tarihe +3 gün uzatılır, `OVERDUE → PENDING` yapılır. |
| 2 | 🔴 Kronometre ders adı takvime yansımıyor | `StudySessionRepository.CreateAsync`: `SubjectId` null ise `CurriculumTopicId` üzerinden `curriculum_topics→subjects` join'iyle ders adı çözülür. |
| 3 | 🟡 Streak UTC/yerel kayması | `study_sessions` tarihleri `AT TIME ZONE 'Europe/Istanbul'` ile gruplanır; C# imleci `DateTime.UtcNow.AddHours(3).Date`. |
| 4 | 🟡 Mood kartında geçmiş gün aktif | `MoodCheckinCard`: `isToday` kontrolü eklendi; yalnızca bugünkü check-in aktif yanar. |
| 5 | 🟡 Sınav geri sayımı sabit geçmiş tarih | `GoalStreakCard`: dinamik "sonraki 20 Haziran" hesabına geçildi. |
| 6 | ⚪ Kalan sistem emojileri | `StudentHome`/`StudentHomework` emojileri Lucide (`BookOpen`, `Target`, `FlaskConical`, `BookMarked`, `Edit3`) ile değiştirildi. |
| 7 | ⚪ `conn.Open()` defansif değil | `if (conn.State != ConnectionState.Open) conn.Open()` yapıldı. |

**Doğrulama sonrası:** Backend `0 Hata`, testler **59/59**, frontend `vite build` başarılı.

---

### 7. 2. Tur Derin Denetim Bulguları ve Düzeltmeleri (Google DeepMind Antigravity — 20 Ekim 2026)

Yapılan 2. tur derin taramada kenar durumlar (edge-cases), zaman dilimleri, veri bütünlüğü ve çoklu istek senaryoları analiz edilmiş; tespit edilen **8 mantık ve işleyiş hatası** başarıyla düzeltilmiştir:

| # | Seviye | Bulgu (Sorun) | Uygulanan Çözüm |
|---|---|---|---|
| **B1** | 🔴 **Kritik Mantık** | **Gecikmiş ödevde onaylanan ek süre geçmişte kalıyordu:** Teslim tarihi 10 gün önce geçmiş bir ödev için `currentDue + 3 gün` yine geçmiş tarih üretiyor, onay sonrası ödev anında tekrar `OVERDUE` oluyordu. | `ApprovalRepository.ApproveAsync`: `baseDate = (currentDue > DateTime.UtcNow.Date ? currentDue : DateTime.UtcNow.Date)` kurgulanarak yeni teslim tarihi bugünden ileriye uzatıldı. |
| **B2** | 🔴 **Kritik Veri Bütünlüğü** | **Kronometre kaydında `study_sessions.subject_id` NULL kalıyordu:** Frontend yalnızca `curriculumTopicId` gönderdiği için `study_sessions.subject_id` NULL yazılıyor, konu istatistik raporlarında ders adı boş kalıyordu. | `StudySessionRepository.CreateAsync`: `curriculumTopicId` üzerinden `curriculum_topics → subjects` join'i ile `subject_id` çözümlenip hem `study_sessions` tablosuna kaydedildi hem takvime yansıtıldı. |
| **B3** | 🟡 **Takvim Mantık Tutarsızlığı** | **Gecikmiş ödevler takvimde kırmızı yerine mavi görünüyordu:** Ödev listesinde cronsuz dinamik `OVERDUE` hesaplaması varken takvim sorgusunda sadece `WHEN status = 'OVERDUE'` kontrol edildiği için teslim tarihi geçmiş ödevler mavi (`#3B82F6`) kalıyordu. | `CalendarRepository.cs`: `WHEN h.status = 'OVERDUE' OR (h.status = 'PENDING' AND h.due_date < CURRENT_DATE) THEN '#EF4444'` koşulu eklendi. |
| **B4** | 🟡 **Ödev Teslim Günü Mantığı** | **Teslim günü bugün olan ödevler gün ortasında OVERDUE sayılıyordu:** `due_date` DATE tipinde olduğundan PostgreSQL `due_date < @Now` ifadesinde saati `00:00:00` alıyor, teslim günü dolmamış ödevler gün ortasında gecikmiş görünüyordu. | `HomeworkEndpoints.cs`: Öğrenci ve veli sorgularında `due_date < CURRENT_DATE` kontrolüne geçildi (gün bitmeden gecikmiş sayılmaz). |
| **B5** | 🟡 **Zaman Dilimi Tutarsızlığı** | **Mood check-in UTC kaydedilirken streak Türkiye saatine bakıyordu:** `StudentCheckinRepository.cs`'de `CURRENT_DATE` (UTC) kullanıldığı için gece 00:00–02:59 TSİ aralığındaki durum dünün hanesine, seri ise bugüne yazılıyordu. | `StudentCheckinRepository.cs`: `(NOW() AT TIME ZONE 'Europe/Istanbul')::date` ile streak zaman dilimiyle tam eşitlendi. |
| **B6** | 🟡 **Mükerrer Talep Açığı** | **Aynı ödeve mükerrer ek süre talebi açılabiliyordu:** Öğrenci butona arka arkaya bastığında koç onay merkezine aynı ödev için ardışık bekleyen kayıtlar yığılıyordu. | `HomeworkEndpoints.cs`: `request-extension` ucunda bekleyen (`status = 'PENDING'`) talep kontrolü eklendi; mükerrer istekler 400 Bad Request ile engellendi. |
| **B7** | ⚪ **Validasyon Eksikliği** | **Okul şablonunda Başlangıç Saati > Bitiş Saati girilebiliyordu:** Saatlerin kronolojik kontrolü eksik olduğundan takvimde `Start > End` etkinlikleri oluşma riski vardı. | `StudentEndpoints.cs`: `TimeSpan.TryParse` ile `startTime >= endTime` durumunda 400 Bad Request döndürüldü. |
| **B8** | ⚪ **Performans & UI Yığılması** | **Kişisel etkinliklerde limitsiz geçmiş sorgusu:** `GetPersonalEventsAsync` sorgusunda sınır olmadığından takvim altındaki check-in listesinde dikey uzama riski vardı. | `CalendarRepository.cs`: `start_at >= CURRENT_DATE - INTERVAL '30 days'` ve `LIMIT 50` filtresi eklendi. |

**Doğrulama Sonucu:** Backend `0 Hata`, testler **59/59 yeşil**, frontend build **başarılı**.

