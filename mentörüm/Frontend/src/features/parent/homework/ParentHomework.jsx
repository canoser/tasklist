import React, { useState } from 'react';
import { useParentChildren, useParentChildHomework } from '../parentApi';
import Card from '../../../components/common/Card/Card';
import { formatDate } from '../../../utils/dateUtils';
import { PriorityBadge, AssignedViaBadge } from '../../../components/common/HomeworkStatusBadges';
import HomeworkAttachmentList from '../../../components/common/HomeworkAttachmentList';
import { Check, AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import styles from './ParentHomework.module.css';

const ParentHomework = () => {
  const { data: children, isLoading: isChildrenLoading } = useParentChildren();
  const [selectedChildId, setSelectedChildId] = useState(null);
  const student = children?.find((c) => c.studentId === selectedChildId) || children?.[0];
  
  const canViewHomework = student?.canViewHomework === 1;
  const { data: homeworks, isLoading: isHwLoading } = useParentChildHomework(canViewHomework ? student?.studentId : null);

  if (isChildrenLoading || (canViewHomework && isHwLoading)) {
    return <div className={styles.loading}>Ödevler yükleniyor...</div>;
  }

  if (!student) {
    return <div className={styles.error}>Kayıtlı öğrenci bulunamadı.</div>;
  }

  if (!canViewHomework) {
    return (
      <div className={styles.pageContainer}>
        <header className={styles.header}>
          <h1 className={styles.title}>Ödev Takibi</h1>
          <p className={styles.subtitle}>{student.fullName} adlı öğrencinin tüm ödevleri</p>
        </header>
        <Card padding="lg" style={{ textAlign: 'center', color: 'var(--text-color-muted)', marginTop: '20px' }}>
          <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', marginBottom: '10px' }}>
            <Lock size={24} />
          </div>
          <h3 style={{ margin: '0 0 6px', color: 'var(--text-color-main)' }}>Erişim Kısıtlı</h3>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>Bu öğrencinin ödevlerini görüntüleme izni koç tarafından sınırlandırılmıştır.</p>
        </Card>
      </div>
    );
  }

  const pendingHomeworks = homeworks?.filter(hw => hw.status === 'PENDING' || hw.status === 'OVERDUE') || [];
  const completedHomeworks = homeworks?.filter(hw => hw.status === 'DONE' || hw.status === 'LATE_DONE') || [];

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1 className={styles.title}>Ödev Takibi</h1>
        <p className={styles.subtitle}>{student.fullName} adlı öğrencinin tüm ödevleri</p>
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
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      {hw.courseName && (
                        <span className={styles.subjectBadge}>{hw.courseName}</span>
                      )}
                      {(hw.subjectName || hw.topicName) && (
                        <span className={styles.subjectBadge}>
                          {hw.subjectName}{hw.topicName ? ` · ${hw.topicName}` : ''}
                        </span>
                      )}
                      <PriorityBadge priority={hw.priority} />
                      <AssignedViaBadge assignedVia={hw.assignedVia} />
                    </div>
                    <h3 className={styles.hwTitle}>{hw.snapshotTitle}</h3>
                  </div>
                  <span className={`${styles.statusBadge} ${hw.status === 'OVERDUE' ? styles.overdue : ''}`}>
                    {hw.status === 'OVERDUE' ? 'Gecikmiş' : 'Bekliyor'}
                  </span>
                </div>
                
                <p className={styles.hwDesc}>{hw.snapshotDesc}</p>

                {/* Öğretmen İnceleme Durumu & Notu */}
                {hw.teacherStatus && (
                  <div style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    marginBottom: '8px',
                    backgroundColor: hw.teacherStatus === 'REVISE_REQUESTED' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                    border: `1px solid ${hw.teacherStatus === 'REVISE_REQUESTED' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
                    color: hw.teacherStatus === 'REVISE_REQUESTED' ? '#b91c1c' : '#065f46'
                  }}>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {hw.teacherStatus === 'REVISE_REQUESTED' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
                      <span>{hw.teacherStatus === 'REVISE_REQUESTED' ? 'Öğretmen İncelemesi: Düzeltme İstendi' : 'Öğretmen İncelemesi: Onaylandı'}</span>
                    </div>
                    {hw.teacherReviewNote && (
                      <div style={{ marginTop: '4px', fontSize: '0.78rem', color: 'var(--text-color-main)' }}>
                        {hw.teacherReviewNote}
                      </div>
                    )}
                  </div>
                )}

                {/* Ekli Ödev Dosyaları */}
                <HomeworkAttachmentList attachments={hw.attachments} showLabel={false} />

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
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      {hw.courseName && (
                        <span className={styles.subjectBadge}>{hw.courseName}</span>
                      )}
                      {(hw.subjectName || hw.topicName) && (
                        <span className={styles.subjectBadge}>
                          {hw.subjectName}{hw.topicName ? ` · ${hw.topicName}` : ''}
                        </span>
                      )}
                      <PriorityBadge priority={hw.priority} />
                      <AssignedViaBadge assignedVia={hw.assignedVia} />
                    </div>
                    <h3 className={styles.hwTitleCompleted}>{hw.snapshotTitle}</h3>
                  </div>
                  <span className={styles.statusBadgeDone} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <Check size={13} /> Tamamlandı
                  </span>
                </div>
                <div className={styles.dueDate}>
                  Teslim: {formatDate(hw.completedAt, 'dd MMM yyyy')}
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
