# Native Portability Documentation (Android / iOS / Capacitor)

## Mobil Portabilite Notlari (Web vs Native)

Aasagidaki tablo, Takvim (Ayik/Haftalik/Gunluk) gorunumlerinde Web standartlari ile Native (Capacitor / React Native) gecisindeki farklari ve dikkat edilmesi gereken metot donusumlerini listeler. Tum ilgili kaynak kodlarina `// [MOBILE_PORT_TODO]:` yorumu birakilmistir.

| # | Bilesen / Dosya | Web Kullanimi | Native (Mobile/Capacitor) Karsiligi | Aciklama |
|---|----------------|--------------|-----------------------------------|----------|
| 1 | `DailyView.jsx` | `scrollIntoView` / `scrollTop` | `ScrollView.scrollTo({ y })` | Web'de DOM `scrollTop` veya `scrollIntoView` kullanilirken Native React Native tarafinda `ScrollView.scrollTo` veya `FlatList.scrollToIndex` gereklidir. |
| 2 | `WeeklyView.jsx`, `CalendarView.jsx` | `onClick` handler | `onPress` / `Gesture.Tap()` | Touch deneyimi icin Native'de `onPress` kullanilmalidir. |
| 3 | `CalendarView.module.css` | CSS `@keyframes` slide animasyonu | `react-native-reanimated` | Web'deki CSS animasyonlari Native tarafinda JS-driven reanimated kütüphanesiyle yazilmalidir. |
| 4 | `DailyView.jsx`, `WeeklyView.jsx`, `CalendarView.jsx` | `toLocaleString('tr-TR')` | `date-fns/locale/tr` | `Intl` API bazi eski mobil WebView'larda tutarsiz olabileceginden `date-fns` veya polyfill onerilir. |
| 5 | `CalendarScreen.jsx` | `clientHeight` / `100dvh` | `Capacitor.Plugins.StatusBar` + `SafeArea` | Mobil centik (notch) ve durum cubugu yukseklikleri Safe Area API ile dinlenmelidir. |
| 6 | `taskUtils.js` | `JSON.parse(metadata)` | Platform Agnostik | `Metadata` JSON formatinda oldugu icin JS motorlarinda dogrudan calisir, porting gerektirmez. |
| 7 | `DailyView.jsx` | `new Date(deadline)` UTC parsing | `date-fns-tz` / Zoned Time | Kullanicinin cihazindaki yerel saat dilimi (Timezone offset) ile sunucu UTC saati farki icin yerel saat dilimi koruyucu kullanilmalidir. |

---

## Son Guncelleme
Tarih: 2026-08-13
Konu: Aylik/Haftalik/Gunluk Takvim Modlari ve Saatli Gorev Yonetimi (`Metadata.scheduledTime`)
