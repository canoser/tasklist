import React from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import tr from 'date-fns/locale/tr';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './CalendarOverrides.css';

const locales = {
  'tr': tr,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

const messages = {
  allDay: 'Tüm Gün',
  previous: 'Geri',
  next: 'İleri',
  today: 'Bugün',
  month: 'Ay',
  week: 'Hafta',
  day: 'Gün',
  agenda: 'Ajanda',
  date: 'Tarih',
  time: 'Saat',
  event: 'Etkinlik',
  noEventsInRange: 'Bu aralıkta etkinlik bulunmuyor.',
};

/**
 * events = [{ title: string, start: Date, end: Date, resource?: any }]
 */
const Calendar = ({ events, onSelectEvent, onRangeChange, defaultView = 'month', style = { height: 500 } }) => {
  return (
    <div className="custom-calendar-container" style={style}>
      <BigCalendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        culture="tr"
        messages={messages}
        defaultView={defaultView}
        onSelectEvent={onSelectEvent}
        onRangeChange={onRangeChange}
        views={['month', 'week', 'day', 'agenda']}
      />
    </div>
  );
};

export default Calendar;
