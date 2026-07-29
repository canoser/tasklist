import './i18n';
import { useState, useEffect } from 'react';
import styles from './App.module.css';
import AuthModal from './components/Auth/AuthModal';
import { subscribeToAuthChanges, logoutUser } from './services/authService';
import MobileLayout from './components/Layout/MobileLayout';
import BottomNav from './components/Navigation/BottomNav';
import Dashboard from './components/Dashboard/Dashboard';
import Profile from './components/Profile/Profile';
import WorkspaceScreen from './components/Workspace/WorkspaceScreen';
import { BrowserRouter } from 'react-router-dom';
import { UndoProvider } from './components/Common/UndoContext';
import CalendarScreen from './components/Calendar/CalendarScreen';

import { useAppNavigation } from './hooks/useAppNavigation';
import { useTranslation } from 'react-i18next';
import { DEFAULT_TONE } from './config/featureFlags';
import { setTone as setI18nTone } from './i18n';
export default function App() {
  const [theme, setTheme] = useState('classic'); // 'classic', 'nature', 'lovely' vb.
  const [appearance, setAppearance] = useState('dark'); // 'light', 'dark'
  const [user, setUser] = useState(null);
  
  const [tone, setTone] = useState(
    localStorage.getItem('planlama_tone') || DEFAULT_TONE
  );
  
  const handleToneChange = (newTone) => {
    setTone(newTone);
    localStorage.setItem('planlama_tone', newTone);
    setI18nTone(newTone);
  };

  const { t } = useTranslation('common');
  // Merkezi Navigasyon Yöneticisi (URL Hash tabanlı)
  const { activeTab, setTab, openModal, closeModal, isModalOpen } = useAppNavigation('home');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-appearance', appearance);
  }, [theme, appearance]);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const toggleAppearance = () => {
    setAppearance((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <BrowserRouter>
      <UndoProvider>
        <MobileLayout>
          <div className={styles.container}>
          {/* ── Üst Bar ─────────────────────────────────────────────────────── */}
          <header className={styles.header}>
            <div className={styles.logoArea}>
              <span className={styles.logoBadge}>P</span>
              <h2 className={styles.title}>{t('app_name', { context: tone })}</h2>
            </div>

            <div className={styles.actions}>
              <button className={`${styles.themeBtn} no-select`} onClick={toggleAppearance}>
                {appearance === 'dark' ? '☀️' : '🌙'}
              </button>

              {user ? (
                <div className={styles.userBadge}>
                  <span className={styles.userEmail}>{user.email || user.displayName}</span>
                  <button className={`${styles.logoutBtn} no-select`} onClick={logoutUser}>{t('logout', { context: tone })}</button>
                </div>
              ) : (
                <button className={`${styles.authBtn} no-select`} onClick={() => openModal('auth')}>
                  {t('login', { context: tone })}
                </button>
              )}
            </div>
          </header>

          {/* ── Ana İçerik Alanı ────────────────────────────────────────────── */}
          <main className={styles.main}>
            {activeTab === 'home' && <Dashboard user={user} tone={tone} />}

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
                appearance={appearance} 
                onToggleAppearance={toggleAppearance} 
                theme={theme}
                setTheme={setTheme}
                tone={tone}
                onToneChange={handleToneChange}
              />
            )}
          </main>

          <AuthModal isOpen={isModalOpen('auth')} onClose={() => closeModal('auth')} />
        </div>
      </MobileLayout>

      {/* BottomNav, tab seçimini App'e bildirir */}
      <BottomNav activeTab={activeTab} onTabChange={setTab} tone={tone} />
      </UndoProvider>
    </BrowserRouter>
  );
}
