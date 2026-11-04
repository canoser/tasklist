# TASK LIST V21 — 6–12. Sınıflar İçin Ayrı Eğitim Koçluğu Raporlama Sistemleri ve Sınıf Geçmişi (Arşiv) Mimarisi

> **Kapsam:** `mentörüm/` (Backend: ASP.NET Core .NET 9 Minimal API + Dapper + PostgreSQL · Frontend: React 19 + Vite + CSS Modules)
> **Mimari İlkeler (`AGENTS.md` & DeepSeek Review Uyumlu):**
> - **Sıfır Harici Grafik Kütüphanesi & %100 Mevcut Tema:** `recharts` vb. harici paket **kurulmaz**. Tüm görselleştirmeler mevcut ortak bileşenler (`<Card>`, `<SegmentedTabs>`, `<StatusBadge>`, `<Button>`, `<Input>`, `<Modal>`), mevcut CSS değişkenleri (`var(--bg-card)`, `var(--color-primary)`, `var(--border-color)`, `var(--text-primary)`) ve zaman serisi için hafif dahili `<svg><polyline>` yardımcısıyla inşa edilir.
> - **Tek Alan = Tek Dosya (`AGENTS.md` §A5):** Ayrı bir `AnalyticsRepository` açılmaz; mevcut `ReportsRepository.cs` ve `ReportsEndpoints.cs` genişletilir.
> - **Sıfır `dynamic` & Tam Sözleşme (`AGENTS.md` §A6):** Tüm Dapper sorguları typed C# DTO/Record döner; mutasyon DTO'larında `[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]` kullanılır.
> - **Saat Dilimi & PDF Standardı:** Tüm haftalık/günlük tarih kesimlerinde `AT TIME ZONE 'Europe/Istanbul'` kullanılır; PDF dışa aktarımda mevcut **QuestPDF** altyapısı genişletilir.
> - **Sınıf Atlatma & Geçmiş Dönem Arşivi:** Öğrenci sınıf atladığında (ör. `9. Sınıf` → `10. Sınıf`) eski sınıftaki sınav, ödev, çalışma oturumu, kaynak ve müfredat kayıtları kaybolmaz; üstteki `<SegmentedTabs>` sınıf seçicisiyle (`[ 10. Sınıf (Aktif) | 9. Sınıf (Geçmiş Dönem) | Tüm Yıllar ]`) geçmiş sınıfın koçluk raporu ve müfredatı birebir görüntülenir.

---

## Faz 1 (`V21-T1`) — Veritabanı Göçü (`003_v21_grade_reporting_and_history.sql`) ve Sınıf Damgalama (Grade Stamping)

- [x] **V21-T1-1:** `mentörüm/Backend/MentorumApi/Data/Migrations/003_v21_grade_reporting_and_history.sql` dosyasını oluştur (`MigrationRunner` yalnızca yeni `.sql` dosyalarını çalıştırdığı için `001_schema.sql`'e dokunulmaz, tüm ifadeler idempotent yazılır):
  1. **Kayıt Bazlı Sınıf Damgası (`grade SMALLINT`):**
     - `ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS grade SMALLINT NULL;`
     - `ALTER TABLE homework_assignments ADD COLUMN IF NOT EXISTS grade SMALLINT NULL;`
     - `ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS grade SMALLINT NULL;`
     - `ALTER TABLE student_resources ADD COLUMN IF NOT EXISTS grade SMALLINT NULL;`
  2. **Mevcut Kayıtların Güvenli Geriye Dönük Doldurulması (`NULL`-Güvenli Backfill):**
     - `exam_results`, `homework_assignments`, `study_sessions` ve `student_resources` tablolarında `grade IS NULL` olan satırları **yalnızca öğrencinin `students.grade IS NOT NULL` olduğu durumlarda** `s.grade` ile güncelle (`s.grade IS NULL` ise keyfi `12` atanmaz; `NULL` kalarak `"Tüm Yıllar / Sınıf Belirtilmemiş"` kapsamında korunur).
  3. **Ders Bazlı Hedef Net ve Yazılı Puan Tablosu (`student_subject_targets` — `4..13` Sınıf Aralığı):**
     ```sql
     CREATE TABLE IF NOT EXISTS student_subject_targets (
         student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
         grade SMALLINT NOT NULL CHECK (grade BETWEEN 4 AND 13),
         subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
         target_net NUMERIC(6,2) NOT NULL DEFAULT 0,
         target_score NUMERIC(6,2) NULL,
         updated_by VARCHAR(16) NOT NULL DEFAULT 'Coach'
             CHECK (updated_by IN ('Student', 'Coach')),
         updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
         PRIMARY KEY (student_id, grade, subject_id)
     );
     ```
     *(Not: `STUDENT_GRADES` sabitinde yer alan `4..12` ve `13 (Mezun)` değerlerinin tamamı `CHECK (grade BETWEEN 4 AND 13)` ile desteklenir; tablo `(student_id, grade, subject_id)` anahtarına bağlı olduğu için V20 koç eşleşmesi/ayrılması sırasında hedefler sıfır kayıpla öğrencide kalır.)*
  4. **Kurum Bazlı Net Hesaplama Modu Ayarı (`system_settings`):**
     ```sql
     INSERT INTO system_settings (key, value)
     VALUES ('net_penalty_mode', 'OFFICIAL')
     ON CONFLICT (key) DO NOTHING;
     ```
     - `'OFFICIAL'` (Varsayılan — Resmî MEB/ÖSYM Kuralı): `Okul/Diğer` → `0` (cezasız), `LGS / Ortaokul (4..8)` → `3.0` (`3 Yanlış = 1 Doğru`), `YKS / TYT / AYT / Lise (9..13)` → `4.0` (`4 Yanlış = 1 Doğru`).
     - `'NO_PENALTY'` (Cezasız Mod): Tüm sınavlarda `divisor = 0` (`Net = Doğru`).
  5. **Performans İndeksleri:**
     - `CREATE INDEX IF NOT EXISTS idx_exam_results_student_grade_date ON exam_results(student_id, grade, exam_date DESC);`
     - `CREATE INDEX IF NOT EXISTS idx_homework_student_grade_due ON homework_assignments(student_id, grade, due_date DESC);`
     - `CREATE INDEX IF NOT EXISTS idx_study_sessions_student_grade_date ON study_sessions(student_id, grade, created_at DESC);`
     - `CREATE INDEX IF NOT EXISTS idx_student_resources_student_grade ON student_resources(student_id, grade);`
- [x] **V21-T1-2:** Yazma (INSERT) yollarında öğrencinin o anki aktif `students.grade` değerini otomatik damgala:
  - `CoachRepository.CreateExamResultAsync` & `StudentRepository.AddStudentExamResultAsync` → `exam_results.grade`
  - `HomeworkRepository.AssignHomeworkAsync`, `AssignBulkHomeworkAsync` & `StudentRepository.CreateSelfHomeworkAsync` → `homework_assignments.grade`
  - `StudySessionRepository.CreateAsync` → `study_sessions.grade`
  - `StudentRepository.CreateResourceAsync` → `student_resources.grade`
- [x] **V21-T1-3:** `CurriculumRepository.GetStudentCurriculumAsync(Guid studentId, int? gradeOverride = null)` metoduna opsiyonel `gradeOverride` parametresi ekle:
  - `GET /api/v1/students/{id:guid}/curriculum?grade={optionalGrade}` (Koç) ve `GET /api/v1/student/curriculum?grade={optionalGrade}` (Öğrenci) uçları `?grade=` verildiğinde öğrencinin geçmiş veya alt sınıf müfredatını (`curriculum_topics.grade = @GradeText`) ve tamamlama durumunu döner.

---

## Faz 2 (`V21-T2`) — `NetCalculator`, Açık Matematiksel Tahmin Formülleri, Wellbeing Sütunu ve `ReportsRepository` Genişletmesi

- [x] **V21-T2-1:** `Services/NetCalculator.cs` sınıfını ortaokul/lise, `net_penalty_mode` ve açık tahmin formüllerine göre güncelle:
  1. **Bölen Kararı (`ResolveDivisor(string? examType, string? studentTrack, int? grade = null, string penaltyMode = "OFFICIAL")`)**:
     - `penaltyMode == "NO_PENALTY"` VEYA `examType IN ("Okul", "Diğer")` → **`0m`** (yanlış doğruyu götürmez).
     - `examType == "LGS"` VEYA `studentTrack IN ("ORTAOKUL", "LGS")` VEYA `(grade.HasValue && grade.Value >= 4 && grade.Value <= 8)` → **`3.0m`** (`3 Yanlış = 1 Doğru`).
     - Diğer tüm durumlarda (`9..13`, `TYT`, `AYT`, `SAY`, `EA`, `SOZ`, `DIL`) → **`4.0m`** (`4 Yanlış = 1 Doğru`).
  2. **Açık Matematiksel Tahmin Formülleri (`NetCalculator` içinde saf ve birim testli metotlar):**
     - **8. Sınıf LGS Katsayılı Puan (`ComputeLgsWeightedScore`) — `100..500` Ölçeği:**
       - MEB katsayıları: Türkçe (`4x`, 20 soru), Matematik (`4x`, 20 soru), Fen Bilimleri (`4x`, 20 soru), T.C. İnkılap (`1x`, 10 soru), Din Kültürü (`1x`, 10 soru), İngilizce (`1x`, 10 soru). Maksimum ağırlıklı net = `(20×4)×3 + (10×1)×3 = 270`.
       - Ders kırılımı varsa: `Score = Round(100m + (Clamp(WeightedNetSum, 0m, 270m) / 270m) * 400m, 2)`.
       - Sadece toplam LGS neti (`/90`) girilmişse: `Score = Round(100m + (Clamp(totalNet, 0m, 90m) / 90m) * 400m, 2)`.
     - **9–12. Sınıf OBP (Ortaöğretim Başarı Puanı) Katkısı (`ComputeObpContribution`) — `0..60` Ölçeği:**
       - Okul yazılı sınavlarının (`exam_type = 'Okul'`) `0..100` üzerinden ortalaması `SchoolAvg` alınır.
       - Resmî ÖSYM formülü (`DiplomaNotu × 5 × 0.12 = DiplomaNotu × 0.6`): `EstimatedObpContribution = Round(Clamp(SchoolAvg, 50m, 100m) * 0.6m, 2)` (yazılı verisi yoksa `0m` döner ve arayüzde `"Yazılı notu girildiğinde hesaplanır"` yazar).
     - **10. Sınıf Alan Seçimi Eğilim Skorları (`ComputeTrackAptitudeScores`) — `0..100` Ölçeği:**
       - Her branş grubu için bileşik yetkinlik skoru: `GroupScore = (0.55 × SınavBaşarıYüzdesi) + (0.30 × ÇalışmaSoruDoğrulukYüzdesi) + (0.15 × MüfredatKonuTamamlamaYüzdesi)`.
       - `AptitudeSayScore = Round(0.50m * MatScore + 0.50m * FenScore, 1)`
       - `AptitudeEaScore = Round(0.50m * MatScore + 0.35m * TurkceEdbScore + 0.15m * SosyalScore, 1)`
       - `AptitudeSozScore = Round(0.50m * TurkceEdbScore + 0.50m * SosyalScore, 1)`
       - En yüksek skora sahip alan (`SAY`, `EA`, `SOZ`) `RecommendedTrack` olarak döner.
     - **12. Sınıf & Mezun YKS Birleşik Yerleştirme Puan Tahmini (`ComputeYksCombinedEstimate`) — `100..560` Ölçeği:**
       - ÖSYM ağırlıkları (`%40 TYT + %60 AYT + OBP`):
       - `HamPuan = 100m + (Clamp(LastTytNet, 0m, 120m) / 120m * 160m) + (Clamp(LastAytNet, 0m, 80m) / 80m * 240m)`
       - `CombinedYksEstimate = Round(HamPuan + (EstimatedObpContribution > 0 ? EstimatedObpContribution : 48m), 2)`.
- [x] **V21-T2-2:** `DTOs/ReportDtos.cs` içine typed sözleşme sınıflarını ekle (`dynamic` kullanılmaz):
  - `StudentGradeReportDto`:
    - `StudentId`, `StudentName`, `CurrentGrade`, `SelectedGrade` (`4..13` veya `0 = Tüm Yıllar`), `AvailableGrades` (`List<int>`), `Track`, `TargetUniversity`, `TargetDepartment`, `TargetScore`
    - `Profile`: `GradeProfileMetaDto` (`SystemCode`, `SystemTitle`, `Subtitle`, `PrimaryFocusBadge`, `WrongPenaltyRule`)
    - `Kpis`: `List<GradeKpiCardDto>` (`Id`, `Label`, `Value`, `Unit`, `Subtext`, `StatusTone`)
    - `Insights`: `List<CoachingInsightDto>` (`Severity`, `Title`, `Message`)
    - `Wellbeing`: `WellbeingSummaryDto` *(Tüm sınıflarda ortak 7. Sütun — İyi Oluş & Motivasyon)*:
      - `RecentCheckinCount` (Son 14 gün `student_checkins` sayısı)
      - `DominantMood` (`GREAT`, `GOOD`, `OKAY`, `TIRED`, `STRESSED` vb.)
      - `PositiveMoodRate` (`%` pozitif duygu oranı)
      - `CompletedGrowSessionsCount` (`coaching_sessions` toplamı)
      - `LastGrowSessionDate`, `LastGrowGoalSummary`
    - `ExamSeries`: `List<ExamProgressionPointDto>` (`ExamId`, `ExamName`, `ExamType`, `ExamDate`, `Grade`, `TotalNet`, `SchoolScoreAverage`, `LgsWeightedScore`)
    - `SubjectMastery`: `List<SubjectMasteryItemDto>` (`SubjectId`, `SubjectName`, `TopicCompletionPercent`, `CompletedTopics`, `TotalTopics`, `StudyMinutes`, `SolvedQuestions`, `SuccessRate`, `AvgExamNet`, `LastExamNet`, `SchoolWrittenAvg`, `TargetNet`, `NetGap`)
    - `ErrorReasons`: `List<ErrorReasonStatDto>` (`Reason`, `Count`, `Percentage`)
    - `GradeModule`: `GradeSpecificModuleDto` (6, 7, 8, 9, 10, 11 ve 12/Mezun sınıflarına özel metrikler)
  - `UpsertSubjectTargetsRequest` (`[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]`): `Grade`, `Targets` (`List<SubjectTargetInputDto>`).
  - `GradeCohortSummaryDto`: Koçun `Raporlar ve Analizler` sayfasında öğrencileri sınıflara göre (`4..13`) gruplayan ve risk durumunu gösteren özet DTO.
- [x] **V21-T2-3:** `ReportsRepository.cs` ve `ReportsEndpoints.cs` içine yeni uçları (`Europe/Istanbul` zaman dilimi duyarlı sorgularla) ve yetkilendirme kontrollerini ekle:
  - `GET /api/v1/reports/students/{id:guid}/grade-report?grade={optionalGrade}`
    - **Yetki:** Koç (`program_coaches` sahipliği), Öğrencinin kendisi (`userId == id`, hem koçlu hem V20 bağımsız öğrenci) veya onaylı Veli (`student_parents.is_accepted = 1`).
  - `PUT /api/v1/reports/students/{id:guid}/subject-targets`
    - **Yetki:** Koç (`program_coaches` sahipliği) veya Öğrencinin kendisi (`!hasCoach || canEditGoals`).
  - `GET /api/v1/reports/cohort-by-grade?grade={optionalGrade}`
    - **Yetki:** Koç (`RequireCoachRole`).

---

## Faz 3 (`V21-T3`) — Mevcut Tema ve Ortak Bileşenlerle Sınıf Duyarlı Rapor Arayüzü (Koç, Öğrenci, Veli & QuestPDF)

- [x] **V21-T3-1:** Ortak `GradeReportDashboard.jsx` bileşenini (`src/components/common/GradeReportDashboard/GradeReportDashboard.jsx`) mevcut `<Card>`, `<SegmentedTabs>`, `<StatusBadge>`, `<Button>`, `<Input>`, `<Modal>` ve tema değişkenleriyle oluştur:
  1. **Üst Bar — Sınıf Dönemi (Arşiv) Seçici (`<SegmentedTabs>`):**
     - Öğrencinin aktif sınıfı (`🟢 10. Sınıf (Aktif)`), verisi bulunan geçmiş sınıfları (`📁 9. Sınıf (Geçmiş Dönem)`) ve `📊 Tüm Yıllar (Kümülatif)` sekmeleri.
     - Yanında sınıfın sistem rozeti (ör. `"🟡 8. Sınıf — LGS Tam Saha Performans Sistemi · 3 Yanlış = 1 Doğru"`).
  2. **Akıllı Koçluk Teşhis Bandı (`Insights`):**
     - Seçili sınıfın kurallarına göre üretilen eyleme dönüştürülebilir koçluk teşhisleri.
  3. **4'lü Sınıf KPI Kartları + Sınıfa Özel Ana Modül Kartı (`GradeModule`) + İyi Oluş (`Wellbeing`) Kartı:**
     - 6, 7, 8, 9, 10, 11 ve 12/Mezun sınıflarının her biri için kendi özel kart düzeni + tüm sınıflarda `student_checkins` ve `GROW` seanslarını özetleyen **İyi Oluş & Motivasyon** kartı.
  4. **Dahili `<svg><polyline>` Net / Yazılı Gelişim Çizgi Grafiği & Hata Nedenleri (`error_reasons`) Kartı:**
     - Harici kütüphane olmadan hafif dahili `<svg><polyline>` + hedef çizgisi (`stroke-dasharray`) ile 11–12. sınıfta TYT ve AYT ayrı serili trend; 8. sınıfta LGS net & katsayılı puan trendi; 6, 7, 9, 10. sınıfta Okul Yazılı Ortalaması + Deneme trendi.
  5. **Ders Bazlı Başarı, Müfredat Kapsamı ve Hedef Net (`Gap`) Tablosu + Hedef Belirleme Modalı:**
     - Her ders için `Tamamlanan Konu %`, `Çözülen Soru & Doğruluk %`, `Son Net / Yazılı`, `Hedef Net` ve `Fark (Gap)` çubuğu + `🎯 Ders Hedeflerini Düzenle` butonu.
- [x] **V21-T3-2:** Mevcut sayfalara entegrasyon ve geçmiş sınıf müfredat erişimi:
  - **Koç Raporlar Sayfası (`CoachReports.jsx`):** Üste sınıf filtresi (`Tümü | 6. Sınıf | ... | 12. Sınıf | Mezun`) ve sınıf kohort özeti ekle; öğrenci seçildiğinde doğrudan `GradeReportDashboard` bileşenini göster.
  - **Koç Öğrenci Detay (`CoachStudentDetail.jsx` & `TopicsTab.jsx`):**
    - `Akademik Takip` grubuna `📊 Sınıf Karnesi & Analiz` sekmesi ekle (`GradeReportDashboard`).
    - `TopicsTab.jsx` (Konular) içine sınıf seçici (`Aktif Sınıf` + `Geçmiş Sınıflar / 9–12 TYT-AYT`) ekle; böylece öğrenci sınıf atladığında koç eski sınıfın konularını da görebilsin ve işaretleyebilsin.
  - **Öğrenci Paneli (`/student/reports` — `StudentReportsPage.jsx` & `StudentCoursesPage.jsx`):**
    - Öğrenci sol menüsüne (`Sidebar` / `BottomNav`) `Raporum & Gelişimim` (`/student/reports`) rotasını ekle; içeride `GradeReportDashboard` çalışsın (hem koçlu hem V20 bağımsız öğrenciler için).
    - `StudentCoursesPage.jsx` (`Müfredat Konularım`) sekmesine sınıf seçici ekle; sınıf atlayan öğrenci geçmiş sınıf konularına da ulaşabilsin.
  - **Veli Özeti (`ParentSummary.jsx`) & QuestPDF (`StudentReportPdfGenerator.cs`):**
    - Veli özet ekranında ve **QuestPDF** ile üretilen PDF raporunda öğrencinin sınıf sistemine uygun başlık, yanlış-doğru kuralı, wellbeing özeti ve ders başarı tablosunu göster.

---

## Faz 4 (`V21-T4`) — Testcontainers Entegrasyon ve Playwright Gerçek Tarayıcı Doğrulaması

- [x] **V21-T4-1:** Backend entegrasyon testi (`V21GradeReportingAndHistoryTests.cs`):
  - `NetCalculator` birim/entegrasyon doğrulamaları: `OFFICIAL` vs `NO_PENALTY` modu, `3Y=1D` (ortaokul 6–8) vs `4Y=1D` (lise 9–13) vs `Okul Yazılısı` (`0` bölen), 8. sınıf LGS katsayılı puan (`100..500`), 9. sınıf OBP katkısı (`0..60`), 10. sınıf `SAY/EA/SOZ` alan eğilim formülü, 12. sınıf YKS birleşik tahmin formülü.
  - **Sınıf Atlatma ve Arşiv Testi:** 9. sınıf öğrencisine sınav, ödev ve konu ilerlemesi girildikten sonra öğrencinin sınıfı `10` yapıldığında; `?grade=9` ile 9. sınıf raporunun ve 9. sınıf müfredatının sıfır veri kaybıyla döndüğünü, `?grade=10` ile 10. sınıf profilinin açıldığını doğrula.
- [x] **V21-T4-2:** Playwright E2E testi (`Frontend/e2e/v21-grade-reporting.spec.js`):
  - Koç ve Öğrenci ekranlarında sınıf bazlı rapor sisteminin açılması, ders hedef neti girilmesi, öğrencinin sınıfının `9` → `10` olarak atlatılması ve `9. Sınıf (Geçmiş Dönem)` sekmesinden eski kayıtların görüntülenmesi akışını gerçek Chromium tarayıcıda doğrula.
- [x] **V21-T4-3:** Kalite kapısı doğrulaması (`AGENTS.md` §C3):
  - `dotnet build` (`0 Uyarı, 0 Hata`)
  - `dotnet test` (`Tüm testler başarılı`)
  - `npm run build` (`Başarılı`)
  - `npx oxlint src e2e` (`0 warning, 0 error`)
