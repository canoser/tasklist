import { useState, useEffect } from 'react';
import styles from './App.module.css';
import AuthModal from './components/Auth/AuthModal';
import { subscribeToAuthChanges, logoutUser } from './services/authService';
import MobileLayout from './components/Layout/MobileLayout';
import BottomNav from './components/Navigation/BottomNav';
import Dashboard from './components/Dashboard/Dashboard';
import Profile from './components/Profile/Profile';
import { BrowserRouter } from 'react-router-dom';
import { UndoProvider } from './components/Common/UndoContext';
import CalendarScreen from './components/Calendar/CalendarScreen';

import { useAppNavigation } from './hooks/useAppNavigation';

export default function App() {
  const [theme, setTheme] = useState('classic'); // 'classic', 'nature', 'lovely' vb.
  const [appearance, setAppearance] = useState('dark'); // 'light', 'dark'
  const [user, setUser] = useState(null);
  
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
              <h2 className={styles.title}>PlanlamaApp</h2>
            </div>

            <div className={styles.actions}>
              <button className={`${styles.themeBtn} no-select`} onClick={toggleAppearance}>
                {appearance === 'dark' ? '☀️' : '🌙'}
              </button>

              {user ? (
                <div className={styles.userBadge}>
                  <span className={styles.userEmail}>{user.email || user.displayName}</span>
                  <button className={`${styles.logoutBtn} no-select`} onClick={logoutUser}>Çıkış</button>
                </div>
              ) : (
                <button className={`${styles.authBtn} no-select`} onClick={() => openModal('auth')}>
                  Giriş Yap
                </button>
              )}
            </div>
          </header>

          {/* ── Ana İçerik Alanı ────────────────────────────────────────────── */}
          <main className={styles.main}>
            {activeTab === 'home' && <Dashboard user={user} />}

            {activeTab === 'search' && (
              <div className={styles.placeholder}>
                <span>🔍</span>
                <p>Keşfet ekranı yakında geliyor</p>
              </div>
            )}

            {activeTab === 'calendar' && (
              <CalendarScreen 
                user={user} 
                navigation={{ openModal, closeModal, isModalOpen }} 
              />
            )}

            {activeTab === 'profile' && (
              <Profile 
                user={user} 
                appearance={appearance} 
                onToggleAppearance={toggleAppearance} 
                theme={theme}
                setTheme={setTheme}
              />
            )}
          </main>

          <AuthModal isOpen={isModalOpen('auth')} onClose={() => closeModal('auth')} />
        </div>
      </MobileLayout>

      {/* BottomNav, tab seçimini App'e bildirir */}
      <BottomNav activeTab={activeTab} onTabChange={setTab} />
      </UndoProvider>
    </BrowserRouter>
  );
}
