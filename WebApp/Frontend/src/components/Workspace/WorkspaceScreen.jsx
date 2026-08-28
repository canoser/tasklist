import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import styles from './WorkspaceScreen.module.css';
import useWorkspaces from '../../hooks/useWorkspaces';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import signalrService from '../../services/signalrService';
import CreateWorkspaceModal from './CreateWorkspaceModal';
import JoinWorkspaceModal from './JoinWorkspaceModal';
import WorkspaceGuideModal from './WorkspaceGuideModal';
import WorkspaceDetailScreen from './WorkspaceDetailScreen';

// Global decorators NatureDecor and OceanDecor now handle the background SVGs

// --- Avatar Colors (Deterministic) ---
const AVATAR_COLORS = [
  { bg: 'rgba(91,91,214,0.13)', color: '#5B5BD6' },  // Purple
  { bg: 'rgba(34,197,94,0.12)', color: '#22C55E' },  // Green
  { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B' }, // Amber
  { bg: 'rgba(239,68,68,0.11)', color: '#EF4444' },  // Red
  { bg: 'rgba(99,102,241,0.12)', color: '#818CF8' }, // Indigo
];

const WorkspaceScreen = ({ user, tone, openAuth }) => {
  const { t } = useTranslation('common');
  const { ownedWorkspaces, joinedWorkspaces, loading, createWorkspace, joinWorkspace, leaveWorkspace, deleteWorkspace } = useWorkspaces(user?.id || user?.uid);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [initialJoinCode, setInitialJoinCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNatureTheme, setIsNatureTheme] = useState(false);
  const [isOceanLight, setIsOceanLight] = useState(false);
  const [isOceanDark, setIsOceanDark] = useState(false);

  // Parse join code and check theme
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('joinCode') || params.get('code');
    if (code) {
      setInitialJoinCode(code);
      setShowJoinModal(true);
      window.history.replaceState({}, '', window.location.pathname + window.location.hash);
    }

    const checkTheme = () => {
      const body = document.body;
      setIsNatureTheme(
        body.classList.contains('theme-nature-dark') || 
        body.classList.contains('theme-nature-light')
      );
      setIsOceanLight(body.classList.contains('theme-ocean-light'));
      setIsOceanDark(body.classList.contains('theme-ocean-dark'));
    };
    
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    const handleMemberJoined = (e) => {
      const { displayName } = e.detail;
      toast.success(t('ws_toast_member_joined', { context: tone, defaultValue: `${displayName} alana katıldı!` }), {
        style: {
          background: 'var(--surface, #1e1e2d)',
          color: 'var(--text-1, #e2e8f0)',
          border: '1px solid var(--border-color, #2d2d3d)'
        }
      });
    };

    const handleMemberPending = (e) => {
      const { displayName } = e.detail;
      toast(t('ws_toast_member_pending', { context: tone, defaultValue: `${displayName} katılmak için onayınızı bekliyor.` }), {
        icon: '⏳',
        style: {
          background: 'var(--surface, #1e1e2d)',
          color: 'var(--text-1, #e2e8f0)',
          border: '1px solid var(--border-color, #2d2d3d)'
        }
      });
    };

    signalrService.addEventListener("MemberJoinedAlert", handleMemberJoined);
    signalrService.addEventListener("MemberPendingAlert", handleMemberPending);

    return () => {
      observer.disconnect();
      signalrService.removeEventListener("MemberJoinedAlert", handleMemberJoined);
      signalrService.removeEventListener("MemberPendingAlert", handleMemberPending);
    };
  }, [tone, t]);

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.empty} style={{ height: '100%', justifyContent: 'center' }}>
          <span className={styles.emptyIco}>🔒</span>
          <div className={styles.emptyTtl}>{t('ws_login_required_title', { context: tone, defaultValue: 'Giriş Yapmalısınız' })}</div>
          <p className={styles.emptySub}>{t('ws_login_required_sub', { context: tone, defaultValue: 'Çalışma alanlarını görüntülemek ve yeni alan oluşturmak için lütfen giriş yapın.' })}</p>
          <button className={styles.emptyBtn} onClick={openAuth}>
            {t('login', { context: tone, defaultValue: 'Giriş Yap' })}
          </button>
        </div>
      </div>
    );
  }

  if (activeWorkspace) {
    return (
      <WorkspaceDetailScreen 
        workspace={activeWorkspace} 
        user={user} 
        tone={tone}
        onBack={() => setActiveWorkspace(null)}
        onLeave={async (id) => {
          await leaveWorkspace(id);
          setActiveWorkspace(null);
        }}
        onUpdateWorkspace={async (updated) => {
          if (updated.isDeleting) {
            await deleteWorkspace(updated.id);
            setActiveWorkspace(null);
          } else {
            setActiveWorkspace(updated);
          }
        }}
        isNatureTheme={isNatureTheme}
        isOceanLight={isOceanLight}
        isOceanDark={isOceanDark}
      />
    );
  }

  const renderWorkspaceCard = (w, isOwner) => {
    const initial = w.name ? w.name.charAt(0).toUpperCase() : '?';
    const progress = 0; // Will be calculated from real tasks later
    
    // Calculate deterministic avatar color
    const colorIdx = w.id ? String(w.id).charCodeAt(0) % AVATAR_COLORS.length : 0;
    const avatarColor = AVATAR_COLORS[colorIdx];
    
    // For nature themes, the prompt requests overriding the color to match the accent token
    const avatarStyle = isNatureTheme 
      ? { background: 'var(--acs, var(--accent-t))', color: 'var(--ac, var(--accent))' }
      : { background: avatarColor.bg, color: avatarColor.color };

    return (
      <motion.div key={w.id} className={styles.wc} whileTap={{ scale: 0.98 }} onClick={() => setActiveWorkspace(w)}>
        <div className={styles.av} style={avatarStyle}>{initial}</div>
        
        <div className={styles.wcInfo}>
          <div className={styles.wcName}>{w.name}</div>
          <div className={styles.wcMeta}>
            <span>{w.memberCount ?? 0} {t('ws_members_label', { context: tone, defaultValue: 'üye' })}</span>
            <span className={styles.mdot}></span>
            <span>{w.tasksCount ?? 0} {t('ws_tasks_label', { context: tone, defaultValue: 'görev' })}</span>
            <span className={styles.mdot}></span>
            <span>{t('ws_type_team', { context: tone, defaultValue: 'Ekip' })}</span>
          </div>
          <div className={styles.progWrap}>
            <div className={styles.progTrack}>
              <div className={styles.progFill} style={{ width: `${progress}%` }}></div>
            </div>
            <span className={styles.progLbl}>%{progress}</span>
          </div>
        </div>

        <div className={styles.wcRight}>
          <div className={`${styles.badge} ${isOwner ? styles.badgeOwn : styles.badgeMem}`}>
            {isOwner ? t('ws_role_owner', { context: tone, defaultValue: 'Yönetici' }) : t('ws_role_member', { context: tone, defaultValue: 'Üye' })}
          </div>
          {isOwner && w.inviteCode ? (
            <div className={styles.wcCode}>{w.inviteCode}</div>
          ) : (
            <div className={styles.dotLive}></div>
          )}
        </div>
      </motion.div>
    );
  };

  const filteredOwned = ownedWorkspaces.filter(w => w.name.toLowerCase().includes(searchQuery.toLowerCase()) || (w.inviteCode && w.inviteCode.toLowerCase().includes(searchQuery.toLowerCase())));
  const filteredJoined = joinedWorkspaces.filter(w => 
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
    w.ownerId !== (user?.id || user?.uid)
  );

  return (
    <div className={styles.container}>
      <div className={styles.scroll}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <div>
              <h1 className={styles.title}>{t('ws_title', { context: tone })}</h1>
              <p className={styles.subtitle}>{t('ws_subtitle', { context: tone })}</p>
            </div>
            <button 
              className={styles.iconBtn}
              onClick={() => setShowGuideModal(true)}
              title={t('ws_how_to_title', { context: tone })}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{width: 18, height: 18, flexShrink: 0}}>
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className={styles.searchBar}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 15, height: 15, flexShrink: 0}}>
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input 
            type="text" 
            className={styles.searchInput} 
            placeholder={t('ws_search_placeholder', { context: tone, defaultValue: 'Alan adı veya davet kodu...' })}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* CTAs */}
        <div className={styles.ctas}>
          <button className={styles.btnAc} onClick={() => setShowCreateModal(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 16, height: 16, flexShrink: 0}}>
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            {t('ws_btn_create', { context: tone, defaultValue: 'Yeni Alan' })}
          </button>
          <button className={styles.btnOut} onClick={() => setShowJoinModal(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 16, height: 16, flexShrink: 0}}>
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"></path>
            </svg>
            {t('ws_btn_join', { context: tone, defaultValue: 'Katıl' })}
          </button>
        </div>

        {/* Workspaces List */}
        {loading ? (
          <div className={styles.empty}>
            <p className={styles.emptySub}>{t('loading', { context: tone })}</p>
          </div>
        ) : (
          <>
            {/* Owned Section */}
            <div className={styles.divider} style={{marginTop: '16px', marginBottom: '8px'}}>
              <div className={styles.divLine}></div>
              <div className={styles.divTxt}>{t('ws_section_owned', { context: tone, defaultValue: 'Yönettiğim Alanlar' })}</div>
              <div className={styles.divLine}></div>
            </div>
            
            {filteredOwned.length === 0 && searchQuery === '' ? (
              <div className={styles.empty}>
                <span className={styles.emptyIco}>🏢</span>
                <div className={styles.emptyTtl}>{t('ws_empty_owned_title', { context: tone, defaultValue: 'Henüz alanınız yok' })}</div>
                <p className={styles.emptySub}>{t('ws_empty_owned', { context: tone })}</p>
                <button className={styles.emptyBtn} onClick={() => setShowCreateModal(true)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width: 14, height: 14, flexShrink: 0}}>
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  {t('ws_btn_create_empty', { context: tone, defaultValue: 'Alan Oluştur' })}
                </button>
              </div>
            ) : (
              filteredOwned.map(w => renderWorkspaceCard(w, true))
            )}

            {/* Joined Section */}
            <div className={styles.divider} style={{marginTop: filteredOwned.length ? '18px' : '10px', marginBottom: '8px'}}>
              <div className={styles.divLine}></div>
              <div className={styles.divTxt}>{t('ws_section_joined', { context: tone, defaultValue: 'Üye Olduğum Alanlar' })}</div>
              <div className={styles.divLine}></div>
            </div>

            {filteredJoined.length === 0 && searchQuery === '' ? (
              <div className={styles.empty} style={{marginTop: '10px'}}>
                <span className={styles.emptyIco}>🔍</span>
                <div className={styles.emptyTtl}>{t('ws_empty_joined_title', { context: tone, defaultValue: 'Bir alana katılmadınız' })}</div>
                <p className={styles.emptySub}>{t('ws_empty_joined', { context: tone })}</p>
                <button className={styles.emptyBtn} onClick={() => setShowJoinModal(true)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 14, height: 14, flexShrink: 0}}>
                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"></path>
                    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"></path>
                  </svg>
                  {t('ws_btn_join_empty', { context: tone, defaultValue: 'Kod ile katıl' })}
                </button>
              </div>
            ) : (
              filteredJoined.map(w => renderWorkspaceCard(w, false))
            )}
            
            {/* Empty Search State */}
            {searchQuery !== '' && filteredOwned.length === 0 && filteredJoined.length === 0 && (
              <div className={styles.empty}>
                <span className={styles.emptyIco}>🔍</span>
                <div className={styles.emptyTtl}>{t('ws_search_empty_title', { context: tone, defaultValue: 'Başka alan bulunamadı' })}</div>
                <p className={styles.emptySub}>{t('ws_search_empty_sub', { context: tone, defaultValue: 'Davet kodu ile yeni bir alana katılabilirsiniz.' })}</p>
                <button className={styles.emptyBtn} onClick={() => setShowJoinModal(true)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 14, height: 14, flexShrink: 0}}>
                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"></path>
                    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"></path>
                  </svg>
                  {t('ws_btn_join_empty', { context: tone, defaultValue: 'Kod ile katıl' })}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <CreateWorkspaceModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
        onCreate={createWorkspace}
        tone={tone}
      />

      <JoinWorkspaceModal 
        isOpen={showJoinModal} 
        onClose={() => setShowJoinModal(false)} 
        onJoin={joinWorkspace}
        tone={tone}
        initialCode={initialJoinCode}
        user={user}
      />

      <WorkspaceGuideModal 
        isOpen={showGuideModal} 
        onClose={() => setShowGuideModal(false)} 
        tone={tone}
      />
    </div>
  );
};

export default WorkspaceScreen;
