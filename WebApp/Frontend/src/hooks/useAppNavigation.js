import { useState, useEffect, useCallback, startTransition } from 'react';

/**
 * Merkezi Navigasyon ve Modal Yöneticisi (DRY Prensibi)
 * Tarayıcı Geri Tuşu (Back Button) ile uyumlu çalışır.
 * // [MOBILE_PORT_TODO]: window.location.hash ve window.history.pushState gibi Web History API 
 * // çağrıları Capacitor (özellikle Android) donanımsal geri tuşu ile çakışabilir.
 * // Mobil uygulamaya geçerken React Router (MemoryRouter) veya @capacitor/router kullanılmalı.
 */
export function useAppNavigation(defaultTab = 'home') {
  const [activeTab, setActiveTabState] = useState(defaultTab);
  const [activeModals, setActiveModals] = useState([]);
  const [queryParams, setQueryParams] = useState({});

  // URL Hash senkronizasyonu
  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash.replace('#', '');
      
      if (!hash) {
        setActiveTabState('home');
        setActiveModals([]);
        setQueryParams({});
        return;
      }

      const params = new URLSearchParams(hash);
      const tab = params.get('tab') || 'home';
      const modalsStr = params.get('modals');
      
      const newQueryParams = {};
      for (const [key, value] of params.entries()) {
        if (key !== 'tab' && key !== 'modals') {
          newQueryParams[key] = value;
        }
      }

      startTransition(() => {
        setActiveTabState(tab);
        setQueryParams(newQueryParams);
        
        if (modalsStr) {
          setActiveModals(modalsStr.split(','));
        } else {
          setActiveModals([]);
        }
      });
    };

    // İlk yüklemede hash'i düzelt
    if (!window.location.hash) {
      window.history.replaceState(null, '', '#tab=home');
    } else {
      handlePopState();
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const buildHash = (tab, modals, extraParams = {}) => {
    const params = new URLSearchParams();
    params.set('tab', tab);
    if (modals && modals.length > 0) {
      params.set('modals', modals.join(','));
    }
    Object.keys(extraParams).forEach(key => {
      if (extraParams[key] !== null && extraParams[key] !== undefined) {
        params.set(key, extraParams[key]);
      }
    });
    return `#${params.toString()}`;
  };

  const setTab = useCallback((tab) => {
    if (tab === activeTab) return;
    // Tab değiştiğinde modal ve param'ları sıfırla
    const newHash = buildHash(tab, [], {});
    window.history.pushState(null, '', newHash);
    setActiveTabState(tab);
    setActiveModals([]);
    setQueryParams({});
  }, [activeTab]);

  const openModal = useCallback((modalId) => {
    if (activeModals.includes(modalId)) return;
    const newModals = [...activeModals, modalId];
    const newHash = buildHash(activeTab, newModals, queryParams);
    window.history.pushState(null, '', newHash);
    setActiveModals(newModals);
  }, [activeTab, activeModals, queryParams]);

  const closeModal = useCallback((modalId) => {
    if (!activeModals.includes(modalId)) return;
    // Sadece state olarak silmiyoruz, native geri tuşu simülasyonu yapıyoruz
    window.history.back();
  }, [activeModals]);

  const isModalOpen = useCallback((modalId) => {
    return activeModals.includes(modalId);
  }, [activeModals]);

  const setParam = useCallback((key, value) => {
    const newParams = { ...queryParams, [key]: value };
    const newHash = buildHash(activeTab, activeModals, newParams);
    window.history.pushState(null, '', newHash);
    setQueryParams(newParams);
  }, [activeTab, activeModals, queryParams]);

  const removeParam = useCallback((key) => {
    const newParams = { ...queryParams };
    delete newParams[key];
    const newHash = buildHash(activeTab, activeModals, newParams);
    window.history.pushState(null, '', newHash);
    setQueryParams(newParams);
  }, [activeTab, activeModals, queryParams]);
  
  const clearAllModalsAndParams = useCallback(() => {
    const newHash = buildHash(activeTab, [], {});
    window.history.pushState(null, '', newHash);
    setActiveModals([]);
    setQueryParams({});
  }, [activeTab]);

  return {
    activeTab,
    setTab,
    openModal,
    closeModal,
    isModalOpen,
    queryParams,
    setParam,
    removeParam,
    clearAllModalsAndParams
  };
}
