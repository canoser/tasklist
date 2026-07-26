import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './BottomNav.module.css';
import AddTaskModal from '../Task/AddTaskModal';

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

const PlusIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const BottomNav = ({ activeTab = 'home', onTabChange = () => {} }) => {
  const [isMenuExpanded, setIsMenuExpanded] = useState(false);

  return (
    <>
      <div className={`${styles.navContainer} no-select`}>
        <div className={styles.navBar}>
          <button 
            className={`${styles.navItem} ${activeTab === 'home' ? styles.active : ''}`}
            onClick={() => onTabChange('home')}
          >
            <HomeIcon />
            <span>Ana Sayfa</span>
          </button>
          
          <button 
            className={`${styles.navItem} ${activeTab === 'search' ? styles.active : ''}`}
            onClick={() => onTabChange('search')}
          >
            <SearchIcon />
            <span>Keşfet</span>
          </button>

          {/* Action Button that expands */}
          <div className={styles.actionButtonContainer}>
            <motion.button 
              layoutId="expandableMenu"
              className={styles.actionButton}
              onClick={() => setIsMenuExpanded(true)}
              whileTap={{ scale: 0.95 }}
            >
              <PlusIcon />
            </motion.button>
          </div>

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
            <span>Takvim</span>
          </button>

          <button 
            className={`${styles.navItem} ${activeTab === 'profile' ? styles.active : ''}`}
            onClick={() => onTabChange('profile')}
          >
            <UserIcon />
            <span>Profil</span>
          </button>
        </div>
      </div>

      <AddTaskModal isOpen={isMenuExpanded} onClose={() => setIsMenuExpanded(false)} />
    </>
  );
};

export default BottomNav;
