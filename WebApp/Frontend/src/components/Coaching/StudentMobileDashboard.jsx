import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './StudentMobileDashboard.module.css';
import WeeklySchedule from './WeeklySchedule';
import { getStudentStatsSummary } from '../../services/coachingApi';
import taskService from '../../services/taskService';
import TaskCompletionForm from './StudentMobile/TaskCompletionForm';

export default function StudentMobileDashboard({ user, tone }) {
  const { t } = useTranslation('coaching');
  const [activeTab, setActiveTab] = useState('tasks');
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);

  // In real app, user.id or user.userId is the student ID
  const studentId = user?.id || user?.userId || 1;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const statsData = await getStudentStatsSummary(studentId);
        setStats(statsData);

        const tasksData = await taskService.getByUserId(studentId);
        setTasks(tasksData || []);
      } catch (err) {
        console.error('Data fetching error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [studentId]);

  const activeTasks = tasks.filter(t => !t.isCompleted);
  const todayTasks = activeTasks; // In a real app, filter by t.deadline

  const handleCompleteClick = (task) => {
    if (task.requirePerformanceEntry) {
      setSelectedTask(task);
    } else {
      // Direct completion
      taskService.completeTask(task.id, null, studentId).then(() => {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, isCompleted: true } : t));
        // Refresh stats
        getStudentStatsSummary(studentId).then(setStats);
      });
    }
  };

  const handleTaskSubmit = async (performanceData) => {
    if (selectedTask) {
      await taskService.completeTask(selectedTask.id, performanceData, studentId);
      setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, isCompleted: true } : t));
      setSelectedTask(null);
      getStudentStatsSummary(studentId).then(setStats);
    }
  };

  return (
    <div className={styles.mobileContainer}>
      <header className={styles.header}>
        <div className={styles.greeting}>
          <h2>Merhaba, {user?.displayName || 'Öğrenci'}!</h2>
          <p>Güncel Seri: <strong className={styles.streak}>{stats?.currentStreak || 0} 🔥</strong></p>
        </div>
      </header>

      <nav className={styles.navBar}>
        <button 
          className={`${styles.navItem} ${activeTab === 'tasks' ? styles.active : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          Görevlerim
        </button>
        <button 
          className={`${styles.navItem} ${activeTab === 'schedule' ? styles.active : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          Programım
        </button>
        <button 
          className={`${styles.navItem} ${activeTab === 'progress' ? styles.active : ''}`}
          onClick={() => setActiveTab('progress')}
        >
          Gelişimim
        </button>
      </nav>

      <div className={styles.contentArea}>
        {activeTab === 'tasks' && (
          <div className={styles.tasksSection}>
            <h3>Bugünün Görevleri</h3>
            {loading ? (
              <p className={styles.emptyText}>Yükleniyor...</p>
            ) : todayTasks.length === 0 ? (
              <p className={styles.emptyText}>Harika! Bekleyen göreviniz yok.</p>
            ) : (
              <ul className={styles.taskList}>
                {todayTasks.map(task => (
                  <li key={task.id} className={styles.taskCard}>
                    <div className={styles.taskInfo}>
                      <span className={styles.taskSubject}>{task.coachSubject || 'Genel Görev'}</span>
                      <p className={styles.taskTitle}>{task.title}</p>
                      {task.coachTopic && <p className={styles.taskTopic}>{task.coachTopic}</p>}
                      <div className={styles.taskMeta}>
                        {task.targetTestCount > 0 && <span>{task.targetTestCount} Test</span>}
                        {task.durationMinutes > 0 && <span>{task.durationMinutes} Dk</span>}
                        {task.isTeacherAssigned && <span className={styles.coachBadge}>Koç Ataması</span>}
                      </div>
                    </div>
                    <button className={styles.completeBtn} onClick={() => handleCompleteClick(task)}>
                      Bitir
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className={styles.scheduleSection}>
            <WeeklySchedule studentId={studentId} tone={tone} readOnly={false} />
          </div>
        )}

        {activeTab === 'progress' && (
          <div className={styles.progressSection}>
            <h3>Gelişim Özeti</h3>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Tamamlanan</span>
                <span className={styles.statValue}>{stats?.completedTasksCount || 0}</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Çözülen Soru</span>
                <span className={styles.statValue}>{stats?.totalQuestionsSolved || 0}</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Çalışma (Saat)</span>
                <span className={styles.statValue}>{stats?.totalStudyHours || 0}</span>
              </div>
            </div>
            {/* Net Trend can be added here as a mini chart in the future */}
          </div>
        )}
      </div>

      {selectedTask && (
        <TaskCompletionForm 
          task={selectedTask} 
          onSubmit={handleTaskSubmit} 
          onCancel={() => setSelectedTask(null)} 
        />
      )}
    </div>
  );
}
