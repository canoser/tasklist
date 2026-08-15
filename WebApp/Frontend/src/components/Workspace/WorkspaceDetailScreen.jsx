import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import styles from './WorkspaceDetailScreen.module.css';
import { workspaceService } from '../../services/workspaceService';
import AssignTaskModal from './AssignTaskModal';
import EditWorkspaceModal from './EditWorkspaceModal';

const WorkspaceDetailScreen = ({ workspace, user, tone, onBack, onLeave, onUpdateWorkspace }) => {
  const { t } = useTranslation('common');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

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

  const inviteLink = `${window.location.origin}/workspace/join?code=${workspace.inviteCode}`;
  
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: workspace.name,
          text: `"${workspace.name}" ekibine katılmak için davetlisiniz!`,
          url: inviteLink
        });
      } catch (err) {
        console.error("Paylaşım iptal edildi veya hata:", err);
      }
    } else {
      navigator.clipboard.writeText(inviteLink);
      alert("Davet linki kopyalandı!");
    }
  };

  const handleRemoveMember = async (targetUserId) => {
    if(!window.confirm("Bu üyeyi çıkarmak istediğinize emin misiniz?")) return;
    try {
      await workspaceService.removeMember(workspace.id, targetUserId);
      setMembers(prev => prev.filter(m => m.userId !== targetUserId));
    } catch(err) {
      alert("Üye çıkarılamadı.");
    }
  };

  const handlePromoteMember = async (targetUserId) => {
    if(!window.confirm("Bu üyeyi Admin yapmak istediğinize emin misiniz?")) return;
    try {
      await workspaceService.promoteMember(workspace.id, targetUserId);
      setMembers(prev => prev.map(m => m.userId === targetUserId ? { ...m, role: 'Admin' } : m));
    } catch(err) {
      alert("Üye yetkilendirilemedi.");
    }
  };

  const isOwner = workspace.ownerId === (user?.id || user?.uid);
  const currentUserMember = members.find(m => m.userId === (user?.id || user?.uid));
  const isAdmin = isOwner || (currentUserMember && currentUserMember.role === 'Admin');

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1>{workspace.name}</h1>
            {isOwner && (
              <button onClick={() => setShowEditModal(true)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} title="Alanı Düzenle">
                ✏️
              </button>
            )}
          </div>
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
                Kodu Kopyala
              </button>
            </div>
            
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--surface-sunken)', borderRadius: '8px' }}>
              <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Davet Linki:</p>
              <a href={inviteLink} style={{ fontSize: '0.9rem', color: 'var(--primary)', wordBreak: 'break-all', display: 'block', marginBottom: '0.75rem' }}>
                {inviteLink}
              </a>
              <button className={styles.btnAction} style={{ width: '100%', padding: '0.5rem' }} onClick={handleShare}>
                🔗 Linki Paylaş (WhatsApp, SMS vs.)
              </button>
            </div>
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
                  <div key={m.id} className={styles.memberRow} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className={styles.memberInfo}>
                      <span className={styles.memberName}>{m.displayName} {m.userId === workspace.ownerId ? '👑' : ''}</span>
                      <span className={styles.memberRole}>{m.role}</span>
                    </div>
                    {isAdmin && m.userId !== workspace.ownerId && m.userId !== (user?.id || user?.uid) && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {m.role !== 'Admin' && isOwner && (
                          <button onClick={() => handlePromoteMember(m.userId)} style={{ background: 'none', border: '1px solid var(--primary)', color: 'var(--primary)', borderRadius: '4px', cursor: 'pointer', padding: '2px 6px', fontSize: '0.8rem' }}>Admin Yap</button>
                        )}
                        <button onClick={() => handleRemoveMember(m.userId)} style={{ background: 'none', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '4px', cursor: 'pointer', padding: '2px 6px', fontSize: '0.8rem' }}>Çıkar</button>
                      </div>
                    )}
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

      <EditWorkspaceModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        workspace={workspace}
        tone={tone}
        onEdit={async (updatedData) => {
          if (updatedData.isDeleting) {
            if (onUpdateWorkspace) onUpdateWorkspace({ ...workspace, isDeleting: true });
          } else {
            await workspaceService.update(workspace.id, updatedData);
            if (onUpdateWorkspace) onUpdateWorkspace(updatedData);
          }
        }}
      />
    </div>
  );
};

export default WorkspaceDetailScreen;
