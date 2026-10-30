import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import Modal from '../../../components/common/Modal/Modal';
import SegmentedTabs from '../../../components/common/SegmentedTabs/SegmentedTabs';
import AssignHomeworkModal from '../homework/AssignHomeworkModal';
import styles from './CoachStudentDetail.module.css';
import {
  useStudent,
  useDeleteStudent,
  useCoachStudentNotes,
  useCoachStudentHomework,
  useCoachStudentCurriculum,
  useCoachStudentEvents,
  useCoachStudentSessions,
  useCreateCoachingSession,
  useCoachStudentTeacherNotes,
  useCoachStudentCoachingTools,
  useUpdateCoachingTools,
  useReplyStudentQuestion,
  useCoachStudentQuestions,
  useStudentCheckinsForCoach,
  useUpdateStudent,
  downloadStudentReportPdf,
} from '../coachApi';
import EditStudentModal from './EditStudentModal';
import { queryKeys } from '../../../api/queryKeys';
import WeeklyTimeBudgetCard from './WeeklyTimeBudgetCard';
import SwotAndWheelPanel from './components/SwotAndWheelPanel';
import GrowSessionsPanel from './components/GrowSessionsPanel';
import StudentPulsePanel from './components/StudentPulsePanel';
import ParentAccessPanel from './components/ParentAccessPanel';
import InfoTab from './components/InfoTab';
import ExamsTab from './components/ExamsTab';
import TopicsTab from './components/TopicsTab';
import HomeworkTab from './components/HomeworkTab';
import NotesTab from './components/NotesTab';
import { ArrowLeft, FileDown, Edit3, PlusCircle, Clock, BookOpen, MessageSquare, Users, Trash2 } from 'lucide-react';

const GROUP_TABS = [
  { id: 'general', defaultTab: 'info', icon: Clock, label: 'Genel & Zaman', pills: [
    { id: 'info', label: 'Öğrenci Bilgileri & Hedefler' },
    { id: 'timeBudget', label: 'Zaman Bütçesi' },
    { id: 'events', label: 'Takvim & Etkinlikler' },
  ]},
  { id: 'academic', defaultTab: 'homework', icon: BookOpen, label: 'Akademik Takip', pills: [
    { id: 'homework', label: 'Ödevler' },
    { id: 'exams', label: 'Sınavlar & Netler' },
    { id: 'topics', label: 'Konu Takibi' },
  ]},
  { id: 'sessions', defaultTab: 'grow', icon: MessageSquare, label: 'Görüşme & Notlar', pills: [
    { id: 'grow', label: 'GROW Seansları' },
    { id: 'swot', label: 'SWOT & Denge Çarkı' },
    { id: 'pulse', label: 'Öğrenci Nabzı & Sorular' },
    { id: 'notes', label: 'Koç Notları' },
    { id: 'teacherNotes', label: 'Öğretmen Görüşleri' },
  ]},
  { id: 'parents', defaultTab: 'parents', icon: Users, label: 'Veli Entegrasyonu', pills: [
    { id: 'parents', label: 'Veli Erişimi & Yetkiler' },
  ]},
];

const CoachStudentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: student, isLoading, isError } = useStudent(id);
  const deleteStudentMutation = useDeleteStudent();
  const updateStudentMutation = useUpdateStudent();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [isHomeworkModalOpen, setIsHomeworkModalOpen] = useState(false);
  const [selectedTopicForHw, setSelectedTopicForHw] = useState(null);

  const activeGroupObj = GROUP_TABS.find((g) => g.pills.some((p) => p.id === activeTab)) || GROUP_TABS[0];

  // Lazy sekme sorguları (Opus E3)
  const { data: notesList, isLoading: isNotesLoading } = useCoachStudentNotes(id, activeTab === 'notes');
  const { data: studentHomeworks } = useCoachStudentHomework(id, activeTab === 'info' || activeTab === 'homework');
  const { data: curriculum } = useCoachStudentCurriculum(id, activeTab === 'topics');
  const { data: studentEvents } = useCoachStudentEvents(id, activeTab === 'events');
  const { data: sessions } = useCoachStudentSessions(id, activeTab === 'grow');
  const { data: teacherNotes = [] } = useCoachStudentTeacherNotes(id, activeTab === 'teacherNotes');
  const { data: coachingTools } = useCoachStudentCoachingTools(id, activeTab === 'info' || activeTab === 'swot');
  const updateCoachingTools = useUpdateCoachingTools();
  const replyQuestion = useReplyStudentQuestion();
  const { data: questions = [] } = useCoachStudentQuestions(id, activeTab === 'info' || activeTab === 'pulse');
  const { data: checkins = [] } = useStudentCheckinsForCoach(id, activeTab === 'pulse');
  const createSession = useCreateCoachingSession(id);

  const parsedHabits = React.useMemo(() => {
    try {
      if (!coachingTools?.habitsData) return [];
      return typeof coachingTools.habitsData === 'string' ? JSON.parse(coachingTools.habitsData || '[]') : coachingTools.habitsData;
    } catch {
      return [];
    }
  }, [coachingTools?.habitsData]);

  if (isLoading) return <div className={styles.pageContainer}>Yükleniyor...</div>;
  if (isError || !student) return <div className={styles.pageContainer}>Öğrenci bulunamadı.</div>;

  const handleDownloadReport = async () => {
    try {
      await downloadStudentReportPdf(id, student?.fullName);
    } catch {
      alert('Rapor indirilemedi.');
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.topHeader}>
        <Button variant="ghost" onClick={() => navigate('/coach/students')}>
          <ArrowLeft size={16} /> <span>Öğrencilere Dön</span>
        </Button>
      </div>

      <header className={styles.header}>
        <div className={styles.profileMeta}>
          <div className={styles.avatar}>{student.fullName?.charAt(0) || '?'}</div>
          <div>
            <h1 className={styles.title}>{student.fullName}</h1>
            <p className={styles.subtitle}>{student.grade ? `${student.grade}. Sınıf` : ''} • {student.track || student.area}</p>
          </div>
        </div>
        <div className={styles.actions}>
          <Button variant="outline" onClick={handleDownloadReport}><FileDown size={15} /> <span>PDF Rapor</span></Button>
          <Button variant="secondary" onClick={() => setIsEditModalOpen(true)}><Edit3 size={15} /> <span>Düzenle</span></Button>
          <Button variant="primary" onClick={() => setIsHomeworkModalOpen(true)}><PlusCircle size={15} /> <span>Ödev Ata</span></Button>
          <Button variant="ghost" style={{ color: 'var(--color-danger, #ef4444)', borderColor: 'rgba(239, 68, 68, 0.3)' }} onClick={() => setShowDeleteConfirm(true)} title="Öğrenciyi Sil">
            <Trash2 size={15} /> <span>Sil</span>
          </Button>
        </div>
      </header>

      <div style={{ marginBottom: 10 }}>
        <SegmentedTabs
          activeTab={activeGroupObj.id}
          onChange={(groupId) => {
            const grp = GROUP_TABS.find((g) => g.id === groupId);
            if (grp) setActiveTab(grp.defaultTab);
          }}
          tabs={GROUP_TABS.map((g) => {
            const Icon = g.icon;
            return { id: g.id, label: g.label, icon: <Icon size={16} /> };
          })}
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <SegmentedTabs
          variant="pills"
          size="sm"
          activeTab={activeTab}
          onChange={setActiveTab}
          tabs={activeGroupObj.pills}
        />
      </div>

      <div className={styles.tabContent}>
        {activeTab === 'parents' && <ParentAccessPanel student={student} onInviteSuccess={() => queryClient.invalidateQueries({ queryKey: queryKeys.coach.student(id) })} />}
        {activeTab === 'info' && (
          <InfoTab
            studentId={id}
            student={student}
            parsedHabits={parsedHabits}
            studentHomeworks={studentHomeworks}
            questions={questions}
            onUpdateGoal={(patch) => updateStudentMutation.mutate({ studentId: id, data: patch })}
            onSaveHabits={(newHabits) => updateCoachingTools.mutate({ studentId: id, data: { habitsData: JSON.stringify(newHabits) } })}
          />
        )}
        {activeTab === 'timeBudget' && <WeeklyTimeBudgetCard studentId={id} />}
        {activeTab === 'notes' && <NotesTab studentId={id} notesList={notesList} isNotesLoading={isNotesLoading} />}
        {activeTab === 'teacherNotes' && (
          <Card title="Öğretmen Görüşleri & Değerlendirmeleri" className={styles.notesCard}>
            {teacherNotes.length > 0 ? teacherNotes.map((note) => (
              <div key={note.id} style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--color-primary)' }}>{note.courseName} · {note.teacherName}</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-color-muted)' }}>{note.createdAt ? new Date(note.createdAt).toLocaleDateString('tr-TR') : '-'}</span>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: '0.85rem', color: 'var(--text-color-main)', lineHeight: 1.5 }}>{note.note}</p>
              </div>
            )) : <p>Öğretmenler tarafından henüz görüş veya değerlendirme girilmemiş.</p>}
          </Card>
        )}
        {activeTab === 'exams' && <ExamsTab studentId={id} student={student} />}
        {activeTab === 'homework' && (
          <HomeworkTab
            exams={student?.examResults || []}
            studentHomeworks={studentHomeworks}
            onAssignFocusHomework={(subj) => { setSelectedTopicForHw({ subjectName: subj }); setIsHomeworkModalOpen(true); }}
          />
        )}
        {activeTab === 'topics' && (
          <TopicsTab
            curriculum={curriculum}
            onAssignTopicHomework={(topic) => { setSelectedTopicForHw(topic); setIsHomeworkModalOpen(true); }}
          />
        )}
        {activeTab === 'events' && (
          <Card title="Öğrencinin Kişisel Takvimi" className={styles.notesCard}>
            {studentEvents?.length > 0 ? studentEvents.map((ev) => (
              <div key={ev.id} style={{ padding: '6px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <span>{ev.title}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-color-muted)' }}>{ev.startAt ? new Date(ev.startAt).toLocaleString('tr-TR') : '-'} · {ev.eventType}</span>
              </div>
            )) : <p>Öğrenci henüz kişisel etkinlik eklememiş.</p>}
          </Card>
        )}
        {activeTab === 'grow' && (
          <GrowSessionsPanel
            sessions={sessions}
            onAddSession={(newSession) => {
              const g = newSession.growData || {};
              createSession.mutate({
                title: newSession.title,
                sessionDate: newSession.sessionDate ? new Date(newSession.sessionDate).toISOString() : null,
                notes: [g.goal, g.reality, g.options].filter(Boolean).join('\n\n'),
                actionItems: g.willAction || '',
                growData: JSON.stringify(g),
              });
            }}
          />
        )}
        {activeTab === 'swot' && (
          <SwotAndWheelPanel
            toolsData={coachingTools}
            autoSwot={coachingTools?.autoSwot}
            onSaveTools={(updatedData) => updateCoachingTools.mutate({ studentId: id, data: updatedData })}
          />
        )}
        {activeTab === 'pulse' && (
          <StudentPulsePanel
            checkins={checkins}
            questions={questions}
            onReplyQuestion={(questionId, coachAnswer) => replyQuestion.mutate({ studentId: id, questionId, reply: coachAnswer, status: 'RESOLVED' })}
          />
        )}
      </div>

      <AssignHomeworkModal
        isOpen={isHomeworkModalOpen}
        onClose={() => { setIsHomeworkModalOpen(false); setSelectedTopicForHw(null); }}
        selectedStudent={student}
        initialTopic={selectedTopicForHw}
      />

      <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Öğrenciyi Sil" maxWidth="440px">
        <p style={{ fontSize: '0.9rem', color: 'var(--text-color-main)', marginBottom: '16px', lineHeight: 1.5 }}>
          <strong>{student.fullName}</strong> adlı öğrenciyi sistemden silmek istediğinize emin misiniz? Öğrenci ve ilişkili tüm aktif kayıtları arşive alınacaktır.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Vazgeç</Button>
          <Button variant="danger" isLoading={deleteStudentMutation.isPending} onClick={async () => { await deleteStudentMutation.mutateAsync(id); setShowDeleteConfirm(false); navigate('/coach/students'); }}>
            Evet, Öğrenciyi Sil
          </Button>
        </div>
      </Modal>

      <EditStudentModal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        student={student}
        onSubmit={async (payload) => { await updateStudentMutation.mutateAsync({ studentId: id, data: payload }); }}
      />
    </div>
  );
};

export default CoachStudentDetail;
