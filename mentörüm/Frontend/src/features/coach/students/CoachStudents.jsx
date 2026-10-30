import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import Modal from '../../../components/common/Modal/Modal';
import SegmentedTabs from '../../../components/common/SegmentedTabs/SegmentedTabs';
import StatusBadge from '../../../components/common/StatusBadge/StatusBadge';
import { STUDENT_GRADES } from '../../../constants/domainConstants';
import CoachGroupsPage from '../groups/CoachGroupsPage';
import CoachCoursesPage from '../courses/CoachCoursesPage';
import AddOrInviteStudentPanel from './AddOrInviteStudentPanel';
import { Users, FolderGit2, BookOpen, CheckCircle2, AlertCircle, School, Mail, Search, UserPlus, Trash2, Plus } from 'lucide-react';
import { useStudents, useDeleteStudent, useInviteStudent } from '../coachApi';
import AssignHomeworkModal from '../homework/AssignHomeworkModal';
import { usePrograms, useGroups, useCourses } from '../coachSchoolApi';
import styles from './CoachStudents.module.css';

const CoachStudents = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'STUDENTS'); // 'STUDENTS' | 'GROUPS' | 'COURSES'
  const { data: students, isLoading } = useStudents();
  const { data: programs } = usePrograms();
  const deleteStudentMutation = useDeleteStudent();
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [assignModalStudent, setAssignModalStudent] = useState(null);

  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || searchParams.get('search') || '');
  const [programFilter, setProgramFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState(searchParams.get('grade') || '');
  const activeProgramId = programFilter || ((programs && programs.length > 0) ? programs[0].id : null);
  const { data: groups } = useGroups(activeProgramId);
  const { data: courses } = useCourses(activeProgramId);

  const urlTabParam = searchParams.get('tab');
  useEffect(() => {
    if (urlTabParam && ['STUDENTS', 'GROUPS', 'COURSES'].includes(urlTabParam) && urlTabParam !== activeTab) {
      setActiveTab(urlTabParam);
    }
  }, [urlTabParam]); // eslint-disable-line react-hooks/exhaustive-deps

  // Dışarıdan (örn. üst bar ⌘K araması) gelen ?q= / ?search= değişimini state'e senkronize et
  const urlQueryParam = searchParams.get('q') ?? searchParams.get('search');
  useEffect(() => {
    if (urlQueryParam !== null && urlQueryParam !== searchTerm) {
      setSearchTerm(urlQueryParam);
    }
  }, [urlQueryParam]); // eslint-disable-line react-hooks/exhaustive-deps

  // URL query params ile arama/filtreleme senkronizasyonu
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab && activeTab !== 'STUDENTS') params.set('tab', activeTab);
    if (searchTerm) params.set('q', searchTerm);
    if (gradeFilter) params.set('grade', gradeFilter);
    setSearchParams(params, { replace: true });
  }, [activeTab, searchTerm, gradeFilter, setSearchParams]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [showCourseForm, setShowCourseForm] = useState(false);

  // Modal State (Gölge profile sonradan e-posta daveti göndermek için)
  const [inviteTarget, setInviteTarget] = useState(null);
  const [targetEmail, setTargetEmail] = useState('');
  const [targetError, setTargetError] = useState('');
  const [targetSuccess, setTargetSuccess] = useState('');

  const inviteStudent = useInviteStudent(activeProgramId);

  const handleOpenInviteModal = (student) => {
    setInviteTarget(student);
    setTargetEmail(student.email || '');
    setTargetError('');
    setTargetSuccess('');
  };

  const handleSendInviteSubmit = async (e) => {
    e.preventDefault();
    if (!targetEmail.trim() || !inviteTarget) return;
    setTargetError('');
    try {
      await inviteStudent.mutateAsync({ studentId: inviteTarget.id, email: targetEmail.trim() });
      setTargetSuccess('Davet bağlantısı oluşturuldu.');
      setTimeout(() => {
        setInviteTarget(null);
        setTargetSuccess('');
      }, 1200);
    } catch (err) {
      setTargetError(err?.response?.data?.error || 'Davet gönderilemedi.');
    }
  };

  const filtered = (students || []).filter((s) => {
    const matchName = (s.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchProgram = !programFilter || s.programId === programFilter;
    const matchGrade = !gradeFilter || String(s.grade) === gradeFilter;
    return matchName && matchProgram && matchGrade;
  });

  if (isLoading) return <div className={styles.pageContainer}>Yükleniyor...</div>;

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>Öğrenciler & Programlar</h1>
            {activeTab === 'STUDENTS' && (
              <Button
                variant={showAddForm ? 'secondary' : 'primary'}
                size="sm"
                onClick={() => setShowAddForm(!showAddForm)}
              >
                <UserPlus size={15} />
                <span>{showAddForm ? '✕ Formu Kapat' : '+ Yeni Öğrenci Ekle'}</span>
              </Button>
            )}
            {activeTab === 'GROUPS' && (
              <Button
                variant={showGroupForm ? 'secondary' : 'primary'}
                size="sm"
                onClick={() => setShowGroupForm(!showGroupForm)}
              >
                <Plus size={15} />
                <span>{showGroupForm ? '✕ Formu Kapat' : '+ Yeni Grup Oluştur'}</span>
              </Button>
            )}
            {activeTab === 'COURSES' && (
              <Button
                variant={showCourseForm ? 'secondary' : 'primary'}
                size="sm"
                onClick={() => setShowCourseForm(!showCourseForm)}
              >
                <Plus size={15} />
                <span>{showCourseForm ? '✕ Formu Kapat' : '+ Yeni Ders Oluştur'}</span>
              </Button>
            )}
          </div>
          <p className={styles.subtitle}>Bireysel koçluk yaptığınız öğrencileri, grup sınıflarınızı ve ders/branşlarınızı tek merkezden yönetin.</p>
        </div>
      </header>

      <SegmentedTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'STUDENTS', label: 'Bireysel Öğrenciler', icon: <Users size={16} />, count: students?.length || 0 },
          { id: 'GROUPS', label: 'Gruplar', icon: <FolderGit2 size={16} />, count: groups?.length || 0 },
          { id: 'COURSES', label: 'Dersler & Branşlar', icon: <BookOpen size={16} />, count: courses?.length || 0 },
        ]}
      />

      {activeTab === 'GROUPS' ? (
        <CoachGroupsPage
          programId={activeProgramId}
          embedded={true}
          showCreateForm={showGroupForm || (groups && groups.length === 0)}
          onCloseCreateForm={() => setShowGroupForm(false)}
        />
      ) : activeTab === 'COURSES' ? (
        <CoachCoursesPage
          programId={activeProgramId}
          embedded={true}
          showCreateForm={showCourseForm || (courses && courses.length === 0)}
          onCloseCreateForm={() => setShowCourseForm(false)}
        />
      ) : (
        <>
          <AddOrInviteStudentPanel
            showAddForm={showAddForm}
            onCloseAddForm={() => setShowAddForm(false)}
            programs={programs}
          />

          <Card className={styles.filterCard}>
            <div className={styles.filterGrid}>
              <Input
                placeholder="Öğrenci ara (isim veya e-posta)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {programs && programs.length > 1 && (
                <select
                  className={styles.select}
                  value={programFilter}
                  onChange={(e) => setProgramFilter(e.target.value)}
                >
                  <option value="">Tüm Programlar</option>
                  {programs?.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
              <select
                className={styles.select}
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
              >
                <option value="">Tüm Sınıflar</option>
                {STUDENT_GRADES.map((g) => (
                  <option key={g} value={g === 'Mezun' ? '13' : g}>
                    {g === 'Mezun' ? 'Mezun' : `${g}. Sınıf`}
                  </option>
                ))}
              </select>
            </div>
          </Card>

          <div className={styles.studentsGrid}>
            {filtered.map((student) => (
              <Card key={student.id} interactive className={styles.studentCard} onClick={() => navigate(`/coach/students/${student.id}`)}>
                <div className={styles.cardHeader}>
                  <div className={styles.avatar}>{student.fullName?.charAt(0) || 'Ö'}</div>
                  <div className={styles.studentMeta}>
                    <h3 className={styles.studentName}>{student.fullName}</h3>
                    <div className={styles.studentEmail}>{student.email}</div>
                    <span className={styles.studentDetail}>
                      {student.grade != null ? `${student.grade}. Sınıf` : ''}
                      {student.track ? ` • ${student.track}` : ''}
                      {student.programName && (
                        <span className={styles.programMeta}>
                          {' • '}<School size={12} /> {student.programName}
                        </span>
                      )}
                    </span>
                    <div className={styles.hwBadgeRow}>
                      <span className={`${styles.hwBadge} ${styles.hwBadgeActive}`}>
                        <BookOpen size={12} /> {student.activeHomeworkCount} Aktif Ödev
                      </span>
                      <span className={`${styles.hwBadge} ${styles.hwBadgeCompleted}`}>
                        <CheckCircle2 size={12} /> {student.completedHomeworkCount} Tamamlanan
                      </span>
                      <span className={`${styles.hwBadge} ${student.overdueHomeworkCount > 0 ? styles.hwBadgeOverdue : styles.hwBadgeNeutral}`}>
                        <AlertCircle size={12} /> {student.overdueHomeworkCount} Geciken
                      </span>
                    </div>
                    <div className={styles.badgeRow}>
                      {student.inviteStatus === 'NOT_INVITED' && (
                        <span className={`${styles.tagBadge} ${styles.tagBadgeWarning}`}>
                          <Mail size={12} /> E-posta Yok
                        </span>
                      )}
                      {student.groupName && (
                        <span className={`${styles.tagBadge} ${styles.tagBadgeInfo}`}>
                          <FolderGit2 size={12} /> {student.groupName}
                        </span>
                      )}
                      {student.hasIndividualCourse && (
                        <span className={`${styles.tagBadge} ${styles.tagBadgePurple}`}>
                          <Users size={12} /> Bireysel
                        </span>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={student.isActive ? 'ACTIVE' : 'INACTIVE'} />
                </div>
                <div className={styles.cardFooter}>
                  <Button variant="ghost" size="sm" className={styles.cardActionBtn} onClick={(e) => { e.stopPropagation(); navigate(`/coach/students/${student.id}`); }}>Profili Gör</Button>
                  <Button variant="secondary" size="sm" className={styles.cardActionBtn} onClick={(e) => { e.stopPropagation(); setAssignModalStudent(student); }}>Ödev Ata</Button>
                  {student.inviteStatus === 'NOT_INVITED' && (
                    <Button variant="secondary" size="sm" className={styles.cardActionBtn} onClick={(e) => { e.stopPropagation(); handleOpenInviteModal(student); }}>Davet Et</Button>
                  )}
                  <Button
                    type="button"
                    variant="danger-outline"
                    size="xs"
                    iconOnly
                    onClick={(e) => {
                      e.stopPropagation();
                      setStudentToDelete(student);
                    }}
                    title="Öğrenciyi Sil"
                    aria-label="Öğrenciyi Sil"
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <Search size={36} color="var(--text-color-muted)" />
              </div>
              <h3>Öğrenci Bulunamadı</h3>
              <p>Kayıtlı öğrenciniz yok veya arama sonucuyla eşleşmedi. "+ Yeni Öğrenci Ekle" ile davet gönderin.</p>
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={Boolean(inviteTarget)}
        onClose={() => { setInviteTarget(null); setTargetError(''); setTargetSuccess(''); }}
        title={inviteTarget ? `${inviteTarget.fullName} — Davet Gönder` : 'Davet Gönder'}
        maxWidth="440px"
      >
        <form onSubmit={handleSendInviteSubmit} className={styles.inviteModalForm}>
          <p className={styles.inviteModalDesc}>
            Öğrencinin sisteme giriş yapabilmesi için e-posta adresini girin veya güncelleyin:
          </p>
          <Input
            label="Öğrenci E-postası *"
            type="email"
            placeholder="ogrenci@ornek.com"
            value={targetEmail}
            onChange={(e) => setTargetEmail(e.target.value)}
            required
            error={targetError}
          />
          {targetSuccess && (
            <p className={styles.inviteSuccessMsg}>
              <CheckCircle2 size={16} /> <span>{targetSuccess}</span>
            </p>
          )}
          <div className={styles.modalActions}>
            <Button variant="ghost" type="button" onClick={() => setInviteTarget(null)}>
              İptal
            </Button>
            <Button variant="primary" type="submit" isLoading={inviteStudent.isPending}>
              Daveti Gönder
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(studentToDelete)}
        onClose={() => setStudentToDelete(null)}
        title="Öğrenciyi Sil"
        maxWidth="440px"
      >
        <p style={{ fontSize: '0.9rem', color: 'var(--text-color-main)', marginBottom: '16px', lineHeight: 1.5 }}>
          <strong>{studentToDelete?.fullName}</strong> adlı öğrenciyi silmek istediğinize emin misiniz? Bu işlem öğrenciyi ve ilişkili tüm aktif kayıtlarını arşive alacaktır.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <Button variant="ghost" onClick={() => setStudentToDelete(null)}>
            Vazgeç
          </Button>
          <Button
            variant="danger"
            isLoading={deleteStudentMutation.isPending}
            onClick={async () => {
              if (studentToDelete) {
                await deleteStudentMutation.mutateAsync(studentToDelete.id);
                setStudentToDelete(null);
              }
            }}
          >
            Evet, Öğrenciyi Sil
          </Button>
        </div>
      </Modal>

      <AssignHomeworkModal
        isOpen={Boolean(assignModalStudent)}
        selectedStudent={assignModalStudent}
        programId={activeProgramId}
        onClose={() => setAssignModalStudent(null)}
      />
    </div>
  );
};

export default CoachStudents;
