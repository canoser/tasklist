import React from 'react';
import { useParentChildren, useParentChildHomework } from '../parentApi';
import Card from '../../../components/common/Card/Card';
import { formatDate } from '../../../utils/dateUtils';
import styles from './ParentHomework.module.css';

const ParentHomework = () => {
  const { data: children, isLoading: isChildrenLoading } = useParentChildren();
  const student = children?.[0];
  const { data: homeworks, isLoading: isHwLoading } = useParentChildHomework(student?.studentId);

  if (isChildrenLoading || isHwLoading) {
    return <div className={styles.loading}>Ödevler yükleniyor...</div>;
  }

  if (!student) {
    return <div className={styles.error}>Kayıtlı öğrenci bulunamadı.</div>;
  }

  const pendingHomeworks = homeworks?.filter(hw => hw.status === 'PENDING' || hw.status === 'OVERDUE') || [];
  const completedHomeworks = homeworks?.filter(hw => hw.status === 'DONE' || hw.status === 'LATE_DONE') || [];

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1 className={styles.title}>Ödev Takibi</h1>
        <p className={styles.subtitle}>{student.fullName} adlı öğrencinin tüm ödevleri</p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Bekleyen Görevler <span className={styles.badge}>{pendingHomeworks.length}</span>
        </h2>
        
        {pendingHomeworks.length === 0 ? (
          <div className={styles.emptyState}>Bekleyen ödev bulunmuyor.</div>
        ) : (
          <div className={styles.list}>
            {pendingHomeworks.map(hw => (
              <Card key={hw.id} className={styles.homeworkCard}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.hwTitle}>{hw.snapshotTitle}</h3>
                  <span className={`${styles.statusBadge} ${hw.status === 'OVERDUE' ? styles.overdue : ''}`}>
                    {hw.status === 'OVERDUE' ? 'Gecikmiş' : 'Bekliyor'}
                  </span>
                </div>
                <p className={styles.hwDesc}>{hw.snapshotDesc}</p>
                <div className={styles.progressHeader}>
                  <span>İlerleme Durumu: %{hw.completionPercentage || 0}</span>
                </div>
                <div className={styles.cardFooter}>
                  <div className={styles.dueDate}>
                    📅 Son Teslim: {formatDate(hw.dueDate, 'dd MMM yyyy, HH:mm')}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Tamamlananlar</h2>
        
        {completedHomeworks.length === 0 ? (
          <div className={styles.emptyState}>Henüz tamamlanmış ödev yok.</div>
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

export default ParentHomework;
