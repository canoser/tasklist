import React from 'react';
import { useStudentHomework, useCompleteHomework } from '../studentApi';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import { formatDate } from '../../../utils/dateUtils';
import styles from './StudentHomework.module.css';

const HomeworkCard = ({ hw, onComplete }) => {
  const [percentage, setPercentage] = React.useState(hw.completionPercentage || 0);

  return (
    <Card interactive className={styles.homeworkCard}>
      <div className={styles.cardHeader}>
        <h3 className={styles.hwTitle}>{hw.snapshotTitle}</h3>
        <span className={`${styles.statusBadge} ${hw.status === 'OVERDUE' ? styles.overdue : ''}`}>
          {hw.status === 'OVERDUE' ? 'Gecikmiş' : 'Bekliyor'}
        </span>
      </div>
      
      <p className={styles.hwDesc}>{hw.snapshotDesc}</p>
      
      <div className={styles.progressSection}>
        <div className={styles.progressHeader}>
          <span>İlerleme Durumun</span>
          <span>%{percentage}</span>
        </div>
        <input 
          type="range" 
          min="0" max="100" step="10"
          value={percentage} 
          onChange={(e) => setPercentage(Number(e.target.value))}
          className={styles.rangeInput}
        />
      </div>

      <div className={styles.cardFooter}>
        <div className={styles.dueDate}>
          📅 Son Teslim: {formatDate(hw.dueDate, 'dd MMM yyyy, HH:mm')}
        </div>
        <Button 
          size="sm" 
          onClick={() => onComplete({ homeworkId: hw.id, percentage })}
        >
          {percentage === 100 ? 'Tamamla' : 'İlerlemeyi Kaydet'}
        </Button>
      </div>
    </Card>
  );
};

const StudentHomework = () => {
  const { data: homeworks, isLoading, error } = useStudentHomework();
  const { mutate: completeHomework } = useCompleteHomework();

  if (isLoading) {
    return <div className={styles.loading}>Ödevleriniz yükleniyor...</div>;
  }

  if (error) {
    return <div className={styles.error}>Ödevler yüklenirken hata oluştu.</div>;
  }

  const pendingHomeworks = homeworks?.filter(hw => hw.status === 'PENDING' || hw.status === 'OVERDUE') || [];
  const completedHomeworks = homeworks?.filter(hw => hw.status === 'DONE' || hw.status === 'LATE_DONE') || [];

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1 className={styles.title}>Ödevlerim</h1>
        <p className={styles.subtitle}>Sana verilen görevleri buradan takip edebilirsin.</p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Bekleyen Görevler <span className={styles.badge}>{pendingHomeworks.length}</span>
        </h2>
        
        {pendingHomeworks.length === 0 ? (
          <div className={styles.emptyState}>Harika! Bekleyen ödevin yok. 🎉</div>
        ) : (
          <div className={styles.list}>
            {pendingHomeworks.map(hw => (
              <HomeworkCard key={hw.id} hw={hw} onComplete={completeHomework} />
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Tamamlananlar</h2>
        
        {completedHomeworks.length === 0 ? (
          <div className={styles.emptyState}>Henüz tamamlanmış ödevin yok.</div>
        ) : (
          <div className={styles.list}>
            {completedHomeworks.map(hw => (
              <Card key={hw.id} className={styles.homeworkCardCompleted}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.hwTitleCompleted}>{hw.snapshotTitle}</h3>
                  <span className={styles.statusBadgeDone}>
                    ✓ Tamamlandı
                  </span>
                </div>
                <div className={styles.dueDate}>
                  Teslim Edildi: {formatDate(hw.completedAt, 'dd MMM yyyy')}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default StudentHomework;
