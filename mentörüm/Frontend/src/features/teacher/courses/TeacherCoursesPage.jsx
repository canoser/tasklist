import React, { useState } from 'react';
import { useTeacherCourses, useTeacherCourseStudents, useTeacherCourseHomework, useTeacherCourseExams, useCreateTeacherHomework, useCreateTeacherExam } from '../teacherApi';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
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
  const createHomework = useCreateTeacherHomework();
  const createExam = useCreateTeacherExam();

  const [showHomeworkForm, setShowHomeworkForm] = useState(false);
  const [hwStudentId, setHwStudentId] = useState('');
  const [hwTitle, setHwTitle] = useState('');
  const [hwDesc, setHwDesc] = useState('');
  const [hwDue, setHwDue] = useState('');

  const [showExamForm, setShowExamForm] = useState(false);
  const [exStudentId, setExStudentId] = useState('');
  const [exName, setExName] = useState('');
  const [exDate, setExDate] = useState('');
  const [exNet, setExNet] = useState('');

  const resetHomework = () => { setHwStudentId(''); setHwTitle(''); setHwDesc(''); setHwDue(''); setShowHomeworkForm(false); };
  const resetExam = () => { setExStudentId(''); setExName(''); setExDate(''); setExNet(''); setShowExamForm(false); };

  const submitHomework = async (e) => {
    e.preventDefault();
    if (!hwStudentId || !hwTitle || !hwDue) return;
    await createHomework.mutateAsync({ courseId: selected, data: { studentId: hwStudentId, title: hwTitle, description: hwDesc || null, dueDate: hwDue } });
    resetHomework();
  };

  const submitExam = async (e) => {
    e.preventDefault();
    if (!exStudentId || !exDate) return;
    await createExam.mutateAsync({ courseId: selected, data: { studentId: exStudentId, examDate: exDate, examName: exName || null, totalNet: exNet ? parseFloat(exNet) : 0 } });
    resetExam();
  };

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
              {course?.canManageHomework && (
                <div className={styles.actionsBar}>
                  {!showHomeworkForm && <Button size="sm" onClick={() => setShowHomeworkForm(true)}>+ Ödev Ata</Button>}
                  {showHomeworkForm && (
                    <form onSubmit={submitHomework} className={styles.form}>
                      <select className={styles.select} value={hwStudentId} onChange={(e) => setHwStudentId(e.target.value)} required>
                        <option value="">Öğrenci seç</option>
                        {students?.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                      </select>
                      <Input label="Başlık" value={hwTitle} onChange={(e) => setHwTitle(e.target.value)} placeholder="Ödev başlığı" />
                      <Input label="Açıklama" value={hwDesc} onChange={(e) => setHwDesc(e.target.value)} placeholder="Açıklama (opsiyonel)" />
                      <Input label="Son Tarih" type="date" value={hwDue} onChange={(e) => setHwDue(e.target.value)} />
                      <div className={styles.formActions}>
                        <Button type="submit" isLoading={createHomework.isPending}>Kaydet</Button>
                        <Button type="button" variant="ghost" onClick={resetHomework}>Vazgeç</Button>
                      </div>
                    </form>
                  )}
                </div>
              )}

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
              {course?.canManageExams && (
                <div className={styles.actionsBar}>
                  {!showExamForm && <Button size="sm" onClick={() => setShowExamForm(true)}>+ Sınav/Not Ekle</Button>}
                  {showExamForm && (
                    <form onSubmit={submitExam} className={styles.form}>
                      <select className={styles.select} value={exStudentId} onChange={(e) => setExStudentId(e.target.value)} required>
                        <option value="">Öğrenci seç</option>
                        {students?.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                      </select>
                      <Input label="Sınav Adı" value={exName} onChange={(e) => setExName(e.target.value)} placeholder="örn. 1. Deneme" />
                      <Input label="Tarih" type="date" value={exDate} onChange={(e) => setExDate(e.target.value)} />
                      <Input label="Net" type="number" step="0.01" value={exNet} onChange={(e) => setExNet(e.target.value)} placeholder="örn. 85.5" />
                      <div className={styles.formActions}>
                        <Button type="submit" isLoading={createExam.isPending}>Kaydet</Button>
                        <Button type="button" variant="ghost" onClick={resetExam}>Vazgeç</Button>
                      </div>
                    </form>
                  )}
                </div>
              )}

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