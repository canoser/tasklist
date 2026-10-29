import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import Modal from '../../../components/common/Modal/Modal';
import AssignHomeworkModal from '../homework/AssignHomeworkModal';
import styles from './CoachStudentDetail.module.css';
import { 
  useStudent, 
  useDeleteStudent,
  useStudentNotes, 
  useUpdateCoachNotes, 
  useAddExamResult, 
  useSendInvite, 
  useCoachStudentHomework, 
  useCoachStudentCurriculum, 
  useCoachStudentEvents, 
  useCoachStudentSessions, 
  useCreateCoachingSession, 
  useStudentTeacherNotes,
  useSubjects,
  useTopics,
  useStudentCoachingTools,
  useUpdateCoachingTools,
  useReplyStudentQuestion,
  useStudentQuestionsForCoach,
  useStudentCheckinsForCoach
} from '../coachApi';
import { useGroups } from '../coachSchoolApi';
import { useMoveToGroup, useMoveToIndividual, useUpdateStudent } from '../studentFlexibilityApi';
import EditStudentModal from './EditStudentModal';
import { apiClient } from '../../../api/apiClient';
import InviteSharePanel from '../../../components/common/InviteSharePanel/InviteSharePanel';
import ParentPermissionsPanel from './ParentPermissionsPanel';
import WeeklyTimeBudgetCard from './WeeklyTimeBudgetCard';
import OkrGoalTreeCard from './components/OkrGoalTreeCard';
import HabitTrackerCard from './components/HabitTrackerCard';
import SwotAndWheelPanel from './components/SwotAndWheelPanel';
import ParetoFocusBanner from './components/ParetoFocusBanner';
import EisenhowerMatrixCard from './components/EisenhowerMatrixCard';
import GrowSessionsPanel from './components/GrowSessionsPanel';
import StudentPulsePanel from './components/StudentPulsePanel';
import ParentAccessPanel from './components/ParentAccessPanel';
import { PriorityBadge, AssignedViaBadge, HomeworkStatusBadge } from '../../../components/common/HomeworkStatusBadges';
import { 
  CheckCircle2, 
  Square, 
  ArrowLeft, 
  FileDown, 
  Edit3, 
  PlusCircle, 
  Clock, 
  BookOpen, 
  MessageSquare, 
  Users, 
  GraduationCap, 
  ShieldAlert,
  Trash2,
  Plus
} from 'lucide-react';

const ExamScoreRow = ({ row, index, grade, subjects, examType, studentTrack, onChange, onRemove }) => {
  const { data: topics = [] } = useTopics(row.subjectId, grade ? String(grade) : undefined);

  const calculateRowNet = (correct, wrong) => {
    if (examType === 'Okul' || examType === 'Diğer') return correct != null ? Number(correct) : null;
    const divisor = (examType === 'LGS' || studentTrack === 'ORTAOKUL') ? 3 : 4;
    if (correct == null && wrong == null) return null;
    const c = Number(correct || 0);
    const w = Number(wrong || 0);
    return Math.round((c - w / divisor) * 100) / 100;
  };

  const isOkul = examType === 'Okul' || examType === 'Diğer';
  const currentNet = calculateRowNet(row.correct, row.wrong);
  const sumMismatch = row.questionCount !== '' && row.questionCount != null && 
    (Number(row.correct || 0) + Number(row.wrong || 0) + Number(row.blank || 0) !== Number(row.questionCount));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 2, minWidth: '130px' }}>
          <select 
            style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            value={row.subjectId || ''}
            onChange={(e) => onChange(index, { subjectId: e.target.value, curriculumTopicId: '' })}
          >
            <option value="">-- Ders Seçin --</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div style={{ flex: 2, minWidth: '150px' }}>
          <select 
            style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            value={row.curriculumTopicId || ''}
            disabled={!row.subjectId}
            onChange={(e) => onChange(index, { curriculumTopicId: e.target.value })}
          >
            <option value="">-- Konu (Opsiyonel) --</option>
            {topics.map(t => <option key={t.id} value={t.id}>{t.unitName ? `[${t.unitName}] ` : ''}{t.topicName}</option>)}
          </select>
        </div>
        <button 
          type="button" 
          onClick={() => onRemove(index)} 
          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}
          title="Satırı Kaldır"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {isOkul ? (
          <>
            <div style={{ width: '90px' }}>
              <Input 
                placeholder="Puan" 
                type="number" 
                value={row.score || ''} 
                onChange={(e) => onChange(index, { score: e.target.value })} 
              />
            </div>
            <div style={{ width: '90px' }}>
              <Input 
                placeholder="Maks" 
                type="number" 
                value={row.maxScore || ''} 
                onChange={(e) => onChange(index, { maxScore: e.target.value })} 
              />
            </div>
          </>
        ) : (
          <>
            <div style={{ width: '75px' }}>
              <Input 
                placeholder="Soru" 
                type="number" 
                value={row.questionCount || ''} 
                onChange={(e) => onChange(index, { questionCount: e.target.value })} 
              />
            </div>
            <div style={{ width: '70px' }}>
              <Input 
                placeholder="D" 
                type="number" 
                value={row.correct || ''} 
                onChange={(e) => onChange(index, { correct: e.target.value })} 
              />
            </div>
            <div style={{ width: '70px' }}>
              <Input 
                placeholder="Y" 
                type="number" 
                value={row.wrong || ''} 
                onChange={(e) => onChange(index, { wrong: e.target.value })} 
              />
            </div>
            <div style={{ width: '70px' }}>
              <Input 
                placeholder="B" 
                type="number" 
                value={row.blank || ''} 
                onChange={(e) => onChange(index, { blank: e.target.value })} 
              />
            </div>
            <div style={{ marginLeft: 'auto', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary)' }}>
              Net: {currentNet != null ? currentNet : '-'}
            </div>
          </>
        )}
      </div>
      {sumMismatch && (
        <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>
          ⚠ Doğru ({row.correct || 0}) + Yanlış ({row.wrong || 0}) + Boş ({row.blank || 0}) ≠ Soru Sayısı ({row.questionCount})
        </span>
      )}
    </div>
  );
};

const CoachStudentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // 1. Önce öğrenci verisini çek (TDZ hatasını önler)
  const { data: student, isLoading, isError } = useStudent(id);
  const deleteStudentMutation = useDeleteStudent();
  const updateStudentMutation = useUpdateStudent();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState('info');
  const [isHomeworkModalOpen, setIsHomeworkModalOpen] = useState(false);
  const [selectedTopicForHw, setSelectedTopicForHw] = useState(null);
  const [localNotes, setLocalNotes] = useState('');
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionActions, setSessionActions] = useState('');

  // Sınav Giriş Durumları (F1)
  const [examEntryMode, setExamEntryMode] = useState('quick'); // 'quick' | 'detailed'
  const [examType, setExamType] = useState('Deneme');
  const [examName, setExamName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [quickTotalNet, setQuickTotalNet] = useState('');
  const [detailedRows, setDetailedRows] = useState([]);

  // Konu Takibi Filtreleri (F6)
  const [topicSubjectFilter, setTopicSubjectFilter] = useState('ALL');
  const [topicStatusFilter, setTopicStatusFilter] = useState('ALL');

  // 2. Öğrenciye bağımlı kancalar
  const moveToGroup = useMoveToGroup(student?.programId);
  const moveToIndividual = useMoveToIndividual(student?.programId);
  const { data: groups = [] } = useGroups(student?.programId);
  const [selectedGroupId, setSelectedGroupId] = useState('');

  const defaultLevel = student?.grade ? String(student.grade) : (student?.track === 'ORTAOKUL' ? '8' : '12');
  const { data: subjects = [] } = useSubjects(defaultLevel);

  const getGroupForTab = (tab) => {
    if (['info', 'timeBudget', 'events'].includes(tab)) return 'general';
    if (['homework', 'exams', 'topics'].includes(tab)) return 'academic';
    if (['grow', 'swot', 'pulse', 'sessions', 'notes', 'teacherNotes'].includes(tab)) return 'sessions';
    return 'parents';
  };

  const activeGroup = getGroupForTab(activeTab);

  const handleSelectGroup = (groupId) => {
    if (groupId === 'general') setActiveTab('info');
    else if (groupId === 'academic') setActiveTab('homework');
    else if (groupId === 'sessions') setActiveTab('grow');
    else if (groupId === 'parents') setActiveTab('parents');
  };

  const { data: notesList, isLoading: isNotesLoading } = useStudentNotes(id);
  const { data: studentHomeworks } = useCoachStudentHomework(id);
  const { data: curriculum } = useCoachStudentCurriculum(id);
  const { data: studentEvents } = useCoachStudentEvents(id);
  const { data: sessions } = useCoachStudentSessions(id);
  const { data: teacherNotes = [] } = useStudentTeacherNotes(id);
  const { data: coachingTools } = useStudentCoachingTools(id);
  const updateCoachingTools = useUpdateCoachingTools();
  const replyQuestion = useReplyStudentQuestion();
  const { data: questions = [] } = useStudentQuestionsForCoach(id);
  const { data: checkins = [] } = useStudentCheckinsForCoach(id);

  const parsedHabits = React.useMemo(() => {
    try {
      if (!coachingTools?.habitsData) return [];
      return typeof coachingTools.habitsData === 'string'
        ? JSON.parse(coachingTools.habitsData || '[]')
        : coachingTools.habitsData;
    } catch {
      return [];
    }
  }, [coachingTools?.habitsData]);

  const parsedGrowSessions = React.useMemo(() => {
    try {
      if (!coachingTools?.growSessionsData) return [];
      return typeof coachingTools.growSessionsData === 'string'
        ? JSON.parse(coachingTools.growSessionsData || '[]')
        : coachingTools.growSessionsData;
    } catch {
      return [];
    }
  }, [coachingTools?.growSessionsData]);

  const createSession = useCreateCoachingSession(id);
  const updateNotesMutation = useUpdateCoachNotes();
  const addExamMutation = useAddExamResult();
  const sendInviteMutation = useSendInvite();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteResult, setInviteResult] = useState(null);
  const [inviteSendEmail, setInviteSendEmail] = useState(false);

  if (isLoading) return <div className={styles.pageContainer}>Yükleniyor...</div>;
  if (isError || !student) return <div className={styles.pageContainer}>Öğrenci bulunamadı.</div>;

  const handleSaveNotes = () => {
    if (!localNotes.trim()) return;
    updateNotesMutation.mutate({ studentId: id, notes: localNotes }, {
      onSuccess: () => {
        setLocalNotes('');
      }
    });
  };

  const handleCreateSession = () => {
    if (!sessionTitle.trim()) { alert('Görüşme başlığı gereklidir.'); return; }
    createSession.mutate({
      title: sessionTitle.trim(),
      sessionDate: sessionDate ? new Date(sessionDate).toISOString() : null,
      notes: sessionNotes || null,
      actionItems: sessionActions || null,
    }, {
      onSuccess: () => {
        setSessionTitle(''); setSessionDate(''); setSessionNotes(''); setSessionActions('');
      },
    });
  };

  const handleDownloadReport = async () => {
    try {
      const blob = await apiClient.get(`/students/${id}/report.pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `veli-rapor-${student?.fullName?.split(' ')[0] || 'ogrenci'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Rapor indirilemedi.');
    }
  };

  const addDetailedRow = () => {
    setDetailedRows(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        subjectId: subjects[0]?.id || '',
        curriculumTopicId: '',
        questionCount: '',
        correct: '',
        wrong: '',
        blank: '',
        score: '',
        maxScore: ''
      }
    ]);
  };

  const updateDetailedRow = (idx, patch) => {
    setDetailedRows(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  const removeDetailedRow = (idx) => {
    setDetailedRows(prev => prev.filter((_, i) => i !== idx));
  };

  const computeDetailedTotalNet = () => {
    if (examType === 'Okul' || examType === 'Diğer') return null;
    const divisor = (examType === 'LGS' || student?.track === 'ORTAOKUL') ? 3 : 4;
    let total = 0;
    let hasValid = false;
    for (const r of detailedRows) {
      if (r.correct != null && r.correct !== '') {
        const c = Number(r.correct || 0);
        const w = Number(r.wrong || 0);
        total += (c - w / divisor);
        hasValid = true;
      }
    }
    return hasValid ? Math.round(total * 100) / 100 : 0;
  };

  const handleSaveExam = () => {
    if (!examName.trim()) {
      alert('Lütfen sınav adını girin.');
      return;
    }

    if (examEntryMode === 'quick') {
      const netVal = parseFloat(quickTotalNet);
      if (isNaN(netVal) && examType !== 'Okul') {
        alert('Lütfen geçerli bir toplam net girin.');
        return;
      }
      addExamMutation.mutate({
        studentId: id,
        examData: {
          examName: examName.trim(),
          examDate: examDate || new Date().toISOString().split('T')[0],
          examType,
          totalNet: isNaN(netVal) ? 0 : netVal,
          scores: [],
        }
      }, {
        onSuccess: () => {
          setExamName('');
          setExamDate('');
          setQuickTotalNet('');
        }
      });
    } else {
      if (detailedRows.length === 0) {
        alert('Lütfen en az bir ders/konu satırı ekleyin.');
        return;
      }

      for (let i = 0; i < detailedRows.length; i++) {
        const r = detailedRows[i];
        if (!r.subjectId) {
          alert(`${i + 1}. satır için lütfen ders seçin.`);
          return;
        }
        if (r.questionCount !== '' && r.questionCount != null) {
          const q = parseInt(r.questionCount, 10);
          const c = parseInt(r.correct || 0, 10);
          const w = parseInt(r.wrong || 0, 10);
          const b = parseInt(r.blank || 0, 10);
          if (c + w + b !== q) {
            alert(`${i + 1}. satırda soru sayısı (${q}), Doğru + Yanlış + Boş (${c + w + b}) toplamına eşit olmalıdır.`);
            return;
          }
        }
      }

      const scoresPayload = detailedRows.map(r => ({
        subjectId: r.subjectId || null,
        curriculumTopicId: r.curriculumTopicId || null,
        questionCount: r.questionCount !== '' && r.questionCount != null ? parseInt(r.questionCount, 10) : null,
        correct: r.correct !== '' && r.correct != null ? parseInt(r.correct, 10) : null,
        wrong: r.wrong !== '' && r.wrong != null ? parseInt(r.wrong, 10) : null,
        blank: r.blank !== '' && r.blank != null ? parseInt(r.blank, 10) : null,
        score: r.score !== '' && r.score != null ? parseFloat(r.score) : null,
        maxScore: r.maxScore !== '' && r.maxScore != null ? parseFloat(r.maxScore) : null,
      }));

      addExamMutation.mutate({
        studentId: id,
        examData: {
          examName: examName.trim(),
          examDate: examDate || new Date().toISOString().split('T')[0],
          examType,
          scores: scoresPayload,
        }
      }, {
        onSuccess: () => {
          setExamName('');
          setExamDate('');
          setDetailedRows([]);
        }
      });
    }
  };

  return (
    <div className={styles.pageContainer}>
      {/* Üst Bilgi Başlığı */}
      <div className={styles.topHeader}>
        <Button variant="ghost" onClick={() => navigate('/coach/students')}>
          <ArrowLeft size={16} />
          <span>Öğrencilere Dön</span>
        </Button>
      </div>

      <header className={styles.header}>
        <div className={styles.profileMeta}>
          <div className={styles.avatar}>
            {student.fullName?.charAt(0) || '?'}
          </div>
          <div>
            <h1 className={styles.title}>{student.fullName}</h1>
            <p className={styles.subtitle}>{(student.grade ? student.grade + '. Sınıf' : '')} • {student.track || student.area}</p>
          </div>
        </div>
        <div className={styles.actions}>
          <Button variant="outline" onClick={handleDownloadReport}>
            <FileDown size={15} />
            <span>PDF Rapor</span>
          </Button>
          <Button variant="secondary" onClick={() => setIsEditModalOpen(true)}>
            <Edit3 size={15} />
            <span>Düzenle</span>
          </Button>
          <Button variant="primary" onClick={() => setIsHomeworkModalOpen(true)}>
            <PlusCircle size={15} />
            <span>Ödev Ata</span>
          </Button>
          <Button 
            variant="ghost" 
            style={{ color: 'var(--color-danger, #ef4444)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
            onClick={() => setShowDeleteConfirm(true)}
            title="Öğrenciyi Sil"
          >
            <Trash2 size={15} />
            <span>Sil</span>
          </Button>
        </div>
      </header>

      {/* 4 Akıllı Grup Sekmesi */}
      <div className={styles.groupTabs}>
        <button
          type="button"
          className={`${styles.groupTab} ${activeGroup === 'general' ? styles.groupTabActive : ''}`}
          onClick={() => handleSelectGroup('general')}
        >
          <Clock size={16} />
          <span>Genel & Zaman</span>
        </button>
        <button
          type="button"
          className={`${styles.groupTab} ${activeGroup === 'academic' ? styles.groupTabActive : ''}`}
          onClick={() => handleSelectGroup('academic')}
        >
          <BookOpen size={16} />
          <span>Akademik Takip</span>
        </button>
        <button
          type="button"
          className={`${styles.groupTab} ${activeGroup === 'sessions' ? styles.groupTabActive : ''}`}
          onClick={() => handleSelectGroup('sessions')}
        >
          <MessageSquare size={16} />
          <span>Görüşme & Notlar</span>
        </button>
        <button
          type="button"
          className={`${styles.groupTab} ${activeGroup === 'parents' ? styles.groupTabActive : ''}`}
          onClick={() => handleSelectGroup('parents')}
        >
          <Users size={16} />
          <span>Veli Entegrasyonu</span>
        </button>
      </div>

      {/* Alt Sekme Çubuğu */}
      <div className={styles.subPills}>
        {activeGroup === 'general' && (
          <>
            <button
              className={`${styles.subPill} ${activeTab === 'info' ? styles.subPillActive : ''}`}
              onClick={() => setActiveTab('info')}
            >
              Öğrenci Bilgileri & Hedefler
            </button>
            <button
              className={`${styles.subPill} ${activeTab === 'timeBudget' ? styles.subPillActive : ''}`}
              onClick={() => setActiveTab('timeBudget')}
            >
              Zaman Bütçesi
            </button>
            <button
              className={`${styles.subPill} ${activeTab === 'events' ? styles.subPillActive : ''}`}
              onClick={() => setActiveTab('events')}
            >
              Takvim & Etkinlikler
            </button>
          </>
        )}

        {activeGroup === 'academic' && (
          <>
            <button
              className={`${styles.subPill} ${activeTab === 'homework' ? styles.subPillActive : ''}`}
              onClick={() => setActiveTab('homework')}
            >
              Ödevler
            </button>
            <button
              className={`${styles.subPill} ${activeTab === 'exams' ? styles.subPillActive : ''}`}
              onClick={() => setActiveTab('exams')}
            >
              Sınavlar & Netler
            </button>
            <button
              className={`${styles.subPill} ${activeTab === 'topics' ? styles.subPillActive : ''}`}
              onClick={() => setActiveTab('topics')}
            >
              Konu Takibi
            </button>
          </>
        )}

        {activeGroup === 'sessions' && (
          <>
            <button
              className={`${styles.subPill} ${activeTab === 'grow' ? styles.subPillActive : ''}`}
              onClick={() => setActiveTab('grow')}
            >
              GROW Seansları
            </button>
            <button
              className={`${styles.subPill} ${activeTab === 'swot' ? styles.subPillActive : ''}`}
              onClick={() => setActiveTab('swot')}
            >
              SWOT & Denge Çarkı
            </button>
            <button
              className={`${styles.subPill} ${activeTab === 'pulse' ? styles.subPillActive : ''}`}
              onClick={() => setActiveTab('pulse')}
            >
              Öğrenci Nabzı & Sorular
            </button>
            <button
              className={`${styles.subPill} ${activeTab === 'notes' ? styles.subPillActive : ''}`}
              onClick={() => setActiveTab('notes')}
            >
              Koç Notları
            </button>
            <button
              className={`${styles.subPill} ${activeTab === 'teacherNotes' ? styles.subPillActive : ''}`}
              onClick={() => setActiveTab('teacherNotes')}
            >
              Öğretmen Görüşleri
            </button>
          </>
        )}

        {activeGroup === 'parents' && (
          <>
            <button
              className={`${styles.subPill} ${activeTab === 'parents' ? styles.subPillActive : ''}`}
              onClick={() => setActiveTab('parents')}
            >
              Veli Erişimi & Yetkiler
            </button>
          </>
        )}
      </div>

      <div className={styles.tabContent}>
        {/* Veli Erişimi ve İzinleri Sekmesi */}
        {activeTab === 'parents' && (
          <ParentAccessPanel 
            student={student} 
            onInviteSuccess={() => queryClient.invalidateQueries({ queryKey: ['coach', 'student', id] })} 
          />
        )}

        {/* Öğrenci Bilgileri Sekmesi */}
        {activeTab === 'info' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className={styles.grid}>
              <Card title="Temel Bilgiler" className={styles.infoCard}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Ad Soyad:</span>
                  <span className={styles.infoValue}>{student.fullName}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Sınıf / Seviye:</span>
                  <span className={styles.infoValue}>{student.grade ? `${student.grade}. Sınıf` : '-'}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Hedef / Alan:</span>
                  <span className={styles.infoValue}>{student.track || student.area || '-'}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Telefon:</span>
                  <span className={styles.infoValue}>{student.phone || '-'}</span>
                </div>
                {student.targetUniversity && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Hedef Üniversite:</span>
                    <span className={styles.infoValue}>{student.targetUniversity}</span>
                  </div>
                )}
                {student.targetMajor && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Hedef Bölüm:</span>
                    <span className={styles.infoValue}>{student.targetMajor}</span>
                  </div>
                )}
              </Card>

              <Card title="Grup ve Koçluk Yönetimi" className={styles.infoCard}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Mevcut Durum:</span>
                  <span className={styles.infoValue}>
                    {(student.groupName || student.groupId) ? (
                      <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Grup Öğrencisi ({student.groupName || 'Grup'})</span>
                    ) : (
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>Bireysel Öğrenci</span>
                    )}
                  </span>
                </div>

                <div style={{ marginTop: 16, borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: '0.9rem' }}>Öğrenci Tipi / Grup Değiştir</h4>
                  {(student.groupName || student.groupId) ? (
                    <div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-color-muted)', marginBottom: 12 }}>
                        Bu öğrenciyi bireysel koçluk modeline taşımak istiyor musunuz?
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        isLoading={moveToIndividual.isPending}
                        onClick={() => moveToIndividual.mutate(id)}
                      >
                        Bireysele Çek
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-color-muted)', marginBottom: 8 }}>
                        Bir gruba dahil etmek için grup seçin:
                      </p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <select 
                          value={selectedGroupId} 
                          onChange={(e) => setSelectedGroupId(e.target.value)}
                          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color)', flex: 1, backgroundColor: 'var(--bg-color-main)', color: 'var(--text-color-main)' }}
                        >
                          <option value="">Grup Seçin...</option>
                          {groups.map(g => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                          ))}
                        </select>
                        <Button 
                          variant="primary" 
                          size="sm"
                          disabled={!selectedGroupId || moveToGroup.isPending}
                          isLoading={moveToGroup.isPending}
                          onClick={() => {
                            moveToGroup.mutate({ studentId: id, groupId: selectedGroupId }, {
                              onSuccess: () => setSelectedGroupId('')
                            });
                          }}
                        >
                          Gruba Ekle
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className={styles.groupStatsNote} style={{ marginTop: 14 }}>
                  Güncel Bireysel Ödevler: {student.individualHomeworkCount ?? 0} • Geçmiş Grup Ödevleri: {student.groupHomeworkCount ?? 0}
                </div>
              </Card>
            </div>

            {/* F5 & F6: OKR Hedef Ağacı, Alışkanlık Takibi ve Eisenhower Öncelik Matrisi */}
            <OkrGoalTreeCard 
              student={student} 
              onUpdateGoal={(patch) => {
                updateStudentMutation.mutate({ studentId: id, data: patch });
              }} 
            />

            <HabitTrackerCard 
              habits={parsedHabits}
              onSaveHabits={(newHabits) => {
                updateCoachingTools.mutate({
                  studentId: id,
                  data: { habitsData: newHabits }
                });
              }}
              isCoach={true}
            />

            <EisenhowerMatrixCard 
              homework={studentHomeworks || []} 
              questions={questions || []} 
            />
          </div>
        )}

        {/* Zaman Bütçesi Sekmesi */}
        {activeTab === 'timeBudget' && (
          <WeeklyTimeBudgetCard studentId={id} />
        )}

        {/* Koç Notları Sekmesi */}
        {activeTab === 'notes' && (
          <Card title="Koç Notları" className={styles.notesCard}>
            <div className={styles.notesList}>
              {isNotesLoading ? (
                <p>Notlar yükleniyor...</p>
              ) : notesList && notesList.length > 0 ? (
                notesList.map((note) => (
                  <div key={note.id} className={styles.noteItem}>
                    <p className={styles.noteContent}>{note.content || note.notes}</p>
                    <span className={styles.noteDate}>
                      {new Date(note.createdAt).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                ))
              ) : (
                <p>Henüz not eklenmemiş.</p>
              )}
            </div>

            <div className={styles.addNoteForm}>
              <textarea
                placeholder="Öğrenci hakkında yeni not yazın..."
                value={localNotes}
                onChange={(e) => setLocalNotes(e.target.value)}
                rows={3}
                className={styles.textarea}
              />
              <Button 
                variant="primary" 
                onClick={handleSaveNotes}
                disabled={updateNotesMutation.isPending || !localNotes.trim()}
              >
                {updateNotesMutation.isPending ? 'Ekleniyor...' : 'Not Ekle'}
              </Button>
              {updateNotesMutation.isSuccess && <span style={{marginLeft: '10px', color: 'green'}}>✓ Eklendi</span>}
              {updateNotesMutation.isError && <span style={{marginLeft: '10px', color: 'red'}}>✖ Hata oluştu</span>}
            </div>
          </Card>
        )}

        {/* Öğretmen Görüşleri Sekmesi */}
        {activeTab === 'teacherNotes' && (
          <Card title="Öğretmen Görüşleri & Değerlendirmeleri" className={styles.notesCard}>
            {teacherNotes && teacherNotes.length > 0 ? (
              teacherNotes.map((note) => (
                <div key={note.id} style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--color-primary)' }}>{note.courseName} · {note.teacherName}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-color-muted)' }}>
                      {note.createdAt ? new Date(note.createdAt).toLocaleDateString('tr-TR') : '-'}
                    </span>
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: '0.85rem', color: 'var(--text-color-main)', lineHeight: 1.5 }}>
                    {note.note}
                  </p>
                </div>
              ))
            ) : (
              <p>Öğretmenler tarafından henüz görüş veya değerlendirme girilmemiş.</p>
            )}
          </Card>
        )}

        {/* Sınav Geçmişi Sekmesi (F1: Dual-Mode, D/Y/B, Net Otoritesi, Alt Kırılımlar) */}
        {activeTab === 'exams' && (
          <Card title="Sınavlar & Net Takibi" className={styles.notesCard}>
            <div className={styles.grid}>
              {student.examResults?.length > 0 ? student.examResults.map(exam => (
                <Card key={exam.id} title={`${exam.examName || exam.examType}`}>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Tür:</span>
                    <span className={styles.infoValue}>{exam.examType || 'Deneme'}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Tarih:</span>
                    <span className={styles.infoValue}>{exam.examDate ? new Date(exam.examDate).toLocaleDateString('tr-TR') : '-'}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Toplam Net:</span>
                    <span className={styles.infoValue} style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{exam.totalNet != null ? exam.totalNet : '-'}</span>
                  </div>
                  {exam.scores && exam.scores.length > 0 && (
                    <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #e2e8f0', fontSize: '0.82rem' }}>
                      <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text-color-muted)' }}>Ders / Konu Dağılımı:</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {exam.scores.map((sc, sIdx) => (
                          <div key={sc.id || sIdx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 6px', background: '#f8fafc', borderRadius: 6 }}>
                            <div>
                              <strong>{sc.subjectName || sc.subjectCode || 'Ders'}</strong>
                              {sc.topicName && <span style={{ color: 'var(--text-color-muted)', marginLeft: 6 }}>({sc.topicName})</span>}
                            </div>
                            <div style={{ fontWeight: 600 }}>
                              {sc.questionCount != null ? (
                                <span>{sc.correct ?? 0}D {sc.wrong ?? 0}Y {sc.blank ?? 0}B · <strong>{sc.net ?? 0} Net</strong></span>
                              ) : sc.score != null ? (
                                <span>{sc.score} / {sc.maxScore ?? 100} Puan</span>
                              ) : '-'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              )) : (
                <p>Henüz sınav sonucu eklenmemiş.</p>
              )}
            </div>
            
            <div style={{ margin: '24px 0', borderTop: '1px solid #e2e8f0' }} />
            
            <h4>Yeni Sınav Ekle</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
              {/* Giriş Modu ve Temel Bilgiler */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', background: '#e2e8f0', padding: 2, borderRadius: 8 }}>
                  <button 
                    type="button"
                    onClick={() => setExamEntryMode('quick')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      border: 'none',
                      background: examEntryMode === 'quick' ? '#ffffff' : 'transparent',
                      fontWeight: examEntryMode === 'quick' ? 600 : 400,
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    Hızlı Toplam Net
                  </button>
                  <button 
                    type="button"
                    onClick={() => setExamEntryMode('detailed')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      border: 'none',
                      background: examEntryMode === 'detailed' ? '#ffffff' : 'transparent',
                      fontWeight: examEntryMode === 'detailed' ? 600 : 400,
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    Detaylı Giriş (Ders / Konu)
                  </button>
                </div>

                <div style={{ minWidth: '130px' }}>
                  <select 
                    value={examType} 
                    onChange={(e) => setExamType(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  >
                    <option value="Deneme">Deneme</option>
                    <option value="TYT">TYT</option>
                    <option value="AYT">AYT</option>
                    <option value="LGS">LGS</option>
                    <option value="Okul">Okul / Yazılı</option>
                    <option value="Diğer">Diğer</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 2, minWidth: '180px' }}>
                  <Input 
                    label="Sınav Adı" 
                    placeholder="Örn: TYT Kurumsal Deneme 1" 
                    value={examName}
                    onChange={(e) => setExamName(e.target.value)}
                  />
                </div>
                <div style={{ flex: 1, minWidth: '140px' }}>
                  <Input 
                    label="Tarih" 
                    type="date" 
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                  />
                </div>

                {examEntryMode === 'quick' && (
                  <div style={{ width: '130px' }}>
                    <Input 
                      label="Toplam Net" 
                      type="number" 
                      step="0.25" 
                      placeholder="0" 
                      value={quickTotalNet}
                      onChange={(e) => setQuickTotalNet(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Detaylı Mod Satırları */}
              {examEntryMode === 'detailed' && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-color-muted)' }}>
                      Ders / Konu Satırları ({detailedRows.length})
                    </span>
                    <Button variant="outline" size="sm" onClick={addDetailedRow}>
                      <Plus size={14} />
                      <span>Ders/Konu Ekle</span>
                    </Button>
                  </div>

                  {detailedRows.length === 0 ? (
                    <div style={{ padding: '16px', background: '#f8fafc', borderRadius: 8, textAlign: 'center', color: 'var(--text-color-muted)', fontSize: '0.85rem' }}>
                      Henüz alt ders veya konu satırı eklenmedi. "+ Ders/Konu Ekle" butonuna basarak ders dağılımını girin.
                    </div>
                  ) : (
                    detailedRows.map((row, idx) => (
                      <ExamScoreRow 
                        key={row.id}
                        row={row}
                        index={idx}
                        grade={student?.grade}
                        subjects={subjects}
                        examType={examType}
                        studentTrack={student?.track}
                        onChange={updateDetailedRow}
                        onRemove={removeDetailedRow}
                      />
                    ))
                  )}

                  {detailedRows.length > 0 && examType !== 'Okul' && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10, fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                      Hesaplanan Toplam Net: {computeDetailedTotalNet()}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <Button 
                  variant="primary" 
                  disabled={addExamMutation.isPending}
                  onClick={handleSaveExam}
                >
                  {addExamMutation.isPending ? 'Ekleniyor...' : 'Sınavı Kaydet'}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Ödevler Sekmesi */}
        {activeTab === 'homework' && (
          <Card title="Ödev Geçmişi" className={styles.notesCard}>
            <ParetoFocusBanner 
              exams={student?.examResults || []} 
              onAssignFocusHomework={(subj) => {
                setSelectedTopicForHw({ subjectName: subj });
                setIsHomeworkModalOpen(true);
              }} 
            />

            {studentHomeworks && studentHomeworks.length > 0 ? (
              studentHomeworks.map((hw) => (
                <div key={hw.id} style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '0.9rem' }}>{hw.snapshotTitle}</strong>
                    {hw.courseName && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-color-muted)' }}>
                        ({hw.courseName})
                      </span>
                    )}
                    {hw.subjectName && !hw.courseName && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-color-muted)' }}>
                        ({hw.subjectName})
                      </span>
                    )}
                    <PriorityBadge priority={hw.priority} />
                    <AssignedViaBadge assignedVia={hw.assignedVia} />
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-color-muted)' }}>
                      {hw.dueDate ? new Date(hw.dueDate).toLocaleDateString('tr-TR') : '-'}
                    </div>
                    <HomeworkStatusBadge status={hw.status} completionPercentage={hw.completionPercentage} />
                  </div>
                </div>
              ))
            ) : (
              <p>Henüz ödev atanmamış.</p>
            )}
          </Card>
        )}

        {/* Konular Sekmesi (F6: Filtreleme, Ünite Gruplama, Ödev Durumu, Konu Netleri, Hızlı Ödev Atama) */}
        {activeTab === 'topics' && (
          <Card title="Müfredat & Konu Takibi" className={styles.notesCard}>
            {/* Filtre Çubuğu */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-color-muted)' }}>Ders:</span>
                <select 
                  value={topicSubjectFilter} 
                  onChange={(e) => setTopicSubjectFilter(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                >
                  <option value="ALL">Tüm Dersler</option>
                  {Array.from(new Set(curriculum?.map(c => c.subjectName).filter(Boolean) || [])).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-color-muted)' }}>Durum:</span>
                <select 
                  value={topicStatusFilter} 
                  onChange={(e) => setTopicStatusFilter(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                >
                  <option value="ALL">Tüm Durumlar</option>
                  <option value="UNASSIGNED">Atanmamış / Eksikler</option>
                  <option value="PENDING_OVERDUE">Bekleyen / Gecikmiş</option>
                  <option value="DONE">Tamamlananlar</option>
                </select>
              </div>
            </div>

            {/* Gruplanmış Konu Listesi */}
            {(() => {
              const filtered = (curriculum || []).filter(t => {
                if (topicSubjectFilter !== 'ALL' && t.subjectName !== topicSubjectFilter) return false;
                if (topicStatusFilter === 'UNASSIGNED' && t.homeworkStatus !== 'UNASSIGNED') return false;
                if (topicStatusFilter === 'PENDING_OVERDUE' && t.homeworkStatus !== 'PENDING' && t.homeworkStatus !== 'OVERDUE') return false;
                if (topicStatusFilter === 'DONE' && t.homeworkStatus !== 'DONE') return false;
                return true;
              });

              if (filtered.length === 0) {
                return <p style={{ color: 'var(--text-color-muted)', fontSize: '0.9rem' }}>Filtrelere uygun konu bulunamadı.</p>;
              }

              // Group by subjectName -> unitName
              const grouped = filtered.reduce((acc, t) => {
                const sName = t.subjectName || 'Diğer';
                const uName = t.unitName ? (t.unitNumber != null ? `${t.unitNumber}. ${t.unitName}` : t.unitName) : 'Genel Konular';
                if (!acc[sName]) acc[sName] = {};
                if (!acc[sName][uName]) acc[sName][uName] = [];
                acc[sName][uName].push(t);
                return acc;
              }, {});

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {Object.entries(grouped).map(([subj, units]) => (
                    <div key={subj} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, background: '#fafafa' }}>
                      <h4 style={{ margin: '0 0 10px', color: 'var(--color-primary)', fontSize: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>
                        {subj}
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {Object.entries(units).map(([unit, topics]) => (
                          <div key={unit} style={{ background: '#ffffff', borderRadius: 6, padding: '8px 10px', border: '1px solid #f1f5f9' }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-color-muted)', marginBottom: 6 }}>
                              {unit}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {topics.map(t => {
                                const statusColors = {
                                  DONE: { bg: '#dcfce7', text: '#15803d', label: 'Tamamlandı' },
                                  PENDING: { bg: '#e0f2fe', text: '#0369a1', label: 'Bekliyor' },
                                  OVERDUE: { bg: '#fee2e2', text: '#b91c1c', label: 'Gecikmiş' },
                                  UNASSIGNED: { bg: '#f1f5f9', text: '#64748b', label: 'Atanmadı' },
                                };
                                const badge = statusColors[t.homeworkStatus] || statusColors.UNASSIGNED;

                                return (
                                  <div 
                                    key={t.id} 
                                    style={{ 
                                      display: 'flex', 
                                      justifyContent: 'space-between', 
                                      alignItems: 'center', 
                                      padding: '6px 8px', 
                                      borderBottom: '1px solid #f8fafc',
                                      flexWrap: 'wrap',
                                      gap: 8
                                    }}
                                  >
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: '180px', flex: 1 }}>
                                      {t.isCompleted ? <CheckCircle2 size={15} color="#16a34a" /> : <Square size={15} color="#94a3b8" />}
                                      <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{t.topicName}</span>
                                    </span>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      {/* Durum Rozeti */}
                                      <span style={{ 
                                        fontSize: '0.72rem', 
                                        fontWeight: 600, 
                                        padding: '2px 8px', 
                                        borderRadius: 12, 
                                        background: badge.bg, 
                                        color: badge.text 
                                      }}>
                                        {badge.label}
                                      </span>

                                      {/* İstatistikler */}
                                      {t.lastNet != null && (
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                                          Son Net: {t.lastNet}
                                        </span>
                                      )}
                                      {t.avgSuccessRate != null && (
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-color-muted)' }}>
                                          Başarı: %{t.avgSuccessRate}
                                        </span>
                                      )}

                                      {/* Hızlı Ödev Ver Butonu */}
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        style={{ padding: '2px 8px', height: '26px', fontSize: '0.75rem' }}
                                        onClick={() => {
                                          setSelectedTopicForHw(t);
                                          setIsHomeworkModalOpen(true);
                                        }}
                                      >
                                        Ödev Ver
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </Card>
        )}

        {/* Takvim Sekmesi (öğrencinin kişisel etkinlikleri — Koç Görünürlüğü) */}
        {activeTab === 'events' && (
          <Card title="Öğrencinin Kişisel Takvimi" className={styles.notesCard}>
            {studentEvents && studentEvents.length > 0 ? (
              studentEvents.map((ev) => (
                <div key={ev.id} style={{ padding: '6px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <span>{ev.title}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-color-muted)' }}>
                    {ev.startAt ? new Date(ev.startAt).toLocaleString('tr-TR') : '-'} · {ev.eventType}
                  </span>
                </div>
              ))
            ) : (
              <p>Öğrenci henüz kişisel etkinlik eklememiş.</p>
            )}
          </Card>
        )}

        {/* Görüşmeler Sekmesi (Koçluk görüşme döngüsü) */}
        {activeTab === 'sessions' && (
          <Card title="Koçluk Görüşmeleri" className={styles.notesCard}>
            {sessions && sessions.length > 0 ? (
              sessions.map((s) => (
                <div key={s.id} style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{s.title}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-color-muted)' }}>{s.sessionDate ? new Date(s.sessionDate).toLocaleDateString('tr-TR') : '-'}</span>
                  </div>
                  {s.notes && <p style={{ fontSize: '0.85rem', color: 'var(--text-color-muted)', margin: '4px 0' }}>{s.notes}</p>}
                  {s.actionItems && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-warning)', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <CheckCircle2 size={13} style={{ flexShrink: 0 }} />
                      <span>{s.actionItems}</span>
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p>Henüz görüşme kaydı yok.</p>
            )}

            <div style={{ marginTop: 16, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
              <h4 style={{ margin: '0 0 12px' }}>Yeni Görüşme Ekle</h4>
              <Input label="Başlık" value={sessionTitle} onChange={(e) => setSessionTitle(e.target.value)} placeholder="örn. Hedef gözden geçirme" />
              <Input label="Tarih" type="datetime-local" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-color-muted)', display: 'block', marginBottom: 6 }}>Görüşme Notları</label>
                <textarea 
                  value={sessionNotes} 
                  onChange={(e) => setSessionNotes(e.target.value)} 
                  rows={3} 
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color-main)', color: 'var(--text-color-main)' }} 
                />
              </div>
              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-color-muted)', display: 'block', marginBottom: 6 }}>Aksiyon Öğeleri</label>
                <textarea 
                  value={sessionActions} 
                  onChange={(e) => setSessionActions(e.target.value)} 
                  rows={2} 
                  placeholder="örn. Bu hafta 3 deneme çözecek" 
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color-main)', color: 'var(--text-color-main)' }} 
                />
              </div>
              <div style={{ marginTop: 12 }}>
                <Button variant="primary" size="sm" onClick={handleCreateSession} disabled={createSession.isPending}>
                  {createSession.isPending ? 'Ekleniyor...' : 'Görüşmeyi Kaydet'}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* GROW Seans Modeli */}
        {activeTab === 'grow' && (
          <GrowSessionsPanel 
            sessions={parsedGrowSessions}
            onAddSession={(newSession) => {
              const updated = [newSession, ...parsedGrowSessions];
              updateCoachingTools.mutate({
                studentId: id,
                data: { growSessionsData: updated }
              });
            }}
          />
        )}

        {/* SWOT Analizi & Denge Çarkı */}
        {activeTab === 'swot' && (
          <SwotAndWheelPanel 
            toolsData={coachingTools}
            autoSwot={coachingTools?.autoSwot}
            onSaveTools={(updatedData) => {
              updateCoachingTools.mutate({
                studentId: id,
                data: updatedData
              });
            }}
          />
        )}

        {/* Öğrenci Nabzı (Check-in) & Sorular */}
        {activeTab === 'pulse' && (
          <StudentPulsePanel 
            checkins={checkins}
            questions={questions}
            onReplyQuestion={(questionId, coachAnswer) => {
              replyQuestion.mutate({
                questionId,
                coachAnswer
              }, {
                onSuccess: () => {
                  queryClient.invalidateQueries({ queryKey: ['coach', 'questions', id] });
                }
              });
            }}
          />
        )}
      </div>

      <AssignHomeworkModal 
        isOpen={isHomeworkModalOpen} 
        onClose={() => {
          setIsHomeworkModalOpen(false);
          setSelectedTopicForHw(null);
        }}
        selectedStudent={student}
        initialTopic={selectedTopicForHw}
      />

      {/* Öğrenci Silme Onay Modalı */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Öğrenciyi Sil"
        maxWidth="440px"
      >
        <p style={{ fontSize: '0.9rem', color: 'var(--text-color-main)', marginBottom: '16px', lineHeight: 1.5 }}>
          <strong>{student.fullName}</strong> adlı öğrenciyi sistemden silmek istediğinize emin misiniz? Öğrenci ve ilişkili tüm aktif kayıtları arşive alınacaktır.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
            Vazgeç
          </Button>
          <Button 
            variant="danger" 
            isLoading={deleteStudentMutation.isPending}
            onClick={async () => {
              await deleteStudentMutation.mutateAsync(id);
              setShowDeleteConfirm(false);
              navigate('/coach/students');
            }}
          >
            Evet, Öğrenciyi Sil
          </Button>
        </div>
      </Modal>

      {/* Öğrenci Bilgilerini Düzenle Modalı */}
      <EditStudentModal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        student={student}
        onSubmit={async (payload) => {
          await updateStudentMutation.mutateAsync({ studentId: id, data: payload });
        }}
      />
    </div>
  );
};

export default CoachStudentDetail;
