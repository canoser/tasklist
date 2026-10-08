import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTeachers, useDeactivateTeacher } from '../coachSchoolApi';
import { useSendInvite } from '../coachApi';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import Card from '../../../components/common/Card/Card';
import styles from './CoachTeachersPage.module.css';

const CoachTeachersPage = () => {
  const { programId } = useParams();
  const navigate = useNavigate();
  const { data: teachers, isLoading } = useTeachers(programId);
  const deactivateTeacher = useDeactivateTeacher();
  const sendInvite = useSendInvite();

  const [email, setEmail] = useState('');
  const [inviteMsg, setInviteMsg] = useState('');

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    const res = await sendInvite.mutateAsync({ email: email.trim(), role: 'Teacher', relatedId: programId });
    setInviteMsg(`Davet oluşturuldu. Kod: ${res.code}`);
    setEmail('');
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Öğretmenler</h1>

      <Card className={styles.card} padding="md">
        <form onSubmit={handleInvite} className={styles.form}>
          <Input label="Öğretmen E-postası" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ogretmen@ornek.com" type="email" />
          <Button type="submit" isLoading={sendInvite.isPending}>Davet Gönder</Button>
          {inviteMsg && <p className={styles.msg}>{inviteMsg}</p>}
        </form>
      </Card>

      <div className={styles.list}>
        {isLoading && <p>Yükleniyor...</p>}
        {teachers?.map((t) => (
          <Card key={t.id} className={styles.item} padding="md" interactive onClick={() => navigate(`/coach/programs/${programId}/teachers/${t.id}`)}>
            <div className={styles.itemHeader}>
              <strong>{t.fullName}</strong>
              <span className={t.isActive ? styles.active : styles.inactive}>{t.isActive ? 'Aktif' : 'Pasif'}</span>
            </div>
            <div className={styles.email}>{t.email}</div>
            {t.isActive === 1 && (
              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); deactivateTeacher.mutateAsync({ programId, teacherId: t.id }); }}>
                Pasife Al
              </Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CoachTeachersPage;
