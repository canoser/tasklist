import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './features/auth/authStore';
import App from './App.jsx';
import './styles/globals.css';
import './i18n'; // i18next başlat

// React Query Client (Sürekli polling YOK; olay ve odaklanma güdümlü anlık yenileme)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: 'always', // Sekmeye/pencereye dönüldüğünde beklemeden taze veriyi çek
      retry: 1, // Hata durumunda sadece 1 kez tekrar dene
      staleTime: 0, // 30s gecikme olmadan odaklanma ve mutasyon anında güncellensin
    },
  },
});

// Olay güdümlü (Web Push / Service Worker / Sekmeler ve Pencereler arası) anlık önbellek yenileme
if (typeof window !== 'undefined') {
  let lastFocusInvalidate = 0;
  const invalidateOnFocusOrEvent = () => {
    const now = Date.now();
    if (now - lastFocusInvalidate < 800) return;
    lastFocusInvalidate = now;
    if (useAuthStore.getState().accessToken) {
      queryClient.invalidateQueries();
    }
  };

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'MENTORUM_PUSH_INVALIDATE') {
        queryClient.invalidateQueries();
      }
    });
  }
  if ('BroadcastChannel' in window) {
    const syncChannel = new BroadcastChannel('mentorum_sync');
    syncChannel.onmessage = (event) => {
      if (event.data?.type === 'INVALIDATE_ALL') {
        queryClient.invalidateQueries();
      }
    };
  }
  window.addEventListener('storage', (event) => {
    if (event.key === 'mentorum_sync_ts') {
      queryClient.invalidateQueries();
    }
  });
  // React Query v5 yalnızca visibilitychange dinlediği için yan yana pencereler arası geçişte window focus desteği
  window.addEventListener('focus', invalidateOnFocusOrEvent);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      invalidateOnFocusOrEvent();
    }
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);

// Süper yönetici modu için DOM sınıf senkronizasyonu
const syncAdminMode = (user) => {
  if (typeof document !== 'undefined') {
    document.body.classList.toggle('super-admin-mode', Boolean(user?.isAdmin));
  }
};

// Başlangıç durumu için ilk çalıştırma
syncAdminMode(useAuthStore.getState().user);

// Durum değişikliklerini dinleme
useAuthStore.subscribe((state) => {
  syncAdminMode(state.user);
});

// Mobil uygulama hissi: Form alanları ve Süper Yönetici hariç sağ tık menüsünü engelle
window.addEventListener('contextmenu', (e) => {
  const tagName = e.target?.tagName?.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea' || e.target?.isContentEditable) {
    return; // Form alanlarında kopyala/yapıştır için açık
  }
  const user = useAuthStore.getState().user;
  if (user?.isAdmin) {
    return; // Süper yönetici için sağ tık serbest
  }
  e.preventDefault();
});

// PWA service worker kaydı (yalnızca production'da; /api/ yanıtları cache'lenmez)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

