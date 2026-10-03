import React, { useState } from 'react';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import styles from './AssignHomeworkModal.module.css';
import { useAssignHomework, useLevels, useSubjects, useTopics, useSeedCurriculum } from '../coachApi';

const AssignHomeworkModal = ({ isOpen, onClose, selectedStudent }) => {
  const [level, setLevel] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [dueDate, setDueDate] = useState('');

  const assignHomeworkMutation = useAssignHomework();
  const seedMutation = useSeedCurriculum();
  const { data: levels = [] } = useLevels();
  const { data: subjects = [] } = useSubjects(level || undefined);
  const { data: topics = [] } = useTopics(subject || undefined, level || undefined);

  if (!isOpen) return null;

  const handleSeed = () => {
    seedMutation.mutate(undefined, {
      onSuccess: () => alert('Müfredat güncellendi.'),
      onError: () => alert('Müfredat güncellenemedi.')
    });
  };

  const handleAssign = () => {
    if (!title || !dueDate) {
      alert("Lütfen başlık ve tarih giriniz.");
      return;
    }

    assignHomeworkMutation.mutate({
      studentId: selectedStudent?.id,
      subjectId: subject || null,
      curriculumTopicId: topic || null,
      title,
      description: desc,
      dueDate
    }, {
      onSuccess: () => {
        // Reset form and close
        setLevel('');
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
          {/* Seviye (4-12, TYT, AYT) → Ders → Konu */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Seviye / Sınav</label>
            <select 
              className={styles.select} 
              value={level} 
              onChange={e => {
                setLevel(e.target.value);
                setSubject('');
                setTopic('');
              }}
              disabled={assignHomeworkMutation.isPending}
            >
              <option value="">-- Seviye Seç --</option>
              {levels.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Ders</label>
            <select 
              className={styles.select} 
              value={subject} 
              onChange={e => {
                setSubject(e.target.value);
                setTopic('');
              }}
              disabled={!level || assignHomeworkMutation.isPending}
            >
              <option value="">-- Ders Seç --</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
              <option value="">-- Konu Seç --</option>
              {topics.map(t => <option key={t.id} value={t.id}>{t.unitName} → {t.topicName}</option>)}
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

          <Button variant="ghost" size="sm" onClick={handleSeed} disabled={seedMutation.isPending}>
            {seedMutation.isPending ? 'Güncelleniyor...' : '🔄 Müfredatı Güncelle'}
          </Button>

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
