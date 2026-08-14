import styles from './WeeklyView.module.css';
import { useTranslation } from 'react-i18next';

const WeeklyView = ({ tasks = [], roles = [], weekStart, onDayClick, filter, tone, t, onTaskToggle }) => {
  const { i18n } = useTranslation('common');
  const currentLang = i18n.language || 'tr-TR';
  
  // weekStart'tan itibaren 7 gün üret (Pazartesi -> Pazar)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const today = new Date();

  return (
    <div className={styles.gridContainer}>
      {days.map((day, index) => {
        const isToday = day.toDateString() === today.toDateString();
        const dayTasks = tasks.filter(t => t.deadline && new Date(t.deadline).toDateString() === day.toDateString());

        return (
          <div key={day.toISOString()} className={`${styles.sheetCard} ${isToday ? styles.todayCard : ''}`} onClick={() => onDayClick?.(day)}>
            <div className={`${styles.sheetHeader} ${isToday ? styles.todayHeader : ''}`}>
              <span className={styles.dayName}>
                {day.toLocaleString(currentLang, { weekday: 'long' })}
              </span>
              <span className={styles.dateNum}>
                {day.toLocaleString(currentLang, { month: 'short' })} {day.getDate()}
              </span>
            </div>
            
            <div className={styles.sheetBody}>
              {dayTasks.map(task => (
                <div 
                  key={task.id} 
                  className={`${styles.taskItem} ${task.isCompleted ? styles.completed : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDayClick?.(day); // Tıklayınca günlük detayı açsın
                  }}
                >
                  <div 
                    className={styles.checkbox}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onTaskToggle) onTaskToggle(task);
                    }}
                  >
                    {task.isCompleted && <span>✓</span>}
                  </div>
                  <span className={styles.taskTitle}>{task.title}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default WeeklyView;
