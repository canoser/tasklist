# Mobil Portability (Taşınabilirlik) Durumu

Bu belge projenin Capacitor ile Android ve iOS'a taşınabilirliğini takip eder.

## Yapılanlar
- `capacitor.config.json` oluşturuldu (appId: com.dersmatris.mentorum, webDir: dist, androidScheme: https).
- `src/utils/platform.js` köprü dosyası eklendi. (İleride `localStorage` ve `window.location` native API'lerle değiştirilecek).
- `package.json`'a Aşama 25'te kurulacak Capacitor bağımlılıkları not düşüldü.

## Bekleyen İşler (Aşama 25)
- `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android` kurulumu.
- `npx cap add android` ve `npx cap add ios` ile projelerin oluşturulması.
- `platform.js` içerisindeki dummy API'lerin gerçek Capacitor API'leriyle (Preferences) değiştirilmesi.
