import React from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../../features/auth/authStore';
import { apiClient } from '../../../api/apiClient';
import { useParentChildren } from '../../../features/parent/parentApi';
import NotificationDropdown from '../../common/NotificationDropdown/NotificationDropdown';
import ParentEmptyState from '../../common/ParentEmptyState/ParentEmptyState';
import ThemeSelector from '../../common/ThemeSelector/ThemeSelector';
import ThemeDecorContainer from '../../common/ThemeDecor/ThemeDecorContainer';
import styles from './ParentLayout.module.css';

const ParentLayout = () => {
  const { user, viewAs, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const displayName = viewAs?.name || user?.fullName || 'Veli';
  const displayInitial = displayName.charAt(0);

  const { data: children = [] } = useParentChildren();
  const activeChild = children[0];

  const canViewHomework = activeChild ? activeChild.canViewHomework === 1 : true;
  const canViewCalendar = activeChild ? activeChild.canViewCalendar === 1 : true;
  const canViewExams = activeChild ? activeChild.canViewExams === 1 : true;
  const canViewPayments = activeChild ? activeChild.canViewPayments === 1 : true;

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {}
    clearAuth();
    navigate('/login');
  };

  // Dinamik sekmeler (5 Ergonomik Sekme: Takvim & Program birleştirildi)
  const tabs = [
    { path: '/parent/summary', label: 'Özet', icon: '📊', isAllowed: true },
    ...(canViewHomework ? [{ path: '/parent/homework', label: 'Ödev Takibi', icon: '📋', isAllowed: canViewHomework }] : []),
    ...(canViewCalendar ? [{ path: '/parent/calendar', label: 'Takvim & Program', icon: '🗓️', isAllowed: canViewCalendar }] : []),
    ...(canViewExams ? [{ path: '/parent/exams', label: 'Sınavlar', icon: '📝', isAllowed: canViewExams }] : []),
    ...(canViewPayments ? [{ path: '/parent/payments', label: 'Ödemeler', icon: '💳', isAllowed: canViewPayments }] : []),
  ];

  // Aktif sayfanın yetki kontrolü
  const currentPath = location.pathname;
  let isCurrentRouteForbidden = false;
  if (currentPath.includes('/parent/homework') && !canViewHomework) isCurrentRouteForbidden = true;
  if (currentPath.includes('/parent/calendar') && !canViewCalendar) isCurrentRouteForbidden = true;
  if (currentPath.includes('/parent/schedule') && !canViewCalendar) isCurrentRouteForbidden = true;
  if (currentPath.includes('/parent/exams') && !canViewExams) isCurrentRouteForbidden = true;
  if (currentPath.includes('/parent/payments') && !canViewPayments) isCurrentRouteForbidden = true;

  return (
    <div className={styles.layout}>
      <ThemeDecorContainer />
      {/* Topbar for mobile/parent view */}
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

      {/* Main Content Area */}
      <main className={styles.main}>
        {isCurrentRouteForbidden ? (
          <ParentEmptyState message="Koçunuz henüz bu alanı erişime açmadı." />
        ) : (
          <Outlet />
        )}
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
