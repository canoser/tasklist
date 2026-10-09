import React from 'react';
import { useMe, usePrograms } from '../coachSchoolApi';
import Card from '../../../components/common/Card/Card';
import styles from './CoachProfilePage.module.css';

const CoachProfilePage = () => {
  const { data: me, isLoading } = useMe();
  const { data: programs } = usePrograms();

  if (isLoading) return <div className={styles.container}><p>Yükleniyor...</p></div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Profilim</h1>

      <Card className={styles.card} padding="lg">
        <div className={styles.avatar}>{me?.fullName?.charAt(0) || 'K'}</div>
        <h2 className={styles.name}>{me?.fullName || 'Koç'}</h2>
        <p className={styles.meta}>{me?.email}</p>
        <p className={styles.meta}>Rol: {me?.role === 'Admin' ? 'Yönetici' : 'Koç'}</p>
      </Card>

      <Card className={styles.card} padding="lg">
        <h3 className={styles.sectionTitle}>Programlarım ({programs?.length || 0})</h3>
        {programs?.length > 0 ? (
          programs.map((p) => (
            <div key={p.id} className={styles.item}>
              <strong>{p.name}</strong>
              <span className={styles.meta}> · {p.role === 'YONETICI' ? 'Yönetici' : 'Yardımcı'}</span>
              <span className={styles.meta}> · {p.studentCount || 0} öğrenci</span>
            </div>
          ))
        ) : (
          <p className={styles.meta}>Henüz program oluşturmadınız.</p>
        )}
      </Card>
    </div>
  );
};

export default CoachProfilePage;
