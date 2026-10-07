# PORTABILITY.md — V5 (Mentörüm)

Bu doküman, V5 frontend'inin **Capacitor (Android/iOS)** native'e taşınırken değişmesi gereken noktaları listeler. Kod içinde `// [MOBILE_PORT_TODO]:` etiketiyle işaretlenmiştir.

## [MOBILE_PORT_TODO] Noktaları

### 1. Google Girişi (`features/auth/LoginPage.jsx`)
- **Web:** Google Identity Services (GIS) — `window.google.accounts.id` + dinamik `<script>` yükleme.
- **Native (Capacitor):** `@capacitor-community/google-sign-in` (veya Firebase Auth native) ile ID token alınır; `/auth/google`'a aynı şekilde gönderilir. GIS web'e özgüdür.

### 2. Davet Paylaşımı (`components/common/InviteSharePanel/InviteSharePanel.jsx`)
- **Web:** `navigator.clipboard.writeText` + `window.open('https://wa.me/...')`.
- **Native:** `@capacitor/clipboard` + `@capacitor/share` (Share API).

### 3. Responsive Kontrol (`components/layout/CoachLayout/CoachLayout.jsx`)
- **Web:** `window.innerWidth`.
- **Native:** `@capacitor/screen` veya platform servisi (`utils/platform.js`).

### 4. API Proxy & Cookie
- **Web:** Vite proxy (`/api`) + httpOnly cookie (`withCredentials`).
- **Native:** mutlak `VITE_API_URL` gerekli (Vite proxy native'de çalışmaz); cookie yönetimi stabil olmayabilir → `Authorization: Bearer <token>` header'a geçiş önerilir.

## Genel Kurallar
- `window.location`, `document.cookie`, `localStorage` doğrudan bileşenlerde KULLANILMAZ; `utils/platform.js` üzerinden soyutlanır (zaten localStorage için yapılmıştır).
- Tüm ağ istekleri `apiClient.js` üzerinden yapılır (doğrudan fetch/axios yazılmaz).
- Service worker yalnızca production'da kaydedilir; `/api/` yanıtları asla cache'lenmez (veri sızıntısı önlemi).