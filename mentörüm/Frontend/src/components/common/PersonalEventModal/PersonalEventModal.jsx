import React, { useState } from 'react';
import Button from '../Button/Button';
import Input from '../Input/Input';
import { useCreatePersonalEvent } from '../../../hooks/usePersonalEvents';
import styles from './PersonalEventModal.module.css';

const TYPES = [
  { value: 'COACHING_SESSION', label: 'Koçluk Görüşmesi' },
  { value: 'PARENT_MEETING', label: 'Veli Görüşmesi' },
  { value: 'PERSONAL_BLOCK', label: 'Kişisel / Müsait Değil' },
  { value: 'STUDENT_EVENT', label: 'Çalışma Bloğu' },
];

const PersonalEventModal = ({ isOpen, onClose, defaultType = 'COACHING_SESSION' }) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState(defaultType);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const mutation = useCreatePersonalEvent();

  if (!isOpen) return null;

  const handleSave = () => {
    if (!title || !start) {
      alert('Başlık ve başlangıç saati gereklidir.');
      return;
    }
    mutation.mutate(
      {
        title,
        eventType: type,
        startAt: new Date(start).toISOString(),
        endAt: end ? new Date(end).toISOString() : null,
      },
      {
        onSuccess: () => {
          setTitle('');
          setStart('');
          setEnd('');
          onClose();
        },
        onError: () => alert('Etkinlik eklenemedi.'),
      }
    );
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>Yeni Etkinlik Ekle</h3>
        <Input label="Başlık" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="örn. Can ile 1-1 Görüşme" />
        <div className={styles.field}>
          <label className={styles.label}>Tür</label>
          <select className={styles.select} value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <Input label="Başlangıç" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
        <Input label="Bitiş (opsiyonel)" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
        <div className={styles.actions}>
          <Button variant="ghost" size="sm" onClick={onClose}>İptal</Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={mutation.isPending}>
            {mutation.isPending ? 'Ekleniyor...' : 'Ekle'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PersonalEventModal;
