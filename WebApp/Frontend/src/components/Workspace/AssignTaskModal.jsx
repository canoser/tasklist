import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import styles from './WorkspaceModals.module.css';

const AssignTaskModal = ({ isOpen, onClose, onAssign, members, tone }) => {
  const { t } = useTranslation('common');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [deadline, setDeadline] = useState('');
  const [taskType, setTaskType] = useState('Alan Görevi');
  const [assignMode, setAssignMode] = useState('all'); // 'all' | 'specific'
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !deadline) return;

    let targetUserIds = [];
    if (assignMode === 'specific') {
      if (selectedMembers.length === 0) {
        alert("Lütfen en az bir üye seçin.");
        return;
      }
      targetUserIds = selectedMembers;
    }

    setLoading(true);
    try {
      await onAssign({ title, description: desc, deadline, taskType, targetUserIds });
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMember = (id) => {
    if (selectedMembers.includes(id)) {
      setSelectedMembers(selectedMembers.filter(m => m !== id));
    } else {
      setSelectedMembers([...selectedMembers, id]);
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
            <h2>{t('ws_btn_assign_task', { context: tone })}</h2>
            <button className={styles.closeBtn} onClick={onClose}>&times;</button>
          </div>
          
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label>Başlık</label>
              <input 
                type="text" 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                required 
                autoFocus
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>Son Tarih (Deadline)</label>
              <input 
                type="datetime-local" 
                value={deadline} 
                onChange={e => setDeadline(e.target.value)} 
                required 
              />
            </div>

            <div className={styles.formGroup}>
              <label>Açıklama</label>
              <textarea 
                value={desc} 
                onChange={e => setDesc(e.target.value)} 
                rows={2}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Kime Atanacak?</label>
              <select value={assignMode} onChange={e => setAssignMode(e.target.value)} style={{ padding: '8px', borderRadius: '8px' }}>
                <option value="all">{t('ws_assign_to_all', { context: tone })}</option>
                <option value="specific">{t('ws_assign_to_specific', { context: tone })}</option>
              </select>
            </div>

            {assignMode === 'specific' && (
              <div className={styles.formGroup} style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--border)', padding: '8px', borderRadius: '8px' }}>
                {members.map(m => (
                  <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedMembers.includes(m.userId)}
                      onChange={() => toggleMember(m.userId)}
                    />
                    {m.displayName} ({m.role})
                  </label>
                ))}
              </div>
            )}

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

export default AssignTaskModal;
