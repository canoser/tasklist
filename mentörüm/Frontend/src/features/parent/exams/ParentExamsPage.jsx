import React, { useState } from 'react';
import { useParentChildren, useParentChildExams } from '../parentApi';
import ChildSelector from '../../../components/common/ChildSelector/ChildSelector';
import Card from '../../../components/common/Card/Card';
import { formatDate } from '../../../utils/dateUtils';
import styles from './ParentExamsPage.module.css';

const ParentExamsPage = () => {
  const { data: children, isLoading: isChildrenLoading } = useParentChildren();
  const [selectedChildId, setSelectedChildId] = useState(null);
  const student = children?.find((c) => c.studentId === selectedChildId) || children?.[0];
  const { data: exams, isLoading } = useParentChildExams(student?.studentId);

  if (isChildrenLoading) return <div className={styles.pageContainer}>Yükleniyor...</div>;
  if (!student) return <div className={styles.pageContainer}>Kayıtlı öğrenci bulunamadı.</div>;

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1 className={styles.title}>Sınav Sonuçları</h1>
        <p className={styles.subtitle}>{student.fullName} adlı öğrencinin sınavları</p>
      </header>

      <ChildSelector children={children} selectedId={student.studentId} onSelect={setSelectedChildId} />

      {isLoading ? (
        <p className={styles.emptyState}>Yükleniyor...</p>
      ) : exams?.length > 0 ? (
        <div className={styles.examList}>
          {exams.map((ex) => (
            <Card key={ex.id} className={styles.examCard} padding="md">
              <div className={styles.examHeader}>
                <strong className={styles.examName}>{ex.name}</strong>
                {ex.examType && <span className={styles.examType}>{ex.examType}</span>}
              </div>
              <div className={styles.examMeta}>
                <span>Tarih: {formatDate(ex.examDate, 'dd MMM yyyy')}</span>
                <span className={styles.examNet}>Net: {ex.totalNet}</span>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <p className={styles.emptyState}>Henüz sınav sonucu yok.</p>
      )}
    </div>
  );
};

export default ParentExamsPage;
