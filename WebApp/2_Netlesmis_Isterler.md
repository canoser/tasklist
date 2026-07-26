# Yeni Nesil Planlama Uygulaması - Netleşmiş İsterler

Bu dosya, beyin fırtınası aşamasından geçip onaylanan, geliştirme (kodlama) aşamasında kesinlikle uyulması gereken mimari ve iş kurallarını barındırır.

## Sistem Mimarisi ve Temel Kurallar

### 1. Çoklu Kullanıcı (Multi-Tenant) İzolasyon Stratejisi
- **Seçilen Yöntem:** 2. Seviye İzolasyon (Tek Tablo + TenantId).
- **Kural:** Sistemdeki tüm kullanıcıların verileri aynı havuzda (tablolarda) tutulacaktır. Veritabanı altyapısı olarak **Dapper** kullanılmaya devam edilecektir. Ancak ajanlar SQL yazarken hata yapmasın diye araya bir **"Base Repository"** sınıfı zorunlu tutulmuştur. Bu sınıf, tüm sorgulara otomatik olarak `WHERE TenantId = @id` koşulunu (Interceptor mantığıyla) ekleyecek, güvenlik sistem seviyesinde sağlanacaktır.

### 2. Güvenlik ve Kurumsal Standartlar
- Sistem "Clean Architecture" veya "Vertical Slice" mimarisine uygun, modüler bir yapıda tasarlanacaktır.
- **Interface Zorunluluğu:** Veritabanı ve Dış servis erişimleri sadece Interface'ler üzerinden yapılacaktır.
- API'de IP bazlı **Rate Limiting** (Hız Sınırlandırması) bulunacaktır.
- **Token Yönetimi:** Giriş (Auth) sisteminde kısa ömürlü token'lar (JWT) ve Refresh Token mekanizması kurulacaktır.
- **Denetim İzi:** Kritik veri değişikliklerinde Audit Logging (Denetim İzi) tutulacaktır.
- Arayüz ile API haberleşmesinde CORS politikaları sıkı tutulacaktır.
- **Finansal Güvenlik (Idempotency):** Sadece üyelik ödemesi veya yeni öğrenci kaydı gibi kritik API endpoint'lerine, mevcut veritabanında oluşturulacak bir `IdempotencyKeys` tablosu ve basit bir ActionFilter ile **Yalın Eşetkisellik (Idempotency)** uygulanacaktır. Bu sayede mükerrer kayıtlar %100 engellenecektir.

### 3. Teknoloji Yığını (Tech Stack) - YOL A Kararı
Projenin "Bir Kere Yaz, Her Yerde Çalıştır" mantığıyla inşa edilmesi için aşağıdaki teknoloji yığını kesinleştirilmiştir:
- **Backend (API):** ASP.NET Core Web API (.NET 9.0). Mevcut Dapper ve SQLite altyapısı korunacaktır.
- **Frontend (Web Arayüzü):** React (veya Next.js).
- **Tasarım / Stil:** Yapay zekanın yan etki (side-effect) yaratmaması ve arayüzü HTML çöplüğüne çevirmemesi için arayüz geliştirilirken **CSS Modules** kullanılacaktır. Global CSS yasaktır.
- **Masaüstü (PC) Sarmalayıcı:** Tauri (React projesini hafif bir `.exe`'ye dönüştürmek için).
- **Mobil Sarmalayıcı:** Capacitor (React projesini Android/iOS uygulamasına dönüştürmek için).
- **Kimlik Doğrulama (Auth):** Firebase Authentication (Google Hesabı ile giriş ve E-posta/Şifre seçenekleri).

### 4. Otonom Ajan Yönetimi Kuralları
- Ajanların mimari sınırları zorlamasını engellemek için `AGENTS.md` dosyası 4-5 maddelik "Ana Vizyon" özetinden oluşacaktır. 
- Katmanlar arası kurallar metinle değil, Derleyici (Compiler) seviyesinde referans engelleriyle çözülecektir. Hata durumunda derleyici ajanı uyaracaktır.

---
*Projenin mimari ve vizyon kararları tamamlanmıştır. Uygulama aşamasının (Implementation) planına geçilebilir.*
