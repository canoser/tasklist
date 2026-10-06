import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCourses, useCreateCourse } from '../coachSchoolApi';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import Card from '../../../components/common/Card/Card';
import styles from './CoachCoursesPage.module.css';

const CoachCoursesPage = () => {
  const { programId } = useParams();
  const { data: courses, isLoading } = useCourses(programId);
  const createCourse = useCreateCourse();
  const [name, setName] = useState('');
  const [type, setType] = useState('DERS');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createCourse.mutateAsync({ programId, data: { name: name.trim(), type } });
    setName('');
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Dersler</h1>

      <Card className={styles.card} padding="md">
        <form onSubmit={handleCreate} className={styles.form}>
          <Input label="Ders Adı" value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn: Matematik" />
          <Input label="Tür" value={type} onChange={(e) => setType(e.target.value)} placeholder="DERS" />
          <Button type="submit" isLoading={createCourse.isPending}>Ders Oluştur</Button>
        </form>
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
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CoachCoursesPage;
