# 🧭 Mentörüm — V18 Görev Listesi (Acil Hata Düzeltmeleri + Ajan-Optimum Hibrit Sadeleştirme)

> **Tarih:** 29 Ekim 2026 · **Hazırlayan:** DeepSeek - Cline · **Revize:** Claude Opus & Gemini (30 Ekim 2026 — Ajan-Optimum Hibrit Mimari + Tam Kod Tabanı Taraması + DeepSeek Doğrulaması)
> **Kaynak:** `docs/KOD_SADELESTIRME_DENETIM_RAPORU_2.md` (Gemini §7/§8 + DeepSeek §1–§6 ortak denetimi + 30 Ekim Tam Kod Tabanı Ajan-Optimum Taraması).
> **Amaç:** (1) V17 refaktörünün neden olduğu ve taramada yakalanan **aktif P0/P1 hatalarını** düzeltmek ve **Sözleşme Sapması Korumasını (`B10/S7`) Faz 1'de devreye almak**, (2) kopya SQL, ölü kod ve gereksiz `try/catch` gürültüsünü silerek **gerçek net satır azaltımı** sağlamak, (3) aşırı dosya parçalanmasına (over-fragmentation) yol açmadan **Ajan-Optimum Hibrit** yapıyı kurmak.
> **Görev Durum Kuralı:** Henüz uygulanmamış veya xUnit/birleştirme doğrulaması bekleyen `[ ]`, kodlaması ve doğrulaması tamamlanan `[x]`.

---

## Mutabakat Özeti (Ajan-Optimum Hibrit Yaklaşım)

- **Tüm Kod Tabanı Boyut Analizi (Toplam Satır / Boşluksuz Dolu Satır):**
  - **Backend (`MentorumApi`):** 500 satırı aşan **yalnızca 1 dosya** vardır: `StudentRepository.cs` (**753 toplam / 676 dolu satır** → **S5 sonrası 494 toplam satır**). Backend'deki tüm dosyalar tek `read_file` sınırının (800 satır) güvenli biçimde altında (≤ 494 satır) kalır.
  - **Frontend (`Frontend/src`):** 510 satırı aşan **yalnızca 2 dosya** vardı: `CoachDashboard.jsx` (**817 → 453 toplam satır**) ve `CoachStudents.jsx` (**690 → 367 toplam satır**). **F2** ve **F3** ile Frontend'deki tüm dosyalar ≤ 505 satır oldu.
- **Faz 1 (Acil P0/P1 + Sözleşme Koruması):** K1 crash (`B1`), K2 IDOR (`B2`), C1–C8 contract (`B3–B7`), OverdueHomeworkJob rollback + 6 literal `OVERDUE` SQL (`B8`), `useCoachCompleteHomework` (`studentNotes` vs `note`) sözleşme hatası (`B9`) ve **Faz 1'e yükseltilen Sözleşme Sapması Koruması (`B10 / eski S7`)**.
- **Faz 2 (Backend — Net Kod Küçültme):**
  - Kopya SQL tekilleştirme (**S1**),
  - Endpoint ham SQL'lerini yeni repo şişkinliği yaratmadan mevcut repolara (`ParentVisibilityRepository` vb.) taşıma (**S2**),
  - Ödev tamamlama transaction/versiyon (**S3**),
  - Ağır sahiplik sorgularını hafif `ProgramAccessGuard` kontrolüne indirme (**S4**),
  - `StudentRepository.cs` (753 toplam / 676 dolu satır) dosyasını 3'e değil **2'ye** bölerek (`StudentCoachingToolsRepository`) ideal 494 satır bandına çekme (**S5**),
  - Endpoint'lerdeki `403` dönen mükerrer `catch (UnauthorizedAccessException)` bloklarını silme + grup yardımcıları (**S6**). `Program.cs` (337 satır) **bölünmez**.
  - Hiçbir yerde çağrılmayan 4 ölü Repository metodu ve ölü `ApproveCoachRequest` sınıfının silinmesi (**S8**).
- **Faz 3 (Frontend — Over-Fragmentation Önleme & Tekilleştirme):**
  - `ExamsTab.jsx` (474 toplam / 447 dolu satır) ideal aralıkta olduğu için **bölünmez** (**F1**).
  - `CoachStudents.jsx` (690 → 367 toplam satır) ve `CoachDashboard.jsx` (817 → 453 toplam satır) içinden bağımsız 1'er alt panel ayrılarak ana dosyalar **≤ 480 satır** bandına indirilir (**F2, F3**).
  - Parçalı 57 satırlık `studentFlexibilityApi.js` dosyasının `coachStudentsApi.js` içine birleştirilmesi, `coach/api/*.js` ↔ `studentApi.js` arasındaki **kanıtlanmış 7 hook isim çakışmasının** ve 2 ölü dosyanın (`InviteSharePanel`, `localFiles.js`) temizlenmesi (**F8**).

---

## 0. Ön Kararlar (Ajan-Optimum Kuralları)

### [x] D0 — Satır Ölçüm Yöntemi
- **Karar:** Araçlar arası farkı (boş satır dahil vs hariç) önlemek için listede hem **toplam satır** (`(Get-Content <dosya>).Count`) hem **dolu satır** birlikte belirtilmiştir. Kabul kriteri: hiçbir dosya **toplam 520 satırı** aşmaz.

### [x] D1 — Ajan-Optimum Hibrit Mimari Kuralı
- **Neden:** Ajanların `read_file` aracı tek seferde maksimum **800 satır** okur.
  1. **650–800+ satırlık dosyalar** ajanın tek okumada dosya sonunu kaçırmasına yol açar → **450–500 satır bandına** indirilmelidir (`StudentRepository.cs`, `CoachDashboard.jsx`, `CoachStudents.jsx`).
  2. **300–510 satırlık dosyaları** sırf "300 satır kuralı" için 3-4 küçük dosyaya bölmek (over-fragmentation), ajanın tek işlem için 4 dosya okumasına, prop/sözleşme hatalarına ve boilerplate (`import`/`export`/`class`/`using`) yüzünden **toplam kod satırının artmasına** neden olur → **Bölünmez.**
  3. **Aynı alanda iki ayrı Repository veya API dosyası açılmaz:** Veli sorguları tek `ParentVisibilityRepository.cs` içinde, koç öğrenci hook'ları tek `coachStudentsApi.js` içinde tutulur.

---

## 1. Faz 1 — Acil Hatalar ve Sözleşme Koruması (P0 / P1)

### [x] B1 — K1: `TeacherCoursesPage.jsx` Çökmesi (V17 B3 regresyonu) — P0
- **Dosya:** `Frontend/src/features/teacher/courses/TeacherCoursesPage.jsx`
- **Yap:** Silinen 4 state'in (`showCompleteModal`, `completeSummary`, `completeCoachNote`, `completeSuccessMsg`) `useState` tanımlarını geri ekle.
- **Kabul:** Ders kartı seçilince sayfa çökmez; `oxlint -D no-undef` bu dosyada 0 hata. *(Tamamlandı)*

### [x] B2 — K2: `ProgramEndpoints.cs` curriculum/progress IDOR — P0
- **Dosya:** `Backend/MentorumApi/Endpoints/ProgramEndpoints.cs:144-156`
- **Yap:** `ProgramAccessGuard.IsStudentInProgramAsync(studentId, id)` ile öğrencinin **bu programa** ait olduğunu doğrula; değilse `403`.
- **Kabul:** Koç yalnızca kendi programındaki öğrencinin müfredatını görebilir; yabancı `studentId` → 403 (`GetProgramCurriculumProgress_WhenStudentBelongsToForeignProgram_ReturnsForbidden` xUnit testi ile doğrulandı).

### [x] B3 — C1: Ödeme `amount` Uyuşmazlığı (Veri Bozulması) — P0
- **Dosyalar:** `DTOs/PaymentDtos.cs`, `Data/PaymentRepository.cs`, `CoachDashboard.jsx`, `CoachPaymentsPage.jsx`
- **Yap:**
  1. KPI hesapları: planlanan = `paidAmount + remainingAmount`, tahsil edilen = `paidAmount`, geciken/kalan = `remainingAmount`.
  2. "Tahsil Et" → `amount: item.remainingAmount`.
  3. `plan.totalAmount` → `plan.amount`.
  4. Backend `CollectPaymentAsync` başına `if (req.Amount <= 0) throw new ArgumentException(...)` (global handler → 400).
- **Kabul:** KPI'lar doğru tutarı gösterir; `amount = 0` → 400 (`CollectPayment_WhenAmountIsZeroOrNegative_ReturnsBadRequest` xUnit testi ile doğrulandı).

### [x] B3a — C1 Canlı Veri Denetimi — P0
- **Yap:** `docs/seeds/audit_zero_payments_v18.sql` altına salt-okunur denetim sorgusu ekle. *(Tamamlandı)*

### [x] B4 — C2: Veli Ödeme Bildirimi 400 — P1
- **Dosyalar:** `ParentPaymentsPage.jsx:28`, `PaymentDtos.cs:76` (`CreatePaymentClaimRequest`)
- **Yap:** Frontend'de `paymentItemId` → `itemId`.
- **Kabul:** Veli ödeme bildirimi 200 döner ve koç onay merkezine düşer (`ParentCreatePaymentClaim_WithItemId_Succeeds` xUnit testi ile doğrulandı).

### [x] B5 — C3 + C4: Veli Özeti Alan Adı Uyuşmazlıkları — P1
- **Dosyalar:** `ParentSummary.jsx`, `ParentEndpoints.cs`, `SchoolAccessRepository.cs`, `TeacherDtos.cs`
- **Yap:** Frontend `totalMinutes` / `totalQuestions` okur; `GetStudentVisibleTeacherNotesAsync` SQL'ine `courses` + `users` JOIN ile `CourseName`, `TeacherName` eklenir ve `PublicTeacherNoteDto` genişletilir. *(Tamamlandı)*

### [x] B6 — C5: Ödev Ekleri Kırık Link — P1
- **Dosyalar:** `StudentHomework.jsx`, `ParentHomework.jsx`, `HomeworkAttachmentList.jsx`, `StorageEndpoints.cs`
- **Yap:** Ad için `att.originalName`; indirme için `useDownloadUrl()`. Ortak `HomeworkAttachmentList` bileşeni kullanılır; `StorageEndpoints.cs` içinde veli için `IsParentOfStudentAsync` yetkisi doğrulanır. *(Tamamlandı)*

### [x] B7 — C6 + C7 + C8: Koç Layout / Arama / Davet / Dashboard — P1
- **Yap:** `usePendingApprovals(Boolean(user?.isAdmin))`; global arama `?q=`; davet modalında `effectiveInviteProgramId`; `CoachDashboard.jsx` içinde `HOMEWORK_EXTENSION` için `"Ödev Ek Süre Talebi"`. *(Tamamlandı)*

### [x] B8 — `OverdueHomeworkJob` Rollback + Geciken/Bekleyen Tanım Birliği — P1
- **Dosyalar:** `OverdueHomeworkJob.cs`, `HomeworkRepository.cs`, `ProgramRepository.cs`, `ReportsRepository.cs`, `StudentRepository.cs`, `TeacherRepository.cs`.
- **Yap:** `@Id` → `gen_random_uuid()`; bildirim yalnızca `due_date >= CURRENT_DATE - 7` olanlar için üretilir; 6 sorguda literal `OVERDUE` yerine `(status = 'OVERDUE' OR (status = 'PENDING' AND due_date < CURRENT_DATE))`; 2 sorguda bekleyen = `status = 'PENDING' AND due_date >= CURRENT_DATE`.
- **Kabul:** `OverdueHomeworkJob.ProcessJobsAsync()` çok koçlu program senaryosunda xUnit ile yeşil (`OverdueHomeworkJob_WithMultiCoachProgram_DoesNotThrowAndRespects7DayCutoff`).

### [x] B9 — `useCoachCompleteHomework` Alan Adı Uyuşmazlığı (`studentNotes` vs `note`) — P1
- **Dosyalar:** `Frontend/src/features/coach/api/coachExamsHomeworkApi.js:132-133`, `Backend/MentorumApi/DTOs/HomeworkDtos.cs:52-58` (`CompleteHomeworkRequest`)
- **Yap:** `coachExamsHomeworkApi.js:133` içinde gövdeyi `{ note: studentNotes, completionPercentage: 100 }` olarak düzelt.
- **Kabul:** Koç ödev tamamladığında `student_note` veritabanına kaydedilir. *(Tamamlandı)*

### [x] B10 (eski S7) — Sözleşme Sapması Koruması (`JsonUnmappedMemberHandling.Disallow` + `.oxlintrc.json`) — P0 (Faz 1'e Yükseltildi)
- **Yap:**
  1. Kritik mutasyon DTO'larına (`CompleteHomeworkRequest`, `CreatePaymentClaimRequest`, `CollectPaymentRequest`, `ToggleHabitRequest`, `UpdateCoachingToolsRequest`, `CreateCoachingSessionRequest`, `CoachReplyQuestionRequest`) `[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]` eklendi ve `Program.cs` exception handler içinde `BadHttpRequestException`/`JsonException` → `400 Bad Request` eşlemesi yapıldı.
  2. `Frontend/.oxlintrc.json` oluşturularak `"env": { "browser": true, "es2022": true }` ve `"rules": { "no-undef": "error", "no-unused-vars": "warn" }` tanımlandı.
- **Kabul:** Bilinmeyen alan içeren istek 400 döner (`CompleteHomework_ContractDriftAndOptimisticConcurrency_Return400And409` xUnit testi); `npx --prefix Frontend oxlint Frontend/src` komutu **0 warning ve 0 error** döner. *(Tamamlandı)*

---

## 2. Faz 2 — Backend Sadeleştirme (Ajan-Optimum Hibrit)

### [x] S1 — Kopya SQL Bloklarını Tekilleştir
- **Yap:** `HomeworkRepository.QueryStudentHomeworksCoreAsync`, `StudentRepository.GetStudentExamsAsync`, `PaymentRepository.QueryPlansCoreAsync`, `ApprovalRepository.ListCoreAsync` tekilleştirildi; `SchoolAccessRepository.GetStudentProgramIdAsync` silindi. *(Tamamlandı)*

### [x] S2 — Kalan Endpoint Ham SQL → Mevcut Repository'ler (Yeni Dosya Şişkinliği Olmadan)
- **Yap:** 5 endpoint dosyasındaki (`ParentEndpoints`, `HomeworkEndpoints`, `ProgramEndpoints`, `QuestionCollectionEndpoints`, `ScheduleEndpoints`) Dapper çağrıları ilgili mevcut repository'lere taşındı; `ParentRepository.cs` silinerek tüm veli sorguları `ParentVisibilityRepository.cs` içinde toplandı. *(Tamamlandı)*

### [x] S3 — `HomeworkEndpoints` Complete: Transaction + Batch + Versiyon
- **Yap:** `HomeworkRepository.CompleteHomeworkAsync` içinde tek `BeginTransaction()`, `FOR UPDATE`, `WHERE id = ANY(@UploadIds)` ve `ExpectedVersion` kontrolü (`CONCURRENCY_CONFLICT` → `409`).
- **Kabul:** Eski versiyonla gelen istek 409 döner (`CompleteHomework_ContractDriftAndOptimisticConcurrency_Return400And409` xUnit testi ile doğrulandı).

### [x] S4 — Ağır `GetStudentDetailAsync` Çağrı İsrafı
- **Yap:** `StudentEndpoints.cs` içindeki 5 uçta sahiplik için hafif `guard.GetOwnedStudentProgramAsync(coachId, studentId)` kullanıldı (`null` ise `404 NotFound`); `GetCoachingSessionsAsync` içindeki mükerrer kontrol kaldırıldı. *(Tamamlandı)*

### [x] S5 — `StudentRepository.cs` (753 toplam / 676 dolu satır) → Ajan-Optimum 2'li Bölme
- **Yap:** Koçluk araçları ve görüşme metotları `StudentCoachingToolsRepository.cs` (201 satır) içine taşındı; `StudentRepository.cs` **494 toplam satıra** indirildi. *(Tamamlandı)*

### [x] S6 — Global 403 Temizliği + Grup Yardımcıları (Net Satır Azaltımı)
- **Yap:**
  - `G3`: Endpoint'lerdeki `403` dönen 24 mükerrer `try/catch (UnauthorizedAccessException)` bloğu silindi (`404 NotFound` dönen özel catch blokları korundu).
  - `G2`: `GroupRepository.GetActiveMemberIdsAsync(groupId, tx)` eklendi ve `HomeworkRepository`, `ExamRepository`, `ScheduleRepository` içinde kullanıldı.
  - `G1`: `vw_active_student_groups` görünümü `001_schema.sql` içine eklendi, `MigrationRunner` senkron anahtarı güncellendi ve `CalendarRepository` + `ScheduleRepository` içinde kullanıldı.
  - `G4`: `Program.cs` (337 satır) Ajan-Optimum kuralı gereği bölünmedi. *(Tamamlandı)*

### [x] S8 — Backend Ölü Repository Metotları ve Ölü DTO Temizliği
- **Yap:** 4 ölü metot (`ProgramRepository.GetCoachRoleAsync`, `SchoolAccessRepository.GetGroupProgramIdAsync`, `StudySessionRepository.UpdatePrepAsync`, `TeacherRepository.GetTeacherAsync`), `ApproveCoachRequest` sınıfı ve `DummyAnchor` silindi. *(Tamamlandı)*

---

## 3. Faz 3 — Frontend Ajan-Optimum Sadeleştirme (Over-Fragmentation Yok)

### [x] F1 — `ExamsTab.jsx` (474 toplam / 447 dolu satır) — Parçalanmaz
- **Karar:** Tek `read_file` çağrısına sığar; olduğu gibi korundu. *(Tamamlandı)*

### [x] F2 — `CoachStudents.jsx` (690 → 367 toplam satır)
- **Yap:** Üstteki bağımsız Öğrenci Ekle / Davet Et Paneli `AddOrInviteStudentPanel.jsx` (325 satır) dosyasına çıkarıldı; `CoachStudents.jsx` **367 toplam satıra** indirildi. *(Tamamlandı)*

### [x] F3 — `CoachDashboard.jsx` (817 → 453 toplam satır)
- **Yap:** Orta çalışma alanı ve zaman çizelgesi `DashboardRightColumn.jsx` (361 satır) olarak ayrıldı; `CoachDashboard.jsx` **453 toplam satıra** indirildi. *(Tamamlandı)*

### [x] F8 — Frontend Parçalı API Birleştirme, Kanıtlanmış 7 Hook İsim Çakışması ve Ölü Dosya Temizliği
- **Yap:**
  1. `studentFlexibilityApi.js` içindeki 5 hook `api/coachStudentsApi.js` içine taşındı ve `studentFlexibilityApi.js` silindi.
  2. `coachApi` ↔ `studentApi` arasındaki 7 isim çakışması ve ölü alias'lar temizlendi.
  3. Ölü `InviteSharePanel/` ve `localFiles.js` dosyaları silindi. *(Tamamlandı)*

---

## 4. Test & Doğrulama Kriterleri

- [x] `dotnet build Backend/Mentorum.sln` → 0 Uyarı, 0 Hata.
- [x] `dotnet test Backend/Mentorum.sln` → Tüm testler yeşil (81 test: 76 mevcut + 5 yeni V18 testi).
- [x] `npm --prefix Frontend run build` → 0 Hata.
- [x] `npx --prefix Frontend oxlint Frontend/src` (`.oxlintrc.json` ile `no-unused-vars` + `no-undef` aktif) → **0 uyarı, 0 hata**.
- [x] B1: Ders kartı seçilince sayfa çökmez; "Dersi Tamamla" kaydeder.
- [x] B2: Koç başka programın öğrencisinin müfredatını çekemez → 403 (xUnit).
- [x] B3: KPI'lar doğru; "Tahsil Et" `remainingAmount` gönderir; `amount = 0` → 400 (xUnit).
- [x] B3a: Canlı DB bozuk ödeme kaydı denetim sorgusu (`audit_zero_payments_v18.sql`) hazır.
- [x] B4: Veli ödeme bildirimi 201/200 döner (xUnit).
- [x] B8: Çok koçlu programda `ProcessJobsAsync` rollback olmadan OVERDUE işaretler; 7 günden eski ödevler için bildirim üretilmez (xUnit).
- [x] B9 & B10: `useCoachCompleteHomework` `{ note }` gönderir; DTO'da tanımlı olmayan alan (`studentNotes` / `paymentItemId`) gönderildiğinde Backend `400 Bad Request` döner (xUnit).
- [x] S3: Eski `expectedVersion` ile ödev tamamlama → 409 (xUnit).
- [x] S6: Gereksiz 403 `catch (UnauthorizedAccessException)` blokları temizlendi ve mevcut 403 testleri yeşil.
- [x] Faz 2–3: Hiçbir dosya (`StudentRepository.cs`: 494, `CoachStudents.jsx`: 367, `CoachDashboard.jsx`: 453 dahil) **520 toplam satırı** aşmaz (en büyük dosya 505 satır).

## 5. Bitirme
- [x] bilgisayarı hazırda beklet (terminal komutu ile)
