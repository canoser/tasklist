# Yeni Nesil Planlama Uygulaması - Netleşmiş İsterler

Bu dosya, beyin fırtınası aşamasından geçip onaylanan, geliştirme (kodlama) aşamasında kesinlikle uyulması gereken mimari ve iş kurallarını barındırır.

## Sistem Mimarisi ve Temel Kurallar

### 1. Çoklu Kullanıcı (Multi-Tenant) İzolasyon Stratejisi
- **Seçilen Yöntem:** 2. Seviye İzolasyon (Tek Tablo + TenantId).
- **Kural:** Sistemdeki tüm kullanıcıların verileri aynı havuzda (tablolarda) tutulacaktır. Veritabanı altyapısı olarak **Dapper** kullanılmaya devam edilecektir. Ancak ajanlar SQL yazarken hata yapmasın diye araya bir **"Base Repository"** sınıfı zorunlu tutulmuştur. Bu sınıf, tüm sorgulara otomatik olarak `WHERE TenantId = @id` koşulunu (Interceptor mantığıyla) ekleyecek, güvenlik sistem seviyesinde sağlanacaktır.

### 2. Çevrimdışı Öncelikli (Offline-First) ve Senkronizasyon
- **Kural:** Mobil deneyim hedeflendiği için uygulama internet bağlantısı koptuğunda da çalışmaya devam etmelidir. Veriler senkron `localStorage` yerine, asenkron ve daha geniş kapasiteli **IndexedDB** (`localforage`) üzerinde tutulacaktır.
- **Cache (Okuma):** API'den gelen veriler anında IndexedDB'ye yazılır. İnternet koptuğunda veriler bu önbellekten okunur (Network-First, Fallback to Cache).
- **Kuyruk (Yazma):** Çevrimdışı ortamda yapılan değişiklikler (Görev tamamlama vb.) IndexedDB'deki bir işlem kuyruğuna (Offline Sync Queue) eklenir ve internet geldiğinde (`window.addEventListener('online')`) arka planda otomatik senkronize edilir. (Optimistic UI desteklenecektir).

### 3. Güvenlik ve Kurumsal Standartlar
- Sistem "Clean Architecture" veya "Vertical Slice" mimarisine uygun, modüler bir yapıda tasarlanacaktır.
- **Interface Zorunluluğu:** Veritabanı ve Dış servis erişimleri sadece Interface'ler üzerinden yapılacaktır.
- API'de IP bazlı **Rate Limiting** (Hız Sınırlandırması) bulunacaktır.
- **Token Yönetimi (Sıfır Güven & DevSecOps):** JWT'ler (JSON Web Token) frontend tarafında XSS saldırılarına karşı korunmak üzere KESİNLİKLE `localStorage` veya state içinde saklanmayacak, `HttpOnly`, `Secure` ve `SameSite=Strict` özelliklerine sahip Çerez (Cookie) olarak kullanılacaktır. Tüm endpoint'ler IDOR zafiyetine karşı sadece Token içerisindeki Claim'lere güvenerek yetkilendirilecektir. Hesap listeleme (Enumeration) saldırılarına karşı jenerik hatalar ve gecikmeler (Delay) uygulanacaktır.
- **Denetim İzi:** Kritik veri değişikliklerinde Audit Logging (Denetim İzi) tutulacaktır.
- Arayüz ile API haberleşmesinde CORS politikaları sıkı tutulacaktır.
- **Finansal Güvenlik (Idempotency):** Sadece üyelik ödemesi veya yeni öğrenci kaydı gibi kritik API endpoint'lerine, mevcut veritabanında oluşturulacak bir `IdempotencyKeys` tablosu ve basit bir ActionFilter ile **Yalın Eşetkisellik (Idempotency)** uygulanacaktır. Bu sayede mükerrer kayıtlar %100 engellenecektir.

### 4. Teknoloji Yığını (Tech Stack) - YOL A Kararı
Projenin "Bir Kere Yaz, Her Yerde Çalıştır" mantığıyla inşa edilmesi için aşağıdaki teknoloji yığını kesinleştirilmiştir:
- **Backend (API):** ASP.NET Core Web API (.NET 9.0). Mevcut Dapper ve SQLite altyapısı korunacaktır.
- **Frontend (Web Arayüzü):** React (Vite kullanılarak).
- **Tasarım / Stil:** Yapay zekanın yan etki (side-effect) yaratmaması ve arayüzü HTML çöplüğüne çevirmemesi için arayüz geliştirilirken **CSS Modules** kullanılacaktır. Global CSS yasaktır.
- **Masaüstü (PC) Uygulaması:** Önceden planlanan Tauri (Web wrapper) iptal edilmiş olup, sıfırdan **WPF (.NET 9.0-windows)** ve C# kullanılarak gerçek bir native Windows uygulaması (MVVM) geliştirilmektedir.
- **Mobil Sarmalayıcı:** Web uygulaması, Capacitor kullanılarak Android/iOS uygulamasına dönüştürülecektir.
- **Çoklu Dil ve Üslup (i18n):** Kullanıcı deneyimini kişiselleştirmek için `react-i18next` kullanılarak aynı dil içinde "Resmi, Samimi, Kanka" gibi farklı hitap tonları (Tone of Voice) desteklenecektir.
- **Kimlik Doğrulama (Auth):** Kendi kurduğumuz DevSecOps uyumlu "Local JWT" altyapısı kullanılacaktır. Firebase Authentication sadece Google Login arayüzü için kullanılacak, ancak üretilen ID Token backend tarafında doğrulanıp (`Google.Apis.Auth`), lokal `HttpOnly` çerez JWT'si ile takas edilecektir.

### 5. Otonom Ajan Yönetimi Kuralları
- Ajanların mimari sınırları zorlamasını engellemek için `AGENTS.md` dosyası 4-5 maddelik "Ana Vizyon" özetinden oluşacaktır. 
- Katmanlar arası kurallar metinle değil, Derleyici (Compiler) seviyesinde referans engelleriyle çözülecektir. Hata durumunda derleyici ajanı uyaracaktır.

---
### 6. Mobil (Capacitor) ve Mağaza Yayın Kriterleri (App Store & Play Store)
Web uygulaması Capacitor ile iOS ve Android için derleneceği zaman, mağaza kuralları ve native güvenlik standartları gereği aşağıdaki kurallara KESİN olarak uyulacaktır:

*   **Mobil Auth ve Apple Kuralı:** Web'de kullanılan yönlendirmeli (redirect) OAuth mantığı mobilde kullanılmayacaktır. Capacitor ortamında `capacitor-community/google-sign-in` gibi Native (yerel) eklentiler kullanılacaktır. En kritik kural: App Store politikaları gereği, uygulamanın iOS derlemesinde "Apple ile Giriş Yap" (Sign in with Apple) seçeneği ZORUNLU olarak eklenecektir.
*   **Mobil Token Saklama (Güvenlik Kasa Geçişi):** Web tarafında JWT'ler `HttpOnly Cookie` ile korunur. Ancak mobil WebView'ler harici çerezleri yuttuğu veya engellediği için, Capacitor derlemesinde Token'lar KESİNLİKLE telefonun donanımsal şifreli kasasında (iOS Keychain / Android Keystore) Capacitor Secure Storage eklentisiyle saklanacak ve API isteklerine `Authorization: Bearer <token>` olarak manuel eklenecektir. Uygulama, çalışma ortamını (Web vs. Native) tespit edip bu çift modlu (Dual-mode) Auth stratejisini otomatik yönetecektir.
*   **CORS ve Origin İzinleri:** C# Backend CORS politikası, mobil uygulamaların sorunsuz iletişim kurabilmesi için Capacitor'un yerel origin'lerine (`capacitor://localhost` ve `http://localhost`) kesinlikle izin verecektir.
*   **Kullanıcı Arayüzü (UI) Native Hissiyatı:** Mobil arayüzde ekran çentikleri ve dinamik adalar (Dynamic Island) için CSS `env(safe-area-inset-top)` ve `safe-area-inset-bottom` kuralları eksiksiz uygulanacaktır. Tarayıcı esnemesi (bounce), metin seçimi ve dokunma vurgusu (tap-highlight) sistem genelinde kilitli (disabled) kalmaya devam edecektir.

### 7. SaaS İş Modeli ve Telemetri (Geo-IP Tabanlı Dinamik Kota)
- **Kural:** Müşterilerin (özellikle öğretmenlerin) bulunduğu coğrafyaya göre "Zaman vs. Para" değerleri değiştiği için sistem Geo-IP bazlı asenkron bir kota yönetimi (Quota Management) kullanacaktır.
- **Geo-IP Reklam Stratejisi:** Türkiye (TR) gibi gelişmekte olan pazarlarda, kotası dolan kullanıcılara "Ödüllü Reklam" (Rewarded Video) seçeneği sunularak ekstra kazanılmış kredi (Earned Limit) sağlanacaktır. ABD ve Avrupa gibi zamanın değerli olduğu pazarlarda ise reklam tamamen devre dışı bırakılıp doğrudan "Premium Aboneliğe Geç" teklifi (Upsell) yapılacaktır. (Bölge tespiti Cloudflare veya IP başlıkları üzerinden yapılacaktır.)
- **Hizmet İçi (In-Service) Kota Kontrolü:** Olası "Race Condition" (Eşzamanlı 50 istek atarak kotayı eksiye düşürme) saldırılarını engellemek ve gereksiz kota düşüşünü önlemek adına; kota işlemleri Global Action Filter üzerinden DEĞİL, ilgili servisin (Örn: AI Servisi) hemen öncesinde `IQuotaManager` arayüzü ile atomik olarak yapılacaktır. Hata durumunda kotanın iade edilmesi (Refund) zorunludur.

---
*Projenin mimari ve vizyon kararları tamamlanmıştır. Uygulama aşamasının (Implementation) planına geçilebilir.*

