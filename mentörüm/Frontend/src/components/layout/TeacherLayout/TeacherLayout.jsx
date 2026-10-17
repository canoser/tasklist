import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../features/auth/authStore';
import { apiClient } from '../../../api/apiClient';
import NotificationDropdown from '../../common/NotificationDropdown/NotificationDropdown';
import ThemeSelector from '../../common/ThemeSelector/ThemeSelector';
import ThemeDecorContainer from '../../common/ThemeDecor/ThemeDecorContainer';
import styles from './TeacherLayout.module.css';

const TeacherLayout = () => {
  const { user, viewAs, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const displayName = viewAs?.name || user?.fullName || 'Öğretmen';
  const displayInitial = displayName.charAt(0);
  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {}
    clearAuth();
    navigate('/login');
  };

  const tabs = [
    { path: '/teacher/courses', label: 'Derslerim', icon: '📚' },
    { path: '/teacher/schedule', label: 'Program', icon: '📅' },
    { path: '/teacher/profile', label: 'Profil', icon: '👤' },
  ];

  return (
    <div className={styles.layout}>
      <ThemeDecorContainer />
      <header className={styles.topbar}>
        <div className={styles.userInfo}>
          <div className={styles.avatar}>
            {displayInitial}
          </div>
          <div>
            <div className={styles.greeting}>Merhaba,</div>
            <div className={styles.userName}>{displayName.split(' ')[0]}</div>
          </div>
        </div>
        <div className={styles.topbarActions}>
          <ThemeSelector />
          <NotificationDropdown />
          <button className={styles.logoutBtn} onClick={handleLogout} title="Çıkış Yap">
            🚪
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>

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

export default TeacherLayout;
