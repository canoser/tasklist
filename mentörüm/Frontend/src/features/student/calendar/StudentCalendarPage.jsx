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
import Button from '../../../components/common/Button/Button';
import PersonalEventModal from '../../../components/common/PersonalEventModal/PersonalEventModal';
import { useStudentCalendar, useStudentSessions } from '../studentApi';
import styles from './StudentCalendarPage.module.css';

const locales = { tr };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const StudentCalendarPage = () => {
  const [view, setView] = useState(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [range, setRange] = useState({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) });
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  const { data: events, isLoading: isCalendarLoading } = useStudentCalendar(
    format(range.start, 'yyyy-MM-dd'),
    format(range.end, 'yyyy-MM-dd')
  );
  const { data: sessions = [] } = useStudentSessions();

  const formattedCalendarEvents = (events || []).map((ev) => ({
    id: ev.id,
    title: ev.type === 'VIDEO' ? `🎥 ${ev.title}${ev.isCompleted ? ' (İzlendi ✓)' : ''}` : ev.title,
    start: new Date(ev.start),
    end: new Date(ev.end),
    type: ev.type,
    color: ev.color,
  }));

  const sessionEvents = sessions
    .filter(s => s.sessionDate)
    .map(s => {
      const start = new Date(s.sessionDate);
      const end = new Date(start.getTime() + 45 * 60 * 1000); // 45 dk seans
      const isPast = start < new Date();
      return {
        id: s.id,
        title: `🎯 ${s.title || 'Koçluk Görüşmesi'}${isPast ? ' (Tamamlandı ✓)' : ''}`,
        start,
        end,
        type: 'SESSION',
        color: isPast ? '#64748B' : '#EC4899',
      };
    });

  const formatted = [...formattedCalendarEvents, ...sessionEvents];
  const isLoading = isCalendarLoading;

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
          <h1 className={styles.title}>Takvimim</h1>
          <p className={styles.subtitle}>Ödevlerin, sınavların ve ders programın.</p>
        </div>
        <Button size="sm" onClick={() => setIsEventModalOpen(true)}>+ Yeni Etkinlik</Button>
      </header>
      <Card className={styles.card}>
        <div className={styles.legend}>
          <span className={styles.legendItem}><span className={styles.dot} style={{ backgroundColor: '#3B82F6' }} /> Ödev</span>
          <span className={styles.legendItem}><span className={styles.dot} style={{ backgroundColor: '#22C55E' }} /> Tamamlanan</span>
          <span className={styles.legendItem}><span className={styles.dot} style={{ backgroundColor: '#EF4444' }} /> Gecikmiş</span>
          <span className={styles.legendItem}><span className={styles.dot} style={{ backgroundColor: '#F59E0B' }} /> Sınav</span>
          <span className={styles.legendItem}><span className={styles.dot} style={{ backgroundColor: '#8B5CF6' }} /> Ders Programı</span>
          <span className={styles.legendItem}><span className={styles.dot} style={{ backgroundColor: '#EC4899' }} /> Koçluk Görüşmesi</span>
        </div>
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
            onView={(v) => setView(v)}
            onNavigate={(d) => setDate(d)}
            onRangeChange={handleRangeChange}
            culture="tr"
            messages={{ next: 'İleri', previous: 'Geri', today: 'Bugün', month: 'Ay', week: 'Hafta', day: 'Gün', agenda: 'Ajanda' }}
            eventPropGetter={eventStyleGetter}
          />
        )}
      </Card>

      <PersonalEventModal isOpen={isEventModalOpen} onClose={() => setIsEventModalOpen(false)} defaultType="STUDENT_EVENT" />
    </div>
  );
};

export default StudentCalendarPage;
