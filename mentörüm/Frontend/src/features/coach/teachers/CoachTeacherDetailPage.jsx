import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTeacherDetail } from '../coachSchoolApi';
import Button from '../../../components/common/Button/Button';
import Card from '../../../components/common/Card/Card';
import styles from './CoachTeacherDetailPage.module.css';

const CoachTeacherDetailPage = () => {
  const { programId, teacherId } = useParams();
  const navigate = useNavigate();
  const { data: teacher, isLoading } = useTeacherDetail(programId, teacherId);

  if (isLoading) return <div className={styles.container}><p>Yükleniyor...</p></div>;
  if (!teacher) return <div className={styles.container}><p>Öğretmen bulunamadı.</p></div>;

  return (
    <div className={styles.container}>
      <Button size="sm" variant="outline" onClick={() => navigate(-1)}>← Geri</Button>
      <h1 className={styles.title}>{teacher.fullName}</h1>

      <Card className={styles.card} padding="md">
        <p className={styles.meta}>{teacher.email}</p>
        <span className={teacher.isActive ? styles.active : styles.inactive}>{teacher.isActive ? 'Aktif' : 'Pasif'}</span>
        <p className={styles.stat}>Öğrenci Sayısı: {teacher.studentCount ?? 0}</p>
      </Card>

      <h2 className={styles.subtitle}>Dersleri ({teacher.courses?.length || 0})</h2>
      {teacher.courses?.length > 0 ? (
        teacher.courses.map((c) => (
          <Card key={c.id} className={styles.card} padding="md">
            <strong>{c.name}</strong>
            {c.type && <span className={styles.meta}> · {c.type}</span>}
          </Card>
        ))
      ) : (
        <p className={styles.meta}>Ders atanmamış.</p>
      )}
    </div>
  );
};

export default CoachTeacherDetailPage;
