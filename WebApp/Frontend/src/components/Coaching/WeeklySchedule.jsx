import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './WeeklySchedule.module.css';
import { getWeeklySchedule, saveWeeklySchedule, getWeeklyScheduleHistory } from '../../services/coachingApi';

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 08:00 - 22:00

const CATEGORY_COLORS = {
  School: '#4facfe',
  PrivateLesson: '#9b51e0',
  Study: '#f2994a',
  Social: '#27ae60',
  Other: '#95a5a6',
};

export default function WeeklySchedule({ studentId, tone, readOnly = false }) {
  const { t } = useTranslation('coaching');
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!studentId) return;
    
    const fetchSchedule = async () => {
      setLoading(true);
      try {
        const data = await getWeeklySchedule(studentId);
        if (data && data.blocks) {
          setBlocks(data.blocks);
        }
      } catch (err) {
        console.error('Error fetching schedule:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, [studentId]);

  const handleBlockClick = (dayIndex, hour) => {
    if (readOnly) return;
    
    // Basit bir geçiş (toggle) veya modal açma mantığı (Demo için Other ekler)
    const existingIndex = blocks.findIndex(b => b.dayOfWeek === dayIndex && b.startHour === hour);
    let newBlocks = [...blocks];
    
    if (existingIndex > -1) {
      newBlocks.splice(existingIndex, 1);
    } else {
      newBlocks.push({
        dayOfWeek: dayIndex,
        startHour: hour,
        endHour: hour + 1,
        title: 'Yeni Etkinlik',
        category: 'Study',
        colorHex: CATEGORY_COLORS['Study']
      });
    }
    
    setBlocks(newBlocks);
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await saveWeeklySchedule(studentId, blocks);
      setHasChanges(false);
      alert('Program başarıyla kaydedildi!');
    } catch (err) {
      console.error('Save failed:', err);
      alert('Kaydetme başarısız oldu.');
    }
  };

  if (loading) return <div className={styles.loading}>Program yükleniyor...</div>;

  return (
    <div className={styles.scheduleContainer}>
      <div className={styles.header}>
        <h3>{t('schedule.title', { context: tone, defaultValue: 'Haftalık Program' })}</h3>
        {!readOnly && hasChanges && (
          <button className={styles.saveButton} onClick={handleSave}>
            {t('schedule.save', { context: tone, defaultValue: 'Kaydet' })}
          </button>
        )}
      </div>

      <div className={styles.legend}>
        {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
          <span key={cat} className={styles.legendItem}>
            <span className={styles.colorDot} style={{ backgroundColor: color }}></span>
            {cat}
          </span>
        ))}
      </div>

      <div className={styles.gridContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.timeCol}>Saat</th>
              {DAYS.map(day => (
                <th key={day}>{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map(hour => (
              <tr key={hour}>
                <td className={styles.timeCell}>{`${hour}:00`}</td>
                {DAYS.map((_, dayIndex) => {
                  const block = blocks.find(b => b.dayOfWeek === dayIndex && b.startHour <= hour && b.endHour > hour);
                  return (
                    <td 
                      key={dayIndex} 
                      className={styles.cell}
                      style={{ 
                        backgroundColor: block ? (block.colorHex || CATEGORY_COLORS[block.category]) : 'transparent',
                        cursor: readOnly ? 'default' : 'pointer'
                      }}
                      onClick={() => handleBlockClick(dayIndex, hour)}
                    >
                      {block && block.startHour === hour && (
                        <div className={styles.blockTitle}>{block.title}</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
