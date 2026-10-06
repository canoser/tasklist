import React from 'react';
import { useParams } from 'react-router-dom';
import { useProgramCoaches, useRemoveProgramCoach, useTransferAdmin } from '../coachSchoolApi';
import { useSendInvite } from '../coachApi';
import Button from '../../../components/common/Button/Button';
import Card from '../../../components/common/Card/Card';
import styles from './CoachProgramSettingsPage.module.css';

const CoachProgramSettingsPage = () => {
  const { programId } = useParams();
  const { data: coaches, isLoading } = useProgramCoaches(programId);
  const removeCoach = useRemoveProgramCoach();
  const transferAdmin = useTransferAdmin();
  const sendInvite = useSendInvite();

  const handleInviteAssistant = async () => {
    const email = prompt('Yardımcı koçun e-postası:');
    if (!email) return;
    const res = await sendInvite.mutateAsync({ email, role: 'Coach', relatedId: programId });
    alert(`Davet oluşturuldu. Kod: ${res.code}`);
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Program Ayarları</h1>

      <Button onClick={handleInviteAssistant} isLoading={sendInvite.isPending}>Yardımcı Koç Davet Et</Button>

      <div className={styles.list}>
        {isLoading && <p>Yükleniyor...</p>}
        {coaches?.map((c) => (
          <Card key={c.coachId} className={styles.item} padding="md">
            <div className={styles.itemHeader}>
              <strong>{c.fullName}</strong>
              <span className={styles.badge}>{c.role === 'YONETICI' ? 'Yönetici' : 'Yardımcı'}</span>
            </div>
            <div className={styles.email}>{c.email}</div>
            <div className={styles.actions}>
              {c.role === 'YARDIMCI' && (
                <>
                  <Button size="sm" onClick={() => transferAdmin.mutateAsync({ programId, coachId: c.coachId })}>Yönetici Yap</Button>
                  <Button size="sm" variant="outline" onClick={() => removeCoach.mutateAsync({ programId, coachId: c.coachId })}>Çıkar</Button>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CoachProgramSettingsPage;
