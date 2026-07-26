import { useState } from 'react';
import BaseModal from '../Common/BaseModal';
import { CloseIcon } from '../Common/Icons';
import styles from './AddTaskModal.module.css';
import { taskService } from '../../services/taskService';

const AddTaskModal = ({ isOpen, onClose }) => {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Matematik');
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
      subject,
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
      // Takvim ve Timeline güncellensin diye Custom Event fırlatıyoruz
      window.dispatchEvent(new CustomEvent('taskAdded', { detail: newTask }));
      
      // Formu temizle ve kapat
      setTitle('');
      setSubject('Matematik');
      setTargetCount('');
      setDeadline('');
      setIsTeacherAssigned(false);
      onClose();
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <div className={styles.header}>
        <span className={styles.title}>Yeni Görev Ekle</span>
        <button className={styles.closeBtn} onClick={onClose}><CloseIcon /></button>
      </div>

      <div className={styles.body}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Görev Başlığı *</label>
          <input 
            type="text" 
            className={styles.input} 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            placeholder="Örn: Türev Soru Çözümü" 
            autoFocus
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Ders / Kategori</label>
          <select className={styles.select} value={subject} onChange={e => setSubject(e.target.value)}>
            <option value="Matematik">Matematik</option>
            <option value="Fizik">Fizik</option>
            <option value="Kimya">Kimya</option>
            <option value="Biyoloji">Biyoloji</option>
            <option value="Deneme">Deneme / Sınav</option>
            <option value="Diğer">Diğer / Kişisel</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Tarih *</label>
          <input 
            type="date" 
            className={styles.input} 
            value={deadline} 
            onChange={e => setDeadline(e.target.value)} 
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Hedef Miktar (Opsiyonel)</label>
          <input 
            type="number" 
            className={styles.input} 
            value={targetCount} 
            onChange={e => setTargetCount(e.target.value)} 
            placeholder="Örn: 50" 
          />
        </div>

        <label className={styles.checkboxGroup}>
          <input 
            type="checkbox" 
            checked={isTeacherAssigned}
            onChange={e => setIsTeacherAssigned(e.target.checked)}
          />
          <span className={styles.label}>Bu görev öğretmen tarafından verildi</span>
        </label>

        <button 
          className={styles.submitBtn} 
          onClick={handleSave}
          disabled={!title || !deadline || loading}
        >
          {loading ? 'Kaydediliyor...' : 'Görev Ekle'}
        </button>
      </div>
    </BaseModal>
  );
};

export default AddTaskModal;
