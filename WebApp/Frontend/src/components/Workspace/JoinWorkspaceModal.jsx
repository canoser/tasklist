import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import styles from './WorkspaceModals.module.css';

const JoinWorkspaceModal = ({ isOpen, onClose, onJoin, tone, initialCode = '' }) => {
  const { t } = useTranslation('common');
  const [code, setCode] = useState(initialCode);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && initialCode) {
      setCode(initialCode);
    }
  }, [isOpen, initialCode]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim() || !displayName.trim()) return;
    setLoading(true);
    try {
      await onJoin(code.trim(), displayName.trim());
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

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
        >
          <div className={styles.header}>
            <h2>{t('ws_join_title', { context: tone })}</h2>
            <button className={styles.closeBtn} onClick={onClose}>&times;</button>
          </div>
          
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label>Davet Kodu</label>
              <input 
                type="text" 
                value={code} 
                onChange={e => setCode(e.target.value)} 
                placeholder={t('ws_code_placeholder', { context: tone })}
                required 
                autoFocus
              />
            </div>

            <div className={styles.formGroup}>
              <label>Görünen Ad (Takma Ad)</label>
              <input 
                type="text" 
                value={displayName} 
                onChange={e => setDisplayName(e.target.value)} 
                placeholder="Örn: Veli, Öğrenci 1"
                required 
              />
            </div>
            
            <div className={styles.actions}>
              <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={loading}>
                {t('btn_cancel', { context: tone })}
              </button>
              <button type="submit" className={styles.saveBtn} disabled={loading}>
                {loading ? t('loading', { context: tone }) : t('btn_confirm', { context: tone })}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default JoinWorkspaceModal;
