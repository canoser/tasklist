import { useState, useEffect } from 'react';
import BaseModal from '../Common/BaseModal';
import styles from './AddTaskModal.module.css';
import { taskService } from '../../services/taskService';
import { useTranslation } from 'react-i18next';
import { useTaskContext } from '../../context/TaskContext';
import HierarchicalCategoryPicker from '../Category/HierarchicalCategoryPicker';

const AddTaskModal = ({ isOpen, onClose, tone }) => {
  const { t } = useTranslation('tasks');
  const { notifyTaskAdded } = useTaskContext();
  
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState(null);
  
  // Set default deadline to today
  const [deadline, setDeadline] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split('T')[0];
      setDeadline(today);
      setTitle('');
      setCategoryId(null);
      setScheduledTime('');
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!title) return;
    setLoading(true);

    const metadata = scheduledTime
      ? JSON.stringify({ hasScheduledTime: true, scheduledTime })
      : null;

    const newTask = {
      id: Date.now(), // Fallback ID for optimistic updates
      title,
      categoryId,
      taskType: 'Görev',
      deadline: deadline ? new Date(deadline).toISOString() : new Date().toISOString(),
      isTeacherAssigned: false,
      isCompleted: false,
      color: 'Blue',
      metadata
    };

    try {
      await taskService.create(newTask);
    } catch (err) {
      console.warn('API isteği başarısız oldu, offline (sanal) görev olarak ekleniyor:', err);
    } finally {
      setLoading(false);
      notifyTaskAdded(newTask);
      onClose();
    }
  };

  return (
    <BaseModal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={t('modal_title', { context: tone })}
      preventClose={loading}
      maxWidth="500px"
    >
      <div className={styles.body}>
        <input 
          type="text" 
          className={styles.titleInput} 
          value={title} 
          onChange={e => setTitle(e.target.value)} 
          placeholder={t('field_title_placeholder', { context: tone })} 
          disabled={loading}
        />

        <div className={styles.detailsGroup}>
          <div className={styles.rowCategory}>
            <div className={styles.rowLabel}>
              <span className={styles.icon}>🏷️</span> 
              {t('field_category', { context: tone, defaultValue: 'Kategori' })}
            </div>
            <div className={styles.categoryPickerWrapper}>
              <HierarchicalCategoryPicker 
                value={categoryId} 
                onChange={(id) => setCategoryId(id)} 
              />
            </div>
          </div>

          <div className={styles.divider}></div>

          <div className={styles.row}>
            <div className={styles.rowLabel}>
              <span className={styles.icon}>📅</span> 
              {t('field_date', { context: tone })}
            </div>
            <input 
              type="date" 
              className={styles.rowInput} 
              value={deadline} 
              onChange={e => setDeadline(e.target.value)} 
              disabled={loading}
            />
          </div>

          <div className={styles.divider}></div>

          <div className={styles.row}>
            <div className={styles.rowLabel}>
              <span className={styles.icon}>🕐</span> 
              Saat
            </div>
            <input 
              type="time" 
              className={styles.rowInput} 
              value={scheduledTime} 
              onChange={e => setScheduledTime(e.target.value)} 
              disabled={loading}
            />
          </div>
        </div>
          
        <button 
          className={`${styles.submitBtn} ${loading ? styles.loading : ''}`} 
          onClick={handleSave}
          disabled={!title || loading}
        >
          {loading ? <span className={styles.spinner}></span> : t('btn_submit', { context: tone })}
        </button>
      </div>
    </BaseModal>
  );
};

export default AddTaskModal;
