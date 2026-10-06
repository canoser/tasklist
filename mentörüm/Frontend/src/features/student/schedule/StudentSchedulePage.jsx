import React from 'react';
import { useStudentSchedule } from '../studentSchoolApi';
import Card from '../../../components/common/Card/Card';
import styles from './StudentSchedulePage.module.css';

const DAYS = ['', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const fmt = (t) => (t ? t.slice(0, 5) : '');

const StudentSchedulePage = () => {
  const { data: slots, isLoading } = useStudentSchedule();
  const grouped = {};
  slots?.forEach((s) => {
    if (!grouped[s.dayOfWeek]) grouped[s.dayOfWeek] = [];
    grouped[s.dayOfWeek].push(s);
  });

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Programım</h1>
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
