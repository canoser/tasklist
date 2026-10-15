import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// i18n altyapısı: şimdilik yalnızca Türkçe. Diğer diller (en, es, fr, de, ro) ve
// üslup varyantları (formal, semi, buddy) için yapı hazır; yalnızca resource eklemek yeterli.
const resources = {
  tr: {
    translation: {
      common: {
        save: "Kaydet",
        cancel: "İptal",
        delete: "Sil",
        loading: "Yükleniyor...",
      },
      auth: {
        login: "Giriş Yap",
        email: "E-posta",
        password: "Şifre",
      },
      tones: {
        formal: { greeting: "Hoş geldiniz" },
        semi: { greeting: "Hoş geldin" },
        buddy: { greeting: "Selam!" },
      },
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'tr', // Varsayılan dil
    fallbackLng: 'tr',
    interpolation: {
      escapeValue: false // React zaten XSS koruması yapar
    }
  });

if (typeof document !== 'undefined') {
  document.documentElement.lang = i18n.language || 'tr';
  i18n.on('languageChanged', (lng) => {
    document.documentElement.lang = lng;
  });
}

export default i18n;
