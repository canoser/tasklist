# 📘 Mentörüm — Kullanım Kılavuzu

> **Tarih:** 17 Ekim 2026 · **Kapsam:** Tüm roller (Koç, Öğretmen, Öğrenci, Veli) + Yönetici.
> Bu kılavuz, uygulamanın bugüne kadar eklenen **tüm** özelliklerini, ekranda nelerin yapılabileceğini ve özellikle takvimde nelerin görüntülenip yapılabileceğini anlatır. Sondaki **Yönetici / Güvenlik** bölümü yalnızca süper yöneticiyi ilgilendirir.

---

## 1. Genel — Herkes İçin

### 1.1 Giriş ve Kayıt
- **Giriş:** E-posta + şifre veya **Google ile giriş** yapılır.
- **Kim kendi kendine kayıt olabilir?** Giriş sayfasındaki "Kayıt Ol" yalnızca **Koç** hesabı oluşturur (rol her zaman "Koç" olur). Yeni koç, süper yönetici onaylayana kadar giriş yapamaz (onay bekler).
- **Öğretmen, Öğrenci ve Veli kendi kendine kayıt OLAMAZ.** Bu üç rol yalnızca **davetle** gelir:
  - Koç, öğretmen/öğrenci/veli için davet gönderir (davette rol ve bağlı program/öğrenci bellidir).
  - Davetli, e-postadaki **davet linkine** tıklayıp şifresini belirleyerek hesabını tamamlar; hesabı doğru rolle açılır ve **hemen** kullanılabilir (davet zaten yetki sayıldığı için ayrıca onay gerekmez).
- **Google ile giriş:** E-posta için geçerli davet varsa o rolle, yoksa "Koç" olarak (onay bekleyerek) açılır.
- **Neden böyle? (Güvenlik)** Öğrenci/veli/öğretmen rolü, hangi programa/öğrenciye bağlı olduğunu içerir. Bu bağlantıyı yalnızca koç belirleyebilir; aksi hâlde herkes kendine rol/bağlantı seçip başkasının verisine erişmeye çalışabilir (IDOR / rol yükseltme riski).
- **Çıkış:** Sağ üstteki çıkış düğmesi.

### 1.2 Şifremi Unuttum / Şifre Sıfırlama
- Giriş ekranında **"Şifremi unuttum"** → e-posta girilir.
- E-postaya gelen **sıfırlama bağlantısına** tıklanır → yeni şifre belirlenir → giriş yapılır.
- (Güvenlik: bağlantı 1 saat geçerli; aynı e-postaya 5 dakikada en fazla 1 sıfırlama gönderilir.)

### 1.3 Bildirimler
- Sağ üstteki **çan ikonu** bildirimleri listeler (ödev atandı, onaylandı, ödeme bildirimi vb.).
- Bildirime tıklayınca ilgili sayfaya yönlendirir.

### 1.4 Tema ve Kurulum
- **Tema seçici** ile görünüm değiştirilir (Koyu/Açık/Doğa/Siber vb.).
- **"Uygulamayı Kur"** düğmesiyle uygulama cihaza PWA olarak eklenir (mobil hissiyat).

---

## 2. Koç (Koçluk Yöneticisi)

Koç, programların sahibidir; öğrenci, öğretmen, veli, ders, ödev, sınav, ödeme ve takvimi yönetir.

### 2.1 Dashboard
- Genel özet: öğrenci sayısı, bekleyen ödevler, geciken ödemeler, yaklaşan işler.
- **Finans özeti:** geciken ödeme/bakiye rozetleri.

### 2.2 Takvim (360° Görünüm)
Koç takviminde **her şey** görünür ve filtrelenebilir:
- Etkinlik türleri: **Koçluk seansı, ders, sınav, ödev teslimi, ödeme günü**.
- **Filtre çubuğu** (çip/dropdown): programa, öğrenciye, derse, öğretmene ve etkinlik türüne göre daraltma.
- Boş bir güne tıklayıp **kişisel etkinlik** oluşturma (koçluk seansı, veli görüşmesi, kişisel blok).
- Tarih aralığı en fazla 62 gün çekilir (performans koruması).

### 2.3 Öğrenciler ve Öğrenci Detayı
- Öğrenci listesi; karta tıklayınca detay açılır. Detayda:
  - **Ödev atama** (seviye→ders→konu veya serbest; son teslim tarihi).
  - **Sınav sonucu/not** girme.
  - **Koç notları** (yalnızca koç görür).
  - **Öğretmen notları** sekmesi: öğretmenlerin öğrenci hakkında yazdığı pedagojik notları görme.
  - **Koçluk görüşmesi (seans)** oluşturma; not + aksiyon maddeleri.
  - **Veli davet et** (WhatsApp/link/kod paylaşımı).
  - **Veli raporu (PDF)** indirme.
  - **Veli yetkileri paneli:** her veli için ayrı ayrı — sınav, ödev, takvim, çalışma istatistiği, ödeme görünürlüğünü aç/kapat.
  - **Haftalık zaman bütçesi:** "Ders vs Ders Dışı" grafiği.

### 2.4 Programlar
- Program oluştur / düzenle / sil.
- Bir programın içinde alt sayfalar:
  - **Öğretmenler:** listele, detay, öğretmen **pasife alma** (görev sonlandırma — öğretmen yalnızca o programdan düşer, geçmiş verileri korunur).
  - **Dersler:** oluştur (renk seçimi + "Gelişmiş İzinler" akordeonu), ders detayında **öğrenci/grup ekle** (arama destekli çoklu seçim), **kaynak (video/doküman)** ekle.
  - **Gruplar:** oluştur, üye ekle/çıkar.
  - **Haftalık Program:** sürükle-bırak ders yerleştirme.
  - **Ayarlar:** yardımcı koç davet/çıkar, yöneticiliği devret.

### 2.5 Onay Merkezi
- Öğrenci "tamamladım", öğretmen "takvim değişikliği", veli "ödeme yaptım" talepleri burada listelenir.
- **Onayla / Reddet** (tek tık) ve **"Tümünü Onayla"** + durum filtresi.

### 2.6 Ödeme / Finans Motoru
- **Ödeme planı** oluştur: 4 periyot türü (28 günlük, aylık sabit gün, ders başına, seans başına).
- **Tahsilat** girme: tam veya **kısmi ödeme**; kalan bakiye sonraki kaleme devreder (rollover).
- Ders/seans iptal edilirse ilgili ödeme kalemi otomatik iptal edilir/kayar.
- Veli "ödeme yaptım" bildirince onay merkezine düşer; koç onaylayınca tahsilat kaydedilir.

### 2.7 "Rol Gözüyle Gör" (View As)
- Süper Yönetici (Admin), **"Veli gözüyle gör"** veya **"Öğretmen gözüyle gör"** modunu açıp o kişinin ekranını **salt-okunur** önizler.
- Güvenlik: bu modda hiçbir yazma işlemi yapılamaz.

---

## 3. Öğretmen

Öğretmen kendi derslerini, öğrencilerini, ödev/sınavlarını ve programını yönetir.

### 3.1 Derslerim
- Ders listesi; derse tıklayınca sekmeler açılır:
  - **Öğrenciler:** derse bağlı öğrenciler.
  - **Ödevler:** ders ödevi oluştur, "Onayla / Geri Bildir" ile öğrenci ödevini tamamlandı işaretle.
  - **Sınavlar:** ders sınavı/notu gir.
  - **Kaynaklar:** derse tanımlı kitap/video/dokümanları gör.
  - **Ders Notları:** her öğrenci için pedagojik not ekle/geçmişi gör. Not iki tiptir: **öğrenciye görünür özet** ve **yalnızca koça özel tam not**.
- **"Dersi Tamamla"** aksiyonu: ders bitince özet + koça özel not girişi.

### 3.2 Program (Takvim)
- Öğretmen kendi ders programını görür.
- **Meşguliyet maskelemesi:** yetkisi olmadığı öğrenci/ders saatlerini **içerik olmadan** gri "Öğrenci Meşgul" bloğu olarak görür (başka öğretmenin adı/verisi görünmez).

### 3.3 Profil
- Kendi bilgileri.

---

## 4. Öğrenci

Öğrenci; ödevlerini, derslerini, programını, takvimini ve çalışma istatistiklerini takip eder.

### 4.1 Ana Sayfa
- Özet kartları: bekleyen ödev, tamamlama oranı, **son deneme neti**, tamamlanan konu.
- **Yaklaşan ödevler** listesi.
- **Görüşme hazırlığı:** yaklaşan koçluk görüşmesi için öz-değerlendirme notu kaydetme.
- **Çalışma Kronometresi:** canlı Pomodoro/sayaç veya manuel "45 dk" girişi → çalışma oturumu kaydedilir.
- **Quick-Log:** konu/video kartının altındaki mini kutudan "kaç soru, kaç dakika" tek tıkla kaydetme.

### 4.2 Programım
- Haftalık ders programı.

### 4.3 Derslerim
- Ders listesi; ders kaynaklarını (video/doküman) görür ve **ilerleme** işaretler (izlendi/tamamlandı).

### 4.4 Ödevler
- Ödev listesi; ödevi **"tamamlandı"** olarak işaretleme (yüzde bazlı).

### 4.5 Takvim
- Aylık/haftalık takvimde **ödevler, sınavlar, program ve koçluk seansları** renk kodlarıyla görünür.
- **Kişisel etkinlik** ekleme (uyku, spor, sosyal, okul, dinlenme gibi kategoriler).
- Video "izlendi/tamamlandı" işaretleri.

### 4.6 Profil
- Kimlik bilgileri ve veliler.
- **Sınav Sonuçları** sekmesi: geçmiş denemeler ve netler.
- **Konu Takibi** sekmesi: tamamlanan/toplam konu.
- **Hedef:** hedef üniversite + bölüm + net girme/kaydetme.

---

## 5. Veli

Veli, yalnızca kendi çocuğunun/çocuklarının verisini, koçun izin verdiği ölçüde görür.

### 5.1 Özet
- Haftalık özet: bekleyen ödev, tamamlama oranı, son tamamlananlar.
- **Sınav Sonuçları** kartından sınavlara geçiş.

### 5.2 Ödev Takibi
- Çocuğun ödevlerini ve teslim durumlarını görür (salt-okunur).

### 5.3 Takvim
- Çocuğun ödev/sınav/program akışı.

### 5.4 Program
- Çocuğun haftalık ders programı.

### 5.5 Sınavlar
- Çocuğun sınav sonuçları (alt menüden doğrudan erişim).

### 5.6 Ödeme
- Ödeme planı ve tahsilat durumu **canlı** görünür (salt-okunur).
- **"Ödeme Yaptım"** butonuyla ödeme bildirimi gönderilir → koçun onay merkezine düşer.

### 5.7 Çok Çocuk ve Yetki
- Birden fazla çocuk varsa üstte **çocuk seçici** ile geçiş yapılır.
- Sekmeler, koçun o veliye verdiği izinlere göre **dinamik** görünür; izin verilmemiş alanda "Koçunuz henüz bu alanı erişime açmadı" bilgisi gösterilir.
- Anne/baba ayrı hesaplarsa birbirlerinin iletişim bilgilerini görmez (gizlilik).

---

## 6. Takvim Özeti — Kim Ne Görür, Ne Yapar

| Rol | Görür | Yapar |
|---|---|---|
| **Koç** | Her şey: seans, ders, sınav, ödev teslimi, ödeme günü; çoklu filtre | Kişisel etkinlik (seans/veli görüşmesi/blok) ekler |
| **Öğretmen** | Kendi dersleri + diğer saatler gri "Meşgul" (içeriksiz) | Ders tamamlama; başka veriyi göremez |
| **Öğrenci** | Kendi ödev/sınav/ders/seansları + kişisel etkinlikleri | Kişisel etkinlik (uyku/spor/sosyal/okul/dinlenme) ekler; video tamamlanma işaretler |
| **Veli** | Çocuğunun ödev/sınav/program akışı (izinli olduğu kadar) | Yalnızca görüntüler; düzenleme yapamaz |

**Ortak:** Takvim tarih aralığı en fazla 62 gün; etkinlikler renk kodlu (ödev=sarı, sınav=kırmızı, ders=mavi vb. — tema token'larıyla uyumlu).

---

## 7. Yönetici (Süper Yönetici) — Yalnızca Yöneticiyi İlgilendirir

> Bu bölüm yalnızca **Admin** rolündeki kullanıcıya görünür ve uygulamanın güvenlik/kota denetimini kapsar.

### 7.1 Kullanıcı Yönetimi
- **Onay Bekleyenler:** Koç kayıtlarını onayla/reddet; onaylarken rol (Koç) ve program limiti belirle.
- **Tüm Kullanıcılar:** listele, role göre filtrele, ada/e-postaya göre ara; **şifre değiştir** (eski oturumları kapatır); manuel kullanıcı ekle.
- **Müfredat:** JSON şablonu indir / doldurulmuş müfredatı içe aktar.

### 7.2 Güvenlik & Kota Denetimi
- **Hız Limiti Kuralları:** her endpoint için 5 dakikada izin verilen azami istek sayısı görünür. Admin değeri düzenleyip **"Güncelle"** ile değiştirir (30 saniye içinde geçerli olur, yeniden başlatma gerekmez).
  - Varsayılanlar: giriş/kayıt/google = 40/5 dk · davet = 20/5 dk.
- **Son Kota İhlalleri (429):** hangi IP'nin hangi uçta limiti aştığı, deneme sayısı ve zamanı listelenir.

### 7.3 Güvenlik Protokolleri (Özet)
- **Veri izolasyonu (IDOR):** Her istek, kullanıcının yalnızca kendi programı/öğrencisi/dersi/çocuğu üzerindeki yetkisini doğrular. Koç başka programın, öğretmen başka dersin, veli başka çocuğun verisini **göremez**.
- **Rol Gözüyle Gör (View As):** Yalnızca süper yönetici (Admin) kullanabilir; salt-okunurdur (yazma işlemleri engellenir).
- **Finans izolasyonu:** Ödeme/bakiye verisi yalnızca koç + izin verilmiş veli; öğretmen ve öğrenci finans uçlarına erişemez.
- **Öğretmen notu gizliliği:** Koça özel not (`COACH_ONLY`) öğrenci/veliye asla gösterilmez; yalnızca özet görünür.
- **Hız sınırlama:** Giriş/kayıt/davet uçları IP bazlı sınırlıdır; aşım 429 ile reddedilir ve günlüğe yazılır (e-posta kotası kötüye kullanımı engellenir).
- **Şifre sıfırlama güvenliği:** Token 1 saat geçerli, tek kullanımlık; aynı e-postaya 5 dk'da 1 sıfırlama.
- **Veri kalıcılığı:** Hiçbir kayıt gerçekten silinmez; pasife alma (`is_active=0` / `CANCELLED`) kullanılır (denetim izi korunur).



---

## V13 — Öğrenci Ekleme Esnekliği & Bireysel/Grup Geçişi

### Öğrenci Ekleme (Gölge Profil)
- Koç, **Öğrenciler** sayfasında **"+ Hızlı Ekle"** ile öğrenciyi **e-posta olmadan** ekleyebilir (Gölge Profil).
- **Ad** ve **Soyad** zorunludur; **Sınıf** ve **Hedef Sınav** opsiyoneldir.
- E-posta girilirse öğrenciye otomatik davet oluşturulur; davet linkiyle şifre belirleyip girer.
- E-posta boş bırakılırsa öğrenci **"E-posta Yok / Kayıt Bekliyor"** durumunda görünür; sonradan karttaki **"Davet Et"** butonuyla davet gönderilebilir.

### Öğrenci Kartı Rozetleri
- **E-posta Yok (kırmızı):** Gölge profil, henüz davet edilmemiş.
- **Grup adı (mavi):** Öğrencinin bağlı olduğu aktif grup.
- **Bireysel (mor):** Öğrencinin aktif birebir (ÖZEL DERS) kaydı var.

### Bireysel ↔ Grup Geçişi
- Öğrenci detay sayfasında **"Grup / Bireysel Yönetimi"** kartı:
  - **Gruba Taşı:** Bir grup seçilir; öğrenci gruba eklenir, bireysel ders kayıtları pasife alınır.
  - **Bireysele Çek:** Öğrenci tüm gruplardan çıkarılır; kendisine özel **"Bireysel Koçluk"** dersi açılır.
- Geçmiş ödev/sınav verileri **silinmez**; detay sayfasında **"Güncel Bireysel Ödevler"** ve **"Geçmiş Grup Ödevleri"** sayıları görünür.

