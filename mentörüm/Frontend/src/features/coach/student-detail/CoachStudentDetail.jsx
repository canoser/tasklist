import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import AssignHomeworkModal from '../homework/AssignHomeworkModal';
import styles from './CoachStudentDetail.module.css';
import { useStudent, useStudentNotes, useUpdateCoachNotes, useAddExamResult, useSendInvite, useCoachStudentHomework, useCoachStudentCurriculum, useCoachStudentEvents, useCoachStudentSessions, useCreateCoachingSession, useStudentTeacherNotes } from '../coachApi';
import { useGroups } from '../coachSchoolApi';
import { useMoveToGroup, useMoveToIndividual } from '../studentFlexibilityApi';
import { apiClient } from '../../../api/apiClient';
import InviteSharePanel from '../../../components/common/InviteSharePanel/InviteSharePanel';
import ParentPermissionsPanel from './ParentPermissionsPanel';
import WeeklyTimeBudgetCard from './WeeklyTimeBudgetCard';
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
  ShieldAlert 
} from 'lucide-react';

const CoachStudentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('info');
  const [isHomeworkModalOpen, setIsHomeworkModalOpen] = useState(false);
  const [localNotes, setLocalNotes] = useState('');
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionActions, setSessionActions] = useState('');
  const moveToGroup = useMoveToGroup(student?.programId);
  const moveToIndividual = useMoveToIndividual(student?.programId);
  const { data: groups = [] } = useGroups(student?.programId);
  const [selectedGroupId, setSelectedGroupId] = useState('');

  const getGroupForTab = (tab) => {
    if (['info', 'timeBudget', 'events'].includes(tab)) return 'general';
    if (['homework', 'exams', 'topics'].includes(tab)) return 'academic';
    if (['sessions', 'notes', 'teacherNotes'].includes(tab)) return 'sessions';
    return 'parents';
  };

  const activeGroup = getGroupForTab(activeTab);

  const handleSelectGroup = (groupId) => {
    if (groupId === 'general') setActiveTab('info');
    else if (groupId === 'academic') setActiveTab('homework');
    else if (groupId === 'sessions') setActiveTab('sessions');
    else if (groupId === 'parents') setActiveTab('parents');
  };

  const { data: student, isLoading, isError } = useStudent(id);
  const { data: notesList, isLoading: isNotesLoading } = useStudentNotes(id);
  const { data: studentHomeworks } = useCoachStudentHomework(id);
  const { data: curriculum } = useCoachStudentCurriculum(id);
  const { data: studentEvents } = useCoachStudentEvents(id);
  const { data: sessions } = useCoachStudentSessions(id);
  const { data: teacherNotes = [] } = useStudentTeacherNotes(id);
  const createSession = useCreateCoachingSession(id);
  const updateNotesMutation = useUpdateCoachNotes();
  const addExamMutation = useAddExamResult();
  const sendInviteMutation = useSendInvite();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteResult, setInviteResult] = useState(null);

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
          <Button variant="secondary">
            <Edit3 size={15} />
            <span>Düzenle</span>
          </Button>
          <Button variant="primary" onClick={() => setIsHomeworkModalOpen(true)}>
            <PlusCircle size={15} />
            <span>Ödev Ata</span>
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
          <span>Akademik</span>
        </button>
        <button
          type="button"
          className={`${styles.groupTab} ${activeGroup === 'sessions' ? styles.groupTabActive : ''}`}
          onClick={() => handleSelectGroup('sessions')}
        >
          <MessageSquare size={16} />
          <span>Seans & Notlar</span>
          {teacherNotes.length > 0 && (
            <span className={styles.miniBadge}>{teacherNotes.length}</span>
          )}
        </button>
        <button
          type="button"
          className={`${styles.groupTab} ${activeGroup === 'parents' ? styles.groupTabActive : ''}`}
          onClick={() => handleSelectGroup('parents')}
        >
          <Users size={16} />
          <span>Veli & İletişim</span>
        </button>
      </div>

      {/* Seçili Gruba Ait Alt Hap Sekmeler (Pills) */}
      {activeGroup !== 'parents' && (
        <div className={styles.subPills}>
          {activeGroup === 'general' && (
            <>
              <button
                type="button"
                className={`${styles.subPill} ${activeTab === 'info' ? styles.subPillActive : ''}`}
                onClick={() => setActiveTab('info')}
              >
                Kişisel Bilgiler & Hedef
              </button>
              <button
                type="button"
                className={`${styles.subPill} ${activeTab === 'timeBudget' ? styles.subPillActive : ''}`}
                onClick={() => setActiveTab('timeBudget')}
              >
                Zaman Bütçesi
              </button>
              <button
                type="button"
                className={`${styles.subPill} ${activeTab === 'events' ? styles.subPillActive : ''}`}
                onClick={() => setActiveTab('events')}
              >
                Kişisel Takvim
              </button>
            </>
          )}

          {activeGroup === 'academic' && (
            <>
              <button
                type="button"
                className={`${styles.subPill} ${activeTab === 'homework' ? styles.subPillActive : ''}`}
                onClick={() => setActiveTab('homework')}
              >
                Ödevler
              </button>
              <button
                type="button"
                className={`${styles.subPill} ${activeTab === 'exams' ? styles.subPillActive : ''}`}
                onClick={() => setActiveTab('exams')}
              >
                Sınav Geçmişi
              </button>
              <button
                type="button"
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
                type="button"
                className={`${styles.subPill} ${activeTab === 'sessions' ? styles.subPillActive : ''}`}
                onClick={() => setActiveTab('sessions')}
              >
                Koçluk Görüşmeleri
              </button>
              <button
                type="button"
                className={`${styles.subPill} ${activeTab === 'notes' ? styles.subPillActive : ''}`}
                onClick={() => setActiveTab('notes')}
              >
                Koç Özel Notları
              </button>
              <button
                type="button"
                className={`${styles.subPill} ${activeTab === 'teacherNotes' ? styles.subPillActive : ''}`}
                onClick={() => setActiveTab('teacherNotes')}
              >
                Öğretmen Notları {teacherNotes.length > 0 && `(${teacherNotes.length})`}
              </button>
            </>
          )}
        </div>
      )}

      {/* Sekme İçerikleri */}
      <div className={styles.tabContent}>
        
        {/* Kişisel Bilgiler Sekmesi */}
        {activeTab === 'info' && (
          <div className={styles.grid}>
            <Card title="İletişim Bilgileri">
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Telefon:</span>
                <span className={styles.infoValue}>{student.phone || '-'}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>E-Posta:</span>
                <span className={styles.infoValue}>{student.email || '-'}</span>
              </div>
            </Card>

            <Card title="Akademik Hedef">
              <div className={styles.targetBanner}>
                <GraduationCap size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                <span>{student.targetUniversity || student.target || 'Hedef girilmemiş'}</span>
                {student.targetDepartment ? ` · ${student.targetDepartment}` : ''}
              </div>
              {student.targetScore != null && (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Hedef Net:</span>
                  <span className={styles.infoValue}>{student.targetScore}</span>
                </div>
              )}
            </Card>

            <Card title="Grup / Bireysel Yönetimi">
              <div className={styles.groupManageControls}>
                <select 
                  className={styles.groupSelect}
                  value={selectedGroupId} 
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                >
                  <option value="">Gruba taşımak için grup seçin</option>
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  disabled={!selectedGroupId || moveToGroup.isPending} 
                  onClick={() => moveToGroup.mutate({ studentId: id, groupId: selectedGroupId })}
                >
                  Gruba Taşı
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  disabled={moveToIndividual.isPending}
                  onClick={() => moveToIndividual.mutate(id)}
                >
                  Bireysele Çek
                </Button>
              </div>
              <div className={styles.groupStatsNote}>
                <span><strong>Güncel Bireysel Ödevler:</strong> {(studentHomeworks || []).filter((h) => h.courseType === 'OZEL_DERS').length}</span>
                <span className={styles.statsSeparator}>•</span>
                <span><strong>Geçmiş Grup Ödevleri:</strong> {(studentHomeworks || []).filter((h) => h.courseType !== 'OZEL_DERS').length}</span>
              </div>
            </Card>
          </div>
        )}

        {/* Veli Bilgileri Sekmesi */}
        {activeTab === 'parents' && (
          <div className={styles.grid}>
            {student.parents?.length > 0 ? student.parents.map(parent => (
              <Card key={parent.id} title={`${parent.relation} Bilgileri`}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Ad Soyad:</span>
                  <span className={styles.infoValue}>{parent.fullName}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Telefon:</span>
                  <span className={styles.infoValue}>{parent.phone}</span>
                </div>
                <ParentPermissionsPanel studentId={id} parentId={parent.id} />
                <div className={styles.mt4}>
                  <Button variant="secondary" size="sm">Düzenle</Button>
                </div>
              </Card>
            )) : (
              <p>Kayıtlı veli bulunamadı.</p>
            )}
            <Card className={styles.addParentCard} title="Veli Davet Et">
              <div className={styles.inviteForm}>
                <Input
                  label="Veli E-Posta"
                  type="email"
                  placeholder="veli@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
                <Button
                  variant="primary"
                  size="sm"
                  disabled={sendInviteMutation.isPending || !inviteEmail.trim()}
                  onClick={() => {
                    sendInviteMutation.mutate(
                      { email: inviteEmail, role: 'Parent', relatedId: id },
                      { onSuccess: (data) => setInviteResult(data) }
                    );
                  }}
                >
                  {sendInviteMutation.isPending ? 'Oluşturuluyor...' : 'Davet Oluştur'}
                </Button>
                {sendInviteMutation.isError && (
                  <p style={{ color: 'red', fontSize: '0.85rem' }}>Davet oluşturulamadı.</p>
                )}
              </div>
              {inviteResult && (
                <InviteSharePanel
                  code={inviteResult.code}
                  link={inviteResult.link}
                  expiresAt={inviteResult.expiresAt}
                />
              )}
            </Card>
          </div>
        )}

        {/* Zaman Bütçesi Sekmesi (T43) */}
        {activeTab === 'timeBudget' && (
          <WeeklyTimeBudgetCard studentId={id} />
        )}

        {/* Öğretmen Notları Sekmesi (T55) */}
        {activeTab === 'teacherNotes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {teacherNotes.length === 0 && (
              <Card padding="lg">
                <div style={{ color: 'var(--text-secondary)' }}>Bu öğrenciye ait öğretmen notu bulunmuyor.</div>
              </Card>
            )}
            {teacherNotes.map((tn) => (
              <Card key={tn.id} padding="md" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {tn.createdAt ? new Date(tn.createdAt).toLocaleString('tr-TR') : ''}
                  </span>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: tn.visibility === 'COACH_ONLY' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    color: tn.visibility === 'COACH_ONLY' ? 'var(--color-danger, #ef4444)' : 'var(--color-success, #10b981)'
                  }}>
                    {tn.visibility === 'COACH_ONLY' ? 'Sadece Koç Görür' : 'Öğrenciye Açık'}
                  </span>
                </div>
                {tn.summary && (
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Özet: {tn.summary}
                  </div>
                )}
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                  {tn.note}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Koç Özel Notları Sekmesi */}
        {activeTab === 'notes' && (
          <Card title="Gizli Notlar (Öğrenci Göremez)" className={styles.notesCard}>
            <div className={styles.notesWarning}>
              <ShieldAlert size={16} style={{ flexShrink: 0 }} />
              <span>Bu sekmedeki notlar tamamen size özeldir. Öğrenci veya veli paneline yansımaz.</span>
            </div>
            {/* Geçmiş Notların Listesi */}
            <div style={{ marginBottom: '20px', maxHeight: '300px', overflowY: 'auto' }}>
              {isNotesLoading ? (
                <p>Notlar yükleniyor...</p>
              ) : notesList && notesList.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {notesList.map(note => (
                    <div key={note.id} style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '5px' }}>
                        {new Date(note.createdAt).toLocaleString()}
                      </div>
                      <div style={{ whiteSpace: 'pre-wrap', color: '#334155' }}>{note.content}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#64748b' }}>Henüz not eklenmemiş.</p>
              )}
            </div>

            <h4 style={{ marginBottom: '10px' }}>Yeni Not Ekle</h4>
            <textarea 
              className={styles.notesArea}
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              rows={4}
              placeholder="Öğrenci hakkında özel notlarınızı buraya girebilirsiniz..."
            />
            <div className={styles.mt4}>
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

        {/* Sınav Geçmişi Sekmesi */}
        {activeTab === 'exams' && (
          <Card title="Sınav Geçmişi" className={styles.notesCard}>
            <div className={styles.grid}>
              {student.examResults?.length > 0 ? student.examResults.map(exam => (
                <Card key={exam.id} title={`${exam.examName || exam.examType}`}>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Tarih:</span>
                    <span className={styles.infoValue}>{exam.examDate ? new Date(exam.examDate).toLocaleDateString() : '-'}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Net:</span>
                    <span className={styles.infoValue}>{exam.totalNet}</span>
                  </div>
                </Card>
              )) : (
                <p>Henüz sınav sonucu eklenmemiş.</p>
              )}
            </div>
            
            <div style={{ margin: '20px 0', borderTop: '1px solid #eee' }} />
            
            <h4>Yeni Sınav Ekle</h4>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap', marginTop: '15px' }}>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <Input label="Sınav Adı" id="examName" placeholder="Örn: TYT Deneme 1" />
              </div>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <Input label="Tarih" id="examDate" type="date" />
              </div>
              <div style={{ flex: 1, minWidth: '100px' }}>
                <Input label="Toplam Net" id="examNet" type="number" step="0.25" placeholder="0" />
              </div>
              <Button 
                variant="primary" 
                disabled={addExamMutation.isPending}
                onClick={() => {
                  const nameEl = document.getElementById('examName');
                  const dateEl = document.getElementById('examDate');
                  const netEl = document.getElementById('examNet');
                  
                  if (nameEl.value && dateEl.value && netEl.value) {
                    addExamMutation.mutate({ 
                      studentId: id, 
                      examData: { examName: nameEl.value, examDate: dateEl.value, totalNet: parseFloat(netEl.value), examType: 'Deneme' } 
                    });
                    nameEl.value = '';
                    dateEl.value = '';
                    netEl.value = '';
                  } else {
                    alert('Lütfen tüm alanları doldurun');
                  }
                }}
              >
                {addExamMutation.isPending ? 'Ekleniyor...' : 'Ekle'}
              </Button>
            </div>
          </Card>
        )}
        {/* Ödevler Sekmesi */}
        {activeTab === 'homework' && (
          <Card title="Ödev Geçmişi" className={styles.notesCard}>
            {studentHomeworks && studentHomeworks.length > 0 ? (
              studentHomeworks.map((hw) => (
                <div key={hw.id} style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <div>
                    <strong>{hw.snapshotTitle}</strong>
                    {hw.subjectName && <span style={{ marginLeft: 8, fontSize: '0.8rem', color: '#64748b' }}>{hw.subjectName}</span>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{hw.dueDate ? new Date(hw.dueDate).toLocaleDateString('tr-TR') : '-'}</div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: hw.status === 'OVERDUE' ? '#ef4444' : hw.status === 'DONE' ? '#22c55e' : '#64748b' }}>
                      {hw.status === 'OVERDUE' ? 'Gecikmiş' : hw.status === 'DONE' ? 'Tamamlandı' : 'Bekliyor'}
                      {hw.completionPercentage != null ? ` · %${hw.completionPercentage}` : ''}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p>Henüz ödev atanmamış.</p>
            )}
          </Card>
        )}

        {/* Konular Sekmesi */}
        {activeTab === 'topics' && (
          <Card title="Konu Takibi" className={styles.notesCard}>
            {curriculum && curriculum.length > 0 ? (
              curriculum.map((t) => (
                <div key={t.id} style={{ padding: '6px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {t.isCompleted ? <CheckCircle2 size={14} color="#16a34a" /> : <Square size={14} color="#94a3b8" />}
                    <span>{t.topicName}</span>
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{t.subjectName}</span>
                </div>
              ))
            ) : (
              <p>Müfredat bulunamadı.</p>
            )}
          </Card>
        )}
        {/* Takvim Sekmesi (öğrencinin kişisel etkinlikleri — Koç Görünürlüğü) */}
        {activeTab === 'events' && (
          <Card title="Öğrencinin Kişisel Takvimi" className={styles.notesCard}>
            {studentEvents && studentEvents.length > 0 ? (
              studentEvents.map((ev) => (
                <div key={ev.id} style={{ padding: '6px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <span>{ev.title}</span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
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
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{s.sessionDate ? new Date(s.sessionDate).toLocaleDateString('tr-TR') : '-'}</span>
                  </div>
                  {s.notes && <p style={{ fontSize: '0.85rem', color: '#475569', margin: '4px 0' }}>{s.notes}</p>}
                  {s.actionItems && (
                    <p style={{ fontSize: '0.8rem', color: '#b45309', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 5 }}>
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
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Görüşme Notları</label>
                <textarea value={sessionNotes} onChange={(e) => setSessionNotes(e.target.value)} rows={3} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0' }} />
              </div>
              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Aksiyon Öğeleri</label>
                <textarea value={sessionActions} onChange={(e) => setSessionActions(e.target.value)} rows={2} placeholder="örn. Bu hafta 3 deneme çözecek" style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0' }} />
              </div>
              <div style={{ marginTop: 12 }}>
                <Button variant="primary" size="sm" onClick={handleCreateSession} disabled={createSession.isPending}>
                  {createSession.isPending ? 'Ekleniyor...' : 'Görüşmeyi Kaydet'}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      <AssignHomeworkModal 
        isOpen={isHomeworkModalOpen} 
        onClose={() => setIsHomeworkModalOpen(false)}
        selectedStudent={student}
      />
    </div>
  );
};

export default CoachStudentDetail;
