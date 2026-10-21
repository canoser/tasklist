import React, { useState } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import { startOfMonth, endOfMonth } from 'date-fns';
import tr from 'date-fns/locale/tr';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../../../components/common/Calendar/CalendarOverrides.css';
import Card from '../../../components/common/Card/Card';
import PersonalEventModal from '../../../components/common/PersonalEventModal/PersonalEventModal';
import WeeklySchedulePage from '../schedule/WeeklySchedulePage';
import { Calendar as CalendarIcon, Clock, SlidersHorizontal, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { useCalendarEvents, useStudents } from '../coachApi';
import { usePrograms, useCourses, useTeachers } from '../coachSchoolApi';
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
  const [activeTab, setActiveTab] = useState('CALENDAR'); // 'CALENDAR' | 'SCHEDULE'
  const [view, setView] = useState(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [range, setRange] = useState({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) });

  const [programFilter, setProgramFilter] = useState('');
  const [studentFilter, setStudentFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [teacherFilter, setTeacherFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const { data: programs = [] } = usePrograms();
  const { data: students = [] } = useStudents();
  const activeProgramId = programFilter || (programs.length > 0 ? programs[0].id : '');
  const { data: courses = [] } = useCourses(activeProgramId);
  const { data: teachers = [] } = useTeachers(activeProgramId);

  const { data: events, isLoading } = useCalendarEvents(
    format(range.start, 'yyyy-MM-dd'),
    format(range.end, 'yyyy-MM-dd'),
    {
      programId: programFilter || undefined,
      studentId: studentFilter || undefined,
      courseId: courseFilter || undefined,
      teacherId: teacherFilter || undefined,
      eventType: typeFilter !== 'all' ? typeFilter : undefined,
    }
  );

  // Backend CalendarEventDto → react-big-calendar formatı
  const formattedEvents = (events || []).map((ev) => {
    const isHomework = ev.type === 'HOMEWORK' || ev.type === 'HOMEWORK_DUE';
    const isCompleted = ev.status === 'DONE' || ev.status === 'COMPLETED' || ev.status === 'LATE_DONE';
    const isOverdue = !isCompleted && isHomework && (ev.isOverdue || new Date(ev.start || ev.date) < new Date());

    return {
      id: ev.id,
      title: ev.studentName ? `${ev.title} — ${ev.studentName}` : ev.title,
      start: new Date(ev.start || ev.date),
      end: new Date(ev.end || ev.date),
      type: ev.type,
      color: ev.color,
      status: ev.status,
      isCompleted,
      isOverdue,
      studentName: ev.studentName
    };
  });

  const filteredEvents = typeFilter === 'all'
    ? formattedEvents
    : formattedEvents.filter((ev) => ev.type === typeFilter);

  const handleRangeChange = (r) => {
    if (Array.isArray(r)) {
      if (r.length > 0) setRange({ start: r[0], end: r[r.length - 1] });
    } else if (r?.start && r?.end) {
      setRange({ start: r.start, end: r.end });
    }
  };

  const eventStyleGetter = (event) => {
    // Lejant renkleriyle birebir eşleştirme
    let backgroundColor = '#3B82F6';
    let borderColor = '#2563EB';
    let color = '#FFFFFF';

    if (event.isOverdue) {
      backgroundColor = '#EF4444';
      borderColor = '#DC2626';
    } else if (event.isCompleted) {
      backgroundColor = '#22C55E';
      borderColor = '#16A34A';
    } else if (event.type === 'EXAM') {
      backgroundColor = '#F59E0B';
      borderColor = '#D97706';
    } else if (event.type === 'SCHEDULE' || event.type === 'TEACHER_LESSON') {
      backgroundColor = '#8B5CF6';
      borderColor = '#7C3AED';
    } else if (event.type === 'PAYMENT_DUE') {
      backgroundColor = '#10B981';
      borderColor = '#059669';
    } else if (event.color) {
      backgroundColor = event.color;
      borderColor = event.color;
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        color,
        border: `1px solid ${borderColor}`,
        display: 'block',
        fontSize: '0.8rem',
        padding: '2px 6px',
        fontWeight: '600'
      }
    };
  };

  const activeFiltersCount = [
    Boolean(programFilter),
    Boolean(studentFilter),
    Boolean(courseFilter),
    Boolean(teacherFilter),
    typeFilter !== 'all'
  ].filter(Boolean).length;

  const handleResetFilters = () => {
    setProgramFilter('');
    setStudentFilter('');
    setCourseFilter('');
    setTeacherFilter('');
    setTypeFilter('all');
  };

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Takvim & Program</h1>
          <p className={styles.subtitle}>Öğrencilerinizin ödevleri, ders programları ve sınavları.</p>
        </div>
        {activeTab === 'CALENDAR' && (
          <button className={styles.addBtn} onClick={() => setIsEventModalOpen(true)}>+ Yeni Etkinlik</button>
        )}
      </header>

      {/* 2'li Sekme: Akademik Takvim | Haftalık Ders Programı */}
      <div className={styles.segmentedTabs}>
        <button
          type="button"
          className={`${styles.segmentedBtn} ${activeTab === 'CALENDAR' ? styles.segmentedBtnActive : ''}`}
          onClick={() => setActiveTab('CALENDAR')}
        >
          <CalendarIcon size={16} />
          <span>Akademik Takvim</span>
        </button>
        <button
          type="button"
          className={`${styles.segmentedBtn} ${activeTab === 'SCHEDULE' ? styles.segmentedBtnActive : ''}`}
          onClick={() => setActiveTab('SCHEDULE')}
        >
          <Clock size={16} />
          <span>Haftalık Ders Programı</span>
        </button>
      </div>

      {activeTab === 'SCHEDULE' ? (
        <WeeklySchedulePage programId={activeProgramId} />
      ) : (
        <div className={styles.calendarWrapper}>
          <Card className={styles.calendarCard}>
            <div className={styles.legend}>
              <button type="button" className={styles.legendItem} onClick={() => setTypeFilter(typeFilter === 'HOMEWORK' ? 'all' : 'HOMEWORK')}>
                <span className={styles.dot} style={{ backgroundColor: '#3B82F6' }}></span> Ödev
              </button>
              <span className={styles.legendItem}>
                <span className={styles.dot} style={{ backgroundColor: '#22C55E' }}></span> Tamamlanan Ödev
              </span>
              <span className={styles.legendItem}>
                <span className={styles.dot} style={{ backgroundColor: '#EF4444' }}></span> Gecikmiş Ödev
              </span>
              <button type="button" className={styles.legendItem} onClick={() => setTypeFilter(typeFilter === 'EXAM' ? 'all' : 'EXAM')}>
                <span className={styles.dot} style={{ backgroundColor: '#F59E0B' }}></span> Sınav / Deneme
              </button>
              <button type="button" className={styles.legendItem} onClick={() => setTypeFilter(typeFilter === 'SCHEDULE' ? 'all' : 'SCHEDULE')}>
                <span className={styles.dot} style={{ backgroundColor: '#8B5CF6' }}></span> Ders Programı
              </button>
              <button type="button" className={styles.legendItem} onClick={() => setTypeFilter(typeFilter === 'PAYMENT_DUE' ? 'all' : 'PAYMENT_DUE')}>
                <span className={styles.dot} style={{ backgroundColor: '#10B981' }}></span> Ödeme Günü
              </button>
            </div>

            {/* Mobil Filtre Toggle Bar */}
            <div className={styles.mobileFilterBar}>
              <button
                type="button"
                className={styles.mobileFilterToggle}
                onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                aria-expanded={isFiltersOpen}
              >
                <SlidersHorizontal size={15} />
                <span>Filtreler</span>
                {activeFiltersCount > 0 && (
                  <span className={styles.filterBadge}>{activeFiltersCount}</span>
                )}
                {isFiltersOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>

              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  className={styles.resetFiltersBtn}
                  onClick={handleResetFilters}
                >
                  <RotateCcw size={13} />
                  <span>Temizle</span>
                </button>
              )}
            </div>

            <div className={`${styles.filters} ${isFiltersOpen ? styles.filtersOpen : ''}`}>
              {programs.length > 0 && (
                <select value={programFilter} onChange={(e) => setProgramFilter(e.target.value)} className={styles.select}>
                  <option value="">Tüm Programlar</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}

              <select value={studentFilter} onChange={(e) => setStudentFilter(e.target.value)} className={styles.select}>
                <option value="">Tüm Öğrenciler</option>
                {students?.map((s) => (
                  <option key={s.id} value={s.id}>{s.fullName}</option>
                ))}
              </select>

              <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className={styles.select}>
                <option value="">Tüm Dersler</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select value={teacherFilter} onChange={(e) => setTeacherFilter(e.target.value)} className={styles.select}>
                <option value="">Tüm Öğretmenler</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.fullName}</option>
                ))}
              </select>

              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={styles.select}>
                <option value="all">Tüm Etkinlik Türleri</option>
                <option value="HOMEWORK">Ödev</option>
                <option value="EXAM">Sınav</option>
                <option value="SCHEDULE">Ders Programı</option>
                <option value="PAYMENT_DUE">Ödeme Günü</option>
              </select>
            </div>

            <div className={styles.rbcContainer}>
              {isLoading ? (
                <div className={styles.loading}>Takvim yükleniyor...</div>
              ) : (
                <Calendar
                  localizer={localizer}
                  events={filteredEvents}
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
      )}

      <PersonalEventModal isOpen={isEventModalOpen} onClose={() => setIsEventModalOpen(false)} />
    </div>
  );
};

export default CalendarPage;
