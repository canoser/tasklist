# 🧭 Mentörüm — V19 Görev Listesi (UX/UI Navigasyon Mimarisi, Sekme Bütünlüğü ve Deneyim İyileştirmeleri)

> **Tarih:** 30 Ekim 2026 · **Mimari Prensip:** Ajan-Optimum Hibrit (`AGENTS.md` §A5–A7, §C3)
> **Amaç:** Kullanıcının ekran görüntülerinde tespit edilen **kaybolan butonlar/sekmeler, yetim (orphan) sayfalar, sol menü ile çelişen mükerrer kısayollar, çift başlıklar, sıkışık kart aksiyonları ve sözleşme kaynaklı görünüm hatalarını** tüm roller (Koç, Öğrenci, Veli, Öğretmen) genelinde kalıcı olarak çözmek.

---

## 1. Tespit Edilen UX/UI ve Navigasyon Sorunları (Kök Neden Analizi)

1. **Kaybolan Butonlar ve Yetim Sayfalar (`Öğrenciler & Programlar` — Ekran Görüntüsü 1, 3, 4, 5):**
   - `CoachStudents.jsx` üst kısmındaki `[📚 Dersler]`, `[🗓️ Haftalık Program]`, `[🛡️ İşlem Geçmişi]`, `[⚙️ Ayarlar]` butonlarına tıklandığında kullanıcı `/coach/programs/:id/...` altında **yetim bir sayfaya** savruluyor.
   - Gidilen sayfada ne üstteki butonlar, ne `Bireysel | Grup` sekmeleri, ne de bir **"← Geri Dön"** bağlantısı var; üstelik sol menüdeki aktif sekme vurgusu tamamen sönüyor ve üst breadcrumb'da sol menüde var olmayan `Programlar & Dersler` yazısı çıkıyor.
2. **Sol Menü (Sidebar) ile Mükerrer Kısayollar:**
   - Sol menüde zaten **`Takvim & Program`** (`/coach/calendar` → içinde `Haftalık Ders Programı` sekmesi var), **`İşlem Geçmişi (Denetim)`** (`/coach/audit-logs`) ve **`Ayarlar & Profil`** (`/coach/profile`) bulunuyor. Bunların `Öğrenciler & Programlar` içinde kopuk butonlar olarak tekrar etmesi kafa karışıklığı yaratıyor.
3. **Sekme İçi Çift Başlık ve Daralan Layout (`Grup Programları` & `Haftalık Program` — Ekran Görüntüsü 2, 3):**
   - `Öğrenciler & Programlar` altında `Grup Programları` sekmesine geçildiğinde aşağıda ikinci bir devasa `<h1>Grup Programları</h1>` başlığı çıkıyor ve sayfa 3 sütunlu tam genişlikten daracık ortalanmış bir kutuya büzülüyor.
   - `Grup Programları` sekmesindeyken bile en üstte `+ Yeni Öğrenci Ekle` butonu durmaya devam ediyor; grup kartlarında `Üye: 3` metni `Üyeleri Yönet` butonuyla sıkışıyor.
   - Aynı çift başlık sorunu `Takvim & Program` içinde `Haftalık Ders Programı` sekmesine geçildiğinde (`<h1>Haftalık Program</h1>`) yaşanıyor.
4. **Haftalık Program (`WeeklySchedulePage`) Etkileşim Eksikliği (Ekran Görüntüsü 3):**
   - Sol listedeki ders/grup kutularının sürüklenebilir (Drag & Drop) olduğu anlaşılmıyor (tutamaç ikonu veya ipucu yok).
   - Saat hücresindeki `+` butonuna basıldığında form **tablonun en altında** açılıyor (kullanıcı ekranı aşağı kaydırmadan formu göremiyor) ve açılan mini formda **Ders veya Grup seçimi** yapılamıyor (yalnızca düz metin başlık girilebiliyor).
5. **Ayarlar Kopukluğu ve İlkel `window.prompt` (Ekran Görüntüsü 5):**
   - Sol menüdeki `Ayarlar & Profil` (`/coach/profile`) içinde Program/Yardımcı Koç ayarları yok; `CoachProgramSettingsPage` yetim bir rotada duruyor ve yardımcı koç davet etmek için tarayıcının ilkel `window.prompt()` / `alert()` kutularını kullanıyor.
6. **Onay Merkezi (`ApprovalsPage.jsx`) Alan Adı Sapması ve Eksik Etiket:**
   - Backend `ApprovalItemDto` alanları camelCase (`entityType`, `createdAt`, `rejectionReason`) iken `ApprovalsPage.jsx` içinde `item.entity_type`, `item.created_at`, `item.rejection_reason` okunuyor! Bu nedenle Onay Merkezi sayfasında **tarihler boş, tür rozetleri boş ve detaylar ham `JSON.stringify` metni** olarak görünüyor. Ayrıca `HOMEWORK_EXTENSION` ("Ödev Ek Süre Talebi") etiketi eksik.
7. **Öğrenci Kartlarında Devasa "Sil" Butonu (Ekran Görüntüsü 1):**
   - Öğrenci kartlarının en altında tam genişlikte (`100%`) kırmızı `Sil` butonu yer alıyor; hem görsel hiyerarşiyi bozuyor hem de yanlışlıkla silme riskini artırıyor.
8. **Sağ Üst Güneş/Tema Dekorunun (`ThemeDecorContainer`) İçeriği Kapatması (Ekran Görüntüsü 1–5):**
   - Sağ üstteki turuncu güneş dekoru `Haftalık Program` tablosunun **Pazar** sütununun ve `İşlem Geçmişi` sayfasındaki **Tüm İşlemler** filtresinin üstüne biniyor.
9. **Öğrenci ve Veli Portallarında "Takvim" vs "Program" İkilemi:**
   - Öğrenci sol menüsünde hem `Takvim` (içinde zaten `Haftalık Programım` sekmesi var) hem de ayrı `Programım` menüsü var.
   - Veli alt barında 6 sekme sıkışık duruyor (`Takvim` ve `Program` ayrı) ve `ParentSchedulePage` boş olduğunda hiçbir bilgilendirme (Empty State) göstermiyor.

---

## 2. Uygulama Planı (Ajan-Optimum Hibrit Görevler)

### Faz 1 — Koç Paneli Navigasyon, Sekme ve Bağlam Bütünlüğü

#### [x] U1 — `Öğrenciler & Programlar` (`/coach/students`): 3'lü Kalıcı Sekme Mimarisi ve Kısayol Temizliği
- **Sıralama / Ön Koşul (`F2 → U1`):** V18 `F2` (`CoachStudents.jsx` 650 → 367 satır bölmesi ve `AddOrInviteStudentPanel.jsx` ayrıştırması) `369ee9c` commit'i ile tamamlanmıştır; `U1` doğrudan bölünmüş 367 satırlık `CoachStudents.jsx` üzerinde uygulanacaktır.
- **Dosyalar:** `CoachStudents.jsx`, `CoachStudents.module.css`, `CoachGroupsPage.jsx`, `CoachCoursesPage.jsx`, `CoachCourseDetailPage.jsx`
- **Yap:**
  1. `CoachStudents.jsx` başlığındaki sayfadan koparan 4 kısayol butonunu (`Dersler`, `Haftalık Program`, `İşlem Geçmişi`, `Ayarlar`) kaldır.
  2. Segmented Tab Bar'ı URL `?tab=` parametresiyle senkronize **3 kalıcı sekmeye** dönüştür:
     - **`👥 Bireysel Öğrenciler (${students.length})`** (`STUDENTS`)
     - **`🗂️ Gruplar (${groups.length})`** (`GROUPS`)
     - **`📚 Dersler & Branşlar (${courses.length})`** (`COURSES`)
  3. Sağ üstteki ana aksiyon butonunu aktif sekmeye göre bağlamsal yap:
     - `STUDENTS` sekmesinde: **`+ Yeni Öğrenci Ekle`**
     - `GROUPS` sekmesinde: **`+ Yeni Grup Oluştur`** (formu açar/odaklar)
     - `COURSES` sekmesinde: **`+ Yeni Ders Oluştur`** (formu açar/odaklar)
  4. `CoachGroupsPage` ve `CoachCoursesPage` sekme içinde (`embedded`) çalışırken mükerrer `<h1>` başlıklarını gizle ve dar sütun yerine tam genişlik (`100%`) grid düzeni kullan; grup kartlarındaki `Üye: X` rozeti ile `Üyeleri Yönet` butonu arasındaki sıkışıklığı gider.
  5. `CoachCourseDetailPage.jsx` içinde geri butonunu `/coach/students?tab=COURSES` adresine yönlendir ve üstte net breadcrumb (`Öğrenciler & Programlar / Dersler / [Ders Adı]`) göster.
- **Kabul:** Kullanıcı Öğrenciler, Gruplar ve Dersler arasında geçiş yaparken üst başlık, sol menü aktifliği ve sekme çubuğu asla kaybolmaz.

#### [x] U2 — Öğrenci Kartları (`CoachStudents.jsx`) Aksiyon Hiyerarşisi ve Filtre İyileştirmesi
- **Dosyalar:** `CoachStudents.jsx`, `CoachStudents.module.css`
- **Yap:**
  1. Arama kutusu ve Sınıf filtresini alt alta 2 tam satır yerine masaüstünde **yan yana tek satırda** (`grid-template-columns: 2fr 1fr`) hizala (ekran yüksekliğinden tasarruf).
  2. Öğrenci kartlarının altındaki tam genişlikli kırmızı `Sil` butonunu kaldır; alt satırda `[Profili Gör]`, `[Ödev Ata]` (ve gerekiyorsa `[Davet Et]`) butonlarının sağında kompakt, zarif bir ikon butonu (`Trash2`, hover'da kırmızı) olarak konumlandır.
- **Kabul:** Öğrenci kartları daha temiz ve güvenli bir aksiyon hiyerarşisine kavuşur.

#### [x] U3 — `Haftalık Ders Programı` (`WeeklySchedulePage.jsx` & `CalendarPage.jsx`) UX İyileştirmesi
- **Dosyalar:** `WeeklySchedulePage.jsx`, `WeeklySchedulePage.module.css`, `CalendarPage.jsx`
- **Yap:**
  1. `CalendarPage.jsx` içinde `Haftalık Ders Programı` sekmesi seçildiğinde `WeeklySchedulePage` içindeki mükerrer `<h1>Haftalık Program</h1>` başlığını kaldır.
  2. Sol paneldeki **Dersler** ve **Gruplar** kartlarına sürükleme tutamacı (`⠿` ikonu), ders renk noktası ve üst bilgi notu (*"Sürükleyip saat dilimine bırakın veya hücredeki + butonuna tıklayın"*) ekle.
  3. Saat hücresindeki `+` butonuna tıklandığında sayfanın en altında açılan ilkel kutu yerine **Modal** aç; modal içinde **Tür Seçimi (Ders / Grup / Özel Etkinlik)**, ilgili **Ders/Grup Dropdown'ı**, **Başlık** ve **Saat** seçimi sun.
- **Kabul:** Kullanıcı hem sürükle-bırak ile hem de `+` modalından ders/grup seçerek çakışma kontrollü ders programı oluşturabilir.

#### [x] U4 — `Ayarlar & Profil` (`/coach/profile`) ile `Program Ayarları` Birleştirmesi (`window.prompt` Kaldırma)
- **Dosyalar:** `CoachProfilePage.jsx`, `CoachProgramSettingsPage.jsx`, `App.jsx`
- **Yap:**
  1. `CoachProfilePage.jsx` sayfasına 2'li Segmented Tab ekle:
     - **`👤 Profil & Hesap Güvenliği`** (Uzmanlık alanı, biyografi, şifre işlemleri)
     - **`⚙️ Program & Yardımcı Koç Yönetimi`** (`CoachProgramSettingsPage` içeriği)
  2. `CoachProgramSettingsPage.jsx` içindeki `window.prompt` ve `alert` çağrılarını kaldırarak yerine `Modal` + davet kodu kopyalama kutusu ekle; mükerrer `İşlem Geçmişi (Denetim İzi)` butonunu kaldır (sol menüde zaten var).
  3. `/coach/programs/:programId/settings` rotasını `/coach/profile?tab=program` adresine yönlendir.
- **Kabul:** Sol menüdeki `Ayarlar & Profil` sekmesi hem kişisel profili hem yardımcı koç yönetimini tek merkezde toplar; hiçbir yerde `window.prompt` kalmaz.

---

### Faz 2 — Onay Merkezi, Breadcrumb, Tema Dekoru ve Diğer Roller (Öğrenci / Veli)

#### [x] U5 — `Onay Merkezi` (`ApprovalsPage.jsx`) Sözleşme Sapması (`camelCase`) ve `HOMEWORK_EXTENSION` Düzeltmesi — P0
- **Dosya:** `Frontend/src/features/coach/approvals/ApprovalsPage.jsx`
- **Kök Neden:** Backend `ApprovalItemDto` (`entityType`, `createdAt`, `rejectionReason`) camelCase dönerken `ApprovalsPage.jsx` içinde `item.entity_type`, `item.created_at`, `item.rejection_reason` okunuyor; ayrıca `HOMEWORK_EXTENSION` etiketi ve detay görünümü eksik.
- **Yap:**
  1. Tüm alan erişimlerini Backend DTO sözleşmesine (`item.entityType`, `item.createdAt`, `item.rejectionReason`) hizala.
  2. `ENTITY_TYPE_LABELS` içine `HOMEWORK_EXTENSION: 'Ödev Ek Süre Talebi'` ekle ve `renderPayloadDetails` içinde öğrenci adı (`payload.studentName`), ödev başlığı (`payload.homeworkTitle`), talep edilen gün/tarih ve notu yapılandırılmış kart olarak göster (`JSON.stringify` ham çıktısını kaldır).
- **Kabul:** Onay Merkezi'nde tüm taleplerin türü, tarihi, öğrenci adı ve detayları eksiksiz ve okunaklı görünür.

#### [x] U6 — `CoachLayout.jsx` Breadcrumb, Aktif Menü Vurgusu ve `ThemeDecorContainer` Katman Düzeltmesi
- **Dosyalar:** `CoachLayout.jsx`, `ThemeDecorContainer.module.css` (veya ilgili stil dosyası)
- **Yap:**
  1. `CoachLayout.jsx` içindeki `getPageTitle()` fonksiyonuna `/audit-logs` → `'İşlem Geçmişi (Denetim)'` eşlemesini ekle; alt detay sayfalarında (`/coach/students/:id`, `/coach/teachers/:id`, `/coach/programs/:id/courses/:courseId`) üst bölüm adını tıklanabilir breadcrumb olarak göster (ör. `Mentörüm / Öğrenciler & Programlar / Öğrenci Detayı`).
  2. Sol menüdeki `Öğrenciler & Programlar` öğesinin `/coach/programs/.../courses/...` rotalarında da `isActive` kalmasını sağla.
  3. `ThemeDecorContainer` içindeki sağ üst güneş/küre dekoruna `pointer-events: none; z-index: 0; opacity: 0.35;` uygula ve ana içerik sarmalayıcısını `position: relative; z-index: 1;` yaparak dekorun hiçbir tablo sütununu veya filtre kutusunu kapatmamasını garanti altına al.
- **Kabul:** Hiçbir sayfada breadcrumb "Panel" olarak düşmez, sol menü aktifliği kaybolmaz ve güneş dekoru metin/butonların üstünü örtmez.

#### [x] U7 — Öğrenci ve Veli Portallarında "Takvim & Program" Birleştirmesi ve Empty State
- **Dosyalar:** `StudentLayout.jsx`, `StudentCalendarPage.jsx`, `StudentSchedulePage.jsx`, `ParentLayout.jsx`, `ParentCalendarPage.jsx`, `ParentSchedulePage.jsx`
- **Yap:**
  1. **Öğrenci Portalı:** `StudentCalendarPage.jsx` zaten `Akademik Takvim | Haftalık Programım` sekmelerine sahip olduğu için `StudentLayout.jsx` sol menüsündeki mükerrer `Programım` satırını kaldır (`Takvim` adını `Takvim & Program` yap); `StudentSchedulePage` sekme içinde render edildiğinde mükerrer `<h1>Programım</h1>` başlığını gizle.
  2. **Veli Portalı:** `ParentCalendarPage.jsx` içine `Akademik Takvim | Ders Programı` segmented tab'ı ekle; `ParentLayout.jsx` alt barındaki sıkışık 6 sekmeyi **5 ergonomik sekmeye** (`Özet | Ödev Takibi | Takvim & Program | Sınavlar | Ödemeler`) indir.
  3. `ParentSchedulePage.jsx` içinde endpoint adresini `/parents/children/${student.studentId}/schedule` olarak standartlaştır ve henüz ders programı girilmemişse şık bir Empty State (*"Henüz haftalık ders programı tanımlanmamış"*) göster.
- **Kabul:** Öğrenci ve Veli portallarında Takvim ve Haftalık Program tek merkezden, çift başlıksız ve boş ekran hatası olmadan çalışır.

#### [x] U8 — Sözleşme Drift Taraması (`Frontend/src` `snake_case` & Backend Untyped `dynamic` → Typed DTO Dönüşümü)
- **Kapsam (`grep` bulguları):**
  1. **`ApprovalsPage.jsx` (Satır 61, 71, 79, 163, 166, 181, 183):** `item.entity_type`, `item.created_at`, `item.rejection_reason` → `U5` kapsamında `camelCase` olarak düzeltilecek.
  2. **`GoalStreakCard.jsx` (Satır 18–20) & `WeeklyTimeBudgetCard.jsx` (Satır 34–69):** Gereksiz `snake_case` / `PascalCase` fallback zincirleri (`goal?.target_university`, `budget.TotalTrackedMinutes` vb.) temizlenerek doğrudan tek doğruluk kaynağı olan `camelCase` DTO alanlarına (`goal?.targetUniversity`, `budget.totalTrackedMinutes`) bağlanacak.
  3. **Backend Untyped `IEnumerable<dynamic>` Metotlarının Typed DTO'ya (`QueryAsync<T>`) Dönüştürülmesi (4 Kritik Bulgu):**
     - PostgreSQL tırnaksız `AS TeacherName` gibi alias'ları `dynamic` sorgularda küçük harfe (`teachername`) katladığı için yama (tırnaklama) yerine **4 metodun tamamı C# Typed DTO (`QueryAsync<T>`)** yapısına geçirilecek (`AGENTS.md` §A6):
       - `SchoolAccessRepository.cs:158` (`GetStudentCoursesAsync`): `IEnumerable<StudentCourseItemDto>` (`Id`, `Name`, `Type`, `TeacherName`, `SubjectName`) olarak tiplendirilecek (`StudentCoursesPage.jsx:148` öğretmen ve branş adının görünmemesi hatası).
       - `SchoolAccessRepository.cs:379` (`GetStudentTeacherNotesForCoachAsync`): `PublicTeacherNoteDto` ile ortaklaştırılarak (`Note` ve `Visibility` alanlarını da kapsayan tek typed DTO: `TeacherNoteItemDto` / `PublicTeacherNoteDto`) `QueryAsync<PublicTeacherNoteDto>` olarak tiplendirilecek (`CoachStudentDetail.jsx:187` öğretmen notlarında ders/öğretmen adının ve tarihin boş çıkması hatası + A5 tek DTO prensibi).
       - `ProgramRepository.cs:295` (`GetPendingApprovalsAsync`): `IEnumerable<PendingApprovalUserDto>` (`Id`, `FullName`, `Email`, `Role`, `CreatedAt`) olarak tiplendirilecek (`AdminPanelPage.jsx:220` onay bekleyen kullanıcı adının boş çıkması hatası).
       - `InviteRepository.cs:104` (`GetPendingInvitesForCoachAsync`): `IEnumerable<PendingInviteDto>` (`Id`, `Email`, `Code`, `Role`, `CreatedAt`, `ExpiresAt`, `ProgramName`, `ProgramId`) olarak tiplendirilecek ve `AddOrInviteStudentPanel.jsx:343` içindeki `inv.programname` → `inv.programName` yapılacak.
- **Kabul:** `Frontend/src` genelinde `VITE_` ortam değişkenleri dışında hiçbir `snake_case` veya küçük harf SQL alias erişimi kalmaz; Backend'deki 4 `dynamic` metot tam tip güvenli `QueryAsync<T>` DTO'ya kavuşur.

---

## 3. Doğrulama Kriterleri (`AGENTS.md` §A5–A7, §C3)
- [x] Tüm değiştirilen/eklenen dosyalar **Ajan-Optimum Hibrit** sınırları içinde (hiçbir dosya 520 satırı aşmaz).
- [x] `dotnet build Backend/Mentorum.sln` & `dotnet test Backend/Mentorum.sln` → 0 uyarı, 0 hata (81/81 xUnit testi geçti).
- [x] `npm --prefix Frontend run build` → 0 hata.
- [x] `npx --prefix Frontend oxlint Frontend/src` → **0 uyarı, 0 hata**.

