import React from 'react';
import styles from './MobileLayout.module.css';

const MobileLayout = ({ children }) => {
  return (
    <div className={styles.layoutContainer}>
      <main className={styles.scrollableContent}>
        {children}
      </main>
      {/* Spacer for bottom nav to prevent content hiding behind it */}
      <div className={styles.bottomNavSpacer} />
    </div>
  );
};

export default MobileLayout;
