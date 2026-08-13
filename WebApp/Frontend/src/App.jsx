import './i18n';
import { useState, useEffect } from 'react';
import styles from './App.module.css';
import AuthModal from './components/Auth/AuthModal';
import { subscribeToAuthChanges, logoutUser } from './services/authService';
import { startSyncListener } from './services/syncService';
import MobileLayout from './components/Layout/MobileLayout';
import BottomNav from './components/Navigation/BottomNav';
import Dashboard from './components/Dashboard/Dashboard';
import Profile from './components/Profile/Profile';
import WorkspaceScreen from './components/Workspace/WorkspaceScreen';
import { BrowserRouter } from 'react-router-dom';
import { UndoProvider } from './components/Common/UndoContext';
import { TaskProvider } from './context/TaskContext';
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
import { motion } from 'framer-motion';

// Çevrimdışı işlem kuyruğunu ve senkronizasyonu başlat
startSyncListener();

export default function App() {
  const [theme, setTheme] = useState('classic'); // 'classic', 'nature', 'lovely' vb.
  const [appearance, setAppearance] = useState('dark'); // 'light', 'dark'
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
  const { activeTab, setTab, openModal, closeModal, isModalOpen } = useAppNavigation('home');

  // Mobil klavye açıldığında input'un arkada kalmasını engelleyen global hook
  useKeyboardScrollFix();

  const isLandscape = useOrientation();
  const [isHeaderVisible, setIsHeaderVisible] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-appearance', appearance);
  }, [theme, appearance]);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const toggleAppearance = () => {
    setAppearance((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

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
        <MobileLayout>
          <div className={styles.container}>
          {/* ── Üst Bar ─────────────────────────────────────────────────────── */}
          <motion.div
            initial={false}
            animate={{ y: isLandscape ? (isHeaderVisible ? 0 : '-100%') : 0 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
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
            {activeTab === 'home' && <Dashboard user={user} guestName={guestName} tone={tone} />}

            {activeTab === 'search' && (
              <WorkspaceScreen user={user} tone={tone} />
            )}

            {activeTab === 'calendar' && (
              <CalendarScreen 
                user={user} 
                navigation={{ openModal, closeModal, isModalOpen }} 
                tone={tone}
              />
            )}

            {activeTab === 'profile' && (
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
            )}

            {activeTab === 'admin' && user?.email === 'canoser@gmail.com' && (
              <AdminPanel tone={tone} />
            )}
          </main>

          <AuthModal isOpen={isModalOpen('auth')} onClose={() => closeModal('auth')} tone={tone} />
          {!user && <GuestWelcomeModal tone={tone} onToneChange={handleToneChange} onComplete={(name) => setGuestName(name)} />}
        </div>
      </MobileLayout>

      {/* BottomNav, tab seçimini App'e bildirir */}
      <BottomNav 
        activeTab={activeTab} 
        onTabChange={setTab} 
        tone={tone} 
        user={user} 
        openAuth={() => openModal('auth')} 
      />
        </TaskProvider>
      </UndoProvider>
    </BrowserRouter>
  );
}
