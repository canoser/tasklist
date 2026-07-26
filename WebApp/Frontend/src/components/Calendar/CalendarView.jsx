import { useState, useMemo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '../Common/Icons';
import { getTaskRole } from '../../utils/taskUtils';
import styles from './CalendarView.module.css';

const CalendarView = ({ tasks = [], onDayClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Ayın başını ve sonunu bul
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  // JS'de Pazar 0'dır. Takvimi Pazartesi'den (1) başlatmak için kaydırma yapalım.
  const emptyDaysBefore = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const monthName = currentDate.toLocaleString('tr-TR', { month: 'long', year: 'numeric' });

  // Görevleri günlere göre grupla ve her gün için rol noktalarını belirle
  const dayDataMap = useMemo(() => {
    const map = {};
    tasks.forEach(task => {
      if (!task.deadline) return;
      const tDate = new Date(task.deadline);
      // Sadece bu aya ait olanları alalım
      if (tDate.getFullYear() === year && tDate.getMonth() === month) {
        const day = tDate.getDate();
        if (!map[day]) map[day] = { counts: { Orange: 0, Blue: 0, Purple: 0 } };

        const role = getTaskRole(task);
        if (role === 'Teacher') map[day].counts.Orange++;
        else if (role === 'Student') map[day].counts.Blue++;
        else map[day].counts.Purple++;
      }
    });
    return map;
  }, [tasks, month, year]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const renderCells = () => {
    const cells = [];
    // Boşluklar
    for (let i = 0; i < emptyDaysBefore; i++) {
      cells.push(<div key={`empty-${i}`} className={`${styles.dayCell} ${styles.empty}`} />);
    }

    // Günler
    const today = new Date();
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
      const dayData = dayDataMap[d];
      
      cells.push(
        <div 
          key={`day-${d}`} 
          className={`${styles.dayCell} ${isToday ? styles.today : ''}`}
          onClick={() => onDayClick && onDayClick(new Date(year, month, d))}
        >
          <span className={styles.dayNumber}>{d}</span>
          {dayData && (
            <div className={styles.dotsRow}>
              {Object.entries(dayData.counts).map(([color, count]) => {
                if (count === 0) return null;
                return (
                  <div key={color} className={`${styles.countBadge} ${styles[`badge${color}`]}`}>
                    {count}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }
    return cells;
  };

  return (
    <div className={styles.calendarSection}>
      <div className={styles.header}>
        <span className={styles.title}>Takvim</span>
        <div className={styles.monthNav}>
          <button className={styles.navBtn} onClick={handlePrevMonth}><ChevronLeftIcon /></button>
          <span className={styles.currentMonth}>{monthName}</span>
          <button className={styles.navBtn} onClick={handleNextMonth}><ChevronRightIcon /></button>
        </div>
      </div>

      <div className={styles.weekdays}>
        <span className={styles.weekday}>Pzt</span>
        <span className={styles.weekday}>Sal</span>
        <span className={styles.weekday}>Çar</span>
        <span className={styles.weekday}>Per</span>
        <span className={styles.weekday}>Cum</span>
        <span className={styles.weekday}>Cmt</span>
        <span className={styles.weekday}>Paz</span>
      </div>

      <div className={styles.daysGrid}>
        {renderCells()}
      </div>

      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <div className={`${styles.legendColor} ${styles.badgeOrange}`} />
          Öğretmen
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.legendColor} ${styles.badgeBlue}`} />
          Öğrenci
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.legendColor} ${styles.badgePurple}`} />
          Kişisel / Diğer
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
