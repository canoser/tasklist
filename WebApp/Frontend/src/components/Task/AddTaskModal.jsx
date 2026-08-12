import { useState } from 'react';
import BaseModal from '../Common/BaseModal';
import { CloseIcon } from '../Common/Icons';
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
  const [targetCount, setTargetCount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [isTeacherAssigned, setIsTeacherAssigned] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!title || !deadline) return;
    setLoading(true);

    const newTask = {
      id: Date.now(), // Fallback ID for optimistic updates
      title,
      categoryId,
      taskType: 'Görev',
      targetCount: targetCount ? parseInt(targetCount) : null,
      count: targetCount ? `${targetCount} Soru` : null,
      deadline: new Date(deadline).toISOString(),
      isTeacherAssigned,
      isCompleted: false,
      color: isTeacherAssigned ? 'Orange' : 'Blue'
    };

    try {
      // API'ye kaydetmeye çalış
      await taskService.create(newTask);
    } catch (err) {
      console.warn('API isteği başarısız oldu, offline (sanal) görev olarak ekleniyor:', err);
    } finally {
      setLoading(false);
      // Takvim ve Timeline güncellensin diye Context üzerinden bildiriyoruz
      notifyTaskAdded(newTask);
      
      // Formu temizle ve kapat
      setTitle('');
      setCategoryId(null);
      setTargetCount('');
      setDeadline('');
      setIsTeacherAssigned(false);
      onClose();
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <div className={styles.header}>
        <span className={styles.title}>{t('modal_title', { context: tone })}</span>
        <button className={styles.closeBtn} onClick={onClose}><CloseIcon /></button>
      </div>

      <div className={styles.body}>
        <div className={styles.formGroup}>
          <label className={styles.label}>{t('field_title', { context: tone })}</label>
          <input 
            type="text" 
            className={styles.input} 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            placeholder={t('field_title_placeholder', { context: tone })} 
            autoFocus
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Kategori</label>
          <HierarchicalCategoryPicker 
            value={categoryId} 
            onChange={(id) => setCategoryId(id)} 
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>{t('field_date', { context: tone })}</label>
          <input 
            type="date" 
            className={styles.input} 
            value={deadline} 
            onChange={e => setDeadline(e.target.value)} 
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>{t('field_target', { context: tone })}</label>
          <input 
            type="number" 
            className={styles.input} 
            value={targetCount} 
            onChange={e => setTargetCount(e.target.value)} 
            placeholder={t('field_target_placeholder', { context: tone })} 
          />
        </div>

        <label className={styles.checkboxGroup}>
          <input 
            type="checkbox" 
            checked={isTeacherAssigned}
            onChange={e => setIsTeacherAssigned(e.target.checked)}
          />
          <span className={styles.label}>{t('field_teacher_assigned', { context: tone })}</span>
        </label>

        <button 
          className={styles.submitBtn} 
          onClick={handleSave}
          disabled={!title || !deadline || loading}
        >
          {loading ? t('btn_saving', { context: tone }) : t('btn_submit', { context: tone })}
        </button>
      </div>
    </BaseModal>
  );
};

export default AddTaskModal;
