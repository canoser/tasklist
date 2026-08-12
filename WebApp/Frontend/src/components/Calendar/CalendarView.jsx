import { useState, useMemo, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '../Common/Icons';
import { groupTasksByRole, getTagColors } from '../../utils/taskUtils';
import styles from './CalendarView.module.css';
import { useTranslation } from 'react-i18next';
import FilterDropdown from './FilterDropdown';
import { categoryService } from '../../services/categoryService';

const CalendarView = ({ tasks = [], roles = [], onDayClick, tone }) => {
  const { t, i18n } = useTranslation('common');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filter, setFilter] = useState({ roleIds: [], categoryIds: [], chainIds: [] });
  const [rootCategories, setRootCategories] = useState([]);
  const [chains, setChains] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const fetchRoots = () => {
      categoryService.getRoots().then(roots => {
        if (isMounted) setRootCategories(roots || []);
      }).catch(console.error);
    };
    const fetchChains = async () => {
      try {
        const { default: chainService } = await import('../../services/chainService');
        const data = await chainService.getChains();
        if (isMounted) setChains(data || []);
      } catch(err) {
        console.error(err);
      }
    };
    
    fetchRoots();
    fetchChains();
    
    window.addEventListener('categoriesUpdated', fetchRoots);
    window.addEventListener('chainsUpdated', fetchChains);
    return () => { 
      isMounted = false; 
      window.removeEventListener('categoriesUpdated', fetchRoots);
      window.removeEventListener('chainsUpdated', fetchChains);
    };
  }, []);

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
    if (!Array.isArray(tasks)) return map;

    const filteredTasks = tasks.filter(t => {
      if (filter.roleIds?.length > 0) {
        // Eğer görev rol atanmamışsa roleName null gelir. Ancak filtrede belirli roller seçiliyse,
        // görevin rolu seçili roller arasında olmalı.
        const role = roles.find(r => r.roleName === t.roleName);
        if (!role || !filter.roleIds.includes(role.id)) return false;
      }
      if (filter.categoryIds?.length > 0) {
        if (!filter.categoryIds.includes(t.categoryId)) return false;
      }
      if (filter.chainIds?.length > 0) {
        if (!t.chainId || !filter.chainIds.includes(t.chainId)) return false;
      }
      return true;
    });

    filteredTasks.forEach(task => {
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
  }, [tasks, month, year, filter, roles]);

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
                  style={{ backgroundColor: 'var(--accent-primary)', color: '#fff' }}
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

      <div style={{ marginTop: '16px', marginBottom: '8px' }}>
        <FilterDropdown 
          roles={roles} 
          categories={rootCategories}
          chains={chains}
          filter={filter} 
          onFilterChange={setFilter} 
        />
      </div>

    </div>
  );
};

export default CalendarView;
