import React from 'react';
import { useTranslation } from 'react-i18next';
import BaseModal from '../Common/BaseModal';
import styles from './MemberDetailModal.module.css';

const AVATAR_COLORS = [
  { bg: 'rgba(91,91,214,0.13)', color: '#5B5BD6' },
  { bg: 'rgba(34,197,94,0.12)', color: '#22C55E' },
  { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B' },
  { bg: 'rgba(239,68,68,0.11)', color: '#EF4444' },
  { bg: 'rgba(99,102,241,0.12)', color: '#818CF8' },
];

const getAvatarStyle = (str, isNatureTheme) => {
  const code = str ? String(str).charCodeAt(0) : 0;
  const colorObj = AVATAR_COLORS[code % AVATAR_COLORS.length];
  if (isNatureTheme) {
    return { background: 'var(--acs, var(--accent-t))', color: 'var(--ac, var(--accent))' };
  }
  return { background: colorObj.bg, color: colorObj.color };
};

const MemberDetailModal = ({ isOpen, onClose, member, tasks = [], tone, isNatureTheme }) => {
  const { t } = useTranslation('common');

  if (!member) return null;

  const displayName = member.displayName || member.email || 'İsimsiz Üye';
  const initial = displayName.charAt(0).toUpperCase();
  const avatarStyle = getAvatarStyle(displayName, isNatureTheme);

  // Filter tasks assigned to this member in this workspace
  const memberTasks = tasks.filter(t => t.userId === member.userId || t.assignedToUserId === member.userId);
  const completedTasks = memberTasks.filter(t => t.isCompleted);
  const pendingTasks = memberTasks.filter(t => !t.isCompleted);

  // Format joined date & time
  let joinedFormatted = '-';
  if (member.joinedAt) {
    const d = new Date(member.joinedAt);
    joinedFormatted = d.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  const isOwner = member.role === 'Admin' || member.role === 'Owner';

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('ws_member_detail_title', { context: tone, defaultValue: 'Üye Detayı' })}
      maxWidth="500px"
    >
      <div className={styles.container}>
        {/* Profile Card */}
        <div className={styles.profileCard}>
          <div className={styles.avatar} style={avatarStyle}>
            {initial}
          </div>
          <div className={styles.profileInfo}>
            <div className={styles.nameRow}>
              <span className={styles.name}>{displayName}</span>
              {isOwner ? (
                <span className={`${styles.badge} ${styles.badgeOwn}`}>
                  {t('ws_role_owner', { context: tone, defaultValue: 'Yönetici' })}
                </span>
              ) : member.isActiveMember ? (
                <span className={`${styles.badge} ${styles.badgeAct}`}>
                  {t('ws_badge_active', { context: tone, defaultValue: 'Aktif' })}
                </span>
              ) : (
                <span className={`${styles.badge} ${styles.badgeMem}`}>
                  {t('ws_role_member', { context: tone, defaultValue: 'Pasif' })}
                </span>
              )}
            </div>
            {member.email && (
              <div className={styles.email}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 14, height: 14, flexShrink: 0}}>
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <span>{member.email}</span>
              </div>
            )}
          </div>
        </div>

        {/* Info Grid */}
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <div className={styles.infoLabel}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 12, height: 12}}>
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              {t('ws_lbl_joined_at', { context: tone, defaultValue: 'Katılma Zamanı' })}
            </div>
            <div className={styles.infoValue}>{joinedFormatted}</div>
          </div>

          <div className={styles.infoItem}>
            <div className={styles.infoLabel}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 12, height: 12}}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              {t('ws_lbl_role', { context: tone, defaultValue: 'Rol / Yetki' })}
            </div>
            <div className={styles.infoValue}>
              {isOwner ? t('ws_role_owner', { context: tone, defaultValue: 'Yönetici' }) : (member.role === 'Observer' ? 'Gözlemci (Veli)' : t('ws_role_member', { context: tone, defaultValue: 'Üye' }))}
            </div>
          </div>
        </div>

        {/* Bento stats */}
        <div className={styles.bento}>
          <div className={styles.bentoCard}>
            <div className={`${styles.bentoVal} ${styles.bentoValTotal}`}>{memberTasks.length}</div>
            <div className={styles.bentoLbl}>{t('ws_stats_total', { context: tone, defaultValue: 'Toplam Görev' })}</div>
          </div>
          <div className={styles.bentoCard}>
            <div className={`${styles.bentoVal} ${styles.bentoValDone}`}>{completedTasks.length}</div>
            <div className={styles.bentoLbl}>{t('ws_stats_done', { context: tone, defaultValue: 'Tamamlanan' })}</div>
          </div>
          <div className={styles.bentoCard}>
            <div className={`${styles.bentoVal} ${styles.bentoValPending}`}>{pendingTasks.length}</div>
            <div className={styles.bentoLbl}>{t('ws_stats_pending', { context: tone, defaultValue: 'Bekleyen' })}</div>
          </div>
        </div>

        {/* Task List Header */}
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 15, height: 15}}>
              <path d="M9 11l3 3L22 4"></path>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
            </svg>
            {t('ws_member_tasks_title', { context: tone, defaultValue: 'Görev Durumu' })}
          </div>
        </div>

        {/* Task List */}
        {memberTasks.length === 0 ? (
          <div className={styles.emptyTasks}>
            {t('ws_member_no_tasks', { context: tone, defaultValue: 'Bu üyeye atanmış herhangi bir görev bulunmuyor.' })}
          </div>
        ) : (
          <div className={styles.taskList}>
            {/* Show pending first, then completed */}
            {[...pendingTasks, ...completedTasks].map((task) => (
              <div key={task.id} className={`${styles.taskCard} ${task.isCompleted ? styles.taskDone : ''}`}>
                <div className={`${styles.chk} ${task.isCompleted ? styles.chkDone : ''}`}>
                  {task.isCompleted && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </div>
                <div className={styles.taskBody}>
                  <div className={`${styles.taskTitle} ${task.isCompleted ? styles.taskTitleDone : ''}`}>
                    {task.title}
                  </div>
                  <div className={styles.taskMeta}>
                    <span className={styles.taskTag}>{task.taskType || 'Görev'}</span>
                    {task.deadline && (
                      <span>
                        {new Date(task.deadline).toLocaleDateString('tr-TR')}
                      </span>
                    )}
                    <span>·</span>
                    <span style={{ color: task.isCompleted ? 'var(--gn, #22c55e)' : 'var(--am, #f59e0b)' }}>
                      {task.isCompleted 
                        ? t('ws_task_done', { context: tone, defaultValue: 'Tamamlandı' }) 
                        : t('task_status_pending', { context: tone, defaultValue: 'Bekliyor' })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </BaseModal>
  );
};

export default MemberDetailModal;
