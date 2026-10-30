import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../../features/auth/authStore';
import { useUIStore } from '../../../store/uiStore';
import { usePendingApprovals } from '../../../features/coach/coachSchoolApi';
import { useApprovals } from '../../../features/coach/coachApi';
import NotificationDropdown from '../../common/NotificationDropdown/NotificationDropdown';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  BarChart3, 
  ShieldCheck, 
  ShieldAlert,
  UserCog, 
  GraduationCap,
  CreditCard,
  LogOut, 
  Sun, 
  Moon, 
  Search, 
  Plus, 
  Menu, 
  X,
  Sparkles,
  Eye,
  FolderOpen,
  History
} from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import ThemeDecorContainer from '../../common/ThemeDecor/ThemeDecorContainer';
import ThemeSelector from '../../common/ThemeSelector/ThemeSelector';
import InstallAppButton from '../../common/InstallAppButton/InstallAppButton';
import ViewAsModal from '../../../features/coach/view-as/ViewAsModal';
import AssignHomeworkModal from '../../../features/coach/homework/AssignHomeworkModal';
import styles from './CoachLayout.module.css';

const CoachLayout = () => {
  const { user, logoutUser, viewAs } = useAuthStore();
  const { sidebarOpen, toggleSidebar, closeSidebar, theme, toggleTheme } = useUIStore();
  const navigate = useNavigate();
  const location = useLocation();
  const searchInputRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isViewAsModalOpen, setIsViewAsModalOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // Süper yönetici onay sayacı
  const { data: pendingApprovals } = usePendingApprovals(Boolean(user?.isAdmin));
  const pendingCount = user?.isAdmin ? (pendingApprovals?.length || 0) : 0;

  // Koç bekleyen onayları sayacı (tüm programlar)
  const { data: coachApprovals = [] } = useApprovals(undefined, 'PENDING');
  const coachPendingCount = coachApprovals?.length || 0;

  // Mobil Alt Bar Sekmeleri (4 Sık Kullanılan + 1 Menü Çekmecesi)
  const bottomNavTabs = [
    { path: '/coach/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/coach/students', label: 'Öğrenciler', icon: Users },
    { path: '/coach/calendar', label: 'Takvim', icon: Calendar },
    { 
      path: '/coach/approvals', 
      label: 'Onaylar', 
      icon: ShieldCheck, 
      badge: coachPendingCount > 0 ? coachPendingCount : null 
    },
    { isDrawer: true, label: 'Menü', icon: Menu }
  ];

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

  const handleLogout = () => logoutUser(navigate);

  // Dinamik Breadcrumb Başlığı ve Üst Kategori
  const getBreadcrumbInfo = () => {
    const p = location.pathname;
    if (p.includes('/audit-logs')) return { title: 'İşlem Geçmişi (Denetim)' };
    if (p.includes('/dashboard')) return { title: 'Dashboard' };
    if (/^\/coach\/students\/[^/]+/.test(p)) {
      return { parentLabel: 'Öğrenciler & Programlar', parentPath: '/coach/students', title: 'Öğrenci Detayı' };
    }
    if (p.includes('/courses/')) {
      return { parentLabel: 'Öğrenciler & Programlar', parentPath: '/coach/students?tab=COURSES', title: 'Ders Detayı' };
    }
    if (p.includes('/students') || p.includes('/courses') || p.includes('/groups')) {
      return { title: 'Öğrenciler & Programlar' };
    }
    if (/\/teachers\/[^/]+/.test(p)) {
      return { parentLabel: 'Öğretmenler', parentPath: '/coach/teachers', title: 'Öğretmen Detayı' };
    }
    if (p.includes('/teachers')) return { title: 'Öğretmenler' };
    if (p.includes('/payments')) return { title: 'Finans & Ödemeler' };
    if (p.includes('/calendar') || p.includes('/schedule')) return { title: 'Takvim & Program' };
    if (p.includes('/approvals')) return { title: 'Onay Merkezi' };
    if (p.includes('/reports')) return { title: 'Raporlar & Analiz' };
    if (p.includes('/storage')) return { title: 'Dosyalarım' };
    if (p.includes('/profile') || p.includes('/settings')) return { title: 'Ayarlar & Profil' };
    if (p.includes('/admin')) return { title: 'Sistem Yönetimi (Admin)' };
    if (p.includes('/programs')) return { title: 'Öğrenciler & Programlar' };
    return { title: 'Panel' };
  };

  const breadcrumbInfo = getBreadcrumbInfo();
  const getPageTitle = () => breadcrumbInfo.title;

  const currentDateFormatted = format(new Date(), 'd MMMM yyyy, EEEE', { locale: tr });

  // Menü Gruplaması (30 SaaS analizine uygun 4 Temiz Grup)
  const navGroups = [
    {
      groupTitle: 'KOMUTA MERKEZİ',
      items: [
        { path: '/coach/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/coach/calendar', label: 'Takvim & Program', icon: Calendar },
        { 
          path: '/coach/approvals', 
          label: 'Onay Merkezi', 
          icon: ShieldCheck, 
          badge: coachPendingCount > 0 ? coachPendingCount : null 
        },
      ],
    },
    {
      groupTitle: 'AKADEMİK YÖNETİM',
      items: [
        { path: '/coach/students', label: 'Öğrenciler & Programlar', icon: Users },
        { path: '/coach/teachers', label: 'Öğretmenler', icon: GraduationCap },
        { path: '/coach/storage', label: 'Dosyalarım', icon: FolderOpen },
      ],
    },
    {
      groupTitle: 'ANALİZ & FİNANS',
      items: [
        { path: '/coach/payments', label: 'Finans & Ödemeler', icon: CreditCard },
        { path: '/coach/reports', label: 'Raporlar & Analiz', icon: BarChart3 },
      ],
    },
    {
      groupTitle: 'SİSTEM',
      items: [
        { path: '/coach/audit-logs', label: 'İşlem Geçmişi (Denetim)', icon: History },
        { path: '/coach/profile', label: 'Ayarlar & Profil', icon: UserCog },
        ...(user?.isAdmin ? [{ 
          path: '/coach/admin', 
          label: 'Sistem Yönetimi (Admin)', 
          icon: ShieldAlert, 
          badge: pendingCount > 0 ? pendingCount : null 
        }] : []),
      ],
    },
  ];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/coach/students?q=${encodeURIComponent(searchQuery.trim())}`);
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
                      className={({ isActive }) => {
                        const isProgramSubRoute =
                          item.path === '/coach/students' &&
                          (location.pathname.includes('/courses') || location.pathname.includes('/groups'));
                        return isActive || isProgramSubRoute
                          ? `${styles.navItem} ${styles.navItemActive}`
                          : styles.navItem;
                      }}
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

        {/* Mobil Çekmece Hızlı Aksiyonları (PWA, Tema, Gözüyle Gör) */}
        <div className={styles.drawerQuickActions}>
          {user?.isAdmin && (
            <button 
              type="button" 
              onClick={() => { closeSidebar(); setIsViewAsModalOpen(true); }}
              className={styles.drawerActionBtn}
              style={{
                color: viewAs ? '#f59e0b' : 'var(--text-color-main)',
                background: viewAs ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.05)'
              }}
            >
              <Eye size={18} />
              <span>{viewAs ? 'Gözüyle Gör: Aktif' : 'Rol Gözüyle Gör'}</span>
            </button>
          )}
          <div className={styles.drawerInstallRow}>
            <InstallAppButton />
          </div>
          <div className={styles.drawerThemeRow}>
            <ThemeSelector />
          </div>
        </div>

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
        {/* Sticky Üst Bar (64px) */}
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button className={styles.menuBtn} onClick={toggleSidebar} aria-label="Menü">
              <Menu size={20} />
            </button>
            <div className={styles.breadcrumbBox}>
              <div className={styles.breadcrumbs}>
                <span className={styles.crumbRoot} style={{ cursor: 'pointer' }} onClick={() => navigate('/coach/dashboard')}>
                  Mentörüm
                </span>
                {breadcrumbInfo.parentLabel && (
                  <>
                    <span className={styles.crumbSlash}>/</span>
                    <span
                      className={styles.crumbRoot}
                      style={{ cursor: 'pointer', color: 'var(--color-primary)' }}
                      onClick={() => navigate(breadcrumbInfo.parentPath)}
                    >
                      {breadcrumbInfo.parentLabel}
                    </span>
                  </>
                )}
                <span className={styles.crumbSlash}>/</span>
                <span className={styles.crumbCurrent}>{getPageTitle()}</span>
              </div>
              <span className={styles.todayDate}>{currentDateFormatted}</span>
              <h1 className={styles.mobileTitle}>{getPageTitle()}</h1>
            </div>
          </div>

          {/* Orta Arama Çubuğu (Masaüstü) */}
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
            {/* Mobilde Arama Modalı Açıcı */}
            <button
              type="button"
              className={styles.mobileSearchBtn}
              onClick={() => setIsMobileSearchOpen(true)}
              title="Arama Yap"
              aria-label="Arama Yap"
            >
              <Search size={18} />
            </button>

            {/* Masaüstü: Gözüyle Gör */}
            {user?.isAdmin && (
              <button 
                type="button" 
                onClick={() => setIsViewAsModalOpen(true)}
                className={styles.desktopViewAsBtn}
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
            )}

            {/* Masaüstü: Uygulama İndir */}
            <div className={styles.desktopInstallWrap}>
              <InstallAppButton />
            </div>

            {/* Hızlı Aksiyon (Ödev Ata) */}
            <button
              type="button"
              className={styles.quickActionBtn}
              onClick={() => setIsAssignModalOpen(true)}
              title="Yeni Ödev Ata"
            >
              <Plus size={18} strokeWidth={2.2} />
              <span>Ödev Ata</span>
            </button>

            {/* Masaüstü: Tema Seçici */}
            <div className={styles.desktopThemeWrap}>
              <ThemeSelector />
            </div>

            {/* Bildirimler (Taşma engellendi) */}
            <div className={styles.notificationWrap}>
              <NotificationDropdown />
            </div>
          </div>
        </header>

        {/* Mobil Arama Modalı */}
        {isMobileSearchOpen && (
          <div className={styles.mobileSearchOverlay} onClick={() => setIsMobileSearchOpen(false)}>
            <div className={styles.mobileSearchModal} onClick={(e) => e.stopPropagation()}>
              <form 
                className={styles.mobileSearchForm}
                onSubmit={(e) => { 
                  handleSearchSubmit(e); 
                  setIsMobileSearchOpen(false); 
                }}
              >
                <Search size={18} className={styles.mobileSearchIcon} />
                <input
                  autoFocus
                  type="text"
                  placeholder="Öğrenci, program veya ödev ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.mobileSearchInput}
                />
                <button 
                  type="button" 
                  onClick={() => setIsMobileSearchOpen(false)} 
                  className={styles.mobileSearchClose}
                  aria-label="Kapat"
                >
                  <X size={18} />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Dinamik Sayfa İçeriği */}
        <main className={styles.pageContent}>
          <Outlet />
        </main>

        {/* Mobil Alt Menü Barı (< 768px - 5 Ergonomik Sekme) */}
        <nav className={styles.bottomNav}>
          {bottomNavTabs.map((tab) => {
            const IconComponent = tab.icon;
            if (tab.isDrawer) {
              return (
                <button
                  key="drawer-menu"
                  type="button"
                  className={styles.tab}
                  onClick={toggleSidebar}
                  aria-label="Tüm Menüler"
                >
                  <span className={styles.tabIcon}>
                    <IconComponent size={20} />
                    {coachPendingCount > 0 && <span className={styles.tabBadgeDot} />}
                  </span>
                  <span className={styles.tabLabel}>{tab.label}</span>
                </button>
              );
            }
            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                className={({ isActive }) => 
                  isActive ? `${styles.tab} ${styles.tabActive}` : styles.tab
                }
              >
                <span className={styles.tabIcon}>
                  <IconComponent size={20} />
                  {tab.badge != null && <span className={styles.tabCounterBadge}>{tab.badge}</span>}
                </span>
                <span className={styles.tabLabel}>{tab.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {user?.isAdmin && (
        <ViewAsModal 
          isOpen={isViewAsModalOpen} 
          onClose={() => setIsViewAsModalOpen(false)} 
        />
      )}

      <AssignHomeworkModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
      />
    </div>
  );
};

export default CoachLayout;
