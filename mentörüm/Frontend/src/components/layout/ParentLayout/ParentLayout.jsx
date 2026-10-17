import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../features/auth/authStore';
import { apiClient } from '../../../api/apiClient';
import NotificationDropdown from '../../common/NotificationDropdown/NotificationDropdown';
import styles from './ParentLayout.module.css';

const ParentLayout = () => {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {}
    clearAuth();
    navigate('/login');
  };

  const tabs = [
    { path: '/parent/summary', label: 'Özet', icon: '📊' },
    { path: '/parent/homework', label: 'Ödev Takibi', icon: '📋' },
    { path: '/parent/calendar', label: 'Takvim', icon: '🗓️' },
    { path: '/parent/schedule', label: 'Program', icon: '📅' },
  ];

  return (
    <div className={styles.layout}>
      {/* Topbar for mobile/parent view */}
      <header className={styles.topbar}>
        <div className={styles.userInfo}>
          <div className={styles.avatar}>
            {user?.fullName?.charAt(0) || 'V'}
          </div>
          <div>
            <div className={styles.greeting}>Merhaba,</div>
            <div className={styles.userName}>{user?.fullName?.split(' ')[0]}</div>
          </div>
        </div>
        <div className={styles.topbarActions}>
          <NotificationDropdown />
          <button className={styles.logoutBtn} onClick={handleLogout} title="Çıkış Yap">
            🚪
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={styles.main}>
        <Outlet />
      </main>

      {/* Bottom Tab Bar */}
      <nav className={styles.bottomNav}>
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) => 
              isActive ? `${styles.tab} ${styles.tabActive}` : styles.tab
            }
          >
            <span className={styles.tabIcon}>{tab.icon}</span>
            <span className={styles.tabLabel}>{tab.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default ParentLayout;
