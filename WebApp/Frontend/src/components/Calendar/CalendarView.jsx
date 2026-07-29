import { useState, useMemo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '../Common/Icons';
import { groupTasksByRole, getTagColors } from '../../utils/taskUtils';
import styles from './CalendarView.module.css';
import { useTranslation } from 'react-i18next';

const CalendarView = ({ tasks = [], roles = [], onDayClick, tone }) => {
  const { t, i18n } = useTranslation('common');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Ayın başını ve sonunu bul
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  // JS'de Pazar 0'dır. Takvimi Pazartesi'den (1) başlatmak için kaydırma yapalım.
  const emptyDaysBefore = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const currentLang = i18n.language || 'tr-TR';
  const monthName = currentDate.toLocaleString(currentLang, { month: 'long', year: 'numeric' });

  // Görevleri günlere göre grupla ve her gün için rol isimlerine göre sayıları belirle
  const dayDataMap = useMemo(() => {
    const map = {};
    tasks.forEach(task => {
      if (!task.deadline) return;
      const tDate = new Date(task.deadline);
      // Sadece bu aya ait olanları alalım
      if (tDate.getFullYear() === year && tDate.getMonth() === month) {
        const day = tDate.getDate();
        if (!map[day]) map[day] = { counts: {} };

        const rName = task.roleName || 'Diğer / Kişisel';
        if (!map[day].counts[rName]) map[day].counts[rName] = 0;
        map[day].counts[rName]++;
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
              {Object.entries(dayData.counts).map(([roleName, count]) => {
                if (count === 0) return null;
                const colors = getTagColors(roleName);
                return (
                  <div 
                    key={roleName} 
                    className={styles.countBadge}
                    style={{ backgroundColor: colors.background, color: colors.color, borderColor: colors.border }}
                  >
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
        <span className={styles.title}>{t('cal_title', { context: tone })}</span>
        <div className={styles.monthNav}>
          <button className={styles.navBtn} onClick={handlePrevMonth}><ChevronLeftIcon /></button>
          <span className={styles.currentMonth}>{monthName}</span>
          <button className={styles.navBtn} onClick={handleNextMonth}><ChevronRightIcon /></button>
        </div>
      </div>

      <div className={styles.weekdays}>
        <span className={styles.weekday}>{t('cal_day_mon', { context: tone })}</span>
        <span className={styles.weekday}>{t('cal_day_tue', { context: tone })}</span>
        <span className={styles.weekday}>{t('cal_day_wed', { context: tone })}</span>
        <span className={styles.weekday}>{t('cal_day_thu', { context: tone })}</span>
        <span className={styles.weekday}>{t('cal_day_fri', { context: tone })}</span>
        <span className={styles.weekday}>{t('cal_day_sat', { context: tone })}</span>
        <span className={styles.weekday}>{t('cal_day_sun', { context: tone })}</span>
      </div>

      <div className={styles.daysGrid}>
        {renderCells()}
      </div>

      <div className={styles.legend}>
        {roles.length === 0 ? (
          <div className={styles.legendItem}>
            <div className={styles.legendColor} style={{ backgroundColor: getTagColors('Diğer / Kişisel').background }} />
            {t('cal_legend_other', { context: tone })}
          </div>
        ) : (
          roles.map(r => (
            <div key={r.id} className={styles.legendItem}>
              <div className={styles.legendColor} style={{ backgroundColor: getTagColors(r.roleName).background }} />
              {r.roleName}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CalendarView;
