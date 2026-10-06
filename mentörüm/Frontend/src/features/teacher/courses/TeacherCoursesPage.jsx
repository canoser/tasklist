import React, { useState } from 'react';
import { useTeacherCourses, useTeacherCourseStudents, useTeacherCourseHomework, useTeacherCourseExams } from '../teacherApi';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import styles from './TeacherCoursesPage.module.css';

const fmt = (d) => (d ? String(d).slice(0, 10) : '');

const TeacherCoursesPage = () => {
  const { data: courses, isLoading } = useTeacherCourses();
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('students');

  const course = courses?.find((c) => c.courseId === selected);
  const { data: students } = useTeacherCourseStudents(selected);
  const { data: homework } = useTeacherCourseHomework(selected);
  const { data: exams } = useTeacherCourseExams(selected);

  if (isLoading) return <div className={styles.container}><p>Yükleniyor...</p></div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Derslerim</h1>

      {!selected ? (
        <div className={styles.list}>
          {courses?.map((c) => (
            <Card key={c.courseId} className={styles.card} padding="md" onClick={() => { setSelected(c.courseId); setTab('students'); }}>
              <strong>{c.name}</strong>
              <span className={styles.type}>{c.type}</span>
            </Card>
          ))}
          {courses?.length === 0 && <p className={styles.empty}>Henüz ders atanmadı.</p>}
        </div>
      ) : (
        <div>
          <Button size="sm" variant="outline" onClick={() => setSelected(null)}>← Geri</Button>
          <h2 className={styles.subtitle}>{course?.name}</h2>

          <div className={styles.tabs}>
            <button className={tab === 'students' ? `${styles.tab} ${styles.tabActive}` : styles.tab} onClick={() => setTab('students')}>Öğrencilerim</button>
            {course?.canViewHomework && <button className={tab === 'homework' ? `${styles.tab} ${styles.tabActive}` : styles.tab} onClick={() => setTab('homework')}>Ödevler</button>}
            {course?.canViewExams && <button className={tab === 'exams' ? `${styles.tab} ${styles.tabActive}` : styles.tab} onClick={() => setTab('exams')}>Sınavlar</button>}
          </div>

          {tab === 'students' && (
            <div>
              {students?.map((s) => (
                <Card key={s.id} className={styles.card} padding="md">
                  <strong>{s.fullName}</strong>
                  {s.email && <span className={styles.meta}>{s.email}</span>}
                  {s.grade != null && <span className={styles.meta}>Sınıf: {s.grade}</span>}
                </Card>
              ))}
              {students?.length === 0 && <p className={styles.empty}>Öğrenci yok.</p>}
            </div>
          )}

          {tab === 'homework' && (
            <div>
              {homework?.map((h) => (
                <Card key={h.id} className={styles.card} padding="md">
                  <strong>{h.title}</strong>
                  <span className={styles.meta}>{h.studentName} · {fmt(h.dueDate)} · {h.status}</span>
                </Card>
              ))}
              {homework?.length === 0 && <p className={styles.empty}>Ödev yok.</p>}
            </div>
          )}

          {tab === 'exams' && (
            <div>
              {exams?.map((e) => (
                <Card key={e.id} className={styles.card} padding="md">
                  <strong>{e.name}</strong>
                  <span className={styles.meta}>{e.studentName} · {fmt(e.examDate)} · Net: {e.totalNet ?? '-'}</span>
                </Card>
              ))}
              {exams?.length === 0 && <p className={styles.empty}>Sınav yok.</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TeacherCoursesPage;