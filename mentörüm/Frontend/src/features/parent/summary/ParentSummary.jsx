import React, { useState } from 'react';
import { useParentChildren, useParentChildHomework } from '../parentApi';
import Card from '../../../components/common/Card/Card';
import { formatDate } from '../../../utils/dateUtils';
import styles from './ParentSummary.module.css';

const ParentSummary = () => {
  const { data: children, isLoading: isChildrenLoading } = useParentChildren();
  const [selectedChildId, setSelectedChildId] = useState(null);

  const student = children?.find((c) => c.studentId === selectedChildId) || children?.[0];
  
  const { data: homeworks, isLoading: isHwLoading } = useParentChildHomework(student?.studentId);

  if (isChildrenLoading) return <div className={styles.pageContainer}>Yükleniyor...</div>;
  if (!children || children.length === 0) return <div className={styles.pageContainer}>Kayıtlı öğrenci bulunamadı.</div>;

  const pendingHomeworks = homeworks?.filter(hw => hw.status === 'PENDING' || hw.status === 'OVERDUE') || [];
  const completedHomeworks = homeworks?.filter(hw => hw.status === 'DONE' || hw.status === 'LATE_DONE') || [];
  
  const totalHomeworks = homeworks?.length || 0;
  const completionRate = totalHomeworks > 0 ? Math.round((completedHomeworks.length / totalHomeworks) * 100) : 0;

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1 className={styles.title}>Haftalık Özet</h1>
        <p className={styles.subtitle}>{student.fullName} adlı öğrencinin genel durumu</p>
        {children.length > 1 && (
          <select
            value={student.studentId}
            onChange={(e) => setSelectedChildId(e.target.value)}
            style={{ marginTop: 8, padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0' }}
          >
            {children.map((c) => (
              <option key={c.studentId} value={c.studentId}>{c.fullName}</option>
            ))}
          </select>
        )}
      </header>

      <div className={styles.statsGrid}>
        <Card className={styles.statCard} padding="lg">
          <div className={styles.statIcon} style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>📚</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{isHwLoading ? '...' : pendingHomeworks.length}</span>
            <span className={styles.statLabel}>Bekleyen Ödev</span>
          </div>
        </Card>
        
        <Card className={styles.statCard} padding="lg">
          <div className={styles.statIcon} style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>🎯</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{isHwLoading ? '...' : `%${completionRate}`}</span>
            <span className={styles.statLabel}>Tamamlama Oranı</span>
          </div>
        </Card>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Son Tamamlananlar</h2>
        <div className={styles.homeworkList}>
          {isHwLoading ? (
            <p>Yükleniyor...</p>
          ) : completedHomeworks.length > 0 ? (
            completedHomeworks.slice(0, 3).map(hw => (
              <Card key={hw.id} className={styles.completedCard}>
                <div className={styles.hwInfo}>
                  <div className={styles.hwIcon}>✅</div>
                  <div>
                    <h3 className={styles.hwTitle}>{hw.snapshotTitle}</h3>
                    <p className={styles.hwDate}>Teslim: {formatDate(hw.completedAt, 'dd MMM yyyy')}</p>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <p className={styles.emptyState}>Henüz tamamlanan ödev yok.</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default ParentSummary;
