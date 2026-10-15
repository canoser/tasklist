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
import { useCalendarEvents } from '../coachApi';
import styles from './CalendarPage.module.css';

const locales = {
  'tr': tr,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const CalendarPage = () => {
  const [view, setView] = useState(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [range, setRange] = useState({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) });

  const { data: events, isLoading } = useCalendarEvents(
    format(range.start, 'yyyy-MM-dd'),
    format(range.end, 'yyyy-MM-dd')
  );

  // Backend CalendarEventDto → react-big-calendar formatı
  const formattedEvents = (events || []).map((ev) => ({
    id: ev.id,
    title: ev.studentName ? `${ev.title} — ${ev.studentName}` : ev.title,
    start: new Date(ev.start),
    end: new Date(ev.end),
    type: ev.type,
    color: ev.color,
    studentName: ev.studentName
  }));

  const handleRangeChange = (r) => {
    if (Array.isArray(r)) {
      if (r.length > 0) setRange({ start: r[0], end: r[r.length - 1] });
    } else if (r?.start && r?.end) {
      setRange({ start: r.start, end: r.end });
    }
  };

  const eventStyleGetter = (event) => {
    // Backend'den gelen rengi kullan; yoksa tipe göre renklendir.
    let backgroundColor = event.color || '#3B82F6';
    if (!event.color) {
      if (event.type === 'EXAM') backgroundColor = '#F59E0B';
      if (event.type === 'SCHEDULE') backgroundColor = '#8B5CF6';
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        display: 'block',
        fontSize: '0.8rem',
        padding: '2px 6px'
      }
    };
  };

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Takvim</h1>
          <p className={styles.subtitle}>Öğrencilerinizin ödevleri, ders programları ve sınavları.</p>
        </div>
      </header>

      <div className={styles.calendarWrapper}>
        <Card className={styles.calendarCard}>
          <div className={styles.legend}>
            <span className={styles.legendItem}><span className={styles.dot} style={{backgroundColor: '#3B82F6'}}></span> Ödev</span>
            <span className={styles.legendItem}><span className={styles.dot} style={{backgroundColor: '#22C55E'}}></span> Tamamlanan Ödev</span>
            <span className={styles.legendItem}><span className={styles.dot} style={{backgroundColor: '#EF4444'}}></span> Gecikmiş Ödev</span>
            <span className={styles.legendItem}><span className={styles.dot} style={{backgroundColor: '#F59E0B'}}></span> Sınav / Deneme</span>
            <span className={styles.legendItem}><span className={styles.dot} style={{backgroundColor: '#8B5CF6'}}></span> Ders Programı</span>
          </div>

          <div className={styles.rbcContainer}>
            {isLoading ? (
              <div className={styles.loading}>Takvim yükleniyor...</div>
            ) : (
              <Calendar
                localizer={localizer}
                events={formattedEvents}
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
                messages={{
                  next: "İleri",
                  previous: "Geri",
                  today: "Bugün",
                  month: "Ay",
                  week: "Hafta",
                  day: "Gün",
                  agenda: "Ajanda"
                }}
                eventPropGetter={eventStyleGetter}
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CalendarPage;
