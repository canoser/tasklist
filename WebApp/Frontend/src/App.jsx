import './i18n';
import { useState, useEffect } from 'react';
import styles from './App.module.css';
import AuthModal from './components/Auth/AuthModal';
import { subscribeToAuthChanges, logoutUser } from './services/authService';
import { startSyncListener } from './services/syncService';
import AppLayout from './components/Layout/AppLayout';
import Dashboard from './components/Dashboard/Dashboard';
import Profile from './components/Profile/Profile';
import WorkspaceScreen from './components/Workspace/WorkspaceScreen';
import { BrowserRouter } from 'react-router-dom';
import { UndoProvider } from './components/Common/UndoContext';
import NatureDecor from './components/Common/NatureDecor';
import OceanDecor from './components/Common/OceanDecor';
import CyberpunkDecor from './components/Common/CyberpunkDecor';
import { TaskProvider } from './context/TaskContext';
import { useTheme } from './context/ThemeContext';
import CalendarScreen from './components/Calendar/CalendarScreen';
import AdminPanel from './components/Admin/AdminPanel';

import { useAppNavigation } from './hooks/useAppNavigation';
import { useTranslation } from 'react-i18next';
import { DEFAULT_TONE } from './config/featureFlags';
import { setTone as setI18nTone } from './i18n';
import storage from './utils/storage';
import GuestWelcomeModal from './components/Auth/GuestWelcomeModal';
import { useKeyboardScrollFix } from './hooks/useKeyboardScrollFix';
import { useOrientation } from './hooks/useOrientation';
import { motion, AnimatePresence } from 'framer-motion';
import signalrService from './services/signalrService';

// Çevrimdışı işlem kuyruğunu ve senkronizasyonu başlat
startSyncListener();

export default function App() {
  const { themeStyle: theme, setThemeStyle: setTheme, themeMode: appearance, toggleMode: toggleAppearance } = useTheme();
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [guestName, setGuestName] = useState(storage.getString('guest_name') || '');
  
  const [tone, setTone] = useState(
    storage.getString('planlama_tone') || DEFAULT_TONE
  );
  
  const handleToneChange = (newTone) => {
    setTone(newTone);
    storage.setString('planlama_tone', newTone);
    setI18nTone(newTone);
  };

  const { t } = useTranslation('common');
  // Merkezi Navigasyon Yöneticisi (URL Hash tabanlı)
  const { activeTab, setTab, openModal, closeModal, isModalOpen, queryParams, setParam, removeParam, clearAllModalsAndParams } = useAppNavigation('home');

  // Mobil klavye açıldığında input'un arkada kalmasını engelleyen global hook
  useKeyboardScrollFix();

  const isLandscape = useOrientation();
  const [isHeaderVisible, setIsHeaderVisible] = useState(false);

  // Handle old invite links like /workspace/join?code=XYZ
  useEffect(() => {
    if (window.location.pathname.includes('/workspace/join')) {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (code) {
        window.location.href = `/?joinCode=${code}#tab=search`;
      }
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
      
      if (currentUser) {
        signalrService.startConnection();
      } else {
        signalrService.stopConnection();
      }
    });
    return () => {
      unsubscribe();
      signalrService.stopConnection();
    };
  }, []);

  if (isAuthLoading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinner}></div>
        <p>{t('loading', { defaultValue: 'Yükleniyor...' })}</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <UndoProvider>
        <TaskProvider>
        <AppLayout
          activeTab={activeTab}
          onTabChange={setTab}
          tone={tone}
          user={user}
          openAuth={() => openModal('auth')}
        >
          <NatureDecor />
          <OceanDecor />
          <CyberpunkDecor />
          <div className={styles.container}>
          {/* ── Üst Bar ─────────────────────────────────────────────────────── */}
          <motion.div
            initial={false}
            animate={{ y: isLandscape ? (isHeaderVisible ? 0 : '-100%') : 0 }}
            transition={{ type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.3 }}
            style={{ 
              position: isLandscape ? 'absolute' : 'relative', 
              width: '100%', 
              zIndex: 50 
            }}
          >
            <header className={styles.header}>
              <div className={styles.logoArea}>
                <span className={styles.logoBadge}>P</span>
                <h2 className={styles.title}>
                  {user ? (user.email || user.displayName) : t('app_name', { context: tone })}
                </h2>
              </div>

              <div className={styles.actions}>
                <button className={`${styles.themeBtn} no-select`} onClick={toggleAppearance}>
                  {appearance === 'dark' ? '☀️' : '🌙'}
                </button>

                {user ? (
                  <button className={`${styles.logoutBtn} no-select`} onClick={logoutUser}>
                    {t('logout', { context: tone })}
                  </button>
                ) : (
                  <button className={`${styles.authBtn} no-select`} onClick={() => openModal('auth')}>
                    {t('login', { context: tone })}
                  </button>
                )}
              </div>
            </header>
            
            {/* Sürükleme Tutamağı (Sadece Yatayda) */}
            {isLandscape && (
              <div className={styles.dragHandleContainer}>
                <motion.div
                  className={styles.dragHandle}
                  drag="y"
                  dragConstraints={{ top: 0, bottom: 0 }}
                  onDragEnd={(e, { offset, velocity }) => {
                    if (!isHeaderVisible && (offset.y > 20 || velocity.y > 100)) setIsHeaderVisible(true);
                    if (isHeaderVisible && (offset.y < -20 || velocity.y < -100)) setIsHeaderVisible(false);
                  }}
                  onClick={() => setIsHeaderVisible(!isHeaderVisible)}
                >
                  <div className={styles.dragIndicator} />
                </motion.div>
              </div>
            )}
          </motion.div>

          {/* ── Ana İçerik Alanı ────────────────────────────────────────────── */}
          <main className={styles.main}>
            <AnimatePresence mode="wait">
              {activeTab === 'home' && (
                <motion.div key="home" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ type: 'tween', ease: 'easeOut', duration: 0.2 }}>
                  <Dashboard user={user} guestName={guestName} tone={tone} />
                </motion.div>
              )}

              {activeTab === 'search' && (
                <motion.div key="search" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ type: 'tween', ease: 'easeOut', duration: 0.2 }}>
                  <WorkspaceScreen user={user} tone={tone} navigation={{ activeTab, setTab, openModal, closeModal, isModalOpen, queryParams, setParam, removeParam, clearAllModalsAndParams }} openAuth={() => openModal('auth')} />
                </motion.div>
              )}

              {activeTab === 'calendar' && (
                <motion.div key="calendar" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ type: 'tween', ease: 'easeOut', duration: 0.2 }}>
                  <CalendarScreen 
                    user={user} 
                    navigation={{ openModal, closeModal, isModalOpen }} 
                    tone={tone}
                  />
                </motion.div>
              )}

              {activeTab === 'profile' && (
                <motion.div key="profile" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ type: 'tween', ease: 'easeOut', duration: 0.2 }}>
                  <Profile 
                    user={user} 
                    guestName={guestName}
                    appearance={appearance} 
                    onToggleAppearance={toggleAppearance} 
                    theme={theme}
                    setTheme={setTheme}
                    tone={tone}
                    onToneChange={handleToneChange}
                    openAuth={() => openModal('auth')}
                    navigateToAdmin={() => setTab('admin')}
                  />
                </motion.div>
              )}

              {activeTab === 'admin' && user?.email === 'canoser@gmail.com' && (
                <motion.div key="admin" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ type: 'tween', ease: 'easeOut', duration: 0.2 }}>
                  <AdminPanel tone={tone} />
                </motion.div>
              )}
            </AnimatePresence>
          </main>

          <AuthModal isOpen={isModalOpen('auth')} onClose={() => closeModal('auth')} tone={tone} />
          {!user && <GuestWelcomeModal tone={tone} onToneChange={handleToneChange} onComplete={(name) => setGuestName(name)} />}
        </div>
      </AppLayout>
      </TaskProvider>
    </UndoProvider>
  </BrowserRouter>
  );
}
