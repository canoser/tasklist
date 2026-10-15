import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudents, useCalendarEvents, useReportsOverview } from '../coachApi';
import Calendar from '../../../components/common/Calendar/Calendar';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import styles from './CoachDashboard.module.css';

const CoachDashboard = () => {
  const navigate = useNavigate();
  // Takvim aralığı durumu
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  });

  const { data: students, isLoading: isStudentsLoading } = useStudents();
  const { data: report } = useReportsOverview();

  const { data: events } = useCalendarEvents(
    format(dateRange.start, 'yyyy-MM-dd'),
    format(dateRange.end, 'yyyy-MM-dd')
  );

  const handleRangeChange = (range) => {
    if (Array.isArray(range)) {
      if (range.length > 0) {
        setDateRange({ start: range[0], end: range[range.length - 1] });
      }
    } else if (range?.start && range?.end) {
      setDateRange({ start: range.start, end: range.end });
    }
  };

  const formattedEvents = (events || []).map(ev => ({
    ...ev,
    start: new Date(ev.start || ev.date),
    end: new Date(ev.end || ev.date),
    title: ev.studentName ? `${ev.title} — ${ev.studentName}` : ev.title
  }));

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todaysHomeworks = formattedEvents.filter(
    ev => ev.type === 'HOMEWORK' && format(ev.start, 'yyyy-MM-dd') === todayStr
  );
  const atRiskStudents = (students || []).filter((s) => s.overdueHomeworkCount > 0);

  const kpis = [
    { label: 'Toplam Öğrenci', value: report?.totalStudents ?? 0, color: '#6366f1' },
    { label: 'Bu Hafta Verilen', value: report?.assignedThisWeek ?? 0, color: '#0ea5e9' },
    { label: 'Bugün Biten', value: report?.completedToday ?? 0, color: '#22c55e' },
    { label: 'Gecikmiş', value: report?.totalOverdue ?? 0, color: '#ef4444' }
  ];

  return (
    <div className={styles.dashboardContainer}>
      <header className={styles.header}>
        <h1 className={styles.pageTitle}>Dashboard</h1>
        <p className={styles.pageSubtitle}>Öğrencilerinizin genel durumu ve bugünkü öncelikleriniz.</p>
      </header>

      <div className={styles.kpiRow}>
        {kpis.map((k) => (
          <Card key={k.label} padding="md" className={styles.kpiCard}>
            <span className={styles.kpiValue} style={{ color: k.color }}>{k.value}</span>
            <span className={styles.kpiLabel}>{k.label}</span>
          </Card>
        ))}
      </div>

      {atRiskStudents.length > 0 && (
        <Card padding="md" className={styles.atRiskCard}>
          <h3 className={styles.atRiskTitle}>⚠️ Takip Gerektirenler</h3>
          <ul className={styles.atRiskList}>
            {atRiskStudents.map((s) => (
              <li key={s.id} className={styles.atRiskItem}>
                {s.fullName} — {s.overdueHomeworkCount} gecikmiş ödev
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className={styles.grid}>
        {/* Sol Kolon: Öğrenci Listesi */}
        <section className={styles.studentsSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Öğrencilerim</h2>
            <Button size="sm" variant="outline" onClick={() => navigate('/coach/students')}>
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
                      <span className={styles.studentDetail}>
                        {student.grade != null ? `${student.grade}. Sınıf` : 'Sınıf Belirtilmemiş'}
                        {student.track ? ` • ${student.track}` : ''}
                      </span>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => navigate(`/coach/students/${student.id}`)}>
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

        {/* Sağ Kolon: Bugünün Ajandası */}
        <section className={styles.calendarSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Bugünün Ajandası</h2>
          </div>

          {todaysHomeworks.length > 0 && (
            <Card padding="md" className={styles.todayCard}>
              <h3 className={styles.todayTitle}>Bugün teslim edilecek ödevler</h3>
              <ul className={styles.todayList}>
                {todaysHomeworks.map(ev => (
                  <li key={ev.id} className={styles.todayItem}>📝 {ev.title}</li>
                ))}
              </ul>
            </Card>
          )}

          <Calendar
            events={formattedEvents}
            defaultView="agenda"
            onRangeChange={handleRangeChange}
            onSelectEvent={(ev) => alert(`Etkinlik: ${ev.title}`)}
            style={{ height: 400 }}
          />
        </section>
      </div>
    </div>
  );
};

export default CoachDashboard;

