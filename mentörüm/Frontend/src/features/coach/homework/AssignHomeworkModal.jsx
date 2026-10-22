import React, { useState } from 'react';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import styles from './AssignHomeworkModal.module.css';
import { useAssignHomework, useLevels, useSubjects, useUnits, useTopics } from '../coachApi';
import { usePrograms, useCourses } from '../coachSchoolApi';

const AssignHomeworkModal = ({ isOpen, onClose, selectedStudent }) => {
  const [level, setLevel] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [unit, setUnit] = useState('');
  const [freeTopic, setFreeTopic] = useState('');
  const [courseId, setCourseId] = useState('');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [dueDate, setDueDate] = useState('');

  const assignHomeworkMutation = useAssignHomework();
  const { data: levels = [] } = useLevels();
  const { data: subjects = [] } = useSubjects(level || undefined);
  const { data: units = [] } = useUnits(subject || undefined, level || undefined);
  const { data: topics = [] } = useTopics(subject || undefined, level || undefined, unit || undefined);
  const { data: programs = [] } = usePrograms();
  const activeProgramId = programs[0]?.id;
  const { data: courses = [] } = useCourses(activeProgramId);

  if (!isOpen) return null;

  const handleAssign = () => {
    if (!title || !dueDate) {
      alert("Lütfen başlık ve tarih giriniz.");
      return;
    }

    if (topic === '__other__' && !freeTopic.trim()) {
      alert("Lütfen serbest konu başlığı giriniz.");
      return;
    }

    assignHomeworkMutation.mutate({
      studentId: selectedStudent?.id,
      subjectId: subject || null,
      curriculumTopicId: topic && topic !== '__other__' ? topic : null,
      freeTopic: topic === '__other__' ? freeTopic.trim() : null,
      courseId: courseId || null,
      title,
      description: desc,
      dueDate
    }, {
      onSuccess: () => {
        // Reset form and close
        setLevel('');
        setSubject('');
        setTopic('');
        setUnit('');
        setFreeTopic('');
        setCourseId('');
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
                setUnit('');
                setTopic('');
                setFreeTopic('');
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
                setUnit('');
                setTopic('');
                setFreeTopic('');
              }}
              disabled={!level || assignHomeworkMutation.isPending}
            >
              <option value="">-- Ders Seç --</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Tema / Ünite (Opsiyonel)</label>
            <select 
              className={styles.select} 
              value={unit} 
              onChange={e => {
                setUnit(e.target.value);
                setTopic('');
                setFreeTopic('');
              }}
              disabled={!subject || assignHomeworkMutation.isPending}
            >
              <option value="">-- Tüm Temalar --</option>
              {units.map(u => <option key={u.unitNumber} value={u.unitNumber}>{u.unitNumber}{u.unitName ? `. ${u.unitName}` : ''}</option>)}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Konu (Opsiyonel)</label>
            <select 
              className={styles.select} 
              value={topic} 
              onChange={e => { setTopic(e.target.value); setFreeTopic(''); }}
              disabled={!subject || assignHomeworkMutation.isPending}
            >
              <option value="">-- Konu Seç --</option>
              {topics.map(t => <option key={t.id} value={t.id}>{t.unitName ? `${t.unitName} → ` : ''}{t.topicName}</option>)}
              <option value="__other__">➕ Bunun dışında (serbest konu)</option>
            </select>
          </div>

          {topic === '__other__' && (
            <Input 
              label="Serbest Konu Başlığı" 
              placeholder="Örn: Karmaşık Sayılar" 
              value={freeTopic} 
              onChange={e => setFreeTopic(e.target.value)} 
              disabled={assignHomeworkMutation.isPending}
            />
          )}

          {courses.length > 0 && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Bağlı Ders / Kurs (Opsiyonel - Öğretmen Takibi)</label>
              <select 
                className={styles.select} 
                value={courseId} 
                onChange={e => setCourseId(e.target.value)}
                disabled={assignHomeworkMutation.isPending}
              >
                <option value="">-- Genel Koçluk Ödevi (Derse Bağlı Değil) --</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

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
