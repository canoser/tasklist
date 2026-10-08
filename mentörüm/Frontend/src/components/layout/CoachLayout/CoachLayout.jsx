import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../features/auth/authStore';
import { useUIStore } from '../../../store/uiStore';
import { useNotifications } from '../../../hooks/useNotifications';
import styles from './CoachLayout.module.css';

const CoachLayout = () => {
  const { user, clearAuth } = useAuthStore();
  const { sidebarOpen, toggleSidebar, closeSidebar } = useUIStore();
  const navigate = useNavigate();
  
  const { data: notifications } = useNotifications();
  const unreadCount = notifications?.filter(n => !n.isRead)?.length || 0;

  const handleLogout = () => {
    // Gerçek uygulamada '/auth/logout' isteği de atılır.
    clearAuth();
    navigate('/login');
  };

  const navItems = [
    { path: '/coach/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/coach/programs', label: 'Programlar', icon: '🏫' },
    { path: '/coach/students', label: 'Öğrenciler', icon: '👨‍🎓' },
    { path: '/coach/calendar', label: 'Takvim', icon: '📅' },
    { path: '/coach/reports', label: 'Raporlar', icon: '📈' },
    { path: '/coach/profile', label: 'Profil', icon: '👤' },
    ...(user?.isAdmin ? [{ path: '/admin', label: 'Yönetim (Onaylar)', icon: '🛡️' }] : []),
  ];

  return (
    <div className={styles.layout}>
      {/* Mobil Sidebar Overlay */}
      {sidebarOpen && (
        <div className={styles.overlay} onClick={closeSidebar}></div>
      )}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logo}>Mentörüm</div>
          <button className={styles.closeBtn} onClick={closeSidebar}>
            ✕
          </button>
        </div>

        {/* [MOBILE_PORT_TODO]: window.innerWidth yerine platform servisi (utils/platform.js) kullanılmalı */}
        <nav className={styles.nav}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => {
                if (window.innerWidth < 1024) closeSidebar();
              }}
              className={({ isActive }) => 
                isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem
              }
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>
              {user?.fullName?.charAt(0) || 'C'}
            </div>
            <div className={styles.userDetails}>
              <span className={styles.userName}>{user?.fullName}</span>
              <span className={styles.userRole}>Koç</span>
            </div>
          </div>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={styles.main}>
        {/* Topbar */}
        <header className={styles.topbar}>
          <button className={styles.menuBtn} onClick={toggleSidebar}>
            ☰
          </button>
          <div className={styles.topbarRight}>
            <button className={styles.notificationBtn}>
              🔔 {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
            </button>
          </div>
        </header>

        {/* Sayfa İçeriği */}
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default CoachLayout;
