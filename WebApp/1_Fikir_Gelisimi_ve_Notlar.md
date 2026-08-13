# Yeni Nesil Planlama Uygulaması - Beyin Fırtınası ve Fikir Gelişimi

Bu dosya, proje geliştirme sürecinde ortaya çıkan fikirlerin, tartışmaların ve taslak mimarilerin kaydedildiği serbest bir not alanıdır. Netleşen kurallar `2_Netlesmis_Isterler.md` dosyasına aktarılacaktır.

## 🌟 Proje Vizyonu ve Ana Hedef (Executive Summary)

**Çıkış Noktası:** Halihazırda yerel veritabanı (SQLite) kullanan, tek kullanıcılı bir C# WPF (Masaüstü) Planlama/Görev Yönetimi uygulaması mevcuttur.
**Ulaşılmak İstenen Hedef:** Bu yerel masaüstü uygulamasını, günümüzün modern "SaaS (Software as a Service)" standartlarına taşıyarak; **Web, Masaüstü (.exe) ve Mobil (iOS/Android)** platformlarının tamamında kusursuz çalışan çok kullanıcılı devasa bir ekosisteme dönüştürmek.

**Temel İsterler (Gereksinimler):**
1. **Tek Merkezden İçerik (Single Source of Truth):** Farklı platformlar için (Web, PC, Mobil) ayrı ayrı arayüz kodlanmayacak. Tek bir modern web arayüzü yazılacak ve bu arayüz tüm cihazlarda native (yerel) uygulama gibi çalışacak.
2. **Kusursuz Senkronizasyon:** Kullanıcı "Google ile Giriş Yap" butonuna tıkladığında, ister PC'denki `.exe` uygulamasında olsun, ister cebindeki mobil uygulamada olsun, saniyeler içinde kendi verilerine ulaşacak ve tüm cihazları senkronize çalışacak.
3. **Modüler & Güvenli Arka Plan:** Kurumsal şirket standartlarında, özellik eklendiğinde çökmeyen, her kullanıcının verisinin (Multi-Tenant) kesin ve net çizgilerle birbirinden izole edildiği, yüksek güvenlikli bir Backend (API) mimarisi kurulacak.

Bu belge, bu büyük vizyonu en az riskle, en yüksek performansla ve en az hatayla hayata geçirmek için yapılan teknoloji seçimlerinin arka planını açıklar.
## Tarih: 24 Temmuz 2026
**Konu:** Kurumsal Standartlarda Backend Mimarisi, Modülerlik ve Güvenlik

### 1. Modüler ve Kurumsal Mimari Fikirleri (Backend)
- **Mimari Yaklaşım:** Özellik ekleyip çıkardığımızda kodun diğer kısımlarının kırılmaması için "Clean Architecture" (Temiz Mimari) veya "Vertical Slice Architecture" (Dikey Kesit Mimarisi) kullanmalıyız. Büyük şirketler genelde bağımlılıkları dışarıdan içeriye doğru (Dependency Inversion) kurgular.
- **Modülerlik (Özellik Bazlı):** Her modül (örneğin "Görevler", "Kullanıcılar", "Raporlar") kendi içinde bağımsız olmalı. Biri bozulduğunda diğeri çalışmaya devam edebilmeli.
- **Interface Kullanımı:** Veritabanı ve dış servis bağlantıları kesinlikle Interface'ler (Arayüzler) üzerinden yapılmalı. Böylece yarın SQLite'tan PostgreSQL'e geçersek sadece tek bir sınıfı değiştirmemiz yeterli olacak.

### 2. Çoklu Kullanıcı (Multi-Tenant) Hazırlığı ve Veri İzolasyonu
- Sistem artık sadece tek bir lokal kullanıcının bilgisayarında çalışmayacak. Web'de binlerce kullanıcısı olabilir.
- **Tartışma Konusu (Kullanıcı İzolasyonu):** Kullanıcı verilerini ayırmak için 3 farklı mimari yaklaşım vardır:
  1. **Seviye (En Yüksek Güvenlik - Ayrı Veritabanı/Tablo):** Her kullanıcının veritabanı dosyası (veya tabloları) ayrı olur. 
     - *Avantajı:* %100 güvenlik. Bir yazılım hatasında bile Ahmet'in verisi Ayşe'ye asla gitmez. 
     - *Dezavantajı:* Kullanıcı sayısı 10.000'e çıkarsa sistemi güncellemek (örneğin Görevler tablosuna yeni bir kolon eklemek) kabusa döner. Her tabloyu tek tek güncellemek gerekir. *(Not: Eğer SQLite kullanılacaksa, her kullanıcıya ayrı bir `.db` dosyası açmak mantıklı bir Enterprise çözümüdür).*
  2. **Seviye (En Yaygın - Tek Tablo, TenantId Kolonu):** Tüm kullanıcıların verileri aynı `Tasks` tablosunda durur ancak her satırda `UserId` yazar.
     - *Avantajı:* Bakımı çok kolaydır. Milyonlarca kullanıcıyı aynı yapıda rahatça tutar. (Google, Facebook bu mantığı kullanır).
     - *Dezavantajı:* Mantıksal izolasyon olduğu için kodda filtreleme (WHERE UserId=?) unutulursa veri sızabilir.
- **Güvenlik Katmanı Çözümü (Eğer 2. Seviye seçilirse):** API'de "Global Query Filters" yazılarak geliştiricinin filtrelemeyi unutma ihtimali ortadan kaldırılır. Sistem SQL sorgularına her zaman otomatik olarak `WHERE UserId = KullanıcınınIdsi` şartını ekler.

### 3. Ekstra Güvenlik Katmanları (Enterprise Security)
- **Kimlik Doğrulama:** Google ile giriş yapıldıktan sonra oluşturulan JWT (JSON Web Token) token'ları çok kısa ömürlü olmalı (örneğin 15 dakika) ve bir "Refresh Token" mekanizması kurulmalı.
- **Rate Limiting:** Kötü niyetli kişilerin veya botların sistemi çökertmemesi için (DDoS koruması), bir IP'nin saniyede atabileceği istek sayısına sınır koymalıyız.
- **Audit Logging (Denetim İzleri):** "Hangi kullanıcı, hangi saatte, hangi görevi sildi veya değiştirdi?" Bu veriler ayrı bir log tablosunda (veya Serilog ile dosyada) tutulmalı.
- **CORS Politikaları:** API'ye sadece bizim belirlediğimiz web arayüzü adreslerinden (örn: app.planlama.com) veya kendi mobil uygulamamızdan istek gelebilsin.

---

### 4. Teknoloji Alternatifleri ve Risk Analizi (Beyin Fırtınası Özeti)

Projenin altyapısı ve arayüzü için masaya yatırılan ve avantaj/dezavantajlarıyla tartışılan teknoloji alternatifleri şunlardır:

#### A) Frontend & Sarmalayıcı (Wrapper) Alternatifleri
**1. YOL A: Modern Web Mimarisi (React/Next.js + Tauri + Capacitor)** *(Seçilen Yol)*
- **Nasıl Çalışır:** Tek bir React web projesi yazılır. Tauri bu projeyi PC için inanılmaz hafif bir `.exe`'ye, Capacitor ise mobil (iOS/Android) uygulamaya dönüştürür.
- **Yapay Zeka ile Kodlama Açısından Risk:** DÜŞÜK. React, internette en çok kaynağı olan ve yapay zekanın sıfıra yakın hatayla kodladığı sektör standardıdır. TypeScript kullanılarak veri hataları tamamen önlenebilir.
- **Performans:** Yüksek. Özellikle Tauri, arka planda Rust kullandığı için PC'de RAM tüketimi minimumdur.

**2. YOL B: Microsoft Ekosistemi (.NET MAUI Blazor Hybrid)** *(Elenen Yol)*
- **Nasıl Çalışır:** Arayüz tamamen C# ve Blazor (HTML) ile yazılır. MAUI bu projeyi hem Windows `.exe`'ye hem de mobil uygulamalara çevirir.
- **Yapay Zeka ile Kodlama Açısından Risk:** YÜKSEK. MAUI nispeten yeni bir teknolojidir. Yapay zeka modelleri eski Xamarin kodlarıyla MAUI kodlarını birbirine karıştırabilir ve hataların çözümü uzun sürebilir.
- **Dezavantaj:** Web tarafında (Blazor WebAssembly) tarayıcıya çok fazla yük bindirebilir. 

#### B) Veritabanı Alternatifleri
**1. SQLite (Mevcut Durum):**
- *Artısı:* Dosya tabanlıdır, kurulum gerektirmez. Dapper ile mükemmel çalışır. Projenin başlangıç aşaması için çok hızlı yol aldırır. 1. Seviye izolasyon seçilirse, her kullanıcı için ayrı bir `kullanici.db` açarak efsanevi bir güvenlik sunar.
- *Eksisi:* Çok yüksek eşzamanlı (concurrent) yazma işlemlerinde (aynı saniyede binlerce kişi veri eklerse) kilitlenmeler yaşayabilir.

**2. PostgreSQL (Kurumsal Alternatif):**
- *Artısı:* Milyonlarca satırlık veriyi ve binlerce anlık kullanıcıyı rahatlıkla kaldırır. Veri tipleri ve JSON özellikleri çok zengindir.
- *Karar (Beyin Fırtınası Sonucu):* Kodlar Clean Architecture mantığıyla Dapper Interface'leri üzerinden yazılacağı için, **başlangıçta SQLite ile başlanıp** ihtiyaç anında kodun hiçbir yerine dokunmadan sadece bir satır (Connection String) değiştirilerek PostgreSQL'e geçiş yapılabilecek bir yapı kurulmalıdır.

#### C) Kimlik Doğrulama (SSO) Alternatifleri
- **Firebase Auth:** Google, Apple, Facebook girişlerini tek tıkla entegre eder. React, Tauri ve Capacitor ile muazzam bir uyumla çalışır. API'ye sadece JWT göndererek doğrulamayı bitirir. Sunucu yormaz. *(En iyi aday)*
  - *Fikir Gelişimi (Mail/Şifre):* Sadece Google ile giriş yapmak, Google kullanmayanları dışlayabilir. Firebase zaten standart E-posta ve Şifre ile kayıt/giriş özelliklerini ücretsiz ve hazır sunmaktadır. Sisteme hem Google hem de Mail/Şifre entegre edilmesi kurumsal bir yaklaşım olacaktır.
- **ASP.NET Core Identity:** Tüm şifreler, kullanıcılar bizim kendi veritabanımızda tutulur. Kontrol tamamen bizdedir. Ancak Google girişleri entegre etmek Firebase kadar zahmetsiz değildir. Web, Masaüstü ve Mobil arası giriş durumunu senkronize tutmak (token yönetimi) epey kod kalabalığı yaratır.

---
### 5. Dışarıdan Gelen (Başka Bir AI) Mimari Revizyon Önerileri ve Değerlendirmesi
Farklı bir AI ajanı tarafından sağlanan kurumsal seviye revizyon önerileri masaya yatırıldı. Bu önerilerin ortak noktası: **Kodu bir yapay zekanın (ajanın) yazacağını bilerek, sistemin "Aptal Korumalı" (Foolproof / AI-Proof) hale getirilmesidir.**

**1. Dapper yerine EF Core 9.0 Kullanımı (Global Query Filter için)**
- *Öneri:* Dapper'da "Global Query Filter" manuel SQL string birleştirmesi ile yapılır. EF Core'da ise `DbContext` seviyesinde `.HasQueryFilter()` ile tanımlanır.
- *Değerlendirmem:* **Kusursuz bir tespit. Yüzde yüz katılıyorum.** Daha önce Dapper'ı projenizde zaten var olduğu için hızlı başlangıç adına seçmiştik. Ancak işin içine otonom ajanlar ve Multi-Tenant (veri izolasyonu) girince, ajanın SQL stringine `WHERE` yazmayı unutma ihtimali bir felakettir. EF Core bu ihtimali sıfırlar. Kesinlikle bu kuralı benimsemeliyiz.

**2. Vanilla CSS yerine Tailwind CSS (veya CSS Modules) Kullanımı**
- *Öneri:* Global Vanilla CSS, ajanın bir bileşeni düzeltirken uygulamanın başka bir yerini (yan etki ile) bozmasına neden olur. Stiller bileşene hapsedilmelidir (Tailwind veya CSS Modules).
- *Değerlendirmem:* **Kesinlikle doğru.** Normalde tamamen size özel ve benzersiz bir tasarım yaratmak için Saf CSS önermiştim, ancak kodu yapay zeka ile sürdürecekseniz Saf CSS bir süre sonra "Spagetti Kod"a dönüşebilir. Tailwind CSS yapay zekanın en sevdiği ve asla yan etki bırakmadığı dildir. Çok mantıklı bir karar.

**3. Otonom Ajanlar İçin Statik Kural Dosyası (.cursorrules / AGENTS.md)**
- *Öneri:* Ajanın mimari sınırlarını belirleyen bir kural dosyası oluşturulması.
- *Değerlendirmem:* Biz halihazırda projenizin ana dizininde bir `AGENTS.md` (Kurallar) dosyası kullanıyoruz (sizin önceden belirlediğiniz kurallar). Projeyi oluşturduğumuzda bu dosyayı Vertical Slice ve Multi-Tenant kurallarıyla güncelleyerek bu şartı harika bir şekilde yerine getirmiş olacağız. Çok yerinde bir hatırlatma.

**4. API Güvenliği: Idempotency Key (Eşetkisellik)**
- *Öneri:* Kritik kayıt/güncelleme işlemlerinde çift tıklama veya ağ kesintisi yüzünden aynı verinin 2 kez kaydedilmesini engellemek için Idempotency-Key kullanılması.
- *Değerlendirmem:* Çok kurumsal bir "Best Practice" (Sektör Standardı). Stripe ve GitHub API'leri bu mantıkla çalışır. Uygulamamızda kullanıcının "Görev Ekle" butonuna art arda iki kez tıklayıp aynı görevi iki kere oluşturmasını sunucu tarafında kesin olarak engellemek için muazzam bir dokunuş. Planlamaya dahil edilmesi harika olur.

---
### 6. Şeytanın Avukatlığı: Bu Yaklaşımları Neden Reddedebiliriz? (Karşı Eleştiri)
Her ne kadar bu 4 kural kurumsal açıdan çok sağlam görünse de, "aşırı mühendislik (over-engineering)" tuzağına düşmemek için bu fikirlerin zayıf ve tehlikeli yanlarını da bilmeliyiz:

**1. EF Core Eleştirisi (Performans ve Hantallık):**
- EF Core, Dapper'a göre çok daha ağır, hantal ve yavaş bir ORM'dir. Arka planda yazdığı SQL sorguları bazen felaket derecede verimsiz olabilir (N+1 problemi).
- "Ajan filtreyi unutmaz" dedik ama ajan karmaşık bir sorgu yazarken veya Admin paneli kodlarken yanlışlıkla `.IgnoreQueryFilters()` komutunu çağırırsa (ki LLM'ler bunu çok yapar), o kurduğumuz kusursuz güvenlik duvarı tek satırla yıkılır.
- *Sonuç:* Mevcut kodlar halihazırda Dapper ile yazılı. Bunları EF Core'a çevirmek zaman kaybı yaratabilir ve uygulamanın saf hızını öldürebilir.

**2. Tailwind CSS Eleştirisi (HTML Çöplüğü ve Sıradanlık):**
- Tailwind, HTML etiketlerinin içini devasa sınıf (class) isimleriyle doldurur (`<div class="flex items-center justify-between p-4 bg-red-500 hover:bg-red-600 rounded-lg shadow-md...">`). Bu HTML çöplüğü içinde yapay zekanın veya insanın kodu okuması/anlaması çok zorlaşır.
- Eğer gerçekten "Premium / Wow" bir tasarım istiyorsak, Tailwind bizi kendi standart kalıplarına zorlar. Tasarımımız "sıradan bir Tailwind şablonuna" benzeyebilir.
- *Alternatif:* Tailwind yerine **CSS Modules** kullanırsak hem Vanilla CSS'in o sonsuz özgürlüğünü kullanırız, hem de sınıflar sadece o bileşene özel (scoped) olacağı için yapay zekanın yan etki (side-effect) yaratma riskini yok ederiz.

**3. Kural Dosyası (.cursorrules) Eleştirisi (Körlük Riski):**
- Otonom ajanlara çok fazla statik kural vermek tehlikelidir. Kural dosyası büyüyüp 100-200 satıra ulaştığında, yapay zeka (LLM) "ortada kaybolma (Lost in the middle)" sendromu yaşar. Kuralları okur ama en kritik olanları unutur. Bize sahte bir güvenlik hissi verir.

**4. Idempotency Key Eleştirisi (Gereksiz Kompleksite / Over-engineering):**
- Bu özellik, Stripe gibi milyar dolarlık ödeme sistemleri için şarttır. Ancak bir "Görev / Planlama" uygulaması için devasa bir **aşırı mühendisliktir.**
- Backend'de bu keyleri takip etmek için ekstra önbellek (Redis) veya veritabanı tabloları kurmak gerekir. Frontend'de ise karmaşık UUID üretimleri ve hata yönetimi yazmak gerekir.
- *Alternatif:* Kullanıcı "Kaydet" tuşuna bastığında butonu 1 saniyeliğine "Disabled (Pasif)" duruma getirmek, çift kayıt sorununun %99'unu sadece 1 satır kodla çözer. Neden aylarca Idempotency altyapısı yazalım?

---
### 6. Mimari Sentez Kararları (Kurumsal Güvenlik ve Pragmatik Hızın Harmanı)
Yapay zeka ajanlarının işini kolaylaştırmak (Agent-Friendly) ve kurumsal güvenliği sağlamak adına yapılan tartışmalar sonucunda teorik mükemmellik ile pratik uygulanabilirlik arasında şu "Orta Yol" (Sentez) kararları alınmıştır:

**6.1. Veritabanı ve Multi-Tenant İzolasyonu (Pragmatik Hibrit Çözüm)**
*Sorun:* EF Core'a geçmek sistemi hantallaştıracak ve mevcut Dapper kodlarını çöpe atacaktır. Ancak ajanı saf Dapper ile (SQL string manipülasyonu) baş başa bırakmak, TenantId filtresinin unutulma riskini doğurur.
*Sentez Kararı:* Veritabanı altyapısı olarak **Dapper kullanılmaya devam edilecektir.** Ancak ajanlar veritabanına doğrudan SQL yazmayacak, araya bir **"Base Repository"** sınıfı eklenecektir. Bu temel sınıf, tüm SQL sorgularını (Read/Write) arkaplanda yakalayıp `WHERE TenantId = @id` koşulunu otomatik olarak enjekte edecektir (Interceptor mantığı). Böylece hem Dapper'ın hızı ve mevcut kodlar korunacak hem de yapay zekanın filtreyi unutma riski sistem seviyesinde engellenecektir.

**6.2. Frontend Stil Yönetimi (Kapsüllenmiş Temizlik)**
*Sorun:* Global "Vanilla CSS", yapay zekanın yan etki (side-effect) yaratarak diğer sayfaları bozmasına neden olur. "Tailwind CSS" ise HTML etiketlerini (DOM) şişirerek hem okunabilirliği düşürür hem de yapay zekanın hafıza (Context Window / Token) limitlerini gereksiz yere harcar.
*Sentez Kararı:* Web arayüzü tasarlanırken **CSS Modules** kullanılacaktır. Bu sayede her bileşenin CSS'i kendi içine hapsedilecek (Scoped) ve yapay zeka bir butonu tasarlarken yanlışlıkla başka bir sayfadaki tabloyu bozmayacaktır. Aynı zamanda HTML/JSX dosyaları Tailwind çöplüğüne dönüşmeden, tertemiz ve "Wow" dedirtecek premium tasarımlara açık kalacaktır.

**6.3. Otonom Ajan Yönetimi ve Kurallar (Derleyici Destekli Sınırlar)**
*Sorun:* Kapsamlı bir `.cursorrules` dosyası yazmak, yapay zekanın "Ortada Kaybolma (Lost in the middle)" sendromu yaşayarak en önemli kuralları bile unutmasına yol açar.
*Sentez Kararı:* `AGENTS.md` (veya `.cursorrules`) dosyası maksimum 4-5 maddelik çok kısa ve sadece ana vizyonu içeren bir özet olacaktır. Geri kalan tüm kurallar metinle değil, **Derleyici (Compiler) ve Analyzer'lar** ile zorlanacaktır. Ajan, yetkisi olmayan bir katmana erişmeye çalıştığında IDE veya .NET derleyicisi anında hata fırlatarak ajanı doğru yola sokacaktır.

**6.4. Finansal/Kritik İşlem Güvenliği (Yalın Eşetkisellik - Idempotency)**
*Sorun:* Sadece Frontend'de "Kaydet" butonunu pasif yapmak, ağ kesintileri veya tarayıcı yenilemelerinde gerçekleşen mükerrer ödeme/kayıt hatalarını engellemez. Ancak Redis gibi devasa önbellek sistemleri kurmak da KÜÖYS (Kurs Üyelik Ödeme Yönetim Sistemi) için aşırı mühendisliktir (Over-engineering).
*Sentez Kararı:* Sadece üyelik ödemesi, yeni öğrenci kaydı gibi kritik API endpoint'lerine **Yalın Idempotency (Eşetkisellik)** eklenecektir. Redis yerine, mevcut veritabanında (SQLite/PostgreSQL) hafif bir `IdempotencyKeys` tablosu oluşturulacak ve basit bir ActionFilter ile gelen isteklerin tekrarlı olup olmadığı kontrol edilecektir. Bu, geliştirme maliyetini minimumda tutarken veri bütünlüğünü ve ödeme güvenliğini %100 garanti altına alacaktır.

---
### 7. Profil ve Kullanıcı Ayarları Arayüzü İçin Fikir Havuzu
Modern SaaS ve oyunlaştırılmış eğitim (EdTech) uygulamalarının (Duolingo, Strava, Notion vb.) en güncel UX pratiklerinden derlenmiş, ileride arayüzde "Accordion" (tıklandıkça açılan) kartlar şeklinde kurgulanabilecek kapsamlı profil mimarisi:

**7.1. Kişisel Bilgiler & Kimlik (Identity)**
*   **Dinamik Avatar / Profil Fotoğrafı:** Sadece fotoğraf değil, kazanılan başarılar veya rozetlerle süslenebilen oyunlaştırılmış avatar çerçeveleri.
*   **Motivasyon Sözü (Motto):** Ana ekranda ve profilde görünecek kişisel bir hedef cümlesi (Örn: "İTÜ Bilgisayar 2027!").
*   **Temel Bilgiler & İletişim:** Ad, soyad, kullanıcı adı, doğrulanmış e-posta ve opsiyonel telefon numarası.

**7.2. Eğitim & Sınav Hedefleri (Goals & Targets)**
*   **Hedef Sınav & Sınıf:** YKS, LGS, SAT vb. Sınav ve sınıf seçimi (Yapay zeka asistanı algoritmasını buna göre kurar).
*   **Hayalindeki Kurum:** Hedeflenen üniversite/lise (Net hedefleri için baz alınır).
*   **Çalışma Temposu (Pacing):** "Sakin", "Dengeli", "Yoğun (Kamp)" şeklinde asistanın görev atama zorluğunu belirleyen modlar.

**7.3. Tema & Görünüm (Appearance)**
*   **Mod Seçimi:** Aydınlık, Karanlık, Sistem Ayarı.
*   **Vurgu Rengi (Accent Color):** Neon Mor, Okyanus Mavisi, Nane Yeşili gibi kişiselleştirilmiş tema renkleri.
*   **Arayüz Yoğunluğu:** "Kompakt" (ekranda bol veri görünür) vs "Rahat" (büyük boşluklar ve okunaklı fontlar).
*   **Özel Uygulama İkonu:** Premium/Pro üyelere özel ana ekran ikonu seçenekleri.

**7.4. Başarılar & Oyunlaştırma (Gamification)**
*   **Rozet Vitrini:** "7 Gün Serisi", "Matematik Canavarı" gibi başarıların sergilendiği alan.
*   **XP ve Seviye Sistemi:** Görev tamamladıkça kazanılan deneyim puanı ve bir sonraki seviye için ilerleme çubuğu.
*   **Seri Dondurucu (Streak Freeze):** Uygulama içi puanlarla alınabilen ve çalışma gününün kaçırılması durumunda seriyi koruyan can yelekleri.
*   **Liderlik Tablosu Görünürlüğü:** Anonim kalma veya rekabete katılma tercihleri.

**7.5. Bildirim Tercihleri (Notifications)**
*   **Akıllı Asistan Dürtmeleri:** Görev saatleri ve motivasyon için push notification ayarları.
*   **Haftalık Rapor:** Pazar günleri veliye veya öğrenciye giden detaylı e-posta aboneliği.
*   **Uygulama İçi Efektler (Haptics):** Görev tamamlanma sesleri ve titreşim (haptic feedback) ayarları.

**7.6. Bağlantılar & Entegrasyonlar (Integrations)**
*   **Takvim Senkronizasyonu:** Google Calendar veya Apple Takvim'e çalışma saatlerini işleme.
*   **Veli / Koç Bağlantısı:** Öğrencinin ilerleme durumunu dışarıya açan salt-okunur (read-only) paylaşım linki.
*   **Odak Uygulamaları:** Forest veya benzeri Pomodoro uygulamaları ile (ileride eklenebilecek) veri senkronizasyonu.

**7.7. Hesap Güvenliği & Gizlilik (Security & Privacy)**
*   **Şifre & Giriş Yönetimi:** Şifre değiştirme, Google/Apple hesaplarını bağlama veya ayırma.
*   **Aktif Oturumlar:** Diğer cihazlardan çıkış yapabilme imkanı (Netflix/Spotify mantığı).
*   **Veri Dışa Aktarımı:** Öğrencinin tüm çalışma geçmişini ve net analizlerini PDF/Excel olarak indirebilmesi.
*   **Hesap Silme/Dondurma:** Hesabı geçici süreliğine dondurma veya kalıcı olarak silme.

**7.8. Abonelik & Pro Paket (Billing & Plan)**
*   **Mevcut Plan:** Free, Pro, Sınırsız vb. plan detayları.
*   **Plan Özellikleri & Yükseltme:** Kilitli özellikleri gösteren ve aboneliği yükseltme/iptal etme arayüzü.
*   **Ödeme Geçmişi:** Geçmiş faturalar ve bir sonraki yenilenme tarihi.

**7.9. Genel Ayarlar (General Settings)**
*   **Zaman Dilimi & Saat Formatı:** 12h/24h seçimi ve yerel saat dilimi ayarı.
*   **Haftanın İlk Günü:** Pazartesi veya Pazar olarak ayarlama.
*   **Dil Seçeneği:** Uygulama arayüz dili (Türkçe, İngilizce vb.).

**7.10. Yardım & Topluluk (Help & Community)**
*   **Nasıl Kullanılır? (Onboarding):** İlk kayıtta gösterilen akıllı asistan eğitimini (animasyonlu tur) tekrar oynatma.
*   **Sürüm Notları (Changelog):** Uygulamaya eklenen yeni özelliklerin duyurulduğu ekran.
*   **Geri Bildirim / Hata Bildir:** Kullanıcıların doğrudan geliştiriciye fikir/hata raporu gönderebileceği form.
*   **Yasal Metinler:** Gizlilik Politikası ve Kullanım Şartları (Terms of Service).

---
### 8. Pazar Araştırması & Kullanıcıların En Çok İstediği Özellikler (Reddit Analizi)
YPT (Yeolpumta), Forest, Notion ve Quizlet gibi popüler öğrenci/odaklanma uygulamalarının Reddit topluluklarında yapılan analizine göre, kullanıcıların en çok şikayet ettiği veya "keşke olsa" dediği özellikler:

**1. Esnek Yeniden Planlama & "Rollover" (Anti-Stres Planlama)**
*   **Problem:** Notion veya geleneksel takvimlerde, o gün bitmeyen veya kaçırılan görevleri tek tek ertesi günlere taşımak büyük eziyet. Öğrenciler manuel planlamadan bıkıyor.
*   **Fikir:** Akıllı Asistanın "Bugün bitiremediğin görevleri yarınki programa dağıtayım mı?" diye sorması. Görevleri sürükle-bırak ile (veya tek tıkla) yarına aktarma (Rollover).

**2. Kişiselleştirilmiş "Gün Sıfırlama (Reset)" Saati (YPT'nin En Büyük Şikayeti)**
*   **Problem:** Gece kuşları (gece 3'e kadar ders çalışanlar) için gün gece 12'de sıfırlanınca, tek bir çalışma seansı iki farklı güne bölünmüş oluyor ve istatistikler bozuluyor.
*   **Fikir:** Ayarlara "Gün benim için saat kaçta başlar?" seçeneği eklemek (Örn: Gece 04:00 reset).

**3. Esnek Odak/Pomodoro Modu (Forest Şikayetleri)**
*   **Problem:** Forest'ta 50 dk seçip 45. dakikada konu bittiğinde, ağaç ölmesin diye 5 dakika boş ekrana bakmak zorunda kalınıyor. Erken çıkış cezalandırılıyor.
*   **Fikir:** Görev veya odak bitirildiğinde kalan süreyi orantılı ödüllendiren (cezalandırmayan) dinamik odaklayıcılar.

**4. Offline (Çevrimdışı) Erişilebilirlik**
*   **Problem:** Notion ve çoğu modern web tabanlı uygulama internetsiz ortamda (kütüphane veya metroda) çalışmıyor, çöker veya veriyi göstermez.
*   **Fikir:** Bizim Local-First (Capacitor + SQLite / IndexedDB) mimarimiz tam da bu sorunu çözüyor! İnternet geldiğinde sunucu ile sessiz senkronizasyon.

**5. Sürdürülebilir Ekonomi ve Ödüller**
*   **Problem:** Forest veya benzeri uygulamalarda tüm içerikleri açan eski kullanıcılar için paraların (coin) anlamı kalmıyor. Oyunlaştırma ölüyor.
*   **Fikir:** Paraların sadece tek seferlik item'lara değil, UI temaları açmakta, "Seri Dondurucu (Streak Freeze)" almakta veya hayır kurumlarına (fidan bağışı vb.) bağışlanmakta kullanılabildiği döngüsel bir ekosistem.

**6. Karmaşadan Uzak (Zero-Setup) Minimalizm**
*   **Problem:** Öğrenciler planlama uygulamalarını ayarlamak, tag'ler oluşturmak, Notion veritabanları bağlamak için saatlerini harcıyor (Plan yapmak için plan yapmak).
*   **Fikir:** Bizim "Akıllı Asistan" (Onboarding) kurgumuz. Öğrenci sadece ülkesini ve hedefini girer, asistan tüm şablonu önüne hazır koyar. Öğrenci hemen "Çözmeye Başla" butonuna basar.

**7. Ana Ekran Widget'ları (iOS / Android)**
*   **Fikir:** Uygulamaya girmeden, telefon ekranında "YKS'ye Kalan Gün", "Bugünkü Kalan Görev Sayısı" ve "Ateş Serisi (Streak)" gösteren dinamik widget'lar. Öğrenciler için en büyük motivasyon kaynaklarından biridir.

---
### 9. İleri Düzey Pazar Araştırması (Todoist, Habitica ve Anki Analizi)
Öğrencilerin daha çok görev yönetimi ve alışkanlık takibi için kullandığı dev uygulamalarda (Todoist, Habitica, Anki) en çok şikayet edilen eksiklikler:

**1. "Başlangıç Tarihi" (Start Dates) Eksikliği (Todoist Şikayeti)**
*   **Problem:** Bir ödevin teslim tarihi (Deadline) Cuma günü ise, öğrenci uygulamaya Cuma tarihini giriyor. Ancak ödeve "Çarşamba" günü başlaması gerekiyor. Çarşamba günü "Bugün" (Today) listesinde bu görev görünmediği için ödev unutuluyor.
*   **Fikir:** Görevlere sadece "Teslim Tarihi" değil, "Başlangıç Tarihi / Ne zaman çalışmaya başlayacaksın?" (Start Date) alanı eklemek. Asistanın öğrenciye Çarşamba gününden itibaren hatırlatma yapması.

**2. Alt Görev (Sub-task) Hiyerarşisi (Habitica Şikayeti)**
*   **Problem:** Habitica gibi oyunlaştırma uygulamalarında "Türev Çalış" gibi devasa bir görev tek satır olarak duruyor. Bu da başlama motivasyonunu düşürüyor (Dağ gibi görünmesi).
*   **Fikir:** Asistanın büyük hedefleri otomatik (veya manuel) olarak küçük "Checklist" (Alt görev) adımlarına bölmesi. (Örn: 1. Konu Anlatımı İzle, 2. Fasikül Çöz, 3. Çıkmış Sorulara Bak). Ana görevin altındaki bar yavaş yavaş dolar.

**3. Hızlı Erteleme / Uyutma (Snooze) Özelliği**
*   **Problem:** O an o görevi yapmak istemeyen öğrencinin, görevin tarihini değiştirmek için menüler arasında kaybolması.
*   **Fikir:** Görevi sağa kaydırarak (Swipe) "Akşam Hatırlat", "Hafta Sonuna Ertele" (Snooze) diyerek hızlıca göz önünden kaldırma esnekliği.

**4. Zaman Bloklama (Time-blocking) İhtiyacı (Todoist Şikayeti)**
*   **Problem:** Alt alta dizilmiş kuru bir "Yapılacaklar Listesi" öğrenciye gününün nasıl geçeceğini hissettirmiyor.
*   **Fikir:** Bizim Faz 2'de tasarladığımız "Dikey Zaman Çizelgesi (Timeline)" arayüzü tam olarak bu sorunu çözüyor. Görevleri sadece bir liste değil, günün akışına (Time-block) oturtulmuş bir yolculuk olarak sunmak.

**5. Dik Öğrenme Eğrisi ve Kötü UX (Anki Şikayeti)**
*   **Problem:** Anki (Aralıklı tekrar algoritması) tıpcılar ve başarılı öğrenciler arasında efsanevi olmasına rağmen, arayüzü 1990'lardan kalma olduğu için çoğu lise öğrencisi uygulamayı kullanmayı başaramayıp siliyor.
*   **Fikir:** Anki'nin efsanevi "Aralıklı Tekrar (Spaced Repetition)" algoritmasını bizim uygulamamızdaki "Asistan" arka planda gizlice çalıştırmalı. Öğrenci algoritma, deste ayarı, süre gibi karmaşık teknik terimlerle uğraşmamalı; sadece "Tekrar Et" butonuna basmalı. Kötü UX'i asistanla maskelemeliyiz.

---
### 10. Sosyal Çalışma & Kapsayıcı Tasarım Trendleri (DEHB/ADHD Analizi)
Özellikle Dikkat Eksikliği ve Hiperaktivite Bozukluğu (DEHB) olan, kolay odaklanan/dağılan öğrenciler ile Z Kuşağı'nın Reddit'te en çok bahsettiği yeni nesil verimlilik ihtiyaçları:

**1. "Kötü Gün İzni" (Sick/Off-Day Button)**
*   **Problem:** Kesintisiz çalışma serisi (Streak) uygulamaları harikadır ancak öğrenci hasta olduğunda veya psikolojik olarak kötü hissettiğinde uygulamanın onu cezalandırması (seriyi bozması) uygulamanın silinmesine yol açıyor.
*   **Fikir:** Ayarlarda veya asistan menüsünde bir "Bugün İyi Hissetmiyorum" butonu. Bu butona basıldığında seri (streak) dondurulur, asistan öğrenciye şefkatli bir geçmiş olsun / dinlenme mesajı atar. Ceza yerine empati.

**2. Düşük Sürtünme (Low Friction) & "Sıfır Saçmalık" Arayüzü**
*   **Problem:** "Tool Fatigue" (Araç Yorgunluğu). Öğrenciler Notion, Asana gibi devasa özellikleri olan uygulamaları görünce bunalıyor, "sadece kağıt kalem" basitliğine kaçıyor.
*   **Fikir:** Arayüzün sadece "Bugün ne yapacağım?" sorusuna cevap vermesi. Eklenecek her yeni özelliğin (sosyal gruplar, oyunlar) ana ekrandan gizlenip "Ayarlar" veya "Sekmeler" altına saklanması. Odak moduna (Focus Mode) girildiğinde tüm arayüzün kararıp sadece tek bir görevin ekranda kalması.

**3. Görsel Hiyerarşi ve Temizlik (Visual Clutter Control)**
*   **Problem:** Gözü yoran renk karmaşası ve bitmiş/bitmemiş görevlerin birbirine girmesi.
*   **Fikir:** Zaman çizelgesinde (Timeline) göreve "Tamamlandı" işareti atıldığı an, görevin renginin soluklaşması (Opasite düşmesi) ve tek tıkla "Bitenleri Gizle" özelliğinin olması. Acil görevlerin çok tatlı bir kırmızı ile parlaması.

**4. Sanal Kütüphane / Hesap Verilebilirlik (Body-Doubling / Accountability Buddy)**
*   **Problem:** Evde yalnız çalışmak zor. Bu yüzden öğrenciler Discord odalarında veya LifeAt gibi platformlarda kameralarını açıp tanımadıkları insanlarla çalışıyor (Body-doubling etkisi).
*   **Fikir:** (İleriki Fazlar İçin) Uygulama içine eklenebilecek "Çalışma Odaları" veya "Seni bekleyen bir arkadaşın var" dürtmeleri. Arkadaşının o an Pomodoro'da (odakta) olduğunu gösteren ufak canlı durum (Status) ikonları. Çalışmayı sosyal ve zorunlu hale getirme.

---
### 11. İleri Düzey Temalandırma (Yapısal Metamorfoz & Asset Skinning)
Sadece renk (açık/koyu mod) değiştiren standart temaların ötesine geçerek, uygulamanın şeklini, ruhunu ve taşıdığı metaforları tamamen değiştiren "Yapısal Temalandırma" (Oyun dünyasındaki 'Skin' mantığı) yaklaşımı.

**Bu Yaklaşımın Avantajları (Neden Yapmalıyız?)**
1.  **Duygusal Bağlılık:** Öğrenci, uygulamayı sıkıcı bir görev listesi değil, kendi "Dijital Yaşam Alanı" veya "Oyun Karakteri" gibi sahiplenir.
2.  **Devasa Gelir Modeli (Monetization):** Kullanıcılar sadece "karanlık mod" için Premium almazlar; ancak Discord Nitro veya Telegram özel arka planlarında olduğu gibi, harika görünen "Uzay Mekiği" teması için seve seve abone olurlar.
3.  **Viral Pazarlama:** Sosyal medyada (TikTok/Instagram Reels) "Benim çalışma alanım böyle" şeklinde paylaşılan şık ve kişiselleştirilmiş tasarımlar, uygulamanın kendi kendini pazarlamasını sağlar (User Generated Content).

**Tema Örnekleri (Görsel Metaforlar)**
*   **🌳 Orman / Doğa Teması (Cottagecore):** 
    *   *Timeline (Dikey Çizgi):* Düz bir çizgi yerine aşağı sarkan sarmaşık veya ağaç dalı (SVG).
    *   *Görev Kartları:* Yaprak hissi veren asimetrik kenar kıvrımları (Örn: `border-radius: 20px 0 20px 0;`).
    *   *İkonlar:* Odak süresi dolduğunda açan çiçekler, görev tamamlandığında meşe palamutları.
*   **🚀 Siberpunk / Uzay Teması:** 
    *   *Timeline:* Parlayan, neon bir lazer ışını.
    *   *Görev Kartları:* Fütüristik, keskin hatlı uzay gemisi panelleri, Matrix stili dijital yağmur arka planları.
    *   *İkonlar:* Gezegenler, roketler ve dijital "Glitch" efektleri.
*   **👾 Retro 8-bit (Piksel) Teması:** 
    *   *Arayüz:* Tamamen piksel fontlar (Press Start 2P), kalın bloklu siyah kenarlıklar. 
    *   *İlerleyiş:* Eski JRPG (Pokemon/Zelda) oyunlarındaki gibi can (HP) ve Exp barları.

**Olası Teknik Sorunlar ve UX/UI Çözümleri**
*   **⚠️ Problem 1: Okunabilirlik ve Erişilebilirlik (Accessibility)**
    *   *Risk:* Çiçekli böcekli veya hareketli arka planlarda metinlerin (Türev Testi 1) okunmasının zorlaşması.
    *   *Çözüm:* Arayüz ne kadar çılgın olursa olsun, metinlerin arkasında mutlaka yarı saydam (Glassmorphism) düz veya koyu bir zemin olmalıdır. Kontrast oranları CSS tarafında katı kurallarla korunmalıdır. Metinlerin okunabilirliğinden taviz verilemez.
*   **⚠️ Problem 2: Geliştirme Yükü (Maintenance Hell)**
    *   *Risk:* Uygulamaya yeni bir bileşen (Buton) eklendiğinde bunu hem Orman, hem Uzay, hem Retro teması için ayrı ayrı kodlamak kod tabanını şişirir.
    *   *Çözüm:* Bileşenler React tarafında asla kopyalanmaz. Mimari tamamen **CSS Değişkenleri (CSS Variables)** ve **Data Nitelikleri (Data Attributes)** üzerine kurulur. 
    *(Örn: React kodu aynı kalır, en üstte `<div data-theme="forest">` olur. CSS içinde `[data-theme="forest"] .timelineSpine { background-image: url('vine.svg'); }` diyerek sadece Asset (resim/şekil) giydirmesi yapılır.)*
*   **⚠️ Problem 3: Performans ve Mobil Scroll Kasması**
    *   *Risk:* Düşen yaprak animasyonları, ağır SVG'ler ve kompleks CSS şekillerinin mobil cihazlarda FPS düşürmesi ve kaydırma (scroll) gecikmesi yaratması.
    *   *Çözüm:* Ağır GIF'lerden kaçınmak, SVG'leri optimize (minify) etmek. Animasyonlar için tarayıcıyı yoran özellikler (width, height, top) yerine, yalnızca donanım hızlandırmalı (GPU-Accelerated) olan `transform` ve `opacity` özelliklerini kullanmak.

---
### 12. Çoklu Rol ve Bağlam Yönetimi (Unified Context / Role Synthesis)
*   **Problem:** Uygulamayı kullanan kişi sadece tek bir kalıpta (Öğrenci) olmayabilir. Aynı anda Fizik Öğretmeni, Yapay Zeka Öğrencisi ve ev işleri/kişisel hayatı olan biri olabilir.
*   **Geleneksel Yanlışlar:**
    *   *Workspaces (Çalışma Alanları):* Notion/Slack gibi profili odalara bölmek. (Hata: İnsanın zamanı bölünemez. Görevlerin çakışmasına ve bazı işlerin unutulmasına sebep olur).
    *   *Aşırı Etiketleme (Tagging):* Todoist gibi her yere uzun uzun "Öğretmen, Acil, Fizik" yazmak. (Hata: Minimalizm ve 'Sıfır Kurulum' ilkesini bozar, ekranı çöplüğe çevirir).

**Çözüm: Birleşik Odak (Unified Context) Mimarisi ve Minimalizm Sentezi**
Bir UX/UI standardı olarak karmaşık rol yönetimini en sade şekle indirme yöntemleri:

1.  **Tek Bir Çizgi (Unified Timeline):** Kullanıcının tüm rolleri (Öğretmen, Öğrenci, Kişisel) ana sayfadaki tek bir zaman çizelgesinde (Timeline) kronolojik olarak akar. 10:00'da ders verme (Öğretmen), 14:00'te ders çalışma (Öğrenci), 19:00'da alışveriş (Kişisel) görevleri bütünüyle görülür.
2.  **Zarif Renk Kodlaması (Accent Borders):** Karmaşık tag (etiket) yazıları ekranda görünmez. Bunun yerine, görev kartlarının sol kenarında 3 piksellik çok ince, zarif bir vurgu çizgisi (Accent Border) veya ikon bulunur.
    *   👨‍🏫 Mor Çizgi: Eğitmen/Öğretmen
    *   📚 Mavi Çizgi: Öğrenci
    *   ☕ Yeşil Çizgi: Kişisel İşler
    *(Kullanıcının beyni bir süre sonra bu renkleri içselleştirir ve yazıları okumadan sezgisel algılar).*
4.  **Asistan Tarafından Otomatik Kategorizasyon (Zero-Setup):** Kullanıcı "Akşam fizik sınav kağıtlarını oku" dediğinde, arka plandaki yapay zeka NLP ile bunun bir "Eğitmen" görevi olduğunu algılayıp rengini ve bağlamını otomatik atar. Kullanıcı manuel etiket girmekle uğraşmaz.

---
### 13. Akıllı Asistan'ın Çoklu Rol Adaptasyonu (Context-Aware AI)
Çoklu rol mimarisinin (Öğrenci, Öğretmen, Kişisel) kusursuz işlemesi için, Akıllı Asistan'ın (AI) sabit bir algoritmadan çıkıp **"Bağlam Farkındalığına" (Context-Aware)** geçmesi gerekir:

**1. Role Göre Değişen İletişim Tonu (Persona Shifting)**
Asistan, tıkladığınız veya planladığınız görevin rolüne göre dilini (Tone of Voice) değiştirir:
*   *Öğretmen Görevi İşlenirken:* Profesyonel, saygılı ve asiste edici.
*   *Öğrenci Görevi İşlenirken:* Daha enerjik, koç (mentor) edasında ve motive edici. 

**2. Rol Bazlı Akıllı Planlama (Esneklik vs. Katılık Algoritması)**
*   **Öğretmen Görevleri (Katı):** Saat 10:00'daki fizik dersi ertelenemez. Asistan bunları "Katı Görev (Hard Deadline)" kilitler.
*   **Öğrenci Görevleri (Esnek):** "Türev Çöz" görevi yetişmediyse, Asistan bunu sorun etmez, *"Türev testini yarına (Rollover) kaydırayım mı?"* diye sorar. 

---
### 14. Mikro-Onboarding (Tanışma) ve Proaktif Görev Üretimi
Kullanıcının tek tek görev yazma eziyetini (manuel veri girişi) sıfırlamak ve asistanın "Kişiselleştirilmiş" hissetmesini sağlamak için kurgulanan sistem:

**1. Sıkıcı Formlar Yerine "Sohbetle Tanışma" (Mikro-Onboarding)**
Kullanıcı uygulamaya ilk girdiğinde karşısına devasa kayıt formları çıkmaz. Bunun yerine Asistan ile tatlı bir yazışma başlar:
*   **Asistan:** *"Merhaba! Sana en iyi programı yapabilmem için seni biraz tanıyayım. Hangi ülkeden bağlanıyorsun?"* (Türkiye/Global seçeneği - İleride ABD/Avrupa pazarına açılırken uygulamanın tek bir güncellemeyle adapte olmasını sağlar).
*   **Asistan:** *"Harika. Peki şu anki hedefin nedir?"* (Seçenekler: YKS, LGS, KPSS, Üniversite, Bağımsız Öğrenci). Kullanıcı YKS'yi seçerse, sistem arka planda Türkiye/YKS şablonunu (Context) yükler.
*   **Asistan:** *"Aynı zamanda bir şeylerin eğitmenliğini/koçluğunu yapıyor musun?"* (Evet derse, sisteme "Öğretmen" şapkası da eklenir ve hangi branş olduğu sorulur).

**2. Küresel Genişleme İçin JSON Hafıza Mimarisi**
İleride uygulamayı globale açacağınız için kullanıcı profili ilişkisel (SQL) kolonlara sıkıştırılmamalıdır. Veritabanında `UserSettings` veya `ContextMemory` adında bir **JSON kolonunda** tutulmalıdır.
*(Örn: `{"country": "TR", "exam_system": "YKS", "roles": ["student", "teacher"], "teacher_branch": "Physics"}`)*. Bu sayede yarın "SAT Sınavı" veya "AP Eğitim Sistemi" eklediğinizde veritabanı şemasını değiştirmek (Migration) zorunda kalmazsınız.

**3. Hafıza Destekli Proaktif (Öngörülü) Görev Üretimi**
Kullanıcı bir şey yazdığında asistan önceki (Onboarding) bilgilerini kullanarak boşlukları kendisi doldurur.
*   **Senaryo:** Öğrenci *"Bu hafta 3 defa matematik çalışacağım"* yazar.
*   **Geleneksel Uygulamalar:** Hiçbir şey yapamaz veya "Hangi günler?" diye tek tek sorar.
*   **Bizim Asistanımız:** Onboarding'den kullanıcının "YKS - Sayısal" öğrencisi olduğunu bilir. Şöyle cevap verir: 
    *"Harika bir karar! YKS Sayısal için Türev ve İntegral konuları çok kritik. Senin için Çarşamba, Cuma ve Pazar akşamı saat 19:00'a 1'er saatlik Matematik - Türev bloku yerleştirdim. Uygun mu?"* (Tek tıkla 3 görev birden oluşur).

**4. Roller Arası Anlamsal Çıkarım (Contextual Inference)**
Senaryonuzdaki gibi Fizik Öğretmeni ve YZ Öğrencisi olan biri *"Öğrencime hazırlayacağım sınavı listeye ekle, ayrıca derin öğrenme projeme de çalışmalıyım"* dediğinde;
*   Asistan, kullanıcının "Fizik Öğretmeni" şapkasını bilir. İlk görevi `[👨‍🏫 Öğretmen - Fizik Sınavı Hazırlığı]` olarak mor renkle kaydeder.
*   İkinci cümleden kullanıcının kendi öğrenciliği olduğunu algılar ve `[📚 Öğrenci - Derin Öğrenme Projesi]` olarak mavi renkle kaydeder.
*   *Sonuç:* Kullanıcı detaylı açıklamalar yapmak, menüler seçmek veya etiket aramak zorunda kalmaz. Asistan kullanıcısını tanır ve onun niyetini anlar.

---
### 15. İleri Aşama (Faz 2): Yapay Zeka (LLM) Maliyetleri ve İş Modeli (Freemium)
Yukarıda anlatılan "Cümleyi anlayıp görev çıkarma" veya "Role göre davranma" işlemleri klasik kodlama (If-Else) ile değil, Büyük Dil Modelleri (LLM) kullanılarak yapılabilir. Ancak LLM'ler her istekte API maliyeti yaratır. Bu durum bir zaaf değil, uygulamanın ana gelir kapısıdır:

*   **Ücretsiz Paket (Maliyetsiz MVP):** Kullanıcılar uygulamayı indirir. Tasarım harikadır ancak "Akıllı NLP Asistan" kapalıdır (veya günde çok kısıtlı hakkı vardır). Kullanıcı görevlerini, rollerini geleneksel yollarla (butonlarla) kendisi seçer. Bizim için API maliyeti sıfırdır.
*   **Pro (Premium) Paket:** Ayda belirli bir ücret (SaaS). Kullanıcı tüm planlamayı, yeniden planlamayı (Rollover) ve analizleri yapay zekaya yaptırmak için abone olur. (Kullanıcının size LLM API maliyeti çok düşüktür, yüksek kâr marjı sağlar).
*Bu fikir şimdilik "Gelecek Vizyonu" olarak park edilmiştir.*

---
### 16. MVP (Faz 1): LLM Kullanmadan Yapılabilecek Akıllı Özellikler
Yapay zeka (OpenAI/Gemini) maliyetlerine ve karmaşıklığına girmeden, sadece deterministik kurallar (If-Else) ve zeki bir UI tasarımıyla asistan hissini nasıl yaratırız?

1.  **Odak Modu Filtreleri (Context Toggles):** LLM olmadan da üst menüdeki `[Öğretmen]`, `[Öğrenci]`, `[Kişisel]` hapları kusursuz çalışır. Kullanıcı bir görevi eklerken küçük bir ikonla bunun "Hangi Role" ait olduğunu seçer (Manuel ama sürtünmesiz bir seçim).
2.  **Kural Tabanlı Asistan (Rule-Based Prompts):** Asistan gerçek bir LLM gibi cümle kurmaz ama önceden yazılmış mantıksal uyarılar verir:
    *   *Kural:* Gün bitiyor ve 3 tane tamamlanmamış (Öğrenci) görevi var.
    *   *Tepki (Hardcoded):* Sağ altta asistan pop-up çıkar: *"Görünüşe göre bugün bitiremediğin 3 görev var. Bunları yarına aktarmak (Rollover) ister misin?"* (Kullanıcı 'Evet' derse kod yarına kopyalar).
3.  **Makro Şablonlar (Onboarding Şablonları):** Kullanıcı "Ben YKS Sayısalcıyım" dediğinde LLM'e gitmeyiz. Kendi veritabanımızda önceden hazırladığımız "YKS Sayısal Şablonu" JSON'ını kullanıcının takvimine otomatik döşeriz (Sanki asistan ona özel program yapmış hissi verir).
4.  **Zarif Renk Kodlaması:** LLM olmadan da görevlere atanan statik roller üzerinden CSS ile sol kenar çizgileri (Mor, Mavi, Yeşil) kolayca renklendirilir.

### Ek İsterler (Faz 1 & 2 İçin Notlar)
- **Asistan Dil Seçimi:** Uygulama ilk açıldığında (onboarding aşamasında) asistan kullanıcıya nasıl hitap edilmesini istediğini sormalıdır (Resmi, Samimi, Kanka Modu vb.). İletişim cümleleri (If-Else / LLM) buna göre şekillenecektir.
- **Kısmi Tamamlama Raporlaması:** Görev 10 soruluksa ve o gün 6'sı çözülürse, o günkü görev %60 tamamlandı olarak kalır. Geriye kalan 4 soru için geleceğe kopya görev açılır. Kopya görev tamamlandığında orijinal günün istatistiği değişmez ancak detaylara girildiğinde 'Kalan kısmı ileri bir tarihte tamamlandı' notu düşülür.
