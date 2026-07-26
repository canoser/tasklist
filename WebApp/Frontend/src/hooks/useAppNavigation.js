import { useState, useEffect, useCallback } from 'react';

/**
 * Merkezi Navigasyon ve Modal Yöneticisi (DRY Prensibi)
 * Tarayıcı Geri Tuşu (Back Button) ile uyumlu çalışır.
 */
export function useAppNavigation(defaultTab = 'home') {
  const [activeTab, setActiveTabState] = useState(defaultTab);
  const [activeModals, setActiveModals] = useState([]);

  // URL Hash senkronizasyonu
  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash.replace('#', '');
      
      if (!hash) {
        setActiveTabState('home');
        setActiveModals([]);
        return;
      }

      const params = new URLSearchParams(hash);
      const tab = params.get('tab') || 'home';
      const modalsStr = params.get('modals');
      
      setActiveTabState(tab);
      if (modalsStr) {
        setActiveModals(modalsStr.split(','));
      } else {
        setActiveModals([]);
      }
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

  const buildHash = (tab, modals) => {
    const params = new URLSearchParams();
    params.set('tab', tab);
    if (modals.length > 0) {
      params.set('modals', modals.join(','));
    }
    return `#${params.toString()}`;
  };

  const setTab = useCallback((tab) => {
    if (tab === activeTab) return;
    const newHash = buildHash(tab, []);
    window.history.pushState(null, '', newHash);
    setActiveTabState(tab);
    setActiveModals([]);
  }, [activeTab]);

  const openModal = useCallback((modalId) => {
    if (activeModals.includes(modalId)) return;
    const newModals = [...activeModals, modalId];
    const newHash = buildHash(activeTab, newModals);
    window.history.pushState(null, '', newHash);
    setActiveModals(newModals);
  }, [activeTab, activeModals]);

  const closeModal = useCallback((modalId) => {
    if (!activeModals.includes(modalId)) return;
    // Geri tuşunu simüle et
    window.history.back();
  }, [activeModals]);

  const isModalOpen = useCallback((modalId) => {
    return activeModals.includes(modalId);
  }, [activeModals]);

  return {
    activeTab,
    setTab,
    openModal,
    closeModal,
    isModalOpen
  };
}
