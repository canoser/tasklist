import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './WorkspaceDetailScreen.module.css';
import { useTranslation } from 'react-i18next';
import FileUploadModal from './FileUploadModal';
import AssignTaskModal from './AssignTaskModal';
import MemberDetailModal from './MemberDetailModal';
import TaskDetailModal from './TaskDetailModal';
import { workspaceService } from '../../services/workspaceService';
import { storageService } from '../../services/storageService';

// Global decorators NatureDecor and OceanDecor now handle the background SVGs

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

const WorkspaceDetailScreen = ({ workspace, user, tone, navigation, onBack, onLeave, onUpdateWorkspace, isNatureTheme, isOceanLight, isOceanDark }) => {
  const { t } = useTranslation('common');
  const isOwner = workspace.ownerId === (user?.id || user?.uid);
  
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [isTasksOpen, setIsTasksOpen] = useState(false);
  const [isFilesOpen, setIsFilesOpen] = useState(false);

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

  const [members, setMembers] = useState([]);
  const [pendingMembers, setPendingMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);

  // O(1) Member Lookup Map for Performance
  const membersMap = useMemo(() => {
    const map = new Map();
    members.forEach(m => map.set(m.userId, m));
    return map;
  }, [members]);

  // Group tasks by ChainId so assignments to multiple people appear as one task
  const groupedTasks = useMemo(() => {
    const groups = new Map();
    const singles = [];
    
    tasks.forEach(t => {
      // Eskiden verilmiş görevlerde kurucuyu gizlemek için:
      if (t.userId === workspace.ownerId) {
        return;
      }

      if (t.chainId) {
        const key = `${t.chainId}_${t.chainOrder || 0}`;
        if (!groups.has(key)) {
          groups.set(key, { 
            ...t, 
            _assignedUsers: [t.userId], 
            _allCompleted: t.isCompleted, 
            _subTasks: [t] 
          });
        } else {
          const g = groups.get(key);
          if (!g._assignedUsers.includes(t.userId)) {
            g._assignedUsers.push(t.userId);
            g._subTasks.push(t);
            if (!t.isCompleted) g._allCompleted = false;
          }
        }
      } else {
        singles.push({ 
          ...t, 
          _assignedUsers: [t.userId], 
          _allCompleted: t.isCompleted, 
          _subTasks: [t] 
        });
      }
    });
    
    // Eğer tüm atamalar kurucuya yapılmışsa ve geriye kimse kalmamışsa o grubu da göstermeyelim (length > 0 olanlar kalsın)
    const validGroups = Array.from(groups.values()).filter(g => g._assignedUsers.length > 0);
    const validSingles = singles.filter(s => s._assignedUsers.length > 0);

    return [...validGroups, ...validSingles].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [tasks, workspace.ownerId]);

  useEffect(() => {
    if (!navigation?.isModalOpen('ws_member_detail') && selectedMember) {
      setSelectedMember(null);
    }
  }, [navigation?.isModalOpen('ws_member_detail'), selectedMember]);

  const handleOpenMember = (m) => {
    setSelectedMember(m);
    navigation?.openModal('ws_member_detail');
  };

  const handleCloseMember = () => {
    if (navigation?.isModalOpen('ws_member_detail')) {
      navigation.closeModal('ws_member_detail');
    } else {
      setSelectedMember(null);
    }
  };

  const handleCloseUpload = () => {
    if (navigation?.isModalOpen('ws_upload_file')) {
      navigation.closeModal('ws_upload_file');
    }
  };

  const handleCloseAssign = () => {
    if (navigation?.isModalOpen('ws_assign_task')) {
      navigation.closeModal('ws_assign_task');
    }
  };

  const handleOpenTask = (task) => {
    setSelectedTask(task);
    navigation?.openModal('ws_task_detail');
  };

  const handleCloseTask = () => {
    if (navigation?.isModalOpen('ws_task_detail')) {
      navigation.closeModal('ws_task_detail');
    } else {
      setSelectedTask(null);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      setLoading(true);
      try {
        const [fetchedMembers, fetchedTasks, fetchedFiles] = await Promise.all([
          workspaceService.getMembers(workspace.id).catch(() => []),
          workspaceService.getWorkspaceTasks(workspace.id).catch(() => []),
          workspaceService.getWorkspaceFiles(workspace.id).catch(() => [])
        ]);

        let fetchedPending = [];
        if (isOwner) {
          fetchedPending = await workspaceService.getPendingMembers(workspace.id).catch(() => []);
        }

        if (mounted) {
          setMembers(fetchedMembers);
          setPendingMembers(fetchedPending);
          setTasks(fetchedTasks);
          setFiles(fetchedFiles);
        }
      } catch (err) {
        console.error("Veriler yüklenemedi:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (workspace?.id) {
      loadData();
    }

    return () => { mounted = false; };
  }, [workspace.id]);

  const handleAssignTask = async (taskData) => {
    try {
      await workspaceService.assignTask(workspace.id, taskData);
      // Refresh tasks
      const fetchedTasks = await workspaceService.getWorkspaceTasks(workspace.id);
      setTasks(fetchedTasks);
    } catch (err) {
      throw err; // AssignTaskModal will catch and show error
    }
  };

  const handleDownloadFile = async (fileUrl) => {
    try {
      const { downloadUrl } = await storageService.getDownloadUrl(fileUrl);
      window.open(downloadUrl, '_blank');
    } catch (err) {
      alert("Dosya indirilemedi: " + err.message);
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm(t('ws_confirm_delete_file', { context: tone, defaultValue: 'Dosyayı silmek istediğinize emin misiniz?' }))) return;
    try {
      await workspaceService.deleteWorkspaceFile(workspace.id, fileId);
      setFiles(files.filter(f => f.id !== fileId));
    } catch (err) {
      alert("Dosya silinemedi: " + err.message);
    }
  };

  const handleUploadSuccess = async (fileId) => {
    console.log("Dosya yüklendi: ", fileId);
    const fetchedFiles = await workspaceService.getWorkspaceFiles(workspace.id);
    setFiles(fetchedFiles);
  };

  const handleApproveMember = async (memberId) => {
    try {
      await workspaceService.approveMember(workspace.id, memberId);
      setPendingMembers(pendingMembers.filter(m => m.id !== memberId));
      const fetchedMembers = await workspaceService.getMembers(workspace.id);
      setMembers(fetchedMembers);
    } catch (err) {
      alert("Onaylanamadı: " + err.message);
    }
  };

  const handleRejectMember = async (memberId) => {
    if (!window.confirm("Bu katılım isteğini reddetmek istediğinize emin misiniz?")) return;
    try {
      await workspaceService.rejectMember(workspace.id, memberId);
      setPendingMembers(pendingMembers.filter(m => m.id !== memberId));
    } catch (err) {
      alert("Reddedilemedi: " + err.message);
    }
  };

  // Derived stats
  const pendingTasksCount = groupedTasks.filter(t => !t._allCompleted).length;
  const completedTasksCount = groupedTasks.filter(t => t._allCompleted).length;
  const totalTasksCount = groupedTasks.length;

  // Calculate Storage usage
  const totalStorageBytes = files.reduce((sum, f) => sum + (f.fileSizeInBytes || 0), 0);
  const quotaBytes = 500 * 1024 * 1024; // 500MB default limit
  const storageUsagePercent = Math.min(100, Math.round((totalStorageBytes / quotaBytes) * 100));
  const storageUsageFormatted = (totalStorageBytes / (1024 * 1024)).toFixed(1);

  return (
    <motion.div 
      className={styles.container}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      {/* Main Content Scroll Area */}
      <div className={styles.scroll}>
        
        {/* Back bar */}
        <div className={styles.bbar}>
          <button className={styles.backBtn} onClick={onBack}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width: 18, height: 18, flexShrink: 0}}>
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            {t('ws_title', { context: tone, defaultValue: 'Alanlarım' })}
          </button>
          
          <button className={styles.detAcBtn} onClick={() => navigation?.openModal('ws_assign_task')}>
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
                {members.length > 0 ? members.length : (workspace.memberCount ?? 0)} {t('ws_members_label', { context: tone, defaultValue: 'üye' })} · {t('ws_type_team', { context: tone, defaultValue: 'Ekip' })}
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
            <div className={`${styles.bv} ${styles.bvAc}`}>{totalTasksCount}</div>
            <div className={styles.bl}>{t('ws_stats_total', { context: tone, defaultValue: 'Toplam' })}</div>
          </div>
          <div className={styles.bentoC}>
            <div className={`${styles.bv} ${styles.bvGn}`}>{completedTasksCount}</div>
            <div className={styles.bl}>{t('ws_stats_done', { context: tone, defaultValue: 'Tamam' })}</div>
          </div>
          <div className={styles.bentoC}>
            <div className={`${styles.bv} ${styles.bvAm}`}>{pendingTasksCount}</div>
            <div className={styles.bl}>{t('ws_stats_pending', { context: tone, defaultValue: 'Bekliyor' })}</div>
          </div>
        </div>

        {/* COLLAPSIBLE: Pending Members (Only for Owner) */}
        {isOwner && pendingMembers.length > 0 && (
          <div className={styles.acc} style={{marginBottom: '16px', borderColor: 'var(--amber-light, #fef3c7)'}}>
            <div className={styles.accHead} onClick={() => setIsMembersOpen(true)}>
              <div className={styles.accHeadLeft}>
                <span className={styles.accTtl} style={{color: 'var(--amber, #d97706)'}}>{t('ws_acc_pending', { context: tone, defaultValue: 'Onay Bekleyenler' })}</span>
                <span className={styles.accCnt} style={{background: 'var(--amber, #d97706)', color: '#fff'}}>{pendingMembers.length}</span>
              </div>
            </div>
            
            <div className={styles.accBody}>
              {pendingMembers.map((m) => {
                const memStyle = getAvatarStyle(m.displayName || m.email, isNatureTheme);
                return (
                  <div key={m.id} className={styles.memItem} onClick={() => handleOpenMember(m)} title={t('ws_view_member_detail', { context: tone, defaultValue: 'Üye detayını gör' })}>
                    <div className={styles.memAv} style={memStyle}>{(m.displayName || m.email || '?').charAt(0).toUpperCase()}</div>
                    <div className={styles.memInfo}>
                      <div className={styles.memName}>{m.displayName || m.email || 'İsimsiz'}</div>
                      <div className={styles.memSince}>{new Date(m.joinedAt).toLocaleDateString()}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={(e) => { e.stopPropagation(); handleApproveMember(m.id); }} style={{ padding: '6px 12px', background: 'var(--green)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                        Onayla
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleRejectMember(m.id); }} style={{ padding: '6px 12px', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                        Reddet
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* COLLAPSIBLE: Members */}
        <div className={styles.acc}>
          <div className={styles.accHead} onClick={() => setIsMembersOpen(!isMembersOpen)}>
            <div className={styles.accHeadLeft}>
              <span className={styles.accTtl}>{t('ws_acc_members', { context: tone, defaultValue: 'Üyeler' })}</span>
              <span className={styles.accCnt}>{members.length > 0 ? members.length : (workspace.memberCount ?? 0)}</span>
            </div>
            <div className={styles.accRight}>
              <svg className={`${styles.accChevron} ${isMembersOpen ? styles.open : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>
          
          <div className={`${styles.accBody} ${!isMembersOpen ? styles.closed : ''}`}>
            {members.map((m) => {
              const memStyle = getAvatarStyle(m.displayName || m.email, isNatureTheme);
              return (
                <div key={m.id} className={styles.memItem} onClick={() => handleOpenMember(m)} title={t('ws_view_member_detail', { context: tone, defaultValue: 'Üye detayını gör' })}>
                  <div className={styles.memAv} style={memStyle}>{(m.displayName || m.email || '?').charAt(0).toUpperCase()}</div>
                  <div className={styles.memInfo}>
                    <div className={styles.memName}>{m.displayName || m.email || 'İsimsiz'}</div>
                    <div className={styles.memSince}>{new Date(m.joinedAt).toLocaleDateString()}</div>
                  </div>
                  {m.role === 'Admin' || m.role === 'Owner' ? (
                    <span className={`${styles.badge} ${styles.badgeOwn} ${styles.memBadge}`}>
                      {t('ws_role_owner', { context: tone, defaultValue: 'Yönetici' })}
                    </span>
                  ) : m.isActiveMember ? (
                    <span className={`${styles.badge} ${styles.badgeAct} ${styles.memBadge}`}>
                      {t('ws_badge_active', { context: tone, defaultValue: 'Aktif' })}
                    </span>
                  ) : (
                    <span className={`${styles.badge} ${styles.badgeMem} ${styles.memBadge}`}>
                      {t('ws_role_member', { context: tone, defaultValue: 'Pasif' })}
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
              <span className={styles.accTtl}>{t('ws_acc_tasks', { context: tone, defaultValue: 'Görevler' })}</span>
              <span className={styles.accCnt}>{totalTasksCount}</span>
            </div>
            <div className={styles.accRight}>
              <svg className={`${styles.accChevron} ${isTasksOpen ? styles.open : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>
          
          <div className={`${styles.accBody} ${!isTasksOpen ? styles.closed : ''}`}>
            {groupedTasks.slice(0, 5).map((t) => {
              return (
              <div key={t.id} className={styles.taskItem} onClick={() => handleOpenTask(t)} style={{ cursor: 'pointer', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', width: '100%', gap: '12px' }}>
                  <div className={`${styles.chk} ${t._allCompleted ? styles.chkDone : ''}`}>
                    {t._allCompleted && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                  </div>
                  <div className={styles.taskBody} style={{ flex: 1 }}>
                    <div className={`${styles.taskTtl} ${t._allCompleted ? styles.taskTtlDone : ''}`}>{t.title}</div>
                    <div className={styles.taskTags}>
                      <div className={styles.taskWho} style={{ display: 'flex' }}>
                        {t._assignedUsers.slice(0, 3).map((uid, idx) => {
                          const assignee = membersMap.get(uid);
                          const aName = assignee ? (assignee.displayName || assignee.email || 'Bilinmiyor') : 'Bilinmiyor';
                          return (
                            <div key={uid} className={styles.whoAv} style={{...getAvatarStyle(aName, isNatureTheme), zIndex: 10 - idx, marginLeft: idx > 0 ? '-8px' : '0'}} title={aName}>
                              {aName.charAt(0).toUpperCase()}
                            </div>
                          );
                        })}
                        {t._assignedUsers.length > 3 && (
                          <div className={styles.whoAv} style={{...getAvatarStyle('more', isNatureTheme), zIndex: 7, marginLeft: '-8px'}} title="Tümü">
                            +{t._assignedUsers.length - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )})}
            {groupedTasks.length === 0 && (
              <div className={styles.emptyState}>
                {t('ws_no_tasks_found', { context: tone, defaultValue: 'Henüz bir görev eklenmemiş.' })}
              </div>
            )}
            {groupedTasks.length > 5 && (
              <div className={styles.moreTasks}>
                {t('ws_more_tasks_count', { context: tone, count: groupedTasks.length - 5, defaultValue: `+ ${groupedTasks.length - 5} görev daha göster` })}
              </div>
            )}
          </div>
        </div>

        {/* COLLAPSIBLE: Files */}
        <div className={styles.acc} style={{marginBottom: '24px'}}>
          <div className={styles.accHead} onClick={() => setIsFilesOpen(!isFilesOpen)}>
            <div className={styles.accHeadLeft}>
              <span className={styles.accTtl}>{t('ws_acc_files', { context: tone, defaultValue: 'Dosyalar' })}</span>
              <span className={styles.accCnt}>{files.length}</span>
            </div>
            <div className={styles.accRight}>
              <button className={styles.accBtnAc} onClick={(e) => { e.stopPropagation(); navigation?.openModal('ws_upload_file'); }}>
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
                <div className={styles.storageUsageTrack} title={`${storageUsageFormatted} MB / 500 MB`}>
                  <div className={styles.storageUsageFill} style={{ width: `${storageUsagePercent}%` }}></div>
                </div>
                <span className={styles.storageUsagePercent}>%{storageUsagePercent}</span>
              </div>
            </div>

            {files.map((f) => (
              <div key={f.id} className={styles.fileItem}>
                <div className={styles.fileIconBox} style={getAvatarStyle(f.fileType, isNatureTheme)}>
                  {(f.fileType || '').replace('.', '').substring(0,3).toUpperCase()}
                </div>
                <div className={styles.fileInfo}>
                  <div className={styles.fileName}>{f.fileName}</div>
                  <div className={styles.fileMeta}>
                    <span>{(f.fileSizeInBytes / 1024 / 1024).toFixed(2)} MB</span>
                    <span>·</span>
                    <span>{new Date(f.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <button className={styles.fileActionBtn} onClick={() => handleDownloadFile(f.fileUrl)} title={t('download', { context: tone, defaultValue: 'İndir' })}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                </button>
                {(isOwner || f.uploaderId === (user?.id || user?.uid)) && (
                  <button className={styles.fileActionBtn} style={{color: 'var(--red)'}} onClick={() => handleDeleteFile(f.id)} title={t('delete', { context: tone, defaultValue: 'Sil' })}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                )}
              </div>
            ))}
            {files.length === 0 && (
              <div className={styles.emptyState}>
                {t('ws_no_files_found', { context: tone, defaultValue: 'Bu alanda henüz dosya bulunmuyor.' })}
              </div>
            )}
          </div>
        </div>

      </div>

      <FileUploadModal 
        isOpen={!!navigation?.isModalOpen('ws_upload_file')} 
        onClose={handleCloseUpload} 
        workspaceId={workspace.id} 
        tone={tone}
        onSuccess={handleUploadSuccess}
      />

      <AssignTaskModal 
        isOpen={!!navigation?.isModalOpen('ws_assign_task')}
        onClose={handleCloseAssign}
        onAssign={handleAssignTask}
        members={members}
        tone={tone}
      />

      <MemberDetailModal
        isOpen={!!selectedMember && !!navigation?.isModalOpen('ws_member_detail')}
        onClose={handleCloseMember}
        member={selectedMember}
        tasks={tasks}
        tone={tone}
        isNatureTheme={isNatureTheme}
      />

      <TaskDetailModal
        isOpen={!!selectedTask && !!navigation?.isModalOpen('ws_task_detail')}
        onClose={handleCloseTask}
        task={selectedTask}
        members={members}
        tone={tone}
        isNatureTheme={isNatureTheme}
      />
    </motion.div>
  );
};

export default WorkspaceDetailScreen;
