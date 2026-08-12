// [MOBILE_PORT_TODO]: useEffect içindeki scrollIntoView -> ScrollView.scrollTo (React Native)
// [MOBILE_PORT_TODO]: toLocaleString('tr-TR') -> date-fns/locale/tr
// [MOBILE_PORT_TODO]: Timezone: new Date(deadline) yerine date-fns zonedTimeToUtc veya Capacitor'a özgü çözüm

import { useEffect, useRef } from 'react';
import { getScheduledTime, getTagColors } from '../../utils/taskUtils';
import styles from './DailyView.module.css';

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0..23
const SLOT_HEIGHT = 64; // px per hour

const DailyView = ({ tasks = [], roles = [], date, filter, onDayClick }) => {
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
          <span className={styles.allDayLabel}>📋 Zamansız</span>
          <div className={styles.allDayTasks}>
            {unscheduledTasks.map(t => {
              const colors = getTagColors(t.roleName || 'Diğer');
              return (
                <div
                  key={t.id}
                  className={`${styles.taskCard} ${t.isCompleted ? styles.completed : ''}`}
                  style={{ borderLeft: `3px solid ${colors.background}` }}
                >
                  <span className={styles.taskTitle}>{t.title}</span>
                  {t.targetCount && <span className={styles.taskMeta}>{t.targetCount} Soru</span>}
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
                {hourTasks.map(t => {
                  const colors = getTagColors(t.roleName || 'Diğer');
                  return (
                    <div
                      key={t.id}
                      className={`${styles.scheduledCard} ${t.isCompleted ? styles.completed : ''}`}
                      style={{ background: colors.background, color: colors.color }}
                    >
                      <span className={styles.cardTime}>{getScheduledTime(t)}</span>
                      <span className={styles.cardTitle}>{t.title}</span>
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
