import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudentHomework } from '../studentApi';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import { formatDate } from '../../../utils/dateUtils';
import styles from './StudentHome.module.css';

const StudentHome = () => {
  const navigate = useNavigate();
  const { data: homeworks, isLoading } = useStudentHomework();

  // Hesaplamalar
  const pendingHomeworks = homeworks?.filter(hw => hw.status === 'PENDING' || hw.status === 'OVERDUE') || [];
  const completedHomeworks = homeworks?.filter(hw => hw.status === 'DONE' || hw.status === 'LATE_DONE') || [];
  
  const totalHomeworks = homeworks?.length || 0;
  const completionRate = totalHomeworks > 0 ? Math.round((completedHomeworks.length / totalHomeworks) * 100) : 0;
  
  // Yaklaşan 3 ödev
  const upcomingHomeworks = pendingHomeworks
    .slice()
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 3);

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>İyi çalışmalar! 🚀</h1>
          <p className={styles.subtitle}>Bugün hedeflerine bir adım daha yaklaşmak için harika bir gün.</p>
        </div>
      </header>

      {/* İlerleme ve Özet Kartları */}
      <div className={styles.statsGrid}>
        <Card className={styles.statCard} padding="lg">
          <div className={styles.statIcon} style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>📚</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{isLoading ? '...' : pendingHomeworks.length}</span>
            <span className={styles.statLabel}>Bekleyen Ödev</span>
          </div>
        </Card>
        
        <Card className={styles.statCard} padding="lg">
          <div className={styles.statIcon} style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>🎯</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{isLoading ? '...' : `%${completionRate}`}</span>
            <span className={styles.statLabel}>Tamamlama Oranı</span>
          </div>
        </Card>
      </div>

      {/* Yaklaşan Ödevler */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Yaklaşan Ödevler</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/student/homework')}>Tümünü Gör</Button>
        </div>
        
        <div className={styles.homeworkList}>
          {isLoading ? (
            <p>Ödevler yükleniyor...</p>
          ) : upcomingHomeworks.length > 0 ? (
            upcomingHomeworks.map((hw) => (
              <Card key={hw.id} interactive className={styles.homeworkCard}>
                <div className={styles.hwInfo}>
                  <div className={styles.hwIcon}>✏️</div>
                  <div>
                    <h3 className={styles.hwTitle}>{hw.snapshotTitle}</h3>
                    <p className={styles.hwDate}>Son Teslim: {formatDate(hw.dueDate, 'dd MMM')}</p>
                  </div>
                </div>
                <Button size="sm" variant="secondary" onClick={() => navigate('/student/homework')}>İncele</Button>
              </Card>
            ))
          ) : (
            <div style={{ padding: '15px', color: '#64748b', fontSize: '0.9rem' }}>Şu anda yaklaşan ödeviniz yok.</div>
          )}
        </div>
      </section>

      {/* Motivasyon Sözü */}
      <div className={styles.motivationBanner}>
        <p>"Başarı, her gün tekrarlanan küçük çabaların toplamıdır."</p>
        <span>- Robert Collier</span>
      </div>
    </div>
  );
};

export default StudentHome;
