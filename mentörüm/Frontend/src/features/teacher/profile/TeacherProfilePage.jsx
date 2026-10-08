import React from 'react';
import { useTeacherProfile } from '../teacherApi';
import Card from '../../../components/common/Card/Card';
import styles from './TeacherProfilePage.module.css';

const TeacherProfilePage = () => {
  const { data: profile, isLoading } = useTeacherProfile();

  if (isLoading) return <div className={styles.container}><p>Yükleniyor...</p></div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Profilim</h1>

      <Card className={styles.card} padding="lg">
        <div className={styles.avatar}>{profile?.fullName?.charAt(0) || 'T'}</div>
        <h2 className={styles.name}>{profile?.fullName || 'Öğretmen'}</h2>
        <p className={styles.meta}>{profile?.email}</p>
      </Card>

      <Card className={styles.card} padding="lg">
        <h3 className={styles.sectionTitle}>Bağlı Programlar</h3>
        {profile?.programs?.length > 0 ? (
          profile.programs.map((p, i) => <div key={i} className={styles.item}>{p}</div>)
        ) : (
          <p className={styles.meta}>Henüz program atanmadı.</p>
        )}
      </Card>

      <Card className={styles.card} padding="lg">
        <h3 className={styles.sectionTitle}>Derslerim ({profile?.courses?.length || 0})</h3>
        {profile?.courses?.length > 0 ? (
          profile.courses.map((c) => (
            <div key={c.id} className={styles.item}>
              <strong>{c.name}</strong>
              {c.type && <span className={styles.meta}> · {c.type}</span>}
            </div>
          ))
        ) : (
          <p className={styles.meta}>Henüz ders atanmadı.</p>
        )}
      </Card>
    </div>
  );
};

export default TeacherProfilePage;
