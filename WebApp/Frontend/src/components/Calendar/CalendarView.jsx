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
import MonthlyView from './MonthlyView';
import { motion, useMotionValue, animate } from 'framer-motion';

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

  const handlePrev = () => {
    setAnimDir('backward');
    if (viewMode === 'monthly') {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
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
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
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

  const x = useMotionValue(0);
  const containerRef = useRef(null);

  const handleDragEnd = async (e, { offset, velocity }) => {
    const swipe = offset.x;
    const swipeThreshold = 50;
    const width = containerRef.current?.offsetWidth || window.innerWidth;

    if (swipe < -swipeThreshold) {
      await animate(x, -width, { type: "spring", bounce: 0, velocity: velocity.x });
      handleNext();
      x.set(0);
    } else if (swipe > swipeThreshold) {
      await animate(x, width, { type: "spring", bounce: 0, velocity: velocity.x });
      handlePrev();
      x.set(0);
    } else {
      animate(x, 0, { type: "spring", bounce: 0, velocity: velocity.x });
    }
  };

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

  const getOffsetDate = (baseDate, offsetMode, amount) => {
    const d = new Date(baseDate);
    if (offsetMode === 'monthly') d.setMonth(d.getMonth() + amount);
    else if (offsetMode === 'weekly') d.setDate(d.getDate() + 7 * amount);
    else d.setDate(d.getDate() + amount);
    return d;
  };
  const prevDate = getOffsetDate(currentDate, viewMode, -1);
  const nextDate = getOffsetDate(currentDate, viewMode, 1);

  const renderViewContent = (dateObj) => {
    if (viewMode === 'monthly') {
      return (
        <MonthlyView 
          tasks={filteredTasks} 
          roles={roles} 
          filter={filter} 
          date={dateObj} 
          onDayClick={onDayClick} 
          tone={tone} 
          t={t} 
        />
      );
    }
    if (viewMode === 'weekly') {
      return (
        <WeeklyView 
          tasks={filteredTasks} 
          roles={roles} 
          weekStart={getWeekStart(dateObj)} 
          onDayClick={onDayClick} 
          filter={filter} 
        />
      );
    }
    if (viewMode === 'daily') {
      return (
        <DailyView 
          tasks={filteredTasks} 
          roles={roles} 
          date={dateObj} 
          filter={filter} 
          onDayClick={onDayClick} 
        />
      );
    }
    return null;
  };

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
      <div className={styles.viewSlide} ref={containerRef}>
        <motion.div
          style={{ x, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column' }}
          drag="x"
          onDragEnd={handleDragEnd}
        >
          <div style={{ position: 'absolute', width: '100%', height: '100%', left: '-100%', top: 0 }}>
            {renderViewContent(prevDate)}
          </div>
          
          <div style={{ width: '100%', height: '100%' }}>
            {renderViewContent(currentDate)}
          </div>

          <div style={{ position: 'absolute', width: '100%', height: '100%', left: '100%', top: 0 }}>
            {renderViewContent(nextDate)}
          </div>
        </motion.div>
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
