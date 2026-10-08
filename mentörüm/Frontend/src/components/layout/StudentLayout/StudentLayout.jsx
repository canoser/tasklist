import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../features/auth/authStore';
import { useNotifications } from '../../../hooks/useNotifications';
import styles from './StudentLayout.module.css';

const StudentLayout = () => {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const { data: notifications } = useNotifications();
  const unreadCount = notifications?.filter(n => !n.isRead)?.length || 0;

  const handleLogout = async () => {
    try {
      await import('../../../api/apiClient').then(m => m.apiClient.post('/auth/logout'));
    } catch (e) {}
    clearAuth();
    navigate('/login');
  };

  const tabs = [
    { path: '/student/home', label: 'Ana Sayfa', icon: '🏠' },
    { path: '/student/schedule', label: 'Programım', icon: '📅' },
    { path: '/student/courses', label: 'Derslerim', icon: '📚' },
    { path: '/student/homework', label: 'Ödevler', icon: '📝' },
    { path: '/student/profile', label: 'Profil', icon: '👤' },
  ];

  return (
    <div className={styles.layout}>
      {/* Topbar for mobile/student view */}
      <header className={styles.topbar}>
        <div className={styles.userInfo}>
          <div className={styles.avatar}>
            {user?.fullName?.charAt(0) || 'S'}
          </div>
          <div>
            <div className={styles.greeting}>Merhaba,</div>
            <div className={styles.userName}>{user?.fullName?.split(' ')[0]}</div>
          </div>
        </div>
        <div className={styles.topbarActions}>
          <button className={styles.notificationBtn}>
            🔔 {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
          </button>
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

export default StudentLayout;
