import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import Modal from '../../../components/common/Modal/Modal';
import CoachGroupsPage from '../groups/CoachGroupsPage';
import { Users, FolderGit2, BookOpen, CheckCircle2, AlertCircle, School, Mail, Search, UserPlus } from 'lucide-react';
import { useStudents, useSendInvite, usePendingInvites } from '../coachApi';
import { useCreateStudent, useInviteStudent } from '../studentFlexibilityApi';
import AddStudentModal from './AddStudentModal';
import { usePrograms } from '../coachSchoolApi';
import styles from './CoachStudents.module.css';

const CoachStudents = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('STUDENTS'); // 'STUDENTS' | 'GROUPS'
  const { data: students, isLoading } = useStudents();
  const { data: programs } = usePrograms();
  const { data: pendingInvites } = usePendingInvites();
  const sendInvite = useSendInvite();

  const [searchTerm, setSearchTerm] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteProgramId, setInviteProgramId] = useState('');
  const [inviteMsg, setInviteMsg] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [inviteTarget, setInviteTarget] = useState(null);
  const [targetEmail, setTargetEmail] = useState('');
  const [targetError, setTargetError] = useState('');
  const [targetSuccess, setTargetSuccess] = useState('');

  const activeProgramId = (programs && programs.length > 0) ? programs[0].id : null;
  const createStudent = useCreateStudent(activeProgramId);
  const inviteStudent = useInviteStudent(activeProgramId);

  const handleCreateStudent = async (payload) => {
    await createStudent.mutateAsync(payload);
    setShowAddStudent(false);
  };

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

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteProgramId) { 
      setInviteMsg('E-posta ve program seçimi zorunludur.'); 
      return; 
    }
    setInviteMsg('');
    try {
      const res = await sendInvite.mutateAsync({ 
        email: inviteEmail.trim(), 
        role: 'Student', 
        relatedId: inviteProgramId 
      });

      if (res.directAdded) {
        setInviteMsg(res.message);
      } else {
        setInviteMsg(`Davet oluşturuldu. Kod: ${res.code} (Bekleyen Davetler listesine eklendi)`);
      }
      setInviteEmail('');
    } catch (err) {
      setInviteMsg(err?.response?.data?.error || 'Davet gönderilemedi.');
    }
  };

  const handleCopyLink = (code) => {
    const link = `https://mentorum.dersmatris.com/invite/${code}`;
    navigator.clipboard?.writeText(link);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
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
        <div>
          <h1 className={styles.title}>Öğrenciler</h1>
          <p className={styles.subtitle}>Tüm öğrencilerinizin performansını ve durumunu yönetin.</p>
        </div>
        <div className={styles.headerButtons}>
          <Button variant="secondary" onClick={() => setShowAddStudent(true)}>
            <UserPlus size={15} />
            <span>Hızlı Ekle</span>
          </Button>
          <Button variant="primary" onClick={() => setShowInvite(!showInvite)}>
            {showInvite ? '✕ İptal' : '+ Davet Gönder'}
          </Button>
        </div>
      </header>

      {/* 2'li Sekme: Öğrenciler | Gruplar */}
      <div className={styles.segmentedTabs}>
        <button
          type="button"
          className={`${styles.segmentedBtn} ${activeTab === 'STUDENTS' ? styles.segmentedBtnActive : ''}`}
          onClick={() => setActiveTab('STUDENTS')}
        >
          <Users size={16} />
          <span>Öğrenciler</span>
        </button>
        <button
          type="button"
          className={`${styles.segmentedBtn} ${activeTab === 'GROUPS' ? styles.segmentedBtnActive : ''}`}
          onClick={() => setActiveTab('GROUPS')}
        >
          <FolderGit2 size={16} />
          <span>Gruplar</span>
        </button>
      </div>

      {activeTab === 'GROUPS' ? (
        <CoachGroupsPage programId={programFilter || programs?.[0]?.id} />
      ) : (
        <>
          {showInvite && (
            <Card className={styles.filterCard}>
              <form onSubmit={handleInvite} className={styles.filterGrid}>
                <Input 
                  label="Öğrenci E-postası" 
                  type="email" 
                  value={inviteEmail} 
                  onChange={(e) => setInviteEmail(e.target.value)} 
                  placeholder="ogrenci@ornek.com" 
                />
                <div>
                  <label className={styles.selectLabel}>Program Seçin</label>
                  <select className={styles.select} value={inviteProgramId} onChange={(e) => setInviteProgramId(e.target.value)}>
                    <option value="">Program seç...</option>
                    {programs?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <Button type="submit" isLoading={sendInvite.isPending} style={{ width: '100%', height: '42px' }}>
                    Davet Gönder / Ekle
                  </Button>
                </div>
              </form>
              {inviteMsg && (
                <p style={{ margin: '12px 0 0', fontSize: '0.875rem', fontWeight: 600, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={16} />
                  <span>{inviteMsg}</span>
                </p>
              )}
            </Card>
          )}

          {/* Bekleyen Davetler Kartı */}
          {pendingInvites && pendingInvites.length > 0 && (
            <Card className={styles.pendingCard}>
              <div className={styles.pendingHeader}>
                <h3 className={styles.pendingTitle} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Mail size={16} /> Bekleyen Davetler ({pendingInvites.length})
                </h3>
                <span className={styles.pendingSubtitle}>Öğrenci henüz davet linkiyle giriş yapıp şifresini belirlemedi.</span>
              </div>
              <div className={styles.pendingList}>
                {pendingInvites.map((inv) => (
                  <div key={inv.id} className={styles.pendingItem}>
                    <div className={styles.pendingInfo}>
                      <div className={styles.pendingEmail}>{inv.email}</div>
                      <div className={styles.pendingMeta}>
                        <span>Program: <strong>{inv.programname || 'Genel'}</strong></span>
                        <span> • Kod: <code className={styles.codeBadge}>{inv.code}</code></span>
                      </div>
                    </div>
                    <div className={styles.pendingActions}>
                      <span className={styles.pendingBadge}>Bekliyor</span>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleCopyLink(inv.code)}
                      >
                        {copiedCode === inv.code ? 'Kopyalandı!' : 'Linki Kopyala'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Filtreler */}
          <Card className={styles.filterCard}>
            <div className={styles.filterGrid}>
              <Input
                placeholder="Öğrenci ara (isim veya e-posta)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ height: '42px' }}
              />
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
              <select
                className={styles.select}
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
              >
                <option value="">Tüm Sınıflar</option>
                {[9, 10, 11, 12].map((g) => (
                  <option key={g} value={String(g)}>{g}. Sınıf</option>
                ))}
                <option value="Mezun">Mezun</option>
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
                  <div className={`${styles.statusBadge} ${student.isActive ? styles.active : styles.inactive}`}>
                    {student.isActive ? 'Kayıtlı / Aktif' : 'Pasif'}
                  </div>
                </div>
                <div className={styles.cardFooter}>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/coach/students/${student.id}`); }}>Profili Gör</Button>
                  <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/coach/students/${student.id}`); }}>Ödev Ata</Button>
                  {student.inviteStatus === 'NOT_INVITED' && (
                    <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenInviteModal(student); }}>Davet Et</Button>
                  )}
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

      <AddStudentModal open={showAddStudent} onClose={() => setShowAddStudent(false)} onSubmit={handleCreateStudent} />

      {/* Öğrenciye Özel Davet Gönderme Modalı (window.prompt yerine) */}
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
    </div>
  );
};

export default CoachStudents;
