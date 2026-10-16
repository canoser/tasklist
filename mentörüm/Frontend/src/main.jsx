import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.jsx';
import './styles/globals.css';
import './i18n'; // i18next başlat

// React Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true, // Kullanıcı sekmeye dönünce taze veriyi çek
      retry: 1, // Hata durumunda sadece 1 kez tekrar dene
      staleTime: 1000 * 60 * 5, // Veriyi 5 dakika taze kabul et
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);

// Mobil uygulama hissi: Form alanları hariç sağ tık menüsünü engelle
window.addEventListener('contextmenu', (e) => {
  const tagName = e.target?.tagName?.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea' || e.target?.isContentEditable) {
    return; // Form alanlarında kopyala/yapıştır için açık
  }
  e.preventDefault();
});

// PWA service worker kaydı (yalnızca production'da; /api/ yanıtları cache'lenmez)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

