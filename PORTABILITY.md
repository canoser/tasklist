# Planlama App - Mobil Port (Native) Geçiş Kılavuzu

Bu doküman, mevcut React Web uygulamasının gelecekte **Capacitor**, **React Native** veya **Flutter** gibi bir framework ile Native mobil uygulamaya (iOS & Android) dönüştürülmesi sırasında yaşanacak mimari engelleri ve bu engellerin nasıl aşılacağını detaylandırır.

Uygulamanın kod tabanında, dönüştürülmesi gereken kritik noktalar `// [MOBILE_PORT_TODO]:` yorum etiketi ile işaretlenmiştir.

## Kritik Dönüşüm Noktaları

| Dosya Yolu | Web Bağımlılığı (Sorun) | Mobil Port Çözümü | Öncelik |
| :--- | :--- | :--- | :--- |
| `WebApp/Frontend/src/services/apiClient.js` | `withCredentials: true` ayarı. Sadece tarayıcılarda `HttpOnly` çerezlerini taşımak için çalışır. | Bu ayar kaldırılıp yerine `Authorization: Bearer <token>` header'ı manuel olarak eklenmeli. Token, cihazın güvenli saklama (Secure Storage) biriminden okunmalıdır. | 🔴 Yüksek |
| `WebApp/Backend/PlanlamaApp.Api/Controllers/AuthController.cs` | `Response.Cookies.Append` ile JWT'nin tarayıcı çerezi (Cookie) olarak set edilmesi. | Native uygulamalar Cookie kabul etmez. Token'ın API yanıtında (JSON) döndürülmesi (`return Ok(new { token = tokenString })`) gerekir. | 🔴 Yüksek |
| `WebApp/Backend/PlanlamaApp.Api/Program.cs` (JWT Okuma) | `OnMessageReceived` olayı ile token'ın `context.Request.Cookies` içerisinden okunması. | Standart `Authorization` header tabanlı okumaya (Bearer token) geçilmeli veya fallback olarak her ikisine de bakılmalı. | 🔴 Yüksek |
| `WebApp/Backend/PlanlamaApp.Api/Program.cs` (CORS Ayarı) | Yalnızca `http://localhost` ve `192.168.*` IP'lerine izin verilmesi. | Capacitor uygulamaları genellikle `capacitor://localhost` (iOS) veya `http://localhost` (Android) üzerinden istek atar. Bu origin'ler CORS'a dahil edilmelidir. | 🟠 Orta |
| `WebApp/Frontend/src/services/authService.js` | `signInWithPopup` metodunun (Firebase) kullanılması. Mobilde popup (yeni sekme) açılamaz. | `@capacitor-firebase/authentication` veya `@react-native-google-signin/google-signin` gibi native entegrasyonlar üzerinden OAuth akışı tetiklenmelidir. | 🔴 Yüksek |
| `WebApp/Frontend/src/utils/storage.js` | `localStorage` kullanımı. iOS cihazda yer kalmadığında WebView storage'ları silinebilir. | `@capacitor/preferences` eklentisine geçirilmelidir. | 🟠 Orta |
| `WebApp/Frontend/src/hooks/useAppNavigation.js` | `window.location.hash` ve `window.history` (Web History API) tabanlı navigasyon. | Capacitor veya React Native için donanımsal geri (back) tuşunu destekleyen native router yapılarına (`@capacitor/router` veya MemoryRouter) geçilmelidir. | 🔴 Yüksek |
| `WebApp/Frontend/src/components/Profile/Profile.jsx` & `AccountModal.jsx` | `window.prompt(...)` ve `window.confirm(...)` native dialogları. | Capacitor iOS WebView'de bu dialoglar engellenmiştir ve arayüzü görünmez şekilde dondurur. Özel Modal veya Dialog bileşenleri ile değiştirilmelidir. | 🔴 Kritik |
| `WebApp/Frontend/src/services/syncService.js` & `QuotaSimulator.jsx` | `navigator.onLine` özelliği ve `window.addEventListener('online')`. | Bazı mobil WebView'lerde (özellikle iOS) düzensiz çalışabilir. `@capacitor/network` eklentisi (Network.addListener) kullanılarak gerçek cihaz ağ durumu dinlenmelidir. | 🔴 Yüksek |

## Çevrimdışı (Offline-First) Mimari Notu
Uygulamamızın IndexedDB tabanlı Offline-First mekanizması PWA olarak web üzerinde mükemmel çalışmaktadır. Mobil ortama geçerken, IndexedDB'nin native WebView'ler tarafından temizlenme (storage wipe) riskine karşı, veritabanı eklentisi olarak `@capacitor-community/sqlite` kullanımına geçilmesi şiddetle tavsiye edilir.

---

## Dosya Yükleme (Storage) Mimarisi Notu

> [!WARNING]
> `StorageController` şu anda `GET /api/storage/upload-url` ile imzalı bir HTTP **PUT** URL'si üretiyor. Bu URL'ye dosya yükleme, React (web) ortamında `fetch(url, { method: 'PUT', body: file })` ile doğrudan yapılabilir.
>
> **Ancak mobil (Capacitor/iOS/Android) ortamda `PUT` ile binary yükleme `XMLHttpRequest` / `fetch` üzerinden sorunsuz çalışsa da bazı ağ kısıtlamalarında sorun yaratabilir.** İleride mobil porta geçildiğinde, yükleme akışı şu şekilde dönüştürülmelidir:
>
> - `@capacitor/filesystem` ile dosya binary okunmalı.
> - `@capacitor/http` veya Capacitor'ın native HTTP eklentisi ile presigned URL'ye `PUT` isteği atılmalı.
> - Büyük dosyalar (>5MB) için multipart upload (çoklu parça yükleme) mantığı eklenmesi değerlendirilmeli.

| Dosya Yolu | Web Davranışı | Mobil Port Çözümü | Öncelik |
| :--- | :--- | :--- | :--- |
| `WebApp/Frontend/src/services/storageService.js` (henüz yazılmadı) | `fetch(presignedPutUrl, { method: 'PUT', body: file })` | `@capacitor/http` veya `@capacitor-community/http` ile native HTTP PUT; büyük dosyalar için `@capacitor/filesystem` üzerinden okuma + yükleme döngüsü. | 🟠 Orta |


## [MOBILE_PORT_TODO]: Auth Cookie & API Proxy Sorunu
- **Vite Proxy (vite.config.js & .env)**: Geli�tirme ortam�nda SameSite=Lax sorununu ��zmek i�in VITE_API_BASE_URL=/api kullan�lm�� ve Vite Proxy yap�land�r�lm��t�r. Ancak **Capacitor native build'lerinde bu proxy �al��maz**. Mobil uygulama derlenirken VITE_API_BASE_URL de�i�kenine **MUTLAK URL** (�rn: https://api.domain.com veya http://192.168.1.8:5268/api) verilmelidir.
- **Cookie Deste�i**: Mobil uygulamalarda (�zellikle iOS WKWebView) Cookie y�netimi stabil �al��mayabilir. Cihaz yerelinden (�rn: HTTP veya Capacitor �emas� ile) farkl� bir sunucuya at�lan HTTP isteklerinde SameSite k�s�tlamalar� veya g�venlik politikalar� �erezleri engelleyebilir. Ger�ek mobil uygulamada **JWT token'�n Authorization: Bearer <token> header'� ile g�nderilecek �ekilde mimari d�zenlemesi yap�lmas�** tavsiye edilir (ilgili kodlar piClient.js ve AuthController.cs i�inde [MOBILE_PORT_TODO] ile i�aretlenmi�tir).
