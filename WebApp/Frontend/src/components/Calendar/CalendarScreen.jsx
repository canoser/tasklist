import { useState, useEffect, useRef } from 'react';
import CalendarView from './CalendarView';
import DayDetailModal from './DayDetailModal';
import TaskActionModal from '../Task/TaskActionModal';
import { taskService } from '../../services/taskService';
import roleService from '../../services/roleService';
import { useUndo } from '../Common/UndoContext';
import { useTaskContext } from '../../context/TaskContext';
import CategoryManagerPanel from '../Category/CategoryManagerPanel';
import ChainManagerPanel from '../Chain/ChainManagerPanel';
import styles from '../Dashboard/Dashboard.module.css';
import screenStyles from './CalendarScreen.module.css';

const CalendarScreen = ({ user, navigation, tone }) => {
  const [tasks, setTasks] = useState([]);
  const [userRoles, setUserRoles] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  
  const [actionTask, setActionTask] = useState(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  
  const { triggerUndoableAction } = useUndo();
  const { lastAddedTask } = useTaskContext();

  const calendarRef = useRef(null);
  const categoryRef = useRef(null);
  const chainRef = useRef(null);

  const scrollTo = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    let isMounted = true;
    const fetchTasks = async () => {
      // Orijinalde aylık görevleri getirmesi gerekir, mock service için geniş bir aralık veriyoruz
      const start = new Date();
      start.setDate(1); // Ay başı
      const end = new Date();
      end.setMonth(end.getMonth() + 1); // Bir sonraki ay
      
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

  // Yeni görev eklenirse takvime dahil et
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
    setTimeout(() => {
      navigation.openModal('dayDetail');
    }, 0);
  };

  const handleTaskClick = (task) => {
    setActionTask(task);
    setTimeout(() => {
      setIsActionModalOpen(true);
    }, 0);
  };

  const handleComplete = (task) => {
    // Optimistic UI Update
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
    
    // Asıl görev %X tamamlandı olarak güncellenir.
    const updatedTask = { ...task, partialPercent: percent };
    // Kalan miktar için kopyası yeni tarihe atılır (Mock logic)
    const copyTask = { 
      ...task, 
      id: Date.now(), 
      title: `${task.title} (Kalan)`, 
      targetCount: total - done,
      deadline: targetDate,
      partialPercent: null,
      isCompleted: false
    };

    const newState = tasks.map(t => t.id === task.id ? updatedTask : t);
    newState.push(copyTask);

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
      // Mock cascade: rastgele 1-2 görevi de 1 gün ileri at
      newState = newState.map(t => {
        if (t.id !== task.id && t.subject === task.subject && !t.isCompleted) {
          const d = new Date(targetDate);
          d.setDate(d.getDate() + 1); // 1 gün sonrası
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

  return (
    <div className={screenStyles.scrollContainer}>
      {/* BÖLÜM 1: TAKVİM */}
      <section ref={calendarRef} className={screenStyles.section}>
        <CalendarView tasks={tasks} roles={userRoles} onDayClick={handleDayClick} tone={tone} />
        
        <div className={screenStyles.calendarNavFooter}>
          <button onClick={() => scrollTo(categoryRef)} className={screenStyles.primaryBtn}>
            Kategoriler ↓
          </button>
          <button onClick={() => scrollTo(chainRef)} className={screenStyles.secondaryBtn}>
            Zincir Görevler ↓
          </button>
        </div>
      </section>
      
      {/* BÖLÜM 2: KATEGORİLER */}
      <section ref={categoryRef} className={screenStyles.section}>
        <div className={screenStyles.sectionHeader}>
          <button onClick={() => scrollTo(calendarRef)} className={screenStyles.sectionNavBtn}>↑ Takvim</button>
          <h2 className={screenStyles.sectionTitle}>Kategoriler</h2>
          <button onClick={() => scrollTo(chainRef)} className={screenStyles.sectionNavBtn}>Zincir Görev ↓</button>
        </div>
        <CategoryManagerPanel />
      </section>

      {/* BÖLÜM 3: ZİNCİR GÖREVLER */}
      <section ref={chainRef} className={screenStyles.section}>
        <div className={screenStyles.sectionHeader}>
          <button onClick={() => scrollTo(categoryRef)} className={screenStyles.sectionNavBtn}>↑ Kategoriler</button>
          <h2 className={screenStyles.sectionTitle}>Zincir Görevler</h2>
          <button onClick={() => scrollTo(calendarRef)} className={screenStyles.sectionNavBtn}>↑ Takvim</button>
        </div>
        <ChainManagerPanel user={user} />
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

export default CalendarScreen;
