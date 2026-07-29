import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import styles from './Timeline.module.css';
import TaskDetailModal from '../Task/TaskDetailModal';
import PerformanceEntryModal from '../Task/PerformanceEntryModal';
import { taskService } from '../../services/taskService';
import { getTaskColor } from '../../utils/taskUtils';
import { useTranslation } from 'react-i18next';

// ── Mock Veri (API Çevrimdışı / Çatıda test verisi olarak tutulur) ────────────
const INITIAL_TASKS = [
  {
    id: 1,
    time: '09:00',
    title: 'Matematik: Türev ve Uygulamaları',
    subject: 'Matematik',
    type: 'Soru Çözme',
    count: '30 Soru',
    isTeacherAssigned: false,
    isCompleted: true,
    color: 'Green',
    deadline: '26 Tem',
    teacherNote: 'Lütfen çözülemeyen soruları kutuya not edin.',
  },
  {
    id: 2,
    time: '11:30',
    title: 'Taylan Hoca: Limit Etüdü',
    subject: 'Matematik',
    type: 'Etüt',
    count: '45 dk',
    isTeacherAssigned: true,
    isCompleted: false,
    color: 'Orange',
    deadline: '26 Tem',
    teacherNote: 'Etüt öncesi 0. adım sorularını çözüp gelin.',
  },
  {
    id: 3,
    time: '14:00',
    title: 'Fizik: Dinamik',
    subject: 'Fizik',
    type: 'Soru Çözme',
    count: '50 Soru',
    isTeacherAssigned: false,
    isCompleted: false,
    color: 'Blue',
    deadline: '26 Tem',
    teacherNote: 'Newton kanunları 2. test tamamlanacak.',
  },
  {
    id: 4,
    time: '16:30',
    title: 'Taylan Hoca: Matematik Etüdü',
    subject: 'Matematik',
    type: 'Etüt',
    count: '60 dk',
    isTeacherAssigned: true,
    isCompleted: false,
    color: 'Orange',
    deadline: '26 Tem',
    teacherNote: 'Geometri çember tekrarı yapılacak.',
  },
  {
    id: 5,
    time: '19:00',
    title: 'TYT Deneme Sınavı',
    subject: 'Deneme',
    type: 'Deneme',
    count: '120 dk',
    isTeacherAssigned: false,
    isCompleted: false,
    color: 'Purple',
    deadline: '26 Tem',
    teacherNote: 'Süre tutularak çözülmelidir.',
  },
];

// ── Framer Motion Varyantlar ──────────────────────────────────────────────────
const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20, scale: 0.97 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
  },
};

// ── Yardımcı İkonlar ──────────────────────────────────────────────────────────
const BookIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const TeacherIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 1 0-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

// ── Görev Kartı Bileşeni ──────────────────────────────────────────────────────
const TaskCard = ({ task, onClick, currentLang }) => {
  const colorSuffix = getTaskColor(task);

  return (
    <motion.div className={styles.taskRow} variants={itemVariants}>
      <span className={styles.timeLabel}>{task.time || '12:00'}</span>
      <div className={`${styles.dot} ${styles[`dot${colorSuffix}`]}`} />
      <div className={styles.connector} />

      <div
        className={`${styles.taskCard} ${styles[`card${colorSuffix}`]} ${task.isCompleted ? styles.completed : ''}`}
        role="button"
        tabIndex={0}
        onClick={() => onClick(task)}
        aria-label={`${task.time || ''} - ${task.title}`}
      >
        <div className={styles.cardTop}>
          <span className={styles.cardTitle}>{task.title}</span>
          <span className={`${styles.cardBadge} ${styles[`badge${colorSuffix}`]}`}>
            {task.isCompleted ? '✓ Bitti' : task.taskType || task.type || 'Görev'}
          </span>
        </div>

        <div className={styles.cardMeta}>
          <span className={styles.metaItem}>
            <BookIcon />
            {task.targetCount ? `${task.targetCount} Soru` : task.count || '-'}
          </span>
          {task.isTeacherAssigned && (
            <span className={styles.metaItem}>
              <TeacherIcon />
              Öğretmen Görevi
            </span>
          )}
          {task.deadline && (() => {
            // Güvenli tarih formatı
            const raw = task.deadline;
            // Backend ISO string mi yoksa ön-formatı string mi?
            const isShortFormat = typeof raw === 'string' && raw.length <= 10 && !/^\d{4}/.test(raw);
            if (isShortFormat) {
              return <span className={styles.metaItem}>📅 {raw}</span>;
            }
            const d = new Date(raw);
            if (!isNaN(d.getTime())) {
              return <span className={styles.metaItem}>📅 {d.toLocaleDateString(currentLang, { day: 'numeric', month: 'short' })}</span>;
            }
            return null;
          })()}
        </div>
      </div>
    </motion.div>
  );
};

// ── Ana Timeline Bileşeni ─────────────────────────────────────────────────────
const Timeline = ({ user, tasks: initialPropsTasks }) => {
  const [taskList, setTaskList] = useState(initialPropsTasks || INITIAL_TASKS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selectedTask, setSelectedTask] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isPerformanceOpen, setIsPerformanceOpen] = useState(false);

  const { i18n } = useTranslation('common');
  const currentLang = i18n.language || 'tr-TR';

  const today = new Date().toLocaleDateString(currentLang, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  // ── Gerçek API Entegrasyonu (GET Timeline) ──────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    const fetchTimelineData = async () => {
      if (!user?.uid) return;
      
      setLoading(true);
      setError(null);
      try {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);

        const data = await taskService.getTimeline(user.uid, start, end);
        if (isMounted && data && Array.isArray(data) && data.length > 0) {
          // Backend modellerini UI formatına dönüştür
          const mappedTasks = data.map((item) => ({
            ...item,
            time: item.deadline ? new Date(item.deadline).toLocaleTimeString(currentLang, { hour: '2-digit', minute: '2-digit' }) : '12:00',
            type: item.taskType || 'Görev',
            count: item.targetCount ? `${item.targetCount} Soru` : '-',
            color: getTaskColor(item),
          }));
          setTaskList(mappedTasks);
        }
      } catch (err) {
        console.warn('API Timeline verisi çekilemedi, çevrimdışı/mock görünümü aktif:', err);
        // Hata durumunda kullanıcı deneyimini kesmemek adına mevcut listeyi koru
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTimelineData();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Yeni görev eklenirse Timeline'a da dahil et
  useEffect(() => {
    const handleTaskAdded = (e) => {
      setTaskList(prev => [...prev, e.detail]);
    };
    window.addEventListener('taskAdded', handleTaskAdded);
    return () => window.removeEventListener('taskAdded', handleTaskAdded);
  }, []);

  const handleCardClick = (task) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  const handleCompleteTask = (task) => {
    setSelectedTask(task);
    setIsDetailOpen(false);
    setTimeout(() => {
      setIsPerformanceOpen(true);
    }, 200);
  };

  // ── Gerçek API Entegrasyonu (PATCH /complete & POST /performance) ────────────
  const handleSavePerformance = async (perfData) => {
    // Optimistic UI Update (Ekran anında güncellenir)
    setTaskList((prev) =>
      prev.map((t) =>
        t.id === perfData.taskId
          ? { ...t, isCompleted: true, color: 'Green' }
          : t
      )
    );

    // API Çağrısı (Idempotency Filter koruması altında)
    try {
      await taskService.completeTask(perfData.taskId, perfData, user?.uid);
    } catch (err) {
      console.error('API Görev tamamlama çağrısında hata oluştu:', err);
    }
  };

  return (
    <div className={styles.timelineWrapper}>
      {/* Sayfa başlığı */}
      <div className={styles.pageHeader}>
        <span className={styles.dateLabel}>{today}</span>
        <span className={styles.todayBadge}>Bugün</span>
      </div>

      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.skeletonContainer}>
            <div className={styles.skeletonCard} />
            <div className={styles.skeletonCard} />
            <div className={styles.skeletonCard} />
          </div>
        </div>
      ) : error ? (
        <div className={styles.errorState}>
          <span>⚠️ {error}</span>
        </div>
      ) : taskList.length === 0 ? (
        <div className={styles.emptyState}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 12h8M12 8v8" />
          </svg>
          <p>Bugün için görev yok. Harika! 🎉</p>
        </div>
      ) : (
        <motion.div
          className={styles.track}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          style={{ touchAction: 'pan-y' }}
        >
          {taskList.map((task) => (
            <TaskCard key={task.id} task={task} onClick={handleCardClick} currentLang={currentLang} />
          ))}
        </motion.div>
      )}

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onCompleteTask={handleCompleteTask}
      />

      {/* Performance Entry Modal */}
      <PerformanceEntryModal
        task={selectedTask}
        isOpen={isPerformanceOpen}
        onClose={() => setIsPerformanceOpen(false)}
        onSavePerformance={handleSavePerformance}
      />
    </div>
  );
};

export default Timeline;
