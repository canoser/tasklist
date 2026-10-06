import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSchedule, useCreateScheduleSlot, useDeleteScheduleSlot } from '../coachSchoolApi';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import Card from '../../../components/common/Card/Card';
import styles from './WeeklySchedulePage.module.css';

const DAYS = ['', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

const formatTime = (t) => (t ? t.slice(0, 5) : '');

const WeeklySchedulePage = () => {
  const { programId } = useParams();
  const { data: slots, isLoading } = useSchedule(programId);
  const createSlot = useCreateScheduleSlot();
  const deleteSlot = useDeleteScheduleSlot();

  const [day, setDay] = useState(1);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('10:00');
  const [title, setTitle] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const startTime = `${start}:00`;
    const endTime = `${end}:00`;
    await createSlot.mutateAsync({ programId, data: { dayOfWeek: day, startTime, endTime, title: title.trim() } });
    setTitle('');
  };

  // 7 günü sırayla grupla
  const grouped = {};
  slots?.forEach((s) => {
    if (!grouped[s.dayOfWeek]) grouped[s.dayOfWeek] = [];
    grouped[s.dayOfWeek].push(s);
  });

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Haftalık Program</h1>

      <Card className={styles.card} padding="md">
        <form onSubmit={handleCreate} className={styles.form}>
          <div className={styles.row}>
            <select value={day} onChange={(e) => setDay(Number(e.target.value))} className={styles.select}>
              {DAYS.map((d, i) => i > 0 && <option key={i} value={i}>{d}</option>)}
            </select>
            <Input label="Başlangıç" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            <Input label="Bitiş" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <Input label="Başlık" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Örn: Matematik" />
          <Button type="submit" isLoading={createSlot.isPending}>Slot Ekle</Button>
        </form>
      </Card>

      <div className={styles.grid}>
        {isLoading && <p>Yükleniyor...</p>}
        {DAYS.map((d, i) => {
          if (i === 0) return null;
          const daySlots = (grouped[i] || []).sort((a, b) => a.startTime.localeCompare(b.startTime));
          return (
            <div key={i} className={styles.dayCol}>
              <div className={styles.dayHeader}>{d}</div>
              {daySlots.map((s) => (
                <div key={s.id} className={styles.slot}>
                  <span className={styles.slotTime}>{formatTime(s.startTime)}-{formatTime(s.endTime)}</span>
                  <span className={styles.slotTitle}>{s.title}</span>
                  <button className={styles.deleteBtn} onClick={() => deleteSlot.mutateAsync({ programId, slotId: s.id })}>✕</button>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklySchedulePage;
