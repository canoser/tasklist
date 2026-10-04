# 🎓 Mentörüm — Ürün Planı (URUN_PLANI.md)
> **Versiyon:** 1.0 — 23 Eylül 2026  
> **Platform:** mentorum.dersmatris.com (Web + Kurulabilir PWA + Capacitor)
> **V5 (4 Ekim 2026):** Okul/Dershane Modeli eklendi — ayrıntılı tasarım `V5_OKUL_MODELI.md`, görev listesi `TASK_LIST_V5.md`.

---

## İÇİNDEKİLER
1. [Vizyon ve Kapsam](#1-vizyon-ve-kapsam)
2. [Kullanıcı Rolleri ve Yetki Matrisi](#2-kullanıcı-rolleri-ve-yetki-matrisi)
3. [Müfredat Stratejisi (2026-2027)](#3-müfredat-stratejisi)
4. [Özellik Haritası ve İlişkiler](#4-özellik-haritası-ve-ilişkiler)
5. [Navigasyon Haritası (Tam)](#5-navigasyon-haritası)
6. [Ekran Detayları](#6-ekran-detayları)
7. [Ödev Sistemi](#7-ödev-sistemi)
8. [Bildirim Sistemi](#8-bildirim-sistemi)
9. [Responsive Strateji](#9-responsive--cihaz-stratejisi)
10. [Gelecekte Çıkabilecek Sorunlar](#10-gelecekte-çıkabilecek-sorunlar)
11. [Öz-Eleştiri ve Risk Analizi](#11-öz-eleştiri-ve-risk-analizi)
12. [Netleştirilmesi Gereken Kararlar](#12-netleştirilmesi-gereken-kararlar)

---

## 1. Vizyon ve Kapsam

### 1.1 Problem
Bireysel koçlar öğrenci takibini Excel, WhatsApp ve kağıt defterle yapıyor.
Sorunlar:
- Öğrenciler ödevlerini nerede bulacağını bilemiyor
- Veliler süreci anlayamıyor, koçu sürekli arıyor
- Gecikmiş ödevler manuel takiple kaçabiliyor
- Aynı ödevi iki öğrenciye atarken koç iki kez yazıyor
- Müfredat bilgisi olmadığından "hangi konu" sorusu yanıtsız kalıyor

### 1.2 Çözüm
Mentörüm; bireysel koçların tüm öğrencilerini, ödevlerini, takvimlerini
ve müfredata dayalı konu takibini tek bir profesyonel platformdan yönetmesini sağlar.

### 1.3 MVP Kapsamı (İlk Yayın)

DAHIL:
- Koç paneli (tablet-first) — "müdür" rolü: ders/öğretmen/öğrenci/grup/program yönetimi
- Öğrenci paneli (mobil-first)
- Veli paneli (mobil, salt okunur)
- Ödev atama ve takip (ortak şablon, kişisel durum)
- Müfredat tabanlı konu listesi (2026-2027)
- Takvim görünümü (gün/hafta/ay)
- Bildirimler (uygulama içi + push)
- Google OAuth + e-posta giriş (öğretmen dahil)
- Öğretmen paneli (mobil-first) — kendi dersine ait öğrencileri koçun izin verdiği ölçüde görür/yönetir
- Ders (Course) yönetimi: öğretmenli veya öğretmensiz (kendi kendine çalışma)
- Öğrenci grupları (grup bazlı atama/ders/program)
- Ödev atama ve takip (tek öğrenci / grup / ders bazlı)
- Haftalık program (sürükle-bırak)
- Ders kaynağı takibi (kitap sayfası, video serisi, soru seti — ilerleme %)
- Kurulabilir uygulama (PWA: tablet/telefon/masaüstü) + Capacitor (mağaza, Faz 2)

KAPSAM DIŞI (Sonraki Versiyon):
- AI destekli analiz
- Ödeme/abonelik sistemi
- Canlı ders/video görüşme
- Birden fazla koç — bir öğrenci (öğretmenler koçun ALTINDA çalışır, bağımsız değil)
- Dosya/PDF ek yükleme
- SMS bildirimleri
- Soru havuzu (hazır soru bankası — içerik yatırımı, Faz 3)

---

## 2. Kullanıcı Rolleri ve Yetki Matrisi

### 2.1 Roller

KOÇ:
- Sistemi oluşturan, hesabı açan kişi
- Kendi altındaki tüm öğrencileri yönetir
- Ödev atar, konu işler, notlar tutar
- Öğrenci profili oluşturur, veli bilgisi girer
- Her şeyi görür — kısıtı yok
- Cihaz: Öncelikle tablet/masaüstü

ÖĞRENCİ:
- Koç tarafından sisteme eklenir
- Yalnızca kendi ödevlerini, derslerini ve takvimini görür
- "Tamamladım" işareti yapabilir
- Koçun notlarını GÖREMEZ
- Diğer öğrencilerin hiçbir verisini göremez
- Cihaz: Öncelikle telefon

VELİ:
- Koç tarafından davet edilir (e-posta ile)
- Yalnızca bağlı olduğu öğrencinin genel durumunu görür
- Salt okunur: ödev listesi, takvim, genel istatistik
- Koçun notlarını ve özel bilgileri GÖREMEZ
- Birden fazla çocuğu varsa hepsini görebilir
- Cihaz: Telefon

ÖĞRETMEN:
- Koç tarafından davet edilir (e-posta/Google ile giriş)
- Yalnızca atandığı DERSİN öğrencilerini görür
- Görünürlük/yetki, koçun ders bazında verdiği izinlerle sınırlıdır (bkz. `V5_OKUL_MODELI.md` §2.3)
- Başka dersin veya diğer öğrencilerin verisine erişemez
- Ödev/sınav girişi, koçun açtığı izinlere bağlıdır
- Cihaz: Telefon/tablet

### 2.2 Yetki Matrisi

| Veri                  | Koç | Öğretmen | Öğrenci | Veli     |
|-----------------------|-----|----------|---------|----------|
| Öğrenci adı/sınıfı    | ✅  | ⚙️(izin) | ✅(kendi)| ✅(çocuğu)|
| Veli telefon/e-posta  | ✅  | ⚙️(varsayılan ❌) | ❌ | ✅(kendi) |
| KOÇ ÖZEL NOTLARI      | ✅  | ⚙️(varsayılan ❌) | ❌ | ❌        |
| Geçmiş sınav notları  | ✅  | ⚙️(izin) | ✅(kendi)| ✅(çocuğu)|
| Hedef bilgisi         | ✅  | ⚙️(izin) | ✅(kendi)| ✅(çocuğu)|
| Ödev listesi          | ✅  | ⚙️(izin) | ✅(kendi)| ✅(çocuğu)|
| Diğer ders/öğrenci verisi | ✅ | ❌       | ❌       | ❌        |
| Haftalık program      | ✅(tüm)| ✅(kendi dersi)| ✅(kendi)| ✅(çocuğu)|
| Ders kaynağı ilerlemesi| ✅ | ⚙️(izin) | ✅(kendi)| ✅(çocuğu)|
| Takvim                | ✅(tüm)| ✅(kendi dersi)| ✅(kendi)| ✅(çocuğu)|

> ⚙️ = koçun ders bazında açıp kapattığı öğretmen izni. Ayrıntı: `V5_OKUL_MODELI.md` §2.3.

⚠️ KRİTİK GÜVENLİK: Bu yetki kontrolleri YALNIZCA frontend'de değil,
her API endpoint'inde sunucu tarafında uygulanmalıdır.

---

## 3. Müfredat Stratejisi (2026-2027)

### 3.1 Sınıf-Müfredat Tablosu

| Kademe    | Sınıf  | Müfredat Türü | Sınav |
|-----------|--------|---------------|-------|
| Ortaokul  | 5, 6, 7| YENİ (Türkiye Yüzyılı Maarif Modeli) | — |
| Ortaokul  | 8      | ESKİ          | LGS   |
| Lise      | 9,10,11| YENİ          | —     |
| Lise      | 12     | ESKİ          | TYT-AYT|

### 3.2 Müfredat Veri Yapısı Kavramı

Müfredat Yılı (ör: 2026-2027)
  └── Sınıf Seviyesi (ör: 11. Sınıf)
        └── Ders (ör: Matematik)
              └── Müfredat Tipi (YENİ/ESKİ)
                    └── Ünite 1: Fonksiyonlar
                          ├── Konu 1.1: Fonksiyon Kavramı
                          ├── Konu 1.2: Bileşke Fonksiyon
                          └── Konu 1.3: Ters Fonksiyon

### 3.3 Müfredat Güncelleme Stratejisi
- Sistem yıl bazlı müfredat versiyonu tutar
- Eski öğrencilerin eski yıl verileri bozulmaz
- Yeni eğitim yılında koç "müfredatı güncelle" onayı verir
- Konu silinmez, "aktif değil" işaretlenir; ödev bağlantısı tutulur

---

## 4. Özellik Haritası ve İlişkiler

### 4.1 Temel Varlıklar Arası İlişki

Koç (1) ──────► Öğrenciler (N)
Öğrenci (1) ──► Dersler (N) [StudentSubject]
Ders (1) ──────► Ödev Atamaları (N) [HomeworkAssignment]
Ödev Şablonu (1) ► Ödev Atamaları (N) [farklı öğrenciler için]
Müfredat Konusu (1)► Ödev Atamaları (N) [konu referansı]
Öğrenci (1) ──► Veliler (N) [ParentStudent, max 2]

### 4.2 Özellikler Arası Bağımlılık

| Özellik               | Bağımlı Olduğu              |
|-----------------------|-----------------------------|
| Ödev Atama            | Öğrenci + Ders kaydı        |
| Konu Seçimi (ödevde)  | Müfredat veritabanı         |
| Takvim Görünümü       | Ödev atamaları + Son tarih  |
| Gecikmiş Bildirim     | Ödev son tarihi + Cron job  |
| Veli Paneli           | Öğrenci-Veli eşleşmesi      |
| Rapor Grafikleri      | Min 2 hafta tamamlanan ödev |
| Google Auth           | OAuth yapılandırması        |

### 4.3 Kritik İş Akışları

AKIŞ 1 — Koç → Yeni Öğrenci Ekleme:
1. "Öğrenci Ekle" butonuna tıkla
2. Ad, soyad, sınıf, alan gir
3. Veli 1 bilgisini gir (e-posta zorunlu — davet gönderilir)
4. Veli 2 bilgisini gir (opsiyonel)
5. Öğrenci için otomatik giriş bilgisi oluşur
6. Öğrenci aktivasyon e-postasına tıklar, şifre belirler

AKIŞ 2 — Koç → Ödev Atama:
1. Öğrenci → Ders sayfası → "Ödev Ata"
2. Başlık, açıklama, son tarih, konu (müfredattan veya serbest)
3. "Bu ödevi başka öğrencilere de ata?" → Öğrenci listesi
4. Her öğrenciye farklı son tarih girilebilir
5. Kaydet → Seçilen öğrencilere bildirim

AKIŞ 3 — Öğrenci → Ödevi Tamamlama:
1. Ana sayfada "bugünün ödevleri" listesi
2. Ödeve tıkla → detay (sayfa, konu, açıklama)
3. "Tamamladım" butonuna bas → sistem işaretler
4. Koça bildirim: "Ayşe — Matematik ödevini tamamladı"

AKIŞ 4 — Veli → Sisteme Katılma:
1. Koç öğrenci eklerken veli e-postasını girer
2. Davet maili gönderilir (UUID token, 48 saat geçerli)
3. Veli linke tıklar → şifre belirler veya Google ile girer
4. Veli paneli açılır — yalnızca bağlı çocuğunun verisi

---

## 5. Navigasyon Haritası

### 5.1 Koç Navigasyonu (Tablet/Masaüstü — Sol Sidebar)

GİRİŞ SAYFASI (dersmatris.com)
└── Koç giriş
      ├── 🏠 DASHBOARD
      │     ├── Özet kartlar (öğrenci / gecikmiş / bugün biten / bu hafta)
      │     ├── Gecikmiş ödevler listesi
      │     ├── Yaklaşan ödevler (3 günlük)
      │     └── Hızlı eylem butonları
      │
      ├── 👥 ÖĞRENCİLER
      │     ├── Liste (arama, filtre: sınıf/alan/aktif)
      │     ├── [+ Yeni Öğrenci]
      │     └── ÖĞRENCİ PROFİLİ (:studentId)
      │           ├── [Sekme: Profil]
      │           │     ├── Kişisel bilgiler
      │           │     ├── Veli 1 & 2
      │           │     ├── Hedef
      │           │     ├── Sınav geçmişi
      │           │     └── Koç özel notları (öğrenci göremez)
      │           ├── [Sekme: Dersler]
      │           │     ├── Aktif ders kartları
      │           │     ├── [+ Ders Ekle]
      │           │     └── DERS SAYFASI (:studentId/:subjectId)
      │           │           ├── [Sekme: Ödevler]
      │           │           │     ├── 🔴 Gecikmiş
      │           │           │     ├── 🟡 Yapılacak
      │           │           │     ├── 🟠 Gecikmeli Tamamlanan
      │           │           │     ├── 🟢 Tamamlanan
      │           │           │     └── [+ Ödev Ata]
      │           │           ├── [Sekme: Konular] (müfredattan)
      │           │           └── [Sekme: Notlar] (koç özel)
      │           ├── [Sekme: Takvim] (öğrenciye ait, renk kodlu)
      │           └── [Sekme: Raporlar] (tamamlama oranı, gecikme eğilimi)
      │
      ├── 🧑‍🏫 ÖĞRETMENLER (liste + davet + profil)
      ├── 📚 DERSLER (liste + yeni ders + ders detayı: öğrenci/grup/öğretmen/kaynak/izin)
      ├── 👥 GRUPLAR (liste + üye yönetimi)
      ├── 🗓️ HAFTALIK PROGRAM (sürükle-bırak ızgara)
      ├── 📅 TAKVİM (Genel — tüm öğrenciler)
      ├── 📊 RAPORLAR (Genel)
      └── ⚙️ AYARLAR (profil, bildirimler, müfredat)

### 5.2 Öğrenci Navigasyonu (Mobil — Alt Menü: 4 sekme)

GİRİŞ → Öğrenci
├── [🏠] ANA SAYFA
│     ├── "Merhaba [Ad]!" + tarih
│     ├── Bugün yapılacaklar (önce gecikmiş)
│     ├── Haftalık ödev ilerleme çubuğu
│     └── Motivasyon mesajı
├── [📋] ÖDEVLERİM
│     ├── Filtre: Tümü / Yapılacak / Gecikmiş / Bitti
│     ├── Ders filtresi (yatay scroll)
│     └── Ödev detayı → [Tamamladım ✓]
├── [📅] TAKVİM
│     ├── Şerit haftalık görünüm (varsayılan)
│     └── Aylık görünüme geç
├── [📚] DERSLERİM
│     └── Ders Detayı → ödevler + konular
└── [👤] PROFİL

### 5.3 Veli Navigasyonu (Mobil — Alt Menü: 3 sekme)

GİRİŞ → Veli
├── [Birden fazla çocuk varsa] Çocuk Seçim Ekranı
├── [🏠] ÖZET (haftalık özet, pasta grafik)
├── [📋] ÖDEVLER (salt okunur)
└── [📅] TAKVİM (aylık görünüm)

### 5.4 Öğretmen Navigasyonu (Mobil — Alt Menü: 5 sekme)

GİRİŞ → Öğretmen
├── [🏠] DERSLERİM (atandığı dersler)
├── [👥] ÖĞRENCİLERİM (izin verilen öğrenciler)
├── [📋] ÖDEVLER (izin verildiyse)
├── [🗓️] PROGRAM (kendi derslerinin programı)
└── [👤] PROFİL

---

## 6. Ekran Detayları

### 6.1 Koç Dashboard — Bileşenler
- Özet Kart Grubu (4 kart): Toplam öğrenci / Bugün biten / Gecikmiş / Bu hafta
- Gecikmiş Ödevler: Öğrenci adı, ders rengi, ödev başlığı, kaç gün geciktiği
- Yaklaşan Ödevler (3 gün): Tarih bazlı gruplandırma
- Hızlı Eylem: Öğrenci Ekle, Ödev Ata, Takvimi Aç

### 6.2 Ödev Durum Akışı

YENİ ÖDEV ATANİR
  └── 🟡 YAPILACAK (son tarih geçmemiş)
        ├── Öğrenci "Tamamladım" basar → 🟢 TAMAMLANDI
        └── Son tarih geçer (yapılmamış) → 🔴 GECİKMİŞ
              ├── Öğrenci sonradan yaparsa → 🟠 GECİKMİŞ TAMAMLANDI
              └── Koç iptal ederse → ⚫ İPTAL EDİLDİ

### 6.3 Ödev Durum Renk Sistemi

| Durum                | Renk         | İkon | Etiket              |
|----------------------|--------------|------|---------------------|
| Tamamlandı           | #22C55E Yeşil| ✅   | "Tamamlandı"        |
| Yapılacak (>2 gün)   | #3B82F6 Mavi | 📋   | "X gün kaldı"       |
| Yapılacak (<=2 gün)  | #F59E0B Sarı | ⏳   | "Yarın!" / "Bugün!" |
| Gecikmiş             | #EF4444 Kırmızı| 🔴 | "X gün gecikti"     |
| Gecikmeli Tamamlandı | #F97316 Turuncu| ⚠️ | "Geç tamamlandı"    |
| İptal Edildi         | #6B7280 Gri  | ⚫   | "İptal"             |

---

## 7. Ödev Sistemi

### 7.1 Ortak Şablon, Kişisel Durum

ÖDEV ŞABLONU (Koçun oluşturduğu):
- Başlık, açıklama, kaynak (sayfa/soru)
- Konu referansı (müfredattan veya serbest metin)
- Şablon ID (UUID)

ÖDEV ATAMASI (Her öğrenci için ayrı):
- Şablon ID (referans)
- Öğrenci ID
- Son tarih (her öğrenci için farklı olabilir)
- Durum: BEKLIYOR / TAMAMLANDI / GECİKMİŞ / GECİKMİŞ_TAMAMLANDI / İPTAL
- Tamamlanma tarihi (null ise yapılmamış)
- Tamamlayan kim: Öğrenci mi, Koç mu?

### 7.2 Toplu Ödev Atama UX
1. Ödev detaylarını gir
2. "Bu ödevi başka öğrencilere de ata?" checkbox listesi
3. "Hepsine aynı son tarih" veya "Kişisel tarih"
4. Kaydet → Tüm atamalar oluşur, bildirimler gönderilir

---

## 8. Bildirim Sistemi

| Tetikleyici           | Alıcı         | Kanal          | Zaman            |
|-----------------------|---------------|----------------|------------------|
| Ödev atandı           | Öğrenci       | Push + Uygulama| Anında           |
| Son tarih 48h kaldı   | Öğrenci       | Push           | Otomatik (cron)  |
| Son tarih 24h kaldı   | Öğrenci       | Push           | Otomatik (cron)  |
| Ödev gecikti          | Öğrenci + Koç | Push + Uygulama| Otomatik (cron)  |
| Ödev tamamlandı       | Koç           | Uygulama içi   | Anında           |
| Haftalık özet         | Veli          | E-posta        | Pazar sabahı     |
| Manuel hatırlatma     | Öğrenci       | Push           | Koç istediğinde  |

Kanal Yol Haritası:
- MVP: Uygulama içi (badge, toast)
- Faz 2: Web Push Notifications
- Faz 3: E-posta (haftalık özet, gecikme)
- Mobil App: FCM / APNs (Capacitor)

---

## 9. Responsive / Cihaz Stratejisi

| Genişlik    | Cihaz            | Kullanıcı    | Layout                        |
|-------------|------------------|--------------|-------------------------------|
| 0–480px     | Küçük telefon    | Öğrenci,Veli | Tek kolon, bottom tab bar     |
| 480–768px   | Büyük telefon    | Öğrenci,Veli | Genişletilmiş kartlar         |
| 768–1024px  | Tablet           | Koç          | Sidebar başlar, sticky        |
| 1024–1280px | Küçük masaüstü   | Koç          | Sol sidebar + geniş içerik   |
| 1280px+     | Masaüstü         | Koç          | Çoklu panel, geniş tablolar   |

Capacitor Hazırlığı:
- localStorage yerine utils/platform.js
- Ağ istekleri apiClient.js üzerinden
- 100vh yerine 100dvh
- env(safe-area-inset-*) bottom nav için
- capacitor.config.json MVP'den itibaren hazır

---

## 10. Gelecekte Çıkabilecek Sorunlar

### 10.1 Kullanıcı Deneyimi Sorunları

P1 — Çok öğrencili koç için dashboard bunaltıcı hale gelir
- 20+ öğrenci varsa gecikmiş liste çok uzar
- Çözüm: Sayfalama, "bugün acil" filtresi, öğrenci önceliklendirme

P2 — Öğrenci "tamamladım" basar ama yapmamış
- Sistem güvene dayalı, kod çözemez
- Çözüm (opsiyonel): Koç onaylı mod ayarı; Faz 2'de fotoğraf kanıtı

P3 — Veli yeterince bilgi göremeyince koçu arar
- Veli paneli "basit ama tatmin edici" olmalı
- Pasta grafik + son 5 ödev yeterli MVP için

P4 — Çok ödev = öğrenci demotive
- Ana sayfada YALNIZCA bugün + yarın görünsün
- "Tümü" listesi ayrı sekmede

P5 — Müfredat değişirse eski ödevler ne olur?
- Konu silinmez → "aktif değil" etiketi alır
- Ödev bağlantısı tutulur

P6 — Bir öğrenci iki koçla çalışmak isterse?
- MVP'de kapsam dışı (bir öğrenci = bir koç)
- Gelecekte: "Alt koç" rol yapısı

P7 — Öğrenci uygulamayı hiç açmıyorsa bildirim işe yaramaz
- Çözüm: E-posta bildirimi fallback, MVP'den itibaren

### 10.2 Güvenlik Sorunları

G1 — IDOR: Başkasının öğrencisini görme
/api/students/42 → ID 42 başka koçun öğrencisi
Her endpoint: WHERE coach_id = @aktifKoç kontrolü (BACKEND'DE)

G2 — Öğrenci başka öğrencinin ödevini görme
/api/homework/99 → Her ödev: WHERE student_id = @aktifÖğrenci

G3 — Veli koç notlarını ele geçirme
Koç notu ayrı endpoint (/api/students/:id/coach-notes)
Yalnızca Coach rolü erişebilir
Ana öğrenci endpoint coach_notes alanını HİÇ döndürmemeli

G4 — Davet linki suistimali
UUID tabanlı, tek kullanımlık, 48 saat geçerli token

G5 — Brute force giriş
5 başarısız denemede 15 dakika blok + captcha

G6 — JWT token çalınması
Kısa ömürlü access token (15 dk) + refresh token rotasyonu
"Tüm cihazlardan çıkış" özelliği

G7 — API rate limiting
IP başına: 100 req/dk
Auth endpoint: 10 req/dk

---

## 11. Öz-Eleştiri ve Risk Analizi

### 11.1 Planın Zayıf Noktaları

❶ Tek koç varsayımı kırılgan
"Bir öğrenci, birden fazla koç" senaryosu gelirse veri modeli köklü değişir.
MVP'de soyutlamayla önlem al: öğrenci-koç ilişkisi N:M olarak modelle.

❷ Müfredat verisi sabit bırakılırsa çürür
Her yıl yazılımcı müdahalesi gerekir.
Müfredat mutlaka veritabanında, yönetim arayüzü şart.

❸ Veli deneyimi zamanla yetersiz kalacak
MVP sonrası kullanıcı geri bildirimine göre genişletilmeli.
Şimdilik minimum canlı tutulacak.

❹ Ödev "tamamlandım" güvenilirliği
Sistem güvene dayalı — analitiklerin değeri kullanıcı kalitesine bağlı.
Bu kabul edilmeli; sistem "iletişim aracı", "kontrol aracı" değil.

❺ Çok fazla bildirim → kullanıcı kapatır
Bildirim tercih merkezi MVP'den itibaren şart.

❻ 50+ öğrencili koçta performans
Dashboard sorguları yavaşlayabilir.
Veritabanı indeksleme + pagination baştan düşünülmeli.

### 11.2 Hangi Özelliği Fazla Karmaşık Düşünüyoruz?

| Özellik                | Risk              | Karar         |
|------------------------|-------------------|---------------|
| AI konu analizi        | Fazla erken       | Faz 2         |
| Dosya yükleme          | Storage karmaşık  | Faz 2         |
| İki koç / bir öğrenci  | Model karmaşıklaşır| Faz 2        |
| Gelişmiş raporlar      | Veri lazım önce   | Faz 2         |

---

## 12. Netleştirilmesi Gereken Kararlar

| # | Karar                            | Seçenekler                                    |
|---|----------------------------------|-----------------------------------------------|
| 1 | Alan adı yapısı                  | dersmatris.com / app.dersmatris.com / {koç}.dersmatris.com |
| 2 | Ödev onay modu                   | Öğrenci işaretler = bitti / Koç onayı gerekli |
| 3 | Veli koç notlarını görebilir mi? | Evet / Hayır (önerim: Hayır)                  |
| 4 | Bir öğrenci birden fazla koç?    | MVP: Hayır / Gelecek: Evet                    |
| 5 | Müfredat kim düzenler?           | Yalnızca sistem / Koç ekleyip çıkarabilir     |
| 6 | Gecikmeli tamamlanan ayrı renk?  | Evet (turuncu) / Hayır (yeşile çevrilsin)     |
| 7 | MVP'de dosya eki var mı?         | Hayır (metin) / Evet (resim/PDF)              |
