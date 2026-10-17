import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudentHomework, useStudentExams, useStudentCurriculum, useStudentSessions, useUpdateSessionPrep } from '../studentApi';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import { formatDate } from '../../../utils/dateUtils';
import StudyTimerCard from './StudyTimerCard';
import styles from './StudentHome.module.css';

const StudentHome = () => {
  const navigate = useNavigate();
  const { data: homeworks, isLoading } = useStudentHomework();
  const { data: exams } = useStudentExams();
  const { data: curriculum } = useStudentCurriculum();
  const { data: sessions } = useStudentSessions();
  const updatePrep = useUpdateSessionPrep();
  const [prepNote, setPrepNote] = useState('');

  // Hesaplamalar
  const pendingHomeworks = homeworks?.filter(hw => hw.status === 'PENDING' || hw.status === 'OVERDUE') || [];
  const completedHomeworks = homeworks?.filter(hw => hw.status === 'DONE' || hw.status === 'LATE_DONE') || [];
  
  const totalHomeworks = homeworks?.length || 0;
  const completionRate = totalHomeworks > 0 ? Math.round((completedHomeworks.length / totalHomeworks) * 100) : 0;

  const lastExam = exams?.length ? exams[0] : null;
  const completedTopics = curriculum?.filter(t => t.isCompleted)?.length || 0;
  const totalTopics = curriculum?.length || 0;

  const upcomingSession = (sessions || [])
    .filter((s) => s.sessionDate && new Date(s.sessionDate) >= new Date())
    .sort((a, b) => new Date(a.sessionDate) - new Date(b.sessionDate))[0];

  useEffect(() => {
    setPrepNote(upcomingSession?.prepNotes || '');
  }, [upcomingSession?.id]);
  
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

        <Card className={styles.statCard} padding="lg">
          <div className={styles.statIcon} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>🧪</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{lastExam?.totalNet ?? '-'}</span>
            <span className={styles.statLabel}>Son Deneme Neti</span>
          </div>
        </Card>

        <Card className={styles.statCard} padding="lg">
          <div className={styles.statIcon} style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>📖</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{`${completedTopics}/${totalTopics}`}</span>
            <span className={styles.statLabel}>Tamamlanan Konu</span>
          </div>
        </Card>
      </div>

      {/* Kronometre ve Quick-Log (T40 & T52) */}
      <StudyTimerCard />

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

      {/* Görüşme Hazırlığı (M-157) */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Görüşme Hazırlığı</h2>
        </div>
        {upcomingSession ? (
          <Card className={styles.homeworkCard}>
            <h3 style={{ margin: '0 0 4px' }}>{upcomingSession.title}</h3>
            {upcomingSession.sessionDate && (
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 8px' }}>
                {new Date(upcomingSession.sessionDate).toLocaleString('tr-TR')}
              </p>
            )}
            {upcomingSession.actionItems && (
              <p style={{ fontSize: '0.85rem', color: '#b45309', margin: '0 0 8px' }}>📌 {upcomingSession.actionItems}</p>
            )}
            <textarea
              value={prepNote}
              onChange={(e) => setPrepNote(e.target.value)}
              rows={3}
              placeholder="Görüşme öncesi öz-değerlendirme notun (neler zorladı, hedefin ne durumda)..."
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.9rem' }}
            />
            <div style={{ marginTop: 8 }}>
              <Button size="sm" variant="primary" onClick={() => updatePrep.mutate({ sessionId: upcomingSession.id, prepNotes: prepNote })}>
                {updatePrep.isPending ? 'Kaydediliyor...' : 'Hazırlık Notunu Kaydet'}
              </Button>
              {updatePrep.isSuccess && <span style={{ marginLeft: 10, color: '#16a34a', fontSize: '0.85rem' }}>✓ Kaydedildi</span>}
            </div>
          </Card>
        ) : (
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Yaklaşan görüşme bulunmuyor.</p>
        )}
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
