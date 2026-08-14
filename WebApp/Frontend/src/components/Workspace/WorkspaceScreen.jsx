import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './WorkspaceScreen.module.css';
import useWorkspaces from '../../hooks/useWorkspaces';
import { useTranslation } from 'react-i18next';
import CreateWorkspaceModal from './CreateWorkspaceModal';
import JoinWorkspaceModal from './JoinWorkspaceModal';
import WorkspaceGuideModal from './WorkspaceGuideModal';
import WorkspaceDetailScreen from './WorkspaceDetailScreen';

const WorkspaceScreen = ({ user, tone }) => {
  const { t } = useTranslation('common');
  const { ownedWorkspaces, joinedWorkspaces, loading, createWorkspace, joinWorkspace, leaveWorkspace } = useWorkspaces(user?.id || user?.uid);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState(null);

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
      />
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{t('ws_title', { context: tone })}</h1>
          <p className={styles.subtitle}>{t('ws_subtitle', { context: tone })}</p>
        </div>
        <button 
          onClick={() => setShowGuideModal(true)}
          style={{ background: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          ❓ {t('ws_how_to_title', { context: tone }).split('(')[0]}
        </button>
      </header>

      <div className={styles.actionButtons}>
        <button className={styles.btnCreate} onClick={() => setShowCreateModal(true)}>
          {t('ws_btn_create', { context: tone })}
        </button>
        <button className={styles.btnJoin} onClick={() => setShowJoinModal(true)}>
          {t('ws_btn_join', { context: tone })}
        </button>
      </div>

      {loading ? (
        <div className={styles.emptyState}>{t('loading', { context: tone })}</div>
      ) : (
        <>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              {t('ws_section_owned', { context: tone })}
            </h2>
            {ownedWorkspaces.length === 0 ? (
              <div className={styles.emptyState}>
                <p>{t('ws_empty_owned', { context: tone })}</p>
              </div>
            ) : (
              <div className={styles.grid}>
                {ownedWorkspaces.map(w => (
                  <motion.div key={w.id} className={styles.card} whileTap={{ scale: 0.98 }} onClick={() => setActiveWorkspace(w)}>
                    <div className={styles.cardHeader}>
                      <span className={styles.cardTitle}>{w.name}</span>
                      <span className={styles.badge}>{w.inviteCode}</span>
                    </div>
                    {w.description && <p className={styles.cardDesc}>{w.description}</p>}
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              {t('ws_section_joined', { context: tone })}
            </h2>
            {joinedWorkspaces.length === 0 ? (
              <div className={styles.emptyState}>
                <p>{t('ws_empty_joined', { context: tone })}</p>
              </div>
            ) : (
              <div className={styles.grid}>
                {joinedWorkspaces.map(w => (
                  <motion.div key={w.id} className={styles.card} whileTap={{ scale: 0.98 }} onClick={() => setActiveWorkspace(w)}>
                    <div className={styles.cardHeader}>
                      <span className={styles.cardTitle}>{w.name}</span>
                    </div>
                    {w.description && <p className={styles.cardDesc}>{w.description}</p>}
                  </motion.div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

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
