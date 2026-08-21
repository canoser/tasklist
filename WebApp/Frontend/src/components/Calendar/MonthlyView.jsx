import { useMemo } from 'react';
import styles from './MonthlyView.module.css';

const MonthlyView = ({ tasks, roles, filter, date, onDayClick, tone, t }) => {
  const year = date.getFullYear();
  const month = date.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const emptyDaysBefore = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  // Filtrelenmiş görevler listesi (Bu aya ait olanlar)
  const dayDataMap = useMemo(() => {
    const map = {};
    if (!Array.isArray(tasks)) return map;

    tasks.forEach(task => {
      // Apply filters first
      if (filter.roleIds?.length > 0) {
        const role = roles.find(r => r.roleName === task.roleName);
        if (!role || !filter.roleIds.includes(role.id)) return;
      }
      if (filter.categoryIds?.length > 0) {
        if (!filter.categoryIds.includes(task.categoryId)) return;
      }
      if (filter.chainIds?.length > 0) {
        if (!task.chainId || !filter.chainIds.includes(task.chainId)) return;
      }

      if (!task.deadline) return;
      const tDate = new Date(task.deadline);
      if (tDate.getFullYear() === year && tDate.getMonth() === month) {
        const day = tDate.getDate();
        if (!map[day]) map[day] = { counts: {} };

        const rName = task.roleName || 'Diğer / Kişisel';
        if (!map[day].counts[rName]) map[day].counts[rName] = 0;
        map[day].counts[rName]++;
      }
    });
    return map;
  }, [tasks, filter, roles, month, year]);

  const renderCells = () => {
    const cells = [];
    for (let i = 0; i < emptyDaysBefore; i++) {
      cells.push(<div key={`empty-${i}`} className={`${styles.dayCell} ${styles.empty}`} />);
    }

    const today = new Date();
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
      const dayData = dayDataMap[d];
      
      cells.push(
        <div 
          key={`day-${d}`} 
          className={`${styles.dayCell} ${isToday ? styles.today : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (onDayClick) onDayClick(new Date(year, month, d));
          }}
        >
          <span className={styles.dayNumber}>{d}</span>
          {dayData && (() => {
            const totalCount = Object.values(dayData.counts).reduce((a, b) => a + b, 0);
            if (totalCount === 0) return null;
            return (
              <div className={styles.dotsRow}>
                <div 
                  className={styles.countBadge}
                  style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                >
                  {totalCount}
                </div>
              </div>
            );
          })()}
        </div>
      );
    }
    return cells;
  };

  return (
    <div className={styles.monthlyWrapper}>
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
    </div>
  );
};

export default MonthlyView;
