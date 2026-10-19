import React, { useState } from 'react';
import { useStudentSchedule } from '../studentSchoolApi';
import { useStudentSchoolSchedule, useCreateSchoolSchedule, useDeleteSchoolSchedule } from '../studentApi';
import Card from '../../../components/common/Card/Card';
import { Trash2, Plus } from 'lucide-react';
import styles from './StudentSchedulePage.module.css';

const DAYS = ['', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const fmt = (t) => (t ? t.slice(0, 5) : '');

const inputStyle = { padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' };

const StudentSchedulePage = () => {
  const { data: slots, isLoading } = useStudentSchedule();
  const { data: schoolSchedule = [] } = useStudentSchoolSchedule();
  const createSchedule = useCreateSchoolSchedule();
  const deleteSchedule = useDeleteSchoolSchedule();

  const [day, setDay] = useState(1);
  const [start, setStart] = useState('08:30');
  const [end, setEnd] = useState('15:30');
  const [label, setLabel] = useState('Okul');

  const grouped = {};
  slots?.forEach((s) => {
    if (!grouped[s.dayOfWeek]) grouped[s.dayOfWeek] = [];
    grouped[s.dayOfWeek].push(s);
  });

  const handleAdd = () => {
    if (!start || !end) return;
    createSchedule.mutate({ dayOfWeek: Number(day), startTime: start, endTime: end, label: label.trim() || 'Okul' });
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Programım</h1>

      <Card className={styles.card} padding="md">
        <h2 style={{ margin: '0 0 10px', fontSize: '1rem' }}>Okul Saatlerim (Haftalık Tekrarlayan Şablon)</h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '10px' }}>
          <select value={day} onChange={(e) => setDay(e.target.value)} style={inputStyle}>
            {DAYS.map((d, i) => i > 0 && <option key={i} value={i}>{d}</option>)}
          </select>
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} style={inputStyle} />
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} style={inputStyle} />
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Etiket (örn. Okul)" style={{ ...inputStyle, minWidth: '140px' }} />
          <button type="button" onClick={handleAdd} style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: 'var(--color-primary)', color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
            <Plus size={15} /> Ekle
          </button>
        </div>

        {schoolSchedule.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Henüz okul saati girilmedi. Yukarıdan haftalık şablon ekle; koç/öğretmen takviminde "Okulda / Meşgul" olarak görünür.</p>
        ) : (
          schoolSchedule.map((s) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ fontWeight: 600, fontSize: '0.85rem', minWidth: '90px' }}>{DAYS[s.dayOfWeek]}</span>
              <span style={{ fontSize: '0.85rem' }}>{s.startTime} - {s.endTime}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{s.label}</span>
              <button type="button" onClick={() => deleteSchedule.mutate(s.id)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }}>
                <Trash2 size={15} />
              </button>
            </div>
          ))
        )}
      </Card>

      {isLoading && <p>Yükleniyor...</p>}
      <div className={styles.list}>
        {DAYS.map((d, i) => {
          if (i === 0) return null;
          const daySlots = (grouped[i] || []).sort((a, b) => a.startTime.localeCompare(b.startTime));
          if (daySlots.length === 0) return null;
          return (
            <Card key={i} className={styles.card} padding="md">
              <div className={styles.dayHeader}>{d}</div>
              {daySlots.map((s) => (
                <div key={s.id} className={styles.slot}>
                  <span className={styles.time}>{fmt(s.startTime)}-{fmt(s.endTime)}</span>
                  <span className={styles.slotTitle}>{s.title}</span>
                </div>
              ))}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default StudentSchedulePage;

