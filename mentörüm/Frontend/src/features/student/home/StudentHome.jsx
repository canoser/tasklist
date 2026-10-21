import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudentHomework, useStudentExams, useStudentCurriculum, useStudentSessions, useUpdateSessionPrep, useStudentGoal, useStudentStreak } from '../studentApi';
import { useUIStore } from '../../../store/uiStore';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import { formatDate } from '../../../utils/dateUtils';
import { BookOpen, Target, FlaskConical, BookMarked, Edit3, MessageSquare, StickyNote, HelpCircle } from 'lucide-react';
import StudyTimerCard from './StudyTimerCard';
import MoodCheckinCard from './MoodCheckinCard';
import StudentNotesCard from './StudentNotesCard';
import GoalStreakCard from './GoalStreakCard';
import StudentQuestionsCard from './StudentQuestionsCard';
import styles from './StudentHome.module.css';

const getNextExamDate = () => {
  const now = new Date();
  let exam = new Date(now.getFullYear(), 5, 20);
  if (exam < now) exam = new Date(now.getFullYear() + 1, 5, 20);
  return exam;
};
const EXAM_DATE = getNextExamDate();

const StudentHome = () => {
  const navigate = useNavigate();
  const { studentHomeLayout } = useUIStore();
  const { data: homeworks, isLoading } = useStudentHomework();
  const { data: exams } = useStudentExams();
  const { data: curriculum } = useStudentCurriculum();
  const { data: sessions } = useStudentSessions();
  const { data: streak = { currentStreak: 0 } } = useStudentStreak();
  const updatePrep = useUpdateSessionPrep();
  
  const [prepNote, setPrepNote] = useState('');
  const [activeTabbedSection, setActiveTabbedSection] = useState('notes'); // 'notes' | 'questions'

  // Hesaplamalar
  const pendingHomeworks = homeworks?.filter(hw => hw.status === 'PENDING' || hw.status === 'OVERDUE') || [];
  const completedHomeworks = homeworks?.filter(hw => hw.status === 'DONE' || hw.status === 'LATE_DONE') || [];
  
  const totalHomeworks = homeworks?.length || 0;
  const completionRate = totalHomeworks > 0 ? Math.round((completedHomeworks.length / totalHomeworks) * 100) : 0;

  const lastExam = exams?.length ? exams[0] : null;
  const completedTopics = curriculum?.filter(t => t.isCompleted)?.length || 0;
  const totalTopics = curriculum?.length || 0;

  const daysLeft = Math.max(0, Math.ceil((EXAM_DATE - new Date()) / (1000 * 60 * 60 * 24)));

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

  // Ortak: Yaklaşan Ödevler Bileşeni
  const renderUpcomingHomeworks = () => (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          <Edit3 size={16} /> Yaklaşan Ödevler
        </h2>
        <Button variant="ghost" size="sm" onClick={() => navigate('/student/homework')}>
          Tümünü Gör ({pendingHomeworks.length})
        </Button>
      </div>
      
      <div className={styles.homeworkList}>
        {isLoading ? (
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Ödevler yükleniyor...</p>
        ) : upcomingHomeworks.length > 0 ? (
          upcomingHomeworks.map((hw) => (
            <div key={hw.id} className={styles.homeworkCard}>
              <div className={styles.hwInfo}>
                <div className={styles.hwIcon}><Edit3 size={16} /></div>
                <div>
                  <h3 className={styles.hwTitle}>{hw.snapshotTitle}</h3>
                  <p className={styles.hwDate}>Son Teslim: {formatDate(hw.dueDate, 'dd MMM')}</p>
                </div>
              </div>
              <Button size="sm" variant="secondary" onClick={() => navigate('/student/homework')}>İncele</Button>
            </div>
          ))
        ) : (
          <div style={{ padding: '10px 12px', background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
            Şu anda bekleyen veya yaklaşan bir ödevin yok!
          </div>
        )}
      </div>
    </section>
  );

  // Ortak: Sekmeli Notlarım & Takıldığım Sorular
  const renderTabbedNotesAndQuestions = () => (
    <div className={styles.tabbedCard}>
      <div className={styles.tabCardHeader}>
        <button
          type="button"
          className={`${styles.tabPillBtn} ${activeTabbedSection === 'notes' ? styles.active : ''}`}
          onClick={() => setActiveTabbedSection('notes')}
        >
          <StickyNote size={14} /> Kişisel Notlarım
        </button>
        <button
          type="button"
          className={`${styles.tabPillBtn} ${activeTabbedSection === 'questions' ? styles.active : ''}`}
          onClick={() => setActiveTabbedSection('questions')}
        >
          <HelpCircle size={14} /> Takıldıklarım & Sorular
        </button>
      </div>

      <div>
        {activeTabbedSection === 'notes' ? (
          <StudentNotesCard />
        ) : (
          <StudentQuestionsCard />
        )}
      </div>
    </div>
  );

  // Ortak: Görüşme Hazırlığı (T07: Boşsa tamamen gizlenir)
  const renderUpcomingSession = () => {
    if (!upcomingSession) return null;
    return (
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <MessageSquare size={16} /> Koç Görüşmesi Hazırlığı
          </h2>
        </div>
        <Card className={styles.homeworkCard} padding="sm">
          <h3 style={{ margin: '0 0 4px', fontSize: '0.9rem' }}>{upcomingSession.title}</h3>
          {upcomingSession.sessionDate && (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 6px' }}>
              {new Date(upcomingSession.sessionDate).toLocaleString('tr-TR')}
            </p>
          )}
          {upcomingSession.actionItems && (
            <p style={{ fontSize: '0.78rem', color: '#b45309', margin: '0 0 6px' }}>{upcomingSession.actionItems}</p>
          )}
          <textarea
            value={prepNote}
            onChange={(e) => setPrepNote(e.target.value)}
            rows={2}
            placeholder="Görüşme öncesi koçuna iletmek istediğin notlar..."
            style={{ width: '100%', padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
          />
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center' }}>
            <Button size="sm" variant="primary" onClick={() => updatePrep.mutate({ sessionId: upcomingSession.id, prepNotes: prepNote })}>
              {updatePrep.isPending ? 'Kaydediliyor...' : 'Notu Kaydet'}
            </Button>
            {updatePrep.isSuccess && <span style={{ marginLeft: 8, color: '#16a34a', fontSize: '0.78rem' }}>✓ Kaydedildi</span>}
          </div>
        </Card>
      </section>
    );
  };

  // Ortak: 4'lü Kompakt KPI Izgarası
  const renderCompactKpis = () => (
    <div className={styles.compactKpiGrid}>
      <div className={styles.compactKpiItem}>
        <div className={styles.kpiMiniIcon} style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' }}>
          <BookOpen size={17} />
        </div>
        <div className={styles.kpiTextCol}>
          <span className={styles.kpiVal}>{isLoading ? '...' : pendingHomeworks.length}</span>
          <span className={styles.kpiLbl}>Bekleyen Ödev</span>
        </div>
      </div>

      <div className={styles.compactKpiItem}>
        <div className={styles.kpiMiniIcon} style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>
          <Target size={17} />
        </div>
        <div className={styles.kpiTextCol}>
          <span className={styles.kpiVal}>{isLoading ? '...' : `%${completionRate}`}</span>
          <span className={styles.kpiLbl}>Tamamlama</span>
        </div>
      </div>

      <div className={styles.compactKpiItem}>
        <div className={styles.kpiMiniIcon} style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
          <FlaskConical size={17} />
        </div>
        <div className={styles.kpiTextCol}>
          <span className={styles.kpiVal}>{lastExam?.totalNet ?? '—'}</span>
          <span className={styles.kpiLbl}>Son Net</span>
        </div>
      </div>

      <div className={styles.compactKpiItem}>
        <div className={styles.kpiMiniIcon} style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
          <BookMarked size={17} />
        </div>
        <div className={styles.kpiTextCol}>
          <span className={styles.kpiVal}>{`${completedTopics}/${totalTopics}`}</span>
          <span className={styles.kpiLbl}>Biten Konu</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>İyi çalışmalar!</h1>
          <p className={styles.subtitle}>Bugün hedeflerine bir adım daha yaklaşmak için harika bir gün.</p>
        </div>
      </header>

      {/* =========================================================
          RESPONSIVE DASHBOARD (Mobil Tek Sütun, Tablet/PC 2 Kolon)
          studentHomeLayout ('compact' | 'widget') tercihine duyarlıdır
          ========================================================= */}
      <div className={styles.dashboardGrid}>
        {studentHomeLayout === 'widget' ? (
          <>
            {/* Görev & Ödev Öncelikli Düzen (Widget / Bento) */}
            <div className={styles.mainCol}>
              {renderUpcomingHomeworks()}
              {renderCompactKpis()}
              <MoodCheckinCard compact={true} />
              {renderUpcomingSession()}
            </div>

            <div className={styles.sideCol}>
              <GoalStreakCard variant="strip" />
              <StudyTimerCard compact={true} />
              {renderTabbedNotesAndQuestions()}
              <div className={styles.motivationBanner}>
                <p>"Başarı, her gün tekrarlanan küçük çabaların toplamıdır."</p>
                <span>- Robert Collier</span>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Odak & Çalışma Öncelikli Düzen (Kompakt / Standart) */}
            <div className={styles.mainCol}>
              <StudyTimerCard compact={true} />
              <MoodCheckinCard compact={true} />
              {renderTabbedNotesAndQuestions()}
            </div>

            <div className={styles.sideCol}>
              <GoalStreakCard variant="strip" />
              {renderCompactKpis()}
              {renderUpcomingHomeworks()}
              {renderUpcomingSession()}
              <div className={styles.motivationBanner}>
                <p>"Başarı, her gün tekrarlanan küçük çabaların toplamıdır."</p>
                <span>- Robert Collier</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StudentHome;
