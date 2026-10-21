import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../features/auth/authStore';
import { apiClient } from '../../../api/apiClient';
import NotificationDropdown from '../../common/NotificationDropdown/NotificationDropdown';
import ThemeDecorContainer from '../../common/ThemeDecor/ThemeDecorContainer';
import { 
  Home, 
  Calendar, 
  CalendarDays, 
  BookOpen, 
  CheckSquare, 
  Palette, 
  User, 
  FolderOpen,
  LogOut 
} from 'lucide-react';
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

  const sidebarTabs = [
    { path: '/student/home', label: 'Ana Sayfa', icon: Home },
    { path: '/student/calendar', label: 'Takvim', icon: Calendar },
    { path: '/student/schedule', label: 'Programım', icon: CalendarDays },
    { path: '/student/courses', label: 'Derslerim', icon: BookOpen },
    { path: '/student/homework', label: 'Ödevler', icon: CheckSquare },
    { path: '/student/storage', label: 'Dosyalar', icon: FolderOpen },
    { path: '/student/theme', label: 'Temalar', icon: Palette },
    { path: '/student/profile', label: 'Profil', icon: User },
  ];

  const bottomNavTabs = [
    { path: '/student/home', label: 'Ana Sayfa', icon: Home },
    { path: '/student/calendar', label: 'Takvim', icon: Calendar },
    { path: '/student/courses', label: 'Derslerim', icon: BookOpen },
    { path: '/student/homework', label: 'Ödevler', icon: CheckSquare },
    { path: '/student/profile', label: 'Profil', icon: User },
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
          {sidebarTabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                className={({ isActive }) => 
                  isActive ? `${styles.sidebarLink} ${styles.sidebarLinkActive}` : styles.sidebarLink
                }
              >
                <span className={styles.sidebarIcon}><IconComponent size={18} /></span>
                <span className={styles.sidebarLabel}>{tab.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <button className={styles.sidebarLogoutBtn} onClick={handleLogout} title="Çıkış Yap">
            <span className={styles.logoutIcon}><LogOut size={16} /></span>
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
            <NavLink to="/student/theme" className={styles.themeBtn} title="Temayı Değiştir">
              <Palette size={18} />
            </NavLink>
            <NotificationDropdown />
            <button className={styles.mobileLogoutBtn} onClick={handleLogout} title="Çıkış Yap">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Sayfa İçeriği */}
        <main className={styles.main}>
          <Outlet />
        </main>

        {/* Mobil Alt Menü Barı (< 768px - Tam 5 Ergonomik Sekme) */}
        <nav className={styles.bottomNav}>
          {bottomNavTabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                className={({ isActive }) => 
                  isActive ? `${styles.tab} ${styles.tabActive}` : styles.tab
                }
              >
                <span className={styles.tabIcon}><IconComponent size={20} /></span>
                <span className={styles.tabLabel}>{tab.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default StudentLayout;
