# PlanlamaApp - Proje İlerleme ve Yol Haritası

Bu dosya, projenin başından itibaren tamamlanan adımları ve gelecekte yapılacak tüm aşamaları güncel ve yüksek detay seviyesiyle takip etmek için oluşturulmuştur.

---

## 🟢 Tamamlanan Aşamalar

### 1. Planlama, Risk Analizi ve Mimari Kararlar
- [x] WPF Masaüstü uygulamasının **Modern SaaS (Web + Masaüstü + Mobil)** yapısına dönüştürülmesi kararlaştırıldı (YOL A: React + ASP.NET Core API + Tauri + Capacitor).
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

---

## 🟡 Sıradaki Aşamalar (Yol Haritası)

### Faz 3: Sarmalayıcılar ve Paketleme (Cross-Platform Deployment)
- [ ] **Masaüstü Paketleme (Tauri):** Windows `.exe` çıktısı alıp yerel performansı test etmek (`npm run tauri build`).
- [ ] **Mobil Paketleme & Senkronizasyon (Capacitor):** iOS ve Android projelerini senkronize etmek (`npm run cap:sync`) ve cihaz testlerini gerçekleştirmek.
- [ ] **PWA Canlı Testleri:** Service Worker önbellekleme ve çevrimdışı (offline) kullanım yeteneklerini canlı ortamda sınamak.

### Faz 4: Premium ve Yönetim Özellikleri (SaaS Genişleme Vizyonu)
- [ ] **Eğitmen & Kurum Yönetim Paneli:** Öğretmenlerin öğrencilere toplu görev atayabileceği, finans ve tahsilat durumlarını takip edebileceği yönetim ekranları.
- [ ] **İleri Düzey Analitik & Gelişim Grafikleri:** Öğrencilerin haftalık net değişimlerini, konu bazlı başarı oranlarını ve hedef sapmalarını gösteren grafiksel analizler.
- [ ] **Ödeme Altyapısı Entegrasyonu (Iyzico / Stripe):** Abonelik modeli ve ödeme altyapısı entegrasyonu hazırlıkları.

---
*Son Güncelleme Tarihi: 26 Temmuz 2026*
