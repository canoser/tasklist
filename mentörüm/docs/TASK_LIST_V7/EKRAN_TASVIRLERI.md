# 🖼️ Mentörüm Koç Paneli — Ekran Tasvirleri ve Arayüz Analizi

> **Belge Amacı:**  
> Bu doküman, Mentörüm koçluk ve mentörlük yönetim paneline ait 5 ana ekran görüntüsünün (Dashboard, Programlar, Öğrenciler, Takvim, Raporlar) bir yapay zekâ ajanı veya yazılımcı tarafından eksiksiz anlaşılabilmesi amacıyla hazırlanmıştır.  
> Her bir ekran; sol navigasyon menüsü, üst çubuk ve sağ ana içerik alanında yer alan tüm metinler, butonlar, etiketler, veri göstergeleri ve düzen hiyerarşisiyle adım adım tasvir edilmiştir.

---

## 1. Genel Arayüz ve Navigasyon Çerçevesi (Ortak Layout)

Tüm ekranlarda sol tarafta sabit bir dikey menü (sidebar), üstte ince bir bildirim çubuğu ve sağda dinamik sayfa içeriği yer almaktadır.

### 1.1 Sol Sidebar (Navigasyon Menüsü)
* **Marka / Logo (Sol Üst):** 
  * Beyaz renkte kalın fontla `Mentörüm` yazısı.
  * Zemin: Koyu lacivert / gece mavisi arka plan (`#1e293b`).
* **Menü Bağlantıları (Yukarıdan Aşağıya):**
  1. **Dashboard:** İkon: Renkli dikey çubuk grafik. (Aktifken açık morumsu/mavi arka plan dolgusu ile seçili gösterilir).
  2. **Programlar:** İkon: Turuncu okul / bina simgesi.
  3. **Öğrenciler:** İkon: Sarı/turuncu öğrenci profil silueti.
  4. **Takvim:** İkon: Açık mavi takvim yaprağı.
  5. **Raporlar:** İkon: Mavi yükselen çizgi grafik simgesi.
  6. **Profil:** İkon: Mor kullanıcı baş silueti.
  7. **Yönetim (Onaylar):** İkon: Mavi güvenlik kalkanı simgesi.
* **Sol Alt Kullanıcı & Oturum Alanı:**
  * **Kullanıcı Avatarı:** Yuvarlak mavi zemin içinde beyaz büyük `C` harfi.
  * **Kullanıcı Adı:** `Can Öser` (beyaz kalın metin).
  * **Kullanıcı Rolü:** `Koç` (açık gri alt metin).
  * **Oturum Kapatma Butonu:** `Çıkış Yap` (koyu lacivert/gri hap şeklinde buton).

### 1.2 Üst Çubuk (Top Bar)
* Sol üst köşede sarı renkli `🔔` (Bildirim Çanı) ikonu bulunmaktadır.

---

## 2. Ekran Bazlı Detaylı Tasvirler

---

### 🖥️ Ekran 1: Dashboard (Koç Kontrol Paneli)

* **Aktif Menü Durumu:** Sol menüde **Dashboard** aktif (açık mor dolgulu arka plan ile seçili).
* **Sayfa Başlığı ve Açıklaması:**
  * Ana Başlık: `Dashboard` (büyük, kalın, siyah H1).
  * Açıklama: `Öğrencilerinizin genel durumu ve takviminiz.` (gri alt başlık metni).
* **Sayfa Düzeni:** İki kolonlu bölünmüş ızgara yapısı (Sol: Öğrencilerim, Sağ: Genel Takvim).

#### Sol Kolon: "Öğrencilerim" Bölümü
1. **Bölüm Başlığı ve Aksiyon:**
   * Sol: `Öğrencilerim` (orta büyüklükte siyah başlık).
   * Sağ: `+ Yeni Ekle` butonu (beyaz zemin, ince gri kenarlık, siyah yazı, tıklanabilir outline buton).
2. **Öğrenci Kartı (Beyaz Yuvarlatılmış Kart):**
   * **Avatar:** Sol başta yeşil yuvarlak avatar, içinde beyaz küçük `c` harfi.
   * **Öğrenci Bilgisi:**
     * İsim: `can öğrenci` (kalın siyah yazı).
     * Sınıf / Alan: `. Sınıf • -` (küçük gri açıklama metni).
   * **Aksiyon Butonu:** Sağ başta `İncele` butonu (açık leylak/mor dolgulu yumuşak buton, mor-mavi yazı).

#### Sağ Kolon: "Genel Takvim" Bölümü
1. **Bölüm Başlığı:** `Genel Takvim`
2. **Takvim Navigasyon ve Filtre Şeridi:**
   * Sol Butonlar: `[Bugün]` `[Geri]` `[İleri]` (beyaz zeminli, ince gri çerçeveli butonlar).
   * Orta Başlık: `Ekim 2026` (aktif takvim ay ve yılı).
   * Sağ Görünüm Buton Grubu:
     * `[Ay]` (Aktif: canlı mor-mavi arka plan dolgusu, beyaz yazı).
     * `[Hafta]` (Pasif: beyaz zemin, gri yazı).
     * `[Gün]` (Pasif: beyaz zemin, gri yazı).
     * `[Ajanda]` (Pasif: beyaz zemin, gri yazı).
3. **Takvim Izgarası (Aylık Tablo):**
   * Sütun Başlıkları: `Pzt` | `Sal` | `Çar` | `Per` | `Cum` | `Cts` | `Paz`
   * Günler: 28 Eylül - 01 Kasım 2026 tarih aralığı.
   * **15 Ekim (Perşembe):** Bugünün tarihi (hücre arka planı açık gri-leylak rengiyle hafifçe vurgulanmış).
   * **16 Ekim (Cuma):** Hücre içerisinde etkinlik kutusu: `karma test` (mor-mavi dolgulu dikdörtgen blok, beyaz metin).
   * **20 Ekim (Salı):** Hücre içerisinde etkinlik kutusu: `integrale giriş` (mor-mavi dolgulu dikdörtgen blok, beyaz metin).

---

### 🖥️ Ekran 2: Programlarım (`/coach/programs`)

* **Aktif Menü Durumu:** Sol menüde **Programlar** aktif (açık mor dolgulu arka plan ile seçili).
* **Sayfa Başlığı:** `Programlarım` (kalın siyah H1).

#### Üst Kart: "Yeni Program Oluştur" Formu
* Beyaz renkli geniş kart.
* **Form Alanı:**
  * Etiket: `Yeni Program Adı`
  * Metin Kutusu (Input): Placeholder metni `Örn: 12-A Koçluk` olan gri çerçeveli giriş kutusu.
* **Gönderme Butonu:** `Program Oluştur` (mor-mavi dolgulu, tam genişlikte buton, beyaz metin).

#### Alt Liste: Mevcut Program Kartları
1. **Program 1 ("çilek"):**
   * **Başlık:** `çilek` (kalın siyah başlık).
   * **Rol Rozeti (Sağ Üst):** `Yönetici` (koyu mor-mavi hap rozet, beyaz yazı).
   * **Öğrenci Sayacı:** `Öğrenci: 1`
   * **Kayıtlı Öğrenciler Bloğu (Gri Dolgulu Panel):**
     * Etiket: `ÖĞRENCİLER:` (küçük gri büyük harf başlık).
     * Öğrenci Butonu: `can öğrenci` (beyaz hap şeklinde buton, mavi kenarlık, mavi yazı; tıklandığında öğrenci detayına gider).
   * **Alt Aksiyon Butonları (Yatay Düğme Grubu):**
     * `[Öğretmenler]` (mor-mavi buton)
     * `[Dersler]` (mor-mavi buton)
     * `[Gruplar]` (mor-mavi buton)
     * `[Program]` (mor-mavi buton)
     * `[Ayarlar]` (şeffaf zeminli, çerçeveli outline buton)
2. **Program 2 ("Koçluk Programım"):**
   * **Başlık:** `Koçluk Programım` (kalın siyah başlık).
   * **Rol Rozeti (Sağ Üst):** `Yönetici` (koyu mor-mavi hap rozet, beyaz yazı).
   * **Öğrenci Sayacı:** `Öğrenci: 0`
   * *(Öğrenci sayısı 0 olduğu için öğrenciler paneli görünmez).*
   * **Alt Aksiyon Butonları:**
     * `[Öğretmenler]` `[Dersler]` `[Gruplar]` `[Program]` `[Ayarlar]`

---

### 🖥️ Ekran 3: Öğrenciler (`/coach/students`)

* **Aktif Menü Durumu:** Sol menüde **Öğrenciler** aktif (açık mor dolgulu arka plan ile seçili).
* **Sayfa Başlığı ve Aksiyon:**
  * Ana Başlık: `Öğrenciler` (kalın siyah H1).
  * Açıklama: `Tüm öğrencilerinizin performansını ve durumunu yönetin.`
  * Sağ Üst Buton: `+ Yeni Öğrenci Ekle` (mor-mavi dolgulu birincil buton, beyaz yazı).

#### Arama Alanı (Search Card)
* Beyaz geniş arama kutusu kartı.
* Input Placeholder: `Öğrenci ara (isim veya e-posta)...`

#### Öğrenci Kartı (Liste Elemanı)
* Beyaz yuvarlatılmış dikdörtgen kart.
* **Sol Alan:**
  * Yuvarlak mavi avatar, içinde beyaz `c` harfi.
  * Öğrenci Adı: `can öğrenci` (kalın siyah font).
  * E-posta Adresi: `canoser@hotmail.com` (açık gri font).
* **Sağ Üst Durum Rozeti:**
  * `Kayıtlı / Aktif` (açık pastel yeşil zemin, koyu yeşil yazı).
* **Alt Aksiyon Butonları:**
  * Sol Buton: `Profili Gör` (şeffaf zemin, gri çerçeve/hover, siyah yazı).
  * Sağ Buton: `Ödev Ata` (açık mor-mavi leylak dolgulu buton, koyu mor-mavi yazı).

---

### 🖥️ Ekran 4: Takvim (`/coach/calendar`)

* **Aktif Menü Durumu:** Sol menüde **Takvim** aktif (açık mor dolgulu arka plan ile seçili).
* **Sayfa Başlığı ve Açıklaması:**
  * Ana Başlık: `Takvim` (kalın siyah H1).
  * Açıklama: `Öğrencilerinizin ödevleri, ders programları ve sınavları.`

#### Takvim Ana Kartı (Büyük Beyaz Kart)
1. **Renk Lejantı (Etkinlik Türü Göstergesi):**
   * Üst şerit halinde renkli noktalar ve etiketler:
     * 🔵 Mavi Nokta: `Ödev`
     * 🟢 Yeşil Nokta: `Tamamlanan Ödev`
     * 🔴 Kırmızı Nokta: `Gecikmiş Ödev`
     * 🟠 Sarı/Turuncu Nokta: `Sınav / Deneme`
     * 🟣 Mor Nokta: `Ders Programı`
2. **Takvim Kontrol Başlığı:**
   * Sol Butonlar: `[Bugün]` `[Geri]` `[İleri]`
   * Orta Metin: `Ekim 2026`
   * Sağ Görünüm Seçici: `[Ay]` (Aktif, mor-mavi) | `[Hafta]` | `[Gün]` | `[Ajanda]`
3. **Aylık Takvim Izgarası:**
   * Günler: `Pzt` - `Paz`
   * **15 Ekim:** Bugünün tarihi (açık gri-mavi arka plan ile vurgulu).
   * **16 Ekim (Cuma):** `karma test — can öğrenci` (Mavi dolgulu çubuk; Ödev lejantı ile aynı renkte, öğrenci adı eklenmiş).
   * **20 Ekim (Salı):** `integrale giriş — can öğrenci` (Yeşil dolgulu çubuk; Tamamlanan Ödev lejantı ile aynı renkte, öğrenci adı eklenmiş).

---

### 🖥️ Ekran 5: Raporlar ve Analizler (`/coach/reports`)

* **Aktif Menü Durumu:** Sol menüde **Raporlar** aktif (açık mor dolgulu arka plan ile seçili).
* **Sayfa Başlığı ve Açıklaması:**
  * Ana Başlık: `Raporlar ve Analizler` (kalın siyah H1).
  * Açıklama: `Öğrenci performanslarını detaylı olarak inceleyin.`

#### Yan Yana İki Analitik Kart (Grid Yapısı)
1. **Sol Kart: Sayısal KPI Metrikleri (Özet İstatistikler):**
   * Beyaz geniş kart üzerinde 4 eşit sütun:
     * **1. Sütun:**
       * Etiket: `Toplam Öğrenci` (küçük gri başlık).
       * Değer: `1` (büyük, kalın, siyah sayı).
     * **2. Sütun:**
       * Etiket: `Bu Hafta Verilen` (küçük gri başlık).
       * Değer: `2` (büyük, kalın, siyah sayı).
     * **3. Sütun:**
       * Etiket: `Bugün Biten` (küçük gri başlık).
       * Değer: `1` (büyük, kalın, yeşil sayı).
     * **4. Sütun:**
       * Etiket: `Toplam Gecikmiş` (küçük gri başlık).
       * Değer: `0` (büyük, kalın, kırmızı sayı).
2. **Sağ Kart: Başarı Oranı Donut Grafiği:**
   * Beyaz geniş kart.
   * **Donut (Halka) Grafik:**
     * Sol yarım yay: Açık gri (`#e2e8f0`).
     * Sağ yarım yay: Mor-mavi (`#4f46e5`).
     * Halka Merkezi: `%50` (büyük, kalın, siyah yüzde değeri).
   * **Grafik Lejantı:**
     * Mor-mavi nokta: `Başarı Oranı` etiketi.
