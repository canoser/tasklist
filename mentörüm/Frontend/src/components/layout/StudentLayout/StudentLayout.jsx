import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../features/auth/authStore';
import { apiClient } from '../../../api/apiClient';
import NotificationDropdown from '../../common/NotificationDropdown/NotificationDropdown';
import ThemeSelector from '../../common/ThemeSelector/ThemeSelector';
import ThemeDecorContainer from '../../common/ThemeDecor/ThemeDecorContainer';
import styles from './StudentLayout.module.css';

const StudentLayout = () => {
  const { user, viewAs, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const displayName = viewAs?.name || user?.fullName || 'Öğrenci';
  const displayInitial = displayName.charAt(0);
  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {}
    clearAuth();
    navigate('/login');
  };

  const tabs = [
    { path: '/student/home', label: 'Ana Sayfa', icon: '🏠' },
    { path: '/student/calendar', label: 'Takvim', icon: '🗓️' },
    { path: '/student/schedule', label: 'Programım', icon: '📅' },
    { path: '/student/courses', label: 'Derslerim', icon: '📚' },
    { path: '/student/homework', label: 'Ödevler', icon: '📝' },
    { path: '/student/profile', label: 'Profil', icon: '👤' },
  ];

  return (
    <div className={styles.layout}>
      <ThemeDecorContainer />
      {/* Tablet & Masaüstü Sol Menü (Sidebar) */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logo}>Mentörüm</div>
          <span className={styles.roleBadge}>Öğrenci</span>
        </div>

        <div className={styles.sidebarUser}>
          <div className={styles.avatar}>
            {displayInitial}
          </div>
          <div className={styles.sidebarUserDetails}>
            <div className={styles.sidebarUserName}>{displayName}</div>
            <div className={styles.sidebarUserEmail}>{user?.email}</div>
          </div>
        </div>

        <nav className={styles.sidebarNav}>
          {tabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) => 
                isActive ? `${styles.sidebarLink} ${styles.sidebarLinkActive}` : styles.sidebarLink
              }
            >
              <span className={styles.sidebarIcon}>{tab.icon}</span>
              <span className={styles.sidebarLabel}>{tab.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <button className={styles.sidebarLogoutBtn} onClick={handleLogout} title="Çıkış Yap">
            <span className={styles.logoutIcon}>🚪</span>
            <span>Çıkış Yap</span>
          </button>
        </div>
      </aside>

      {/* Ana İçerik ve Mobil Üst Bar */}
      <div className={styles.contentWrapper}>
        <header className={styles.topbar}>
          {/* Mobil kullanıcı selamlama */}
          <div className={styles.mobileUserInfo}>
            <div className={styles.avatar}>
              {displayInitial}
            </div>
            <div>
              <div className={styles.greeting}>Merhaba,</div>
              <div className={styles.userName}>{displayName.split(' ')[0]}</div>
            </div>
          </div>

          {/* Masaüstü başlık */}
          <div className={styles.desktopTopbarTitle}>
            Öğrenci Çalışma Alanı
          </div>

          <div className={styles.topbarActions}>
            <ThemeSelector />
            <NotificationDropdown />
            <button className={styles.mobileLogoutBtn} onClick={handleLogout} title="Çıkış Yap">
              🚪
            </button>
          </div>
        </header>

        {/* Sayfa İçeriği */}
        <main className={styles.main}>
          <Outlet />
        </main>

        {/* Mobil Alt Menü Barı (< 768px) */}
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
    </div>
  );
};

export default StudentLayout;
