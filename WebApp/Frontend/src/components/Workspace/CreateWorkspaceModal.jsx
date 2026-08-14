import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import styles from './WorkspaceModals.module.css';

const CreateWorkspaceModal = ({ isOpen, onClose, onCreate, tone }) => {
  const { t } = useTranslation('common');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !role.trim()) return;
    setLoading(true);
    try {
      await onCreate({ name, description: desc, settings: JSON.stringify({ role }) }); 
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
            <h2>{t('ws_create_title', { context: tone })}</h2>
            <button className={styles.closeBtn} onClick={onClose}>&times;</button>
          </div>
          
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label>{t('ws_lbl_name', { context: tone })}</label>
              <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder={t('ws_name_placeholder', { context: tone })}
                required 
                autoFocus
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>{t('ws_lbl_role', { context: tone })}</label>
              <input 
                type="text" 
                value={role} 
                onChange={e => setRole(e.target.value)} 
                placeholder={t('ws_role_placeholder', { context: tone })}
                required 
              />
            </div>

            <div className={styles.formGroup}>
              <label>{t('ws_lbl_desc', { context: tone })}</label>
              <textarea 
                value={desc} 
                onChange={e => setDesc(e.target.value)} 
                rows={3}
              />
            </div>

            <div className={styles.actions}>
              <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={loading}>
                {t('btn_cancel', { context: tone })}
              </button>
              <button type="submit" className={styles.saveBtn} disabled={loading}>
                {loading ? t('creating', { context: tone }) : t('btn_save', { context: tone })}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CreateWorkspaceModal;
