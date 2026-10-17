import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCourses, useCreateCourse, useTeachers } from '../coachSchoolApi';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import Card from '../../../components/common/Card/Card';
import styles from './CoachCoursesPage.module.css';

const CoachCoursesPage = () => {
  const { programId } = useParams();
  const navigate = useNavigate();
  const { data: courses, isLoading } = useCourses(programId);
  const createCourse = useCreateCourse();
  const { data: teachers = [] } = useTeachers(programId);
  const [name, setName] = useState('');
  const [type, setType] = useState('DERS');
  const [teacherId, setTeacherId] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createCourse.mutateAsync({ programId, data: { name: name.trim(), type, ...(teacherId ? { teacherId } : {}) } });
    setName('');
    setTeacherId('');
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Dersler</h1>

      <Card className={styles.card} padding="md">
        <form onSubmit={handleCreate} className={styles.form}>
          <Input label="Ders Adı" value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn: Matematik" />
          <Input label="Tür" value={type} onChange={(e) => setType(e.target.value)} placeholder="DERS" />
          <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className={styles.select}>
            <option value="">Öğretmen (opsiyonel)</option>
            {teachers.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
          </select>
          <Button type="submit" isLoading={createCourse.isPending}>Ders Oluştur</Button>
        </form>
        <p className={styles.note}>Varsayılan: Temel Profil ve Ödev İzinleri Açık, İleri İzinler Kapalı. Özel yetkilendirmeler için ders detayındaki "İzinler" sekmesini kullanın.</p>
      </Card>

      <div className={styles.list}>
        {isLoading && <p>Yükleniyor...</p>}
        {courses?.map((c) => (
          <Card key={c.id} className={styles.item} padding="md">
            <div className={styles.itemHeader}>
              <strong>{c.name}</strong>
              <span className={styles.type}>{c.type}</span>
            </div>
            <div className={styles.meta}>Öğrenci: {c.studentCount}</div>
            <Button size="sm" variant="outline" onClick={() => navigate(`/coach/programs/${programId}/courses/${c.id}`)}>Detay</Button>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CoachCoursesPage;
