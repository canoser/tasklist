import React from 'react';
import { useTranslation } from 'react-i18next';
import BaseModal from '../Common/BaseModal';
import modalStyles from '../Common/BaseModal.module.css';

const AVATAR_COLORS = [
  { bg: 'rgba(91,91,214,0.13)', color: '#5B5BD6' },  // Purple
  { bg: 'rgba(34,197,94,0.12)', color: '#22C55E' },  // Green
  { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B' }, // Amber
  { bg: 'rgba(239,68,68,0.11)', color: '#EF4444' },  // Red
  { bg: 'rgba(99,102,241,0.12)', color: '#818CF8' }, // Indigo
];

const getAvatarStyle = (str, isNatureTheme) => {
  const code = str ? String(str).charCodeAt(0) : 0;
  const colorObj = AVATAR_COLORS[code % AVATAR_COLORS.length];
  if (isNatureTheme) {
    return { background: 'var(--acs, var(--accent-t))', color: 'var(--ac, var(--accent))' };
  }
  return { background: colorObj.bg, color: colorObj.color };
};

const TaskDetailModal = ({ isOpen, onClose, task, members, tone, isNatureTheme, isOwnerViewing, onActionClick, currentUser }) => {
  const { t } = useTranslation('common');

  if (!task) return null;

  const totalAssigned = task._assignedUsers?.length || 1;
  const completedCount = task._subTasks?.filter(st => st.isCompleted).length || 0;
  const pendingCount = totalAssigned - completedCount;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={task.title}
      maxWidth="420px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '10px' }}>
        
        {/* TASK DETAILS (Deadline, Type) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface2)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>{t('field_deadline', { context: tone, defaultValue: 'Son Tarih' })}</span>
            <span style={{ fontSize: '14px', color: 'var(--text-1)', fontWeight: '500' }}>
              {task.deadline ? new Date(task.deadline).toLocaleString() : 'Belirtilmedi'}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>Durum</span>
            <span style={{ 
              fontSize: '12px', 
              padding: '2px 8px', 
              borderRadius: '12px',
              background: task._allCompleted ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              color: task._allCompleted ? 'var(--green)' : 'var(--amber)'
            }}>
              {task._allCompleted ? 'Tamamlandı' : 'Bekliyor'}
            </span>
          </div>
        </div>

        {/* DESCRIPTION */}
        {task.description && (
          <div style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
            {task.description}
          </div>
        )}

        {/* ASSIGNEES LIST */}
        <div style={{ marginTop: '4px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--text-1)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Kimlere Verildi</span>
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>{completedCount}/{totalAssigned} Tamamlandı</span>
          </h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
            {task._assignedUsers?.map(uid => {
              const assignee = members.find(m => m.userId === uid);
              const aName = assignee ? (assignee.displayName || assignee.email || 'Bilinmiyor') : 'Bilinmiyor';
              const subTask = task._subTasks?.find(st => st.userId === uid);
              const isDone = subTask?.isCompleted;
              const avatarStyle = getAvatarStyle(aName, isNatureTheme);

              const isMyTask = currentUser && (currentUser.id === uid || currentUser.uid === uid);
              const isAssigner = currentUser && subTask && (subTask.assignedBy === currentUser.uid || subTask.assignedByUserId === currentUser.uid);

              return (
                <div key={uid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', background: 'var(--surface2)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ 
                      width: '32px', height: '32px', borderRadius: '50%', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      fontSize: '14px', fontWeight: 'bold',
                      ...avatarStyle
                    }}>
                      {aName.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: '14px', color: 'var(--text-1)', fontWeight: '500' }}>{aName}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '500', color: isDone ? 'var(--green)' : 'var(--text-3)' }}>
                      {isDone ? 'Tamamladı' : 'Bekliyor'}
                    </span>
                    {(isOwnerViewing || isMyTask || isAssigner) && !isDone && onActionClick && (
                      <button 
                        onClick={() => onActionClick(subTask)}
                        style={{
                          background: 'transparent', border: 'none', color: 'var(--text-2)',
                          fontSize: '18px', cursor: 'pointer', padding: '0 4px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                        title="İşlem"
                      >
                        ⋮
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={modalStyles.actions} style={{ marginTop: '0' }}>
          <button type="button" className={modalStyles.btnSecondary} onClick={onClose} style={{ width: '100%' }}>
            {t('btn_close', { context: tone, defaultValue: 'Kapat' })}
          </button>
        </div>

      </div>
    </BaseModal>
  );
};

export default TaskDetailModal;
