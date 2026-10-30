import React, { useState, useEffect } from 'react';
import Button from '../../../components/common/Button/Button';
import Input, { Select, Textarea } from '../../../components/common/Input/Input';
import Modal from '../../../components/common/Modal/Modal';
import CurriculumTopicFields from '../../../components/common/CurriculumTopicFields/CurriculumTopicFields';
import styles from './AssignHomeworkModal.module.css';
import { useAssignHomework } from '../coachApi';
import { usePrograms, useCourses } from '../coachSchoolApi';

const AssignHomeworkModal = ({ isOpen, open, onClose, selectedStudent, initialTopic, programId }) => {
  const effectiveOpen = isOpen ?? open;
  const [level, setLevel] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [unit, setUnit] = useState('');
  const [freeTopic, setFreeTopic] = useState('');
  const [courseId, setCourseId] = useState('');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('NORMAL');

  const assignHomeworkMutation = useAssignHomework();
  const { data: programs = [] } = usePrograms();
  const effectiveProgramId = programId || selectedStudent?.programId || programs[0]?.id;
  const { data: courses = [] } = useCourses(effectiveProgramId);

  useEffect(() => {
    if (!effectiveOpen) return;

    if (initialTopic) {
      if (initialTopic.grade) setLevel(String(initialTopic.grade));
      else if (selectedStudent?.grade) setLevel(String(selectedStudent.grade));

      if (initialTopic.subjectId) setSubject(initialTopic.subjectId);
      if (initialTopic.unitNumber != null) setUnit(initialTopic.unitNumber);
      if (initialTopic.id) setTopic(initialTopic.id);

      const autoTitle = [initialTopic.subjectName, initialTopic.topicName].filter(Boolean).join(' — ');
      if (autoTitle) setTitle(autoTitle);
    } else if (selectedStudent?.grade) {
      setLevel(String(selectedStudent.grade));
    }
  }, [effectiveOpen, initialTopic, selectedStudent]);

  if (!effectiveOpen) return null;

  const handleAssign = (e) => {
    if (e) e.preventDefault();
    if (!title || !dueDate) {
      alert('Lütfen başlık ve tarih giriniz.');
      return;
    }

    if (topic === '__other__' && !freeTopic.trim()) {
      alert('Lütfen serbest konu başlığı giriniz.');
      return;
    }

    assignHomeworkMutation.mutate(
      {
        studentId: selectedStudent?.id,
        subjectId: subject || null,
        curriculumTopicId: topic && topic !== '__other__' ? topic : null,
        freeTopic: topic === '__other__' ? freeTopic.trim() : null,
        courseId: courseId || null,
        title,
        description: desc,
        dueDate,
        priority,
      },
      {
        onSuccess: () => {
          setLevel('');
          setSubject('');
          setTopic('');
          setUnit('');
          setFreeTopic('');
          setCourseId('');
          setTitle('');
          setDesc('');
          setDueDate('');
          setPriority('NORMAL');
          onClose();
        },
        onError: () => {
          alert('Ödev atanırken bir hata oluştu.');
        },
      }
    );
  };

  return (
    <Modal
      isOpen={effectiveOpen}
      onClose={onClose}
      title={`Ödev Ata${selectedStudent ? ` — ${selectedStudent.fullName}` : ''}`}
      maxWidth="500px"
    >
      <form onSubmit={handleAssign} className={styles.form}>
        <CurriculumTopicFields
          level={level}
          setLevel={setLevel}
          subject={subject}
          setSubject={setSubject}
          unit={unit}
          setUnit={setUnit}
          topic={topic}
          setTopic={setTopic}
          freeTopic={freeTopic}
          setFreeTopic={setFreeTopic}
          onTopicAutoTitle={(auto) => {
            if (!title || !title.trim()) setTitle(auto);
          }}
          disabled={assignHomeworkMutation.isPending}
        />

        {courses.length > 0 && (
          <Select
            label="Bağlı Ders / Kurs (Opsiyonel - Öğretmen Takibi)"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            disabled={assignHomeworkMutation.isPending}
          >
            <option value="">-- Genel Koçluk Ödevi (Derse Bağlı Değil) --</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        )}

        <div className={styles.divider}>veya serbest ödev girin</div>

        <Input
          label="Ödev Başlığı *"
          placeholder="Örn: Limit Karma Test-1"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={assignHomeworkMutation.isPending}
          required
        />

        <Textarea
          label="Açıklama"
          placeholder="Çözülmesi gereken testler, dikkat edilecek yerler..."
          rows={3}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          disabled={assignHomeworkMutation.isPending}
        />

        <div className={styles.twoCol}>
          <Select
            label="Öncelik Seviyesi"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            disabled={assignHomeworkMutation.isPending}
          >
            <option value="NORMAL">Normal</option>
            <option value="HIGH">Yüksek (Kritik)</option>
            <option value="LOW">Düşük</option>
          </Select>

          <Input
            label="Son Teslim Tarihi *"
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={assignHomeworkMutation.isPending}
            required
          />
        </div>

        <div className={styles.actions}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={assignHomeworkMutation.isPending}>
            İptal
          </Button>
          <Button type="submit" variant="primary" isLoading={assignHomeworkMutation.isPending}>
            Ödevi Ata
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AssignHomeworkModal;
