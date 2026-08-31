import { useState } from 'react';
import { motion } from 'framer-motion';
import BaseModal from '../Common/BaseModal';
import styles from './AddTaskModal.module.css';
import { taskService } from '../../services/taskService';
import toast from 'react-hot-toast';
import { useTaskContext } from '../../context/TaskContext';

const AddTaskModal = ({ isOpen, onClose, workspaceId }) => {
  const { notifyTaskAdded } = useTaskContext();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Kapatıldığında stateleri sıfırla
  const handleClose = () => {
    if (isLoading) return;
    setTitle('');
    setDate('');
    setTime('');
    onClose();
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Lütfen bir görev ismi giriniz.');
      return;
    }

    setIsLoading(true);
    try {
      const metadata = time ? JSON.stringify({ hasScheduledTime: true, scheduledTime: time }) : null;

      const newTask = {
        id: Date.now(),
        title: title.trim(),
        taskType: 'Görev',
        deadline: date ? new Date(date).toISOString() : new Date().toISOString(),
        isTeacherAssigned: false,
        isCompleted: false,
        color: 'Blue',
        metadata,
      };

      await taskService.create(newTask);
      toast.success('Görev başarıyla eklendi!');
      notifyTaskAdded(newTask);
      handleClose();
    } catch (error) {
      console.error(error);
      toast.error('Görev eklenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const modalFooter = (
    <div className={styles.footerInner}>
      <button className={styles.cancelBtn} onClick={handleClose} disabled={isLoading}>
        İptal
      </button>
      <button className={styles.submitBtn} onClick={handleSave} disabled={isLoading || !title.trim()}>
        Kaydet
      </button>
    </div>
  );

  return (
    <BaseModal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title="📋 Görev Ekle"
      preventClose={isLoading}
      footer={modalFooter}
      maxWidth="600px"
    >
      <div className={styles.bodyWrapper}>
        {isLoading && (
          <div className={styles.overlay}>
            <div className={styles.loader} />
            <span>Kaydediliyor...</span>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className={styles.inputGroup}>
            <label className={styles.label}>Görev İsmi</label>
            <input
              type="text"
              className={styles.input}
              placeholder="Örn: Proje raporunu tamamla..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isLoading}
              autoFocus
            />
          </div>

          <div className={styles.row}>
            <div className={styles.col}>
              <label className={styles.label}>Tarih</label>
              <input 
                type="date" 
                className={styles.dateInput}
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className={styles.col}>
              <label className={styles.label}>Saat</label>
              <input 
                type="time" 
                className={styles.timeInput}
                value={time} 
                onChange={(e) => setTime(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </BaseModal>
  );
};

export default AddTaskModal;
