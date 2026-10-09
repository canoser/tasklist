import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import { useStudents, useSendInvite } from '../coachApi';
import { usePrograms } from '../coachSchoolApi';
import styles from './CoachStudents.module.css';

const CoachStudents = () => {
  const navigate = useNavigate();
  const { data: students, isLoading } = useStudents();
  const { data: programs } = usePrograms();
  const sendInvite = useSendInvite();

  const [searchTerm, setSearchTerm] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteProgramId, setInviteProgramId] = useState('');
  const [inviteMsg, setInviteMsg] = useState('');

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteProgramId) { setInviteMsg('E-posta ve program zorunludur.'); return; }
    setInviteMsg('');
    try {
      const res = await sendInvite.mutateAsync({ email: inviteEmail.trim(), role: 'Student', relatedId: inviteProgramId });
      setInviteMsg(`Davet oluşturuldu. Kod: ${res.code}`);
      setInviteEmail('');
    } catch (err) {
      setInviteMsg(err?.response?.data?.error || 'Davet gönderilemedi.');
    }
  };

  const filtered = (students || []).filter((s) =>
    (s.fullName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) return <div className={styles.pageContainer}>Yükleniyor...</div>;

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Öğrenciler</h1>
          <p className={styles.subtitle}>Tüm öğrencilerinizin performansını ve durumunu yönetin.</p>
        </div>
        <Button variant="primary" onClick={() => setShowInvite(!showInvite)}>+ Yeni Öğrenci Ekle</Button>
      </header>

      {showInvite && (
        <Card className={styles.filterCard}>
          <form onSubmit={handleInvite} className={styles.filterGrid}>
            <Input label="Öğrenci E-postası" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="ogrenci@ornek.com" />
            <select className={styles.select} value={inviteProgramId} onChange={(e) => setInviteProgramId(e.target.value)}>
              <option value="">Program seç</option>
              {programs?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <Button type="submit" isLoading={sendInvite.isPending}>Davet Gönder</Button>
          </form>
          {inviteMsg && <p style={{ margin: '10px 0 0', fontSize: '0.85rem', color: inviteMsg.startsWith('Davet') ? '#16a34a' : '#dc2626' }}>{inviteMsg}</p>}
        </Card>
      )}

      <Card className={styles.filterCard}>
        <Input placeholder="Öğrenci ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </Card>

      <div className={styles.studentsGrid}>
        {filtered.map((student) => (
          <Card key={student.id} interactive className={styles.studentCard} onClick={() => navigate(`/coach/students/${student.id}`)}>
            <div className={styles.cardHeader}>
              <div className={styles.avatar}>{student.fullName?.charAt(0) || '?'}</div>
              <div className={styles.studentMeta}>
                <h3 className={styles.studentName}>{student.fullName}</h3>
                <span className={styles.studentDetail}>
                  {student.grade != null ? `${student.grade}. Sınıf` : ''}
                  {student.track ? ` • ${student.track}` : ''}
                </span>
              </div>
              <div className={`${styles.statusBadge} ${student.isActive ? styles.active : styles.inactive}`}>
                {student.isActive ? 'Aktif' : 'Pasif'}
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
          <p>Henüz öğrenci eklemediniz. "Yeni Öğrenci Ekle" ile davet gönderin.</p>
        </div>
      )}
    </div>
  );
};

export default CoachStudents;
