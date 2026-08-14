import { useState, useEffect, useRef } from 'react';
import WeeklyPrototypeView from './WeeklyPrototypeView';
import DayDetailModal from '../Calendar/DayDetailModal';
import TaskActionModal from '../Task/TaskActionModal';
import { taskService } from '../../services/taskService';
import roleService from '../../services/roleService';
import { useUndo } from '../Common/UndoContext';
import { useTaskContext } from '../../context/TaskContext';
import CategoryManagerPanel from '../Category/CategoryManagerPanel';
import ChainManagerPanel from '../Chain/ChainManagerPanel';
import screenStyles from '../Calendar/CalendarScreen.module.css';
import { useTranslation } from 'react-i18next';

const WeeklyPrototypeScreen = ({ user, navigation, tone }) => {
  const { t } = useTranslation('common');
  const [tasks, setTasks] = useState([]);
  const [userRoles, setUserRoles] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [sectionHeight, setSectionHeight] = useState(null);
  
  const [actionTask, setActionTask] = useState(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  
  const { triggerUndoableAction } = useUndo();
  const { lastAddedTask } = useTaskContext();

  const containerRef = useRef(null);
  const calendarRef = useRef(null);
  const categoryRef = useRef(null);
  const chainRef = useRef(null);

  // Kapsayıcı yüksekliğini ölç — header + bottom nav çıkarılınca kalan tam alan
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setSectionHeight(containerRef.current.clientHeight);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Her bölüm tam ekran kaydırma (scroll-snap) ile gidecek
  const scrollTo = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    let isMounted = true;
    const fetchTasks = async () => {
      const start = new Date();
      start.setDate(1);
      const end = new Date();
      end.setMonth(end.getMonth() + 1);
      
      try {
        const [taskData, roleData] = await Promise.all([
          taskService.getTimeline(user?.id || user?.uid || null, start, end),
          roleService.getActive(user?.id || user?.uid || null)
        ]);
        if (isMounted) {
          setTasks(taskData || []);
          setUserRoles(roleData || []);
        }
      } catch (err) {
        console.error('Takvim verileri çekilemedi:', err);
      }
    };
    fetchTasks();
    return () => { isMounted = false; };
  }, [user]);

  useEffect(() => {
    if (lastAddedTask) {
      setTasks(prev => {
        if (prev.some(t => t.id === lastAddedTask.id)) return prev;
        return [...prev, lastAddedTask];
      });
    }
  }, [lastAddedTask]);

  const handleDayClick = (date) => {
    setSelectedDay(date);
    setTimeout(() => navigation.openModal('dayDetail'), 0);
  };

  const handleTaskClick = (task) => {
    setActionTask(task);
    setTimeout(() => setIsActionModalOpen(true), 0);
  };

  const handleComplete = (task) => {
    const prevState = [...tasks];
    const newState = tasks.map(t => t.id === task.id ? { ...t, isCompleted: true } : t);
    triggerUndoableAction(
      'Görev tamamlandı.',
      () => setTasks(newState),
      () => taskService.completeTask(task.id, { status: 'completed' }, user?.id || user?.uid),
      () => setTasks(prevState)
    );
  };

  const handlePartialComplete = (task, done, total, targetDate) => {
    const prevState = [...tasks];
    const percent = Math.round((done / total) * 100);
    const updatedTask = { ...task, partialPercent: percent };
    const copyTask = { 
      ...task, id: Date.now(), title: `${task.title} (Kalan)`, 
      targetCount: total - done, deadline: targetDate,
      partialPercent: null, isCompleted: false
    };
    const newState = [...tasks.map(t => t.id === task.id ? updatedTask : t), copyTask];
    triggerUndoableAction(
      `Görev kısmen (%${percent}) tamamlandı. Kalanı ötelendi.`,
      () => setTasks(newState),
      () => console.log('API: Partial complete called', task.id, percent),
      () => setTasks(prevState)
    );
  };

  const handlePostpone = (task, targetDate, cascade) => {
    const prevState = [...tasks];
    let newState = tasks.map(t => t.id === task.id ? { ...t, deadline: targetDate } : t);
    if (cascade) {
      newState = newState.map(t => {
        if (t.id !== task.id && t.subject === task.subject && !t.isCompleted) {
          const d = new Date(targetDate);
          d.setDate(d.getDate() + 1);
          return { ...t, deadline: d.toISOString() };
        }
        return t;
      });
    }
    triggerUndoableAction(
      cascade ? 'Zincirleme erteleme uygulandı.' : 'Görev ertelendi.',
      () => setTasks(newState),
      () => console.log('API: Postpone called', task.id, targetDate, cascade),
      () => setTasks(prevState)
    );
  };

  // Her section'ın yüksekliği: ölçülen kapsayıcı yüksekliği veya fallback
  const sectionStyle = sectionHeight ? { height: `${sectionHeight}px` } : {};

  return (
    <div ref={containerRef} className={screenStyles.scrollContainer}>

      {/* ── BÖLÜM 1: TAKVİM ────────────────────────────────────────────────── */}
      <section ref={calendarRef} className={screenStyles.section} style={sectionStyle}>
        <div className={screenStyles.calendarContent}>
          <WeeklyPrototypeView 
            tasks={tasks} 
            roles={userRoles} 
            onDayClick={handleDayClick} 
            tone={tone} 
            onCategoryClick={() => scrollTo(categoryRef)}
            onChainClick={() => scrollTo(chainRef)}
          />
        </div>
      </section>

      {/* ── BÖLÜM 2: KATEGORİLER ───────────────────────────────────────────── */}
      <section ref={categoryRef} className={screenStyles.section} style={sectionStyle}>
        <div className={screenStyles.sectionHeader}>
          <button onClick={() => scrollTo(calendarRef)} className={screenStyles.sectionNavBtn}>↑ {t('cal_title', { context: tone })}</button>
          <h2 className={screenStyles.sectionTitle}>{t('nav_categories', { context: tone })}</h2>
          <button onClick={() => scrollTo(chainRef)} className={screenStyles.sectionNavBtn}>↓ {t('nav_chains', { context: tone })}</button>
        </div>
        <div className={screenStyles.sectionContent}>
          <CategoryManagerPanel />
        </div>
      </section>

      {/* ── BÖLÜM 3: ZİNCİR GÖREVLER ───────────────────────────────────────── */}
      <section ref={chainRef} className={screenStyles.section} style={sectionStyle}>
        <div className={screenStyles.sectionHeader}>
          <button onClick={() => scrollTo(calendarRef)} className={screenStyles.sectionNavBtn}>↑ {t('cal_title', { context: tone })}</button>
          <h2 className={screenStyles.sectionTitle}>{t('nav_chains', { context: tone })}</h2>
          <button onClick={() => scrollTo(categoryRef)} className={screenStyles.sectionNavBtn}>↑ {t('nav_categories', { context: tone })}</button>
        </div>
        <div className={screenStyles.sectionContent}>
          <ChainManagerPanel user={user} />
        </div>
      </section>

      <DayDetailModal 
        isOpen={navigation.isModalOpen('dayDetail')} 
        onClose={() => navigation.closeModal('dayDetail')} 
        date={selectedDay} 
        tasks={tasks}
        roles={userRoles}
        tone={tone}
        onTaskClick={handleTaskClick}
      />

      <TaskActionModal 
        isOpen={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        task={actionTask}
        onComplete={handleComplete}
        onPartialComplete={handlePartialComplete}
        onPostpone={handlePostpone}
      />
    </div>
  );
};

export default WeeklyPrototypeScreen;
