# 🔍 Mentörüm — Tekrarlı ve Dağınık Kod Tarama Listesi & Raporu

> **Tarih:** 30 Ekim 2026 · **Kapsam:** `mentörüm/Frontend/src` & `mentörüm/Backend/MentorumApi`
> **Yöntem:** Bağlam penceresini şişirmeden, 8 ana kategoride adım adım (`git grep` doğrulamasıyla) tarama ve raporlama.

---

## 📋 Tarama Kategorileri (Kontrol Listesi)

- [x] **Kategori 1:** Ortak UI Primitifleri — Butonlar (`<Button>` vs `<button>`), Sekmeler (`<SegmentedTabs>`) ve Modallar (`<Modal>`)
- [x] **Kategori 2:** Çerçeveler, Kartlar (`<Card>`), Rozetler (`<StatusBadge>`), Form Girdileri (`<Input>`) ve Boş/Yükleniyor (`EmptyState` / `Spinner`) Kalıpları
- [x] **Kategori 3:** Frontend Sabitleri, Sihirli Stringler ve Etiket/Durum Haritaları (`STATUS`, `ROLE`, `DAYS`, `ENTITY_TYPE` vb.)
- [x] **Kategori 4:** Frontend Yardımcı Fonksiyonlar ve Formatlayıcılar (Tarih/Saat, Para Birimi `₺`, Baş Harf `Initials`, Süre/Dakika formatlama)
- [x] **Kategori 5:** Frontend API Çağrıları, React Query Hook'ları ve `queryKeys` Dışı Manuel Anahtarlar
- [x] **Kategori 6:** İlkel Tarayıcı Diyalogları (`alert()`, `confirm()`, `prompt()`) ve Tekrarlı Hata/Bildirim Blokları
- [x] **Kategori 7:** Backend Repository & SQL Sorgu Tekrarları (Aynı veriyi/yetkiyi birden fazla yerde çeken Dapper sorguları)
- [x] **Kategori 8:** Backend Endpoint Yardımcıları (JWT Claim/`userId` okuma, Rol/Program sahipliği doğrulama, DTO tekrarları)

---

## 1. Kategori 1 Bulguları: Butonlar, Sekmeler ve Modallar (`git grep` Doğrulamalı)

### 1.1. Buton Sayımı Gerçeği (Case-Sensitive Doğrulama)
- Ortak `<Button` bileşeni kullanımı: **47 dosyada 181 kullanım**.
- Ham `<button` (küçük harf) kullanımı: **52 dosyada 178 kullanım** (Önceki 359 sayısı `181 <Button> + 178 <button>` toplamıdır).

### 1.2. Elle Yazılmış Sekme / Mod Seçici (`<SegmentedTabs>` Adayları — 23 Nokta, ~62 `<button>`)
1. `AdminPanelPage.jsx:152-178` (`pending | all | curriculum | security` — 4 sekme)
2. `ApprovalsPage.jsx:163-188` (`PENDING | APPROVED | REJECTED | ALL` — 4 filtre sekmesi)
3. `CalendarPage.jsx:162-179` (`CALENDAR | SCHEDULE` — 2 sekme)
4. `CoachCourseDetailPage.jsx:139-145` (`students | groups | resources | permissions` — 4 sekme)
5. `DashboardRightColumn.jsx:52-77` (`OVERDUE | APPROVALS | TEACHER_NOTES` — 3 sekme)
6. `CoachPaymentsPage.jsx:212-240` (`ALL | PENDING | PAID | OVERDUE` — 4 filtre sekmesi)
7. `CoachProfilePage.jsx:68-85` (`profile | program` — URL `?tab=` senkronlu 2 sekme)
8. `WeeklySchedulePage.jsx:228-249` (Modal içi `COURSE | GROUP | CUSTOM` — 3 mod sekmesi)
9. `CoachStudentDetail.jsx:151-165` (Üst `GROUP_TABS` 4 kategori + alt `subPill` sekmeleri)
10. `SwotAndWheelPanel.jsx:118-145` (`swot | wheel` — 2 sekme)
11. `AddOrInviteStudentPanel.jsx:125-141` (`create | invite` — 2 mod sekmesi)
12. `AddStudentsToCourseModal.jsx:92-108` (`search | group` — 2 mod sekmesi)
13. `AddTeacherModal.jsx:133-149` (`direct | invite` — 2 mod sekmesi)
14. `CoachStudents.jsx:143-167` (`STUDENTS | GROUPS | COURSES` — URL `?tab=` senkronlu 3 sekme)
15. `CoachTeacherDetailPage.jsx:137-172` (`students | homework | exams | courses` — 4 sekme)
16. `ParentCalendarPage.jsx:78-113` (`calendar | schedule` — 2 sekme)
17. `StudentCalendarPage.jsx:105-145` (`calendar | schedule` — URL `?tab=` senkronlu 2 sekme)
18. `StudentCoursesPage.jsx:92-112` (`courses | curriculum` — 2 sekme)
19. `StudentHome.jsx:46-61` (`notes | questions` — 2 sekme)
20. `StudyTimerCard.jsx:51-66` (`timer | quicklog` — 2 sekme)
21. `CoachFeedbackCard.jsx:50-98` (`notes | questions | files` — 3 sekme)
22. `StudentProfilePage.jsx:203-210` (`exams | subjectStats` — 2 sekme)
23. `StudentThemePage.jsx:49-76` & `:189-214` (`layout | mode | style` — 3 sekme + `light | dark | system` — 3 mod butonu)
24. `TeacherCoursesPage.jsx:258-264` (`students | homework | exams | resources` — 4 sekme)

### 1.3. Ortak `<Button>` Bileşenine Geçmesi Gereken Ham Aksiyon/İkon Butonları (~68 `<button>`)
- `ApprovalsPage.jsx:152` (`Tümünü Onayla`), `:236, :243` (`Onayla`, `Reddet`), `:255, :262` (Red onay/iptal)
- `CalendarPage.jsx:182` (`+ Yeni Etkinlik`), `:214` (`Tümünü Göster`), `:229` (Kişisel etkinlik sil `Trash2`)
- `CoachCourseDetailPage.jsx:222` (Seçili dosyayı temizle)
- `CoachCoursesPage.jsx:133` (Ders kartı `Sil` butonu)
- `CoachDashboard.jsx:299` (`Tümünü Gör`), `:405, :414, :423` (Hızlı aksiyon butonları)
- `DashboardRightColumn.jsx:115, :124, :171, :179, :243, :252, :370, :382` (Onay/red, öğrenciye git, modal kapat butonları)
- `CoachPaymentsPage.jsx:290` (`Tahsilat Gir` satır içi aksiyon butonu)
- `CoachProgramsPage.jsx:77` (Üye çıkar butonu)
- `WeeklySchedulePage.jsx:162` (`PDF İndir`), `:201` (Slottan sil `✕`)
- `ExamsTab.jsx:61, :345, :360` (Deneme ekle / detay aç-kapa / sil)
- `HabitTrackerCard.jsx:139` (Alışkanlık sil)
- `SwotAndWheelPanel.jsx:204, :230, :256, :282` (SWOT maddesi sil `&times;`)
- `CoachStudents.jsx:282` (Öğrenci kartı `Trash2` sil ikon butonu)
- `CoachTeacherDetailPage.jsx:179, :186` (`Düzenle`, `Sil`)
- `CoachTeachersPage.jsx:33` (`+ Öğretmen Ekle`)
- `StoragePage.jsx:114, :232, :255, :262, :313` (Dosya aç/indir/sil/cihaz seç butonları)
- `StudentCoursesPage.jsx:229` (Kaynak aç), `:298` (Konu ilerleme durumu döngüsü)
- `StudentNotesCard.jsx:37, :58, :81, :103, :116` (Not filtre, yeni not, kaydet, sabitle, sil)
- `StudentQuestionsCard.jsx:95, :114, :152, :195, :218, :251` (Soru filtre, yeni soru, görsel kaldır, kaydet, çözüldü, sil)
- `StudyTimerCard.jsx:33, :70` (Genişlet/Daralt ikon butonları)
- `TodayAgendaCard.jsx:89` (`Tamamla` aksiyon butonu)
- `StudentHomework.jsx:137, :155, :198, :265` (Dosya seç, ek süre iste, tamamla)
- `StudentProfilePage.jsx:106, :134` (Hedef düzenle/kaydet)
- `StudentSchedulePage.jsx:86, :108, :121` (Etkinlik türü, `+ Ekle`, `Trash2` sil)
- `TeacherCoursesPage.jsx:411` (Kaynak sil)
- `DevicePickerModal.jsx:22, :29, :31` (`Seç`, `Tekrar gösterme`, `Kapat`)
- `InstallAppButton.jsx:146` (`Anladım`)

### 1.4. Bilinçli Özel Kontroller (Denylist — Ham `<button>` Kalması Doğru Olanlar: ~48 `<button>`)
- `Button.jsx:34` ve `Modal.jsx:41` (Ortak primitiflerin kendi iç `<button>` etiketleri)
- `CoachLayout.jsx`, `StudentLayout.jsx`, `ParentLayout.jsx`, `TeacherLayout.jsx`, `ChildSelector.jsx`, `NotificationDropdown.jsx`, `ThemeSelector.jsx`, `ViewAsBanner.jsx` (Üst bar ikonları, bildirim çanı, tema seçici, mobil menü hamburgeri)
- `CalendarPage.jsx:192-207` (Takvim renk noktalı lejant filtre çipleri)
- `CoachCoursesPage.jsx:120` (Renk seçici yuvarlaklar `.colorSwatch`)
- `WeeklySchedulePage.jsx:204` (Takvim ızgarası boş hücre `+` alanı)
- `HabitTrackerCard.jsx:118` (7 günlük alışkanlık zincir halkası daireleri)
- `SwotAndWheelPanel.jsx:170-185` (Otomatik SWOT öneri çipleri)
- `ViewAsModal.jsx:69, :91, :113` (Kullanıcı seçici liste satırları)
- `StudentCoursesPage.jsx:288` (Müfredat ünite akordeon başlığı)
- `MoodCheckinCard.jsx:47, :83` (Emoji duygu durumu seçici ve odak çipleri)
- `StudentSchedulePage.jsx:66` (Haftanın günleri `Pzt..Paz` yuvarlak seçicileri)

### 1.5. Ortak `<Modal>` Kullanmayan Özel Overlay Dosyaları (Toplam 4 Dosya)
1. `PersonalEventModal.jsx:61` (`styles.overlay`)
2. `DevicePickerModal.jsx:11` (`styles.overlay`)
3. `AssignHomeworkModal.jsx:110` (`styles.modalOverlay`)
4. `InstallAppButton.jsx:78` (`styles.modalOverlay`)
*(Diğer 14 modal dosyası zaten ortak `components/common/Modal/Modal.jsx` kullanmaktadır.)*


---

## 2. Kategori 2 Bulguları: Kartlar (`<Card>`), Rozetler (`<StatusBadge>`), Girdiler (`<Input>`) ve Yükleniyor/Boş Durum Kalıpları

### 2.1. İki Ayrı Rozet Dosyası + 8 Dosyada Elle Yazılan `.statusBadge` (A5 & A8 İhlali)
- **Mükerrer Ortak Dosyalar:**
  1. `components/common/StatusBadge/StatusBadge.jsx` (`OVERDUE`, `LATE`, `REJECTED`, `DUE_TODAY`, `PARTIAL`, `DONE`, `COMPLETED`, `PAID`, `APPROVED`, `PENDING`, `CANCELLED` destekliyor) — **yalnızca 1 dosyada** (`AddStudentsToCourseModal.jsx:168`) kullanılıyor!
  2. `components/common/HomeworkStatusBadges.jsx` (`HomeworkStatusBadge`, `PriorityBadge`, `AssignedViaBadge` içeriyor; sabit `#dcfce7`, `#fee2e2` açık tema renkleri kullanıyor).
- **Ortak `<StatusBadge>` Yerine Elle `.statusBadge` / `.statusPending` Yazan 8 Dosya:**
  1. `AdminPanelPage.jsx:298` (`styles.statusApproved` / `styles.statusPending`)
  2. `ApprovalsPage.jsx:208-210` (`styles.statusBadge` + `statusPending | statusApproved | statusRejected`)
  3. `DashboardRightColumn.jsx:112` (`styles.statusBadge` + `styles.statusOverdue`)
  4. `CoachPaymentsPage.jsx:277-278` (`styles.itemStatusBadge` + `statusPaid | statusOverdue | statusPending`)
  5. `CoachStudents.jsx:272` (`styles.statusBadge` + `active | inactive`)
  6. `CoachTeacherDetailPage.jsx:388` (`styles.statusPending` / `styles.statusCompleted`)
  7. `ParentHomework.jsx:92, :164` (`styles.statusBadge` + `styles.statusBadgeDone` — `HomeworkStatusBadge` bileşeni varken elle yazılmış)
  8. `StudentHomework.jsx:85, :330` (`styles.statusBadge` + `styles.statusBadgeDone` — `ParentHomework.jsx` ile birebir kopya)

### 2.2. `<Card>` Kullanımı ve Elle Çerçeve Çizen Sayfalar
- `components/common/Card/Card.jsx` **51 dosyada** tutarlı biçimde kullanılıyor (iyi durumda).
- Ancak `ApprovalsPage.jsx:199` (`styles.card`), `CoachPaymentsPage.jsx` (`styles.tableCard`, `styles.statCard`), `StoragePage.jsx` (`styles.card`) ve `StudentNotesCard.jsx` kendi kart çerçevelerini CSS'te tekrar tanımlıyor.

### 2.3. Tekrarlı `Yükleniyor...` ve `EmptyState` Blokları
- **24 dosyada** `if (isLoading) return <div className={styles.pageContainer}>Yükleniyor...</div>;` veya `{isLoading && <p>Yükleniyor...</p>}` elle yazılmış.
- `components/common/ParentEmptyState/ParentEmptyState.jsx` yalnızca Veli sayfaları için yazılmış; genel bir `<EmptyState>` veya `<LoadingState>` ortak bileşeni yok.

---

## 3. Kategori 3 Bulguları: Frontend Sabitleri, Sihirli Stringler ve Etiket/Durum Haritaları (`AGENTS.md` §A7)

> **Tespit:** `Frontend/src/` altında merkezi bir `constants/` dosyası bulunmamaktadır; aynı sabit diziler ve etiket haritaları farklı bileşenlerde tekrar tekrar tanımlanmıştır.

### 3.1. Haftanın Günleri (`const DAYS`) — 4 Ayrı Dosyada Tekrarlı
1. `WeeklySchedulePage.jsx:10` (`['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']` — 0-indeksli)
2. `ParentSchedulePage.jsx:9` (`['', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']` — 1-indeksli)
3. `StudentSchedulePage.jsx:8` (`['', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']` + `SHORT_DAYS = ['', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']`)
4. `TeacherSchedulePage.jsx:6` (`['', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']`)

### 3.2. Onay Türü Etiketleri (`ENTITY_TYPE_LABELS`) — 2 Ayrı Dosyada Farklı Metinlerle Tekrarlı
1. `ApprovalsPage.jsx:6-12` (`HOMEWORK_DONE: 'Ödev Tamamlama'`, `HOMEWORK_EXTENSION: 'Ödev Ek Süre Talebi'`, `SCHEDULE_CHANGE: 'Program Değişikliği'`, `PAYMENT_CLAIM: 'Ödeme Bildirimi'`)
2. `DashboardRightColumn.jsx:158-161` (`HOMEWORK_DONE` → `'Ödev Tamamlama Talebi'`, `HOMEWORK_EXTENSION` → `'Ödev Ek Süre Talebi'`, `PAYMENT_CLAIM` → `'Veli Ödeme Bildirimi'`, `SCHEDULE_CHANGE` → `'Program Değişikliği'`)
*(Daha önce V18'de birinin güncellenip diğerinin unutulması hatası doğrudan bu kopyalamadan kaynaklanmıştır.)*

### 3.3. Sınıf Seviyesi (`ClassLevel`) ve Alan (`Track`) Seçenekleri — 4 Dosyada Tutarsız
1. `AddOrInviteStudentPanel.jsx:200-221` (`4..12`, `Mezun` + `SAY`, `EA`, `SÖZ`, `DİL`, `LGS` `<select>` listesi)
2. `CoachStudents.jsx:216-221` (`8`, `9..12`, `Mezun` `<select>` listesi — 4-7. sınıflar eksik)
3. `EditStudentModal.jsx:92-104` (Sınıf ve Alan için `<select>` yerine serbest metin `<Input>` kullanılmış!)
4. `AssignHomeworkModal.jsx:120-140` (`4..12`, `TYT`, `AYT` seviye seçimi)

### 3.4. Ders Türleri (`DERS` / `OZEL_DERS`) ve Not Görünürlüğü (`COACH_ONLY` / `STUDENT_VISIBLE`)
1. `CoachCoursesPage.jsx:104, :185` (`OZEL_DERS` → `'Bireysel Özel Ders / Koçluk'` / `'Özel Ders'`) vs `StudentCoursesPage.jsx:133` (`OZEL_DERS` → `'Bireysel Koçluk'`, `DERS` → `'Akademik Ders'`).
2. `TeacherCoursesPage.jsx:235` & `TeacherStudentNotesModal.jsx:112, :157` (`COACH_ONLY`, `STUDENT_VISIBLE`, `PARENT_VISIBLE` string literalleri).

---

## 4. Kategori 4 Bulguları: Yardımcı Fonksiyonlar, Formatlayıcılar ve İş Akışı Tekrarları

### 4.1. 4 Adımlı Dosya Yükleme Akışı (`compressImage` → `createUploadUrl` → `axios.put(uploadUrl)` → `confirmUpload`) — 4 Dosyada Birebir Kopya
1. `CoachCourseDetailPage.jsx:73-85` (`isImg ? await compressImage(...)` + `createUpload` + `axios.put` + `confirmUpload`)
2. `StudentHomework.jsx:42-52` (`isImg ? await compressImage(...)` + `createUpload` + `axios.put` + `confirmUpload`)
3. `StoragePage.jsx:89-99` (`compressImage` + `createUpload` + `axios.put` + `confirmUpload`)
4. `StudentQuestionsCard.jsx:38-45` (`compressImage` + `createUpload` + `axios.put` + `confirmUpload`)
*(Ortak bir `useUploadFile()` hook'u `storageApi.js` içinde tanımlanırsa 4 bileşen de `axios`, `compressImage`, `useCreateUploadUrl` ve `useConfirmUpload` bağımlılığından kurtulur.)*

### 4.2. Tarih Formatlama (`formatDate` vs Dağınık `new Date(...).toLocaleDateString('tr-TR')`)
- `utils/dateUtils.js` içinde `formatDate(isoString, formatStr)` (`Europe/Istanbul` saat dilimi korumalı) **zaten mevcut** ve yalnızca **5 dosyada** (`CoachAuditLogsPage`, `ParentExamsPage`, `ParentHomework`, `ParentSummary`, `StudentHomework`) kullanılıyor.
- Buna karşın **12 dosyada** (`AdminPanelPage.jsx:310, :423, :462`, `ApprovalsPage.jsx:104, :206`, `CoachStudentDetail.jsx:188, :214`, `ExamsTab.jsx:296`, `HomeworkTab.jsx:37`, `NotesTab.jsx:33`, `ParentAccessPanel.jsx:123`, `CoachTeacherDetailPage.jsx:401, :448`, `ParentPaymentsPage.jsx:110`, `StudentCalendarPage.jsx:202`, `TeacherStudentNotesModal.jsx:147`) doğrudan `new Date(x).toLocaleDateString('tr-TR')` veya `toLocaleString('tr-TR')` elle yazılmış.
- Ayrıca `StudentHomework.jsx:15-20` içinde tanımlanan `formatDueDate` (00:00 saatlerini gizleyen akıllı formatlayıcı) `utils/dateUtils.js` içinde değil yerel tanımlandığı için `ParentHomework.jsx:130` ve `HomeworkTab.jsx:37` bundan yararlanamıyor.

### 4.3. Para Birimi Formatlama (`₺` vs `TRY` Tutarsızlığı)
- `CoachDashboard.jsx:262, :265`, `DashboardRightColumn.jsx:165` ve `CoachPaymentsPage.jsx:177, :184, :192, :258, :287`: `₺${parseFloat(val).toLocaleString('tr-TR')}`
- `ParentPaymentsPage.jsx:71, :77`: `${totalPaid.toLocaleString('tr-TR')} TRY` (`₺` yerine `TRY` yazılmış).
- Ortak bir `formatCurrency(amount)` fonksiyonu yok.

### 4.4. Onay Payload Çözümleme ve Detay Render Etme (`JSON.parse(item.payload)`) — 2 Dosyada Tekrarlı
- `ApprovalsPage.jsx:52-128` (`renderPayloadDetails`) ile `DashboardRightColumn.jsx:145-190` içinde `typeof item.payload === 'string' ? JSON.parse(item.payload) : item.payload` ve tür bazlı (`HOMEWORK_DONE`, `HOMEWORK_EXTENSION`, `PAYMENT_CLAIM`, `SCHEDULE_CHANGE`) açıklama oluşturma mantığı iki kez yazılmış.

---

## 5. Kategori 5 Bulguları: Frontend API Çağrıları, React Query Hook'ları ve `queryKeys` Tekrarları (`AGENTS.md` §A5 & §A6)

### 5.1. Bileşen İçinde Tekrarlanan Doğrudan `apiClient` İş Akışları
1. **Çıkış Yap (`handleLogout` → `apiClient.post('/auth/logout')` + `logout()` + `navigate('/login')`) — 4 Layout Dosyasında Birebir Kopya:**
   - `CoachLayout.jsx:85-94`
   - `ParentLayout.jsx:27-35`
   - `StudentLayout.jsx:24-32`
   - `TeacherLayout.jsx:15-23`
   *(Bu akış doğrudan `authStore.js` içine `logoutUser()` veya ortak bir `useLogout()` hook'una taşınmalıdır.)*
2. **Şifre Değiştirme Formu ve API Çağrısı (`apiClient.post('/me/password', { newPassword })`) — 3 Profil Sayfasında Birebir Kopya:**
   - `CoachProfilePage.jsx:30-56`
   - `StudentProfilePage.jsx:29-55`
   - `TeacherProfilePage.jsx:12-28`
   *(State'ler `newPassword`, `confirmPassword`, `pwdStatus`, `pwdLoading` ve JSX kartı 3 sayfada da kopyala-yapıştır ile yazılmış; tek bir `<ChangePasswordCard />` bileşenine indirilebilir.)*
3. **Öğrenci PDF Raporu İndirme (`apiClient.get('/students/${id}/report.pdf', { responseType: 'blob' })` + `window.URL.createObjectURL`) — 2 Dosyada Birebir Kopya:**
   - `CoachReports.jsx:25-41`
   - `CoachStudentDetail.jsx:106-122`
4. **Sayfa İçi Inline `useQuery` (`ParentSchedulePage.jsx:17-21`):**
   - `parentApi.js` içinde hook olmak yerine bileşen içinde doğrudan `apiClient.get('/parent/children/${student.studentId}/schedule')` çağrılıyor.

### 5.2. A5 "Tek Alan = Tek Dosya" İhlali (`studentSchoolApi.js`)
- `features/student/studentSchoolApi.js` yalnızca **28 satır** uzunluğundadır ve `features/student/studentApi.js` (306 satır) ile aynı domain'dedir (birleştiğinde 334 satır olur, 300–520 satır bandına tam uyar).

### 5.3. A6 Explicit Destructuring İhlali (`(data) => apiClient.post(url, data)`) — 14 Hook
- `coachStudentsApi.js:78, :161, :184`
- `coachSchoolApi.js:13`
- `storageApi.js:24, :47`
- `studentApi.js:91, :133, :176, :192, :224, :256, :293`
- `usePersonalEvents.js:7`

### 5.4. Merkezi `api/queryKeys.js` Yerine Elle Dizi (`queryKey: [...]`) Yazan Dosyalar
- `coachSchoolApi.js` (tüm sorgular `['coach', 'program', ...]` elle yazılmış)
- `studentApi.js:233-303` (`['student', 'streak']`, `['student', 'school-schedule']`, `['student', 'coaching-tools']`, `['student', 'uploads']`)
- `studentSchoolApi.js:5-25` (`['student', 'schedule']`, `['student', 'courses']`)
- `teacherApi.js:6-120` (tüm `['teacher', ...]` anahtarları `queryKeys.js` dışında)
- `useNotifications.js:6-34` (`['notifications']`) ve `usePersonalEvents.js:11-33` (`['me', 'events']`)

---

## 6. Kategori 6 Bulguları: İlkel Tarayıcı Diyalogları (`prompt()`, `confirm()`, `alert()`) ve Tekrarlı Dosya Açma Akışı

### 6.1. Kalan `window.prompt()` ve `window.confirm()` Kullanımları
1. `AdminPanelPage.jsx:70-72`: Koç kota düzenleme işleminde arka arkaya **3 adet `prompt()`** (`maxStudents`, `maxTeachers`, `storageQuotaMb`) açılıyor — ortak `<Modal>` ile tek formda toplanmalıdır.
2. `CoachGroupsPage.jsx:33`: `window.confirm('Öğrenciyi bu gruptan çıkarmak istediğinize emin misiniz?')`.

### 6.2. 5 Dosyada Tekrarlanan Dosya Açma/İndirme İşleyicisi (`getDownloadUrl` → `window.open` → `alert('Dosya açılamadı.')`)
1. `HomeworkAttachmentList.jsx:15-24`
2. `CoachCourseDetailPage.jsx:236-245`
3. `StoragePage.jsx:301-310`
4. `StudentCoursesPage.jsx:63-72`
5. `TeacherCoursesPage.jsx:412-420`
*(Bu 5 akış `storageApi.js` içinde tek bir `useOpenUpload()` yardımcı hook'unda birleştirilebilir.)*

### 6.3. Dağınık `alert(...)` Çağrıları (17 Dosyada 34 Çağrı)
- Form doğrulama ve mutasyon hata mesajları bazı sayfalarda satır içi hata kutusu (`submitError`) ile gösterilirken, 17 dosyada (`PersonalEventModal`, `AssignHomeworkModal`, `ExamsTab`, `StoragePage`, `TeacherCoursesPage`, `StudentHomework` vb.) tarayıcı `alert()` kutusuyla gösteriliyor.

---

## 7. Kategori 7 Bulguları: Backend Repository & SQL Sorgu Tekrarları (`AGENTS.md` §A5 & §A6)

### 7.1. `GetStudentProgramIdAsync` / `GetProgramIdAsync` Metodunun 3 Ayrı Repository'de Tekrarlanması
Aynı `SELECT program_id FROM students WHERE id = @StudentId` sorgusu 3 ayrı Repository'de bağımsız metot olarak yazılmıştır:
1. `StudentRepository.cs:480` (`GetProgramIdAsync(Guid studentId)`)
2. `InviteRepository.cs:81` (`GetStudentProgramIdAsync(Guid studentId)`)
3. `UploadRepository.cs:213` (`GetStudentProgramIdAsync(Guid studentId)`)
*(Ayrıca `ExamRepository.cs:46`, `HomeworkRepository.cs:47` ve `ProgramAccessGuard.cs:43` içinde de satır içi olarak çalışmaktadır; `BaseRepository.GetStudentProgramIdAsync(Guid studentId)` adı altında tekilleştirilebilir.)*

### 7.2. `SchoolAccessRepository.cs` İçinde 3 Ayrı Öğretmen Notu Sorgusu (`GetTeacherNotesAsync`, `GetStudentVisibleTeacherNotesAsync`, `GetStudentTeacherNotesForCoachAsync`)
- `SchoolAccessRepository.cs:359` (`GetStudentVisibleTeacherNotesAsync`) ve `:379` (`GetStudentTeacherNotesForCoachAsync`) aynı `teacher_notes + courses + users` JOIN sorgusunu çalıştırmaktadır; tek fark `onlyStudentVisible` boolean filtresidir.

### 7.3. `StudentRepository.cs` İçinde Tekrarlanan Alt Sorgular (`GetStudentsByCoachAsync` & `GetStudentDetailAsync`)
- `StudentRepository.cs:18-24` ile `:45-49` arasında öğrencinin aktif grup adı (`student_group_members`), bireysel özel ders sayısı (`course_students` `OZEL_DERS`) ve haftalık çalışma dakikası/soru sayısı (`study_sessions` `date_trunc('week', CURRENT_DATE)`) alt sorguları iki metotta birebir kopyalanmıştır.

### 7.4. Kalan Tırnaklı `dynamic` Dapper Sorguları (`AGENTS.md` §A6 Typed DTO Kuralı)
U8 kapsamında 4 bozuk `dynamic` metot tiplendirilmiştir; ancak tırnaklı alias kullanan şu 5 metot hâlâ `dynamic` dönmektedir:
1. `ParentVisibilityRepository.cs:62` (`GetMyChildrenAsync`)
2. `ParentVisibilityRepository.cs:83` (`GetPermissionsForParentAsync`)
3. `ParentVisibilityRepository.cs:98` (`GetChildDetailWithMaskedParentsAsync`)
4. `SchoolAccessRepository.cs:128` (`GetTeacherCourseHomeworkAsync`)
5. `SchoolAccessRepository.cs:143` (`GetTeacherCourseExamsAsync`)

---

## 8. Kategori 8 Bulguları: Backend Endpoint, Claim ve DTO Tekrarları (`AGENTS.md` §A5 & §A6)

### 8.1. `StudentFlexibilityEndpoints.cs` İçinde Tekrarlanan Öğrenci Oluşturma Bloğu (Eksik `STUDENT_LIMIT_EXCEEDED` Yakalaması)
- `StudentFlexibilityEndpoints.cs:16-41` (`POST /api/v1/students`) ve `:62-81` (`POST /api/v1/programs/{programId:guid}/students`) aynı doğrulama ve `repo.CreateStudentAsync` akışını çalıştırıyor.
- İlk endpoint `STUDENT_LIMIT_EXCEEDED` hatasını yakalayıp `409 Conflict` dönerken, ikinci endpoint'te `try/catch` bloğu unutulmuş! Ortak bir yerel yardımcı metot (`CreateStudentInternalAsync`) ile birleştirilmelidir.

### 8.2. Parçalanmış Küçük Endpoint / DTO Dosyaları (`AGENTS.md` §A5 "Tek Alan = Tek Dosya")
- `CourseDtos.cs` (61 satır) + `CourseAdminDtos.cs` (69 satır) + `CourseResourceDtos.cs` (40 satır) → Toplam **170 satır**, 3 ayrı dosyaya bölünmüş.
- `CourseEndpoints.cs` (138 satır) + `CourseResourceEndpoints.cs` (83 satır) → Toplam **221 satır**, 2 ayrı dosyaya bölünmüş.
- `StudentDtos.cs` (209 satır) + `StudentUxDtos.cs` (146 satır) → Toplam **355 satır** (300–520 ideal bandında), 2 ayrı dosyaya bölünmüş.

### 8.3. `ClaimsPrincipalExtensions.cs` Rol Yardımcısının Eksikliği
- `GetUserId()` tüm endpoint'lerde standart olarak kullanılırken, rol okuma işlemi `HomeworkEndpoints.cs:74` ve `StorageEndpoints.cs:29, :100` içinde `user.FindFirst(ClaimTypes.Role)?.Value` olarak elle yazılmış (`user.GetUserRole()` uzantısı eklenebilir).

---

## 🎯 Özet Tablo: Taramada Yakalanan En Kritik Tekrarlar (Öncelik Sırasıyla)

| Öncelik | Bulgu | Tekrar Sayısı | Çözüm Hedefi |
|---|---|---|---|
| **P0 (UI Primitif)** | Elle yazılmış Sekme / Filtre Barları (`<SegmentedTabs>` eksikliği) | **24 nokta (~62 `<button>`)** | `TASK_LIST_V19.md` **U10** |
| **P0 (UI Primitif)** | Ortak `<Button>` yerine elle yazılmış standart aksiyon `<button>` etiketleri + `.content` ikon/metin hizalama kusuru | **~68 `<button>`** | `TASK_LIST_V19.md` **U9, U11, U12** |
| **P0 (UI Primitif)** | Ortak `<Modal>` kullanmayan özel `position: fixed` overlay bileşenleri (`PersonalEventModal`, `DevicePickerModal`, `AssignHomeworkModal`, `InstallAppButton`) | **4 dosya** | `TASK_LIST_V19.md` **U9** |
| **P1 (UI Primitif)** | İki ayrı rozet dosyası (`StatusBadge.jsx` vs `HomeworkStatusBadges.jsx`) + 8 dosyada elle yazılan `.statusBadge` | **2 ortak + 8 özel dosya** | `<StatusBadge>` birleştirmesi |
| **P1 (İş Akışı)** | 4 adımlı Dosya Yükleme (`compressImage` → `createUploadUrl` → `axios.put` → `confirmUpload`) ve 5 dosyada Dosya Açma (`getDownloadUrl` → `window.open`) kopyaları | **4 yükleme + 5 açma kopyası** | `storageApi.js` içinde `useUploadFile()` ve `useOpenUpload()` |
| **P1 (İş Akışı)** | 4 Layout'ta aynı `handleLogout`, 3 Profil sayfasında aynı Şifre Değiştirme kartı, 2 sayfada aynı PDF Rapor indirme kodu | **4 + 3 + 2 dosya** | `useLogout()`, `<ChangePasswordCard />`, `downloadStudentReportPdf()` |
| **P1 (Sabitler / DRY)** | 4 dosyada `const DAYS`, 2 dosyada `ENTITY_TYPE_LABELS` + `renderPayloadDetails`, 4 dosyada tutarsız Sınıf/Alan (`Grade`/`Track`) listeleri (`EditStudentModal` serbest metin!) | **10+ dosya** | `Frontend/src/constants/domainConstants.js` |
| **P1 (API / A5-A6)** | 28 satırlık ayrı `studentSchoolApi.js`, 14 opak `(data) =>` mutation ve `queryKeys.js` dışı manuel dizi anahtarları | **6 API dosyası** | `studentApi.js` birleştirmesi + Explicit Destructuring + `queryKeys.js` |
| **P2 (Backend DRY)** | `StudentFlexibilityEndpoints.cs` içinde iki kez yazılan öğrenci oluşturma (ikincisinde `STUDENT_LIMIT_EXCEEDED` catch eksik!), 3 Repo'da `GetStudentProgramIdAsync`, parçalı `Course*Dtos.cs` | **Backend Data/Endpoints** | Tekil metot + A5 dosya birleştirmesi |
