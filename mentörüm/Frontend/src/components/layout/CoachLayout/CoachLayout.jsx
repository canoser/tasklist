import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../../features/auth/authStore';
import { apiClient } from '../../../api/apiClient';
import { useUIStore } from '../../../store/uiStore';
import { usePendingApprovals } from '../../../features/coach/coachSchoolApi';
import NotificationDropdown from '../../common/NotificationDropdown/NotificationDropdown';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  BookOpen, 
  BarChart3, 
  ShieldCheck, 
  UserCog, 
  LogOut, 
  Sun, 
  Moon, 
  Search, 
  Plus, 
  Menu, 
  X,
  Sparkles,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import ThemeDecorContainer from '../../common/ThemeDecor/ThemeDecorContainer';
import ThemeSelector from '../../common/ThemeSelector/ThemeSelector';
import InstallAppButton from '../../common/InstallAppButton/InstallAppButton';
import ViewAsModal from '../../../features/coach/view-as/ViewAsModal';
import styles from './CoachLayout.module.css';

const CoachLayout = () => {
  const { user, clearAuth, viewAs } = useAuthStore();
  const { sidebarOpen, toggleSidebar, closeSidebar, theme, toggleTheme } = useUIStore();
  const navigate = useNavigate();
  const location = useLocation();
  const searchInputRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isViewAsModalOpen, setIsViewAsModalOpen] = useState(false);

  // Süper yönetici onay sayacı
  const { data: pendingApprovals } = usePendingApprovals();
  const pendingCount = user?.isAdmin ? (pendingApprovals?.length || 0) : 0;

  // ⌘K / Ctrl+K Global Kısayol Dinleyicisi
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {}
    clearAuth();
    navigate('/login');
  };

  // Dinamik Breadcrumb Başlığı
  const getPageTitle = () => {
    const p = location.pathname;
    if (p.includes('/dashboard')) return 'Dashboard';
    if (p.includes('/students')) return 'Öğrenciler';
    if (p.includes('/programs')) return 'Programlar';
    if (p.includes('/calendar')) return 'Takvim';
    if (p.includes('/approvals')) return 'Onay Merkezi';
    if (p.includes('/reports')) return 'Raporlar';
    if (p.includes('/profile')) return 'Profil';
    if (p.includes('/admin')) return 'Yönetim / Onaylar';
    return 'Panel';
  };

  const currentDateFormatted = format(new Date(), 'd MMMM yyyy, EEEE', { locale: tr });

  // Menü Gruplaması
  const navGroups = [
    {
      groupTitle: 'GENEL',
      items: [
        { path: '/coach/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/coach/calendar', label: 'Takvim', icon: Calendar },
        { path: '/coach/approvals', label: 'Onaylar', icon: ShieldCheck },
      ],
    },
    {
      groupTitle: 'AKADEMİK TAKİP',
      items: [
        { path: '/coach/students', label: 'Öğrenciler', icon: Users },
        { path: '/coach/programs', label: 'Programlar', icon: BookOpen },
        { path: '/coach/reports', label: 'Raporlar', icon: BarChart3 },
      ],
    },
    {
      groupTitle: 'SİSTEM',
      items: [
        ...(user?.isAdmin ? [{ 
          path: '/coach/admin', 
          label: 'Yönetim / Onaylar', 
          icon: ShieldCheck, 
          badge: pendingCount > 0 ? pendingCount : null 
        }] : []),
        { path: '/coach/profile', label: 'Profil', icon: UserCog },
      ],
    },
  ];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/coach/students?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <div className={styles.layout}>
      {/* Hareketli Arka Plan Ortam Dekoru (Doğa / Okyanus) */}
      <ThemeDecorContainer />

      {/* Mobil Sidebar Overlay */}
      {sidebarOpen && (
        <div className={styles.overlay} onClick={closeSidebar}></div>
      )}

      {/* Sol Navigasyon (Sidebar - 260px Sabit / Slate-900) */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        {/* Logo Alanı */}
        <div className={styles.sidebarHeader}>
          <div className={styles.logoWrap} onClick={() => navigate('/coach/dashboard')}>
            <div className={styles.logoIcon}>
              <Sparkles size={18} strokeWidth={2.2} />
            </div>
            <div className={styles.logoTextGroup}>
              <span className={styles.logoText}>Mentörüm</span>
              <span className={styles.proBadge}>KOÇ PANELİ</span>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={closeSidebar} aria-label="Kapat">
            <X size={20} />
          </button>
        </div>

        {/* Gruplandırılmış Navigasyon */}
        <nav className={styles.nav}>
          {navGroups.map((group) => (
            <div key={group.groupTitle} className={styles.navGroup}>
              <div className={styles.navGroupTitle}>{group.groupTitle}</div>
              <div className={styles.navGroupItems}>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
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
                      <span className={styles.navIcon}>
                        <Icon size={18} strokeWidth={1.75} />
                      </span>
                      <span className={styles.navLabel}>{item.label}</span>
                      {item.badge != null && (
                        <span className={styles.counterBadge}>{item.badge}</span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Alt Kullanıcı Kartı (Kompakt Tekil Kart) */}
        <div className={styles.sidebarFooter}>
          <div className={styles.userCard}>
            <div className={styles.userAvatar}>
              {user?.fullName?.charAt(0)?.toUpperCase() || 'C'}
            </div>
            <div className={styles.userDetails}>
              <span className={styles.userName} title={user?.fullName || 'Koç'}>
                {user?.fullName || 'Can Öser'}
              </span>
              <span className={styles.userRole}>
                {user?.isAdmin ? 'Süper Yönetici' : 'Koç'}
              </span>
            </div>
            <div className={styles.userActions}>
              <button
                type="button"
                className={styles.actionIconBtn}
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Açık Temaya Geç' : 'Karanlık Temaya Geç'}
                aria-label="Tema Değiştir"
              >
                {theme === 'dark' ? (
                  <Sun size={16} strokeWidth={1.75} />
                ) : (
                  <Moon size={16} strokeWidth={1.75} />
                )}
              </button>
              <button
                type="button"
                className={`${styles.actionIconBtn} ${styles.logoutActionBtn}`}
                onClick={handleLogout}
                title="Çıkış Yap"
                aria-label="Çıkış Yap"
              >
                <LogOut size={16} strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Ana İçerik Alanı */}
      <div className={styles.mainWrapper}>
        {/* View-As banner'ı artık global ViewAsBanner bileşeninde */}

        {/* Sticky Üst Bar (64px) */}
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button className={styles.menuBtn} onClick={toggleSidebar} aria-label="Menü">
              <Menu size={20} />
            </button>
            <div className={styles.breadcrumbBox}>
              <div className={styles.breadcrumbs}>
                <span className={styles.crumbRoot}>Mentörüm</span>
                <span className={styles.crumbSlash}>/</span>
                <span className={styles.crumbCurrent}>{getPageTitle()}</span>
              </div>
              <span className={styles.todayDate}>{currentDateFormatted}</span>
            </div>
          </div>

          {/* Orta Arama Çubuğu */}
          <form className={styles.searchBox} onSubmit={handleSearchSubmit}>
            <Search size={16} strokeWidth={1.75} className={styles.searchIcon} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Öğrenci, program veya ödev ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
            <kbd className={styles.searchShortcut}>⌘K</kbd>
          </form>

          {/* Sağ Aksiyonlar */}
          <div className={styles.topbarRight}>
            <button 
              type="button" 
              onClick={() => setIsViewAsModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: viewAs ? 'rgba(245, 158, 11, 0.2)' : 'var(--bg-card)',
                color: viewAs ? '#f59e0b' : 'var(--text-primary)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
              title="Rol Gözüyle Gör"
            >
              <Eye size={16} />
              <span>{viewAs ? 'Gözüyle Gör: Açık' : 'Gözüyle Gör'}</span>
            </button>

            <InstallAppButton />

            <button
              type="button"
              className={styles.quickActionBtn}
              onClick={() => navigate('/coach/students')}
              title="Öğrenci veya Ödev İşlemleri"
            >
              <Plus size={16} strokeWidth={2.2} />
              <span>+ Ödev / Program Ata</span>
            </button>

            <ThemeSelector />

            <NotificationDropdown />
          </div>
        </header>

        {/* Dinamik Sayfa İçeriği */}
        <main className={styles.pageContent}>
          <Outlet />
        </main>
      </div>

      <ViewAsModal 
        isOpen={isViewAsModalOpen} 
        onClose={() => setIsViewAsModalOpen(false)} 
      />
    </div>
  );
};

export default CoachLayout;
