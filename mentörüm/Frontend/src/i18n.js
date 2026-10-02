import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Gelecekte dil dosyaları ayrı klasörden (locales/tr/translation.json) yüklenebilir.
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
      }
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

export default i18n;
