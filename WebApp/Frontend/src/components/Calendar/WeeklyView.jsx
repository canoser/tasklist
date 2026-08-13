// [MOBILE_PORT_TODO]: onClick → onPress (React Native)
// [MOBILE_PORT_TODO]: toLocaleString('tr-TR') → date-fns/locale/tr

import { getTagColors } from '../../utils/taskUtils';
import styles from './WeeklyView.module.css';
import { useOrientation } from '../../hooks/useOrientation';
import { useTranslation } from 'react-i18next';

const WeeklyView = ({ tasks = [], roles = [], weekStart, onDayClick, filter, tone, t }) => {
  const { i18n } = useTranslation('common');
  const currentLang = i18n.language || 'tr-TR';
  const isLandscape = useOrientation();
  
  // weekStart'tan itibaren 7 gün üret (Pazartesi -> Pazar)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const today = new Date();

  return (
    <div className={styles.weekList}>
      {days.map(day => {
        const isToday = day.toDateString() === today.toDateString();
        const dayTasks = tasks.filter(t => {
          if (!t.deadline) return false;
          return new Date(t.deadline).toDateString() === day.toDateString();
        });

        // Rol bazlı sayılar
        const roleCounts = {};
        dayTasks.forEach(tTask => {
          const rName = tTask.roleName || t('role_other', { context: tone }) || 'Diğer';
          roleCounts[rName] = (roleCounts[rName] || 0) + 1;
        });

        return (
          <div
            key={day.toISOString()}
            className={`${styles.dayRow} ${isToday ? styles.todayRow : ''}`}
            onClick={() => onDayClick?.(day)}
          >
            <div className={styles.dayHeader}>
              <span className={`${styles.dayNum} ${isToday ? styles.todayNum : ''}`}>
                {day.getDate()}
              </span>
              <span className={styles.dayName}>
                {day.toLocaleString(currentLang, { weekday: isLandscape ? 'short' : 'long' })}
              </span>
            </div>

            <div className={styles.taskList}>
              {Object.entries(roleCounts).map(([rName, count]) => {
                const colors = getTagColors(rName);
                return (
                  <div key={rName} className={styles.roleBadge} style={{ background: colors.background, color: colors.color }}>
                    {rName} · {count}
                  </div>
                );
              })}
              {dayTasks.length === 0 && <span className={styles.emptyDay}>—</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default WeeklyView;
