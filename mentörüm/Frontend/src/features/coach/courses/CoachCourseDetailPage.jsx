import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useCourses, useCourseStudents, useCourseGroups, useCourseResources,
  useAddCourseStudent, useRemoveCourseStudent, useAddCourseGroup, useRemoveCourseGroup, useCreateResource,
} from '../coachSchoolApi';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import Card from '../../../components/common/Card/Card';
import styles from './CoachCourseDetailPage.module.css';

const PERMS = [
  ['teacherCanViewProfile', 'Profili Gör'],
  ['teacherCanViewContact', 'İletişimi Gör'],
  ['teacherCanViewHomework', 'Ödevi Gör'],
  ['teacherCanManageHomework', 'Ödev Yönet'],
  ['teacherCanViewExams', 'Sınavı Gör'],
  ['teacherCanManageExams', 'Sınav Yönet'],
  ['teacherCanViewNotes', 'Notu Gör'],
  ['teacherCanAddNotes', 'Not Ekle'],
  ['teacherCanViewSchedule', 'Programı Gör'],
  ['teacherCanManageSchedule', 'Program Yönet'],
];

const CoachCourseDetailPage = () => {
  const { programId, courseId } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('students');
  const [studentId, setStudentId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [resTitle, setResTitle] = useState('');
  const [resType, setResType] = useState('BOOK');

  const { data: courses } = useCourses(programId);
  const course = courses?.find((c) => c.id === courseId);

  const { data: students } = useCourseStudents(programId, courseId);
  const { data: groups } = useCourseGroups(programId, courseId);
  const { data: resources } = useCourseResources(programId, courseId);
  const addStudent = useAddCourseStudent();
  const removeStudent = useRemoveCourseStudent();
  const addGroup = useAddCourseGroup();
  const removeGroup = useRemoveCourseGroup();
  const createResource = useCreateResource();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button size="sm" variant="outline" onClick={() => navigate(`/coach/programs/${programId}/courses`)}>← Geri</Button>
        <h1 className={styles.title}>{course?.name || 'Ders'}</h1>
      </div>

      <div className={styles.tabs}>
        {['students', 'groups', 'resources', 'permissions'].map((t) => (
          <button key={t} className={tab === t ? `${styles.tab} ${styles.tabActive}` : styles.tab} onClick={() => setTab(t)}>
            {{ students: 'Öğrenciler', groups: 'Gruplar', resources: 'Kaynaklar', permissions: 'İzinler' }[t]}
          </button>
        ))}
      </div>

      {tab === 'students' && (
        <div>
          <Card className={styles.card} padding="md">
            <div className={styles.formRow}>
              <Input label="Öğrenci ID" value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="UUID" />
              <Button size="sm" onClick={() => addStudent.mutateAsync({ programId, courseId, studentId })}>Ekle</Button>
            </div>
          </Card>
          {students?.map((s) => (
            <Card key={s.id} className={styles.item} padding="md">
              <strong>{s.fullName}</strong>
              <span className={styles.meta}>{s.email}</span>
              <Button size="sm" variant="outline" onClick={() => removeStudent.mutateAsync({ programId, courseId, studentId: s.id })}>Çıkar</Button>
            </Card>
          ))}
        </div>
      )}

      {tab === 'groups' && (
        <div>
          <Card className={styles.card} padding="md">
            <div className={styles.formRow}>
              <Input label="Grup ID" value={groupId} onChange={(e) => setGroupId(e.target.value)} placeholder="UUID" />
              <Button size="sm" onClick={() => addGroup.mutateAsync({ programId, courseId, groupId })}>Ekle</Button>
            </div>
          </Card>
          {groups?.map((g) => (
            <Card key={g.id} className={styles.item} padding="md">
              <strong>{g.name}</strong>
              <Button size="sm" variant="outline" onClick={() => removeGroup.mutateAsync({ programId, courseId, groupId: g.id })}>Çıkar</Button>
            </Card>
          ))}
        </div>
      )}

      {tab === 'resources' && (
        <div>
          <Card className={styles.card} padding="md">
            <div className={styles.formRow}>
              <Input label="Kaynak Başlığı" value={resTitle} onChange={(e) => setResTitle(e.target.value)} placeholder="Örn: Kitap Bölümü" />
              <Input label="Tür" value={resType} onChange={(e) => setResType(e.target.value)} placeholder="BOOK" />
              <Button size="sm" onClick={() => createResource.mutateAsync({ programId, courseId, data: { title: resTitle, type: resType } })}>Ekle</Button>
            </div>
          </Card>
          {resources?.map((r) => (
            <Card key={r.id} className={styles.item} padding="md">
              <strong>{r.title}</strong>
              <span className={styles.meta}>{r.type}</span>
            </Card>
          ))}
        </div>
      )}

      {tab === 'permissions' && course && (
        <Card className={styles.card} padding="md">
          {PERMS.map(([key, label]) => (
            <div key={key} className={styles.permRow}>
              <span>{label}</span>
              <span className={course[key] ? styles.on : styles.off}>{course[key] ? 'Açık' : 'Kapalı'}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
};

export default CoachCourseDetailPage;
