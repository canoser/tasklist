import React, { useState } from 'react';
import { useStudentCourses, useStudentCourseResources, useUpdateResourceProgress } from '../studentSchoolApi';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import styles from './StudentCoursesPage.module.css';

const StudentCoursesPage = () => {
  const { data: courses, isLoading } = useStudentCourses();
  const [selectedCourse, setSelectedCourse] = useState(null);
  const { data: resources } = useStudentCourseResources(selectedCourse);
  const updateProgress = useUpdateResourceProgress();

  const handleProgress = (resourceId, progress) => {
    updateProgress.mutateAsync({ resourceId, data: { progress, isDone: progress >= 100 } });
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Derslerim</h1>
      {isLoading && <p>Yükleniyor...</p>}

      {!selectedCourse ? (
        <div className={styles.list}>
          {courses?.map((c) => (
            <Card key={c.id} className={styles.card} padding="md" onClick={() => setSelectedCourse(c.id)}>
              <strong>{c.name}</strong>
              <span className={styles.type}>{c.type}</span>
            </Card>
          ))}
        </div>
      ) : (
        <div>
          <Button size="sm" variant="outline" onClick={() => setSelectedCourse(null)}>← Geri</Button>
          <div className={styles.resList}>
            {resources?.map((r) => (
              <Card key={r.id} className={styles.card} padding="md">
                <strong>{r.title}</strong>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${r.progress || 0}%` }} />
                </div>
                <div className={styles.actions}>
                  <span className={styles.pct}>{r.progress || 0}%</span>
                  <Button size="sm" onClick={() => handleProgress(r.id, 100)} disabled={(r.progress || 0) >= 100}>Tamamlandı</Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentCoursesPage;
