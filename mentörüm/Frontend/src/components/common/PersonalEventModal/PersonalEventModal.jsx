import React, { useState } from 'react';
import Button from '../Button/Button';
import Input, { Select } from '../Input/Input';
import Modal from '../Modal/Modal';
import { useCreatePersonalEvent } from '../../../hooks/usePersonalEvents';
import styles from './PersonalEventModal.module.css';

const TYPES = [
  { value: 'COACHING_SESSION', label: 'Koçluk Görüşmesi' },
  { value: 'PARENT_MEETING', label: 'Veli Görüşmesi' },
  { value: 'PERSONAL_BLOCK', label: 'Kişisel / Müsait Değil' },
  { value: 'STUDENT_EVENT', label: 'Çalışma Bloğu' },
];

const CATEGORIES = [
  { value: '', label: 'Kategori Yok (Genel)' },
  { value: 'SLEEP', label: 'Uyku' },
  { value: 'SPORT', label: 'Spor / Egzersiz' },
  { value: 'SOCIAL', label: 'Sosyal / Aile' },
  { value: 'SCHOOL', label: 'Okul / Dershane' },
  { value: 'REST', label: 'Dinlenme / Mola' },
];

const PersonalEventModal = ({ isOpen, open, onClose, defaultType = 'COACHING_SESSION' }) => {
  const effectiveOpen = isOpen ?? open;
  const [title, setTitle] = useState('');
  const [type, setType] = useState(defaultType);
  const [category, setCategory] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const mutation = useCreatePersonalEvent();

  const handleSave = (e) => {
    if (e) e.preventDefault();
    if (!title || !start) {
      alert('Başlık ve başlangıç saati gereklidir.');
      return;
    }
    mutation.mutate(
      {
        title,
        eventType: type,
        category: category || null,
        startAt: new Date(start).toISOString(),
        endAt: end ? new Date(end).toISOString() : null,
      },
      {
        onSuccess: () => {
          setTitle('');
          setType(defaultType);
          setCategory('');
          setStart('');
          setEnd('');
          onClose();
        },
        onError: () => alert('Etkinlik eklenemedi.'),
      }
    );
  };

  return (
    <Modal isOpen={effectiveOpen} onClose={onClose} title="Yeni Etkinlik Ekle" maxWidth="460px">
      <form onSubmit={handleSave} className={styles.form}>
        <Input
          label="Başlık *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="örn. Can ile 1-1 Görüşme"
          required
        />
        <Select label="Tür" value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </Select>
        <Select
          label="Kategori (Zaman Dağılımı İçin)"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </Select>
        <Input
          label="Başlangıç *"
          type="datetime-local"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          required
        />
        <Input
          label="Bitiş (opsiyonel)"
          type="datetime-local"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
        <div className={styles.actions}>
          <Button type="button" variant="ghost" onClick={onClose}>İptal</Button>
          <Button type="submit" variant="primary" isLoading={mutation.isPending}>
            Ekle
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default PersonalEventModal;
