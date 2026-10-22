import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import Modal from '../../../components/common/Modal/Modal';
import CoachGroupsPage from '../groups/CoachGroupsPage';
import { Users, FolderGit2, BookOpen, CheckCircle2, AlertCircle, School, Mail, Search, UserPlus, Zap, ChevronDown, Copy, Check, Trash2 } from 'lucide-react';
import { useStudents, useSendInvite, usePendingInvites, useDeleteStudent } from '../coachApi';
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
  const deleteStudentMutation = useDeleteStudent();
  const [studentToDelete, setStudentToDelete] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  
  // T25: 2'li Segmentli Öğrenci Ekleme Alanı
  const [showAddForm, setShowAddForm] = useState(false);
  const [formMode, setFormMode] = useState('DIRECT'); // 'DIRECT' | 'INVITE'
  const [isPendingOpen, setIsPendingOpen] = useState(false);

  // Doğrudan Ekleme Form State
  const [directFirstName, setDirectFirstName] = useState('');
  const [directLastName, setDirectLastName] = useState('');
  const [directProgramId, setDirectProgramId] = useState('');
  const [directClassLevel, setDirectClassLevel] = useState('');
  const [directTargetExam, setDirectTargetExam] = useState('');
  const [directEmail, setDirectEmail] = useState('');
  const [directSubmitting, setDirectSubmitting] = useState(false);
  const [directSuccessData, setDirectSuccessData] = useState(null);
  const [directError, setDirectError] = useState('');
  const [directCopied, setDirectCopied] = useState(false);

  // E-posta ile Davet Gönder Form State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteProgramId, setInviteProgramId] = useState('');
  const [inviteSendEmail, setInviteSendEmail] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);

  // Modal State (Gölge profile sonradan e-posta daveti göndermek için)
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

  const handleDirectCreate = async (e) => {
    e.preventDefault();
    if (!directFirstName.trim() || !directLastName.trim()) return;
    setDirectError('');
    setDirectSubmitting(true);
    try {
      const selectedProgId = directProgramId || programs?.[0]?.id;
      const res = await createStudent.mutateAsync({
        firstName: directFirstName.trim(),
        lastName: directLastName.trim(),
        programId: selectedProgId,
        classLevel: directClassLevel ? parseInt(directClassLevel, 10) : undefined,
        targetExam: directTargetExam || undefined,
        email: directEmail.trim() || undefined,
      });
      setDirectSuccessData({
        fullName: `${directFirstName.trim()} ${directLastName.trim()}`,
        programName: programs?.find((p) => p.id === selectedProgId)?.name || 'Program',
        email: directEmail.trim() || null,
        classLevel: directClassLevel || null,
        targetExam: directTargetExam || null,
      });
      setDirectFirstName('');
      setDirectLastName('');
      setDirectEmail('');
      setDirectClassLevel('');
      setDirectTargetExam('');
    } catch (err) {
      setDirectError(err?.response?.data?.error || 'Öğrenci eklenemedi.');
    } finally {
      setDirectSubmitting(false);
    }
  };

  const handleCopyDirectInfo = () => {
    if (!directSuccessData) return;
    const lines = [
      `Öğrenci: ${directSuccessData.fullName}`,
      `Program: ${directSuccessData.programName}`,
    ];
    if (directSuccessData.classLevel) lines.push(`Sınıf: ${directSuccessData.classLevel}. Sınıf`);
    if (directSuccessData.targetExam) lines.push(`Hedef: ${directSuccessData.targetExam}`);
    if (directSuccessData.email) lines.push(`E-posta: ${directSuccessData.email}`);
    lines.push('Mentörüm Öğrenci Portalı');
    navigator.clipboard?.writeText(lines.join('\n'));
    setDirectCopied(true);
    setTimeout(() => setDirectCopied(false), 2000);
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
        relatedId: inviteProgramId,
        sendEmail: inviteSendEmail
      });

      if (res.directAdded) {
        setInviteMsg(res.message);
      } else {
        setInviteMsg(inviteSendEmail ? `Davet oluşturuldu ve e-posta gönderildi. Kod: ${res.code}` : `Davet oluşturuldu. Kod: ${res.code} (Bekleyen Davetler listesine eklendi)`);
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
        <div className={styles.titleArea}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>Öğrenciler</h1>
            <Button 
              variant={showAddForm ? 'secondary' : 'primary'} 
              size="sm"
              onClick={() => {
                setShowAddForm(!showAddForm);
                setDirectSuccessData(null);
                setDirectError('');
              }}
            >
              <UserPlus size={15} />
              <span>{showAddForm ? '✕ Formu Kapat' : '+ Yeni Öğrenci Ekle'}</span>
            </Button>
          </div>
          <p className={styles.subtitle}>Tüm öğrencilerinizin performansını ve durumunu yönetin.</p>
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
          {/* T25: 2'li Segmentli Öğrenci Ekleme Alanı */}
          {showAddForm && (
            <Card className={styles.addFormCard}>
              <div className={styles.formModeTabs}>
                <button
                  type="button"
                  className={`${styles.formModeBtn} ${formMode === 'DIRECT' ? styles.formModeBtnActive : ''}`}
                  onClick={() => { setFormMode('DIRECT'); setDirectError(''); setDirectSuccessData(null); }}
                >
                  <Zap size={14} />
                  <span>⚡ Doğrudan Ekle (Hızlı Kayıt)</span>
                </button>
                <button
                  type="button"
                  className={`${styles.formModeBtn} ${formMode === 'INVITE' ? styles.formModeBtnActive : ''}`}
                  onClick={() => { setFormMode('INVITE'); setInviteMsg(''); }}
                >
                  <Mail size={14} />
                  <span>✉️ E-posta ile Davet Gönder</span>
                </button>
              </div>

              {formMode === 'DIRECT' ? (
                directSuccessData ? (
                  <div className={styles.successPanel}>
                    <div className={styles.successIconRow}>
                      <CheckCircle2 size={24} className={styles.successIcon} />
                      <div>
                        <h4 className={styles.successTitle}>Öğrenci Başarıyla Eklendi</h4>
                        <p className={styles.successDesc}>
                          <strong>{directSuccessData.fullName}</strong> aktif öğrenci listenize eklendi.
                        </p>
                      </div>
                    </div>
                    <div className={styles.shareBox}>
                      <div className={styles.shareInfo}>
                        <span>{directSuccessData.fullName} • {directSuccessData.programName}</span>
                        {directSuccessData.classLevel && <span> ({directSuccessData.classLevel}. Sınıf)</span>}
                      </div>
                      <Button size="sm" variant="outline" onClick={handleCopyDirectInfo}>
                        {directCopied ? <Check size={14} /> : <Copy size={14} />}
                        <span>{directCopied ? 'Kopyalandı!' : 'Bilgileri Kopyala'}</span>
                      </Button>
                    </div>
                    <div className={styles.successActions}>
                      <Button variant="secondary" size="sm" onClick={() => setDirectSuccessData(null)}>
                        + Başka Öğrenci Ekle
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                        Kapat
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleDirectCreate} className={styles.directForm}>
                    <div className={styles.directRow}>
                      <Input
                        label="Öğrenci Adı *"
                        placeholder="Örn: Ahmet"
                        value={directFirstName}
                        onChange={(e) => setDirectFirstName(e.target.value)}
                        required
                      />
                      <Input
                        label="Öğrenci Soyadı *"
                        placeholder="Örn: Yılmaz"
                        value={directLastName}
                        onChange={(e) => setDirectLastName(e.target.value)}
                        required
                      />
                    </div>

                    <div className={styles.directRowThree}>
                      <div>
                        <label className={styles.selectLabel}>Program Seçin *</label>
                        <select
                          className={styles.select}
                          value={directProgramId || programs?.[0]?.id || ''}
                          onChange={(e) => setDirectProgramId(e.target.value)}
                          required
                        >
                          {programs?.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className={styles.selectLabel}>Sınıf Seviyesi</label>
                        <select
                          className={styles.select}
                          value={directClassLevel}
                          onChange={(e) => setDirectClassLevel(e.target.value)}
                        >
                          <option value="">Seçiniz</option>
                          <option value="8">8. Sınıf / LGS</option>
                          <option value="9">9. Sınıf</option>
                          <option value="10">10. Sınıf</option>
                          <option value="11">11. Sınıf</option>
                          <option value="12">12. Sınıf</option>
                          <option value="Mezun">Mezun</option>
                        </select>
                      </div>

                      <div>
                        <label className={styles.selectLabel}>Hedef Sınav / Alan</label>
                        <select
                          className={styles.select}
                          value={directTargetExam}
                          onChange={(e) => setDirectTargetExam(e.target.value)}
                        >
                          <option value="">Seçiniz (opsiyonel)</option>
                          <option value="SAY">SAY (Sayısal)</option>
                          <option value="EA">EA (Eşit Ağırlık)</option>
                          <option value="SOZ">SÖZ (Sözel)</option>
                          <option value="ORTAOKUL">LGS / Ortaokul</option>
                        </select>
                      </div>
                    </div>

                    <Input
                      label="E-posta (İsteğe Bağlı)"
                      type="email"
                      placeholder="ogrenci@ornek.com (boş bırakılabilir)"
                      value={directEmail}
                      onChange={(e) => setDirectEmail(e.target.value)}
                    />

                    <p className={styles.directHint}>
                      <CheckCircle2 size={14} />
                      <span>Öğrenciye e-posta daveti gönderilmez; doğrudan koçun aktif listesine eklenir ve hemen ödev/planlama yapılabilir.</span>
                    </p>

                    {directError && <div className={styles.formError}>{directError}</div>}

                    <div className={styles.formActions}>
                      <Button variant="ghost" type="button" onClick={() => setShowAddForm(false)}>
                        İptal
                      </Button>
                      <Button
                        variant="primary"
                        type="submit"
                        isLoading={directSubmitting}
                        disabled={!directFirstName.trim() || !directLastName.trim()}
                      >
                        + Öğrenciyi Doğrudan Ekle
                      </Button>
                    </div>
                  </form>
                )
              ) : (
                <form onSubmit={handleInvite} className={styles.directForm}>
                  <div className={styles.directRow}>
                    <Input
                      label="Öğrenci E-postası *"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="ogrenci@ornek.com"
                      required
                    />
                    <div>
                      <label className={styles.selectLabel}>Program Seçin *</label>
                      <select
                        className={styles.select}
                        value={inviteProgramId || programs?.[0]?.id || ''}
                        onChange={(e) => setInviteProgramId(e.target.value)}
                        required
                      >
                        {programs?.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <p className={styles.directHint}>
                    <Mail size={14} />
                    <span>Davet kodu ve linki oluşturulur (kopyalayıp WhatsApp ile paylaşabilirsiniz). İsterseniz e-posta ile de gönderebilirsiniz.</span>
                  </p>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-color-main)' }}>
                    <input type="checkbox" checked={inviteSendEmail} onChange={(e) => setInviteSendEmail(e.target.checked)} /> E-posta ile de gönder
                  </label>

                  {inviteMsg && (
                    <p className={styles.inviteSuccessInline}>
                      <CheckCircle2 size={16} />
                      <span>{inviteMsg}</span>
                    </p>
                  )}

                  <div className={styles.formActions}>
                    <Button variant="ghost" type="button" onClick={() => setShowAddForm(false)}>
                      İptal
                    </Button>
                    <Button
                      variant="primary"
                      type="submit"
                      isLoading={sendInvite.isPending}
                      disabled={!inviteEmail.trim()}
                    >
                      Davet Gönder
                    </Button>
                  </div>
                </form>
              )}
            </Card>
          )}

          {/* T26: Bekleyen Davetler Akordeon Kartı */}
          {pendingInvites && pendingInvites.length > 0 && (
            <Card className={styles.pendingCard}>
              <div
                className={styles.pendingAccordionHeader}
                onClick={() => setIsPendingOpen(!isPendingOpen)}
                role="button"
                tabIndex={0}
              >
                <div className={styles.pendingHeaderLeft}>
                  <Mail size={16} className={styles.pendingMailIcon} />
                  <span className={styles.pendingTitle}>Bekleyen Davetler ({pendingInvites.length})</span>
                  <span className={styles.pendingSubtitle}>Öğrenci henüz sisteme giriş yapmadı</span>
                </div>
                <div className={styles.accordionToggle}>
                  <span className={styles.toggleText}>{isPendingOpen ? 'Listeyi Gizle' : 'Listeyi Aç'}</span>
                  <ChevronDown size={18} className={`${styles.chevron} ${isPendingOpen ? styles.chevronOpen : ''}`} />
                </div>
              </div>
              {isPendingOpen && (
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
              )}
            </Card>
          )}

          {/* T26: Filtreler (Eşit 42px yükseklik ve hizalı grid) */}
          <Card className={styles.filterCard}>
            <div className={styles.filterGrid}>
              <Input
                placeholder="Öğrenci ara (isim veya e-posta)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
                <option value="8">8. Sınıf / LGS</option>
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
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    style={{ color: 'var(--color-danger, #ef4444)', marginLeft: 'auto' }} 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setStudentToDelete(student); 
                    }}
                    title="Öğrenciyi Sil"
                  >
                    <Trash2 size={14} />
                    <span>Sil</span>
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

      {/* Öğrenci Silme Onay Modalı */}
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
    </div>
  );
};

export default CoachStudents;
