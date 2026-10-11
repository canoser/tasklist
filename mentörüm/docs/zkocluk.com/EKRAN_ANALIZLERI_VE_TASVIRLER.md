# Z Koçluk (zkocluk.com) Arayüz, Akış ve Ekran Analizleri

> **Bu Belgenin Amacı:**  
> `docs/zkocluk.com` dizininde bulunan **35 adet PNG ekran görüntüsünün** (778.png - 811.png ve 2 adet tam ekran yakalama) her birini piksel, bileşen, renk paleti, yerleşim (layout), veri modeli, etkileşim ve kullanıcı senaryoları seviyesinde eksiksiz tasvir etmektir.  
> Başka bir yapay zekâ ajanı veya yazılımcı bu dokümanı okuduğunda, orijinal ekran görüntülerini görmüş kadar net bir biçimde sistemi ve arayüzü canlandırabilir, birebir bileşenlerini ve backend gereksinimlerini kodlayabilir.

---

## 1. Genel Tasarım Dili, Tema ve Layout Mimarisi

* **Genel Renk Paleti:**
  * **Sol Sidebar Arka Planı:** Çok koyu lacivert / gece mavisi (`#0b132b` / `#0f172a`).
  * **Sayfa Arka Planı:** Çok açık gri-mavi degrade / yumuşak nötr zemin (`#f8fafc` - `#f1f5f9`).
  * **Sidebar Aktif Öğe Arka Planı:** Canlı elektrik mavisi (`#2563eb` - `#1d4ed8`), yuvarlatılmış köşeli dolgu.
  * **Sidebar Pasif Menü Metinleri:** Açık gri-mavi (`#94a3b8`), sol tarafında ikonlar (`20px`).
  * **Birincil Aksiyon Butonları (Primary Buttons):** Koyu deniz mavisi / zümrüt turkuaz (`#0d9488` / `#009688`), beyaz metin, `border-radius: 8px`.
  * **İkincil / Seçim Butonları:** Açık mavi zemin (`#eff6ff` veya `#e0e7ff`), mavi kenarlık veya metin.
  * **Tehlikeli / Silme Butonları:** Kırmızı outline veya kırmızı ikon (`#ef4444`).
  * **Kartlar (Cards):** Beyaz (`#ffffff`), yumuşak gölgeli (`box-shadow: 0 1px 3px rgba(0,0,0,0.05)`), `border-radius: 12px`, ince kenarlıklı (`border: 1px solid #e2e8f0`).
* **Navigasyon Yapısı (Sol Menü Hiyerarşisi):**
  * Üstte **Z Koçluk** logosu (Mavi stilize 'Z' ikonu + beyaz kalın metin).
  * Menü Öğeleri:
    1. **Ana Sayfa** (Radar)
    2. **Öğrenci İşleri** (Açılır Menü: *Öğrenci takip, Öğrenci listesi, Öğrenci ekle, E-okul'dan yükle, Excel'den yükle*)
    3. **Plan Hazırla** (Açılır Menü: *Kazanım Temelli, Ders Temelli, Konu Temelli, Serbest Planlama, Müfredat Temelli, Ders Kitabı Temelli, LGS Müfredat, YKS Müfredat, LGS Temelli, YKS Temelli, Sınav Karnesi Temelli, Yanlış Analizi Temelli, Plan Düzenle*)
    4. **Dijital İçerik Gönder**
    5. **Sanal Optik**
    6. **Tercih Koçluğu** (Açılır Menü: *LGS, YKS*)
    7. **Öğrenci Tanıma** (Açılır Menü: *Sınav Kaygısı, Çalışma Alışkanlığı, Zaman Yönetimi, Motivasyon ve Hedef*)
    8. **Bildirimler**
    9. **Raporlar** (Açılır Menü: *Öğrenci Çalışma Raporları, Veli Toplantı Raporu, Öğrenci Tanıma Raporları, Sanal Optik Raporları*)
    10. **Hesabım** (Sekmeler: *Hesap, Fatura, Ödeme*)
    11. **Üyelik** (Paketler ve Dinamik Fiyatlandırma)
    12. **Kurumsal** (Açılır Menü: *İletişim/Firma, Teslimat/Kargo, Mesafeli Satış, İptal/İade*)
    13. **Yardım Masası**
    14. **Çıkış Yap**
* **Sabit Yardımcı Widget (Floating Action Widget):**
  * Tüm ekranların sağ alt köşesinde sabit duran turkuaz renkli hap (pill) buton: **"✨ Z Koçluk Asistan"**.

---

## 2. Teker Teker Tüm Ekranların Detaylı Tasvirleri

---

### `778.png` — Ana Sayfa (Öğrenci Takip Radarı)
* **Konum / Aktif Menü:** Sol menüde "Ana Sayfa" aktif (mavi hap arka plan).
* **Sayfa Başlığı:** Sol üstte kalın `Öğrenci Takip Radarı`.
* **Sağ Üst Aksiyon:** Beyaz çerçeveli yenileme butonu: `[🔄 Çalışmaları Tekrar İncele]`.
* **Üst Filtre Segmenti:**
  * İki parçalı toggle buton grubu:
    * `[Yapmayanlar]` (Aktif, açık gri zemin)
    * `[Yapanlar]` (Pasif, beyaz zemin)
* **Zaman Filtresi Şeridi (Pill Bar):**
  * `[📅 Bugün]` (Aktif, açık mavi arka plan)
  * `[📅 Dün]`
  * `[📅 1 Hafta]`
  * `[📅 1 Ay]`
  * `[📖 Kitap]`
* **İçerik Alanı (Boş Durum - Empty State):**
  * Sayfa ortasında gri rozet ikonu (içinde onay işareti).
  * Açıklama metni: *"Bugün için bekleyen görev görünmüyor."*
* **Sağ Alt:** Sabit "✨ Z Koçluk Asistan" butonu.

---

### `779.png` — Öğrenci Detay Raporları & Haftalık Görev Matrisi
* **Konum / Aktif Menü:** "Öğrenci İşleri" açık, altında "Öğrenci takip" seçili.
* **Üst Öğrenci Seçim Barı (Global Context Bar):**
  * Arama kutusu: `🔍 Öğrenci ara...`
  * Filtre dropdown: `Sınıf Seç: Tümü`
  * Buton: `[📄 Sınıf PDF]`
  * Öğrenci dropdown: `Öğrenci Seç: Ozan (1001)`
  * Hemen yanında kalem (düzenle) butonu.
* **Yatay Alt Sekmeler (Sub-tabs Bar):**
  * `[Genel Bakış]` (Aktif, mavi alt çizgi)
  * `[Sınavlar]`
  * `[Karneler]`
  * `[Eksikler]`
  * `[Planlar]`
  * `[Kayıtlar]`
  * `[Görüşmeler]`
  * `[Tanıma]`
  * `[Kaynaklar]`
  * `[İçerikler]`
  * `[Sanal Optik]`
* **Başlık ve Hızlı Aksiyon:**
  * Başlık: *"Öğrenci Raporları - Ozan için genel çalışma özeti ve haftalık görev görünümü"*
  * Sağda buton: `[📄 PDF Al]` (turkuaz buton).
* **KPI Metrik Kartları (5'li Grid):**
  1. *Plan:* **0** (mavi döküman ikonu)
  2. *Tamamlanan görev:* **0** (yeşil tik ikonu)
  3. *Çözülen soru:* **0** (mor soru işareti ikonu)
  4. *Doğru / Yanlış:* **0 / 0** (turuncu terazi ikonu)
  5. *Okunan sayfa:* **0** (mavi açık kitap ikonu)
* **Haftalık Takvim Gösterimi (Weekly Scheduler):**
  * Başlık: Navigasyon okları ile `< Bu hafta 12 - 18 Ekim 2026 >`
  * Durum Lejantı:
    * Yeşil nokta: *Yapıldı*
    * Turuncu nokta: *Kısmen yapıldı*
    * Kırmızı nokta: *Yapılmadı*
    * Gri nokta: *İleri tarihli*
  * İpucu: *"Tüm günleri görmek için yatay kaydırın."*
  * Günlük Sütun Kartları (Yatay kaydırma):
    * Pazartesi 12.10.2026 (Mavi çerçeveli, seçili): *"Planlanmış görev yok"*
    * Salı 13.10.2026: *"Planlanmış görev yok"*
    * Çarşamba 14.10.2026: *"Planlanmış görev yok"*
    * Perşembe 15.10.2026: *"Planlanmış görev yok"*
    * Cuma 16.10.2026: *"Planlanmış görev yok"*
    * Cumartesi 17.10.2026: *"Planlanmış görev yok"*
* **Koç İçin Uyarılar Kartı (Akıllı Koçluk Müdahale Notları):**
  * Megafon ikonu: *"Ekranı açınca ilk bakılacak müdahale notları."*
  * Uyarı 1 (Sarı/Açık turuncu arka plan): ℹ️ *"Henüz öğrenci kaydı yok - Henüz çalışma kaydı yok."*
  * Uyarı 2 (Açık kırmızı/pembe arka plan): 📅 *"Çalışma sürekliliği zayıf - Son 7 günün 7 gününde kayıt yok."*

---

### `780.png` — Öğrenci Listesi (Tablo ve Yönetim)
* **Konum / Aktif Menü:** "Öğrenci İşleri" -> "Öğrenci listesi" aktif.
* **Başlık ve Sayaçlar:**
  * Başlık: *"Öğrenci Listesi - Öğrenci kayıtlarını düzenleyin, aktif/pasif durumunu yönetin ve çalışma raporlarını indirin."*
  * Sağ üst sayaç rozetleri:
    * `[👥 1 Toplam]` (mavi)
    * `[✅ 1 Aktif]` (yeşil)
    * `[📴 0 Pasif]` (gri)
* **Filtre ve Toplu İşlem Çubuğu:**
  * `🔍 Öğrenci ara` input kutusu.
  * `Sınıf filtresi: Tüm sınıflar` dropdown.
  * Sayaç: `👥 1 Listelenen`.
  * Checkbox: `Listelenenleri seç`.
  * Seçim durumu: `0 Seçili`.
  * Toplu işlem butonları:
    * `[Seçilenleri pasife al]` (turkuaz buton)
    * `[Seçilenleri aktif yap]` (beyaz buton)
    * `[🗑️ Seçilenleri sil]` (turkuaz buton)
* **Öğrenci Satır Kartı (Liste Öğesi):**
  * Sol seçim kutusu (Checkbox).
  * Yuvarlak harf avatarı: Mavi daire içinde beyaz "O" harfi.
  * İsim: **Ozan**, yanında kırmızı PDF rozeti ve konuşma balonu ikonu.
  * Meta veri: `10A • No: 1001 • 0 analiz • 0 plan`.
  * Durum rozeti: `Aktif` (açık yeşil hap).
  * Telefon durumu: `[📵 Telefon kayıtlı değil]` (gri hap).
  * Sağ butonlar:
    * Açık/Kapalı Switch (Mavi aktif durumda).
    * Kalem ikonu (Düzenle).
    * Konuşma balonu ikonu (Mesaj / Not).
    * Kırmızı çöp kutusu ikonu (Sil).

---

### `781.png` — E-Okul PDF'den Öğrenci Yükleme Modalı
* **Zemin:** `780.png` öğrenci listesi ekranı yarı saydam karartılmış.
* **Modal Başlığı:** `E-Okul PDF'den öğrenci yükle`
* **Açıklama Metni:** *"E-okul öğrenci listesi PDF dosyasını seçin. Okunan ad soyadlar yeni öğrenci kaydı olarak eklenecek; karne isimleriyle otomatik birleştirme yapılmayacak."*
* **Butonlar:**
  * Sol: `[Vazgeç]` (mavi link / metin buton).
  * Sağ: `[📄 PDF Seç]` (turkuaz dolgulu buton).

---

### `782.png` — Excel ile Öğrenci Yükleme Modalı
* **Zemin:** `780.png` öğrenci listesi karartılmış zemin.
* **Modal Başlığı:** `Excel ile öğrenci yükle`
* **Açıklama Metni:** *"Tüm sınıfları tek Excel dosyasında yükleyebilirsiniz. Her öğrencinin satırına 5A, 6B, 7C gibi kendi sınıf ve şubesini yazın. Okul numarası ve ad soyad okunur; WhatsApp numarası isteğe bağlıdır."*
* **Şablon İndirme Bağlantısı:**
  * `[📥 Örnek Excel dosyasını indir]` (sol altta ikonlu metin link).
* **Butonlar:**
  * Sol: `[Vazgeç]`.
  * Sağ: `[📊 Excel Seç]` (turkuaz dolgulu buton).

---

### `783.png` — Kazanım Temelli Plan Hazırlama (Adım 1)
* **Konum / Aktif Menü:** "Plan Hazırla" açık -> "Kazanım Temelli Plan" seçili.
* **Sayfa Başlığı:** *"Kazanım temelli plan - Adımları izleyerek planınızı tamamlayın."*
* **4 Adımlı İlerleme Çubuğu (Stepper):**
  * `[1 👤 Öğrenci]` (Aktif, mavi hap)
  * `[2 📝 Kazanım]` (Pasif, gri hap)
  * `[3 ⚙️ Plan Ayarları]` (Pasif, gri hap)
  * `[4 🔲 QR PDF]` (Pasif, gri hap)
* **Plan Hedefi Seçim Sekmeleri (Kime Yapılıyor?):**
  * `[👥 Öğrenciler]` (Aktif, mavi dolgulu)
  * `[👥 Sınıflar]`
  * `[🏢 Tüm öğrenciler]`
* **Arama ve Filtre:**
  * Arama kutusu: `🔍 Öğrenci ara (ad, soyad, numara)`
  * Açılır kutu: `Sınıf filtresi`
* **Öğrenci Seçim Listesi:**
  * Üst bilgi: `0 öğrenci seçildi` | Sağda: `Hepsini seç` — `Temizle` bağlantıları.
  * Başlıklar: *Öğrenci* | *Sınıf / No*
  * Liste öğesi: Checkbox, "O" avatarı, **Ozan**, `10A / No: 1001`, sağda üç nokta menü.
* **Alt Navigasyon Butonları:**
  * Sol: `[⬅️ Geri]` (beyaz buton).
  * Sağ: `[İleri ➡️]` (turkuaz dolgulu buton).

---

### `784.png` — Ders Temelli Plan Hazırlama (Adım 1)
* **Konum / Aktif Menü:** "Plan Hazırla" -> "Ders Temelli Plan" seçili.
* **Stepper Adımları:**
  * `[1 👤 Öğrenci]` (Aktif)
  * `[2 📖 Ders]` (Pasif)
  * `[3 ⚙️ Plan Ayarları]` (Pasif)
  * `[4 🔲 QR PDF]` (Pasif)
* **İçerik:** `783.png` ile aynı öğrenci/sınıf seçim bileşeni; 2. adım ders seçimine yönlendirir.

---

### `785.png` — Serbest Planlama (Adım 1)
* **Konum / Aktif Menü:** "Plan Hazırla" -> "Serbest Planlama" seçili.
* **Stepper Adımları:**
  * `[1 👤 Öğrenci]` (Aktif)
  * `[2 📑 Çizelge]` (Pasif)
  * `[3 ⚙️ Plan Ayarları]` (Pasif)
  * `[4 🔲 QR PDF]` (Pasif)
* **İçerik:** Öğrenci seçimi ekranı; 2. adımda koçun serbest çizelge doldurmasını sağlar.

---

### `786.png` — Müfredat Temelli Planlama (Adım 1)
* **Konum / Aktif Menü:** "Plan Hazırla" -> "Müfredat Temelli Planlama" seçili.
* **Stepper Adımları (3 Adımlı Süreç):**
  * `[1 👤 Öğrenci]` (Aktif)
  * `[2 📚 Müfredat Planı]` (Pasif)
  * `[3 🔲 QR PDF]` (Pasif)
* **İçerik:** Hazır MEB müfredat haftalarını baz alan plan akışının 1. adımı.

---

### `787.png` — Plan Düzenleme Ekranı
* **Konum / Aktif Menü:** "Plan Hazırla" -> "Plan Düzenle" seçili.
* **Başlık ve Açıklama:** *"Plan Düzenle - Oluşturduğunuz planları Plan ID ve Plan Grup ID ile bulun; içeriklerini ve günlük görevlerini öğrenci kayıtlarını koruyarak düzenleyin. Grup tarihlerini topluca değiştirebilirsiniz."*
* **Üst Buton:** `[🔗 Kurum teslim bağlantılarım]`
* **Filtre Çubuğu:**
  * `🔍 Öğrenci, plan ID veya plan türü ara` inputu.
  * `Sınıf: Tüm sınıflar` dropdown.
  * `Plan türü: Tüm plan türleri` dropdown.
* **Toplu Aksiyon Şeridi:**
  * Checkbox, `0 plan • 0 plan grubu`
  * `[📅 Tarihleri düzenle]` butonu.
  * `[🗑️ Seçilenleri sil]` (turkuaz buton).
* **Boş Durum (Empty State):**
  * Mavi takvim ikonu.
  * Başlık: *"Çalışma planı bulunamadı"*
  * Açıklama: *"Filtreyi temizleyin veya öğrencileriniz için yeni bir plan oluşturun."*

---

### `788.png` — Dijital İçerik Gönderimi
* **Konum / Aktif Menü:** Sol menüde "Dijital İçerik Gönder" seçili.
* **Üst Sekmeler:**
  * `[🔗 Yeni Bağlantı]` (Aktif, mavi zeminli)
  * `[🕒 Önceki Paylaşımlar]` (Pasif)
* **Üst Bilgi Kartı:**
  * Mavi kare içinde video oynatma ikonu.
  * *"Dijital İçerik Gönder - Video, PDF, doküman ve web bağlantılarını öğrenci, sınıf veya tüm öğrencilerinizle paylaşın."*
* **Form Kartı ("İçerik Gönder"):**
  * İpucu: *"Yalnızca içerik başlığı ve bağlantısı zorunludur."*
  * Alan 1: `T İçerik başlığı` (text input)
  * Alan 2: `🔗 Video, PDF veya içerik bağlantısı` (URL input)
  * Alan 3 (Gönderilecek Hedef):
    * Gönderim biçimi dropdown: `Bir öğrenci` (seçenekler: bir öğrenci, bir sınıf, tüm öğrenciler).
    * `Öğrenci seçin` dropdown.
  * Katlanabilir Alan: `⚙️ İsteğe bağlı bilgiler` (aşağı ok ile açılır).
  * Buton: `[✈️ İçeriği Gönder]` (Tam genişlik turkuaz buton).

---

### `789.png` — Sanal Optik Listesi ve Yönetimi
* **Konum / Aktif Menü:** Sol menüde "Sanal Optik" seçili.
* **Başlık ve Üst Butonlar:**
  * Başlık: `Sanal Optik`
  * Sol üst buton: `[+ Optik Oluştur]` (turkuaz dolgulu buton).
  * Sağ üst yardım linki: `[❓ Sanal Optik Nedir?]`.
* **Filtreler:**
  * `🔍 Optik ara`
  * `Durum: Tümü`
  * `Sınıf: Tümü`
  * `Öğrenci: Tümü`
  * Yenile butonu (`🔄`).
* **Tablo Başlıkları ve Boş Durum:**
  * Başlıklar: *Sınav / Ders | Soru | Durum | Öğrenciler | İşlemler*
  * Boş durum metni: *"0 optik - Henüz optik oluşturulmadı."*

---

### `790.png` — LGS Tercih Koçluğu Modülü
* **Konum / Aktif Menü:** "Tercih Koçluğu" açık -> "LGS" seçili.
* **Başlık ve Sayaç:**
  * Başlık: *"LGS Tercih Koçluğu - 2026 okul puanları ve yaklaşık yüzdelik dilimleriyle tercih listenizi hazırlayın."*
  * Sağ üst rozet: `3154 sonuç` (mavi hap).
* **Sol Panel ("Aday ve filtreler"):**
  * Öğrenci seçici: `Ozan • 10A • No: 1001`
  * Sayısal girişler: `Puan`, `Yüzdelik dilim (%)`
  * İl / İlçe: `İl: Tüm iller`, `İlçe: Tüm ilçeler`
  * Arama kutusu: `🔍 Okul ara`
* **Sağ Panel ("Tercih listesi (0)"):**
  * Sağ üstte: `[📄 PDF İndir]` butonu.
  * İpucu metni: *"Sonuçlardan tercih listenize okul veya program ekleyin."*
* **Alt Sonuç Listesi ("Sonuçlar - 3154 kayıt"):**
  * Kart 1: **Kabataş Erkek L.** — `İSTANBUL / BEŞİKTAŞ • Anadolu` — `Puan: 500,0000` | `Dilim: %0,01` | `60 kontenjan` — Sağda `[+]` ekle butonu.
  * Kart 2: **İstanbul Erkek L.** — `İSTANBUL / FATİH • Anadolu` — `Puan: 500,0000` | `Dilim: %0,01` | `120 kontenjan` — Sağda `[+]` butonu.
  * Kart 3: **Galatasaray Üniversitesi Galatasaray L.** — `İSTANBUL / BEYOĞLU • Anadolu` — `Puan: 497,4323` | `Dilim: %0,05` | `100 kontenjan` — Sağda `[+]` butonu.

---

### `791.png` — YKS Tercih Koçluğu (YÖK Atlas 2026)
* **Konum / Aktif Menü:** "Tercih Koçluğu" -> "YKS" seçili.
* **Başlık ve Sayaç:**
  * Başlık: *"YKS Tercih Koçluğu - YÖK Atlas 2026 program, puan ve başarı sırası verileriyle tercih listenizi hazırlayın."*
  * Sağ üst sayaç: `21493 sonuç`.
* **Sol Panel ("Aday ve filtreler"):**
  * Öğrenci seçici: `Ozan • 10A • No: 1001`
  * Puan ve sıralama: `Puan`, `Başarı sırası`
  * İl dropdown: `Tüm iller`
  * Program türü: `Tümü`
  * Puan türü: `Tümü` (SAY / EA / SÖZ / DİL)
  * Bölüm dropdown: `Tüm bölümler`
  * Arama kutusu: `🔍 Üniversite veya program ara`
* **Sağ Panel ("Tercih listesi (0)"):**
  * `[📄 PDF İndir]` butonu.
* **Sonuçlar (21.493 kayıt):**
  * Kart 1: **Tıp (İngilizce) (Burslu)** — `İSTANBUL MEDİPOL ÜNİVERSİTESİ • İSTANBUL / BEYKOZ` — `Lisans • SAY` | `Puan: 559,69717` | `Sıra: 1` — `[+]` butonu.
  * Kart 2: **Tıp (İngilizce) (Ücretli)** — `İSTANBUL MEDİPOL ÜNİVERSİTESİ` — `Puan: 555,14996` | `Sıra: 27` — `[+]` butonu.
  * Kart 3: **Tıp (İngilizce) (Burslu)** — `KOÇ ÜNİVERSİTESİ • SARIYER` — `Puan: 552,85674` | `Sıra: 65` — `[+]` butonu.

---

### `792.png` — Öğrenci Tanıma: Sınav Kaygısı Mini Değerlendirme Modalı
* **Konum / Aktif Menü:** "Öğrenci Tanıma" menüsü açık (altında: *Sınav Kaygısı, Çalışma Alışkanlığı, Zaman Yönetimi, Motivasyon ve Hedef*).
* **Modal Özellikleri:**
  * İkon: Mavi ampul / beyin ikonu.
  * Başlık: **Sınav Kaygısı**
  * Açıklama: *"Mini değerlendirmeyi hangi öğrenciye veya sınıfa göndereceğinizi seçin."*
  * Hedef Seçim Hapları:
    * `[✓ Bir öğrenci]` (Seçili)
    * `[Bir sınıf]`
    * `[Tüm öğrenciler]`
  * Öğrenci Dropdown: `Ozan • 10A • No: 1001`
  * Butonlar:
    * `[Vazgeç]` (mavi link)
    * `[✈️ Gönder]` (turkuaz buton)

---

### `793.png` — Mini Değerlendirme Gönderim Hata Uyarısı
* **Modal Başlığı:** `Mini değerlendirme gönderilemedi` (Sarı uyarı üçgen ikonu ile).
* **Hata / Engel Açıklaması:**
  * *"Sınav Kaygısı gönderilemedi.*
  * *Mini değerlendirme gönderebilmek için öğrencinin QR kodlu bir çalışma planına ve plan bağlantısına ihtiyacı var. Önce bu öğrenciler için çalışma planını PDF/QR olarak oluşturup sunucuya yükleyin."*
  * *Gönderilemeyen öğrenciler:*
    * `• Ozan • 10A • No: 1001`
* **Buton:** `[Kapat]` (turkuaz buton).

---

### `795.png` — Öğrenci Tanıma: Çalışma Alışkanlığı Modalı
* **Modal Özellikleri:**
  * İkon: Mavi beyin/ampul ikonu.
  * Başlık: **Çalışma Alışkanlığı**
  * Açıklama: *"Mini değerlendirmeyi hangi öğrenciye veya sınıfa göndereceğinizi seçin."*
  * Seçenekler: `[✓ Bir öğrenci]`, `[Bir sınıf]`, `[Tüm öğrenciler]`.
  * Öğrenci seçici: `Ozan • 10A • No: 1001`.
  * Butonlar: `[Vazgeç]` ve `[✈️ Gönder]`.

---

### `796.png` — Çalışma Alışkanlığı Gönderim Hata Uyarısı
* **İçerik:** `793.png` ile aynı validasyon uyarısı; QR kodlu çalışma planı olmayan öğrenciye "Çalışma Alışkanlığı" değerlendirmesi gönderilemeyeceğini belirtir.

---

### `797.png` — Bildirimler & Otomasyon Ekranı (Hatırlatma Kapalı)
* **Konum / Aktif Menü:** Sol menüde "Bildirimler" seçili.
* **Başlık ve Sayaç:**
  * Başlık: *"Bildirimler - Otomatik hatırlatmaları yönetin veya anlık bildirim gönderin."*
  * Sağ üst sayaç rozeti: `0 hedef`.
* **Kart 1: Otomatik Çalışma Hatırlatması (Otomasyon Kuralı):**
  * Saat ikonu.
  * Başlık: *"Otomatik çalışma hatırlatması"*
  * Açıklama: *"Her gün saat 20.00'de, o gün çalışma kaydını göndermeyen öğrencilere bildirim gönderilir."*
  * Sağdaki Switch: **KAPALI** (Gri düğme).
  * Bilgi Şeridi: *"Türkiye saati esas alınır. Yalnızca bildirim izni veren cihazlara gönderilir. Manuel bildirim gönderimi bu ayardan etkilenmez."*
* **Kart 2: Tarayıcı Bildirimi (Anlık Push Gönderim):**
  * Zil ikonu.
  * Başlık: *"Tarayıcı bildirimi - Bildirim izni veren öğrencilerin cihazlarına gönderilir."*
  * Gönderim Hedef Hapları:
    * `[✓ Bugün yapmayanlar]` (Seçili, açık mavi)
    * `[Tüm kurum]`
    * `[Bir sınıf]`
    * `[Bir öğrenci]`
  * Form Alanları:
    * Bildirim başlığı: `Çalışma hatırlatması` (varsayılan dolu metin)
    * Mesaj kutusu (Textarea): `Merhaba {ad}, bugünkü çalışma kayıtlarını plan ekranından tamamlamanı bekliyoruz.`
  * Dinamik Değişken İpucu: *"Kişiselleştirme için {ad}, {sinif}, {no} kullanabilirsiniz."*
  * Buton: `[✈️ Bildirimi gönder]` (turkuaz buton).

---

### `798.png` — Bildirimler Ekranı (Otomatik Hatırlatma Açık)
* **Fark:** `797.png` ekranındaki "Otomatik çalışma hatırlatması" switch'i **AÇIK (Mavi renkli switch)** konumundadır. Diğer tüm alanlar aynıdır.

---

### `799.png` — Öğrenci Çalışma Raporları Kokpiti
* **Konum / Aktif Menü:** "Raporlar" menüsü açık -> "Öğrenci Çalışma Raporları" seçili.
* **Başlık ve Yenileme:**
  * Başlık: *"Raporlar - Sınıf ya da öğrenci seçin; hızlı takip listesi veya detaylı görsel öğrenci raporu hazırlayın."*
  * Buton: `[🔄 Raporları Tekrar İncele]`
  * Sağ üst daire grafiği (Progress): `%0 - %0 seçili dönemde hedefe ulaşma`.
* **Filtre Çubuğu:**
  * Kitle butonları: `[Bir öğrenci]` | `[✓ Sınıfın tamamı]` (Aktif) | `[Tüm sınıflar]` | `[Ders bazlı]`
  * Sınıf dropdown: `10A`
  * Rapor dönemi dropdown: `Son 1 ay (12.09.2026 - 12.10.2026)`
* **Aksiyon Butonları:**
  * Tip toggle: `[⚡ Hızlı]` | `[✓ Detaylı]`
  * Buton: `[📄 PDF raporu indir]` (turkuaz)
* **KPI Metrik Kartları:**
  1. *Rapor kapsamı:* **1** (Sınıftaki aktif öğrenci)
  2. *Dönem hedefi:* **%0** (Seçili dönemde görev yok)
  3. *Girilen kayıt:* **0/0** (Göreve çalışma dönütü girildi)
  4. *Hedefin altında:* **0** (Aksayan görev görünmüyor)
  5. *Soru kokpiti:* **0** (0 doğru • 0 yanlış)
* **Alt Kartlar:**
  * **Öncelikli Takip Listesi:** *"Seçili dönemde en çok görev aksatan öğrenciler üstte görünür."* — Ozan için %0 ilerleme çubuğu, `0/0 kayıt • 0 tam`.
  * **Zayıf Konu Yoğunluğu:** *"Öğrenci dönütlerinden gelen yanlışlar ders ve konu bazında toplanır. Öğrenci dönütlerinden gelen yanlış konu kaydı yok."*

---

### `800.png` — Veli Toplantı Raporu Ekranı
* **Konum / Aktif Menü:** "Raporlar" -> "Veli Toplantı Raporu" seçili.
* **Başlık:** `Veli Toplantı Raporu`
* **Filtre ve Aksiyon:**
  * Toggle: `[✓ Sınıf]` | `[Öğrenci]`
  * Sınıf: `10A`
  * Tarih aralığı: `13.09.2026 - 12.10.2026`
  * Buton: `[📄 PDF İndir]` (turkuaz buton)
* **Rapor İçerik Kartı (Hazır Metin Üretimi):**
  * Başlık: `10A • 1 öğrenci | Çalışma değerlendirmesi • 13.09.2026 - 12.10.2026`
  * Öğrenci: **Ozan • No: 1001**
  * Otomatik Veli Değerlendirme Paragrafı:
    > *"Ozan için bu dönemde çalışma kaydı bulunmamaktadır. Bu, öğrencinin çalışmadığı anlamına gelmez; mevcut verilerle çalışma düzeyi değerlendirilemez. Öncelikle mevcut plandaki çalışmaların sonuçlarının kaydedilmesi ve bir sonraki değerlendirmede bu kayıtların esas alınması önerilir."*

---

### `801.png` — Öğrenci Tanıma Raporları
* **Konum / Aktif Menü:** "Raporlar" -> "Öğrenci Tanıma Raporları" seçili.
* **Başlık ve Rozet:**
  * Başlık: *"Öğrenci Tanıma Raporları - Sınav kaygısı, çalışma alışkanlığı, zaman yönetimi ve motivasyon sonuçlarını öğrenci veya sınıf bazında inceleyin."*
  * Sağ üst güvenlik rozeti: `🛡️ Sınıf PDF'lerinde kimlik bilgileri maskelenir` (yeşil zeminli rozet).
* **Filtreler:**
  * Toggle: `[✓ Bir öğrenci]` | `[Sınıf raporu]`
  * Dropdown'lar: `Sınıf: 10A`, `Öğrenci: Ozan`, `Değerlendirme: Tüm değerlendirmeler`
* **Sayaç Kartları:**
  * Rapor kapsamı: **1** (Seçili öğrenci)
  * Tamamlanan: **0** (Mini değerlendirme sonucu)
  * Dikkat / Takip: **0** (İncelenmesi gereken sonuç)
  * Bekleyen: **4** (Tamamlanmamış değerlendirme)
* **4'lü Test Değerlendirme Kartı Grid'i:**
  * Öğrenci: **Ozan** — *"Öğrencinin en güncel mini değerlendirme sonuçları gösteriliyor."*
  1. *Sınav Kaygısı:* `[⛔ Gönderilmedi]`
  2. *Zaman Yönetimi:* `[⛔ Gönderilmedi]`
  3. *Çalışma Alışkanlığı:* `[⛔ Gönderilmedi]`
  4. *Motivasyon ve Hedef:* `[⛔ Gönderilmedi]`

---

### `802.png` — Sanal Optik Raporları
* **Konum / Aktif Menü:** "Raporlar" -> "Sanal Optik Raporları" seçili.
* **Başlık ve Butonlar:**
  * Başlık: `Sanal Optik Sonuçları`
  * Aksiyonlar: `🔄` Yenile butonu, `[📄 PDF Raporu Al]` butonu.
* **Filtreler:**
  * `Sınıf: Tümü`, `Öğrenci: Tümü`, `Sınav: Tümü`.
* **Boş Durum:**
  * `0 gönderim • 0 teslim`
  * Metin: *"Bu seçimde optik form kaydı bulunmuyor."*

---

### `803.png` — Hesabım: Onboarding Banner ve Pop-up
* **Konum / Aktif Menü:** Sol menüde "Hesabım" seçili.
* **Başlık ve Üst Butonlar:**
  * Başlık: *"Hesabım - Lisans sürenizi, hesap durumunuzu ve PDF üzerinde görünecek kurum bilgilerinizi buradan yönetin."*
  * Sağ üst butonlar: `[🔄 Hesabı Kontrol Et]` (beyaz) ve `[🛍️ Paketlere Git]` (turkuaz).
* **Sekmeler:**
  * `[Hesap]` (Aktif, mavi)
  * `[Fatura]`
  * `[Ödeme]`
* **Üst Onboarding Banner:**
  * Mavi banner: *"1 / 3 HIZLI BAŞLANGIÇ - Önce PDF kimliğinizi oluşturalım. Plan ve raporlarınızda görünecek kurum adını veya programı hazırlayan kişi adını aşağıya yazın. En az birini kaydettiğinizde öğrenci ekleme adımına geçeceğiz."*
  * Butonlar: `[⬅️ Geri]`, `[İleri ➡️]`, `[✕]` kapatma.
* **Ekran Ortasındaki Pop-up Modal:**
  * Sarı rozet ikonu: `1 / 3 HIZLI BAŞLANGIÇ - Önce PDF kimliğinizi oluşturalım`.
  * Açıklama: *"Plan ve raporlarınızda görünecek kurum adını veya hazırlayan kişi adını yazın. İkisinden en az birini doldurduktan sonra 'PDF Bilgilerini Kaydet' düğmesine basın."*
  * Buton: `[✏️ Bilgileri Doldur]` (turkuaz buton).

---

### `804.png` — Hesabım: PDF Kimliği & Lisans Kullanım Durumu
* **Konum / Aktif Menü:** "Hesabım" -> `[Hesap]` sekmesi (modal kapalı hali).
* **Kart 1: Öğrenci Çalışma PDF'lerinde Görünecek Bilgiler:**
  * PDF ikonu: *"Çalışma programının üst kısmında kurum adınız ve hazırlayan kişi bilgisi görünebilir."*
  * Alan 1: `Kurum adı / PDF başlığı` (Değer: `Z Koçluk`). İpucu: *"Boş bırakırsanız PDF'de Z Koçluk logosu kullanılır. Kurum adı yazarsanız logo yerine kurum adınız gösterilir."*
  * Alan 2: `Programı hazırlayan kişi`. İpucu: *"Boş bırakırsanız bu alan PDF'de gösterilmeyecektir."*
  * Buton: `[💾 PDF Bilgilerini Kaydet]` (turkuaz).
* **Kart 2: Lisans Kullanım Durumu (4 Kolonlu Grid):**
  * Yeşil trend ikonu: *"Lisans kullanım durumu - PDF oluşturma ve öğrenci takip erişiminiz lisans sürenize göre çalışır."*
  1. *Kalan süre:* **6** (6 gün ücretsiz kullanım kaldı)
  2. *Lisans dönemi:* **11.10.2026 - 17.10.2026** (7 günlük ücretsiz kullanım)
  3. *Durum:* **Aktif** (11.10.2026 - 17.10.2026)
  4. *Öğrenci Limiti:* **Sınırsız** (Kapasite sınırı tanımlı değil)
* **Kart 3: Hesap Güvenliği:**
  * Giriş şifresi: *"Yeni şifre belirlemek için mevcut şifreniz veya Google hesabınızla doğrulama yapın."* ➔ `[Şifremi Değiştir]` (turkuaz).
  * Hesap ve verileri silme: *"Hesabınız ve bağlı öğrenci, plan ve çalışma kayıtları kalıcı olarak silinir. Bu işlem geri alınamaz."* ➔ `[Hesabımı Sil]` (kırmızı çerçeveli).
* **Alt Güven Rozetleri (Footer Badges):**
  * 🛡️ Güvenli Altyapı (SSL) | 🔄 Otomatik Yedekleme | 🎧 7/24 Destek | 🔄 Sürekli Güncelleme.

---

### `805.png` — Hesabım: Fatura Sekmesi
* **Konum / Aktif Menü:** "Hesabım" -> `[Fatura]` sekmesi aktif.
* **Form Kartı ("Fatura Bilgileri"):**
  * Kimlik kartı ikonu: *"Satın alma, fatura kaydı ve mesafeli satış sözleşmesi için kullanılacak bilgileri buradan yönetin."*
  * Alan 1: `Fatura ad soyad` (text input)
  * Alan 2: `T.C. kimlik numarası` (numeric input)
  * Alan 3: `Telefon` (tel input)
  * Alan 4: Yan yana iki kolon: `İl` ve `İlçe`
  * Alan 5: `Açık adres` (textarea)
  * Buton: `[💾 Fatura Bilgilerini Kaydet]` (turkuaz buton).
* **Alt Bölümler:** Yine Hesap Güvenliği ve Footer rozetleri yer alır.

---

### `806.png` — Hesabım: Fatura Sekmesi (Alt Bölüm Odağı)
* **İçerik:** `805.png` ekranının sayfa aşağı kaydırılmış hali; Şifre Değiştirme, Hesabımı Sil tehlike alanı ve alttaki 4 adet sistem güven rozeti net görünür.

---

### `807.png` — Hesabım: Ödeme Sekmesi (PayTR Geçmişi)
* **Konum / Aktif Menü:** "Hesabım" -> `[Ödeme]` sekmesi aktif.
* **Ödeme Geçmişi Kartı:**
  * Belge ikonu: *"Satın Alımlar / Ödeme Geçmişi - PayTR tarafından onaylanan başarılı ödemeler burada listelenir."*
  * Sağ üst: `🔄` Yenileme butonu.
  * Liste Boş Durumu: *"Henüz başarılı kredi kartı ödemeniz görünmüyor."*
* **Alt Bölümler:** Hesap Güvenliği kartı ve 4'lü footer güven rozetleri.

---

### `808.png` — Üyelik & Paketler (Varsayılan Fiyatlandırma Görünümü)
* **Konum / Aktif Menü:** Sol menüde "Üyelik" seçili.
* **Sol Paket: "Z Koçluk Premium"**
  * Rozet: Mavi yıldızlı rozet ikonu.
  * Süre Seçici: `[📅 1 Ay]` dropdown.
  * Giriş Kutusu: `Öğrenci sayınızı girin` inputu.
  * Fiyat: Varsayılan değer girilmediği için *"Fiyatı görmek için öğrenci sayınızı girin"* uyarısı.
  * Özellikler (Mavi onay tikleri):
    * Öğrenci sayısı ve kullanım süresi arttıkça öğrenci başına maliyet düşmektedir.
    * Her öğrenciye QR kodlu kişisel çalışma planı oluşturun.
    * PDF sınav karnelerini analiz ederek eksik kazanımları belirleyin.
    * LGS, YKS ve tüm kademeler için çalışma planı hazırlayın.
    * Öğrencilerin günlük çalışmalarını online olarak takip edin.
    * Soru sayısı, doğru-yanlış ve konu bazlı gelişimi izleyin.
    * Öğrencilerinizin kaynak kitap takibini yapın.
    * Öğrencilerinize tercih dönemi koçluk yapın tercih listesini PDF olarak hazırlayıp indirin.
    * Öğrenci ve sınıf bazlı PDF gelişim raporları alın.
    * Kurumsal Eğitim Koçluk paketinden farkı Premium üyelikte süreci siz yönetiyor ve takip ediyorsunuz.
  * Buton: `[🛒 Satın Al]` (turkuaz buton).
* **Sağ Paket: "Kurumsal Eğitim Koçluğu"**
  * Rozet: Mor yıldızlı rozet ikonu.
  * Giriş Kutusu: `Öğrenci sayınızı girin` inputu.
  * Özellikler (Mor onay tikleri):
    * En az 500 öğrenci olması gerekmektedir ve alım süresi minimum 1 yıldır.
    * Kurumsal müşteri desteği.
    * Düzenli planlama desteği.
    * Her 2 haftada 1 detaylı raporlama.
    * Öğrenci listelerinin hazırlanması.
    * Sınav karne analiz desteği.
    * Koç Board Premium ile farkı: Kurumlar öğrenci listelerini ve karneleri PDF olarak gönderir; Koç Board planları hazırlayıp PDF olarak teslim eder.
  * Kurumsal İletişim: *"Kurumsal fiyat için WhatsApp'tan yazın: 0534 366 04 11"*
  * Buton: `[💬 WhatsApp'tan Fiyat Teklifi İste]` (turkuaz dolgulu buton).
* **Footer Rozetleri:** Güvenli Ödeme (SSL), Anında Aktivasyon, 7/24 Destek.

---

### `809.png` — Üyelik: Dinamik Fiyat Hesaplama Örneği
* **Fark & Canlı Değerler:**
  * Seçilen Kullanım Süresi: **10 Ay**
  * Girilen Öğrenci Sayısı: **10**
  * Otomatik Hesaplanan Tutar:
    * Büyük kalın metin: **16.920 TL**
    * KDV etiketi: `KDV dahil`
    * Birim maliyet açıklaması: `170 TL / öğrenci / ay (yaklaşık)`
  * Satın Al Butonu: Mor degrade parıltılı `[🛒 Satın Al]` butonuna dönüşür.

---

### `810.png` — Yardım Masası (Destek Bileti Sistemi)
* **Konum / Aktif Menü:** Sol menüde "Yardım Masası" seçili.
* **Sol Sidebar Detayı:** "Kurumsal" menüsü genişletilmiş (İletişim ve Firma Bilgileri, Teslimat ve Kargo Koşulları, Mesafeli Satış Sözleşmesi, İptal ve İade Koşulları).
* **Başlık ve Yenileme:**
  * Başlık: *"Yardım Masası - Teknik destek, lisans, karne okuma ve kullanım sorularınızı buradan bize iletin. Yanıtlarımız aynı talep içinde görünür."*
  * Buton: `[🔄 Talepleri yenile]`
* **Form ("Yeni destek talebi"):**
  * Alan 1: `Konu` (text input)
  * Alan 2: `Kategori: Teknik Destek` (dropdown)
  * Alan 3: `Mesajınız` (büyük textarea)
  * Buton: `[✈️ Talep oluştur]` (turkuaz buton).
* **Talep Listesi ("Destek taleplerim"):**
  * Kulaklık ikonu.
  * Boş durum: *"Henüz destek talebiniz yok. Sorularınızı yukarıdaki formdan bize iletebilirsiniz."*

---

### `811.png` — Z Koçluk Asistan Widget'ı (Açık Chatbot Pop-up'ı)
* **Açıklama:** Sağ alttaki "✨ Z Koçluk Asistan" butonuna tıklandığında ekranın sağ altından yukarı doğru açılan akıllı asistan sohbet penceresi.
* **Pencere Başlığı (Header):**
  * Koyu lacivert zemin.
  * İki yıldız ikonu: **"✨ Z Koçluk Asistan"**
  * Alt başlık: *"Kendi öğrenci verilerinizle çalışır"*
  * Sağda: `[✕]` Kapatma ikonu.
* **Karşılama ve Rehber Mesajı:**
  * Kalın metin: *"İlk planınızı birlikte hazırlayalım"*
  * Alt metin: *"Öğrencileriniz hazır. Şimdi uygun plan türünü seçip ilk planınızı oluşturabilirsiniz."*
* **Hızlı Aksiyon ve Soru Kartları (Önceden Tanımlı Prompt Butonları):**
  1. `[Nasıl Plan Yapılır?]`
  2. `[Hangi plan türünü seçmeliyim?]`
  3. `[Kazanım Temelli Plan nedir?]`
  4. `[Ders Temelli Plan nedir?]`
  5. `[LGS ve YKS Temelli Planlar nasıl çalışır?]`
  6. `[🔀 Bunlar değil]` (Farklı sorular getir butonu)
* **Alt Sohbet Girdi Çubuğu:**
  * Meta: `Son veri: 01:14` | `🔄 Yenile` linki.
  * Mesaj giriş kutusu placeholder: *"Örn. 6A sınıfında kimler görev aksattı?"*
  * Sağda mavi dairesel gönder butonu (uçak ikonu).

---

### `Ekran görüntüsü 2026-10-12 011444.png` — Hesabım (Tam Ekran Tarayıcı Görünümü)
* `803.png` ekranının 1920x1080 orijinal çözünürlükteki tam tarayıcı ekran yakalamasıdır. Sol sidebar tam olarak görünür, ortada hızlı başlangıç pop-up'ı açıktır.

---

### `Ekran görüntüsü 2026-10-12 011619.png` — Hesabım Fatura (Tam Ekran Tarayıcı Görünümü)
* `805.png` / `806.png` ekranının tam sayfa görünümüdür. Fatura formu, hesap güvenliği ve en alttaki SSL / Yedekleme rozetlerinin dikey akışı tam olarak görüntülenmektedir.

---

## 3. Mentörüm Projesine Uygulama İçin Çıkarılan Kritik Fonksiyonel Dersler

1. **E-Okul ve Excel İçe Aktarma:**
   * Koçların en büyük zaman kaybı tek tek öğrenci eklemektir. PDF parse eden E-Okul aktarıcısı ve Excel şablonu indirme akışı Mentörüm'e birebir uyarlanmalıdır.
2. **Kişiselleştirilmiş PDF Başlığı (Branding):**
   * Koç kendi adını veya kurum adını yazabildiğinde, öğrenciye giden haftalık plan PDF'inin üstünde kendi logosu/adı görünür. Bu durum koç için yüksek katma değer yaratır.
3. **Akıllı Asistanın Veriye Bağlı Olması:**
   * Asistan sadece genel bir LLM gibi değil, *"Örn. 6A sınıfında kimler görev aksattı?"* gibi koçun veritabanına sorgu atabilen RAG/Tool-calling yeteneğinde konumlandırılmıştır.
4. **Tercih Koçluğu (LGS & YKS YÖK Atlas Verisi):**
   * Tercih dönemi için puan ve başarı sırasına göre anında PDF liste çıkaran modül, koçluk platformunu 12 ay boyunca vazgeçilmez kılmaktadır.
5. **Dinamik Fiyatlama Modeli:**
   * Öğrenci sayısı × Süre çarpanına göre birim maliyetin düşmesi mantığı üyelik dönüşümünü ciddi oranda artırmaktadır.
