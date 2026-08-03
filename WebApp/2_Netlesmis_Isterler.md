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
### 8. Uygulama Vizyonu, Ekip/Grup Sistemi ve Rekabet Analizi

Bu bölüm, uygulamanın temel iş modelini, kullanıcı katmanlarını, ekip (grup) yapısını, görev zincirleme mekanizmasını, öğretmen panelini ve pazar analizini netleştirir.

---

#### 8.1. Kullanıcı Katmanları ve Erişim Modeli

Uygulamaya ilk girişte herkes **Kullanıcı** statüsündedir. Kullanıcılar arasında yetki farkı yoktur; fark yalnızca giriş yöntemi ve platform bazlıdır.

| Katman | Giriş Yöntemi | Web | Native (iOS/Android) |
| :--- | :--- | :--- | :--- |
| **Kayıtsız (Misafir)** | Giriş yapmadan kullanım | ✅ Tüm özellikler açık | ✅ Tüm özellikler açık, **reklam gösterilir** |
| **Kayıtlı (E-posta)** | E-posta + şifre veya Google Login | ✅ Tüm özellikler açık | ✅ Tüm özellikler açık, **reklam gösterilir** |
| **Premium** | Kayıtlı kullanıcı + abonelik satın alma | ✅ (Web'de premium ayrımı yok) | ✅ **Reklam yok** + ek premium özellikler |

**Premium Fiyatlandırma Modeli (Native):**
- İlk ay **tanıtım/indirimli** fiyat (Örn: ₺29,99 veya $1,99).
- Sonraki aylar **normal fiyat** (Örn: ₺59,99 veya $4,99/ay).
- Kampanya bazlı esnek indirimler (yıllık paket, okula dönüş kampanyası, vb.) desteklenecektir.
- Premium özelliklere örnekler: Reklamsız kullanım, gelişmiş analitik raporlar, sınırsız dosya yükleme kapasitesi, AI destekli öneriler.

**Web Uygulaması Maliyet Tahmini (~60 kullanıcı):**

| Hizmet | Plan | Aylık Maliyet | Açıklama |
| :--- | :--- | :--- | :--- |
| Cloudflare Pages (Frontend) | Free | **$0** | Sınırsız statik hosting, Pages Functions dahil |
| Neon PostgreSQL (Veritabanı) | Free | **$0** | 100 compute-saat/ay, 0.5 GB depolama, kullanılmadığında kapanır |
| Fly.io (Backend API) | Pay-as-you-go | **~$3–5** | Ücretsiz katman kaldırıldı; minimum VM maliyeti |
| Cloudflare R2 (Dosya Depolama) | Free | **$0** | 10 GB depolama, $0 egress |
| **TOPLAM** | | **~$3–5/ay** | 60 kullanıcı için neredeyse sıfır maliyet |

> **Not:** Fly.io ücretsiz katmanını kaldırdı. Alternatif olarak Render veya Railway değerlendirilebilir; ancak mevcut backend mimarimiz (ASP.NET Core + Docker) Fly.io ile en uyumlu yapıdadır.

---

#### 8.2. Ekip (Grup) Sistemi — "Herkes Kullanıcı, Lider Olan Yönetir"

Kullanıcılar arasında sabit bir "öğretmen" veya "öğrenci" rolü **yoktur**. Bir kullanıcı ekip oluşturduğunda otomatik olarak o ekibin **Lideri (Yöneticisi)** olur. Bu yapı sayesinde uygulama öğretmen-öğrenci ilişkisinin ötesinde, antrenör-sporcu, mentor-stajyer gibi tüm lider-üye dinamiklerine uyum sağlar.

**Roller ve Yetki Matrisi:**

| Rol | Nasıl Edinilir? | Temel Yetkiler |
| :--- | :--- | :--- |
| **Kullanıcı** | Kayıt ile otomatik | Kendine görev girme, kendi takvimini yönetme, kendi verilerini görme |
| **Lider (Ekip Yöneticisi)** | "Ekip Oluştur" butonuyla | Üyelere görev atama, ödev gönderme, sonuç girme, üye bilgilerini yönetme, ödeme takibi |
| **Üye** | Davet kodu / link ile katılım | Atanan görevleri görme/tamamlama, kendine görev ekleme, kendi performansını izleme |
| **Gözlemci (Veli/İzleyici)** | Üye tarafından davet edilir | Salt okunur erişim — üyenin görevlerini, ödevlerini ve performans raporlarını görebilir |

**Ekip Yapısı Veri Modeli (İleriye Dönük):**
- `Team` tablosu: `Id`, `Name`, `LeaderUserId`, `InviteCode`, `CreatedAt`.
- `TeamMember` tablosu: `TeamId`, `UserId`, `Role` (Member/Observer), `JoinedAt`.
- Bir kullanıcı **birden fazla ekipte** hem lider hem üye olabilir (Örn: Bir öğretmen kendi ekibini yönetirken, başka bir öğretmenin ekibinde üye/gözlemci olabilir).

---

#### 8.3. Görev Sistemi — Tekil ve Zincir (Bağlı) Görevler

**Tekil Görevler:** Bağımsız, tek başına duran görevlerdir. Ertelendiğinde sadece kendi tarihi değişir.

**Zincir (Bağlı) Görevler — Kaskad Erteleme Mekanizması:**
Görevler birbirine bağlanarak bir "zincir" oluşturabilir (Örn: "Konu Çalış → Test Çöz → Yanlışları Tekrarla"). Zincirleme görevlerde erteleme yapıldığında sistem şu akışı izler:

```
[Kullanıcı "Konu Çalış" görevini erteler]
        │
        ▼
 ┌─────────────────────────────────────────┐
 │   Bu görev bir zincirin parçası.         │
 │   Sonraki görevler de ertelensin mi?     │
 │                                          │
 │   [A] Sadece bu görevi ertele            │
 │   [B] Tüm zinciri ertele                │
 └─────────────────────────────────────────┘
        │                    │
     Seçenek A            Seçenek B
        │                    │
        ▼                    ▼
  Sadece seçilen         Tüm zincir, istenen
  görev bir sonraki      tarihten başlayacak
  güne VEYA girilen      şekilde toplu olarak
  tarihe ötelenir.       kaydırılır. Görevler
  Diğerleri yerinde      arasındaki gün farkları
  kalır.                 korunur.
```

**Veri Modeli Notu:**
- `TaskItem` tablosuna `ChainId` (nullable, int) ve `ChainOrder` (int) alanları eklenecek.
- Aynı `ChainId`'ye sahip görevler `ChainOrder`'a göre sıralanır.
- Erteleme işlemi yapılırken `OriginalDueDate` alanı korunarak "ne kadar ertelendiği" takip edilebilir.

---

#### 8.4. Ödev ve Performans Takibi

**Lider (Öğretmen) Tarafı:**
- Üyelere (öğrencilere) görev atayabilir ve dosya ekleyebilir (PDF, resim — Presigned URL üzerinden R2'ye yüklenir).
- Ödev kontrolü yapabilir ve sonuçları girebilir:
  - **Test/Deneme formatı:** Doğru, Yanlış, Boş sayıları → Otomatik Net hesaplama.
  - **Klasik yazılı formatı:** 0-100 arası not girişi, isteğe bağlı yorum.
- Tüm sonuçlar `PerformanceRecord` tablosunda saklanır.

**Üye (Öğrenci) Tarafı:**
- Atanan görevleri ve ödevleri görür, tamamlayabilir.
- Kendine de görev ekleyebilir (kişisel çalışma planı).
- Kendi performans geçmişini ve grafiklerini izleyebilir.

**Gözlemci (Veli) Tarafı:**
- Üyenin (çocuğunun) görevlerini, ödev sonuçlarını ve performans grafiklerini **salt okunur** olarak görür.
- Push bildirim veya e-posta ile düzenli rapor alabilir (ileride).

---

#### 8.5. Öğretmen Yönetim Paneli (Lider Dashboard)

Ekip lideri (öğretmen) için özel bir yönetim paneli sağlanacaktır. Bu panel sadece liderlerin göreceği ek bir sekme/ekran olacaktır:

**A) Ödeme Takibi:**
- Hangi üye (öğrenci) ne zaman ödeme yaptı / yapacak.
- Ödeme durumu: Ödendi ✅ / Bekliyor ⏳ / Gecikmiş 🔴
- Aylık/dönemlik gelir özeti.
- Yaklaşan ödemeler için hatırlatıcı (lider için).

**B) Üye (Öğrenci) Bilgi Kartı:**
- Öğrencinin adı, soyadı.
- Velisinin adı, soyadı, telefon numarası.
- Öğrencinin okulu, sınıfı, genel not ortalaması.
- Öğretmenin ekleyeceği serbest notlar alanı (Örn: "Matematik zayıf, geometriye ağırlık verilmeli").

**C) Performans Raporları:**
- Üyelerin (öğrencilerin) görev tamamlama oranları.
- Test/deneme net değişim grafikleri (haftalık/aylık trend).
- Konu bazlı güçlü ve zayıf yönler.
- Sürekli erteleme yapan üyeler için otomatik uyarı/alarm (Disiplin Takibi).

---

#### 8.6. Rekabet Analizi ve Pazar Araştırması

Aşağıdaki analiz, mevcut rakip uygulamaların güçlü/zayıf yönlerini ve kullanıcı şikayetlerini inceleyerek, bizim uygulamamızın hangi boşlukları doldurabileceğini ortaya koyar.

##### A) Öğretmen / Sınıf Yönetimi Uygulamaları

| Uygulama | Güçlü Yönleri | Zayıf Yönleri / Kullanıcı Şikayetleri |
| :--- | :--- | :--- |
| **ClassDojo** | Veli iletişimi çok güçlü, 190+ dil desteği, davranış puan sistemi | Davranışı "iyi/kötü" ikili puanlara indirgiyor; ortaokul+ öğrenciler için çocuksu (karikatür avatarlar); akademik not defteriyle entegre değil; veri gizliliği endişeleri |
| **Google Classroom** | Ödev dağıtımı ve not verme akışı çok sade; Google Workspace entegrasyonu | Davranış/performans takibi yok; ödeme yönetimi yok; çevrimdışı çalışmıyor; öğrenci-öğretmen dışında veli rolü sınırlı |
| **school+ (TR)** | AI ile deneme analizi, eksik konu tespiti, muhasebe modülü | Karmaşık arayüz; küçük öğretmenler için "çok fazla" özellik; ağır fiyatlandırma |
| **DersTakip (TR)** | TYMM kazanım kütüphanesi, evrak dijitalleştirme (PDF/Word) | Veli arayüzü zayıf; çevrimdışı desteği yok; ödeme takibi eksik |
| **Öğrenci Takip Sistemi+ (TR)** | Öğretmen/öğrenci/veli için 3 ayrı arayüz, ödev kontrolü, ödeme takibi | Teknik kararsızlık (kapanma, sync hataları); destek yetersiz; arayüz eski |

**Rakiplerde Ortak Eksiklikler:**
1. ❌ **Kopuk ekosistemler** — Davranış bir uygulamada, notlar başka yerde, ödemeler Excel'de. Öğretmen 3-4 farklı araç kullanmak zorunda.
2. ❌ **Ödeme takibi ya yok ya da ilkel** — Çoğu uygulamada ödeme modülü yoktur ya da sadece "ödendi/ödenmedi" seçeneğiyle sınırlıdır.
3. ❌ **Çevrimdışı çalışma yok** — Öğretmenler sınıfta internet kesildiğinde uygulamayı kullanamaz.
4. ❌ **Görev zincirleme (bağımlılık) yok** — Hiçbir eğitim uygulaması kaskad erteleme mekanizması sunmuyor.
5. ❌ **Veli rolü ya yok ya salt okunur değil** — Veliler ya hiç sisteme dahil değil ya da çok sınırlı erişime sahip.

##### B) Öğrenci Planlama / Görev Uygulamaları

| Uygulama | Güçlü Yönleri | Zayıf Yönleri / Kullanıcı Şikayetleri |
| :--- | :--- | :--- |
| **Todoist** | Hızlı görev girişi (doğal dil), temiz arayüz, güvenilir sync | Takvim entegrasyonu yüzeysel; proaktif planlama yok; "görev listesi olarak kalıyor, takvime geçmiyor" |
| **TickTick** | Pomodoro zamanlayıcı, alışkanlık takibi, Eisenhower matrisi | Arayüz karmaşık; çok fazla buton/menü; "feature bloat" (özellik şişkinliği) |
| **Any.do** | "Benim Günüm" birleşik görünümü (takvim + görevler) | Temel özellikler (takvim sync) premium'a kilitli; büyük projeleri yönetmede zayıf |
| **Motion** | AI destekli otomatik zamanlama ve yeniden planlama | Çok pahalı ($34/ay); öğrenci bütçesine uygun değil |

**Öğrenci Uygulamalarında Ortak Şikayetler (1-2 Yıldız Yorumları):**
1. 😤 **"Çok fazla manuel giriş"** — Öğrenciler ders programlarını ve ödevleri elle girmekten bıkıyor.
2. 😤 **"Temel özellikler bile ücretli"** — Hatırlatıcı, alt görev gibi basit özellikler premium'a kilitli.
3. 😤 **"Arayüz çok karmaşık"** — Kurulum süresi uzun, öğrenci 2 hafta sonra kullanmayı bırakıyor.
4. 😤 **"Bildirimler ya çok fazla ya da yetersiz"** — İkisi arasında denge kuran uygulama neredeyse yok.
5. 😤 **"Erteleme sistemi yok"** — Görev ertelendiğinde bağlı görevlerin ne olacağı hiçbir uygulamada sorulmuyor.

##### C) Bizim Uygulamamızın Rekabet Avantajları

| Rakiplerde Eksik | Bizim Çözümümüz |
| :--- | :--- |
| Kopuk ekosistemler (3-4 uygulama) | **Tek çatı altında:** görev + ödev + performans + ödeme + iletişim |
| Görev zincirleme ve kaskad erteleme yok | **Zincir görev sistemi:** ertelemede "sadece bu mu, tüm zincir mi?" diye sorar |
| Çevrimdışı destek yok | **Offline-First mimari:** IndexedDB + otomatik arka plan senkronizasyonu |
| Ödeme takibi ilkel veya eksik | **Tam ödeme paneli:** kim ne zaman ödedi, kim gecikti, aylık özet |
| Veli dahil değil | **Gözlemci rolü:** Veli, çocuğunun görev ve performansını salt okunur izler |
| Sabit roller (öğretmen/öğrenci) | **Esnek ekip modeli:** Aynı yapı antrenör-sporcu, mentor-stajyer için de çalışır |
| Reklam politikası belirsiz/adil değil | **Şeffaf model:** Web'de reklam yok; native'de kayıtsız/kayıtlı → reklam var, premium → reklam yok |

---

#### 8.7. İleriye Dönük Notlar (Ekip Genelleştirme)

- Şu an öncelik **öğretmen-öğrenci** senaryosudur. Ancak veri modeli, arayüz metinleri ve iş mantığı "Lider / Üye / Gözlemci" gibi **genel terimlerle** yazılacak; ekran üzerindeki gösterim ise i18n (çoklu dil/ton) sistemiyle kullanıcıya göre özelleştirilecektir (Örn: Öğretmen ayarını seçen kişi "Öğrenci Ekle" görürken, antrenör ayarını seçen "Sporcu Ekle" görecektir).
- `Team.Type` alanıyla (Eğitim, Spor, Mentorluk, Diğer) ekip türleri kategorize edilebilir.
- İleride ekibe özel şablonlar (Eğitim: "Haftalık Ders Planı", Spor: "Antrenman Programı") sunulabilir.

---

### 9. Platform Bazlı İster Sınıflandırması (Web / Mobil / Ortak)

Aşağıdaki tablo, yukarıdaki tüm maddelerin hangi platforma ait olduğunu tek bakışta gösterir. Geliştirme sırasında hangi isterle karşılaşılırsa, hangi platforma yönelik olduğu burada referans alınabilir.

#### 🟢 ORTAK (Web + Mobil — Her İki Platformda Geçerli)

| Madde | İster | Kaynak Bölüm |
| :--- | :--- | :--- |
| 1 | Multi-Tenant İzolasyon (TenantId + BaseRepository) | §1 |
| 3a | Clean Architecture / Vertical Slice mimari | §3 |
| 3b | Interface Zorunluluğu (veritabanı/dış servis) | §3 |
| 3c | Rate Limiting (IP bazlı) | §3 |
| 3d | IDOR koruması (Token Claim tabanlı yetkilendirme) | §3 |
| 3e | Denetim İzi (Audit Logging) | §3 |
| 3f | Idempotency (Mükerrer kayıt engelleme) | §3 |
| 4a | Backend: ASP.NET Core Web API (.NET 9.0) + Dapper + PostgreSQL | §4 |
| 4f | i18n — Çoklu dil ve üslup (Resmi/Samimi/Kanka) | §4 |
| 5 | Otonom Ajan Yönetimi (AGENTS.md + Compiler engelleri) | §5 |
| 7c | Kota kontrolü (IQuotaManager, atomik, Race Condition korumalı) | §7 |
| 8.2 | Ekip (Grup) Sistemi — Lider / Üye / Gözlemci rolleri | §8.2 |
| 8.3 | Görev Sistemi — Tekil + Zincir görevler, kaskad erteleme | §8.3 |
| 8.4 | Ödev ve Performans Takibi (test/yazılı format, net hesaplama) | §8.4 |
| 8.5 | Öğretmen Yönetim Paneli (ödeme, bilgi kartı, raporlar) | §8.5 |

#### 🔵 SADECE WEB

| Madde | İster | Kaynak Bölüm |
| :--- | :--- | :--- |
| 2a | Offline-First: IndexedDB (`localforage`) ile cache/kuyruk | §2 |
| 2b | `window.addEventListener('online')` ile arka plan sync | §2 |
| 3g | JWT'ler `HttpOnly`, `Secure`, `SameSite=Strict` Cookie olarak | §3 |
| 3h | CORS politikaları (web origin'leri) | §3 |
| 4b | Frontend: React (Vite) | §4 |
| 4c | CSS Modules (Global CSS yasak) | §4 |
| 4g | Auth: Firebase Google Login → Backend JWT takas (Cookie) | §4 |
| 8.1a | Web'de tüm özellikler açık, premium/reklam ayrımı yok | §8.1 |
| 8.1b | Web maliyet: ~$3–5/ay (Cloudflare + Neon + Fly.io + R2) | §8.1 |

#### 🟠 SADECE MOBİL (Native — Capacitor / iOS / Android)

| Madde | İster | Kaynak Bölüm |
| :--- | :--- | :--- |
| 4d | Masaüstü: WPF (.NET 9.0) native Windows uygulaması | §4 |
| 4e | Mobil Sarmalayıcı: Capacitor (Android/iOS) | §4 |
| 6a | Native OAuth: `capacitor-community/google-sign-in` + Apple Sign In (iOS zorunlu) | §6 |
| 6b | Token: iOS Keychain / Android Keystore (Secure Storage) + Bearer header | §6 |
| 6c | CORS: `capacitor://localhost` ve `http://localhost` origin izni | §6 |
| 6d | UI Native Hissiyatı: safe-area-inset, bounce/select/tap-highlight kilidi | §6 |
| 7a | Geo-IP Reklam: TR → Rewarded Video, ABD/EU → Premium Upsell | §7 |
| 7b | Ödüllü Reklam ile Earned Limit (ekstra kredi kazanma) | §7 |
| 8.1c | Kayıtsız/Kayıtlı → reklam var; Premium → reklam yok | §8.1 |
| 8.1d | Premium fiyatlandırma: ilk ay indirimli, kampanya desteği | §8.1 |

#### Özet Dağılım

```
 ┌──────────────────────────────────────────┐
 │         ORTAK (15 ister)                 │
 │  Backend API, Güvenlik, Ekip, Görev,     │
 │  Performans, Ödeme, i18n                 │
 ├────────────────────┬─────────────────────┤
 │  WEB (9 ister)     │  MOBİL (10 ister)   │
 │  React/Vite,       │  Capacitor,         │
 │  Cookie JWT,       │  Secure Storage,    │
 │  CSS Modules,      │  Native OAuth,      │
 │  IndexedDB,        │  Reklam/Premium,    │
 │  Offline Sync      │  Safe Area, Geo-IP  │
 └────────────────────┴─────────────────────┘
```

---
*Projenin mimari, vizyon, iş modeli ve platform sınıflandırma kararları tamamlanmıştır. Uygulama aşamasının (Implementation) planına geçilebilir.*

---

### 10. AI Asistanı — Komut Motoru (Premium Özellik)

#### 10.1. Genel Tanım

Kullanıcıların uygulamada elle yapabildiği **her işlemi**, doğal dilde yazarak yaptırabildiği bir AI komut motorudur. Temel fark: **AI asla onaysız hareket etmez.** Her işlem kullanıcıya önce gösterilir, ardından onaylanınca çalıştırılır.

> **Kural:** AI bir işlemi gerçekleştirmeden önce mutlaka ekranda açık, anlaşılır adımlarla ne yapacağını göstermeli ve kullanıcıdan onay almalıdır. Çok adımlı isteklerde her adım ayrı ayrı onaylanabilir.

---

#### 10.2. Mimari — "Planla → Göster → Onayla → Çalıştır"

```
Kullanıcı doğal dil girer
        │
        ▼
AI niyetleri ve adımları çıkarır (Function Calling / Tool Use)
        │
        ▼
 ┌──────────────────────────────────────────────┐
 │  PLAN EKRANDA GÖSTERİLİR                      │
 │                                              │
 │  Adım 1: X grubuna "Türevler.pdf" gönder    │
 │          → 12 öğrenciye, son teslim: Cuma   │
 │                                              │
 │  Adım 2: Y grubuna Pazartesi'den itibaren   │
 │          7 gün boyunca günlük test görevi   │
 │          oluştur (7 ayrı görev)             │
 │                                              │
 │  [Tümünü Onayla]  [Adım Adım]  [İptal]      │
 └──────────────────────────────────────────────┘
        │
        ▼
Kullanıcı "Adım Adım" seçerse her adım için ayrı onay istenir
Kullanıcı "Tümünü Onayla" seçerse tüm adımlar sırayla çalışır
        │
        ▼
İşlemler tamamlanır, özet rapor gösterilir
```

---

#### 10.3. Yetenek Kapsamı — Elle Yapılabilen Her Şey

AI asistanı aşağıdaki tüm işlemleri doğal dil üzerinden yapabilir. Bunlar uygulamadaki mevcut API endpoint'leriyle eşleşir:

| Kategori | Örnek Komut | Arka Planda Çalışan İşlem |
| :--- | :--- | :--- |
| **Görev Oluşturma** | "Yarın için matematik çalışması ekle" | `POST /api/tasks` |
| **Zincir Görev** | "Sınava 3 hafta kala günlük çalışma zinciri oluştur" | Birden fazla `POST /api/tasks` (ChainId ile) |
| **Toplu Ödev Dağıtımı** | "X grubuna bu PDF'i cumaya kadar gönder" | `POST /api/tasks` (her üye için) + `POST /api/storage/upload-url` |
| **Tekrarlı Görev** | "Y grubuna önümüzdeki hafta her gün 1 test" | 7x `POST /api/tasks` |
| **Erteleme** | "Bu haftaki tüm görevleri 3 gün ertele" | Toplu `PUT /api/tasks/{id}` |
| **Performans Sorgulama** | "Ahmet'in bu ayki net ortallaması kaç?" | `GET /api/performance/report` + AI özetler |
| **Tehlike Raporu** | "Son 2 haftada görevi geç biten öğrencileri listele" | `GET /api/tasks/timeline` + AI filtreler |
| **Ödeme Hatırlatma** | "Ödeme geciken öğrencilere nazik bir mesaj hazırla" | AI metin üretir, öğretmen gönderir |

---

#### 10.4. Onay Davranış Kuralları

1. **Tek adımlı istek:** Tek onay ekranı çıkar. "Onayla" veya "İptal" seçenekleri vardır.
2. **Çok adımlı istek:** Önce tüm plan gösterilir. Kullanıcı "Tümünü Onayla" veya "Adım Adım" seçer.
   - "Adım Adım" seçilirse her adım öncesi onay kutucuğu çıkar, kalan adımlar görünür.
   - Kullanıcı bir adımı reddederse sadece o adım atlanır, diğerleri devam eder.
3. **Geri alınamaz işlemler** (dosya silme, üye çıkarma vb.): Ek bir "Bu işlem geri alınamaz" uyarısı çıkar, metin alanına "ONAYLA" yazılması istenir.
4. **AI hiçbir zaman arka planda sessizce işlem yapmaz.** Onay alınmadan tek satır bile yazılmaz.

---

#### 10.5. Teknik Notlar

- **Model:** Gemini 2.0 Flash (ücretsiz kota) → Web grubunuz (~60 kişi) için yeterli. Native premium büyüdükçe GPT-4o-mini'ye geçilebilir.
- **Yapı:** LLM'e uygulamanın API fonksiyonları "tool" olarak tanımlanır (Function Calling / Tool Use). AI JSON şemasında yanıt verir; backend bu JSON'u execute eder.
- **Kota Yönetimi:** AI Asistanı çağrıları mevcut `IQuotaManager` altyapısından geçer. Ücretsiz kullanıcılar için günlük AI istek limiti uygulanabilir; premium kullanıcılarda limit kaldırılır.
- **Platform:** Web ve Native (Capacitor) üzerinde aynı backend çalışır. Arayüz bileşeni platforma göre ayrıştırılır.
- **Bağlam (Context):** Her AI çağrısında kullanıcının mevcut grubu, aktif dönem ve kendi kimliği sisteme otomatik eklenir. Kullanıcı "X grubu" dediğinde AI hangi grubu kastettiğini bağlamdan anlar.

---

#### 10.6. Platform ve Premium Durumu

| Platform | Durum |
| :--- | :--- |
| **Web (~60 kişi, kendi grubunuz)** | Tüm AI Asistanı özellikleri açık — Gemini ücretsiz kota içinde kalır |
| **Native — Kayıtsız/Kayıtlı** | Kısıtlı (günde X istek limiti, basit sorular için) |
| **Native — Premium** | Sınırsız AI Asistanı erişimi |

---

### 11. İşlem Geçmişi ve Geri Al / İleri Al (Undo / Redo)

#### 11.1. Genel Kural

Kullanıcının elle veya AI asistanı aracılığıyla yaptığı tüm **yazma işlemleri** (oluşturma, düzenleme, silme, toplu atama) sisteme kaydedilir ve **son 5 işlem** geri alınabilir.

> **Kural:** Geri al butonu kullanıcının önüne zorla çıkmaz; ancak ihtiyaç duyduğunda kolayca bulunabilir olmalıdır.

---

#### 11.2. UX — Geri Al Butonu Nasıl Görünür?

**1) İşlem Sonrası Geçici Bildirim (2 saniyelik Toast):**
```
 ╔════════════════════════════════════════╗
 ║  ✅  20 öğrenciye ödev gönderildi.      ║
 ║                         [ Geri Al ]   ║
 ╚════════════════════════════════════════╝
         (2-5 saniye sonra kaybolur)
```
Kullanıcı "Geri Al"a basarsa işlem anında iptal edilir. Toast kaybolduktan sonra geri alma yine menüden yapılabilir.

**2) Menü / Geçmiş Paneli:**
- Profil menüsünde veya ayarlar altında **"İşlem Geçmişi"** sekmesi.
- Son 5 işlem listelenir, her birinin yanında "Geri Al" butonu bulunur.
- "Geri alınan" işlemin yanında "İleri Al" seçeneği çıkar (redo).

**Gösterim Örneği:**
```
İşlem Geçmişi                           [X]
──────────────────────────────────────────
5. Bugün 19:21 — 20 öğrenciye ödev atandı    [Geri Al]
4. Bugün 18:10 — "Türev" görevi düzenlendi   [Geri Al]
3. Bugün 16:45 — Zincir görev oluşturuldu    [Geri Al] ◄ buraya kadar
2. Bugün 15:30 — Ahmet gruba eklendi         (geri alındı) [İleri Al]
1. Bugün 14:00 — 3 görev ertelendi           (geri alındı) [İleri Al]
```

---

#### 11.3. Teknik Yaklaşım — Veritabanı

Her yazma işleminde `ActionHistory` tablosuna bir satır eklenir:

| Alan | Tip | Açıklama |
| :--- | :--- | :--- |
| `Id` | SERIAL | Birincil anahtar |
| `UserId` | TEXT | İşlemi yapan kullanıcı |
| `TenantId` | TEXT | Tenant izolasyonu |
| `ActionType` | TEXT | `CREATE_TASK`, `BULK_ASSIGN`, `DELETE_TASK`, vb. |
| `Payload` | JSONB | Yapılan işlemin tam verisi (geri almak için gerekli) |
| `InversePayload` | JSONB | Geri alma işleminin verisi (önceki hali) |
| `IsUndone` | BOOLEAN | Geri alındı mı? |
| `CreatedAt` | TIMESTAMPTZ | İşlem zamanı |

**Son 5 kural:** `UserId` başına `ROW_NUMBER()` ile sıralanır, 5'ten eski kayıtlar otomatik temizlenir (veya arşivlenir).

---

#### 11.4. Geri Alınabilirlik Matrisi

Her işlem türünün nasıl geri alındığı:

| İşlem | Geri Alma Yöntemi |
| :--- | :--- |
| Görev oluşturma | Oluşturulan görev silinir |
| Görev düzenleme | Önceki değerler `InversePayload`'dan geri yüklenir |
| Görev silme | Görev `InversePayload`'daki veriyle yeniden oluşturulur |
| Toplu ödev atama | Oluşturulan tüm görevler toplu silinir |
| Zincir görev oluşturma | Zincirdeki tüm görevler silinir |
| Üye ekleme | Üyelik kaydı silinir |
| **Dosya yükleme (R2)** | ⚠️ R2'deki fiziksel dosya silinebilir; ancak paylaşılan ve başkası tarafından açılmış dosyalar için uyarı gösterilir |
| **Ödeme kaydı** | ⚠️ Finansal kayıtlarda geri alma özelliği devre dışı — Denetim İzi (Audit Log) korunur |

---

#### 11.5. Kısıtlamalar

- **Limit:** Kullanıcı başına son **5 işlem** geri alınabilir. 6. işlem yapılınca en eski kayıt tarihsel log'a taşınır.
- **Zaman sınırı:** İşlemden **24 saat** sonra geri alma hakkı düşer (isteğe bağlı konfigüre edilebilir).
- **Finansal işlemler geri alınamaz** — Kural 11.4'te belirtildiği gibi.
- **Başkası değiştirdiyse:** Bir görev geri alınmak isteniyor ama başka bir kullanıcı o görevi zaten tamamladıysa, sistem "Bu göreve başka bir kullanıcı müdahale etti, yine de geri almak ister misiniz?" uyarısı gösterir.
