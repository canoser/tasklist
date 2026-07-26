import { useState, useEffect } from 'react';
import CalendarView from './CalendarView';
import DayDetailModal from './DayDetailModal';
import TaskActionModal from '../Task/TaskActionModal';
import { taskService } from '../../services/taskService';
import { useUndo } from '../Common/UndoContext';
import styles from '../Dashboard/Dashboard.module.css';

const CalendarScreen = ({ user, navigation }) => {
  const [tasks, setTasks] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  
  const [actionTask, setActionTask] = useState(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  
  const { triggerUndoableAction } = useUndo();

  useEffect(() => {
    let isMounted = true;
    const fetchTasks = async () => {
      // Orijinalde aylık görevleri getirmesi gerekir, mock service için geniş bir aralık veriyoruz
      const start = new Date();
      start.setDate(1); // Ay başı
      const end = new Date();
      end.setMonth(end.getMonth() + 1); // Bir sonraki ay
      
      try {
        const data = await taskService.getTimeline(user?.uid || 'mock', start, end);
        if (isMounted && data) setTasks(data);
      } catch (err) {
        console.error('Takvim görevleri çekilemedi:', err);
      }
    };
    fetchTasks();
    return () => { isMounted = false; };
  }, [user]);

  // Yeni görev eklenirse takvime dahil et
  useEffect(() => {
    const handleTaskAdded = (e) => {
      setTasks(prev => [...prev, e.detail]);
    };
    window.addEventListener('taskAdded', handleTaskAdded);
    return () => window.removeEventListener('taskAdded', handleTaskAdded);
  }, []);

  const handleDayClick = (date) => {
    setSelectedDay(date);
    navigation.openModal('dayDetail');
  };

  const handleTaskClick = (task) => {
    setActionTask(task);
    setIsActionModalOpen(true);
  };

  const handleComplete = (task) => {
    // Optimistic UI Update
    const prevState = [...tasks];
    const newState = tasks.map(t => t.id === task.id ? { ...t, isCompleted: true } : t);

    triggerUndoableAction(
      'Görev tamamlandı.',
      () => setTasks(newState),
      () => taskService.completeTask(task.id, { status: 'completed' }, user?.uid),
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
    <div className={styles.dashboard}>
      <CalendarView tasks={tasks} onDayClick={handleDayClick} />
      
      <DayDetailModal 
        isOpen={navigation.isModalOpen('dayDetail')} 
        onClose={() => navigation.closeModal('dayDetail')} 
        date={selectedDay} 
        tasks={tasks}
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
