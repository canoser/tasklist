import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import { useStudents, useSendInvite, usePendingInvites } from '../coachApi';
import { usePrograms } from '../coachSchoolApi';
import styles from './CoachStudents.module.css';

const CoachStudents = () => {
  const navigate = useNavigate();
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
        setInviteMsg(`✅ ${res.message}`);
      } else {
        setInviteMsg(`✅ Davet oluşturuldu. Kod: ${res.code} (Bekleyen Davetler listesine eklendi)`);
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
        <Button variant="primary" onClick={() => setShowInvite(!showInvite)}>
          {showInvite ? '✕ İptal' : '+ Yeni Öğrenci Ekle'}
        </Button>
      </header>

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
            <p style={{ margin: '12px 0 0', fontSize: '0.875rem', fontWeight: 600, color: inviteMsg.startsWith('✅') ? '#16a34a' : '#dc2626' }}>
              {inviteMsg}
            </p>
          )}
        </Card>
      )}

      {/* Bekleyen Davetler Kartı */}
      {pendingInvites && pendingInvites.length > 0 && (
        <Card className={styles.pendingCard}>
          <div className={styles.pendingHeader}>
            <h3 className={styles.pendingTitle}>📬 Bekleyen Davetler ({pendingInvites.length})</h3>
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
                    variant="secondary" 
                    size="sm" 
                    onClick={() => handleCopyLink(inv.code)}
                  >
                    {copiedCode === inv.code ? '✓ Kopyalandı' : '🔗 Linki Kopyala'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className={styles.filterCard}>
        <Input placeholder="Öğrenci ara (isim veya e-posta)..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <select 
            value={programFilter} 
            onChange={(e) => setProgramFilter(e.target.value)} 
            style={{ 
              padding: '6px 10px', 
              borderRadius: 8, 
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-color-surface)',
              color: 'var(--text-color-main)',
              outline: 'none',
              fontSize: '0.875rem'
            }}
          >
            <option value="">Tüm Programlar</option>
            {programs?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select 
            value={gradeFilter} 
            onChange={(e) => setGradeFilter(e.target.value)} 
            style={{ 
              padding: '6px 10px', 
              borderRadius: 8, 
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-color-surface)',
              color: 'var(--text-color-main)',
              outline: 'none',
              fontSize: '0.875rem'
            }}
          >
            <option value="">Tüm Sınıflar</option>
            {[...new Set((students || []).map((s) => s.grade).filter((g) => g != null))].map((g) => (
              <option key={g} value={g}>{g}. Sınıf</option>
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
                  {student.programName ? ` • 🏫 ${student.programName}` : ''}
                </span>
                <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 999, background: '#eef2ff', color: '#4f46e5' }}>📚 {student.activeHomeworkCount}</span>
                  <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 999, background: '#f0fdf4', color: '#16a34a' }}>✅ {student.completedHomeworkCount}</span>
                  <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 999, background: student.overdueHomeworkCount > 0 ? '#fef2f2' : '#f8fafc', color: student.overdueHomeworkCount > 0 ? '#dc2626' : '#94a3b8' }}>🔴 {student.overdueHomeworkCount}</span>
                </div>
              </div>
              <div className={`${styles.statusBadge} ${student.isActive ? styles.active : styles.inactive}`}>
                {student.isActive ? 'Kayıtlı / Aktif' : 'Pasif'}
              </div>
            </div>
            <div className={styles.cardFooter}>
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/coach/students/${student.id}`); }}>Profili Gör</Button>
              <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/coach/students/${student.id}`); }}>Ödev Ata</Button>
            </div>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🔍</div>
          <h3>Öğrenci Bulunamadı</h3>
          <p>Kayıtlı öğrenciniz yok veya arama sonucuyla eşleşmedi. "+ Yeni Öğrenci Ekle" ile davet gönderin.</p>
        </div>
      )}
    </div>
  );
};

export default CoachStudents;
