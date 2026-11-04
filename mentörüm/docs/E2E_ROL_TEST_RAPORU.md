# Mentörüm — Uçtan Uca Rol Testi Raporu (Koç / Öğrenci / Öğretmen / Veli)

**Tarih:** 2026-11-03 · **Yöntem:** Gerçek PostgreSQL (Testcontainers) + gerçek API, test: `Backend/MentorumApi.Tests/E2ERoleFlowProbeTests.cs` (113 adım)
**Kapsam dışı (henüz):** Tarayıcı arayüzü (buton tıklama), gerçek bulut depolama (R2/S3 anahtarı yok).

## 1. Sonuç Özeti

| Aşama | Başarılı | Başarısız | Not |
|---|---|---|---|
| 1. tur (düzeltme öncesi) | 103 | 10 | 3 gerçek hata, 7 ortam/test kaynaklı |
| 2. tur (HATA-25/26 sonrası) | 108 | 5 | 0 gerçek hata; 5'i ortam/test kaynaklı |

## 2. Doğrulanan Akışlar ✅

| Alan | Doğrulama |
|---|---|
| Öğrenci ekranları | profil, sınav, müfredat, hedef, seanslar, öğretmen notları, çalışma oturumu, istatistik, check-in, seri, okul programı, koçluk araçları, bildirimler — tümü 200 |
| Öğrenci → Koç not | `COACH` görünürlüklü not koçta görünür; `PRIVATE` not koçta görünmez |
| Soru | Öğrenci sorar → koç görür → koç yanıtlar → öğrenci `coachReply` görür |
| Ödev | Koç atar → öğrenci görür → ek süre talebi → koç onaylar (HATA-25 sonrası) → öğrenci tamamlar (not) → koç notu görür → veli görür |
| Öğretmen | ders/öğrenci listesi, ödev verme (öğrenci görür), sınav ekleme, ders notu (öğrenci özeti görür), başka ders → 404 |
| Sınav | Koç ekler → öğrenci ve veli görür |
| Seans & takvim | Koç seans ekler → öğrenci görür; öğrenci kişisel etkinlik; koç/öğrenci/veli takvimi |
| Ders programı | Koç slot ekler (HATA-26 sonrası) → öğrenci ve veli programında görünür |
| Ödeme planı | Plan (1000 TRY, ayın 5'i) → taksitler → veli görür → veli kısmi (400) bildirim → koç onaylar (taksit 400 PAID, kalan 600 sonraki taksite devir, çift sayım yok) → koç kalan tahsilat |
| Veli izinleri | Koç izinleri kapatınca ödev ve ödeme 403 |
| Davetler | Öğrenci ve veli davet → bekleyen → kabul → giriş |

## 3. Bulunan ve Düzeltilen Hatalar

### HATA-25 (P0) — Koç onay/ret çalışmıyor ✅ Düzeltildi
- **Belirti:** `POST /approvals/{id}/approve|reject` → 400 `CHECK_VIOLATION`; ek süre ve ödeme bildirimleri hiç sonuçlanmıyordu.
- **Kök neden:** `ApprovalRepository.cs` bildirim tipleri `COACH_APPROVAL_ACCEPTED/REJECTED`, `notifications_type_check` kısıtında yoktu. Ek olarak ikinci kısıt tanımı `TEACHER_DEACTIVATED` tipini düşürmüştü (öğretmen pasife alma da aynı şekilde kırılırdı).
- **Düzeltme:** `ApprovalRepository.cs` → `COACH_APPROVED` / `COACH_REJECTED`; `001_schema.sql` kısıtı `COACH_REJECTED` ve `TEACHER_DEACTIVATED` ile genişletildi.

### HATA-26 (P0) — Koç ders programına slot ekleyemiyor ✅ Düzeltildi
- **Belirti:** `POST /programs/{id}/schedule` → 500 (`42P08 could not determine data type of parameter $6`).
- **Kök neden:** `ScheduleRepository.CheckConflictsAsync` ve `CreateSlotAsync` içinde `@X IS NULL` kalıplarında tipsiz null parametreler.
- **Düzeltme:** `::uuid`, `::date`, `::time`, `::text`, `::int` açık tip dönüşümleri.

### HATA-27 (P1) — Test projesi derlenmiyordu ✅ Düzeltildi
- `SchoolAccessTests.cs` `h.title` / `e.name` → `h.Title` / `e.Name` (HATA-24 typed DTO regresyonu).

## 4. Kalan Başarısızlıklar (gerçek hata değil)

| Adım | Neden | Aksiyon |
|---|---|---|
| Dosya yükleme URL (koç/öğretmen/öğrenci) → 503 | Test ortamında bulut depolama yapılandırılmamış | Storage anahtarlı ortamda elle/tarayıcıdan test |
| Koç alıcı listesi → 403 | Test koçu bu derste yetkili değil (seed) | Gerçek koç/ders ilişkisiyle doğrula |
| Öğretmen ekleme → 400 | Test isteği `firstName/lastName` göndermedi | Arayüz formunun bu alanları gönderdiğini tarayıcıda doğrula |

## 5. Açık Riskler / Sonraki Adımlar
1. Tarayıcı ile buton/ekran testi (aşağıdaki yöntem).
2. Gerçek dosya paylaşımı (koç↔öğrenci↔öğretmen) çalışan storage ile.
3. `CurriculumRepository` (31/144/168), `NotificationRepository` (50), `SchoolAccessRepository` (341) içindeki `(@X IS NULL OR ...)` kalıpları aynı tip belirsizliği riski taşır; tetikleyen istek yolları test edilmeli.
4. `Program.cs:209` genel `23514` hata mesajı ("soru sayısı toplamı…") yanıltıcı; kısıt adına göre mesaj verilmeli.

## 6. Buton / Arayüz Testi İçin Yöntem
- **Tarayıcı ajanı (`/browser`):** Backend (`dotnet run`) + frontend (`npm run dev`) çalıştırılır; ajan her rolle giriş yapıp ekranlardaki tüm butonları tıklar, ekran görüntüsü/konsol hatası alır.
- **Kalıcı çözüm (öneri):** Playwright E2E paketi (rol başına login + buton/akış senaryoları), CI'da tekrar çalıştırılabilir.


---

## 7. Tarayıcı (Arayüz) Testi — Playwright

**Ortam:** Yerel tek kullanımlık PostgreSQL (Docker `mentorum-e2e-pg`), `dotnet run` backend (5130), `vite` frontend (5173). Canlı veritabanına dokunulmadı. Test komut dosyaları: `scratch/pw/` (`seed.mjs`, `ui.mjs`, `content.mjs`, `flow.mjs`).
**Seed:** Koç, program, öğrenci, veli, öğretmen, ders, ödev, ödeme planı API üzerinden oluşturuldu.

### 7.1 Tüm ekran + buton taraması (otomatik)
Her rol için tüm sayfalar açıldı; sayfadaki görünür butonlar/sekmeler (ilk 30) tek tek tıklandı. Konsol hatası, sayfa çökmesi (`pageerror`), HTTP ≥ 400 yanıtı ve tıklanamayan öğe kaydedildi.

| Rol | Sayfa | Tıklanan öğe | Sayfa çökmesi / JS hatası / API hatası |
|---|---|---|---|
| Koç | 18 (dashboard, öğrenciler, öğrenci detay, takvim, onaylar, öğretmenler, öğretmen detay, ödemeler, raporlar, profil, programlar, dersler, gruplar, ders programı, denetim, dosyalar…) | ~250 | Yok (yalnızca HATA-28) |
| Öğrenci | 8 | ~100 | Yok (yalnızca HATA-28) |
| Veli | 6 | ~75 | Yok (yalnızca HATA-28) |
| Öğretmen | 4 | ~17 | Yok (yalnızca HATA-28) |

### 7.2 Ekranda veri görünürlüğü (seed → ekran)
✅ Koç: öğrenci listesi, ödeme planı, öğretmen listesi, öğrenci detayında ödev · ✅ Öğrenci: ödev, dersler · ✅ Veli: ödev, özet · ✅ Öğretmen: ders.
ℹ️ Veli ödeme sayfası: ödeme izni **varsayılan kapalı** olduğundan "Erişim Kısıtlı" gösterir (tasarım gereği doğru). Koç izni açınca plan görünür.

### 7.3 Ödeme akışı — arayüzden uçtan uca ✅
1. Koç izni açar → veli `Ödemeler` sayfasında 3 taksit (₺1.000 × 3, kalan ₺3.000) görür.
2. Veli `Ödeme Yaptım Bildir ↗` → ₺400 → `Bildirimi Gönder` → "✓ Ödeme bildiriminiz koçunuza iletildi."
3. Koç `Onay Merkezi`: "Veli Ödeme Bildirimi — Öğrenci: Ogrenci E2E (Veli: Veli E2E) — Tutar: 400 TRY" → `Onayla` (HATA-25 düzeltmesi arayüzde doğrulandı).
4. Veli ekranı: Ödenen ₺400, kalan ₺2.600; 05.11 taksiti ÖDENDİ ₺400, 05.12 taksiti "Devir Bakiye" ₺1.600 (1.000 + 600 devir), 05.01 ₺1.000. **Çift sayım yok, toplam tutarlı.**

### ✅ HATA-28 (P2) — Oturum yenilemede eşzamanlı `/auth/refresh` çağrıları (401) — Düzeltildi
- **Belirti:** Her sayfa yenilemesinde (ve `/login` ile `/invite/:code` sayfalarında) 3–4 adet `POST /api/v1/auth/refresh` aynı anda gidiyor; biri 200, diğerleri 401 dönüyor (refresh token rotasyonu: ilk istek tokenı yeniliyor, diğerleri eski tokenla düşüyor).
- **Konum:** `Frontend/src/api/apiClient.js`, `Frontend/src/App.jsx`.
- **Düzeltme:** `apiClient.js` içinde paylaşımlı `refreshPromise` (single-flight) kullanan `refreshAccessToken()` fonksiyonu tanımlandı; 401 interceptor'ının `/auth/refresh`, `/auth/login`, `/auth/register` uçlarını tekrar yenilemeye çalışması (sonsuz/mükerrer çağrı) engellendi ve `App.jsx` `initAuth` bu ortak single-flight fonksiyonuna bağlandı.

---

### 7.4 Tüm Form Senaryoları Uçtan Uca Tarayıcı Testi (`F01`–`F28`)

Playwright (`chromium`) ile gerçek tarayıcı örneği ayağa kaldırılarak 4 roldeki (`Koç`, `Öğrenci`, `Öğretmen`, `Veli`) **28 form senaryosunun tamamı** (`input`, `select`, `textarea`, `checkbox` doldurma ve `submit` butonuna basma) uçtan uca çalıştırıldı (`scratch/pw/forms_e2e.mjs`, `forms_remaining.mjs`, `forms_final4.mjs`).

| Kod | Rol | Form / Senaryo | Ekran / Bileşen | Sonuç | Bulgu / Detay |
|---|---|---|---|---|---|
| **F01** | Koç | Yeni Program Oluşturma Formu | `/coach/programs` (`CoachProgramsPage.jsx`) | ✅ **DÜZELTİLDİ (`HATA-33`)** | `ProgramRepository.cs` çift `tx.Rollback()` kaldırıldı (`409 Conflict` dönüyor) ve `CoachProgramsPage.jsx` içine hata mesajı eklendi |
| **F02** | Koç | Yeni Ders (Course) Oluşturma Formu | `/coach/programs/:id/courses` (`CoursesPage.jsx`) | ✅ **GEÇTİ** | `FormTest TYT Fizik (GRUP)` oluşturuldu |
| **F03** | Koç | Ders Kaynağı Ekleme & Öğretmen İzinleri Formu | `/coach/programs/:id/courses/:courseId` (`CourseDetailPage.jsx`) | ✅ **GEÇTİ** | `FormTest Türev Fasikülü` eklendi, 12 izin anahtarı kaydedildi |
| **F04** | Koç | Yeni Öğrenci Grubu Oluşturma Formu | `/coach/programs/:id/groups` (`GroupsPage.jsx`) | ✅ **GEÇTİ** | `FormTest MF-1 Grubu` oluşturuldu |
| **F05** | Koç | Gruba Öğrenci Ekleme Formu | `/coach/programs/:id/groups` (`GroupsPage.jsx`) | ✅ **GEÇTİ** | Öğrenci gruba eklendi (`Üyeler (1)`) |
| **F06** | Koç | Yeni Öğretmen Ekleme & Davet Gönderme Modalı | `/coach/teachers` (`AddTeacherModal.jsx`) | ✅ **GEÇTİ** | `Selim Kaya (Fizik)` eklendi ve davet kodu üretildi |
| **F07** | Koç | Haftalık Program Slotu Ekleme Formu | `/coach/programs/:id/schedule` (`WeeklySchedulePage.jsx`) | ✅ **DÜZELTİLDİ (`HATA-30`)** | Normal ders slotu (`14:00 - 15:00`) + `"📌 Özel Başlık"` (`studentId`, `recurrence`, `specificDate` `coachSchoolApi.js` içine eklendi) |
| **F08** | Koç | Öğrenci Profil / Hedef Düzenleme Modalı | `/coach/students/:id` (`EditStudentProfileModal.jsx`) | ✅ **GEÇTİ** | `Boğaziçi Üniversitesi / Bilgisayar Mühendisliği / 525` kaydedildi |
| **F09** | Koç | Ödev Atama Modalı (`AssignHomeworkModal`) | Üst Bar & Dashboard & `/coach/students/:id` | ✅ **DÜZELTİLDİ (`HATA-29 & HATA-31`)** | `AssignHomeworkModal.jsx` içine öğrenci seçici `<Select>` eklendi; `useAssignHomework` içine `studentHomework` cache invalidation eklendi |
| **F10** | Koç | Öğrenciye Koç Notu Ekleme Formu | `/coach/students/:id` (`NotesTab.jsx`) | ✅ **GEÇTİ** | Koç notu eklendi ve listede anında göründü |
| **F11** | Koç | Ödeme Planı Oluşturma & Taksit Ekleme Formu | `/coach/students/:id` (`PaymentPlanSection.jsx`) | ✅ **GEÇTİ** | Ek taksit (`1250 TRY`) eklendi |
| **F12** | Koç | Veli Erişim İzinleri & Veli Davet Formu | `/coach/students/:id` (`ParentAccessPanel.jsx`, `ParentPermissionsPanel.jsx`) | ✅ **GEÇTİ** | 5 izin boolean olarak güncellendi, `veli2@e2e.local` daveti `relatedId` ile 200 döndü |
| **F13** | Koç | Doğrudan Öğrenci Oluşturma & E-posta Daveti Formu | `/coach/students` (`AddOrInviteStudentPanel.jsx`) | ✅ **DÜZELTİLDİ (`HATA-32`)** | `FormTest Yeni Öğrenci` ve davet oluşturuldu; `Linki Kopyala` `${window.location.origin}` kullanacak şekilde güncellendi |
| **F14** | Koç | Takvimden Yeni Koçluk Seansı Planlama Modalı | `/coach/calendar` (`CoachCalendarPage.jsx`) | ✅ **GEÇTİ** | `FormTest Haftalık Değerlendirme Seansı` oluşturuldu |
| **F15** | Koç | Program Ayarları & Yardımcı Koç Davet Formu | `/coach/programs/:id/settings` (`CoachProgramSettingsPage.jsx`) | ✅ **GEÇTİ** | Program adı güncellendi, yardımcı koç daveti gönderildi |
| **F16** | Koç | Koç Profil & Tema Güncelleme Formu | `/coach/profile` (`CoachProfilePage.jsx`) | ✅ **GEÇTİ** | `Dr. Koç E2E Güncel` kaydedildi |
| **F17** | Öğrenci | Hızlı Çalışma & Soru Kaydı Formu | `/student/home` (`StudyTimerCard.jsx`) | ✅ **GEÇTİ** | `50 dk, 40 soru (36D/4Y)` hızlı kayıt eklendi |
| **F18** | Öğrenci | Günlük Check-In (Mod / Enerji / Odak) Formu | `/student/home` (`CheckinCard.jsx`) | ✅ **GEÇTİ** | Günlük durum ve not kaydedildi |
| **F19** | Öğrenci | Koça Fotoğrafsız/Fotoğraflı Soru Gönderme Formu | `/student/home` (`StudentQuestionsCard.jsx`) | ✅ **GEÇTİ** | `Türevde zincir kuralı...` sorusu koça iletildi |
| **F20** | Öğrenci | Deneme Sınavı Sonucu Ekleme Formu | `/student/exams` (`StudentExamsPage.jsx`) | ✅ **GEÇTİ** | `FormTest Özdebir TYT Deneme-4 (96.25 Net)` eklendi |
| **F21** | Öğrenci | Haftalık Hedef Belirleme Formu | `/student/stats` (`StudentStatsPage.jsx`) | ✅ **GEÇTİ** | `750 dakika / 450 soru` hedefi kaydedildi |
| **F22** | Öğrenci | Takvim Kişisel Etkinlik & Koça Görünür Not Formu | `/student/calendar` (`StudentCalendarPage.jsx`) | ✅ **GEÇTİ** | `FormTest Kişisel Tekrar Etkinliği` + `COACH` görünürlüklü not eklendi |
| **F23** | Öğrenci | Ödev Ek Süre Talebi & Ödev Tamamlama Formu | `/student/homework` (`StudentHomeworkPage.jsx`) | ✅ **GEÇTİ** | Ek süre talebi (+3 gün) ve ödev tamamlama (`%100` + öğrenci notu) çalıştı |
| **F24** | Öğretmen | Dersi Tamamla ve Değerlendirme Notu Kaydet Modalı | `/teacher/courses` (`TeacherCoursesPage.jsx`) | ✅ **GEÇTİ** | Öğrenci özeti + koça özel pedagojik not kaydedildi |
| **F25** | Öğretmen | Öğrenci Ders Notu Ekleme Modalı | `/teacher/courses` (`TeacherStudentNotesModal.jsx`) | ✅ **GEÇTİ** | `STUDENT_VISIBLE` ders notu ve özeti kaydedildi |
| **F26** | Öğretmen | Öğretmen Ödev Atama & Ödev Onay/Geri Bildirim Formu | `/teacher/courses` (`TeacherCoursesPage.jsx`) | ✅ **GEÇTİ** | `FormTest Öğretmen Türev Ödevi` atandı ve geri bildirimle onaylandı |
| **F27** | Öğretmen | Öğretmen Sınav / Not Ekleme Formu | `/teacher/courses` (`TeacherCoursesPage.jsx`) | ✅ **GEÇTİ** | `FormTest Öğretmen 2. Yazılı (95 Net)` kaydedildi |
| **F28** | Çapraz Rol | Koç Soru Yanıtlama + Öğrenci Notu + Öğretmen Özeti + Onay Merkezi | Koç ↔ Öğrenci ↔ Öğretmen ↔ Veli | ✅ **GEÇTİ** | Koç soruyu gördü ve yanıtladı → Öğrenci yanıtı ve öğretmen özetini gördü → Koç öğrencinin `COACH` notunu ve ek süre talebini gördü |

---

### 7.5 Form Testlerinde Bulunan ve Düzeltilen Uygulama Hataları (`HATA-29` – `HATA-33`)

#### ✅ HATA-29 (P0) — Üst Bar (`CoachLayout`) ve Dashboard (`CoachDashboard`) "Ödev Ata" Hızlı Aksiyon Butonları Öğrenci Seçimi Olmadığı İçin `400 Bad Request` Veriyordu — Düzeltildi
- **Kök Neden:** `AssignHomeworkModal.jsx` içinde `selectedStudent` prop'u verilmediğinde koçun öğrenci seçebileceği bir `<Select>` alanı yoktu (`studentId: undefined`).
- **Düzeltme:** `AssignHomeworkModal.jsx` içine `!selectedStudent` durumunda `useStudents()` listesinden öğrenci seçtiren zorunlu `<Select label="Öğrenci *">` alanı eklendi.

#### ✅ HATA-30 (P0) — Haftalık Programda (`WeeklySchedulePage`) "📌 Özel Başlık (Bireysel Etüt)" Slotu Eklenemiyordu (`400 Bad Request`) — Düzeltildi
- **Kök Neden:** `coachSchoolApi.js` içindeki `useCreateScheduleSlot` hook'u `studentId`, `recurrence`, `specificDate` alanlarını destructuring sırasında düşürüyordu.
- **Düzeltme:** `useCreateScheduleSlot` içine `studentId`, `recurrence`, `specificDate` alanları eklendi.

#### ✅ HATA-31 (P1) — Öğrenci Detay Sayfasında (`CoachStudentDetail`) Ödev Atandığında Ödev Listesi Sayfa Yenilenmeden Güncellenmiyordu — Düzeltildi
- **Kök Neden:** `coachExamsHomeworkApi.js` içindeki `useAssignHomework` mutation'ı `queryKeys.coach.studentHomework(variables.studentId)` anahtarını invalidate etmiyordu.
- **Düzeltme:** `useAssignHomework` `onSuccess` bloğuna `studentHomework(variables.studentId)` ve `student(variables.studentId)` invalidation eklendi.

#### ✅ HATA-32 (P2) — Öğrenci Davet Linki Kopyalama Butonu (`AddOrInviteStudentPanel.jsx`) Sabit Üretim Alan Adı Kullanıyordu — Düzeltildi
- **Kök Neden:** `AddOrInviteStudentPanel.jsx` satır 118'de sabit `https://mentorum.dersmatris.com/invite/${code}` kalmıştı.
- **Düzeltme:** `${window.location.origin}/invite/${code}` olarak güncellendi.

#### ✅ HATA-33 (P0/P1) — `POST /api/v1/programs` Program Limiti Aşıldığında Çift `tx.Rollback()` Nedeniyle `409 Conflict` Yerine `500 Internal Server Error` Dönüyordu — Düzeltildi
- **Kök Neden:** `ProgramRepository.cs` (`CreateProgramAsync`) içinde satır 63'te `tx.Rollback()` çağrılıp `throw new InvalidOperationException("PROGRAM_LIMIT_EXCEEDED")` fırlatılıyor, `catch` bloğu (satır 83) ikinci kez `tx.Rollback()` çağırarak asıl istisnayı eziyordu.
- **Düzeltme:** `ProgramRepository.cs` satır 63'teki mükerrer `tx.Rollback()` kaldırıldı ve `CoachProgramsPage.jsx` içine API hata mesajı gösterimi eklendi.

---

## 8. V20 Bağımsız Öğrenci Modu, Yönetici Onaylı Rol/Koç Atama, Çift Yönlü Eşleşme ve 6'lı Özerklik Matrisi — Uçtan Uca Test Senaryosu (`V20-UI-01` – `V20-UI-28`)

### 8.1 Test Altyapısı ve Ön Koşullar
1. **Playwright Kurulumu (`Frontend/e2e/`):**
   - `@playwright/test` + `Frontend/playwright.config.js` + `npx playwright install chromium`.
   - Test dosyası: `Frontend/e2e/v20-independent-student.spec.js`.
2. **İzole PostgreSQL (`docker-compose.e2e.yml`):**
   - `mentorum-e2e-pg` (`postgres:16-alpine`, port `5433:5432`, `tmpfs: /var/lib/postgresql/data`).
   - Backend (`http://localhost:5130`) ve Frontend (`http://localhost:5173`) bu izole veritabanına bağlı çalışır.
3. **Deterministik Seed & Teardown (`Frontend/e2e/global-setup.js`):**
   - Her koşu başında veritabanı sıfırlanır / test kullanıcıları temizlenir ve 5 gerçek kullanıcı hazırlanır:
     - **`Yönetici (Admin)`** (`admin@e2e.local`): `users.role = 'Coach'`, `users.is_admin = TRUE`, `users.approval_status = 'APPROVED'`.
     - **`Koç 1`** (`koc1@e2e.local`): Onaylı koç (`coaches.phone = '05551112233'`).
     - **`Koç 2`** (`koc2@e2e.local`): Gizlilik testi için ikinci onaylı koç (`coaches.phone = '05554445566'`).
     - **`Öğrenci 1`** (`bagimsiz@e2e.local`): Kayıt olup **Bağımsız Öğrenci (Koçsuz)** olarak onaylanacak öğrenci (`students.phone = '05559998877'`).
     - **`Öğrenci 2`** (`atanan@e2e.local`): Kayıt olup yönetici onayında doğrudan **Koç 2**'ye atanacak öğrenci.
4. **Stabil Seçici (`data-testid`) Stratejisi:**
   - Kırılgan metin/CSS seçiciler yerine tüm V20 form, buton, sekme ve izin anahtarlarında `data-testid` öznitelikleri kullanılır.

### 8.2 Adım Adım Test Senaryosu ve Durum Çizelgesi

| Kod | Durum | Rol | Test Senaryosu / Aksiyon | Ekran / `data-testid` | Beklenen Sonuç (Kabul Kriteri) |
|---|:---:|---|---|---|---|
| **V20-UI-01** | `[x] ✅ GEÇTİ` | Ziyaretçi | Karanlık mod ve cam (`glassmorphism`) giriş ekranı kontrolü | `/login` (`LoginPage.jsx`) | Arka plan ay/güneş dekorasyonu kartın arkasında şeffaf görünür; input ve buton köşeleri tutarlıdır, konsol hatası yoktur |
| **V20-UI-02** | `[x] ✅ GEÇTİ` | Öğrenci 1 & 2 | Yeni kullanıcı kaydı (`Register`) ve onay bekleme ekranı | `/login` (Kayıt Ol sekmesi) | `bagimsiz@e2e.local` ve `atanan@e2e.local` kayıt olur; yönetici onayı beklediğine dair bilgilendirme görünür |
| **V20-UI-03** | `[x] ✅ GEÇTİ` | Yönetici | Kayıt Modu (`ADMIN_APPROVAL` / `SELF_SERVICE`) kontrolü | `/coach/admin` (`reg-mode-admin`, `reg-mode-self`) | `"🔒 Yönetici Onaylı Kayıt (Aktif)"` seçili görünür; `"🚀 Otomatik Kayıt (Yakında)"` kilitli (`disabled`) görünür |
| **V20-UI-04** | `[x] ✅ GEÇTİ` | Yönetici | Onay bekleyen kullanıcıda yalnızca **Koç** / **Öğrenci** rol seçimi | `/coach/admin` (`pending-role-select-{id}`) | Rol açılır kutusunda sadece `Student (Öğrenci)` ve `Coach (Koç)` seçenekleri yer alır (`Teacher` ve `Parent` çıkmaz) |
| **V20-UI-05** | `[x] ✅ GEÇTİ` | Yönetici | **Öğrenci 1**'i **"🌱 Bağımsız Öğrenci (Koçsuz)"** olarak onaylama | `/coach/admin` (`pending-coach-select-{id}` = `""`, `pending-approve-btn-{id}`) | Koç ataması `"🌱 Bağımsız Öğrenci (Koçsuz)"` seçilip onaylanır; Öğrenci 1'e bireysel çalışma alanı açılır (`hasCoach = false`) |
| **V20-UI-06** | `[x] ✅ GEÇTİ` | Yönetici | **Öğrenci 2**'yi onaylarken doğrudan **Koç 2**'ye atama | `/coach/admin` (`pending-coach-select-{id}` = `Koç 2`, `pending-approve-btn-{id}`) | Koç ataması listesinden `Koç 2` seçilip onaylanır; Öğrenci 2 doğrudan Koç 2'nin öğrenci listesine ve `program_coaches` kapsamına bağlanır |
| **V20-UI-07** | `[x] ✅ GEÇTİ` | Yönetici | Manuel Kullanıcı Ekleme formunda Öğrenci + Koç ataması | `/coach/admin` (`manual-role-select`, `manual-coach-select`) | Manuel ekleme formunda `Öğrenci` seçildiğinde koç atama kutusu görünür ve sorunsuz çalışır |
| **V20-UI-08** | `[x] ✅ GEÇTİ` | Öğrenci 1 (Bağımsız) | **(Özellik 1 — Hedef):** Bağımsız öğrencinin kendi hedefini girmesi | `/student/profile` (`goal-university-input`, `goal-save-btn`) | `ODTÜ / Bilgisayar Müh. / 510` girilip kaydedilir; sayfa yenilendiğinde korunur |
| **V20-UI-09** | `[x] ✅ GEÇTİ` | Öğrenci 1 (Bağımsız) | **(Özellik 2 — Konu Tamamlama):** Müfredat konusunu "Tamamlandı" işaretleme | `/student/courses` (`student-topic-toggle-{id}`) | Konu satırındaki kutuya tıklanır; konu üstü çizili `Tamamlandı` olur (`student_topic_progress` tablosuna yazılır) |
| **V20-UI-10** | `[x] ✅ GEÇTİ` | Öğrenci 1 (Bağımsız) | **(Özellik 3 — Kaynak & Video):** Bireysel kitap ve video ders kaynağı ekleme & ilerleme | `/student/courses` (`segmented-tab-myResources`, `student-res-add-btn`) | `3D TYT Matematik Soru Bankası (20 Bölüm)` eklenir; `+1` butonuyla ilerleme `1/20 Bölüm` yapılır |
| **V20-UI-11** | `[x] ✅ GEÇTİ` | Öğrenci 1 (Bağımsız) | **(Özellik 4 — Sınav Neti):** Kendi deneme sınavı netini girme ve silme | `/student/profile` (`student-exam-add-btn`, `student-exam-delete-btn-{id}`) | `Özdebir TYT Deneme 1 (92.5 Net)` ve ikinci bir deneme eklenir; ikincisi silinir, ilki listede kalır |
| **V20-UI-12** | `[x] ✅ GEÇTİ` | Öğrenci 1 (Bağımsız) | **(Özellik 5 — Kendi Ödevi):** Kendine çalışma / ödev atama | `/student/homework` (`self-assign-hw-open-btn`, `self-assign-hw-submit-btn`) | `+ Kendime Çalışma / Ödev Ekle` ile `Paragraf 40 Soru Çözümü` ödevi oluşturulur ve `👤 Kendi Çalışmam` rozetiyle listelenir |
| **V20-UI-13** | `[x] ✅ GEÇTİ` | Öğrenci 1 (Bağımsız) | **(Özellik 6 — Ödev Tamamlama):** Ödevi doğrudan %100 tamamlama | `/student/homework` (`hw-complete-submit-btn`) | Ödev ilerlemesi `%100` seçilip kaydedilir; onaya düşmeden doğrudan `Tamamlananlar (DONE)` listesine geçer |
| **V20-UI-14** | `[x] ✅ GEÇTİ` | Koç 2 | **Eşleşme Öncesi Arama Kontrolü:** Bağımsız öğrencinin aramada görünmesi, koçlu Öğrenci 2'nin görünmemesi | `/coach/students` (`segmented-tab-SEARCH_INDEPENDENT`, `coach-student-search-input`) | Koç 2 aramada henüz bağımsız olan **Öğrenci 1**'i (telefon `05559998877` ile) görür; zaten koçu olan **Öğrenci 2** ise bağımsız arama sonuçlarında yer almaz |
| **V20-UI-15** | `[x] ✅ GEÇTİ` | Öğrenci 1 (Bağımsız) | Bağımsız öğrencinin **telefon (`05551112233`) ve isim** ile koç araması ve istek göndermesi | `/student/profile` (`student-coach-search-input`, `student-send-request-btn-{id}`) | Öğrenci 1 önce `05551112233` telefonuyla **Koç 1**'i bulur ve `İstek Gönder` butonuna tıklar; istek `Koç Onayı Bekleniyor` durumuna geçer |
| **V20-UI-16** | `[x] ✅ GEÇTİ` | Koç 1 | Koçun gelen eşleşme isteğini görmesi ve **Kabul Etmesi** | `/coach/students` (`accept-request-btn-{id}`) | Koç 1 `Gelen / Giden Eşleşme İstekleri` listesinde Öğrenci 1'in isteğini görür ve `Kabul Et` butonuna tıklar |
| **V20-UI-17** | `[x] ✅ GEÇTİ` | Koç 1 | **Veri Taşıma & `👤 Öğrenci` Rozet Doğrulaması:** Bağımsızken girilen verilerin koç ekranında görünmesi | `/coach/students/:id` (`InfoTab`, `TopicsTab`, `HomeworkTab`, `ExamsTab`) | Öğrenci 1'in bağımsızken girdiği hedef (`ODTÜ`), tamamladığı konu (`👤 Öğrenci`), eklediği kaynak (`3D TYT Matematik Soru Bankası` — `👤 Öğrenci Ekledi`), sınav (`92.5 Net` — `👤 Öğrenci Girdi`) ve ödev (`👤 Öğrenci Ekledi`) Koç 1'in ekranında eksiksiz görünür |
| **V20-UI-18** | `[x] ✅ GEÇTİ` | Koç 2 & Yönetici | **Eşleşme Sonrası Arama Gizliliği:** Artık koçu olan Öğrenci 1'i Koç 2 göremez, Yönetici görebilir | `/coach/students` (`coach-student-search-input`) | Eşleşme gerçekleştiği için Koç 2 `05559998877` arattığında **0 sonuç** döner; Yönetici (`Admin`) arattığında öğrenciyi görebilir |
| **V20-UI-19** | `[x] ✅ GEÇTİ` | Koç 1 & Öğrenci 1 | **Başlangıç Varsayılan İzinleri (3 Açık / 3 Kapalı):** Eşleşme anındaki varsayılanların kontrolü | `/coach/students/:id` (`perm-toggle-*`) & Öğrenci ekranları | `Konu Tamamlama`, `Hedef Belirleme`, `Ödev Tamamlama` **Açık (`✓`)**; `Deneme Neti Girme`, `Kaynak/Video Ekleme`, `Kendine Ödev Koyma` **Kapalı (` `)** başlar. Öğrenci ekranında kapalı olan özelliklerin ekleme butonları gizlidir |
| **V20-UI-20** | `[x] ✅ GEÇTİ` | Koç 1 | **Bağlamsal Kısayol Tikleri (Bonus):** Sekme üstü hızlı yetki kutularından izin açma/kapatma | `/coach/students/:id` (`quick-perm-canAddExamResults`) | `Sınavlar` sekmesi üstündeki hızlı yetki tiki işaretlenir; yetkinin anında güncellendiği doğrulanır |
| **V20-UI-21** | `[x] ✅ GEÇTİ` | Koç 1 | Koçun öğrencinin verilerine müdahale etmesi (Konu durumu değiştirme, Kaynak ekleme/silme, Sınav silme) | `/coach/students/:id` (`TopicsTab`, `ExamsTab`) | Koç `TopicsTab` içinden konuya tıklayıp durumu değiştirir, öğrenciye yeni kaynak ekler ve `ExamsTab` içinden sınav silebilir |
| **V20-UI-22** | `[x] ✅ GEÇTİ` | Koç 1 | **"Ödev Tamamlama İzni"ni Kapatma (`canCompleteHomework = false`)** ve yeni ödev atama | `/coach/students/:id` (`quick-perm-canCompleteHomework` & `Ödev Ata`) | Koç `Öğrenci ödevleri doğrudan tamamlayabilsin` tikini **kapatır** ve öğrenciye `Koç Onaylı Türev Testi` ödevini atar |
| **V20-UI-23** | `[x] ✅ GEÇTİ` | Öğrenci 1 (Koçlu) | İzin kapalıyken ödevi %100 yapıp **"Tamamlama Onaya Gönder"** akışı | `/student/homework` (`hw-complete-submit-btn`) | Öğrenci `%100` seçtiğinde buton **`Tamamlama Onaya Gönder`** yazar; tıklanınca ödev `DONE` olmaz, üzerinde **`⏳ Onay Bekleniyor`** durumu görünür |
| **V20-UI-24** | `[x] ✅ GEÇTİ` | Koç 1 | Koçun **Onay Merkezi (`ApprovalsPage`)** üzerinden `HOMEWORK_DONE` talebini onaylaması | `/coach/approvals` (`ApprovalsPage.jsx`) | Koç `Koç Onaylı Türev Testi` onay kartını görür ve `Onayla` butonuna basar; ödev hem koçta hem öğrencide `Tamamlandı (DONE)` olur |
| **V20-UI-25** | `[x] ✅ GEÇTİ` | Koç 1 | Koçun öğrenciyi **"🌱 Koçluktan Ayır (Bağımsız Moda Geçir)"** ile ayırması (`Unlink`) | `/coach/students/:id` (`unlink-student-btn`) | Koç `🌱 Koçluktan Ayır` butonuna tıklar ve onaylar; öğrenci Koç 1'in listesinden çıkar |
| **V20-UI-26** | `[x] ✅ GEÇTİ` | Öğrenci 1 (Tekrar Bağımsız) | **Simetrik Veri Taşıma Doğrulaması:** Ayrılma sonrası öğrencinin tüm verilerinin korunması ve 6 yetkinin tekrar açılması | `/student/profile`, `/student/courses`, `/student/homework` | Öğrenci 1 tekrar `🌱 Bağımsız Öğrenci Modu` kartını görür; önceki tüm ödevleri (`Koç Onaylı Türev Testi`), sınav netleri (`Özdebir TYT Deneme 1`), kaynakları ve hedefleri sıfır veri kaybıyla durmaktadır ve 6 özelliğin tamamı tekrar aktiftir |
| **V20-UI-27** | `[x] ✅ GEÇTİ` | Tüm Roller | Karanlık Mod (`Dark Mode`) kutu/input kontrast ve buton yuvarlaklığı regresyon kontrolü | `/coach/students/:id` (`EditStudentModal`), `/login` | Karanlık modda öğrenci düzenleme modalındaki tüm `<Input>` ve `<Select>` kutuları koyu yüzey (`var(--bg-card)`) rengindedir (`rgb(255, 255, 255)` değildir) |
| **V20-UI-28** | `[x] ✅ GEÇTİ` | Backend Test | `V20IndependentStudentSmokeTests.cs` otomatik entegrasyon test paketi | `dotnet test` (`Testcontainers`) | Tüm yeni V20 API uçları ve yetkilendirme/IDOR kuralları `dotnet test` içinde kalıcı regresyon testi olarak çalışır ve `83/83 Passed (0 Hata)` ile geçer |

### 8.3 V20 Test Sürecinde Yakalanıp Düzeltilen Bulgular

#### ✅ HATA-34 (P0 — Sözleşme Uyumsuzluğu) — `TopicsTab`, `HomeworkTab` ve `ExamsTab` İçinde `student.permissions` ve `StudentResourceDto` Alan Adı Sapması — Düzeltildi
- **Kök Neden:** Backend `StudentDetailDto` 6 özerklik iznini `student.permissions.{canCompleteTopics,...}` altında dönerken `TopicsTab.jsx`, `HomeworkTab.jsx` ve `ExamsTab.jsx` doğrudan üst seviye `student.canCompleteTopics` okuyordu. Ayrıca `TopicsTab.jsx` kaynak ekleme formunda `StudentResourceDto` sözleşmesindeki `urlOrAuthor`, `totalUnits`, `completedUnits` yerine `authorOrPublisher`, `totalCount`, `completedCount` kullanıyordu.
- **Düzeltme:** Üç sekme bileşeni `student?.permissions` nesnesini okuyacak ve `StudentResourceDto` (`urlOrAuthor`, `totalUnits`, `completedUnits`) sözleşmesiyle birebir eşleşecek şekilde düzeltildi.

#### ✅ HATA-35 (P2 — UI/Bileşen Prop İletimi) — `Card.jsx` Bileşeninin `data-testid` ve Standart HTML Özniteliklerini DOM'a İletmemesi — Düzeltildi
- **Kök Neden:** `components/common/Card/Card.jsx` yalnızca tanımlı prop'ları alıp `...props` yayılımını (`spread`) kök `<div>` öğesine aktarmadığı için kart bileşenlerine verilen `data-testid` ve ARIA öznitelikleri DOM'a yansımıyordu.
- **Düzeltme:** `Card.jsx` imza ve kök `<div>` elemanına `...props` aktarımı eklendi.

#### ✅ HATA-36 (P2 — Kayıt Ekranı Metni) — `LoginPage.jsx` Kayıt Ol Sekmesinde Sadece "Yeni Koç Hesabı Oluştur" Yazması — Düzeltildi
- **Kök Neden:** V20 ile birlikte sisteme bağımsız öğrenciler de kayıt olabilmesine rağmen `LoginPage.jsx` kayıt alt başlığında yalnızca `"Yeni Koç Hesabı Oluştur"` yazıyordu.
- **Düzeltme:** Alt başlık `"Yeni Öğrenci / Koç Hesabı Oluştur"` olarak güncellendi.

