import React, { useState } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import tr from 'date-fns/locale/tr';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import Card from '../../../components/common/Card/Card';
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

// Mock Events
const MOCK_EVENTS = [
  {
    id: 1,
    title: 'Ayşe Yılmaz - Limit Testi',
    start: new Date(2026, 8, 25, 10, 0), // 25 Eylül 2026
    end: new Date(2026, 8, 25, 23, 59),
    type: 'homework',
    student: 'Ayşe Yılmaz'
  },
  {
    id: 2,
    title: 'Mehmet Demir - Veli Görüşmesi',
    start: new Date(2026, 8, 26, 14, 0),
    end: new Date(2026, 8, 26, 15, 0),
    type: 'meeting',
    student: 'Mehmet Demir'
  },
  {
    id: 3,
    title: 'Zeynep Kaya - LGS Deneme',
    start: new Date(2026, 8, 28, 9, 0),
    end: new Date(2026, 8, 28, 12, 0),
    type: 'exam',
    student: 'Zeynep Kaya'
  }
];

const CalendarPage = () => {
  const [view, setView] = useState(Views.MONTH);
  const [date, setDate] = useState(new Date(2026, 8, 24)); // Default to Sept 2026

  const eventStyleGetter = (event) => {
    let backgroundColor = '#6366f1'; // primary
    if (event.type === 'meeting') backgroundColor = '#f59e0b';
    if (event.type === 'exam') backgroundColor = '#ef4444';

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
          <p className={styles.subtitle}>Öğrenci ödevleri, toplantılar ve deneme sınavlarını yönetin.</p>
        </div>
      </header>

      <div className={styles.calendarWrapper}>
        <Card className={styles.calendarCard}>
          <div className={styles.legend}>
            <span className={styles.legendItem}><span className={styles.dot} style={{backgroundColor: '#6366f1'}}></span> Ödev Teslimi</span>
            <span className={styles.legendItem}><span className={styles.dot} style={{backgroundColor: '#f59e0b'}}></span> Veli/Öğrenci Görüşmesi</span>
            <span className={styles.legendItem}><span className={styles.dot} style={{backgroundColor: '#ef4444'}}></span> Sınav / Deneme</span>
          </div>
          
          <div className={styles.rbcContainer}>
            <Calendar
              localizer={localizer}
              events={MOCK_EVENTS}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '70vh' }}
              views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
              view={view}
              date={date}
              onView={(v) => setView(v)}
              onNavigate={(d) => setDate(d)}
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
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CalendarPage;
