# 🎓 Mentörüm — Ürün Planı (URUN_PLANI.md)
> **Versiyon:** 2.0 — 6 Ekim 2026 (V5 Koçluk Programı modeli)
> **Platform:** mentorum.dersmatris.com (Web + Kurulabilir PWA + Capacitor)
> **V5 (6 Ekim 2026):** Okul/Dershane Modeli + Koçluk Programı (yönetici/yardımcı + süper yönetici) — ayrıntılı tasarım `V5_OKUL_MODELI.md`, görev listesi `TASK_LIST_V5.md`.

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
13. [Cline & DeepSeek Fikirleri (Geçici Brainstorm)](#13-cline--deepseek-fikirleri-geçici-brainstorm)

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
- Koç hiyerarşisi: Yönetici (programı kuran) + Yardımcı koç (yöneticinin atadığı; aynı iş yetkileri, koç yönetimi yok)
- Koçluk Programı: koçun birden çok programı (X); her programda yönetici + yardımcı koçlar
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
- ~~Birden fazla koç — bir öğrenci~~ → KAPSAMDA ama öğrenci TEK programda; çok koçluluk yardımcı koçlar üzerinden
- Dosya/PDF ek yükleme
- SMS bildirimleri
- Soru havuzu (hazır soru bankası — içerik yatırımı, Faz 3)

---

## 2. Kullanıcı Rolleri ve Yetki Matrisi

### 2.1 Roller

SÜPER YÖNETİCİ (Admin):
- Sistem sahibi (canoser@gmail.com); koç kayıtlarını onaylar/reddeder, koç başına program limitini (X) belirler
- Basit yönetici paneli
- Cihaz: Web/masaüstü

KOÇ (iki seviye — Yönetici/Yardımcı, bkz. `V5_OKUL_MODELI.md` §1.5):
- YÖNETİCİ: Programı kuran koç; her şeye yetkili, yardımcı atar/çıkarır, yöneticiliği devreder, programı siler; çıkarılamaz
- YARDIMCI: Yöneticinin atadığı koç; aynı iş yetkileri ama koç yönetimi + program silme yok
- Ödev atar, konu işler, notlar tutar
- Öğrenci profili oluşturur, veli bilgisi girer
- Ortak: ders/öğretmen/öğrenci/grup/program yönetimi, ödev/sınav, veli daveti
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
> 👥 "Koç" sütunu = Yönetici + Yardımcı (ikisi de aynı veriye erişir; tek fark koç yönetimi — bkz. `V5_OKUL_MODELI.md` §1.5).
> 🛡️ Süper Yönetici bu matrisin dışında (sistem yöneticisi): öğrenci/ders verisine erişmez; yalnızca koç onayı + X limiti + program listesi.

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
Her endpoint: WHERE program_id = @aktifProgram kontrolü (BACKEND'DE)

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

❶ ~~Tek koç varsayımı kırılgan~~ → ÇÖZÜLDÜ: çok koçluluk "yardımcı koç" ile, tek program içinde
~~"Bir öğrenci, birden fazla koç" senaryosu gelirse veri modeli köklü değişir.~~ → artık destekleniyor (tek program, yardımcı koçlar)
Çözüm: öğrenci↔program (1:1, `students.program_id`) + program↔koç (N:M, `program_coaches`) olarak modellendi.

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
| ~~İki koç / bir öğrenci~~ | Yardımcı koçla çözüldü (tek program) | V5 (kapsamda) |
| Gelişmiş raporlar      | Veri lazım önce   | Faz 2         |

---

## 12. Netleştirilmesi Gereken Kararlar

| # | Karar                            | Seçenekler                                    |
|---|----------------------------------|-----------------------------------------------|
| 1 | Alan adı yapısı                  | dersmatris.com / app.dersmatris.com / {koç}.dersmatris.com |
| 2 | Ödev onay modu                   | Öğrenci işaretler = bitti / Koç onayı gerekli |
| 3 | Veli koç notlarını görebilir mi? | Evet / Hayır (önerim: Hayır)                  |
| 4 | Bir öğrenci birden fazla koç?    | ✅ EVET — tek programda, yardımcı koçlar ile   |
| 5 | Müfredat kim düzenler?           | Yalnızca sistem / Koç ekleyip çıkarabilir     |
| 6 | Gecikmeli tamamlanan ayrı renk?  | Evet (turuncu) / Hayır (yeşile çevrilsin)     |
| 7 | MVP'de dosya eki var mı?         | Hayır (metin) / Evet (resim/PDF)              |

---

## 13. Cline & DeepSeek Fikirleri (Geçici Brainstorm)

> ⏳ **GEÇİCİ BÖLÜM NOTU:** Bu bölüm; ajanların (Cline, DeepSeek, Gemini, Sonnet) fikir tartışmasına **girdi** olması için yazılmış ham bir beyin fırtınasıdır. Tartışma sonrası bu bölüm **SİLİNECEK** ve yerine netleştirilmiş asıl plan yazılacaktır.

### 13.1 Temel Gözlem — "Mentörüm aslında ne?"

Mentörüm; bir **koçluk / dershane / özel okul işletim sistemi** — CRM + LMS + ERP kesişimi. Dört rol birer paydaş:
- **Koç** = işletme sahibi / yönetici (öğrenci portföyü, öğretmen ekibi, gelir).
- **Öğretmen** = uzman iş gücü (ders anlatır, ödev/sınav/not).
- **Öğrenci** = hizmet alan (ödev yapar, ders takip eder, hedefe yürür).
- **Veli** = ödeyen + denetçi (sadece izler, müdahale etmez).

Çekirdek döngü: **Koç atar → Öğretmen/Öğrenci yapar → Veli izler → Koç raporlar.**

### 13.2 Koç (Coach) — eksikler & fikirler

- **CRM yaşam döngüsü:** aday → kayıt → aktif → mezun → arşiv; etiket/segment/arama.
- **Erken uyarı:** "riskli öğrenci" skoru (gecikme trendi + devamsızlık + sınav düşüşü).
- **Finans (ticari kritik, şu an kapsam dışı):** ders ücreti, taksit, borç/ödenen, otomatik ders ücreti + aylık fatura özeti.
- **Ödev/sınav şablon kütüphanesi:** koçun tekrar kullandığı hazır şablonlar (kişisel, müfredata bağlı).
- **Dışa aktarma:** Excel/PDF (veliye, muhasebeye).
- **WhatsApp entegrasyonu:** davet + hatırlatma (veli/öğrenci).
- **Randevu / veli görüşmesi planlama** (koç takvimi).
- **Yardımcı koç performansı:** kim kaç ödev atadı, hangi öğrenciyle ilgilendi.
- **Çoklu şube / lokasyon** (ileri, franchise modeli).

### 13.3 Öğretmen (Teacher) — eksikler & fikirler

Şu an **sadece görüntüleme**. Olması gerekenler (kademeli):
- **Ödev oluştur / düzenle** (kendi dersi; birebir/grup atama) — en acil.
- **Sınav oluştur** (soru + cevap anahtarı) + **not girme** + otomatik ortalama.
- **Yoklama / devam takibi** (derse katılım).
- **Ders planı / konu anlatımı / ders notu** paylaşma.
- **Ders kaynağı** (video, doküman, link) ekleme (koç onaylı).
- **Öğrenciye özel geri bildirim / yorum**.
- **Kendi takvimi + müsaitlik** (koç ders atarken görsün).
- **Koçla ders hakkında not / iletişim**.
- İzin modeli (ders bazlı) zaten var → **ince taneli** yap: "not girebilir ama ödev silemez", "öğrenci ekleyebilir ama not göremez" vb.

### 13.4 Öğrenci (Student) — eksikler & fikirler

- **Gamification:** streak (üst üste tamamlama), rozet, günlük checklist, motivasyon.
- **Konu bazlı eksik analizi** ("hangi konuda zayıfım") + önerilen çalışma planı.
- **Sınav sonuç + gelişim grafiği** (zaman içinde yükseliş).
- **Quiz / kendini test et** (müfredattan otomatik soru).
- **Öğretmen ders notu / ders tekrarı** görüntüleme.
- **Hatırlatıcı** (push + e-posta).
- **Offline destek** (PWA).
- **Hedef / üniversite / bölüm takibi**.
- Karanlık mod, kişiselleştirme.

### 13.5 Veli (Parent) — eksikler & fikirler

- **Haftalık otomatik özet e-postası** (çocuğun tamamlama, gecikme, devamsızlık özeti).
- **Gelişim grafiği** (sınav, ödev tamamlama trendi).
- **Güvenli mesajlaşma** (koçla; koç özel notları ASLA görmez).
- **Ödeme / ücret görüntüleme** (finans gelince).
- **Randevu / veli toplantısı** talebi.
- **Onay akışı** (ek ders, program değişikliği).

### 13.6 Mevcut uygulamalara göre eksiklerimiz (benchmark)

| Örnek uygulama | Bizde | Eksik olan |
|---|---|---|
| Google Classroom (ödev akışı + duyuru) | kısmen | duyuru/akış, materyal paylaşımı |
| Khan Academy (konu ağacı + egzersiz) | kısmen | egzersiz/quiz motoru |
| ClassDojo (veli-öğretmen iletişimi + ödül) | kısmen | iki yönlü iletişim + ödül sistemi |
| Remind (SMS/push iletişim) | yok | gerçek push / SMS |
| Teachworks / TutorCruncher (koçluk CRM + fatura) | yok | CRM + finans |
| Preply / Superprof (öğretmen pazar yeri) | yok | öğretmen keşfi / pazarı |
| Duolingo (streak/gamification) | yok | motivasyon |
| Quizlet (quiz/flashcard) | yok | quiz |
| e-okul (not/devamsızlık) | kısmen | not + yoklama (öğretmen yok şu an) |

### 13.7 Yenilikçi / hayal gücü fikirleri

- **AI ödev asistanı:** ödev teslimini kontrol et, geri bildirim ver.
- **AI haftalık veli raporu:** LLM ile doğal dilde yazılmış otomatik özet.
- **Spaced repetition:** tekrar edilmesi gereken konuları otomatik öner.
- **Öğrenci risk skoru** (erken uyarı).
- **Takvim senkronu:** Google Calendar / iCal.
- **OCR:** ödev fotoğrafı oku / teslim et.
- **Sesli not / dikte.**
- **Öğretmen pazar yeri:** koçlar uzman öğretmen bulsun (onaylı).
- **Ders kaydı arşivi** (canlı ders gelince video).

### 13.8 Teknik / altyapı fikirleri (ölçekleme bağı)

- `OLCEKLEME_ANALIZI.md` ile bağ: **index, rate limiting, Redis cache, e-posta & background kuyruk** (10k kullanıcı hedefi).
- **Permission-based yetki** (RBAC + ders bazlı izin) genişlet → ileride "rol" değil "yetki seti".
- **Audit log:** kim neyi değiştirdi (güvenlik + şeffaflık).
- **KVKK / GDPR:** veri dışa aktarma + silme.
- **Yedekleme + geri yükleme** (Neon backup zaten var).

### 13.9 Öncelik önerisi (tartışmaya girdi)

- **Kısa vade (canlıya alma):** öğretmen ödev/sınav oluşturma + not, gerçek push, veli haftalık özet, dosya yükleme.
- **Orta vade:** finans/ödeme, CRM yaşam döngüsü, güvenli mesajlaşma, AI rapor.
- **Uzun vade:** öğretmen pazar yeri, AI asistan, canlı ders/video.

### 13.10 Gemini (Antigravity) Fikirleri & Gelecek Vizyonu

DeepSeek'in harika temellerine ek olarak, mentörlük sürecinin kalitesini arşa çıkaracak ve uygulamayı "premium" hissettirecek yenilikçi fikirlerim:

**1. Koç (Yönetici) İçin:**
- **Yapay Zeka Analisti:** Yüzlerce öğrencinin verisini tarayıp koça haftalık içgörü veren sistem. (Örn: *"Ahmet'in matematik netleri 3 haftadır düşüş trendinde ve devamsızlığı arttı. Velisiyle iletişime geçmeniz önerilir."*)
- **Abonelik & Erişim Kesici:** Stripe/Iyzico entegrasyonu. Aylık ödemesi geciken öğrencinin/velinin ekranına kibar bir hatırlatıcı çıkarma veya erişimi (koç inisiyatifiyle) dondurma.
- **Sosyal / Gelişimsel Hedefler:** Sadece matematik/fizik değil; "Günde 30 dk kitap oku", "Diksiyon egzersizi" gibi akademik olmayan rutinlerin takibi.

**2. Öğretmen İçin:**
- **Akıllı Optik / OCR Okuyucu:** Öğretmenin telefon kamerasından öğrencinin deneme optiğini okutup netleri sisteme saniyeler içinde aktarması.
- **Öğretmenler Arası Zümre Panosu:** Aynı öğrenciye giren farklı branş öğretmenlerinin, veli/öğrenci görmeden kendi aralarında paslaşabileceği "Gizli Notlar" köşesi. (Örn: *"Derste dikkati çok çabuk dağılıyor, görsel materyal kullanırsan daha iyi anlıyor"*).
- **Ters Yüz Edilmiş Sınıf (Flipped Classroom) Analitiği:** Dersten önce izlenmesi için atanan bir videoyu öğrenci "gerçekten" izledi mi? Nerelerde duraklattı? Gelişmiş video izleme istatistikleri.

**3. Öğrenci İçin:**
- **Esnek Takvim Algoritması:** Öğrenci "Bugün hastayım, yapamadım" butonuna bastığında, sistem o günün ödevlerini haftanın geri kalan boş günlerine otomatik, dengeli ve zekice dağıtır. Koçun tek tek uğraşmasına gerek kalmaz.
- **Yerleşik Pomodoro & Odak Modu:** Uygulama içinde sayaç. Mola vakitlerinde nefes egzersizi önerisi. İleride Capacitor (Mobil) ile odak modundayken telefondaki diğer bildirimleri susturma özelliği.
- **Anonim Liderlik Tablosu (Rekabet):** İsimler gizli (sadece avatarlar ve nickler) şekilde kurum/program içi haftalık en çok soru çözenler sıralaması. 

**4. Veli İçin:**
- **Tek Tuşla Aksiyon (Push Notification):** Koç, "Öğrencinin X kaynak kitabını alması gerekiyor" diye talep girdiğinde, velinin telefonuna gelen bildirime "Onaylıyorum/Aldım" diyerek tek tıkla dönüş yapması.
- **Pedagojik Rehberlik Köşesi:** Veli panelinde sadece çocuğun notları değil; "Sınav senesindeki ergene nasıl davranılmalı?", "Koçun önerdiği haftalık podcast" gibi veliyi de eğiten kısa içerikler.

**5. Genel UX / UI Dokunuşları:**
- **Dopamin & Kutlama:** Ödevler bittiğinde patlayan konfetiler, hedefe ulaşınca çıkan ses efektleri (Duolingo tarzı premium mikro-animasyonlar).
- **Sesli Komut Asistanı:** Yolda yürüyen koçun telefona "Siri, Mentörüm'de Ayşe'nin dünkü ödevini tamamlandı işaretle" diyebilmesi (Web Speech API ile çok rahat yapılabilir).

### 13.11 Gemini (Antigravity) Fikirleri - Bölüm 2 (Bonus Vizyon)

Beğenmene çok sevindim! Madem hayal gücümüzün sınırlarını zorluyoruz, Mentörüm'ü sadece bir "takip" aracı olmaktan çıkarıp, pazarda rakiplerini ezip geçecek şu özellikleri de ekleyelim:

**1. "Gölge Koç" (Shadow Coach / Stajyer) Modu:**
- Kurumlar büyüdüğünde yanlarına tecrübesiz koçlar/stajyerler alırlar. Gölge Koç modunda, stajyer ödev ataması yapar, notları yazar ama bunlar direkt öğrenciye gitmez, "Taslak" olarak kalır. Baş Koç (Yönetici) sadece tek tıkla "Onayla" diyerek bu işlemleri yayına alır. Muazzam bir kalite kontrol mekanizması!

**2. Hata Defteri & Otomatik Telafi Sınavı:**
- Öğrenciler denemelerde veya ödevlerde yanlış yaptıkları soruları (fotoğrafını çekerek) sisteme yükler ve sistem bunu müfredat konusuyla etiketler. 3 hafta sonra yapay zeka, öğrencinin sadece **geçmişte yanlış yaptığı** konulardan oluşan kişiye özel bir "Telafi Sınavı" üretir.

**3. "Nasıl Hissediyorsun?" (Mental Check-in):**
- Öğrenci sabah uygulamayı ilk açtığında 2 saniyelik bir ekran gelir: "Bugün kendini nasıl hissediyorsun?" (Harika, Yorgun, Stresli emojileri). Koç, öğrencisinin haftalık "Duygu Durumu Grafiğini" görür. Eğer öğrenci 3 gündür "Stresli" işaretliyorsa, koç o hafta ödev yükünü azaltıp motivasyon konuşması yapması gerektiğini anlar. Duygusal bağ kurduran inanılmaz bir özellik.

**4. Sesli Geri Bildirim (Voice Notes):**
- Öğretmen veya koç uzun uzun yazı yazmak yerine, ödevin altına WhatsApp gibi basılı tutup 30 saniyelik sesli not bırakır: *"Tebrikler Aliciğim, harika çözmüşsün ama 4. sorudaki işleme dikkat et."* Öğrencinin koçunun kendi gerçek sesini duyması, kuru bir metinden 100 kat daha etkilidir.

**5. Yıl Sonu "Spotify Wrapped" Özeti (Year-in-Review):**
- Sene sonunda sistem, veli ve öğrenci için otomatik şık bir hikaye animasyonu (video/slideshow) üretir: *"Bu yıl tam 15.000 soru çözdün! 40 denemeye girdin. En çok matematikte zorlandın ama asla pes etmedin!"*. Veliler bu videoyu Instagram'da gururla paylaşır ve bu, senin koçluk sistemin için **bedava viral reklam** olur!

**6. "Kurum/Program" Sosyal Duvarı:**
- Kurumun içine özel, kapalı bir duyuru/motivasyon panosu. Koç buraya "Günün Sözünü", "Haftanın En Çok Soru Çözenlerini" veya "Pazar günkü kampa herkesi bekliyorum" duyurularını hikaye/post gibi atar. Öğrenciler sadece beğeni (kalp) atabilir. Kapalı devre mini bir sosyal ağ.

### 13.12 Cline & DeepSeek — Ek Yaratıcı Vizyon (2. Tur)

> Gemini'nin 13.10/13.11'deki fikirlerini tamamlayan, daha çok **sistemik/metodolojik ve veri-odaklı** bir perspektif:

**1. Mentörlük Döngüsü (metodolojiyi ürünleştir):** Uygulama salt "takip" aracı değil, bir mentörlük YÖNTEMİ olsun: *Hedef → Teşhis → Plan → Uygula → Ölç → Yansıt*. Koç "8 haftalık hedef sprint" başlatır; sistem haftalık kilometre taşlarını ve geri bildirim akışını yapılandırır.

**2. Öğrenme Profili & Kişiselleştirme:** Öğrencinin öğrenme stili, en verimli çalışma saati ve dikkat süresi sistemce ölçülür; ödev/ders zamanlaması buna göre önerilir (örn. "Ayşe akşam daha verimli → matematik ödevlerini akşama öner").

**3. Konu Hakimiyet Haritası (Mastery Map):** Müfredat bir "fetih haritası" gibi görünür; öğrenci konuyu bitirdikçe harita yeşile döner. Her konu için "hakimiyet %" skoru (ödev + sınav + quiz verisinden otomatik).

**4. Sınav Simülasyonu & Deneme Analitiği:** Deneme takvimi, net/yüzdelik dilim takibi, TYT/AYT/LGS gerçek sınav simülasyonu, "hangi konudan kaç net kaybediyorsun" dökümü.

**5. Öğretmen Güçlendirme:** Ders hazırlık asistanı (konu + kaynak + önceki ödev önerisi), takvim **çakışma dedektörü**, ders içi hızlı yoklama/katılım panosu.

**6. Koç Operasyon Merkezi:** Tek ekranda tüm öğrencilerin trafik ışığı (yeşil/sarı/kırmızı) durumu + filtre + toplu aksiyon ("geciken herkese tek mesaj").

**7. Ekosistem & Topluluk:** Şablon pazarı (koçlar başarılı ödev/sınav şablonlarını anonim paylaşır), mezun ağı & başarı hikayeleri (koça bedava pazarlama/güven), öğretmen kalite skoru.

**8. "Bugün Ne Öğrendim" (mikro-günlük):** Öğrenci her ders sonrası 30 saniyede yazar; zamanla hakimiyet haritası beslenir ve koça içgörü verir.

**9. Veri Taşınabilirliği & Çoklu Dil:** Öğrencinin tüm geçmişini (ödev, sınav, not) yeni koça aktarabilme (dışa aktarma); Türkçe + İngilizce (yurt dışı öğrenci/veli).

**10. Gamification — "Konu Fetih":** Konu tamamlandıkça rozet/streak, anonim "haftanın fatihi" (rekabet, isim gizli).

### 13.13 Sonnet (Antigravity) Fikirleri — Bölüm 3 (Sistem & İş Modeli Vizyonu)

> Önceki fikirlerimden (13.10, 13.11) farklı olarak bu turda daha çok **iş modeli sürdürülebilirliği**, **güven ekonomisi** ve **sektörde rakipsiz** kılacak özelliklere odaklandım:

**1. Koç Onboarding Sihirbazı ("İlk 10 Dakika" Deneyimi):**
Rakip uygulamaların en büyük sorunu: koç kaydoluyor, boş ekranla karşılaşıyor ve terk ediyor. Biz buna önlem alalım. Kayıt sonrası bir sihirbaz (wizard) koçu şu adımlardan geçirsin: Program adı → İlk öğrenciyi ekle → İlk dersini seç → İlk ödevini ata. Süre: 3 dakika. Sonuçta koç "Evet, bu işe yarıyor" der ve sistemde kalır. **Aktivasyon oranı = en kritik büyüme metriği.**

**2. "Koç Klonu" — Şablon Paketi Paylaşımı:**
Başarılı bir koç, 1 yılda oluşturduğu tüm ödev şablonlarını, haftalık program yapısını ve ders planını tek tıkla "Koç Paketi" olarak dışa aktarır. Yeni bir koç bu paketi sisteme import ederek **sıfırdan başlamak yerine ustanın sırtında yükselir**. Bu özellik Mentörüm'ü bir eğitim konseptleri ekosistemi yapar; rakiplerde yok.

**3. Çevrimdışı-Önce (Offline-First) Gerçek Mimari:**
Şu an PWA ekliyoruz ama "gerçek" offline-first olmak başka şey. Öğrenci metroda internetsiz "Tamamladım" bastığında bu eylem lokalde saklanır, bağlantı gelince sessizce sync olur. Türkiye'de metro/taşra internet kalitesi düşünülünce bu, öğrenci deneyimini kökten iyileştirir.

**4. Veli Şeffaflık Endeksi:**
Veliler çocuklarının gerçekten çalışıp çalışmadığını bilemez. Biz şunu sunabiliriz: Uygulamada geçirilen aktif süre (sadece açık değil, gerçekten etkileşimde olan süre), günlük hedef tamamlama %. Veliye haftalık "Bu hafta Ahmet platforma 4 saat girdi, 12/15 görevi tamamladı" özeti. **Velinin para vermeye devam etmesinin 1 numaralı sebebi** bu şeffaflıktır.

**5. Koç Referans Sistemi (B2B Büyüme):**
Bir koç arkadaşını Mentörüm'e davet ettiğinde, her iki koç da 1 aylık ücretsiz premium alır. Ama daha önemlisi: davet eden koç, gelen koça "mentor" sıfatıyla eşleşir; ilk 3 ay onboarding'ini destekler. Bu hem viral büyümeyi hem de içeriden topluluk oluşturmayı aynı anda çözer.

**6. "Sınav Günü" Modu:**
LGS veya TYT tarihi geldiğinde uygulama otomatik olarak değişir: Karşılama ekranı motive edici mesaj verir, o gün ödev/soru bildirimi gelmez, akşam "Nasıl geçti?" kısa anket çıkar. Öğrenci "Çok zordu" derse sistem koça bildirim atar. Bu küçük ama **duygusal bağı çok güçlendiren** bir dokunuş.

**7. Koçun Kendi Markası — "White-label Light":**
Ücretli pakette koç kendi logosunu, renk şemasını ve kurum adını sisteme yükler. Öğrenci uygulamayı açtığında "Ahmet Hoca Koçluk Sistemi" görür, Mentörüm alt yazıda küçük kalır. Koç kendi marka değerini inşa eder; bırakamaz çünkü tüm öğrencileri ve geçmişi burada.

**8. Sınav Takvimi Entegrasyonu (Otomatik):**
YKS, LGS, ALES takvimlerini sistem otomatik çeker (ya da yıllık günceller). Öğrencinin hedef sınavına kaç gün kaldığı her ekranda küçük bir "Geri Sayaç" olarak durur. Koç da "X'e 90 gün kaldı, tempoyu artırma vakti" diye otomatik uyarı alır.

**9. Koç Paneli Mobil UX — "1 El ile Kullanım":**
Koçlar öğrencilerle genelde yüz yüzeyken tabletlerini bir ellerinde tutar. Tüm kritik aksiyonlar (ödev gör, tamamlandı işaretle, not ekle) **tek el, başparmak erişim alanında** tasarlanmalı. Material Design'ın FAB (Floating Action Button) mantığını biz koçluk bağlamına uyarlayalım: her ekranda o sayfanın en sık yapılan işlemi büyük, ulaşılabilir yerde olsun.

**10. Yapay Zeka "Koç Asistanı" (Uzun Vade — ama şimdiden mimari hazırlık):**
Koç bir öğrencinin profilini açtığında yapay zeka yan panel olarak şunu der: *"Ahmet'in son 3 sınavında geometri netleri düştü. Öneri: bu hafta geometri odaklı 2 ödev ekle ve 'alan/hacim' konusunu tekrarla."* Bunu ChatGPT API + kendi verimiz ile kolayca yapabiliriz. Mimari hazırlık = ödev/sınav verilerini AI'a beslenebilecek temiz bir formatta saklamak (şimdiden yapılabilir, AI bağlantısı sonraya kalır).

