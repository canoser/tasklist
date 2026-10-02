import React, { useState } from 'react';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import styles from './AssignHomeworkModal.module.css';
import { useAssignHomework } from '../coachApi';

// Fake Data for Tree Select
const MOCK_CURRICULUM = [
  {
    id: 'math',
    name: 'Matematik',
    topics: [
      { id: 'math-1', name: 'Limit ve Süreklilik' },
      { id: 'math-2', name: 'Türev' },
      { id: 'math-3', name: 'İntegral' }
    ]
  },
  {
    id: 'fizik',
    name: 'Fizik',
    topics: [
      { id: 'fizik-1', name: 'Kuvvet ve Hareket' },
      { id: 'fizik-2', name: 'Elektrik ve Manyetizma' }
    ]
  }
];

const AssignHomeworkModal = ({ isOpen, onClose, selectedStudent }) => {
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [dueDate, setDueDate] = useState('');

  const assignHomeworkMutation = useAssignHomework();

  if (!isOpen) return null;

  const currentSubjectObj = MOCK_CURRICULUM.find(s => s.id === subject);

  const handleAssign = () => {
    if (!title || !dueDate) {
      alert("Lütfen başlık ve tarih giriniz.");
      return;
    }

    assignHomeworkMutation.mutate({
      studentId: selectedStudent?.id,
      subjectId: subject,
      topicId: topic,
      title,
      description: desc,
      dueDate
    }, {
      onSuccess: () => {
        // Reset form and close
        setSubject('');
        setTopic('');
        setTitle('');
        setDesc('');
        setDueDate('');
        onClose();
      },
      onError: () => {
        alert("Ödev atanırken bir hata oluştu.");
      }
    });
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>Ödev Ata {selectedStudent ? `- ${selectedStudent.fullName}` : ''}</h2>
          <button className={styles.closeBtn} onClick={onClose} disabled={assignHomeworkMutation.isPending}>&times;</button>
        </div>
        
        <div className={styles.modalBody}>
          {/* Müfredat Ağacı (Tree Select Simülasyonu) */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Ders (Müfredat)</label>
            <select 
              className={styles.select} 
              value={subject} 
              onChange={e => {
                setSubject(e.target.value);
                setTopic('');
              }}
              disabled={assignHomeworkMutation.isPending}
            >
              <option value="">-- Ders Seç --</option>
              {MOCK_CURRICULUM.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Konu (Opsiyonel)</label>
            <select 
              className={styles.select} 
              value={topic} 
              onChange={e => setTopic(e.target.value)}
              disabled={!subject || assignHomeworkMutation.isPending}
            >
              <option value="">-- Alt Konu Seç --</option>
              {currentSubjectObj?.topics.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.divider}>veya serbest ödev girin</div>

          <Input 
            label="Ödev Başlığı" 
            placeholder="Örn: Limit Karma Test-1" 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            disabled={assignHomeworkMutation.isPending}
          />

          <div className={styles.formGroup}>
            <label className={styles.label}>Açıklama</label>
            <textarea 
              className={styles.textarea}
              placeholder="Çözülmesi gereken testler, dikkat edilecek yerler..."
              rows={4}
              value={desc}
              onChange={e => setDesc(e.target.value)}
              disabled={assignHomeworkMutation.isPending}
            />
          </div>

          <Input 
            label="Son Teslim Tarihi" 
            type="datetime-local"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            disabled={assignHomeworkMutation.isPending}
          />

        </div>

        <div className={styles.modalFooter}>
          <Button variant="ghost" onClick={onClose} disabled={assignHomeworkMutation.isPending}>İptal</Button>
          <Button 
            variant="primary" 
            onClick={handleAssign}
            disabled={assignHomeworkMutation.isPending}
          >
            {assignHomeworkMutation.isPending ? 'Atanıyor...' : 'Ödevi Ata'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AssignHomeworkModal;
