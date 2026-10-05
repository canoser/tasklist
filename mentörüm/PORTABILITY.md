# Mobil Portability (Taşınabilirlik) Durumu

Bu belge projenin Capacitor ile Android ve iOS'a taşınabilirliğini takip eder.

## Yapılanlar
- `capacitor.config.json` oluşturuldu (appId: com.dersmatris.mentorum, webDir: dist, androidScheme: https).
- `src/utils/platform.js` köprü dosyası eklendi. (İleride `localStorage` ve `window.location` native API'lerle değiştirilecek).
- `package.json`'a Aşama 25'te kurulacak Capacitor bağımlılıkları not düşüldü.
- Aşama 25 (5 Ekim 2026): `@capacitor/core` + `@capacitor/cli` + `@capacitor/android` kuruldu.
- `npx cap add android` ile Android platformu eklendi (`android/` dizini oluştu).
- `platform.js` → `Capacitor.isNativePlatform()` ile native tespiti eklendi.
- `npm run build` + `npx cap sync android` başarılı (web assets android'e kopyalandı).

## Bekleyen İşler (ERTELENDİ — web-only)
- ✅ ~~`@capacitor/core`, `@capacitor/cli`, `@capacitor/android` kurulumu~~ → YAPILDI (`@capacitor/ios` hariç — iOS yayınlanmayacak).
- ✅ ~~`npx cap add android`~~ → YAPILDI; ~~`npx cap add ios`~~ → ATLANDI (yayınlanmayacak).
- ⏳ `platform.js` storage: hâlâ `localStorage` — native yayınına geçilince Capacitor Preferences ile değiştirilecek.
