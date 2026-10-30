import React, { useState } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import { startOfMonth, endOfMonth } from 'date-fns';
import tr from 'date-fns/locale/tr';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import Card from '../../../components/common/Card/Card';
import { useParentChildren, useParentChildCalendar } from '../parentApi';
import ChildSelector from '../../../components/common/ChildSelector/ChildSelector';
import ParentSchedulePage from '../schedule/ParentSchedulePage';
import styles from './ParentCalendarPage.module.css';

const locales = { tr };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const ParentCalendarPage = () => {
  const { data: children, isLoading: isChildrenLoading } = useParentChildren();
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar' | 'schedule'
  const [view, setView] = useState(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [range, setRange] = useState({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) });

  const student = children?.find((c) => c.studentId === selectedChildId) || children?.[0];

  const { data: events, isLoading } = useParentChildCalendar(
    student?.studentId,
    format(range.start, 'yyyy-MM-dd'),
    format(range.end, 'yyyy-MM-dd')
  );

  if (isChildrenLoading) return <div className={styles.pageContainer}>Yükleniyor...</div>;
  if (!student) return <div className={styles.pageContainer}>Kayıtlı öğrenci bulunamadı.</div>;

  const formatted = (events || []).map((ev) => ({
    id: ev.id,
    title: ev.title,
    start: new Date(ev.start),
    end: new Date(ev.end),
    type: ev.type,
    color: ev.color,
  }));

  const handleRangeChange = (r) => {
    if (Array.isArray(r)) {
      if (r.length > 0) setRange({ start: r[0], end: r[r.length - 1] });
    } else if (r?.start && r?.end) {
      setRange({ start: r.start, end: r.end });
    }
  };

  const eventStyleGetter = (event) => ({
    style: {
      backgroundColor: event.color || '#3B82F6',
      borderRadius: '6px',
      opacity: 0.9,
      color: 'white',
      border: 'none',
      display: 'block',
      fontSize: '0.8rem',
      padding: '2px 6px',
    },
  });

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Takvim & Ders Programı</h1>
          <p className={styles.subtitle}>{student.fullName} adlı öğrencinin akademik takvimi ve haftalık ders programı</p>
        </div>
      </header>
      <ChildSelector children={children} selectedId={student.studentId} onSelect={setSelectedChildId} />

      <div style={{ display: 'inline-flex', background: 'var(--bg-color-surface-elevated, var(--bg-app))', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '4px', gap: '4px', width: 'fit-content', marginBottom: '12px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('calendar')}
          style={{
            padding: '7px 14px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
            background: activeTab === 'calendar' ? 'var(--bg-color-surface)' : 'transparent',
            color: activeTab === 'calendar' ? 'var(--color-primary)' : 'var(--text-color-muted)',
            boxShadow: activeTab === 'calendar' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
          }}
        >
          🗓️ Akademik Takvim
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('schedule')}
          style={{
            padding: '7px 14px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
            background: activeTab === 'schedule' ? 'var(--bg-color-surface)' : 'transparent',
            color: activeTab === 'schedule' ? 'var(--color-primary)' : 'var(--text-color-muted)',
            boxShadow: activeTab === 'schedule' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
          }}
        >
          📅 Haftalık Ders Programı
        </button>
      </div>

      {activeTab === 'schedule' ? (
        <ParentSchedulePage studentId={student.studentId} embedded={true} />
      ) : (
        <Card className={styles.card}>
          {isLoading ? (
            <div className={styles.loading}>Takvim yükleniyor...</div>
          ) : (
            <Calendar
              localizer={localizer}
              events={formatted}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '70vh' }}
              views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
              view={view}
              date={date}
              onView={setView}
              onNavigate={setDate}
              onRangeChange={handleRangeChange}
              culture="tr"
              messages={{ next: 'İleri', previous: 'Geri', today: 'Bugün', month: 'Ay', week: 'Hafta', day: 'Gün', agenda: 'Ajanda' }}
              eventPropGetter={eventStyleGetter}
            />
          )}
        </Card>
      )}
    </div>
  );
};

export default ParentCalendarPage;
