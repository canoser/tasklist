import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import styles from './WorkspaceDetailScreen.module.css';
import { workspaceService } from '../../services/workspaceService';
import AssignTaskModal from './AssignTaskModal';

const WorkspaceDetailScreen = ({ workspace, user, tone, onBack, onLeave }) => {
  const { t } = useTranslation('common');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const data = await workspaceService.getMembers(workspace.id);
        setMembers(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, [workspace.id]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(workspace.inviteCode);
    alert(t('ws_btn_copy_code', { context: tone }) + " Kopyalandı!");
  };

  const isOwner = workspace.ownerId === (user?.id || user?.uid);
  const currentUserMember = members.find(m => m.userId === (user?.id || user?.uid));
  const isAdmin = isOwner || (currentUserMember && currentUserMember.role === 'Admin');

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <h1>{workspace.name}</h1>
          <p>{workspace.description || "Ekip alanı"}</p>
        </div>
        <div className={styles.actionArea}>
          <button className={styles.btnBack} onClick={onBack}>
            &larr; Geri
          </button>
          {isAdmin && (
            <button className={styles.btnAction} onClick={() => setShowAssignModal(true)}>
              {t('ws_btn_assign_task', { context: tone })}
            </button>
          )}
          {!isOwner && (
            <button className={`${styles.btnAction} ${styles.btnDanger}`} onClick={() => onLeave(workspace.id)}>
              {t('ws_leave_workspace', { context: tone })}
            </button>
          )}
        </div>
      </header>

      <div className={styles.grid}>
        <div className={styles.leftCol}>
          <div className={styles.card}>
            <h3>Davet Bilgileri</h3>
            <div className={styles.codeBox}>
              <code>{workspace.inviteCode}</code>
              <button className={styles.btnBack} onClick={handleCopyCode}>
                Kopyala
              </button>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Ekibinize katılmasını istediğiniz kişilerle bu kodu veya linki paylaşabilirsiniz.
            </p>
          </div>
        </div>

        <div className={styles.rightCol}>
          <div className={styles.card}>
            <h3>{t('ws_members', { context: tone })} ({members.length})</h3>
            {loading ? (
              <p>{t('loading', { context: tone })}</p>
            ) : (
              <div className={styles.memberList}>
                {members.map(m => (
                  <div key={m.id} className={styles.memberRow}>
                    <div className={styles.memberInfo}>
                      <span className={styles.memberName}>{m.displayName} {m.userId === workspace.ownerId ? '👑' : ''}</span>
                      <span className={styles.memberRole}>{m.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <AssignTaskModal 
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        onAssign={async (taskData) => {
          const res = await workspaceService.assignTask(workspace.id, taskData);
          alert(t('ws_task_assigned_success', { context: tone }));
        }}
        members={members}
        tone={tone}
      />
    </div>
  );
};

export default WorkspaceDetailScreen;
