// [MOBILE_PORT_TODO]: CSS @keyframes slide animations are web-specific.
// Native apps (Capacitor/React Native) should use react-native-reanimated for tab view animations.
// [MOBILE_PORT_TODO]: toLocaleString('tr-TR') -> date-fns/locale/tr

import { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '../Common/Icons';
import { getTagColors } from '../../utils/taskUtils';
import styles from './CalendarView.module.css';
import { useTranslation } from 'react-i18next';
import FilterDropdown from './FilterDropdown';
import { categoryService } from '../../services/categoryService';
import WeeklyView from './WeeklyView';
import DailyView from './DailyView';
import { useSwipeable } from 'react-swipeable';
import { motion, AnimatePresence } from 'framer-motion';

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day); // Pazartesi başlangıç
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

const slideVariants = {
  enter: (direction) => {
    return {
      x: direction === 'forward' ? '100%' : '-100%',
      opacity: 0.5
    };
  },
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1
  },
  exit: (direction) => {
    return {
      zIndex: 0,
      x: direction === 'forward' ? '-100%' : '100%',
      opacity: 0.5
    };
  }
};

const CalendarView = ({ tasks = [], roles = [], onDayClick, tone }) => {
  const { t, i18n } = useTranslation('common');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filter, setFilter] = useState({ roleIds: [], categoryIds: [], chainIds: [] });
  const [rootCategories, setRootCategories] = useState([]);
  const [chains, setChains] = useState([]);

  // Görünüm modları & Animasyon state'leri
  const [viewMode, setViewMode] = useState('monthly'); // 'monthly' | 'weekly' | 'daily'
  const [animDir, setAnimDir] = useState('forward');   // 'forward' | 'backward'
  const prevModeRef = useRef('monthly');

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

  const switchView = (newMode) => {
    if (newMode === viewMode) return;
    const order = ['monthly', 'weekly', 'daily'];
    const dir = order.indexOf(newMode) > order.indexOf(viewMode) ? 'forward' : 'backward';
    setAnimDir(dir);
    prevModeRef.current = viewMode;
    setViewMode(newMode);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const emptyDaysBefore = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const currentLang = i18n.language || 'tr-TR';

  // Filtrelenmiş görevler listesi
  const filteredTasks = useMemo(() => {
    if (!Array.isArray(tasks)) return [];
    return tasks.filter(t => {
      if (filter.roleIds?.length > 0) {
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
  }, [tasks, filter, roles]);

  // Aylık görünüm için dayDataMap
  const dayDataMap = useMemo(() => {
    const map = {};
    filteredTasks.forEach(task => {
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
  }, [filteredTasks, month, year]);

  const handlePrev = () => {
    setAnimDir('backward');
    if (viewMode === 'monthly') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else if (viewMode === 'weekly') {
      setCurrentDate(prev => {
        const d = new Date(prev);
        d.setDate(d.getDate() - 7);
        return d;
      });
    } else {
      setCurrentDate(prev => {
        const d = new Date(prev);
        d.setDate(d.getDate() - 1);
        return d;
      });
    }
  };

  const handleNext = () => {
    setAnimDir('forward');
    if (viewMode === 'monthly') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else if (viewMode === 'weekly') {
      setCurrentDate(prev => {
        const d = new Date(prev);
        d.setDate(d.getDate() + 7);
        return d;
      });
    } else {
      setCurrentDate(prev => {
        const d = new Date(prev);
        d.setDate(d.getDate() + 1);
        return d;
      });
    }
  };

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => handlePrev(), // Swipe left to go back (as requested: sola kaydırınca önceki)
    onSwipedRight: () => handleNext(), // Swipe right to go next (as requested: sağa kaydırdıkça sonraki)
    preventScrollOnSwipe: true,
    trackMouse: true
  });

  const getHeaderLabel = () => {
    if (viewMode === 'monthly') {
      return currentDate.toLocaleString(currentLang, { month: 'long', year: 'numeric' });
    } else if (viewMode === 'weekly') {
      const wStart = getWeekStart(currentDate);
      const wEnd = new Date(wStart);
      wEnd.setDate(wEnd.getDate() + 6);
      const startStr = wStart.toLocaleString(currentLang, { day: 'numeric', month: 'short' });
      const endStr = wEnd.toLocaleString(currentLang, { day: 'numeric', month: 'short' });
      return `${startStr} - ${endStr}`;
    } else {
      return currentDate.toLocaleString(currentLang, { weekday: 'short', day: 'numeric', month: 'short' });
    }
  };

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

  const weekStart = useMemo(() => getWeekStart(currentDate), [currentDate]);

  return (
    <div className={styles.calendarSection}>
      {/* Üst Bar: Toggle + Navigasyon */}
      <div className={styles.header}>
        <div className={styles.viewToggle}>
          <button 
            onClick={() => switchView('monthly')} 
            className={`${styles.toggleBtn} ${viewMode === 'monthly' ? styles.active : ''}`}
          >
            Aylık
          </button>
          <button 
            onClick={() => switchView('weekly')} 
            className={`${styles.toggleBtn} ${viewMode === 'weekly' ? styles.active : ''}`}
          >
            Haftalık
          </button>
          <button 
            onClick={() => switchView('daily')} 
            className={`${styles.toggleBtn} ${viewMode === 'daily' ? styles.active : ''}`}
          >
            Günlük
          </button>
        </div>

        <div className={styles.monthNav}>
          <button className={styles.navBtn} onClick={handlePrev}><ChevronLeftIcon /></button>
          <span className={styles.currentMonth}>{getHeaderLabel()}</span>
          <button className={styles.navBtn} onClick={handleNext}><ChevronRightIcon /></button>
        </div>
      </div>

      {/* Animasyon Sarmalayıcısı */}
      <div {...swipeHandlers} className={styles.viewSlide}>
        <AnimatePresence initial={false} custom={animDir}>
          <motion.div
            key={viewMode + currentDate.toISOString()}
            custom={animDir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column' }}
          >
            {viewMode === 'monthly' && (
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
            )}

            {viewMode === 'weekly' && (
              <WeeklyView 
                tasks={filteredTasks} 
                roles={roles} 
                weekStart={weekStart} 
                onDayClick={onDayClick} 
                filter={filter} 
              />
            )}

            {viewMode === 'daily' && (
              <DailyView 
                tasks={filteredTasks} 
                roles={roles} 
                date={currentDate} 
                filter={filter} 
                onDayClick={onDayClick} 
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Filtreler — her modda sabit */}
      <div className={styles.filterWrapper}>
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
