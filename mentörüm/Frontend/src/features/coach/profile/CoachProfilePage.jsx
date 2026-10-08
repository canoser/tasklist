import React from 'react';
import { useMe } from '../coachSchoolApi';
import Card from '../../../components/common/Card/Card';
import styles from './CoachProfilePage.module.css';

const CoachProfilePage = () => {
  const { data: me, isLoading } = useMe();

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
    </div>
  );
};

export default CoachProfilePage;
