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
                <span className={styles.examNet}>Toplam Net: {ex.totalNet ?? '-'}</span>
              </div>

              {ex.scores && ex.scores.length > 0 && (
                <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-color, #e2e8f0)', paddingTop: '10px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Ders & Konu Kırılımı
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                    {ex.scores.map((sc, idx) => (
                      <div
                        key={sc.id || idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          background: 'var(--bg-app, #f8fafc)',
                          fontSize: '0.82rem',
                        }}
                      >
                        <div>
                          <strong>{sc.subjectName || sc.subjectCode || 'Ders'}</strong>
                          {sc.topicName && (
                            <span style={{ color: 'var(--text-secondary)', marginLeft: '6px' }}>
                              · {sc.topicName}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {sc.correct != null || sc.wrong != null ? (
                            <span>
                              {sc.correct ?? 0}D {sc.wrong ?? 0}Y {sc.blank ?? 0}B
                              {sc.net != null && (
                                <strong style={{ marginLeft: '8px', color: 'var(--color-primary, #3b82f6)' }}>
                                  ({sc.net} Net)
                                </strong>
                              )}
                            </span>
                          ) : sc.score != null ? (
                            <strong style={{ color: 'var(--color-primary, #3b82f6)' }}>
                              {sc.score} / {sc.maxScore || 100} Puan
                            </strong>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
