import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import AssignHomeworkModal from '../homework/AssignHomeworkModal';
import styles from './CoachStudentDetail.module.css';
import { useStudent, useStudentNotes, useUpdateCoachNotes, useAddExamResult, useSendInvite } from '../coachApi';
import InviteSharePanel from '../../../components/common/InviteSharePanel/InviteSharePanel';

const CoachStudentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('info');
  const [isHomeworkModalOpen, setIsHomeworkModalOpen] = useState(false);
  const [localNotes, setLocalNotes] = useState('');

  const { data: student, isLoading, isError } = useStudent(id);
  const { data: notesList, isLoading: isNotesLoading } = useStudentNotes(id);
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

  return (
    <div className={styles.pageContainer}>
      {/* Üst Bilgi Başlığı */}
      <div className={styles.topHeader}>
        <Button variant="ghost" onClick={() => navigate('/coach/students')} icon="←">
          Öğrencilere Dön
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
          <Button variant="secondary" icon="✏️">Düzenle</Button>
          <Button variant="primary" icon="📝" onClick={() => setIsHomeworkModalOpen(true)}>Ödev Ata</Button>
        </div>
      </header>

      {/* Sekmeler */}
      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'info' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('info')}
        >
          Kişisel Bilgiler
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'parents' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('parents')}
        >
          Veli Bilgileri
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'notes' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          Koç Özel Notları
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'exams' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('exams')}
        >
          Sınav Geçmişi
        </button>
      </div>

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
                🎓 {student.targetUniversity || student.target || 'Hedef girilmemiş'}
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

        {/* Koç Özel Notları Sekmesi */}
        {activeTab === 'notes' && (
          <Card title="Gizli Notlar (Öğrenci Göremez)" className={styles.notesCard}>
            <div className={styles.notesWarning}>
              ⚠️ Bu sekmedeki notlar tamamen size özeldir. Öğrenci veya veli paneline yansımaz.
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
