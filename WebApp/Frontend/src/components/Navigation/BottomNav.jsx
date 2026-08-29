import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './BottomNav.module.css';
import AddTaskModal from '../Task/AddTaskModal';
import { useTranslation } from 'react-i18next';

// Placeholder icons, ideally use lucide-react or similar
const HomeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
);

const SearchIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const UserIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const StatsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"></line>
    <line x1="12" y1="20" x2="12" y2="4"></line>
    <line x1="6" y1="20" x2="6" y2="14"></line>
  </svg>
);

const BottomNav = ({ activeTab = 'home', onTabChange = () => {}, tone, user, openAuth }) => {
  const [isMenuExpanded, setIsMenuExpanded] = useState(false);
  const [showGuestAlert, setShowGuestAlert] = useState(false);
  const { t } = useTranslation('common');

  return (
    <>
      <div className={`${styles.navContainer} no-select`}>
        <div className={styles.navBar}>
          <button 
            className={`${styles.navItem} ${activeTab === 'home' ? styles.active : ''}`}
            onClick={() => onTabChange('home')}
          >
            <HomeIcon />
            <span>{t('nav_home', { context: tone })}</span>
          </button>
          
          <button 
            className={`${styles.navItem} ${activeTab === 'search' ? styles.active : ''}`}
            onClick={() => onTabChange('search')}
          >
            <SearchIcon />
            <span>{t('nav_workspace', { context: tone })}</span>
          </button>

          <button 
            className={`${styles.navItem} ${activeTab === 'stats' ? styles.active : ''}`}
            onClick={() => onTabChange('stats')}
          >
            <StatsIcon />
            <span>{t('nav_stats', { context: tone })}</span>
          </button>

          <button 
            className={`${styles.navItem} ${activeTab === 'calendar' ? styles.active : ''}`}
            onClick={() => onTabChange('calendar')}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>{t('nav_calendar', { context: tone })}</span>
          </button>

          <button 
            className={`${styles.navItem} ${activeTab === 'profile' ? styles.active : ''}`}
            onClick={() => onTabChange('profile')}
          >
            <UserIcon />
            <span>{t('nav_profile', { context: tone })}</span>
          </button>
        </div>
      </div>



      {/* Misafir Uyarı Modalı */}
      {showGuestAlert && (
        <div className={styles.guestModalOverlay} onClick={() => setShowGuestAlert(false)}>
          <div className={styles.guestModal} onClick={e => e.stopPropagation()}>
            <h3>{t('ws_guest_title', { context: tone, defaultValue: 'Kayıt Gerekli' })}</h3>
            <p>{t('ws_guest_desc', { context: tone, defaultValue: 'Alanlarım (Workspace) özelliği ile kendi ekiplerinizi kurabilir veya takım arkadaşlarınızın çalışma alanlarına katılabilirsiniz. Bu bulut tabanlı bir özellik olduğu için lütfen giriş yapın veya kayıt olun.' })}</p>
            <div className={styles.guestModalActions}>
              <button className={styles.btnSecondary} onClick={() => setShowGuestAlert(false)}>{t('cancel', { context: tone, defaultValue: 'İptal' })}</button>
              <button className={styles.btnPrimary} onClick={() => { setShowGuestAlert(false); openAuth(); }}>{t('login', { context: tone, defaultValue: 'Kayıt Ol / Giriş Yap' })}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BottomNav;
