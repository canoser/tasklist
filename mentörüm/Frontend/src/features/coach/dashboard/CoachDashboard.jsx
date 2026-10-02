import React, { useState } from 'react';
import { useStudents, useCalendarEvents } from '../coachApi';
import Calendar from '../../../components/common/Calendar/Calendar';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import styles from './CoachDashboard.module.css';

const CoachDashboard = () => {
  // Takvim aralığı durumu
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  });

  const { data: students, isLoading: isStudentsLoading } = useStudents();
  
  const { data: events } = useCalendarEvents(
    format(dateRange.start, 'yyyy-MM-dd'),
    format(dateRange.end, 'yyyy-MM-dd')
  );

  const handleRangeChange = (range) => {
    if (Array.isArray(range)) {
      // Haftalık / Günlük görünüm
      if (range.length > 0) {
        setDateRange({ start: range[0], end: range[range.length - 1] });
      }
    } else {
      // Aylık görünüm
      setDateRange({ start: range.start, end: range.end });
    }
  };

  // Backend'den gelen etkinlikleri react-big-calendar formatına çevir (eğer backend DTO'su farklıysa)
  const formattedEvents = (events || []).map(ev => ({
    ...ev,
    start: new Date(ev.start || ev.date), // DTO'ya göre ayarlanmalı
    end: new Date(ev.end || ev.date),
    title: ev.title || 'Etkinlik'
  }));

  return (
    <div className={styles.dashboardContainer}>
      <header className={styles.header}>
        <h1 className={styles.pageTitle}>Dashboard</h1>
        <p className={styles.pageSubtitle}>Öğrencilerinizin genel durumu ve takviminiz.</p>
      </header>

      <div className={styles.grid}>
        {/* Sol Kolon: Öğrenci Listesi */}
        <section className={styles.studentsSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Öğrencilerim</h2>
            <Button size="sm" variant="outline" onClick={() => alert('Öğrenci ekle modali yakında eklenecek')}>
              + Yeni Ekle
            </Button>
          </div>

          <Card padding="none" className={styles.studentsCard}>
            {isStudentsLoading ? (
              <div className={styles.loading}>Öğrenciler yükleniyor...</div>
            ) : students && students.length > 0 ? (
              <ul className={styles.studentList}>
                {students.map(student => (
                  <li key={student.id} className={styles.studentItem}>
                    <div className={styles.studentAvatar}>
                      {student.fullName?.charAt(0) || 'O'}
                    </div>
                    <div className={styles.studentInfo}>
                      <span className={styles.studentName}>{student.fullName}</span>
                      <span className={styles.studentDetail}>{student.grade}. Sınıf • {student.track || '-'}</span>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => alert(`${student.fullName} profili açılacak`)}>
                      İncele
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={styles.emptyState}>Henüz öğrenciniz bulunmuyor.</div>
            )}
          </Card>
        </section>

        {/* Sağ Kolon: Takvim */}
        <section className={styles.calendarSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Genel Takvim</h2>
          </div>
          
          <Calendar
            events={formattedEvents}
            onRangeChange={handleRangeChange}
            onSelectEvent={(ev) => alert(`Etkinlik: ${ev.title}`)}
            style={{ height: 600 }}
          />
        </section>
      </div>
    </div>
  );
};

export default CoachDashboard;
