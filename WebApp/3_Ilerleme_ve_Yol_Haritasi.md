# PlanlamaApp - Proje İlerleme ve Yol Haritası

Bu dosya, projenin başından itibaren tamamlanan adımları ve gelecekte yapılacak tüm aşamaları güncel ve yüksek detay seviyesiyle takip etmek için oluşturulmuştur.

---

## 🟢 Tamamlanan Aşamalar

### 1. Planlama, Risk Analizi ve Mimari Kararlar
- [x] WPF Masaüstü uygulamasının **Modern SaaS (Web + Masaüstü + Mobil)** yapısına dönüştürülmesi kararlaştırıldı (YOL A: React + ASP.NET Core API + Tauri + Capacitor). *(Not: İlerleyen süreçte Tauri'den vazgeçilip sıfırdan yerel WPF .NET 9.0 uygulaması geliştirilmesine karar verilmiştir.)*
- [x] `1_Fikir_Gelisimi_ve_Notlar.md` belgesi oluşturuldu (Vizyon, alternatif teknolojiler, risk analizleri, beyin fırtınaları).
- [x] `2_Netlesmis_Isterler.md` belgesi oluşturuldu (Mimari kurallar, güvenlik standartları, Tech Stack).
- [x] Otonom yapay zeka ajanlarının hata yapmasını sıfırlayan **"Pragmatik Sentez Kararları"** alındı:
  - Veritabanında Dapper + `BaseRepository` (Otomatik `TenantId` interceptor/filtreleme).
  - Frontend stilinde **CSS Modules** (Yan etki yapmayan kapsüllenmiş CSS).
  - Finansal/Kritik uçlarda **Yalın Idempotency** (`IdempotencyKeys` tablosu + Action Filter).
  - Derleyici (Compiler) seviyesinde katman erişim engelleri.
- [x] Proje kök dizinine **`AGENTS.md` (Otonom Ajan Anayasası)** 5 kırmızı çizgi kuralıyla eklendi.

---

### 2. Backend (Faz 1) - Tamamlanan Modüller

#### A) Adım 1: Proje Kurulumu ve Clean Architecture Mimarisi
- [x] `YeniNesilApp/Backend` dizininde `PlanlamaApp.sln` çözümü oluşturuldu.
- [x] .NET 9.0 standartlarında 4 katmanlı Clean Architecture yapısı kuruldu:
  - `PlanlamaApp.Domain` (Class Library - Bağımsız çekirdek)
  - `PlanlamaApp.Application` (Class Library - Sadece Domain bağımlı)
  - `PlanlamaApp.Infrastructure` (Class Library - Application bağımlı)
  - `PlanlamaApp.Api` (ASP.NET Core Web API - Application ve Infrastructure bağımlı)
- [x] `Swashbuckle.AspNetCore` yüklenerek Swagger UI dokümantasyonu aktif edildi.
- [x] Çözümün **0 Hata, 0 Uyarı** ile derlendiği doğrulandı.

#### B) Adım 2: Multi-Tenant BaseRepository Entegrasyonu (AI-Proof)
- [x] `PlanlamaApp.Infrastructure` katmanına `Dapper` (v2.1.79) ve `Microsoft.Data.Sqlite` (v10.0.10) paketleri eklendi.
- [x] `PlanlamaApp.Application/Interfaces/ITenantProvider.cs` arayüzü tanımlandı.
- [x] `PlanlamaApp.Infrastructure/Repositories/BaseRepository.cs` sınıfı kodlandı:
  - Tüm `SELECT`, `UPDATE`, `DELETE` sorgularına otomatik `WHERE TenantId = @TenantId` / `AND TenantId = @TenantId` enjekte eder.
  - `INSERT` sorgularında `TenantId` bulunmasını zorunlu kılar; yoksa işlemi veritabanına göndermeden `InvalidOperationException` fırlatır.
- [x] CS8625 / CS8603 Nullable derleyici uyarıları düzeltildi (0 Hata, 0 Uyarı).

#### C) Adım 3: Güvenlik, Eşetkisellik (Idempotency) ve Auth Katmanı
- [x] `PlanlamaApp.Domain/Entities/IdempotencyKey.cs` entity'si oluşturuldu.
- [x] `PlanlamaApp.Application/Interfaces/IIdempotencyRepository.cs` arayüzü yazıldı.
- [x] `PlanlamaApp.Infrastructure/Repositories/IdempotencyRepository.cs` sınıfı `BaseRepository`'den türetilerek yazıldı.
- [x] `PlanlamaApp.Api/Filters/IdempotencyFilter.cs` (ActionFilter) yazıldı:
  - POST ve PUT isteklerinde `Idempotency-Key` header'ını doğrular.
  - Mükerrer istekleri `Conflict (409)` yanıtıyla otomatik engeller.
- [x] `Microsoft.AspNetCore.Authentication.JwtBearer` (v9.0.0) paketi kuruldu ve Firebase Auth JWT doğrulaması `Program.cs`'e eklendi.
- [x] IP bazlı `FixedWindowLimiter` (Dakikada 100 istek limiti) Rate Limiting middleware'i `Program.cs`'e eklendi.
- [x] Backend çözümü **0 Hata, 0 Uyarı** ile sorunsuz derlendi.

---

### 3. Frontend (Faz 2) - Tamamlanan Modüller

#### A) Adım 1: Proje Kurulumu ve Paket Entegrasyonu
- [x] `YeniNesilApp/Frontend` dizininde Vite + React projesi (`create-vite`) scaffold edildi.
- [x] `firebase` SDK ve `lucide-react` ikon paketleri yüklendi.

#### B) Adım 2: Tasarım Sistemi (CSS Modules) ve Temalandırma
- [x] `src/styles/variables.css` oluşturuldu (Dark/Light mode renk paletleri, lokal CSS değişkenleri ve akıcı geçiş animasyonları).
- [x] `src/index.css` oluşturuldu (Global CSS resetleri, Inter Google Font entegrasyonu).
- [x] Spagetti kod ve stil çakışmalarını önlemek için tamamen **CSS Modules** mimarisine geçildi.

#### C) Adım 3: Firebase Auth & Kullanıcı Arayüzü
- [x] `src/config/firebase.js` (Firebase SDK başlatılması, Google Auth Provider).
- [x] `src/services/authService.js` (Google ile giriş, E-Posta/Şifre ile giriş, Kayıt Olma, Çıkış Yapma servisleri).
- [x] `src/components/Auth/AuthModal.jsx` & `AuthModal.module.css` (Modal animasyonlu, CSS Modules ile kapsüllenmiş modern giriş penceresi).

#### D) Adım 4: API Servisleri ve Idempotency Interceptor
- [x] `axios` paketi projeye kuruldu.
- [x] `src/services/apiClient.js` yazıldı:
  - Otomatik `Authorization: Bearer <JWT Token>` eklenmesi.
  - POST ve PUT gibi kritik isteklerde `crypto.randomUUID()` ile otomatik `Idempotency-Key` üretilip Header'a koyulması.
  - 409 Conflict (Mükerrer İstek) ve 429 Rate Limit yanıtlarının merkezi takibi.
- [x] `src/services/taskService.js` ve `src/services/categoryService.js` API haberleşme servisleri kodlandı.
- [x] `npm run build` ile üretim paketi sorunsuz doğrulandı (0 Hata, 0 Uyarı).

#### E) Adım 5: Mobil Native Zırhı ve PWA Altyapısı
- [x] `vite-plugin-pwa` kurularak Service Worker (çevrimdışı önbellek) yapılandırıldı.
- [x] `favicon.svg` kullanılarak Chrome/Android için tam ekran (Standalone) App yetkisi alındı.
- [x] Global `100dvh`, `overflow: hidden`, `overscroll-behavior-y: none` kurallarıyla tarayıcı esnemesi (bounce) tamamen kilitlendi.
- [x] Metin seçimi (`user-select: none`) ve dokunma parlaması (`tap-highlight`) engellenerek %100 Native mobil hissiyatı sağlandı.
- [x] `framer-motion` ile `BottomNav` ve `MobileLayout` inşa edildi (Shared Layout animasyonlu menü).

---

### 4. Sarmalayıcılar (Faz 3) - Masaüstü ve Mobil Paketleme Altyapısı
- [x] **Tauri (Masaüstü .exe):** `@tauri-apps/cli` paketi yüklendi. `src-tauri/tauri.conf.json` konfigürasyonu tamamlandı. `npm run tauri` betiği eklendi.
- [x] **Capacitor (Mobil iOS & Android):** `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios` paketleri yüklendi. `capacitor.config.json` oluşturuldu. `cap:sync`, `cap:add:android` ve `cap:add:ios` betikleri `package.json`'a eklendi.

---

## 🟡 Sıradaki Aşamalar (Yol Haritası)

### Faz 1: Backend İş Mantığı
- [x] **Adım 4: Domain Modellerinin Yeni Vizyon ile Oluşturulması**
  - Yeni SaaS Eğitim vizyonuna göre 4 entity `PlanlamaApp.Domain/Entities` katmanına eklendi:
  - `AppUser.cs` → "Udemy Modeli" esnek rol sistemi (Role geçişi) + Onboarding sihirbazı için `Preferences` (JSON) alanı.
  - `Category.cs` → Ders/Konu hiyerarşisi için kendine referans veren `ParentId` + Şablon klonlama (`IsFromTemplate`) desteği. `TenantId` zorunlu.
  - `TaskItem.cs` → Eğitim odaklı alanlar (`TaskType`, `Deadline`, `IsTeacherAssigned`, `TargetCount`) + Geleceğe hazır `Metadata` (JSON) alanı. `TenantId` zorunlu.
  - `PerformanceRecord.cs` → Doğru/Yanlış/Boş sayıları ve `NetScore`, `TaskItem` ve `Category` ile ilişkili. `TenantId` zorunlu.
- [x] **Adım 5: Repository Interface'leri**
  - `ITaskRepository.cs` → Timeline için tarih aralığı sorgulama ve `MarkAsCompletedAsync` dahil (Application katmanı).
  - `ICategoryRepository.cs` → Hiyerarşik sorgular + Onboarding için `CloneTemplateAsync` (Application katmanı).
  - `IPerformanceRepository.cs` → Kullanıcı/Görev/Kategori/Tarih bazlı analitik sorgular (Application katmanı).
  - ✅ `dotnet build` → **0 Hata, 0 Uyarı** ile doğrulandı.
- [x] **Adım 6: API Controller ve Endpoints**
  - `TasksController.cs` → 8 uç: GET (by user/category/id/timeline), POST, PUT, PATCH (/complete), DELETE. `[Authorize]` + `[ServiceFilter(IdempotencyFilter)]`.
  - `CategoriesController.cs` → 7 uç: GET (roots/children/id), POST, PUT, POST (/clone-template), DELETE. `[Authorize]` + `[ServiceFilter(IdempotencyFilter)]`.
  - `PerformanceController.cs` → 8 uç: GET (by user/task/category/id/report), POST, PUT, DELETE. `[Authorize]` + `[ServiceFilter(IdempotencyFilter)]`.
  - `TaskRepository`, `CategoryRepository`, `PerformanceRepository` → `AddScoped` ile `Program.cs`'e kaydedildi.
  - `IdempotencyFilter` → `AddScoped<IdempotencyFilter>()` ile DI container'a eklendi.
  - ✅ `dotnet build` → **0 Hata, 0 Uyarı** ile doğrulandı.
- [x] **Adım 7: SaaS İş Modeli - Telemetry ve Geo-IP Kota Altyapısı**
  - `UsageTracking.cs` Entity ve veritabanı tablosu `EarnedLimit` ve `EarnedLimitExpiration` alanları ile güçlendirildi.
  - Olası eşzamanlı limit aşımı (Race Condition) saldırılarına karşı atomik SQLite UPSERT sorgusu ile `IUsageTrackingRepository.cs` metodları kurgulandı.
  - Global Action Filter yerine "Hizmet İçi (In-Service)" çalışan `IQuotaManager` arayüzü kuruldu. Başarısız isteklerde "Refund" (Kotayı iade etme) telafi sistemi kodlandı.
  - `QuotaController.cs` yazılarak Geo-IP (TR vs US/EU) bazlı reklam gösterimi (`AdsEnabled`) ve "Rewarded Video" üzerinden `+5` kredi kazandıran uç (Endpoint) oluşturuldu.
  - ✅ `dotnet build` → **0 Hata, 0 Uyarı** ile doğrulandı.

### Faz 2: Frontend İleri Entegrasyon
- [x] **Adım 6: Görev ve Kategori Yönetimi Arayüzleri (Mobile-First Dashboard)**
  - `Dashboard.jsx` → Timeline, DashboardSummary ve SmartAssistant bileşenlerini birleştiren ana sayfa. `user` prop'u ile kişiselleştirilmiş selamlama + görev istatistik pilleri.
  - `Timeline.jsx` → Framer Motion `staggerChildren` animasyonlu dikey zaman çizelgesi. 5 renk teması (Blue/Green/Orange/Purple/Red). `IsTeacherAssigned` rozeti + tamamlanmış görev stili. Sahte (mock) verilerle test edilebilir.
  - `SmartAssistant.jsx` → Safe area uyumlu FAB butonu. Framer Motion `layoutId` Container Transform ile butonu açılan 3 adımlı Onboarding Sihirbazı (Ülke → Sınav → Sınıf). İlerleme çubuğu ve adım göstergesi.
  - `DashboardSummary.jsx` → `whileInView` scroll tetiklemeli 2 kart: SVG dairesel ilerleme grafiği (Framer Motion stroke animasyonu) ve konu bazlı Net Skor çubuk grafiği. Her kartta `···` menü butonu.
  - `BottomNav.jsx` → `activeTab`/`onTabChange` prop'larıyla App.jsx'e state lifting uygulandı.
- [x] **Adım 8: Gerçek API Entegrasyonu ve Veri Senkronizasyonu**
  - `taskService.js` → `getTimeline` (GET `/api/tasks/user/{userId}/timeline`), `completeTask` (PATCH `/api/tasks/{id}/complete` & POST `/api/performance`) Idempotency korumalı metodları eklendi.
  - `apiClient.js` → Interceptor `PATCH` isteklerine otomatik `Idempotency-Key` üretecek şekilde güncellendi.
  - `Timeline.jsx` → `useEffect` ile gerçek API verilerini çekme, yüklenme/hata durum takibi, tamamlama sonrası Optimistic UI güncellemesi sağlandı.
  - ✅ `npm run build` → **0 Hata, 0 Uyarı**, 665ms derleme hızı.
- [x] **Adım 9: Çevrimdışı (Offline-First) IndexedDB Entegrasyonu**
  - Kısıtlı `localStorage` mimarisi tamamen asenkron `localforage` (IndexedDB) yapısına geçirildi.
  - `src/utils/indexedDB.js` oluşturularak `cache_data` (okuma yedeği) ve `offline_queue` (çevrimdışı işlem kuyruğu) depoları kuruldu.
  - `taskService.js` yeniden yazılarak "Network-First (Fallback to Cache)" okuma stratejisi ve "Queue & Optimistic UI" yazma stratejisi entegre edildi.
  - `syncService.js` ile internet geldiğinde (online event) kuyruğun arka planda otomatik senkronize edilmesi (Background Sync) sağlandı.
  - Eski Firebase `auth.currentUser` bağımlılığı sökülerek, yeni kurulan Local JWT ve State (subscribeToAuthChanges) yapısına geçildi.

- [x] **Adım 10: Güvenlik Sıkılaştırma, Wi-Fi Host ve Portability İyileştirmeleri (30 Temmuz)**
  - `start-wifi-host.ps1` native PowerShell scripti stabilize edildi, IP algılama ve `.env` oto-güncelleme sorunsuz hale getirildi.
  - `IdempotencyFilter.cs` üzerinde **Race Condition (Milisaniyelik Çift Tıklama)** testi (Mutation Testing) yapıldı. Ciddi bir güvenlik/veri çakışması açığı (500 Error) tespit edildi.
  - Filtre içerisine `SemaphoreSlim` ile "In-Memory Lock (Bellek İçi Kilitleme)" kurgulandı. Aynı saniyede gelen mükerrer istekler %100 başarıyla `409 Conflict` dönerek durduruldu.

### 5. Ekstra İleri Seviye Özellikler (Gizli Tamamlananlar)
- [x] **SignalR WebSocket (Real-Time):** `AppHub.cs` üzerinden Çalışma Alanı bazlı anlık iletişim omurgası kuruldu.
- [x] **AI Asistan (Gemini & OpenAI) Altyapısı:** `AiController.cs`, kotalar, IDOR güvenlik testleri ve OpenAI `GeneratePlan` entegrasyonu eksiksiz kodlandı.
- [x] **R2 Storage Çöp Toplayıcı (Cron Job):** `StorageMaintenanceService.cs` ile her 1 saatte bir öksüz/yarım kalmış dosyaları temizleyen arkaplan servisi (Background Service) yazıldı.
- [x] **Zincirleme Görev Altyapısı:** `TaskRepository.cs` üzerinde `ChainId` ve `ChainOrder` ile görevlerin yarına devredilmesi/ertelenmesi için veritabanı ve Dapper iskeleti kuruldu.
- [x] **Fly.io Cloud Deployment:** Sunucu Docker imajları ve CI/CD `fly.toml` bulut dağıtım altyapısı hazırlandı.

---

## 🟡 Sıradaki Aşamalar (Yol Haritası)

### Faz 3: Çoklu Kullanıcı (Multi-Tenant) ve Yönetim Paneli
- [x] **Adım 1: Firebase Authentication Entegrasyonu:**
  - Firebase projeye dahil edilecek, kullanıcı kayıt ve giriş mekanizması kurulacak.
- [x] **Adım 2: Admin Paneli ve Rol Yönetimi:**
  - Ana kullanıcı (Siz) sisteme "Admin" rolüyle ekleneceksiniz.
  - Diğer normal kullanıcıların (öğrenciler/veliler) sisteme eklenebileceği form ve altyapı hazırlanacak.
  - Admin için, tüm kullanıcıların özet verilerini / kayıtlarını yönetebileceği temel bir Yönetici (Dashboard) paneli tasarlanacak.
- [x] **Adım 3: Canlı Veri İzolasyonu Testi:**
  - Eklenen yeni kullanıcılarla birlikte sistemde kısa bir canlı test yapılıp, her kullanıcının sadece kendi verisini gördüğü doğrulanacak (Multi-tenant izolasyonu).
- [x] **Adım 4: Güvenlik, R2 Depolama (Storage) ve Kullanım İzleme (Usage Metrics):**
  - Neon veritabanı entegre edildi. Cloudflare R2 için S3 uyumlu dosya yükleme servisi yazıldı.
  - Path traversal, Idempotency expiry, Partitioned RateLimiter gibi ileri güvenlik yamaları eklendi.
  - AuthController'dan "hacker_test" açık kapısı (backdoor) kaldırıldı.
  - Admin panelinde kullanıcıların dosya depolama kullanım kapasitesi (Byte -> MB dönüştürülerek) gösterildi.

### Faz 4: İş Mantığı, Görev Detayları ve Rol Tabanlı Özellikler (Domain Logic)
- [x] **Görev (Task) Yönetimi ve Dosya Entegrasyonu:**
  - [x] Dosya Yükleme (File Upload) Popup ve Native Seçici entegrasyonu (Description desteği ile).
  - [x] R2 Storage için `upload-url`, doğrudan PUT yükleme ve `confirm-upload` ile veritabanına (`WorkspaceFiles`) yazılması.
  - [x] Dosyaları `TaskFileAttachments` tablosuna bağlamak için Backend mantığı.
  - [x] Takvim/Görev detay ekranında "Ekli Dosyalar" gösterimi ve indirme / presigned URL mantığı.
  - [x] Davet Kodlarının (Invite Codes) ve `JoinWorkspaceModal` akışının test edilip doğrulanması.
- [x] **Görev Aksiyonları ve Gelişmiş Takip (Kısmi Tamamlama & Yönetici Kontrolü):**
  - [x] Görev erteleme, öteleme, süre uzatma gibi aksiyonlar frontend'de `TaskActionModal` (⋮ İşlem Butonu) üzerinden kodlandı.
  - [x] **Kısmi Tamamlama Akışı:** Üye veya yönetici hedefin bir kısmını (Örn: 50 sorunun 20'sini) yaptığında, orijinal görev 20 ile "Tamamlandı" işaretlenip, kalan 30 soru yarına "Bekliyor" durumunda yeni (klon) görev olarak otomatik atanacak şekilde mimari kuruldu. İstemci tarafında `Date.now()` tabanlı geçici ID'ler kullanıldı.
  - [x] **Yönetici ve Atayan (Owner & Assigner) Yetkileri:** Yöneticilerin ve görevi atayanların, Workspace ve Takvim detay modallarında başkasının görevini "Tamamla / Ertele / Kısmi Yap" özellikleriyle yönetebilmesi sağlandı.
  - [x] **Multi-Tenant Bypass (Backend):** `BaseRepository` kurallarını aşıp farklı tenant'lardaki görevlere ulaşabilmek için `TaskRepository` içinde `_dbConnection` ile Dapper ham SQL metodları (`UpdateByAssignerAsync`, `MarkAsCompletedByAssignerAsync` vb.) yazıldı. IDOR korumaları `AssignedBy` kolonuna göre esnetildi.
  - [x] **Bilinen Sorun (Senkronizasyon) - Kısmen Çözüldü:** Üyenin kendi görevini "Tamamla" dediğinde UI'ın tepki vermemesi sorunu (Backend'deki PostgreSQL `IsCompleted = 1` boolean tip hatası - `TRUE/FALSE` olarak) düzeltildi. Yönetici ve atayanın yaptığı güncellemelerin, üye ekranlarına SignalR `WorkspaceTasksUpdated` olaylarıyla pürüzsüz ve anında yansıması konusunda (State ve event mantığındaki kopukluk) ilerleme kaydediliyor.
    - *(Mimari Fikir: Görev tablosuna bir `TaskType` kolonu ekleyip, "Ödev" seçildiğinde doğru/yanlış sayılarını ayrı bir JSON sütununda (`TaskDetails`) veya `HomeworkDetails` tablosunda tutarak ana tabloyu temiz bırakabiliriz.)*
- [ ] **Rol ve Ekip (Team) Altyapısı:** 
  - Öğretmen - Öğrenci - Veli ekiplerinin (bağlantılarının) nasıl kurulacağının kodlanması.
  - Rollerin tam yetki (Authorization) detaylarının belirlenmesi.
    - *(Mimari Fikir: Tenant = Sınıf/Kurum yapısı kurularak; Öğretmen (Admin), Öğrenci (User), Veli (Salt-Okunur Gözlemci) yapılabilir. Veliler bir davet koduyla `StudentTeacherRelation` tablosu üzerinden öğrenciye düğümlenebilir.)*
- [ ] **Performans Hesaplama:**
  - Öğrencilerin ana sayfada gösterilen başarı/performans istatistiklerinin (Örn: net hesaplama, bitirme oranı) arka plan algoritmalarının yazılması.
    - *(Mimari Fikir: Performans hesaplamaları sunucuyu yormamak için "Olay Güdümlü (Event-Driven)" kurgulanabilir. Öğrenci görev kaydettiğinde arka plan servisi tetiklenir, `StudentPerformance` (Karne) tablosu güncellenir. Ana sayfa sadece hazır hesaplanmış bu tabloyu okur.)*
- [ ] **Öğretmen Finans / Ödeme Paneli (Premium Özellik):**
  - Öğretmenlerin aldıkları veya alacakları ödemeleri girebilecekleri, takip edebilecekleri finansal bir dashboard oluşturulması.
    - *(Mimari Fikir: Bu özellik ticari SaaS dönüşümü için çok değerlidir. Ayrı bir `PlanlamaApp.Finance` modülü ile ödeme yaklaşınca veliye/öğrenciye otomatik "Ödemeniz yaklaşıyor" bildirimi atacak altyapı kurgulanırsa öğretmenlerin premium paket alma olasılığı ciddi şekilde artar.)*

### Faz 5: Sarmalayıcılar ve Paketleme (Cross-Platform Deployment)
- [ ] **Masaüstü (PC) Uygulaması (WPF):** *(Değişiklik: Orijinal plandaki Tauri wrapper iptal edildi).* Sıfırdan .NET 9.0 ve C# ile MVVM mimarisine uygun native Windows uygulaması geliştirilecek.
- [ ] **Mobil Paketleme & Senkronizasyon (Capacitor):** iOS ve Android projelerini senkronize etmek (`npm run cap:sync`) ve cihaz testlerini gerçekleştirmek.

### Faz 6: İleri Düzey SaaS Özellikleri
- [ ] **İleri Düzey Analitik & Gelişim Grafikleri:** Öğrencilerin haftalık net değişimlerini, konu bazlı başarı oranlarını ve hedef sapmalarını gösteren grafiksel analizler.
- [ ] **Ödeme Altyapısı Entegrasyonu (Iyzico / Stripe):** Abonelik modeli ve ödeme altyapısı entegrasyonu hazırlıkları.
- [ ] **Gemini API JSON Haritalaması:** AI Asistan altyapısının büyük kısmı bitmiş olmasına rağmen, OpenAI JSON şema standartlarının Gemini'ın `functionDeclarations` formatına çevrilmesi (`GeminiProvider.cs`) kodlanacak.

---
*Son Güncelleme Tarihi: 29 Ağustos 2026*
