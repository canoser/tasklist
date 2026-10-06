import React from 'react';
import { useAuthStore } from '../../../features/auth/authStore';
import Card from '../../../components/common/Card/Card';
import styles from './TeacherProfilePage.module.css';

const TeacherProfilePage = () => {
  const { user } = useAuthStore();
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Profilim</h1>
      <Card className={styles.card} padding="md">
        <div className={styles.avatar}>{user?.fullName?.charAt(0) || 'T'}</div>
        <h2 className={styles.name}>{user?.fullName || 'Öğretmen'}</h2>
        <p className={styles.meta}>{user?.email}</p>
        <p className={styles.meta}>Rol: Öğretmen</p>
      </Card>
    </div>
  );
};

export default TeacherProfilePage;