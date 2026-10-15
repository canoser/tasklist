# 🧠 Mentörüm Koç & Öğrenci Platformu — Fikir, Arayüz ve Pedagojik İyileştirme Raporu

> **Hazırlayan:** Gemini 3.8 Flash (Google DeepMind — Antigravity Agent)  
> **Tarih:** 15 Ekim 2026  
> **İncelenen Referans Doküman:** `mentörüm/docs/TASK_LIST_V7/EKRAN_TASVIRLERI.md` ve ilgili 5 ekran görüntüsü (Dashboard, Programlar, Öğrenciler, Takvim, Raporlar)  
> **Temel İlke:** Sisteme karmaşık ve maliyetli yeni modüller yığmak yerine; **var olan ekranların, veri modellerinin ve bileşenlerin potansiyelini en üst düzeye çıkarmak**, kullanıcı deneyimindeki (UX) çelişkileri gidermek ve koç-öğrenci etkileşimini modern pedagojik prensiplerle güçlendirmek.

---

## 1. Yönetici Özeti ve Temel Yaklaşım Felsefesi

Mentörüm platformunun mevcut arayüzleri incelendiğinde; görsel olarak temiz, modern bir tasarım dili ve renk paleti yakalandığı ancak **işlevsel derinlik, sayfa yerleşimi mantığı ve modern koçluk rutinleri** açısından ciddi verimsizlikler bulunduğu görülmektedir.

En temel sorun: **Uygulamanın elindeki veri ve bileşenleri tam kapasiteyle kullanamaması ve ekranların büyük oranda "atıl beyaz boşluklar" ile kalmasıdır.**

* **İki Farklı Yerde Birebir Aynı Takvim:** Hem Dashboard'da hem de sol menüdeki "Takvim" sayfasında aynı aylık React-Big-Calendar bileşeni render edilmekte; aralarında hiçbir işlevsel, filtreleme veya pedagojik fark bulunmamaktadır.
* **Dashboard'un "Operasyonel Kokpit" Olamaması:** Dashboard bir koçun güne başlarken baktığı ilk ekrandır. Koç burada *"Bugün kim ödevini yapmadı?", "Bugün hangi görüşmem var?", "Hangi öğrenci risk altında?"* sorularının yanıtını saniyeler içinde almalıdır. Şu anki Dashboard ise sadece tek bir öğrenci kartı ve dev bir aylık takvimden ibarettir.
* **Programlarım Sekmesinin Cılızlığı:** Eğitim koçluğunun temel yapı taşı olan "Program", şu an yalnızca bir isim etiketi ve birkaç alt düğmeden ibaret kalmıştır; programın ilerlemesi, kapsamı, öğrenci profilleri görsel bir değer üretmemektedir.
* **Koçun ve Öğrencinin Kendi Özerkliğinin Yokluğu:** Koç kendi kişisel takvimini (müsaitlik saatleri, özel notları, veli randevuları) yönetememekte; öğrenci tarafında ise modern eğitim koçluğunun temeli olan "Öz-Düzenleme (Self-Regulation)" takvimi yer almamaktadır.
* **Raporlar Ekranının İşlevsizliği:** Sayfanın %80'i bomboş durmakta, yalnızca 4 küçük rakam ve tek bir donut grafik bulunmaktadır.

Aşağıdaki analizler, **büyük mimari değişiklikler yapmadan**, mevcut kod ve veri yapıları üzerinden en yüksek kullanıcı faydasını üretecek çözümleri sunmaktadır.

---

## 2. Ekran Bazlı Eksiklikler ve Derinlemesine Analiz (Gap Analysis)

### 2.1. İki Takvim İkilemi: Dashboard Takvimi vs. Sol Menü Takvimi
* **Mevcut Durum:**
  * `Dashboard` ekranında sağ tarafta devasa bir aylık takvim var (`Genel Takvim`).
  * Sol menüdeki `Takvim` ekranında da hemen hemen aynı aylık takvim var.
  * İkisi de aynı etkinlikleri (ödevleri) aynı renklerle gösteriyor.
* **Kullanıcı Açısından Çelişki:**
  * Koç Dashboard'a girdiğinde zaten aylık takvimi görüyorsa, sol menüdeki "Takvim" sekmesine neden tıklasın?
  * Veya sol menüde gelişmiş bir takvim varsa, Dashboard'un en değerli alanının %65'i neden statik bir aylık ızgara ile işgal ediliyor?
* **Modern Koçluktaki Çözüm ve Diferansiyasyon (Ayrıştırma):**
  1. **Dashboard Takvimi -> "Bugün & Bu Hafta Odaklı Operasyonel Ajanda (Daily/Weekly Cockpit)":**
     * Dashboard'daki takvim aylık devasa tablo olmaktan çıkarılmalı; **"Günün Ajandası / Bu Haftanın Akışı"** dikey timeline veya kompakt haftalık görünümüne dönüştürülmelidir.
     * Koç o gün masaya oturduğunda yalnızca bugünün teslimlerini, bugünün görüşmelerini ve yaklaşan sınavları liste halinde görmelidir.
  2. **Sol Menüdeki Takvim -> "Makro Planlama & Kapasite Yönetimi (Master Scheduling Hub)":**
     * Burası tam ekran, zengin filtreli (Öğrenciye göre filtrele, Programa göre filtrele, Etkinlik türüne göre filtrele) olmalıdır.
     * Koç burada sadece öğrenci ödevlerini değil; **kendi çalışma saatlerini, boş/dolu zaman dilimlerini (müsaitlik) ve veli görüşme randevularını** yönetebilmelidir.

---

### 2.2. Dashboard'un Eksiklikleri: Kokpit Olmaktan Uzak Bir Ana Sayfa
* **Mevcut Durum:**
  * Sol sütunda sadece "Öğrencilerim" başlığı altında tek bir öğrenci kutucuğu (`can öğrenci`, `. Sınıf • -`) ve bir `İncele` butonu var.
  * Sağ sütunda aylık takvim var.
* **Neden Yetersiz?**
  1. **Riskli Öğrenci Tespiti Yok (Management by Exception):** 20 öğrencisi olan bir koç, hepsini tek tek tıklayarak durum kontrol edemez. Dashboard'da derhal dikkat çeken bir **"Müdahale Gerektirenler (At-Risk / Takip Radarı)"** widget'ı olmalıdır (Örn: *"Ahmet son 2 ödevini teslim etmedi"*, *"Zeynep'in bugün teslimi var"*).
  2. **Günün Özeti / Hızlı İstatistikler Yok:** Koç o gün sisteme girdiğinde kaç ödevin teslim beklendiğini, kaçının tamamlandığını ana sayfada bir bakışta görememektedir (Raporlar sayfasına gitmek zorunda kalmaktadır).
  3. **Hızlı Aksiyonlar (Quick Actions) Yok:** Dashboard'dan tek tıkla "Hızlı Ödev Ver", "Görüşme Notu Ekle" veya "Duyuru Gönder" aksiyonları bulunmamaktadır.
  4. **Öğrenci Kartındaki Bilgi Kısırlığı:** Öğrencinin sınıfı `. Sınıf • -` şeklinde boş görünmektedir. Öğrencinin hedefi (YKS Sayısal, LGS, 12. Sınıf), aktif ödev sayısı veya son görülme tarihi kartta yer almamaktadır.

---

### 2.3. Koçun Kendi Zamanı ve Öğrencinin Kendi Takvimi (Çift Taraflı Kör Nokta)
Modern eğitim mentörlüğünde koçluk **tek yönlü bir görev atama mekanizması değildir**. İş birliğine dayalıdır.

* **Koç Açısından Eksiklik:**
  * Koç sisteme sadece öğrenciye atanan ödevleri girebilmektedir.
  * Koçun kendi çalışma ajandası yoktur: *"Pazartesi 14:00 - 15:00 Can ile 1-e-1 Koçluk Görüşmesi"*, *"Çarşamba 17:00 Veli Bilgilendirme Saati"*, *"Salı 19:00 - 21:00 Kişisel Çalışma / Müsait Değil"*.
  * Koç bu bilgileri takvimine yazamadığı için sistem koçun gerçek zamanını yöneten bir asistana dönüşememekte, sadece bir "ödev panosu" olarak kalmaktadır.
* **Öğrenci Açısından Eksiklik (Öz-Düzenlemeli Öğrenme / Self-Regulation):**
  * Pedagojide Zimmerman'ın **Öz-Düzenlemeli Öğrenme Modeli** (Self-Regulated Learning), başarılı bir öğrencinin kendi hedeflerini planlama yeteneğine dayandığını gösterir.
  * Mevcut yapıda öğrenciye yalnızca koç ödev atayabilmektedir.
  * Öğrencinin kendi okul sınav tarihlerini, kendi özel derslerini, kendi çözmeyi planladığı test kitaplarını veya kendi günlük soru hedeflerini girebileceği **özerk bir öğrenci çalışma ajandası** bulunmamaktadır.
  * Koç öğrencinin kendi yaptığı planı göremediği için koçluk seanslarında gerçekçi bir zaman yönetimi analizi yapamamaktadır.

---

### 2.4. "Programlarım" Sekmesinin Cılızlığı ve Operasyonel Kopukluğu
* **Mevcut Durum:**
  * Üstte "Yeni Program Adı" kutusu ve "Program Oluştur" butonu.
  * Altta "çilek" ve "Koçluk Programım" isimli iki kart.
  * Kartta sadece bir `Yönetici` rozeti, `Öğrenci: 1`, öğrencinin ismi ve 5 adet buton (`[Öğretmenler] [Dersler] [Gruplar] [Program] [Ayarlar]`).
* **Neden Çok Cılız ve Verimsiz?**
  1. **Programın Amacı ve Kapsamı Belirsiz:** Program YKS mi, LGS mi, 11. Sınıf Ara Sınıf Destek mi? Başlangıç ve bitiş tarihi nedir? Haftalık kaç saatlik bir müfredat öngörülmektedir? Hiçbiri görünmüyor.
  2. **İlerleme Durumu Yok:** Programın yüzde kaçı tamamlandı? Kaçıncı haftasındayız? Dönemlik/yıllık planın neresindeyiz? Hiçbir ilerleme çubuğu (progress bar) veya tamamlama yüzdesi yok.
  3. **Alt Butonların Fazlalığı ve Dağınıklığı:** 5 tane buton yan yana dizilmiş durumda. Bu butonların hepsi alt sayfalara yönlendiriyor; ancak koç program kartına baktığında içinde kaç ders tanımlı, kaç öğretmen var, kaç grup var görmüyor. Sadece butona basıp başka sayfaya geçince öğrenebiliyor.
  4. **Görsel Hiyerarşi Zayıflığı:** Program kartı görsel olarak çok yavan; okul/kurum veya branş hissi vermiyor.

---

### 2.5. "Öğrenciler" Sekmesi: Yönetim Paneli Yerine Basit Bir Adres Defteri
* **Mevcut Durum:**
  * Başlık: "Öğrenciler" + `+ Yeni Öğrenci Ekle` butonu.
  * Arama kutusu.
  * Tek bir kart: Avatar, isim, e-posta, `Kayıtlı / Aktif` rozeti, `Profili Gör` ve `Ödev Ata`.
* **Kullanıcı Açısından Eksiklikler:**
  1. **Filtreleme Eksikliği:** Öğrenci sayısı 10-20'ye çıktığında koç; *"Sadece 12. sınıfları göster"*, *"Sadece YKS-Sayısal öğrencilerini göster"*, *"Sadece Çilek programındakileri göster"* diyemiyor. Yalnızca metin araması yapabiliyor.
  2. **Hızlı Durum Göstergesi Yok:** Kartın üzerinde öğrencinin en son ne zaman aktif olduğu, şu an üzerinde bekleyen kaç açık ödevi olduğu, kaç ödevi geciktirdiği bilgisi yok. Koç öğrencinin durumunu anlamak için mutlaka `Profili Gör` demek zorunda kalıyor.
  3. **Toplu İşlem (Bulk Action) Yok:** Örneğin aynı gruptaki veya sınıftaki 5 öğrenciye aynı anda ortak bir ödev veya duyuru atanamıyor; her öğrenciye tek tek ödev atanmak zorunda kalınıyor.

---

### 2.6. "Raporlar ve Analizler" Sekmesi: Ekran İsrafı ve Analitik Derinlik Eksikliği
* **Mevcut Durum:**
  * Sol üstte 4 metrik: Toplam Öğrenci (1), Bu Hafta Verilen (2), Bugün Biten (1), Toplam Gecikmiş (0).
  * Sağ üstte: %50 Başarı Oranı Donut Grafiği.
  * Sayfanın altındaki %80'lik dev alan tamamen boş beyaz zemin.
* **Neden Yetersiz?**
  1. **Öğrenci Bazlı Seçim / Filtre Yok:** Bu rapor tüm koçluk havuzunun toplamı mı, yoksa tek bir öğrencinin mi? Belli değil. Koç öğrenci bazında rapor inceleyemiyor.
  2. **Ders / Branş Dağılımı Yok:** Başarı oranı %50 ama hangi derste %50? Matematikte mi, Fizikte mi? Hangi dersten kaç soru çözüldü veya kaç ödev yapıldı bilgisi yok.
  3. **Zaman Serisi / Trend Grafiği Yok:** Başarı oranı geçen haftaya göre artıyor mu, düşüyor mu? Günlük ödev tamamlama trend çizgisi yok.
  4. **Pedagojik Değeri Düşük:** Koç bu ekranı açıp veliye veya öğrenciye gösterdiğinde *"Bak bu hafta performansın bu"* diyebileceği somut bir karne/grafik sunamıyor.

---

## 3. Modern Mentörlük Yaklaşımları Işığında İhtiyaç Analizi

Dünyadaki ve Türkiye'deki başarılı koçluk sistemleri (Z Koçluk, Notion Education Templates, Khan Academy Mentoring, BetterUp vb.) incelendiğinde modern bir mentörlük platformunun şu 4 pedagojik ayağa dayanması gerektiği görülür:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   MODERN MENTÖRLÜK DÖNGÜSÜ                             │
├──────────────────┬──────────────────┬─────────────────┬────────────────┤
│ 1. HEDEF BELİRLE │  2. OPERASYONEL  │  3. GERİ BİLDİRİM│ 4. ÖZ-DÜZENLEME│
│   (Goal Setting) │      TAKİP       │  (Formative FB) │ (Self-Control) │
├──────────────────┼──────────────────┼─────────────────┼────────────────┤
│ Program amacı,   │ Günlük ajanda,   │ Gecikme radarı, │ Öğrencinin     │
│ haftalık ders    │ teslimler, veli/ │ haftalık başarı │ kendi takvimi, │
│ soru hedefleri   │ koç görüşmesi    │ & ders analizi  │ kendi notları  │
└──────────────────┴──────────────────┴─────────────────┴────────────────┘
```

1. **GROW Modeli (Goal - Reality - Options - Will):**
   * Koç ve öğrenci sistemde hedefleri (YKS puanı, haftalık 500 soru, konu bitirme) net görebilmelidir.
2. **Management by Exception (İstisnalarla Yönetim):**
   * Koç her şey yolunda giden öğrenciye zaman harcamamalı; sistem koça *"Ahmet 2 gündür sisteme girmedi"*, *"Ayşe'nin Geometri ödevi gecikti"* uyarısını vermelidir.
3. **Formative (Geliştirici) Değerlendirme:**
   * Sadece "yaptı/yapmadı" değil, ders bazlı eksikler raporda görünmelidir.
4. **Zaman Engelleme (Time-Blocking) & Koç Randevuları:**
   * Koçluk sadece ödev vermek değil; haftalık 15-30 dakikalık periyodik check-in görüşmeleridir. Bu görüşmeler takvimde resmi bir etkinlik türü olarak yer almalıdır.

---

## 4. Var Olan Kodlarla ve Küçük Müdahalelerle Yapılabilecek Somut İyileştirmeler (Quick Wins)

Bu bölümde hiçbir devasa altyapı değişikliği gerektirmeden, **mevcut tablolar, DTO'lar ve bileşenlerle** hızla hayata geçirilebilecek çözümler sıralanmıştır:

### 4.1. Dashboard İyileştirmeleri (Hemen Yapılabilir)
1. **Sağdaki Dev Takvimi Kompakt Ajandaya Çevirmek:**
   * React-Big-Calendar'ın `view="agenda"` veya dikey bir liste görünümü kullanılarak sağ taraf **"Günün Ajandası & Yaklaşan Teslimler"** haline getirilebilir.
   * Üstüne *"Bugün (15 Ekim)"* başlığı, altına bugün teslim edilecek ödevler, yaklaşan etkinlikler ve varsa koçluk randevusu kartları sıralanabilir.
2. **Sol Sütuna "Takip Radarı / Dikkat Gerektirenler" Kartı Eklemek:**
   * Mevcut `students` ve `homework_assignments` verisi taranarak:
     * 🔴 *Geciken Ödevler (1)*
     * 🟡 *Bugün Teslim Edilecekler (2)*
     * 🟢 *Dün Tamamlananlar (3)*
   * gibi 3 satırlık mini bir durum özeti kutusu eklenmesi koçun tüm güne hakim olmasını sağlar.
3. **Öğrenci Kartına Küçük Dokunuşlar:**
   * Kartta `. Sınıf • -` yazan yer, eğer veri boşsa `Sınıf Belirtilmemiş` yazmalı; yanına öğrencinin kayıtlı olduğu program (`Program: çilek`) ve varsa `Aktif Ödev: 2` rozeti iliştirilmelidir.

---

### 4.2. Takvim Sayfası İyileştirmeleri
1. **Filtre Çubuğu (Filter Bar) Eklenmesi:**
   * Takvimin üst kısmına mevcut `students` listesinden beslenen basit bir **"Öğrenci Seç: [Tümü / can öğrenci]"** açılır kutusu (dropdown) eklenmelidir.
   * Böylece koç tüm öğrencilerin etkinlikleri arasında boğulmaz; tek bir öğrenciyi seçtiğinde sadece onun ödev ve programını görür.
2. **Etkinlik Türü Filtresi:**
   * Lejanttaki butonlara tıklanabilirlik özelliği verilerek (Ödev, Tamamlanan, Gecikmiş, Sınav, Görüşme) koçun yalnızca sınavları veya yalnızca teslimleri filtreleyebilmesi sağlanmalıdır.
3. **Koçun Kendi Etkinliğini / Görüşmesini Ekleyebilmesi:**
   * Takvimde boş bir güne tıklandığında açılan modalda sadece "Ödev" değil; **"Koçluk Görüşmesi / Randevu"** ve **"Kişisel Not"** türü seçilebilmelidir.
   * Backend'de `calendar_events` tablosu veya `homework_assignments` üzerindeki `type` kolonu buna zaten uygundur.

---

### 4.3. "Programlarım" Sayfası İyileştirmeleri
1. **Program Kartına İlerleme ve İstatistik Şeridi Eklenmesi:**
   * Program kartında `Öğrenci: 1` yazısının yanına:
     * `Ders Sayısı: 4` | `Öğretmen Sayısı: 2` | `Grup Sayısı: 1`
     * şeklinde küçük rozetler eklenerek koçun alt sayfalara girmeden programın doluluğunu görmesi sağlanabilir (mevcut `coaching_programs` sorgusu `COUNT` ile bunu kolayca dönebilir).
2. **Öğrenci Listesi Haplarının Zenginleştirilmesi:**
   * Öğrenci butonunun üstüne gelindiğinde (tooltip) veya yanında öğrencinin tamamlama oranı (%60 vb.) küçük bir badge ile gösterilebilir.
3. **Yeni Program Ekleme Kartının İyileştirilmesi:**
   * Yalnızca "Yeni Program Adı" yerine; yanına basit bir "Hedef / Kategori (YKS, LGS, Okul Dersi)" dropdown'ı konularak programlar kategorize edilebilir.

---

### 4.4. "Öğrenciler" Sayfası İyileştirmeleri
1. **Filtre ve Sıralama Çubuğu:**
   * Arama çubuğunun hemen sağına `[Tüm Programlar / çilek / Koçluk Programım]` ve `[Aktif / Pasif]` filtreleri eklenmelidir.
2. **Öğrenci Kartında Durum İstatistikleri:**
   * Kartın sağ tarafındaki boşluk değerlendirilerek 3 mini gösterge eklenebilir:
     * 📚 *Aktif Ödev: 2*
     * ✅ *Tamamlanan: 1*
     * 🎯 *Hedef: Belirtilmemiş*
   * Bu bilgi koçun öğrenci detayına girmeden öğrencinin yükünü görmesini sağlar.
3. **Hızlı Durum Değiştirici:**
   * Öğrencinin aktif/pasif durumu kart üzerinden hızlıca yönetilebilir.

---

### 4.5. "Raporlar ve Analizler" Sayfası İyileştirmeleri
1. **Sayfanın Altındaki %80'lik Boşluğu Doldurmak:**
   * **Ders Bazlı Başarı Çubukları (Subject Breakdown):**
     * Sol alt bölüme: Matematik (%80), Fizik (%30), Türkçe (%100) şeklinde yatay ilerleme çubukları konulabilir.
   * **Son Tamamlanan Ödevler Tablosu / Geçmişi:**
     * Sağ alt bölüme: En son teslim edilen 5 ödevin listesi (Öğrenci, Ödev Başlığı, Teslim Tarihi, Durum).
2. **Öğrenci Seçim Filtresi (Global Rapor Filtresi):**
   * Sayfanın tepesine `Öğrenci Seçiniz: [Genel Ortalama (Tüm Öğrenciler) ▼]` dropdown'ı konularak koçun istediği öğrencinin tekil karne/başarı grafiğine bakabilmesi sağlanmalıdır.

---

## 5. Uygulama ve Önceliklendirme Matrisi (Efor vs. Etki)

| Öncelik | Alan | Yapılacak İyileştirme | Tahmini Efor | Pedagojik / UX Etkisi |
|---|---|---|---|---|
| **P1 (Kritik)** | **Dashboard** | Sağdaki aylık takvimi daraltıp "Günün Ajandası & Gecikenler Radarı"na dönüştürmek; iki takvim çakışmasını çözmek | Düşük (1-2 Gün) | **Çok Yüksek:** Koçun her gün kullanacağı gerçek bir kokpit yaratır. |
| **P1 (Kritik)** | **Takvim** | Takvime Öğrenci ve Etkinlik Türü filtresi eklemek; Koçun kendi görüşme randevusunu takvime ekleyebilmesi | Düşük (1 Gün) | **Çok Yüksek:** Takvim sayfasını işlevsel ve ayrışmış bir ana merkeze dönüştürür. |
| **P2 (Önemli)** | **Raporlar** | Sayfa altındaki boş alana Ders Dağılımı çubukları ve Öğrenci filtre seçicisi eklemek | Orta (1-2 Gün) | **Yüksek:** Sayfadaki boşluk israfını bitirir, veriye anlam katar. |
| **P2 (Önemli)** | **Programlar** | Program kartlarına ders/öğretmen/grup sayaçları ve hedef rozeti eklemek | Düşük (0.5 Gün) | **Orta-Yüksek:** Cılızlığı giderir, kurumsal bir eğitim programı hissi verir. |
| **P3 (İleri)** | **Öğrenci Takvimi** | Öğrenci tarafında öğrencinin kendi çalışma saatlerini ve kendi sınavlarını girebileceği özerk ajanda | Orta (2-3 Gün) | **Çok Yüksek:** Öğrenciyi pasif alıcıdan aktif özerk öğrenene dönüştürür (Self-Regulation). |

---

## 6. Sonuç ve Öneri

Mentörüm'ün mevcut teknik altyapısı (React 19, Vite, .NET 9, Dapper, SQLite) sağlam ve hızlı çalışmaktadır. İhtiyaç duyulan şey yeni karmaşık sayfalar veya üçüncü parti ağır kütüphaneler değil; **elimizdeki verinin doğru hiyerarşiyle ve koçun günlük çalışma ritmine uygun biçimde ekrana yansıtılmasıdır.**

İlk adım olarak:
1. Dashboard'daki aylık takvimin **"Günün Ajandası & Takip Radarı"** olarak yeniden düzenlenmesi,
2. Sol menüdeki Takvim sayfasına **"Öğrenci Filtresi & Koç Görüşme Randevusu"** yeteneği kazandırılması,
3. Raporlar sayfasındaki dev boşluğun **ders bazlı dağılım ve filtreleme** ile doldurulması,

uygulamayı görsel ve işlevsel olarak birkaç gün içinde profesyonel bir koçluk platformu seviyesine çıkaracaktır.
