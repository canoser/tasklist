import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import styles from './WorkspaceModals.module.css';

const WorkspaceGuideModal = ({ isOpen, onClose, tone }) => {
  const { t } = useTranslation('common');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div 
          className={styles.modal}
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '500px' }}
        >
          <div className={styles.header}>
            <h2>{t('ws_how_to_title', { context: tone })}</h2>
            <button className={styles.closeBtn} onClick={onClose}>&times;</button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: 'var(--text-secondary)' }}>
            <p><strong>1. Alan Kurma:</strong> {t('ws_how_to_create', { context: tone })}</p>
            <p><strong>2. Ekibi Davet Etme:</strong> {t('ws_how_to_invite', { context: tone })}</p>
            <p><strong>3. Görev Atama:</strong> {t('ws_how_to_assign', { context: tone })}</p>
            
            <p style={{ marginTop: '12px', fontStyle: 'italic', fontSize: '0.9rem' }}>
              {t('how_to_ai_joke', { context: tone })}
            </p>
          </div>

          <div className={styles.actions} style={{ marginTop: '24px' }}>
            <button type="button" className={styles.saveBtn} onClick={onClose}>
              {t('btn_close', { context: tone })}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WorkspaceGuideModal;
