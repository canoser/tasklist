# 🧹 Kod Sadelik Denetim Raporu 2 (V17 Sonrası Baştan Tarama)

> **İnceleyen:** DeepSeek - Cline · **Tarih:** 29 Ekim 2026
> **Kapsam:** V17 refaktörü sonrası tüm `Backend` + `Frontend` + `Migrations` baştan taranmıştır. Silme değil, tespit + fikir.

---

## 1. Özet

V17 hedeflerinin **önemli bir kısmı başarıyla uygulandı** (God-endpoint bölündü, migration birleşti, roster SQL view'e taşındı, contract hataları düzeldi). Ancak **"sadelik" hedefi tam karşılanmadı**: aynı God-bileşen kalıbı **6+ dosyada sürüyor** ve backend **God-repo'ları büyüdü**.

---

## 2. ✅ V17 Başarıları (bağımsız doğrulandı)

| Metrik | Önce | Sonra |
|---|---|---|
| `StudentEndpoints.cs` | 730 | 368 (+ `StudentPortalEndpoints.cs` 243) |
| `AuthEndpoints.cs` | 462 | 262 |
| `CoachStudentDetail.jsx` | 1313 | 262 |
| `StudyTimerCard.jsx` | 413 | 148 |
| `GetUserId` kopyası | 11 | 1 |
| `ClaimTypes.NameIdentifier` | ~74 | 5 |
| Migration dosyası | 27 | 1 (idempotent + geçiş anahtarı) |
| Roster SQL (UNION) | ~10 | 1 view (`vw_active_course_students`, 19 kullanım, 4 kalıntı) |
| `console.log` | — | 0 |

---

## 3. ⚠️ Kalan Spagetti Tespitleri

### 3.1 Frontend God-bileşenler — DOKUNULMADI (V17 hedef listesinde yoktu)

| Satır | Dosya | İçerik tahmini |
|---|---|---|
| **754** | `CoachDashboard.jsx` | KPI şeridi + timeline + çoklu kart tek dosya |
| **642** | `CoachStudents.jsx` | liste + filtre + davet + silme + kart |
| **476** | `CoachTeacherDetailPage.jsx` | — |
| **456** | `AdminPanelPage.jsx` | çoklu sekme tek dosya |
| **454** | `CoachLayout.jsx` | layout + üst bar + navigasyon + arama |
| **420** | `TeacherCoursesPage.jsx` | — |

### 3.2 Yeni çıkarılan bileşen de God-bileşen

- **`ExamsTab.jsx` = 447 satır** — `CoachStudentDetail` bölündü ama sınav sekmesi (D/Y/B formu + geçmiş + Pareto şeridi) tek başına 447 satır. Bölme "dosya taşıma" düzeyinde kalmış; state/UI ayrışmamış.
- `SwotAndWheelPanel.jsx` = 362 satır (bölünmüş ama kendi içinde büyük).

### 3.3 Backend God-repo'ları BÜYÜDÜ

| Satır | Dosya | Not |
|---|---|---|
| **676** | `StudentRepository.cs` | 528 → **676** (S2 raw SQL'i endpoint'ten repo'ya taşıdı → repo şişti) |
| **441** | `CalendarRepository.cs` | — |
| **402** | `TeacherRepository.cs` | — |
| **402** | `SchoolAccessRepository.cs` | — |
| **355** | `PaymentRepository.cs` | — |

> **Kök neden:** S2/S3 ham SQL'i endpoint'ten repository'e taşıdı (doğru yön) ama repository'ler **kendi içinde bölünmedi** → endpoint inceldi, repo kalınlaştı. Şişkinlik taşındı, yok edilmedi.

### 3.4 Residual katman ihlali (ham SQL hâlâ endpoint'te)

| Dosya | Ham SQL/Dapper |
|---|---|
| `ParentEndpoints.cs` | 18 |
| `HomeworkEndpoints.cs` | 17 |
| `ProgramEndpoints.cs` | 6 |

> S3 yalnızca `AuthEndpoints` + `InviteEndpoints` yaptı; `ParentEndpoints` ve `HomeworkEndpoints` kaldı (ilgili repository'ler zaten mevcut).

### 3.5 Küçük

- `TODO/FIXME/HACK`: 13 (kabul edilebilir ama temizlenebilir).
- `console.log`: 0 ✓.

---

## 4. Kök Neden Analizi

V17 **"hedefli God-dosya"** düzeltmesi yaptı (belirli 3-4 dosyayı böldü), ama:

1. **Aynı kalıp başka dosyalarda sürüyor** (CoachDashboard 754, CoachStudents 642…). Bölme işlemi tek dosyaya odaklanmış; sistem geneline yayılmamış.
2. **SQL taşıması şişkinliği taşıdı** — endpoint → repository doğru yön, ama repository kendi içinde bölünmedi (StudentRepository 676).
3. **Bölünen bileşenler kendi içinde büyük** (ExamsTab 447) — çünkü yalnızca JSX taşındı; state/hook mantığı ve alt formlar ayrıştırılmadı.

---

## 5. Önceliklendirilmiş Öneriler (fikir — kod değişikliği yok)

| Öncelik | Aksiyon |
|---|---|
| 🔴 1 | `StudentRepository.cs` (676) böl: `StudentCoreRepo` + `StudentExamRepo` + `StudentParentRepo` + `StudentFlexibilityRepo` |
| 🔴 2 | `ParentEndpoints`/`HomeworkEndpoints` ham SQL → mevcut `ParentRepository`/`HomeworkRepository`'ye taşı |
| 🟡 3 | `CoachDashboard.jsx` (754) → KPI şeridi + timeline + rapor kartları alt bileşenleri |
| 🟡 4 | `CoachStudents.jsx` (642) → liste + filtre + davet + kart alt bileşenleri |
| 🟡 5 | `ExamsTab.jsx` (447) → sınav formu + geçmiş + Pareto alt bileşenleri |
| 🟢 6 | `CoachTeacherDetailPage`, `AdminPanelPage`, `CoachLayout`, `TeacherCoursesPage` |

---

## 6. Sonuç

V17 **büyük kazanım** sağladı (güvenlik/contract + migration birleştirme + GetUserId + roster view + iki God-dosya bölünmesi). Ancak "sadelik" yol haritasının **~yarısı kaldı**: 6+ God-bileşen + büyüyen God-repo'lar + 2 endpoint'te ham SQL. Bir sonraki tur (V18) bu kalanları hedeflemeli; özellikle **StudentRepository bölünmesi** ve **Parent/Homework endpoint'lerindeki ham SQL taşınması** en yüksek değerli adımlardır.


---

## 7. Gemini (Antigravity) — Bağımsız Doğrulama ve Ek Fikirler (Rapor 2)

> **Değerlendiren:** Gemini (Antigravity) · **Tarih:** 30 Ekim 2026
> **Yöntem:** Yukarıdaki hiçbir satır silinmedi/değiştirilmedi. Rapor 2'deki sayılar kaynak koda karşı yeniden ölçüldü; çelişkiler ve ek bulgular aşağıya eklendi. Kod değişikliği yapılmadı.

### 7.1 Doğrulama Tablosu

| Rapor 2 İddiası | Gemini Ölçümü | Sonuç |
|---|---|---|
| V17 başarıları (§2) | Build 0/0, test 76/76, oxlint 0, `Endpoints/*.cs` içinde `FindFirst(NameIdentifier)` = 0 | ✅ Doğru |
| `ClaimTypes.NameIdentifier` = 5 (§2) | 5 geçiş var ama **hepsi meşru**: `ClaimsPrincipalExtensions.cs:9` (tek kaynak), `IdempotencyFilter.cs:101`, `JwtValidationMiddleware.cs:22`, `ViewAsMiddleware.cs:26` (okuma), `ViewAsMiddleware.cs:140` (claim **üretme**) | ✅ Doğru, aksiyon gerekmez |
| `console.log` = 0 | Doğrulandı | ✅ |
| **`TODO/FIXME/HACK` = 13 (§3.5)** | Gerçek sayı **1**: `InviteSharePanel.jsx:8` (`[MOBILE_PORT_TODO]`, Capacitor notu). Diğer 12 eşleşme büyük/küçük harf duyarsız regex yanılgısı (`autoDoFirst`, `tickLabelTodo`, `applyThemeToDom`) | ❌ **Düzeltme:** 13 değil 1 |
| `StudentRepository.cs` 676 (§3.3) | `Get-Content` toplam satır: **753** (boş satırlar dahil). 528→676 farkı ölçüm yöntemi (boşsuz) farkı; büyüme yönü ve sonuç doğru | ⚠️ Büyüklük sırası aynı |
| `CoachDashboard.jsx` 754 / `CoachStudents.jsx` 642 / `ExamsTab.jsx` 447 | Toplam satır: **815 / 680 / 474** | ⚠️ Aynı not (boşsuz ölçüm) |
| Ham SQL endpoint'te: Parent 18, Homework 17, Program 6 (§3.4) | Dapper çağrısı sayısı: **Parent 11, Homework 8, Program 4**, ek olarak `QuestionCollectionEndpoints` 1, `ScheduleEndpoints` 1 | ⚠️ Yön doğru, sayılar şişirilmiş; **iki ek dosya** listede yok |
| Roster view 19 kullanım, 4 kalıntı (§2) | View kullanımı **19 ✅**; kalıntı `student_group_members` doğrudan kullanımı **Data/ içinde ~22 satır** (aşağıda sınıflandırıldı) | ⚠️ "4 kalıntı" eksik tahmin |

### 7.2 Yeni Bulgu — View'a Geçmeyen `student_group_members` Kalıntıları (Sınıflandırılmış)

`vw_active_course_students` yalnızca "kurs → öğrenci" kümesi içindir; aşağıdaki kullanımların bir kısmı **kasıtlı** (grup → öğrenci), bir kısmı **gerçek tekrar**:

| Konum | Sorgu | Karar |
|---|---|---|
| `CalendarRepository.cs:206, 223, 231` ve `ScheduleRepository.cs:322` | `s.group_id IN (SELECT group_id FROM student_group_members WHERE student_id = @X AND is_active = 1)` | 🟡 **4 kez tekrar** — `vw_active_student_groups(student_id, group_id)` görünümü ile tekilleştirilebilir (S7'nin devamı). `is_active=1` var, güvenlik açığı yok. |
| `HomeworkRepository.cs:63`, `ExamRepository.cs:41`, `ScheduleRepository.cs:135` | `SELECT student_id FROM student_group_members WHERE group_id = @GroupId AND is_active = 1` | 🟡 **3 kez aynı sorgu** — `GroupRepository.GetActiveMemberIdsAsync(groupId, tx)` tek metoduna toplanmalı. |
| `ScheduleRepository.cs:159` | `UNION ... sgm.is_active = 1` (hedef öğrenci çözümleme) | 🟢 Kasıtlı özel sorgu, kalabilir. |
| `TeacherRepository.cs:320` | `JOIN student_group_members sgm ...` | 🟡 Satır 320 çevresindeki `is_active = 1` filtresinin varlığı V18'de yeniden doğrulanmalı (V17 B2'deki `TeacherRepository.cs:48` yanlış alarmı örneği gibi, önce ölç sonra karar ver). |
| `GroupRepository`, `StudentRepository` yazma/okuma | Üyelik CRUD | ✅ Beklenen (S7 kabul kriteri). |

### 7.3 Yeni Bulgu — Endpoint'lerdeki Tekrarlanan Catch Kalıbı (V17 Y10 açık kaldı)

- `catch (UnauthorizedAccessException)` → 403 kalıbı `Endpoints/*.cs` içinde hâlâ **39 kez** (V17 Y10'da 29 ölçülmüştü; endpoint bölünmeleriyle artmış).
- **Fikir:** Tek bir `UnauthorizedAccessException → Results.Forbid()` eşlemesi **global exception handler/`IExceptionHandler`** ile merkezileştirilirse 39 `try/catch` bloğu silinir. Rapor 2 §3.4'teki repository taşımalarından **önce** yapılması önerilir, çünkü taşınan endpoint gövdeleri de aynı kalıbı kopyalıyor.
- Dikkat: Mevcut testler 403 davranışına bağımlı; davranış (`status code` + gövde) birebir korunmalı.

### 7.4 Rapor 2 Öneri Önceliklerine Gemini Değerlendirmesi

| Rapor 2 Önerisi | Gemini Görüşü |
|---|---|
| 🔴 1 — `StudentRepository` böl (4 repo) | **Katılıyorum, ama bölme sınırı iş alanına göre olmalı.** Önerilen 4 isimden `StudentFlexibilityRepo` belirsiz; mevcut metot gruplarına bakarak (profil / koçluk araçları / alışkanlık / soru / görüşme) `StudentCoachingToolsRepository` (S2'de eklenen 5 metot + sorular + oturumlar) çıkarılması en az riskli ilk adımdır. `StudentRepository` public API'si `IStudentRepository` üzerinden sabit kalacağı için DI kaydı ve endpoint'ler değişmez. |
| 🔴 2 — Parent/Homework ham SQL → repo | **Katılıyorum.** Gerçek kapsam: Parent 11 + Homework 8 + Program 4 + Question 1 + Schedule 1 = **25 Dapper çağrısı**, 5 dosya. Rapor 2'deki 41 değil. S3 kalıbıyla aynı sıra: önce repo metodu + test, sonra endpoint inceltme. |
| 🟡 3/4/5 — `CoachDashboard`, `CoachStudents`, `ExamsTab` | **Katılıyorum.** Sıralama önerisi: `ExamsTab` (V17 ile yeni çıkan; aynı kalıp, tam bağlam elde) → `CoachStudents` → `CoachDashboard`. `ExamsTab` içinde state'ler (`useExamForm` hook) ve JSX (`ExamForm`, `ExamHistory`, `ParetoStrip`) ayrılırsa V17 S5'in "dosya taşıma" eleştirisi kapanır. |
| 🟢 6 — Diğer 4 sayfa | **Ertele.** `CoachTeacherDetailPage` (505), `CoachLayout` (484), `AdminPanelPage` (477), `TeacherCoursesPage` (449) tek sorumluluklu; büyüklük tek başına spagetti değildir. Yalnızca değişiklik gerektiğinde bölünsün. |

### 7.5 Raporda Olmayan, V18'e Önerilen Ek Maddeler

| ID | Madde | Risk | Getiri |
|---|---|---|---|
| **V18-G1** | `vw_active_student_groups` görünümü + 4 `IN (SELECT group_id ...)` kalıbının tekilleştirilmesi | Düşük | Orta |
| **V18-G2** | `GroupRepository.GetActiveMemberIdsAsync` ile 3 mükerrer üye-listesi sorgusu | Çok düşük | Orta |
| **V18-G3** | 39 `catch (UnauthorizedAccessException)` → global `IExceptionHandler` | Orta (test bağımlı) | Yüksek |
| **V18-G4** | `Program.cs` 324 satır (V17 hedefi ~270 idi) → servis kayıtlarını `Extensions/ServiceCollectionExtensions.cs` + `app.MapAllEndpoints()` içine al | Düşük | Orta |
| **V18-G5** | `coachSchoolApi.js` 335 satır — V17 S4 `coachApi.js` ile aynı kalıp, bölünmedi | Düşük | Düşük |
| **V18-G6** | `AuthRepository.cs` 331 satır — S3'te endpoint'ten taşınan SQL, auth akışı için tek dosya kabul edilebilir; bölme ancak test kapsamı artarsa | — | Ertele |

### 7.6 Ölçüm Metodu Notu (Karar Gerekli)

Rapor 2 ile V17 sayıları arasındaki farklar (676 vs 753 gibi) **boş satır sayımından** doğuyor. V18 kabul kriterleri için tek yöntem seçilmeli: öneri **`Get-Content | Measure-Object -Line`** (boş satırlar hariç, bu PowerShell sürümünde) **veya** toplam satır. Aksi halde "<300 satır" gibi kriterler araçtan araca tutarsız ölçülür.

### 7.7 Gemini Sonucu

Rapor 2'nin yönü doğru ve V17 sonrası değerlendirmesi (**"şişkinlik taşındı, yok edilmedi"**) isabetli. Düzeltilmesi gerekenler: **TODO sayısı 13 değil 1**, ham SQL sayıları şişirilmiş (gerçek **25 Dapper çağrısı / 5 dosya**), "4 kalıntı" yerine **~7 gerçek tekrar** (4 + 3). En yüksek değerli V18 sırası: **V18-G3 (global exception handler)** → **StudentRepository'den `StudentCoachingToolsRepository` çıkarma** → **Parent/Homework/Program ham SQL taşıma** → **ExamsTab state/UI ayrıştırma**.


---

## 8. Gemini (Antigravity) — Çok Detaylı Derinlemesine Tarama: Kritik Hatalar, Sözleşme (Contract) Uyumsuzlukları ve Mimari Sadeleştirme Bulguları

> **Değerlendiren:** Gemini (Antigravity — Derinlemesine Kod & Sözleşme Taraması) · **Tarih:** 30 Ekim 2026
> **Yöntem:** §1–§7'deki hiçbir satır silinmeden, yalnızca satır sayısı (LOC) metrikleriyle yetinilmeyip tüm Backend (Endpoint + Repository + DTO + SQL) ve Frontend (Bileşen + API Hook + Payload/Response) katmanları uçtan uca çapraz denetlendi (`npx oxlint -A all -D no-undef` dahil). Kod değişikliği yapılmadı.

---

### 8.1 🔴 KRİTİK ÇALIŞMA ZAMANI ÇÖKMESİ (Runtime Crash) & GÜVENLİK (IDOR) AÇIKLARI (`P0`)

| # | Konum | Bulgu | Kök Neden & Etki | Çözüm Önerisi |
|---|---|---|---|---|
| **K1** | `Frontend/src/features/teacher/courses/TeacherCoursesPage.jsx:144-250` | **V17 `B3` Regresyonu — `ReferenceError: showCompleteModal is not defined` (Runtime Crash)** | Rapor 1 (§3.2.5) ve V17 `B3`, `TeacherCoursesPage.jsx:63-66`'daki 4 state'i (`showCompleteModal`, `completeSummary`, `completeCoachNote`, `completeSuccessMsg`) "hiç okunmuyor" diye işaretlemişti. Oysa dosyanın `144-250` satırlarındaki **"✓ Dersi Tamamla"** butonu ve modalı bu 4 state ve 4 setter'a toplam **18 kez** başvuruyor. `useState` tanımları silindiği için öğretmen herhangi bir ders kartına tıkladığında (`selected` dolu olduğunda) bileşen anında `ReferenceError` ile çöküyor (`oxlint -D no-undef` ile doğrulandı). | `TeacherCoursesPage.jsx` içine 4 `useState` tanımı geri eklenmeli; daha iyisi `159-250` arasındaki modal kendi state'leriyle `<CompleteLessonModal course={selected} />` alt bileşenine (veya tek bir form state nesnesine) çıkarılmalı. |
| **K2** | `Backend/MentorumApi/Endpoints/ProgramEndpoints.cs:144-157` & `CurriculumRepository.cs:81-147` | **Cross-Tenant IDOR Açığı (`Bölüm A3` İhlali)** | `GET /api/v1/programs/{id:guid}/curriculum/progress?studentId=...` uç noktası yalnızca koçun `id` programına sahip olduğunu doğruluyor (`GetProgramAsync(id, coachId.Value)`), ardından `studentId` parametresinin bu programa veya koça ait olup olmadığını **hiç kontrol etmeden** `curriculumRepo.GetStudentCurriculumAsync(studentId)` çağırıyor. Kendi program ID'sini bilen herhangi bir koç, başka bir koçun/programın öğrencisine ait `studentId` GUID'ini vererek o öğrencinin müfredat ilerlemesini, ödev sayılarını ve deneme netlerini okuyabilir. | `ProgramEndpoints.cs:153` öncesinde `await guard.EnsureCoachOwnsStudentAsync(coachId.Value, studentId)` (veya öğrencinin `program_id == id` doğrulaması) zorunlu kılınmalı. |

---

### 8.2 🔴 AKTİF FRONTEND ↔ BACKEND SÖZLEŞME (CONTRACT) VE VERİ BOZULMASI HATALARI (`P0` / `P1`)

V17'de koç öğrenci detayındaki 6 sözleşme hatası düzeltilmişti; ancak **Finans/Ödeme**, **Veli Portalı**, **Ödev Ekleri** ve **Koç Arama/Onay** akışlarında aktif sözleşme uyuşmazlıkları tespit edildi:

| # | Frontend Konumu | Backend Konumu | Sözleşme Uyuşmazlığı & Etkisi | Çözüm Önerisi |
|---|---|---|---|---|
| **C1** | `CoachPaymentsPage.jsx:42, 66, 253, 279` & `CoachDashboard.jsx:143` | `DTOs/PaymentDtos.cs:42, 50-63` & `PaymentRepository.cs:258-300` | **Finans KPI'ları `₺0` Görünüyor + "Tahsil Et" Taksiti Bozuyor (`item.amount` / `plan.totalAmount` Yok):** Backend `PaymentItemDto` içinde `baseAmount`, `paidAmount`, `remainingAmount` döner (`amount` alanı **yok**); `PaymentPlanDto` içinde `amount` döner (`totalAmount` alanı **yok**).<br>1) `CoachDashboard.jsx:143` ve `CoachPaymentsPage.jsx:42, 279` `item.amount` okuduğu için (`undefined` → `0`) tüm finans KPI kartları (`TOPLAM PLANLANAN`, `TAHSİL EDİLEN`, `GECİKEN TAHSİLAT`, `FİNANS & TAHSİLAT`) ve taksit satırları **`₺0`** gösteriyor.<br>2) **Veri Bozulması:** `CoachPaymentsPage.jsx:62-69` (`handleCollect`) "Tahsil Et" butonuna basıldığında `amount: item.amount` (`undefined` → C# tarafında `0m`) gönderiyor. `PaymentRepository.CollectPaymentAsync` (`258-300`) `0 TL` tahsilat kaydedip statüyü `PARTIAL` yapıyor ve **taksitin tamamını (`remaining`) bir sonraki `PENDING` taksite devrederek (`rollover_amount`) ödeme planını bozuyor!** | Frontend'de:<ul><li>Taksit tutarı için `item.baseAmount + item.rolloverAmount` (veya kalan için `item.remainingAmount`, ödenen için `item.paidAmount`) kullanılmalı.</li><li>`handleCollect(item)` çağrısında `amount: item.remainingAmount` gönderilmeli + Backend `CollectPaymentAsync` içinde `if (req.Amount <= 0) throw new InvalidOperationException(...)` doğrulaması eklenmeli.</li><li>`plan.totalAmount` yerine `plan.amount` okunmalı.</li></ul> |
| **C2** | `ParentPaymentsPage.jsx:28` | `DTOs/PaymentDtos.cs:76` & `PaymentRepository.cs:364` | **Veli "Ödeme Bildir" Her Zaman HTTP 400 Veriyor (`paymentItemId` ↔ `itemId`):** Frontend `{ paymentItemId: item.id, amount, note }` gönderiyor; Backend `CreatePaymentClaimRequest` ise `ItemId` (`itemId`) bekliyor. `req.ItemId` `Guid.Empty` olarak deserialize edildiği için `PaymentRepository.cs:364` her zaman `"Ödeme kalemi bulunamadı."` (`400 Bad Request`) fırlatıyor. | `ParentPaymentsPage.jsx:28` içinde alan adı `itemId: item.id` yapılmalı (veya DTO/Frontend tek sözleşmede eşitlenmeli). |
| **C3** | `ParentSummary.jsx:82, 91` | `ParentEndpoints.cs:210-214` | **Veli Özeti Çalışma İstatistikleri Her Zaman `0 dk` ve `0` Soru Gösteriyor:** Backend `/api/v1/parent/children/{id}/study-stats` uç noktası `{ totalMinutes, totalQuestions }` dönerken `ParentSummary.jsx` `studyStats.thisWeekStudyMinutes` ve `studyStats.thisWeekQuestionCount` okuyor (`undefined` → `0`). | `ParentSummary.jsx:82, 91` `studyStats.totalMinutes` ve `studyStats.totalQuestions` okuyacak şekilde düzeltilmeli. |
| **C4** | `ParentSummary.jsx:126, 133` | `SchoolAccessRepository.cs:375-384` (`PublicTeacherNoteDto`) | **Veli Özeti Öğretmen Notları Boş Kart Olarak Render Ediliyor:** Backend `PublicTeacherNoteDto` olarak `{ id, summary, createdAt }` dönerken `ParentSummary.jsx:126, 133` `{tn.courseName} · {tn.teacherName}` ve `{tn.note \|\| tn.content}` okuyor. Hiçbiri DTO'da olmadığı için kartların içi tamamen boş çıkıyor. | SQL sorgusuna `c.name AS CourseName, u.full_name AS TeacherName` eklenmeli ve Frontend'de `tn.summary` (veya ortak alan adı) kullanılmalı. |
| **C5** | `StudentHomework.jsx:124-142` & `ParentHomework.jsx:124-146` | `HomeworkEndpoints.cs:161-167, 261-267` (`HomeworkAttachmentDto`) | **Öğrenci ve Veli Ödev Ekleri (`Attachments`) Kırık Link (`href={undefined}`):** Backend `HomeworkAttachmentDto` içinde `{ id, homeworkId, originalName, contentType, sizeBytes, objectKey }` dönüyor (`url` ve `fileName` **yok**). Hem `StudentHomework.jsx` hem `ParentHomework.jsx` `<a href={att.url}>{att.fileName \|\| 'Dosya'}</a>` render ettiği için tüm dosya isimleri `'Dosya'` yazıyor ve tıklandığında hiçbir yere gitmiyor. | `TeacherCoursesPage.jsx:409` ve `StoragePage.jsx:305`'teki gibi `att.originalName` gösterilmeli ve indirme işlemi `useDownloadUrl()` (`POST /api/v1/storage/download-url` + `{ objectKey: att.objectKey }`) üzerinden yapılmalı. |
| **C6** | `CoachLayout.jsx:52` & `coachSchoolApi.js:213` | `AdminEndpoints.cs:12` | **Admin Olmayan Her Koç Oturumunda Koşulsuz `403 Forbidden` İsteği:** `CoachLayout.jsx:52` bileşeni `user?.isAdmin` kontrolü yapmadan `usePendingApprovals()` çağırıyor (`GET /api/v1/admin/pending-approvals`). Normal koçların tamamında sayfa yüklenirken arka planda `403 Forbidden` hatası üretiliyor. | `usePendingApprovals(enabled = true)` içine `enabled: Boolean(enabled)` eklenip `CoachLayout.jsx:52` içinde `usePendingApprovals(Boolean(user?.isAdmin))` olarak çağrılmalı. |
| **C7** | `CoachLayout.jsx:160` & `CoachStudents.jsx:27, 35, 145, 392` | — | **Koç Global Arama (`⌘K`) ve Öğrenci Davet Formu Hataları:**<br>1) `CoachLayout.jsx:160` global aramada `/coach/students?search=...` adresine yönlendiriyor; fakat `CoachStudents.jsx:27` `searchParams.get('q')` okuyor ve `35.` satırdaki `useEffect` ile URL'deki `?search=` parametresini anında siliyor.<br>2) `CoachStudents.jsx:392` program `<select value={inviteProgramId \|\| programs?.[0]?.id \|\| ''}>` ile ilk programı seçili gösteriyor ama `inviteProgramId` state'i `''` kaldığı için kullanıcı dropdown'ı değiştirmezse `145.` satırdaki `if (!inviteEmail.trim() \|\| !inviteProgramId)` kontrolüne takılıp davet gönderemiyor. | 1) Parametre adı her iki dosyada `?q=` olarak eşitlenmeli.<br>2) `effectiveProgramId = inviteProgramId \|\| programs?.[0]?.id \|\| ''` hem `<select>` hem `handleCreateInvite` içinde kullanılmalı. |
| **C8** | `CoachDashboard.jsx:406-409` | `HomeworkEndpoints.cs:208` & `ApprovalRepository.cs:151` | **Onay Merkezinde `HOMEWORK_EXTENSION` Başlığı Boş Çıkıyor:** Öğrenci ek süre istediğinde `entity_type = 'HOMEWORK_EXTENSION'` kaydı oluşuyor, ancak `CoachDashboard.jsx:406-409` yalnızca `HOMEWORK_DONE`, `PAYMENT_CLAIM` ve `SCHEDULE_CHANGE` tiplerini kontrol ettiği için ek süre taleplerinin başlığı boş render ediliyor. | `CoachDashboard.jsx` onay kartı başlık eşlemesine `item.entityType === 'HOMEWORK_EXTENSION' && 'Ödev Ek Süre Talebi'` eklenmeli. |

---

### 8.3 🔴 SİSTEMİK BACKEND SQL TUTARSIZLIĞI & CRON HATASI: Literal `status = 'OVERDUE'` vs Dinamik Hesaplama + `OverdueHomeworkJob` PK Çakışması (`P1`)

Kod tabanında geciken ödevler için **iki çelişkili mimari** bir arada bulunuyor:
1. `HomeworkEndpoints.cs:129` içinde *"No cron needed — OVERDUE is computed on-the-fly in queries"* yorumu yer alıyor ve `HomeworkRepository.cs:137`, `CalendarRepository.cs:38`, `CurriculumRepository.cs:112`, `StudentRepository.cs:619` sorguları `status = 'PENDING' AND due_date < CURRENT_DATE` ile anında hesaplama yapıyor.
2. Öte yandan `Program.cs:108`'de kayıtlı `OverdueHomeworkJob.cs` (`BackgroundService`) saatte bir `UPDATE homework_assignments SET status = 'OVERDUE' WHERE status = 'PENDING' AND due_date < CURRENT_DATE` çalıştırıyor.
3. **🔴 `OverdueHomeworkJob.cs:86-90` içinde Gizli Transaction Rollback Hatası:**
   - Cron işi, geciken her ödev için programdaki koçlara bildirim eklerken şu sorguyu çalıştırıyor:
     ```sql
     INSERT INTO notifications (id, user_id, type, title, body, created_at)
     SELECT @Id, pc.coach_id, 'HOMEWORK_OVERDUE', 'Gecikmiş Ödev', @Body, @Now
     FROM program_coaches pc WHERE pc.program_id = @ProgramId
     ```
   - Bir programda **birden fazla koç** (`YONETICI` + `YARDIMCI`) varsa, `SELECT @Id, pc.coach_id` tüm koç satırları için **aynı `@Id` (`notifications.id` PRIMARY KEY)** değerini üretir (`gen_random_uuid()` yerine `@Id` kullanılmış). Bu durum `23505` Primary Key hatası fırlatıp `102.` satırdaki `transaction.Rollback()` bloğunu tetikler ve **100'lük paketteki hiçbir ödevin `OVERDUE` statüsüne geçememesine yol açar!**

Bu nedenle aşağıdaki **6 SQL sorgusu doğrudan `status = 'OVERDUE'` aradığı için** hem cron çalışana kadar (1 saate kadar) gecikmeli/0 sonuç döner, hem de yardımcı koçu olan programlarda cron rollback olduğu için **kalıcı olarak `0` (veya boş liste) döndürür**:

1. **`StudentRepository.cs:22` (`GetStudentsByCoachAsync`):**
   - `COUNT(*) FILTER (WHERE ha.status = 'OVERDUE') AS overdue_homework_count` (+ `20.` satırdaki `active_homework_count` süresi geçmiş `PENDING` ödevleri aktif sayar).
2. **`ProgramRepository.cs:21` (`GetProgramsByCoachAsync`):**
   - `(SELECT COUNT(*) FROM homework_assignments ha WHERE ha.program_id = p.id AND ha.status = 'OVERDUE') AS overdue_count`
3. **`ReportsRepository.cs:17` (`GetOverviewReportAsync`):**
   - `COUNT(*) FILTER (WHERE status = 'OVERDUE') AS TotalOverdue`
4. **`ReportsRepository.cs:45` (`GetStudentReportAsync`):**
   - `COUNT(*) FILTER (WHERE status = 'OVERDUE') AS TotalOverdue` (Öğrenci raporunda ve **QuestPDF çıktısında `StudentEndpoints.cs:171`**).
5. **`ReportsRepository.cs:94` (`GetDetailReportAsync`):**
   - `WHERE h.program_id = @ProgramId AND h.status = 'OVERDUE'` (`OverdueHomework` tablosu).
6. **`TeacherRepository.cs:375, 387` (`GetTeacherHomeworkStatsAsync`):**
   - `SUM(CASE WHEN ha.status = 'OVERDUE' THEN 1 ELSE 0 END)` (`374.` satırdaki `PendingHomeworks` ise süresi geçmişleri de içerir).

> **Çözüm:**
> 1. `OverdueHomeworkJob.cs:88` içindeki `SELECT @Id` ifadesi `SELECT gen_random_uuid()` olarak düzeltilmeli.
> 2. Yukarıdaki 6 sorguda koşul `(status = 'OVERDUE' OR (status = 'PENDING' AND due_date < CURRENT_DATE))` olarak, bekleyen (`Pending`) koşulu ise `(status = 'PENDING' AND (due_date IS NULL OR due_date >= CURRENT_DATE))` olarak standartlaştırılmalı.

---

### 8.4 🟡 RAPOR 2 (§1–§7) İDDİALARINA DÜZELTMELER VE EK MİMARİ SPAGETTİ BULGULARI

#### 1. §1–§7'deki İki İddiaya Teknik Düzeltme
- **`TeacherRepository.cs:320` (§7.2'deki "yeniden doğrulanmalı" notu):** Satır `303–353` (`GetTeacherDetailForCoachAsync`) incelendiğinde filtre eksikliği **olmadığı** doğrulandı. Sorgu `303` ve `316.` satırlarda `CASE WHEN sgm.is_active = 1 AND s.is_active = 1 AND c.is_active = 1 THEN 1 ELSE 0 END AS IsActive` hesaplayıp `349–352.` satırlarda öğrencileri kasıtlı olarak `ActiveStudents` ve `PastStudents` (geçmiş öğrenciler) olarak iki ayrı listeye ayırıyor.
- **"Mevcut `ParentRepository`'ye taşı" (§3.4 ve §5 #2):** `Backend/MentorumApi/Data/` altında **`ParentRepository.cs` adında bir dosya yoktur** (yalnızca izin bayraklarını yöneten 64 satırlık `ParentVisibilityRepository.cs` vardır). `ParentEndpoints.cs` içindeki 11 Dapper çağrısının önemli bir kısmı zaten `StudentRepository` ve `HomeworkRepository` metotlarının kopyasıdır (bkz. aşağıda Madde 2).

#### 2. Endpoint ve Repository Katmanındaki Gizli Kopya SQL Blokları (Gerçek Spagetti)
Sadece "endpoint'te Dapper çağrısı var" demek yeterli değildir; bu sorguların **birebir kopya** olduğu yerler şunlardır:

| Kopyalanan Mantık | Kopya Konumları | Satır Maliyeti & Çözüm |
|---|---|---|
| **Ödev Listesi + `uploads` Eklerini Eşleştirme (`HomeworkItemDto` + `HomeworkAttachmentDto`)** | 1) `HomeworkRepository.cs:127-175` (`GetStudentHomeworksAsync`)<br>2) `HomeworkEndpoints.cs:130-176` (`GET /api/v1/homework/me`)<br>3) `HomeworkEndpoints.cs:231-277` (`GET /api/v1/homework/children/{studentId}`) | **3 yerde %99 aynı ~48 satırlık SQL + Dapper `ToLookup` kodu (~145 satır).** `HomeworkEndpoints.cs` içindeki iki kopya silinip doğrudan `repo.GetStudentHomeworksAsync(studentId, status)` çağrılmalı (~95 satır anında silinir). |
| **Öğrenci Denemeleri + Ders Bazlı Puanlar (`ExamDto` + `ExamScoreDto`)** | 1) `StudentRepository.cs:142-187` (`GetStudentExamsAsync`)<br>2) `ParentEndpoints.cs:116-159` (`GET /api/v1/parents/children/{studentId}/exams`) | **2 yerde aynı 45 satırlık çoklu sorgu + grup eşleştirme kodu.** `ParentEndpoints.cs` doğrudan `studentRepo.GetStudentExamsAsync(studentId)` çağırmalı (~45 satır silinir). |
| **Ödeme Planları + Taksitler (`PaymentPlanDto` + `PaymentItemDto`)** | 1) `PaymentRepository.cs:89-142` (`GetPlansAsync(programId)`)<br>2) `PaymentRepository.cs:144-196` (`GetPlansForCoachAsync(coachId)`) | **%98 aynı iki 53 satırlık metot** (tek fark `AND pp.program_id = @ProgramId`). Ortak `QueryPlansCoreAsync(Guid coachId, Guid? programId)` metodunda birleştirilmeli (~50 satır silinir). |
| **Onay Listesi (`ApprovalItemDto`)** | 1) `ApprovalRepository.cs:10-36` (`ListAsync(programId, status)`)<br>2) `ApprovalRepository.cs:38-64` (`ListForCoachAsync(coachId, status)`) | **%95 aynı iki metot.** `ListCoreAsync(Guid coachId, Guid? programId, string? status)` ile tekilleştirilmeli. |
| **Öğrencinin `program_id` Değerini Okuma** | 1) `StudentRepository.cs:580-586` (`GetProgramIdAsync`)<br>2) `SchoolAccessRepository.cs:64-70` (`GetStudentProgramIdAsync`) | İkisi de `SELECT program_id FROM students WHERE id = @Id` çalıştırıyor. |

#### 3. Eksik Transaction (`Bölüm A3` İhlali), N+1 Sorgu ve Ağır Sorgu İsrafı
- **`HomeworkEndpoints.cs:79-116` (`PATCH /api/v1/homework/{id}/status`) — Eksik Transaction + N+1 + Yoksayılan `ExpectedVersion`:**
  - Önce `homework_assignments` tablosunu güncelliyor, ardından `foreach (var attachId in req.AttachmentIds)` döngüsüyle `uploads` tablosuna tek tek `UPDATE` atıyor (N+1) ve **transaction (`BeginTransaction`) kullanmıyor (`Bölüm A3` ihlali)**.
  - Ayrıca `StudentHomework.jsx:272` iyimser kilitleme için `expectedVersion: hw.version` gönderdiği halde endpoint `req.ExpectedVersion` alanını tamamen yoksayıyor (`HomeworkRepository.UpdateStatusAsync` ise `version` kontrolü yapıyor). Bu uç nokta `HomeworkRepository` içine tek transaction + `WHERE id = ANY(@AttachmentIds)` ile taşınmalı.
- **`StudentEndpoints.cs:67, 84, 99, 115, 208` & `StudentRepository.cs:212` — Sahiplik Kontrolü İçin Dev `GetStudentDetailAsync` Çağrısı (Çift Sorgu İsrafı):**
  - `StudentEndpoints.cs` içindeki 5 uç nokta (deneme ekleme, koçluk araçları güncelleme, görüşme listeleme/ekleme, çalışma istatistiği) yalnızca "bu öğrenci bu koça mı ait?" kontrolü yapmak için `studentRepo.GetStudentDetailAsync(coachId, id)` çağırıyor. Bu metot 5 alt sorgulu öğrenci profilini + **tüm denemeleri** + **tüm deneme ders netlerini** + **tüm velileri** + **bekleyen davetleri** (5 ayrı SQL sorgusu) çekiyor!
  - Daha kötüsü: `GET /api/v1/students/{id}/sessions` (`StudentEndpoints.cs:99`) önce `GetStudentDetailAsync` çağırıyor, hemen ardından `studentRepo.GetCoachingSessionsAsync` (`StudentRepository.cs:212`) **içeride bir kez daha `GetStudentDetailAsync` çağırıyor** — sadece görüşmeleri listelemek için öğrencinin tüm deneme ve veli geçmişi veritabanından **2 kez** çekiliyor.
  - **Çözüm:** Sahiplik kontrolü için hafif `guard.EnsureCoachOwnsStudentAsync(coachId, id)` kullanılmalı; `GetCoachingSessionsAsync` içindeki mükerrer `GetStudentDetailAsync` kaldırılmalı.

#### 4. `ParentEndpoints.cs` Çift Route Grubu Karmaşası (`/api/v1/parents` vs `/api/v1/parent`)
- `ParentEndpoints.cs:13` ve `164` aynı dosyada hem `/api/v1/parents` hem `/api/v1/parent` (tekil/çoğul) açıyor; `parentApi.js` içindeki 7 hook'un 4'ü `/parents/...`, 2'si `/parent/...`, 1'i `/me/children/...` çağırıyor. Geriye dönük uyumluluk korunarak route ve repository katmanı standartlaştırılmalı.

---

### 8.5 📋 V18 İÇİN BİRLEŞTİRİLMİŞ ÖNCELİK MATRİSİ (Önerilen Uygulama Sırası)

| Faz | Kod | Görev | Öncelik |
|---|---|---|---|
| **Faz 1 (Acil Hata & Güvenlik)** | **V18-B1** | `TeacherCoursesPage.jsx:63-66` eksik 4 `useState` tanımının (`showCompleteModal` vb.) geri yüklenmesi (Runtime crash düzeltmesi) | 🔴 P0 |
| **Faz 1 (Acil Hata & Güvenlik)** | **V18-B2** | `ProgramEndpoints.cs:144` (`/curriculum/progress`) içine `EnsureCoachOwnsStudentAsync` IDOR kontrolü eklenmesi | 🔴 P0 |
| **Faz 1 (Acil Hata & Güvenlik)** | **V18-B3** | Finans/Ödeme (`CoachPaymentsPage`, `CoachDashboard`, `ParentPaymentsPage`), Veli Özeti (`ParentSummary`), Ödev Ekleri (`StudentHomework`, `ParentHomework`) ve Koç (`CoachLayout`, `CoachStudents`) sözleşme hatalarının (**C1–C8**) düzeltilmesi | 🔴 P0 |
| **Faz 1 (Acil Hata & Güvenlik)** | **V18-B4** | `OverdueHomeworkJob.cs:88` PK çakışması (`gen_random_uuid()`) düzeltmesi + 6 SQL sorgusundaki literal `status = 'OVERDUE'` tutarsızlığının (`StudentRepository`, `ProgramRepository`, `ReportsRepository`×3, `TeacherRepository`) dinamik tarih koşuluyla eşitlenmesi | 🔴 P1 |
| **Faz 2 (Backend Mimari & Tekilleştirme)** | **V18-S1** | `HomeworkEndpoints` ve `ParentEndpoints` içindeki kopya ödev/deneme sorgularının mevcut `HomeworkRepository.GetStudentHomeworksAsync` ve `StudentRepository.GetStudentExamsAsync` metotlarına bağlanması + `HomeworkEndpoints` `/status` uç noktasının transaction'lı repo metoduna taşınması | 🟡 P1 |
| **Faz 2 (Backend Mimari & Tekilleştirme)** | **V18-S2** | `StudentEndpoints` (5 yer) ve `StudentRepository.GetCoachingSessionsAsync` içindeki ağır `GetStudentDetailAsync` sahiplik kontrollerinin hafif `ProgramAccessGuard` ile değiştirilmesi + `StudentRepository` içinden `StudentCoachingToolsRepository` ayrıştırılması | 🟡 P1 |
| **Faz 2 (Backend Mimari & Tekilleştirme)** | **V18-S3** | `PaymentRepository` (`GetPlans*`) ve `ApprovalRepository` (`List*`) içindeki %95+ kopya metotların tekilleştirilmesi + §7.5'teki `V18-G1..G4` (grup üyeliği yardımcıları ve global `UnauthorizedAccessException` handler) | 🟡 P2 |
| **Faz 3 (Frontend Bileşen Bölme)** | **V18-S4** | `ExamsTab.jsx` → `CoachStudents.jsx` → `CoachDashboard.jsx` bileşenlerinin alt bileşenlere ve custom hook'lara ayrıştırılması | 🟢 P2 |
