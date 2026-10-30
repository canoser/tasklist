import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  useStudentHomework, 
  useStudentExams, 
  useStudentCurriculum, 
  useStudentSessions 
} from '../studentApi';
import { BookOpen, Target, FlaskConical, BookMarked, StickyNote, HelpCircle } from 'lucide-react';
import StudyTimerCard from './StudyTimerCard';
import MoodCheckinCard from './MoodCheckinCard';
import StudentNotesCard from './StudentNotesCard';
import GoalStreakCard from './GoalStreakCard';
import StudentQuestionsCard from './StudentQuestionsCard';
import TodayAgendaCard from './components/TodayAgendaCard';
import CoachFeedbackCard from './components/CoachFeedbackCard';
import SegmentedTabs from '../../../components/common/SegmentedTabs/SegmentedTabs';
import styles from './StudentHome.module.css';

const StudentHome = () => {
  const navigate = useNavigate();
  const { data: homeworks, isLoading } = useStudentHomework();
  const { data: exams } = useStudentExams();
  const { data: curriculum } = useStudentCurriculum();
  const { data: sessions } = useStudentSessions();
  
  const [activeTabbedSection, setActiveTabbedSection] = useState('notes'); // 'notes' | 'questions'

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

  // Sekmeli Notlarım & Takıldığım Sorular
  const renderTabbedNotesAndQuestions = () => (
    <div className={styles.tabbedCard}>
      <div className={styles.tabCardHeader}>
        <SegmentedTabs
          tabs={[
            { id: 'notes', label: 'Kişisel Notlarım', icon: <StickyNote size={14} /> },
            { id: 'questions', label: 'Takıldıklarım & Sorular', icon: <HelpCircle size={14} /> },
          ]}
          activeTab={activeTabbedSection}
          onChange={setActiveTabbedSection}
          size="sm"
          fullWidth
        />
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

  // 4'lü Kompakt KPI Şeridi
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

      {/* 1. Üst Kısım: KPI ve OKR İlerleme Şeridi */}
      {renderCompactKpis()}
      <GoalStreakCard variant="strip" />

      {/* 2. Responsive Dashboard Izgarası */}
      <div className={styles.dashboardGrid}>
        <div className={styles.mainCol}>
          {/* F9: Bugün Ne Yapacağım? (Bugünkü dersler, öncelikli ödevler, koç görüşmesi, mikro rutinler) */}
          <TodayAgendaCard 
            upcomingSession={upcomingSession} 
            homeworks={homeworks || []} 
            onNavigateToHomework={() => navigate('/student/homework')} 
          />

          {/* F9: Koç & Öğretmen Geri Bildirimleri & Dosyalar */}
          <CoachFeedbackCard homeworks={homeworks || []} />
        </div>

        <div className={styles.sideCol}>
          {/* Çalışma Sayacı & Odaklanma */}
          <StudyTimerCard compact={true} />

          {/* Günlük Duygu Durumu Check-in */}
          <MoodCheckinCard compact={true} />

          {/* Notlarım & Sorularım Sekmeli Kart */}
          {renderTabbedNotesAndQuestions()}

          <div className={styles.motivationBanner}>
            <p>"Başarı, her gün tekrarlanan küçük çabaların toplamıdır."</p>
            <span>- Robert Collier</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentHome;
