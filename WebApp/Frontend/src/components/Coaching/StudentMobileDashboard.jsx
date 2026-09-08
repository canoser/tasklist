import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './StudentMobileDashboard.module.css';
import WeeklySchedule from './WeeklySchedule';
import { getStudentStatsSummary } from '../../services/coachingApi';

export default function StudentMobileDashboard({ user, tone }) {
  const { t } = useTranslation('coaching');
  const [activeTab, setActiveTab] = useState('tasks');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    // Öğrenci kendi ID'sini öğrenip istatistiklerini çekebilir (mock ID 1 for now)
    const fetchStats = async () => {
      try {
        const data = await getStudentStatsSummary(1); // TODO: fetch actual student ID mapped to user
        setStats(data);
      } catch (err) {
        console.error('Stats fetching error:', err);
      }
    };
    fetchStats();
  }, []);

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
            {/* Görev listesi bileşeni (Mevcut TaskManager vb. kullanılabilir) */}
            <p className={styles.emptyText}>Henüz koçunuz tarafından atanmış bir görev yok.</p>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className={styles.scheduleSection}>
            <WeeklySchedule studentId={1} tone={tone} readOnly={false} />
          </div>
        )}

        {activeTab === 'progress' && (
          <div className={styles.progressSection}>
            <h3>Gelişim Özeti</h3>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Tamamlanan</span>
                <span className={styles.statValue}>{stats?.completedTasks || 0}</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Toplam Sınav</span>
                <span className={styles.statValue}>{stats?.totalExams || 0}</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Ort. Net (TYT)</span>
                <span className={styles.statValue}>{stats?.averageTytNet || 0}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
