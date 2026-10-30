import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useParentChildren, useParentChildHomework, useParentStudyStats, useParentTeacherNotes } from '../parentApi';
import Card from '../../../components/common/Card/Card';
import ChildSelector from '../../../components/common/ChildSelector/ChildSelector';
import { formatDate } from '../../../utils/dateUtils';
import { BookOpen, Target, Clock, HelpCircle, MessageSquare } from 'lucide-react';
import styles from './ParentSummary.module.css';

const ParentSummary = () => {
  const navigate = useNavigate();
  const { data: children, isLoading: isChildrenLoading } = useParentChildren();
  const [selectedChildId, setSelectedChildId] = useState(null);

  const student = children?.find((c) => c.studentId === selectedChildId) || children?.[0];
  
  const canViewHomework = student?.canViewHomework === 1;
  const canViewExams = student?.canViewExams === 1;
  const canViewStudyStats = student?.canViewStudyStats === 1;

  const { data: homeworks, isLoading: isHwLoading } = useParentChildHomework(canViewHomework ? student?.studentId : null);
  const { data: studyStats } = useParentStudyStats(canViewStudyStats ? student?.studentId : null);
  const { data: teacherNotes = [] } = useParentTeacherNotes(student?.studentId);

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
        <ChildSelector children={children} selectedId={student.studentId} onSelect={setSelectedChildId} />
      </header>

      {/* KPI Kartları */}
      <div className={styles.statsGrid}>
        {canViewHomework ? (
          <>
            <Card className={styles.statCard} padding="lg">
              <div className={styles.statIcon} style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
                <BookOpen size={20} />
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statValue}>{isHwLoading ? '...' : pendingHomeworks.length}</span>
                <span className={styles.statLabel}>Bekleyen Ödev</span>
              </div>
            </Card>
            
            <Card className={styles.statCard} padding="lg">
              <div className={styles.statIcon} style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
                <Target size={20} />
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statValue}>{isHwLoading ? '...' : `%${completionRate}`}</span>
                <span className={styles.statLabel}>Tamamlama Oranı</span>
              </div>
            </Card>
          </>
        ) : (
          <Card className={styles.statCard} padding="lg" style={{ opacity: 0.7 }}>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>Ödev Takibi</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-color-muted)' }}>Koç tarafından yetkilendirilmemiş</span>
            </div>
          </Card>
        )}

        {canViewStudyStats && studyStats && (
          <>
            <Card className={styles.statCard} padding="lg">
              <div className={styles.statIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                <Clock size={20} />
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statValue}>{studyStats.totalMinutes ?? studyStats.thisWeekStudyMinutes ?? 0} dk</span>
                <span className={styles.statLabel}>Haftalık Çalışma</span>
              </div>
            </Card>
            <Card className={styles.statCard} padding="lg">
              <div className={styles.statIcon} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                <HelpCircle size={20} />
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statValue}>{studyStats.totalQuestions ?? studyStats.thisWeekQuestionCount ?? 0}</span>
                <span className={styles.statLabel}>Çözülen Soru</span>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Sınav Sonuçları Kartı (İzin Kontrollü) */}
      {canViewExams ? (
        <Card className={styles.examEntryCard} padding="lg" interactive onClick={() => navigate('/parent/exams')}>
          <div className={styles.examEntryIcon}>📝</div>
          <div className={styles.examEntryInfo}>
            <span className={styles.examEntryTitle}>Sınav Sonuçları</span>
            <span className={styles.examEntryDesc}>Çocuğunuzun sınavlarını ve deneme netlerini görüntüleyin</span>
          </div>
          <span className={styles.examEntryArrow}>→</span>
        </Card>
      ) : (
        <Card padding="md" style={{ background: 'var(--bg-app)', border: '1px solid var(--border-color)', color: 'var(--text-color-muted)', fontSize: '0.85rem' }}>
          🔒 Sınav sonuçları görünümü koç tarafından kısıtlanmıştır.
        </Card>
      )}

      {/* Öğretmen Görüşleri & Değerlendirmeleri */}
      {teacherNotes && teacherNotes.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <MessageSquare size={16} /> Öğretmen Değerlendirmeleri
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {teacherNotes.slice(0, 3).map((tn) => (
              <Card key={tn.id} padding="sm">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--color-primary)' }}>
                    {[tn.courseName, tn.teacherName].filter(Boolean).join(' · ') || 'Öğretmen Değerlendirmesi'}
                  </strong>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-color-muted)' }}>
                    {tn.createdAt ? formatDate(tn.createdAt, 'dd MMM yyyy') : ''}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-color-main)', lineHeight: 1.4 }}>
                  {tn.summary || tn.note || tn.content}
                </p>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Son Tamamlanan Ödevler (İzin Kontrollü) */}
      {canViewHomework && (
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
      )}
    </div>
  );
};

export default ParentSummary;
