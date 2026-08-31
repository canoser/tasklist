import React from 'react';
import styles from './AppLayout.module.css';
import { useDevice } from '../../hooks/useDevice';
import SideNav from '../Navigation/SideNav';
import BottomNav from '../Navigation/BottomNav';

const AppLayout = ({ children, activeTab, onTabChange, tone, user, openAuth }) => {
  const { isWideScreen } = useDevice();

  return (
    <div className={styles.layoutContainer}>
      {isWideScreen && (
        <SideNav 
          activeTab={activeTab} 
          onTabChange={onTabChange} 
          tone={tone} 
          user={user} 
          openAuth={openAuth} 
        />
      )}
      <div className={styles.mainContentWrapper}>
        <main className={styles.scrollableContent}>
          {children}
        </main>
        {!isWideScreen && <div className={styles.bottomNavSpacer} />}
      </div>
      {!isWideScreen && (
        <BottomNav 
          activeTab={activeTab} 
          onTabChange={onTabChange} 
          tone={tone} 
          user={user} 
          openAuth={openAuth} 
        />
      )}
    </div>
  );
};

export default AppLayout;
