import React from 'react';
import { usePendingCoaches, useApproveCoach, useRejectCoach } from '../coach/coachSchoolApi';
import Button from '../../components/common/Button/Button';
import Card from '../../components/common/Card/Card';
import styles from './AdminPanelPage.module.css';

const AdminPanelPage = () => {
  const { data: pending, isLoading } = usePendingCoaches();
  const approve = useApproveCoach();
  const reject = useRejectCoach();

  const handleApprove = (coachId) => {
    const maxPrograms = prompt('Program limiti (boş = varsayılan):');
    const parsed = maxPrograms ? parseInt(maxPrograms, 10) : null;
    approve.mutateAsync({ coachId, maxPrograms: Number.isNaN(parsed) ? null : parsed });
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Koç Onayları</h1>
      <div className={styles.list}>
        {isLoading && <p>Yükleniyor...</p>}
        {pending?.length === 0 && <p>Bekleyen koç yok.</p>}
        {pending?.map((c) => (
          <Card key={c.id} className={styles.item} padding="md">
            <div className={styles.itemHeader}>
              <strong>{c.fullName}</strong>
              <span className={styles.badge}>Bekliyor</span>
            </div>
            <div className={styles.email}>{c.email}</div>
            <div className={styles.actions}>
              <Button size="sm" onClick={() => handleApprove(c.id)} isLoading={approve.isPending}>Onayla</Button>
              <Button size="sm" variant="outline" onClick={() => reject.mutateAsync({ coachId: c.id })} isLoading={reject.isPending}>Reddet</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminPanelPage;
