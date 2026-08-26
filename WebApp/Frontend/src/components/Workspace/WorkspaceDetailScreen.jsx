import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './WorkspaceDetailScreen.module.css';
import { useTranslation } from 'react-i18next';
import FileUploadModal from './FileUploadModal';

// --- Botanical SVG Decoration ---
const NatureLeaf = () => (
  <svg className={styles.natureLeaf} viewBox="0 0 140 852" fill="none" preserveAspectRatio="none">
    <path d="M130 5 Q110 60 90 110 Q65 175 70 240 Q78 310 55 370 Q30 440 45 510 Q60 580 38 640 Q18 710 25 790 Q28 820 20 852" 
      stroke="var(--ac, var(--accent))" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity=".45" />
    <path d="M110 60 Q125 45 132 38" stroke="var(--ac, var(--accent))" strokeWidth="1.1" opacity=".32" strokeLinecap="round"/>
    <path d="M90 110 Q75 90 58 82" stroke="var(--ac, var(--accent))" strokeWidth="1.1" opacity=".30" strokeLinecap="round"/>
    <path d="M70 240 Q88 225 102 222" stroke="var(--ac, var(--accent))" strokeWidth="1.1" opacity=".28" strokeLinecap="round"/>
    <path d="M55 370 Q38 350 24 345" stroke="var(--ac, var(--accent))" strokeWidth="1.1" opacity=".25" strokeLinecap="round"/>
    <path d="M45 510 Q62 492 76 488" stroke="var(--ac, var(--accent))" strokeWidth="1.1" opacity=".22" strokeLinecap="round"/>
    <path d="M38 640 Q22 622 12 618" stroke="var(--ac, var(--accent))" strokeWidth="1.1" opacity=".20" strokeLinecap="round"/>

    <ellipse cx="125" cy="40" rx="6" ry="11" fill="var(--ac, var(--accent))" opacity=".22" transform="rotate(35 125 40)"/>
    <ellipse cx="95" cy="108" rx="8" ry="14" fill="var(--ac, var(--accent))" opacity=".24" transform="rotate(16 95 108)"/>
    <ellipse cx="56" cy="80" rx="5" ry="10" fill="var(--ac, var(--accent))" opacity=".20" transform="rotate(-30 56 80)"/>
    <ellipse cx="66" cy="172" rx="6" ry="11" fill="var(--ac, var(--accent))" opacity=".18" transform="rotate(-22 66 172)"/>
    <ellipse cx="72" cy="238" rx="7" ry="13" fill="var(--ac, var(--accent))" opacity=".22" transform="rotate(-6 72 238)"/>
    <ellipse cx="104" cy="220" rx="5" ry="10" fill="var(--ac, var(--accent))" opacity=".18" transform="rotate(32 104 220)"/>
    <ellipse cx="64" cy="305" rx="6" ry="11" fill="var(--ac, var(--accent))" opacity=".18" transform="rotate(12 64 305)"/>
    <ellipse cx="58" cy="368" rx="7" ry="12" fill="var(--ac, var(--accent))" opacity=".20" transform="rotate(8 58 368)"/>
    <ellipse cx="22" cy="342" rx="5" ry="9" fill="var(--ac, var(--accent))" opacity=".16" transform="rotate(-28 22 342)"/>
    <ellipse cx="36" cy="435" rx="6" ry="10" fill="var(--ac, var(--accent))" opacity=".16" transform="rotate(-15 36 435)"/>
    <ellipse cx="44" cy="508" rx="6" ry="11" fill="var(--ac, var(--accent))" opacity=".18" transform="rotate(-6 44 508)"/>
    <ellipse cx="78" cy="486" rx="5" ry="9" fill="var(--ac, var(--accent))" opacity=".15" transform="rotate(30 78 486)"/>
    <ellipse cx="48" cy="575" rx="5" ry="10" fill="var(--ac, var(--accent))" opacity=".16" transform="rotate(18 48 575)"/>
    <ellipse cx="38" cy="638" rx="6" ry="11" fill="var(--ac, var(--accent))" opacity=".16" transform="rotate(5 38 638)"/>
    <ellipse cx="10" cy="616" rx="4" ry="8" fill="var(--ac, var(--accent))" opacity=".14" transform="rotate(-25 10 616)"/>
    <ellipse cx="22" cy="712" rx="5" ry="9" fill="var(--ac, var(--accent))" opacity=".15" transform="rotate(-10 22 712)"/>
    <ellipse cx="26" cy="788" rx="5" ry="8" fill="var(--ac, var(--accent))" opacity=".14" transform="rotate(15 26 788)"/>

    <circle cx="110" cy="62" r="2.5" fill="var(--ac, var(--accent))" opacity=".35"/>
    <circle cx="68" cy="178" r="2" fill="var(--ac, var(--accent))" opacity=".28"/>
    <circle cx="50" cy="442" r="2" fill="var(--ac, var(--accent))" opacity=".25"/>
    <circle cx="28" cy="712" r="1.8" fill="var(--ac, var(--accent))" opacity=".22"/>
    <circle cx="85" cy="280" r="1.8" fill="var(--ac, var(--accent))" opacity=".24"/>
    <circle cx="42" cy="540" r="1.6" fill="var(--ac, var(--accent))" opacity=".20"/>
  </svg>
);

const AVATAR_COLORS = [
  { bg: 'rgba(91,91,214,0.13)', color: '#5B5BD6' },  // Purple
  { bg: 'rgba(34,197,94,0.12)', color: '#22C55E' },  // Green
  { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B' }, // Amber
  { bg: 'rgba(239,68,68,0.11)', color: '#EF4444' },  // Red
  { bg: 'rgba(99,102,241,0.12)', color: '#818CF8' }, // Indigo
];

// Helper to calculate avatar colors deterministically
const getAvatarStyle = (str, isNatureTheme) => {
  const code = str ? String(str).charCodeAt(0) : 0;
  const colorObj = AVATAR_COLORS[code % AVATAR_COLORS.length];
  if (isNatureTheme) {
    return { background: 'var(--acs, var(--accent-t))', color: 'var(--ac, var(--accent))' };
  }
  return { background: colorObj.bg, color: colorObj.color };
};

const WorkspaceDetailScreen = ({ workspace, user, tone, onBack, onLeave, onUpdateWorkspace, isNatureTheme }) => {
  const { t } = useTranslation('common');
  const isOwner = workspace.ownerId === (user?.id || user?.uid);
  
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [isTasksOpen, setIsTasksOpen] = useState(false);
  const [isFilesOpen, setIsFilesOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Fallback initial character for Workspace
  const initial = workspace.name ? workspace.name.charAt(0).toUpperCase() : '?';
  const mainAvatarStyle = getAvatarStyle(workspace.id, isNatureTheme);

  const handleCopyCode = () => {
    if (workspace.inviteCode) {
      // [MOBILE_PORT_TODO]: Web'te navigator.clipboard çalışır, fakat Android/iOS (Capacitor) için 
      // '@capacitor/clipboard' eklentisi kullanılarak Native Pano kopyalama işlemi yapılmalıdır.
      navigator.clipboard.writeText(workspace.inviteCode);
    }
  };

  const handleShare = () => {
    if (navigator.share && workspace.inviteCode) {
      // [MOBILE_PORT_TODO]: Web'te Web Share API çalışır, Native tarafta Capacitor '@capacitor/share'
      // Share.share() metodu kullanılarak paylaşım tetiklenmelidir.
      navigator.share({
        title: workspace.name,
        text: `${workspace.name} alanına katılmak için davet kodu: ${workspace.inviteCode}`,
      }).catch(console.error);
    }
  };

  // Mock members for visual completeness based on prototype
  const mockMembers = [
    { id: '1', name: user?.displayName || user?.email?.split('@')[0] || 'Kullanıcı', role: 'owner', initials: 'K', since: '14 Ağu 2026' },
    { id: '2', name: 'ayse.k', role: 'member', isActive: true, initials: 'A', since: '16 Ağu 2026' },
    { id: '3', name: 'mert.d', role: 'member', initials: 'M', since: '18 Ağu 2026' },
  ];

  // Mock tasks for visual completeness
  const mockTasks = [
    { id: 't1', title: 'Fizik: 50 soru', done: true, tagLabel: t('ws_task_done', { context: tone, defaultValue: 'Tamamlandı' }), tagClass: styles.tagDn, assignee: { name: 'ayse.k', initial: 'A' } },
    { id: 't2', title: 'Matematik denemesi', done: false, tagLabel: 'Bugün 17:00', tagClass: styles.tagDue, assignee: { name: 'mert.d', initial: 'M' } },
    { id: 't3', title: 'Kimya konu tekrarı', done: false, tagLabel: 'Yarın 10:00', tagClass: styles.tagDue, assignee: { name: 'Kullanıcı', initial: 'K' } },
  ];

  // Mock files for visual completeness
  const mockFiles = [
    { id: 'f1', name: 'Haftalık_Çalışma_Programı.pdf', size: '1.4 MB', ext: 'PDF', date: '21 Ağu 2026', uploader: 'ayse.k', badgeColor: '#EF4444', badgeBg: 'rgba(239, 68, 68, 0.12)' },
    { id: 'f2', name: 'Matematik_Formül_Özeti.docx', size: '620 KB', ext: 'DOC', date: '19 Ağu 2026', uploader: 'mert.d', badgeColor: '#3B82F6', badgeBg: 'rgba(59, 130, 246, 0.12)' },
    { id: 'f3', name: 'Fizik_Deneme_Analizi.xlsx', size: '890 KB', ext: 'XLS', date: '16 Ağu 2026', uploader: 'Kullanıcı', badgeColor: '#10B981', badgeBg: 'rgba(16, 185, 129, 0.12)' }
  ];

  return (
    <motion.div 
      className={styles.container}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      {isNatureTheme && <NatureLeaf />}

      <div className={styles.scroll}>
        
        {/* Back bar */}
        <div className={styles.bbar}>
          <button className={styles.backBtn} onClick={onBack}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width: 18, height: 18, flexShrink: 0}}>
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            {t('ws_title', { context: tone, defaultValue: 'Alanlarım' })}
          </button>
          
          <button className={styles.detAcBtn}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width: 14, height: 14, flexShrink: 0}}>
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            {t('ws_btn_assign_task', { context: tone, defaultValue: 'Görev Ata' })}
          </button>
        </div>

        {/* HERO: inline avatar + title + settings btn */}
        <div className={styles.hero}>
          <div className={styles.heroRow}>
            <div className={styles.heroAv} style={mainAvatarStyle}>
              {initial}
            </div>
            <div className={styles.heroText}>
              <div className={styles.heroTitle}>{workspace.name}</div>
              <div className={styles.heroSub}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 12, height: 12, flexShrink: 0}}>
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 00-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 010 7.75"></path>
                </svg>
                {workspace.memberCount || 1} {t('ws_members_label', { context: tone, defaultValue: 'üye' })} · {t('ws_type_team', { context: tone, defaultValue: 'Ekip' })}
                <span className={styles.heroLive}>● {t('ws_badge_active', { context: tone, defaultValue: 'Aktif' })}</span>
              </div>
            </div>
            {/* Settings (gear) icon */}
            {isOwner && (
              <button className={styles.settingsBtn} title={t('ws_btn_settings', { context: tone, defaultValue: 'Alan Ayarları' })}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 17, height: 17, flexShrink: 0}}>
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"></path>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* COMPACT INVITE STRIP */}
        {isOwner && workspace.inviteCode && (
          <div className={styles.inviteStrip}>
            <div className={styles.invLabelCol}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 13, height: 13, flexShrink: 0}}>
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"></path>
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"></path>
              </svg>
              <span className={styles.invLabelTxt}>{t('ws_invite_label', { context: tone, defaultValue: 'Davet' })}</span>
            </div>
            <div className={styles.invCodeInline}>{workspace.inviteCode}</div>
            <div className={styles.invActions}>
              <button className={styles.invIconBtn} onClick={handleCopyCode} title={t('ws_btn_copy_code', { context: tone, defaultValue: 'Kodu kopyala' })}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 14, height: 14, flexShrink: 0}}>
                  <rect x="9" y="9" width="13" height="13" rx="2"></rect>
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
                </svg>
              </button>
              <button className={styles.invIconBtn} onClick={handleShare} title={t('ws_btn_share_link', { context: tone, defaultValue: 'Bağlantıyı paylaş' })}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 14, height: 14, flexShrink: 0}}>
                  <circle cx="18" cy="5" r="3"></circle>
                  <circle cx="6" cy="12" r="3"></circle>
                  <circle cx="18" cy="19" r="3"></circle>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Bento stats */}
        <div className={styles.bento}>
          <div className={styles.bentoC}>
            <div className={`${styles.bv} ${styles.bvAc}`}>{workspace.tasksCount || 12}</div>
            <div className={styles.bl}>{t('ws_stats_total', { context: tone, defaultValue: 'Toplam' })}</div>
          </div>
          <div className={styles.bentoC}>
            <div className={`${styles.bv} ${styles.bvGn}`}>8</div>
            <div className={styles.bl}>{t('ws_stats_done', { context: tone, defaultValue: 'Tamam' })}</div>
          </div>
          <div className={styles.bentoC}>
            <div className={`${styles.bv} ${styles.bvAm}`}>4</div>
            <div className={styles.bl}>{t('ws_stats_pending', { context: tone, defaultValue: 'Bekliyor' })}</div>
          </div>
        </div>

        {/* COLLAPSIBLE: Members */}
        <div className={styles.acc}>
          <div className={styles.accHead} onClick={() => setIsMembersOpen(!isMembersOpen)}>
            <div className={styles.accHeadLeft}>
              <span className={styles.accTtl}>{t('ws_acc_members', { context: tone, defaultValue: 'Üyeler' })}</span>
              <span className={styles.accCnt}>{workspace.memberCount || 4}</span>
            </div>
            <div className={styles.accRight}>
              <svg className={`${styles.accChevron} ${isMembersOpen ? styles.open : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>
          
          <div className={`${styles.accBody} ${!isMembersOpen ? styles.closed : ''}`}>
            {mockMembers.map((m) => {
              const memStyle = getAvatarStyle(m.name, isNatureTheme);
              return (
                <div key={m.id} className={styles.memItem}>
                  <div className={styles.memAv} style={memStyle}>{m.initials}</div>
                  <div className={styles.memInfo}>
                    <div className={styles.memName}>{m.name}</div>
                    <div className={styles.memSince}>{m.since}</div>
                  </div>
                  {m.role === 'owner' ? (
                    <span className={`${styles.badge} ${styles.badgeOwn} ${styles.memBadge}`}>
                      {t('ws_role_owner', { context: tone, defaultValue: 'Yönetici' })}
                    </span>
                  ) : m.isActive ? (
                    <span className={`${styles.badge} ${styles.badgeAct} ${styles.memBadge}`}>
                      {t('ws_badge_active', { context: tone, defaultValue: 'Aktif' })}
                    </span>
                  ) : (
                    <span className={`${styles.badge} ${styles.badgeMem} ${styles.memBadge}`}>
                      {t('ws_role_member', { context: tone, defaultValue: 'Üye' })}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* COLLAPSIBLE: Tasks */}
        <div className={styles.acc}>
          <div className={styles.accHead} onClick={() => setIsTasksOpen(!isTasksOpen)}>
            <div className={styles.accHeadLeft}>
              <span className={styles.accTtl}>{t('ws_acc_recent_tasks', { context: tone, defaultValue: 'Son Görevler' })}</span>
              <span className={styles.accCnt}>12</span>
            </div>
            <div className={styles.accRight}>
              <svg className={`${styles.accChevron} ${isTasksOpen ? styles.open : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>
          
          <div className={`${styles.accBody} ${!isTasksOpen ? styles.closed : ''}`}>
            {mockTasks.map((t) => (
              <div key={t.id} className={styles.taskItem}>
                <div className={`${styles.chk} ${t.done ? styles.chkDone : ''}`}>
                  {t.done && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </div>
                <div className={styles.taskBody}>
                  <div className={`${styles.taskTtl} ${t.done ? styles.taskTtlDone : ''}`}>{t.title}</div>
                  <div className={styles.taskTags}>
                    <span className={`${styles.tag} ${t.tagClass}`}>{t.tagLabel}</span>
                    <div className={styles.taskWho}>
                      <div className={styles.whoAv} style={getAvatarStyle(t.assignee.name, isNatureTheme)}>{t.assignee.initial}</div>
                      {t.assignee.name}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className={styles.moreTasks}>
              {t('ws_more_tasks_count', { context: tone, count: 9, defaultValue: '+ 9 görev daha göster' })}
            </div>
          </div>
        </div>

        {/* COLLAPSIBLE: Files */}
        <div className={styles.acc} style={{marginBottom: '24px'}}>
          <div className={styles.accHead} onClick={() => setIsFilesOpen(!isFilesOpen)}>
            <div className={styles.accHeadLeft}>
              <span className={styles.accTtl}>{t('ws_acc_files', { context: tone, defaultValue: 'Dosyalar' })}</span>
              <span className={styles.accCnt}>{mockFiles.length}</span>
            </div>
            <div className={styles.accRight}>
              <button className={styles.accBtnAc} onClick={(e) => { e.stopPropagation(); setIsUploadModalOpen(true); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width: 12, height: 12}}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                {t('ws_acc_upload_file', { context: tone, defaultValue: 'Yükle' })}
              </button>
              <svg className={`${styles.accChevron} ${isFilesOpen ? styles.open : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>
          
          <div className={`${styles.accBody} ${!isFilesOpen ? styles.closed : ''}`}>
            {/* Storage Usage row (first slim row) */}
            <div className={styles.storageUsageRow}>
              <div className={styles.storageUsageLabel}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}>
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                </svg>
                <span>{t('ws_storage_used_label', { context: tone, defaultValue: 'Kullanılan Alan' })}</span>
              </div>
              <div className={styles.storageUsageRight}>
                <div className={styles.storageUsageTrack}>
                  <div className={styles.storageUsageFill} style={{ width: '30%' }}></div>
                </div>
                <span className={styles.storageUsagePercent}>%30</span>
              </div>
            </div>

            {mockFiles.map((f) => (
              <div key={f.id} className={styles.fileItem}>
                <div className={styles.fileIconBox} style={{ color: f.badgeColor, background: f.badgeBg, borderColor: f.badgeColor }}>
                  {f.ext}
                </div>
                <div className={styles.fileInfo}>
                  <div className={styles.fileName}>{f.name}</div>
                  <div className={styles.fileMeta}>
                    <span>{f.size}</span>
                    <span>·</span>
                    <span>{f.date}</span>
                    <span>·</span>
                    <span>{f.uploader}</span>
                  </div>
                </div>
                <button className={styles.fileActionBtn} title={t('download', { context: tone, defaultValue: 'İndir' })}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>

      <FileUploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
        workspaceId={workspace.id} 
        tone={tone}
        onSuccess={(fileId) => {
          console.log("Dosya yüklendi: ", fileId);
          // [MOBILE_PORT_TODO]: Yükleme sonrası listeyi yenile.
        }}
      />
    </motion.div>
  );
};

export default WorkspaceDetailScreen;
