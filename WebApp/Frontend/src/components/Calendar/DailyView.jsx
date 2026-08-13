// [MOBILE_PORT_TODO]: useEffect içindeki scrollIntoView -> ScrollView.scrollTo (React Native)
// [MOBILE_PORT_TODO]: toLocaleString('tr-TR') -> date-fns/locale/tr
// [MOBILE_PORT_TODO]: Timezone: new Date(deadline) yerine date-fns zonedTimeToUtc veya Capacitor'a özgü çözüm

import { useEffect, useRef } from 'react';
import { getScheduledTime, getTagColors } from '../../utils/taskUtils';
import styles from './DailyView.module.css';

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0..23
const SLOT_HEIGHT = 64; // px per hour

const DailyView = ({ tasks = [], roles = [], date, filter, onDayClick, tone, t }) => {
  const containerRef = useRef(null);

  // Görevleri bugüne göre filtrele
  const dayTasks = tasks.filter(t => {
    if (!t.deadline) return false;
    return new Date(t.deadline).toDateString() === date.toDateString();
  });

  // Saat bilgisi olanlar ve olmayanlar
  const scheduledTasks = dayTasks.filter(t => getScheduledTime(t) !== null);
  const unscheduledTasks = dayTasks.filter(t => getScheduledTime(t) === null);

  // Açılışta şu anki saate scroll
  // [MOBILE_PORT_TODO]: containerRef.current.scrollTop -> ScrollView.scrollTo({ y })
  useEffect(() => {
    if (containerRef.current) {
      const now = new Date();
      const scrollY = now.getHours() * SLOT_HEIGHT - 60;
      containerRef.current.scrollTop = Math.max(0, scrollY);
    }
  }, [date]);

  return (
    <div className={styles.dailyWrapper}>
      {/* Zamansız görevler şeridi */}
      {unscheduledTasks.length > 0 && (
        <div className={styles.allDayZone}>
          <span className={styles.allDayLabel}>📋 {t('lbl_unscheduled', { context: tone }) || 'Zamansız'}</span>
          <div className={styles.allDayTasks}>
            {unscheduledTasks.map(tTask => {
              const colors = getTagColors(tTask.roleName || t('role_other', { context: tone }) || 'Diğer');
              return (
                <div
                  key={tTask.id}
                  className={`${styles.taskCard} ${tTask.isCompleted ? styles.completed : ''}`}
                  style={{ borderLeft: `3px solid ${colors.background}` }}
                >
                  <span className={styles.taskTitle}>{tTask.title}</span>
                  {tTask.targetCount && <span className={styles.taskMeta}>{tTask.targetCount} {t('lbl_question', { context: tone }) || 'Soru'}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Saat çizelgesi */}
      <div ref={containerRef} className={styles.timelineContainer}>
        {HOURS.map(hour => {
          const hourTasks = scheduledTasks.filter(t => {
            const time = getScheduledTime(t);
            return time && parseInt(time.split(':')[0], 10) === hour;
          });
          const isCurrentHour = new Date().getHours() === hour && date.toDateString() === new Date().toDateString();

          return (
            <div key={hour} className={`${styles.timeSlot} ${isCurrentHour ? styles.currentHour : ''}`} style={{ height: SLOT_HEIGHT }}>
              <span className={styles.timeLabel}>{String(hour).padStart(2, '0')}:00</span>
              <div className={styles.slotContent}>
                {hourTasks.map(tTask => {
                  const colors = getTagColors(tTask.roleName || t('role_other', { context: tone }) || 'Diğer');
                  return (
                    <div
                      key={tTask.id}
                      className={`${styles.scheduledCard} ${tTask.isCompleted ? styles.completed : ''}`}
                      style={{ background: colors.background, color: colors.color }}
                    >
                      <span className={styles.cardTime}>{getScheduledTime(tTask)}</span>
                      <span className={styles.cardTitle}>{tTask.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DailyView;
