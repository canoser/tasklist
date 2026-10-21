# 🧭 Mentörüm — V12 Görev Listesi (Öğrenci Mobil Arayüzü & UX Sadeleştirmesi)

> **Tarih:** 21 Ekim 2026  
> **Kapsam:** Öğrenci Portalı (Student UX & UI) — Mobil Ergonomi, Görsel İnce Ayar (Visual Polish) ve Sadeleştirme  
> **Gelecek Uyumluluk:** Bu sürümde kurulan arayüz ve sadeleştirme standartları, sonraki aşamalarda Koç, Öğretmen ve Veli panellerine de uygulanacaktır.  
> **Temel Kurallar:** Hardcoded Türkçe Serbest (BÖLÜM A2), Sıfır Emoji (Yalnızca Lucide SVG), Tema CSS Değişkenleri (`var(--bg-app)`, `var(--bg-card)`, `var(--border-color)`), Temiz Arka Plan (Dekor Kirliliği Yok).  
> **Görev Durum Kuralı:** Henüz bitmemiş maddeler `[ ]`, bitmiş maddeler ise `[x]` ile işaretlenecektir.

---

## 0. Giriş ve Sorun Tanımı

V9, V10 ve V11 sürümleriyle sistemin backend, veritabanı, güvenlik (IDOR) ve hibrit depolama altyapısı eksiksiz tamamlanmıştır (tüm testler yeşil). Ancak öğrenci mobil ekran görüntüleri incelendiğinde aşağıdaki kritik UI/UX darboğazları tespit edilmiştir:
1. **Alt Menü (Bottom Nav) Sıkışması:** Alt barda 8 sekme yan yana konulduğu için metinler ("ProgramımDerslerim") birbirine yapışmış, dokunma alanları ergonomik sınırların altına inmiştir.
2. **Arka Plan Kirliliği:** Arka plandaki hareketli tema dekoru (`ThemeDecorContainer`), devasa beyaz daireler ve polen noktacıkları metin ve rozetlerin üzerini örterek okunabilirliği düşürmektedir. Kullanıcı talebi doğrultusunda ana sayfada dekoratif tema öğeleri kaldırılacak ve sade koyu zemine geçilecektir.
3. **Stilsiz (Varsayılan HTML) Butonlar:** Koyu yeşil tema üzerinde `Tümünü Gör (1)`, `Sıfırla`, `Ek / Çözüm` ve `Çıkış` butonları tarayıcı varsayılan beyaz buton stiliyle parlamakta; modern SaaS tasarımını bozmaktadır.
4. **Emoji İhlali:** Arayüzde kural dışı renkli işletim sistemi emojileri (`📱`, `⚙️`, `📥`, `🖼️`, `📄`, `📎`) kalmıştır.
5. **Aşırı Yüklü Kartlar:** Günlük durum bildirimi (check-in), ödev kartları ve boş koçluk kartı mobil ekranı gereksiz yere dikeyde uzatmakta ve zihinsel yük yaratmaktadır.

---

## 1. Görev Dağılımı ve İş Listesi

### BÖLÜM 1: Navigasyon & Yerleşim (Layout & Bottom Nav)

#### [x] T01 — Alt Menüyü (Bottom Nav) 8 Sekmeden 5 Temiz Sekmeye İndirme
- **Dosya:** `Frontend/src/components/layout/StudentLayout/StudentLayout.jsx` (+ `.module.css`)
- **Mevcut Durum (8 Sekme):** Ana Sayfa, Takvim, Programım, Derslerim, Ödevler, Dosyalar, Temalar, Profil.
- **Hedef Durum (Tam 5 Sekme):**
  1. **Ana Sayfa** (`/student/home` — `Home`)
  2. **Takvim** (`/student/calendar` — `Calendar`)
  3. **Derslerim** (`/student/courses` — `BookOpen`)
  4. **Ödevler** (`/student/homework` — `CheckSquare`)
  5. **Profil** (`/student/profile` — `User`)
- **Taşınan & Birleştirilen Sekmeler:**
  - `Temalar`: Alt menüden tamamen çıkarılır. `Profil` sayfası içerisine veya üst bar bildirim ikonunun yanına zarif bir palet ikonu olarak taşınır.
  - `Programım` (`StudentSchedulePage`): Bağımsız bir alt sekme olmaktan çıkarılır; `Takvim` ekranı içine üst sekme ([📅 Takvim] | [🗓️ Okul & Haftalık Şablon]) olarak entegre edilir.
  - `Dosyalar` (`StoragePage`): Alt barda yer kaplamaz; `Derslerim` sayfası üstünden ("Tüm Dosyalarım" butonu) veya `Profil` ekranından erişilebilir hale getirilir.
- **Kabul:** Mobil ekranda (375px–430px) 5 sekme eşit aralıkla yerleşir, metinler asla birbirine yapışmaz veya taşmaz.

#### [x] T01-B — Tablet ve PC İçin 2 Kolonlu Dashboard Izgarası (Responsive Grid)
- **Dosyalar:** `Frontend/src/features/student/home/StudentHome.jsx` (+ `.module.css`)
- **İşlem:**
  - Mobilde tek sütun olan dikey akış korunur.
  - Tablet ve PC ekranlarında (`@media (min-width: 768px)`):
    - **Sol Sütun:** Karşılama, Canlı Sayaç (Kronometre / Hızlı Kayıt), Bugün Nasılsın?, Kişisel Notlar & Sorular.
    - **Sağ Sütun:** Hedef/Streak/Sınav İstatistik Kartları, Yaklaşan Ödevler Özeti, Motivasyon Sözü.
  - Bu 2 kolonlu yapı sayesinde içerik tablet ekranında dikeyde aşırı uzamaz ve sağdaki geniş boş alan verimli kullanılır.
- **Kabul:** Tablette (768px - 1024px) ve PC'de (>1024px) çift kolonlu ferah ızgara görünümüne geçilir.

#### [x] T02 — Gök Cisimleri (Tüm Temalar) ve Doğa Dalları (Yalnızca Doğa Teması) Mobil/Tablet Ergonomisi
- **Dosyalar:** 
  - `Frontend/src/components/common/ThemeDecor/SkyDecor.jsx` (Tüm temalarda ortaktır)
  - `Frontend/src/components/common/ThemeDecor/NatureDecor.jsx` (Yalnızca Doğa temasında aktiftir)
- **Tema Kapsam Ayrımı & İşlemler:**
  1. **Ay / Güneş / Yıldızlar (`SkyDecor`) — TÜM TEMALARI İLGİLENDİRİR:**
     - `SkyDecor` tüm temalarda (`nature`, `ocean`, `cyber`, `formal`) daima aktiftir ve efektler **kesinlikle korunacaktır**.
     - **Mobilde Ay Pozisyonu:** Sabit `left: 280px` mobilde ekran dışına taştığı için mobil görünümde (`< 768px`) ay **ekranın soluna** (`left: 16px` – `20px`) hizalanacaktır.
     - **Mobilde Ay Boyutu:** Mobilde ay boyutu **%70** seviyesine küçülecektir (260px $\rightarrow$ ~182px, `scale(0.7)` veya `width/height: 182px`).
     - **Tablet / PC Ay Konumu:** Tablette başlıkların arkasını kapatmayacak şekilde sol menünün bitişiğinden dengeli bir ofsetle konumlandırılacaktır.
  2. **Dallar (`NatureDecor`) — YALNIZCA DOĞA (NATURE) TEMASINI İLGİLENDİRİR:**
     - Diğer temalarda (ör. okyanus dalgaları, siber ızgara) dal bulunmaz; bu düzenleme yalnızca `NatureDecor.jsx` içindir.
     - `NatureDecor` içindeki 5 daldan ortadaki 3 dal mobilde (`@media (max-width: 768px)`) gizlenecek; mobilde dal yoğunluğu **yarıya düşürülecek**, yalnızca 2 kenar dalı bırakılacaktır.
  3. **İkonlar (Lucide SVG Standardı) — TÜM TEMALARI İLGİLENDİRİR:**
     - Emojilerin Lucide ikonlarla değiştirilmesi seçili temadan bağımsız olarak tüm ekranlarda geçerli genel kuraldır.
- **Kabul:** Tüm temalarda ay mobilde sol kenarda %70 boyutta görünür; Doğa temasında mobilde dal sayısı yarıya iner; diğer temaların kendi dekorları bozulmaz; ikonlar temadan bağımsız SVG kalır.

---

### BÖLÜM 2: Buton Stilleri, İkonlar & Tasarım Tutarlılığı

#### [x] T03 — Stilsiz (Beyaz Patlayan) Butonların Temaya Uyarlanması
- **Dosyalar:** 
  - `Frontend/src/features/student/home/StudentHome.jsx`
  - `Frontend/src/features/student/home/StudyTimerCard.jsx`
  - `Frontend/src/features/student/homework/StudentHomework.jsx`
  - `Frontend/src/components/layout/StudentLayout/StudentLayout.jsx`
- **İşlemler:**
  - `Tümünü Gör (1)`: Bembeyaz arka plan kaldırılır; `background: rgba(255, 255, 255, 0.05)`, `border: 1px solid var(--border-color)`, `color: var(--text-primary)` ghost/secondary stili verilir.
  - `🔄 Sıfırla`: Koyu cam yüzey (`rgba(255, 255, 255, 0.06)`), hover efekti ve temaya uygun metin rengi uygulanır.
  - `📎 Ek / Çözüm`: Buton stili ghost button (`var(--border-color)`) formatına çekilir.
  - `Sağ Üst Çıkış Butonu`: Beyaz parlak yuvarlak buton yerine `background: rgba(255, 255, 255, 0.05)`, ince kenarlık ve hafif hover efekti olan modern bir buton yapılır.
- **Kabul:** Hiçbir ekranda tarayıcının varsayılan beyaz buton stili kalmaz; tüm butonlar tema değişkenlerini kullanır.

#### [x] T04 — Emojilerin Lucide SVG İkonları ile Değiştirilmesi
- **Dosyalar:**
  - `Frontend/src/features/storage/StoragePage.jsx`
  - `Frontend/src/features/student/homework/StudentHomework.jsx`
  - `Frontend/src/features/student/home/StudyTimerCard.jsx`
  - `Frontend/src/features/student/home/GoalStreakCard.jsx`
- **Değişim Tablosu:**
  | Eski Emoji | Yeni Lucide İkon | Kullanıldığı Yer |
  | :--- | :--- | :--- |
  | `📱 Bu Cihazı Tanı` | `<Smartphone size={15} /> Bu Cihazı Tanı` | Dosyalarım üst aksiyonlar |
  | `⚙️ İndirme Cihazı Seç` | `<Settings size={15} /> İndirme Cihazı` | Dosyalarım üst aksiyonlar |
  | `📤 Dosya Yükle` | `<Upload size={15} /> Dosya Yükle` | Dosyalarım yükleme butonu |
  | `🖼️ Resimler` | `<Image size={15} /> Resimler` | Dosyalarım sekmesi |
  | `📄 Belgeler` | `<FileText size={15} /> Belgeler` | Dosyalarım sekmesi |
  | `📎 Ek / Çözüm` | `<Paperclip size={14} /> Ek / Çözüm` | Ödev teslim kartı |
  | `🔄 Sıfırla` | `<RotateCcw size={14} /> Sıfırla` | Kronometre kartı |
  | `🔥 Seri / 📅 Sınav / 🎯 Hedef` | `<Flame />`, `<Calendar />`, `<Target />` | Hedef şeridi |
- **Kabul:** UI üzerinde hiçbir işletim sistemi emojisi yer almaz.

---

### BÖLÜM 3: Ana Sayfa Ergonomisi (StudentHome Polish)

#### [x] T05 — "Bugün Nasılsın?" Check-in Kartının Akıllı Küçülmesi (Collapsible)
- **Dosya:** `Frontend/src/features/student/home/MoodCheckinCard.jsx` (+ `.module.css`)
- **İşlem:**
  - Öğrenci o gün için durumunu (Çok Verimli, Normal, Yorgun, Stresli) seçtikten sonra 4 büyük kutu ekranda dikey yer kaplamaya devam etmez.
  - Seçim yapıldıktan sonra kart tek satırlık kompakt bir banda küçülür:
    `"Bugünkü modun: [İkon + Çok Verimli] · [Değiştir]"`
  - "[Değiştir]" tıklandığında 4 durum kutucuğu yeniden açılır.
- **Kabul:** Sayfa açılışında seçim yapılmışsa ekran gereksiz dikey kaydırmadan kurtulur.

#### [x] T06 — Kronometreye Hızlı Ders Seçimi Chip'i
- **Dosya:** `Frontend/src/features/student/home/StudyTimerCard.jsx`
- **İşlem:**
  - Kronometre sayacının (`00:00`) hemen üstüne veya yanına öğrencinin kayıtlı derslerini listeleyen kompakt bir chip/dropdown eklenir ("Ders Seç: Matematik, Fizik...").
  - Sayaç başlatılıp bittiğinde çalışma oturumu doğrudan o derse atanır.
- **Kabul:** Öğrenci sayaç başlatmadan önce tek tıkla çalıştığı dersi seçebilir.

#### [x] T07 — Boş Koç Görüşmesi ve Motivasyon Sözü Sadeleştirmesi
- **Dosya:** `Frontend/src/features/student/home/StudentHome.jsx` (+ `.module.css`)
- **İşlemler:**
  - **Koç Görüşmesi Hazırlığı:** Yaklaşan aktif bir görüşme yoksa ("Planlanmış yaklaşan görüşme bulunmuyor.") bu kart ana sayfada tamamen gizlenir; yalnızca koçla randevu olduğunda aktifleşir.
  - **Motivasyon Kartı:** Parlak neon yeşil-mavi gradyan kaldırılır; koyu cam (glassmorphism: `background: rgba(255, 255, 255, 0.03)`, `border: 1px solid rgba(255, 255, 255, 0.08)`) ve zarif açık renk alıntı tipografisi uygulanır.
- **Kabul:** Ana sayfa gereksiz boş kartlardan arınır ve göz yormayan bir renk uyumuna kavuşur.

#### [x] T08 — Kişisel Notlar & Takıldıklarım Kartı İnce Ayarı
- **Dosya:** `Frontend/src/features/student/home/StudentNotesCard.jsx`
- **İşlemler:**
  - "Kişisel Notlarım" sekmesinin altında tekrar büyük puntolarla yazan "Kişisel Notlar" başlık tekrarı kaldırılır.
  - "Sadece Ben" ve "Koçum da Görsün" seçeneklerindeki ilkel mavi tarayıcı radyo butonları (`<input type="radio">`) yerine şık hap/segmented (pill) buton seçici uygulanır.
  - Üst hedef bandında (`GoalStreakCard`) dar ekranda metinlerin ("Hedef Belirlen...") kesilmemesi için flex düzeni optimize edilir.
- **Kabul:** Notlar sekmesinde başlık tekrarı kalkar; butonlar ve gizlilik kontrolleri modern segmented pill haline gelir.

---

### BÖLÜM 4: Ödevler, Takvim & Programım İnce Ayarı

#### [x] T09 — Ödev Kartı Sadeleştirmesi (Akordeon / İsteğe Bağlı Detay)
- **Dosya:** `Frontend/src/features/student/homework/StudentHomework.jsx` (+ `.module.css`)
- **İşlemler:**
  - Ödev kartında not textarea'sı ve dosya ekleme alanı varsayılan olarak kapalı (akordeon) tutulur.
  - Kart üzerinde sadece: Başlık, etiket, gecikmiş/bekliyor rozeti, % ilerleme slider'ı ve "Kaydet / Tamamla" butonu görünür.
  - Not veya dosya eklemek isteyen öğrenci için `[+ Not / Dosya Ekle]` ve `[Ek Süre İste]` butonları yer alır; tıklandığında ilgili alt form açılır.
  - "Son Teslim: 16 Eki 2026, 00:00" metnindeki gereksiz `, 00:00` saat ifadesi temizlenir (yalnızca özel bir saat girilmişse saat gösterilir).
- **Kabul:** Bir öğrencinin 5–10 ödevi olduğunda bile ödev listesi temiz bir şekilde taranabilir.

#### [x] T10 — Takvim & Okul Saatleri Şablonu Birleşimi
- **Dosyalar:** 
  - `Frontend/src/features/student/calendar/StudentCalendarPage.jsx`
  - `Frontend/src/features/student/schedule/StudentSchedulePage.jsx`
- **İşlemler:**
  - `StudentCalendarPage` içine üst sekme eklenir:
    - `[📅 Takvimim]`
    - `[🗓️ Okul & Haftalık Şablon]` (Eski `Programım` sayfası buraya entegre edilir).
  - Mobil dar ekranda ay görünümündeki kesilen ödev metinleri ("kar...", "inte...") yerine renkli noktalar (`●`) gösterilir; güne tıklandığında etkinlikler takvimin altında tam metin olarak listelenir.
  - Okul saatleri şablonu girişinde gün seçimi açılır liste yerine `[Pzt] [Sal] [Çar] [Per] [Cum] [Cts] [Paz]` çoklu gün seçim butonları sunularak hafta içi günler tek tıkla şablona eklenebilir.
- **Kabul:** Programım sekmesi Takvim içine entegre olur; mobil takvim okunabilir hale gelir.

#### [x] T11 — Dosyalarım Sayfası Başlık ve Cihaz Sadeleşmesi
- **Dosya:** `Frontend/src/features/storage/StoragePage.jsx` (+ `.module.css`)
- **İşlemler:**
  - Sayfanın en üstünde yer alan ve öğrenci için kafa karıştırıcı olan `Bu Cihazı Tanı` ve `İndirme Cihazı Seç` büyük butonları kaldırılır.
  - Cihaz tanıma işlemi uygulama açılışında arka planda sessizce çalışır (T14).
  - İndirme cihazı seçimi, başlığın yanına tek bir ayar çarkı / senkronizasyon ikonu (`<Settings size={18} />`) olarak küçültülür.
  - Öğrenci sayfaya girdiğinde doğrudan dosya yükleme ve listeleme alanına odaklanır.
- **Kabul:** Sayfa üstündeki teknik buton kalabalığı temizlenir.

---

### BÖLÜM 5: Test & Doğrulama

#### [x] T12 — Build, Mobil Simülasyon & Regresyon Testleri
- **İşlemler:**
  - `cd Frontend && npm run build` (0 hata, 0 uyarı ile tamamlandı).
  - Mobil viewport (375px, 390px, 414px) üzerinde test edildi.
  - Backend entegrasyonu ve testleri: `dotnet test` (64/64 test yeşil).

---

### BÖLÜM 6: Ek UX İyileştirmeleri (Depolama Güvenliği, Yerleşim Uyumu & Gökyüzü Dekoru)

#### [x] T13 — Dosyalarım Virüs Uyarısı Ergonomisi & Güvenlik Psikolojisi
- **Dosya:** `Frontend/src/features/storage/StoragePage.jsx` (+ `.module.css`)
- **İşlemler:**
  - "Dosya Yükle" / gönderme alanında yer alan *"Dosyalar otomatik virüs taramasından geçmez..."* metni, yükleme yapan tarafta güvenlik açığı veya suiistimal çağrışımı uyandırmaması için yükleme butonunun altından kaldırıldı.
  - Bu uyarı yalnızca gelen/indirilebilir dosyalar alanına yuvarlak bilgi ikonu (`<Info size={14} />`) eşliğinde zarif bir güvenlik ipucu olarak eklendi (*"İndirilen dosyalar otomatik virüs taramasından geçmez; güvenmediğiniz kaynaklardan gelen dosyaları açarken dikkatli olunuz."*).
- **Kabul:** Yükleme alanında açık kapı çağrışımı yapan virüs uyarısı kalmadı; indirilen dosyalarda yuvarlak bilgi ikonu (`i`) ile alıcı taraf uyarıldı.

#### [x] T14 — Profil & Görünüm Sayfasındaki "Ana Sayfa Yerleşim Düzeni" Uyumsuzluğunun Düzeltilmesi
- **Dosyalar:** 
  - `Frontend/src/features/student/home/StudentHome.jsx`
  - `Frontend/src/features/student/theme/StudentThemePage.jsx` (+ `.module.css`)
- **İşlemler:**
  1. `StudentHome.jsx`, `studentHomeLayout` (`compact` | `widget`) seçimine dinamik olarak bağlandı:
     - **`compact` (Önerilen / Odak Öncelikli):** Sol/üst kolonda Canlı Kronometre + Mod Check-in + Kişisel Notlar/Sorular; Sağ/alt kolonda Hedef/Streak Şeridi + 4'lü KPI + Yaklaşan Ödevler.
     - **`widget` (Görev & Aksiyon Öncelikli):** Sol/üst kolonda Yaklaşan Ödevler + 4'lü KPI + Mod Check-in; Sağ/alt kolonda Canlı Kronometre + Kişisel Notlar + Hedef/Streak.
  2. `StudentThemePage.jsx` içindeki şematik önizlemeler ve kart metinleri bu gerçek responsive ızgaraya göre güncellendi.
- **Kabul:** Öğrenci profil/tema ayarlarından düzeni değiştirdiğinde ana sayfadaki kartların dizilimi anında güncellenir.

#### [x] T15 — Gökyüzü Dekoru (Ay & Güneş) Sağ Üst Konumlandırma & Gerçek SVG `<mask`> Astronomik Hassasiyeti (Argon İyileştirmesi)
- **Dosyalar:** 
  - `Frontend/src/components/common/ThemeDecor/SkyDecor.jsx`
  - `Frontend/src/components/common/ThemeDecor/SkyDecor.module.css`
- **İşlemler:**
  1. **Gerçek SVG Maskeleme (`<mask id="moonPhaseMask">`):** Koyu moddaki Ay çiziminde gerçek SVG mask yapısına geçildi; karanlık alan aydınlık hilali/şişkin ayı pürüzsüzce kesti, çift daire/gri leke görüntüsü ortadan kaldırıldı.
  2. **Sağ Üst Gökyüzü Boşluğuna Taşıma:** Ay ve Güneş, sol üstteki sayfa başlıklarının ve sekmelerin arkasından çıkarılarak sağ üst gökyüzü alanına (`top: 56px-64px`, `right: 12px-40px`, `pointer-events: none`, `z-index: 0`) taşındı.
  3. **Ay Işıması (Moonlight Glow) & Güneş Efekti:** 
     - Ay yüzeyine gümüş-mavi tonlarda yumuşak `radialGradient` (#FFFFFF $\rightarrow$ #CBD5E1) ve `drop-shadow(0 0 24px rgba(226, 232, 240, 0.22))` ay ışığı halesi verildi.
     - Açık moddaki Güneş aynı sağ üst konuma hizalanıp altın sarısı/kehribar (#FDE047 $\rightarrow$ #D97706) corona geçişiyle güncellendi.
- **Kabul:** Ay ve Güneş hiçbir metni veya sekmeyi kapatmaz; sağ üst gökyüzü boşluğunda parlar; ay evresi gerçek astronomik hilal/dolunay formunda keskin ve zarif görünür.

#### [x] T16 — Build, Responsive Simülasyon & Doğrulama (V12.1)
- **İşlemler:**
  - `cd Frontend && npm run build` (0 hata ile derlendi).
  - Mobil, tablet ve masaüstünde sağ üst Ay/Güneş konumunun, dosya bilgi ikonunun ve yerleşim geçişlerinin test edilmesi.

---

### BÖLÜM 7: V12.2 İnce Ayarları (Tema Sekmeleri, Sistem Modu, Konu Takibi & Video/Kaynak Tikleme)

#### [x] T17 — Görünüm & Tema Sayfasının Sekmeli Hale Getirilmesi, Sistem Modu & Birebir Gerçekçi Önizleme
- **Dosyalar:** 
  - `Frontend/src/store/uiStore.js`
  - `Frontend/src/features/student/theme/StudentThemePage.jsx` (+ `.module.css`)
- **İşlemler:**
  - Sayfa üstüne 3 sekmeli navigasyon eklendi: `[ 📐 Yerleşim Düzeni ]` | `[ 🌓 Görünüm Modu ]` | `[ 🎨 Tema & Stil ]`. Sayfa gereksiz dikey uzamadan kurtarıldı.
  - Görünüm modu seçeneklerine `[ 💻 Cihazla Aynı (Sistem) ]` modu eklendi; `window.matchMedia('(prefers-color-scheme: dark)')` ile gerçek zamanlı senkronize edildi.
  - *Yerleşim Düzeni* sekmesindeki minyatür şemalar, gerçek ana sayfadaki kart hiyerarşisiyle (Kronometre $\rightarrow$ Mod $\rightarrow$ Notlar $\rightarrow$ Alt Seri/Sınav Şeridi) birebir örtüşecek şekilde güncellendi.

#### [x] T18 — Konu Takibinin "Derslerim" Ekranına Taşınması & Kaynak/Video Ders Tikleme
- **Dosyalar:**
  - `Frontend/src/features/student/profile/StudentProfilePage.jsx`
  - `Frontend/src/features/student/courses/StudentCoursesPage.jsx` (+ `.module.css`)
- **İşlemler:**
  - `StudentProfilePage` içinden "Konu Takibi" sekmesi kaldırıldı.
  - `StudentCoursesPage` içine iki üst sekme eklendi: `[ 📚 Derslerim, Kaynaklar & Video Dersler ]` ve `[ 🎯 Müfredat & Konu Takibi ]`.
  - Müfredat sekmesinde genel ilerleme çubuğu (`{completedTopics}/{totalTopics}`), ders filtreleme butonları ve konu listesi sunuldu.
  - Kaynaklar ve video dersler listesine interaktif tamamlama tik butonu (`<CheckCircle2 />` / `<Circle />`) eklendi; öğrenci tek tıkla kaynağı veya video dersi tamamlandı olarak işaretleyebilir.

---

## 2. Uygulama Sırası Özeti

1. **Aşama 1 (Navigasyon, Tablet Izgarası & Gök Cisimleri):** T01 + T01-B + T02 [Tamamlandı].
2. **Aşama 2 (Görsel Tutarlılık):** T03 + T04 [Tamamlandı].
3. **Aşama 3 (Ana Sayfa Ergonomisi):** T05 + T06 + T07 + T08 [Tamamlandı].
4. **Aşama 4 (Ödev, Takvim & Dosyalar):** T09 + T10 + T11 [Tamamlandı].
5. **Aşama 5 (Doğrulama & Commit):** T12 [Tamamlandı].
6. **Aşama 6 (V12.1 Ek İyileştirmeler):** T13 + T14 + T15 + T16 [Tamamlandı].
7. **Aşama 7 (V12.2 Tema Sekmeleri, Sistem Modu & Derslerim Tikleme):** T17 + T18 [Tamamlandı].
8. **Aşama 8 (V12.3 Koç Mobil Arayüzü & Sadeleştirme):** T19 + T20 + T21 + T22 + T23 + T24 [Tamamlandı].
9. **Aşama 9 (V12.4 Öğrenci Ekleme & Yönetim Tasarımı):** T25 + T26 + T27 [Planlandı].

---

### BÖLÜM 8: V12.3 Koç Mobil Arayüzü, Ergonomi & Sadeleştirme

#### [x] T19 — Üst Bar Temizliği, Çift Menü Kaldırma & 5-Sekmeli Mobil Alt Bar (Bottom Nav)
- **Dosyalar:**
  - `Frontend/src/components/layout/CoachLayout/CoachLayout.jsx`
  - `Frontend/src/components/layout/CoachLayout/CoachLayout.module.css`
- **İşlemler:**
  1. **Çift Menü Hatasının Giderilmesi:** Alt barda zaten `[ ☰ Menü ]` bulunacağından, mobilde sol üstteki `[ ≡ ]` hamburger butonu kaldırılacak. Sol üstte 3 satıra bölünüp taşan breadcrumb yerine yalnızca o anki sayfanın net, tek satır başlığı (`Dashboard`, `Takvim`, `Öğrenciler`, `Raporlar`) gösterilecek.
  2. **Mobil Üst Bar Taşma ve Dağılım Çözümü:**
     - Sağ taraftaki ekran dışına taşan buton kalabalığı temizlenecek. Sağda yalnızca 3 kompakt ve taşmayan ikon yer alacak: `[ 🔍 Arama ]` (tıklanınca Global Arama modalı açılır), `[ + Hızlı Ekle ]` ve `[ 🔔 Bildirimler ]` (ekrandan taşması engellenecek, tam görünür olacak).
     - Mobilde kaybolma riski olan özellikler güvenle **Soldan Açılan Çekmece Menü (Drawer)** içine taşınacak: `[ 👁️ Rol Gözüyle Gör ]`, `[ 📥 Uygulamayı Cihaza Kur (PWA) ]` ve `[ 🎨 Tema Seçici ]` çekmecenin üst/alt aksiyon alanlarına entegre edilecek.
  3. **Ergonomik Mobil Alt Bar (Bottom Nav — `< 768px`):**
     - `[ 📊 Dashboard ]` (`/coach/dashboard` — `LayoutDashboard`)
     - `[ 👥 Öğrenciler ]` (`/coach/students` — `Users`)
     - `[ 📅 Takvim ]` (`/coach/calendar` — `Calendar`)
     - `[ 🛡️ Onaylar ]` (`/coach/approvals` — `ShieldCheck` — canlı rozetli `coachPendingCount`)
     - `[ ☰ Menü ]` (`Menu` — sol çekmeceyi açar)
  4. **Sayfa Altı Güvenli Boşluk:** `pageContent` alanına mobilde `padding-bottom: 84px` verilerek kartların alt bar arkasında kalması engellenecek.

#### [x] T20 — Güneş Opaklığı & Buton Arka Plan Koruması (Background Shield)
- **Dosyalar:**
  - `Frontend/src/components/common/ThemeDecor/SkyDecor.jsx`
  - `Frontend/src/components/common/ThemeDecor/SkyDecor.module.css`
- **İşlemler:**
  1. Mobilde (`< 768px`) sağ üstteki Güneş opaklığı `opacity: 0.28` seviyesine çekilecek; corona halesi yumuşatılarak su damgası/atmosfer ışığı havasına kavuşturulacak.
  2. `Veli Raporu İndir (PDF)` ve `Gözüyle Gör` gibi ikincil (outline/ghost) butonlara `background: var(--bg-card)` opak zemin verilecek; arkalarından geçen sarı Güneş dekorunun buton metinlerini yutması engellenecek.

#### [x] T21 — Koç Dashboard Mobil Bento Izgara (2x2 KPI) & Tek Satır Sekmeler
- **Dosyalar:**
  - `Frontend/src/features/coach/dashboard/CoachDashboard.jsx`
  - `Frontend/src/features/coach/dashboard/CoachDashboard.module.css`
- **İşlemler:**
  1. Tüm mobil ekranı dikeyde tek başına kaplayan 4 dev KPI kartı, 2x2 kompakt bento ızgaraya (`grid-template-columns: 1fr 1fr; gap: 10px;`) dönüştürülecek; iç boşluk ve yazı boyutları küçültülecek. Koç sayfayı açtığında kaydırmadan alttaki görev listesini görebilecek.
  2. `Tüm Programlar` seçicisi başlık satırıyla hizalanacak.
  3. `[ Acil & Gecikenler (2) ]`, `[ Onay Bekleyenler (0) ]`, `[ Öğretmen Notları (0) ]` sekmelerinde metinlerin iki satıra kırılması `white-space: nowrap` ve `overflow-x: auto` ile tek satırlık yatay kaydırılabilir modern hap (pill) butonlara çevrilecek.

#### [x] T22 — Takvim Ekranı Açılır/Kapanır Filtre Paneli (Collapsible Sheet)
- **Dosyalar:**
  - `Frontend/src/features/coach/calendar/CalendarPage.jsx`
  - `Frontend/src/features/coach/calendar/CalendarPage.module.css`
- **İşlemler:**
  1. Takvim ızgarasını ekranın en altına iten 5 adet açık dropdown filtre (Program, Öğrenci, Ders, Öğretmen, Etkinlik Türü), mobilde tek bir `[ ⚡ Filtrele ]` (aktif filtre varsa `Filtrele (X)`) butonuyla açılıp kapanan şık bir akordeon / panel içerisine alınacak. Takvim ızgarası doğrudan ekranın üstünde başlayacak.
  2. Lejant renk noktaları tek satırda yatay kaydırılabilir yapılacak.
  3. Mobilde görünüm butonları sıkışmadan ergonomik dokunma alanlarına kavuşturulacak.

#### [x] T23 — Finans Çift Buton Sadeleştirmesi & Raporlar Kart Hizalaması
- **Dosyalar:**
  - `Frontend/src/features/coach/payments/CoachPaymentsPage.jsx` (+ `.module.css`)
  - `Frontend/src/features/coach/reports/CoachReports.jsx` (+ `.module.css`)
- **İşlemler:**
  1. **Finans:** Liste boşken (Empty State) hem üstte hem altta tekrar eden yeşil `+ Ödeme Planı Oluştur` butonundan üstteki mobilde başlık alanından sadeleştirilecek; çift buton karmaşası bitecek. 4'lü finans KPI kartı Dashboard gibi 2x2 kompakt ızgaraya alınacak.
  2. **Raporlar:** "Bu Hafta Genel Durum" kartındaki başlıklar ve altındaki kaymış rakamlar (`1`, `1`, `0`, `1`) ortalanmış, hizalı 2x2 kutucuklara dönüştürülecek. Veli Raporu İndir butonu Güneş çakışmasından kurtarılıp opak zeminle netleştirilecek.

#### [x] T24 — Profil Sayfası Sola Hizalama & Öğrenci Detay 10 Sekmenin 4 Gruba Birleştirilmesi
- **Dosyalar:**
  - `Frontend/src/features/coach/profile/CoachProfilePage.jsx` (+ `.module.css`)
  - `Frontend/src/features/coach/student-detail/CoachStudentDetail.jsx` (+ `.module.css`)
- **İşlemler:**
  1. **Profil Sayfası:** `CoachProfilePage` içindeki dikeyde aşırı yer kaplayan kullanıcı kartı mobilde yatay kompakt karta dönüştürülecek; ortalanmış (`text-align: center`) form etiketleri (Uzmanlık Alanı, Biyografi vb.) modern SaaS standardına uygun olarak sola hizalanacak.
  2. **Öğrenci Detay 10 Sekmenin 4 Ana Gruba Birleştirilmesi:**
     Mobilde yatayda kayarak kullanımı zorlaştıran 10 ayrı sekme, 4 ana akıllı sekme (ve içlerindeki düzenli alt kartlar/bölümler) halinde birleştirilecek:
     - **1. Genel & Zaman:** `info` (İletişim & Akademik Hedefler) + `timeBudget` (Haftalık Zaman Bütçesi) + `events` (Öğrenci Takvimi).
     - **2. Akademik (Ödev & Sınav):** `homework` (Ödev Takibi & Ata) + `exams` (Sınav Geçmişi & Netler) + `topics` (Müfredat & Konu Takibi).
     - **3. Seans & Notlar:** `sessions` (Birebir Koçluk Görüşmeleri) + `notes` (Koç Özel Notları) + `teacherNotes` (Öğretmen Ders Notları).
     - **4. Veli & İletişim:** `parents` (Veli İletişim Bilgileri, İzinler & Veli Davet Etme Paneli).
  3. **Emoji Temizliği & Buton Standartları:**
     - `icon="📄"`, `icon="✏️"`, `icon="📝"`, `icon="←"` emojileri temizlenip Lucide SVG ikonlarına (`FileText`, `Edit3`, `Plus`, `ArrowLeft`) geçirilecek.
     - `[ PDF Rapor ]`, `[ Düzenle ]`, `[ Ödev Ata ]` butonları eşit genişlikte ve modern SaaS hiyerarşisinde düzenlenecek.

---

### BÖLÜM 9: V12.4 Öğrenci Ekleme Alanı & Yönetim UI/UX Tasarımı

#### [ ] T25 — Öğrenci Ekleme Alanı İkili Mod Tasarımı (Doğrudan Ekleme vs. E-posta ile Davet)
- **Dosyalar:**
  - `Frontend/src/features/coach/students/CoachStudents.jsx`
  - `Frontend/src/features/coach/students/CoachStudents.module.css`
- **Tasarım & UI Hedefleri:**
  1. `+ Yeni Öğrenci Ekle` butonuna tıklandığında açılan forma **2'li Segment Sekme (Segmented Switch)** eklenmesi:
     - **Sekme 1: `[ ⚡ Doğrudan Ekle (E-postasız / Hızlı Kayıt) ]` (Varsayılan):**
       - **Ad Soyad** (Metin kutusu, zorunlu)
       - **Program Seçin** (Açılır kutu, zorunlu)
       - **Sınıf Seviyesi** (Açılır kutu: 8. Sınıf / LGS, 9, 10, 11, 12, Mezun)
       - **Alan / Branş** (Açılır kutu: SAY, EA, SÖZ — sınıfa göre opsiyonel)
       - **E-posta / Telefon** (İsteğe bağlı metin kutusu — "Boş bırakılabilir, öğrenciye e-posta gönderilmez")
       - **Aksiyon Butonu:** `[ + Öğrenciyi Doğrudan Ekle ]`
       - **Bilgi Notu:** "Öğrenciye e-posta daveti gönderilmez; öğrenci anında koçun aktif listesine eklenir ve hemen ödev/planlama yapılabilir."
     - **Sekme 2: `[ ✉️ E-posta ile Davet Gönder ]`:**
       - Öğrencinin e-posta adresine davet bağlantısı göndermek isteyen koçlar için mevcut davet akışını temiz bir alt sekmede korur.
  2. Başarılı ekleme sonrası form altında yeşil bilgilendirme kartı ve gerektiğinde öğrenciyle elden/WhatsApp üzerinden paylaşılabilecek şık bir "Giriş / Davet Bilgisi Kopyala" kutusu sunulması.

#### [ ] T26 — Öğrenci Arama, Filtreleme ve Kart Hiyerarşisi UI İyileştirmesi
- **Dosyalar:**
  - `Frontend/src/features/coach/students/CoachStudents.jsx`
  - `Frontend/src/features/coach/students/CoachStudents.module.css`
- **Tasarım & UI Hedefleri:**
  1. **Filtre Çubuğu Hizalaması:** `Öğrenci ara`, `Tüm Programlar` ve `Tüm Sınıflar` filtrelerinin hem masaüstünde hem mobilde eşit yükseklik (`height: 42px`), dengeli boşluk ve grid düzenine kavuşturulması.
  2. **Öğrenci Kartları Rozetleri:** Kart üstündeki `Kayıtlı / Aktif` veya `Pasif` rozetlerinin tema zemin rengiyle çakışmayan ferah kontrastta düzenlenmesi; ödev istatistik haplarının (`Aktif`, `Tamamlanan`, `Geciken`) mobil ekranda taşma yapmadan sarmalanması (`flex-wrap`).
  3. **Bekleyen Davetler Kartı:** Bekleyen davetler listesinin açılır/kapanır (`collapsible`) kompakt bir akordeon veya rozet haline getirilerek ana öğrenci listesini aşağı itmesinin önlenmesi.

#### [ ] T27 — Güneş Dekoru & Aksiyon Butonları Katman Koruması (Z-Index & Opaque Shield)
- **Dosyalar:**
  - `Frontend/src/features/coach/students/CoachStudents.module.css`
  - `Frontend/src/components/common/ThemeDecor/SkyDecor.module.css`
- **Tasarım & UI Hedefleri:**
  1. Doğa veya açık temalarda sağ üstte yer alan Güneş dekorunun form açıldığında `[ ✕ İptal ]` ve `[ Davet Gönder / Ekle ]` butonlarının hemen arkasına denk gelip buton metinlerinin okunmasını zorlaştırması engellenir.
  2. Form kartına ve aksiyon butonlarına opak yüzey (`background-color: var(--bg-color-surface)`) ve net `z-index` hiyerarşisi verilerek güneş ışığının butonların okunabilirliğini bozması tamamen önlenir.

