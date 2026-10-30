import React, { useState } from 'react';
import { useStudentSchedule } from '../studentSchoolApi';
import { useStudentSchoolSchedule, useCreateSchoolSchedule, useDeleteSchoolSchedule } from '../studentApi';
import Card from '../../../components/common/Card/Card';
import { Trash2, Plus } from 'lucide-react';
import styles from './StudentSchedulePage.module.css';

const DAYS = ['', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const DAY_PILLS = [
  { id: 1, label: 'Pzt' },
  { id: 2, label: 'Sal' },
  { id: 3, label: 'Çar' },
  { id: 4, label: 'Per' },
  { id: 5, label: 'Cum' },
  { id: 6, label: 'Cts' },
  { id: 7, label: 'Paz' },
];
const fmt = (t) => (t ? t.slice(0, 5) : '');

const inputStyle = { padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)', colorScheme: 'dark' };

const StudentSchedulePage = ({ embedded = false }) => {
  const { data: slots, isLoading } = useStudentSchedule();
  const { data: schoolSchedule = [] } = useStudentSchoolSchedule();
  const createSchedule = useCreateSchoolSchedule();
  const deleteSchedule = useDeleteSchoolSchedule();

  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5]);
  const [start, setStart] = useState('08:30');
  const [end, setEnd] = useState('15:30');
  const [label, setLabel] = useState('Okul');

  const grouped = {};
  slots?.forEach((s) => {
    if (!grouped[s.dayOfWeek]) grouped[s.dayOfWeek] = [];
    grouped[s.dayOfWeek].push(s);
  });

  const toggleDay = (d) => {
    setSelectedDays((prev) => 
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)
    );
  };

  const selectWeekdays = () => setSelectedDays([1, 2, 3, 4, 5]);

  const handleAdd = async () => {
    if (!start || !end || selectedDays.length === 0) return;
    for (const d of selectedDays) {
      createSchedule.mutate({ dayOfWeek: Number(d), startTime: start, endTime: end, label: label.trim() || 'Okul' });
    }
  };

  return (
    <div className={styles.container} style={embedded ? { padding: 0, maxWidth: '100%' } : undefined}>
      {!embedded && <h1 className={styles.title}>Programım</h1>}

      <Card className={styles.card} padding="md">
        <h2 style={{ margin: '0 0 10px', fontSize: '1rem' }}>Okul Saatlerim (Haftalık Tekrarlayan Şablon)</h2>
        
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginRight: '4px' }}>Günler:</span>
          {DAY_PILLS.map((d) => {
            const isSel = selectedDays.includes(d.id);
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => toggleDay(d.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: isSel ? '1px solid var(--color-primary, #10B981)' : '1px solid var(--border-color)',
                  background: isSel ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-app)',
                  color: isSel ? 'var(--color-primary, #10B981)' : 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  fontWeight: isSel ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {d.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={selectWeekdays}
            style={{
              padding: '5px 10px',
              borderRadius: '6px',
              border: '1px dashed var(--border-color)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: '0.75rem',
              cursor: 'pointer',
              marginLeft: '4px'
            }}
          >
            Hafta İçi (Pzt-Cum)
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '10px' }}>
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} style={inputStyle} title="Başlangıç Saati" />
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} style={inputStyle} title="Bitiş Saati" />
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Etiket (örn. Okul)" style={{ ...inputStyle, minWidth: '140px' }} />
          <button type="button" onClick={handleAdd} disabled={createSchedule.isPending || selectedDays.length === 0} style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: 'var(--color-primary)', color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
            <Plus size={15} /> {selectedDays.length > 1 ? `${selectedDays.length} Güne Ekle` : 'Ekle'}
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
