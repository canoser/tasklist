import React, { useEffect, useState } from 'react';
import { useStudentProfile, useStudentExams, useStudentCurriculum, useStudentGoal, useUpdateStudentGoal } from '../studentApi';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import styles from './StudentProfilePage.module.css';

const fmt = (d) => (d ? String(d).slice(0, 10) : '');

const StudentProfilePage = () => {
  const { data: profile, isLoading } = useStudentProfile();
  const { data: exams } = useStudentExams();
  const { data: curriculum } = useStudentCurriculum();
  const { data: goal } = useStudentGoal();
  const updateGoal = useUpdateStudentGoal();

  const [tab, setTab] = useState('exams');
  const [uni, setUni] = useState('');
  const [dept, setDept] = useState('');
  const [score, setScore] = useState('');
  const [goalMsg, setGoalMsg] = useState('');

  useEffect(() => {
    if (goal) {
      setUni(goal.targetUniversity || '');
      setDept(goal.targetDepartment || '');
      setScore(goal.targetScore != null ? String(goal.targetScore) : '');
    }
  }, [goal]);

  const saveGoal = async (e) => {
    e.preventDefault();
    setGoalMsg('');
    try {
      await updateGoal.mutateAsync({
        targetUniversity: uni || null,
        targetDepartment: dept || null,
        targetScore: score ? parseFloat(score) : null,
      });
      setGoalMsg('Hedef güncellendi.');
    } catch {
      setGoalMsg('Güncelleme başarısız.');
    }
  };

  // Konu takibi: tamamlanan / toplam
  const completed = curriculum?.filter((t) => t.isCompleted)?.length || 0;
  const total = curriculum?.length || 0;

  if (isLoading) return <div className={styles.container}><p>Yükleniyor...</p></div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Profilim</h1>

      <Card className={styles.card} padding="lg">
        <div className={styles.identity}>
          <div className={styles.avatar}>{profile?.fullName?.charAt(0) || 'Ö'}</div>
          <div>
            <h2 className={styles.name}>{profile?.fullName}</h2>
            <p className={styles.meta}>{profile?.email}</p>
            {profile?.grade != null && <span className={styles.badge}>Sınıf: {profile.grade}</span>}
            {profile?.track && <span className={styles.badge}>Alan: {profile.track}</span>}
          </div>
        </div>

        {profile?.parents?.length > 0 && (
          <div className={styles.parents}>
            <h3 className={styles.sectionTitle}>Velilerim</h3>
            {profile.parents.map((p) => (
              <div key={p.parentId} className={styles.parentRow}>
                <span>{p.parentName}</span>
                {p.relation && <span className={styles.meta}> ({p.relation})</span>}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Hedef */}
      <Card className={styles.card} padding="lg">
        <h3 className={styles.sectionTitle}>Hedefim</h3>
        <form onSubmit={saveGoal} className={styles.goalForm}>
          <Input label="Hedef Üniversite" value={uni} onChange={(e) => setUni(e.target.value)} placeholder="örn. İTÜ" />
          <Input label="Hedef Bölüm" value={dept} onChange={(e) => setDept(e.target.value)} placeholder="örn. Bilgisayar Müh." />
          <Input label="Hedef Net" type="number" step="0.01" value={score} onChange={(e) => setScore(e.target.value)} placeholder="örn. 95.5" />
          <Button type="submit" isLoading={updateGoal.isPending}>Kaydet</Button>
          {goalMsg && <span className={styles.msg}>{goalMsg}</span>}
        </form>
      </Card>

      {/* Sekmeler */}
      <div className={styles.tabs}>
        <button className={tab === 'exams' ? `${styles.tab} ${styles.tabActive}` : styles.tab} onClick={() => setTab('exams')}>
          Sınav Sonuçları
        </button>
        <button className={tab === 'curriculum' ? `${styles.tab} ${styles.tabActive}` : styles.tab} onClick={() => setTab('curriculum')}>
          Konu Takibi ({completed}/{total})
        </button>
      </div>

      {tab === 'exams' && (
        <div>
          {exams?.length === 0 && <p className={styles.empty}>Henüz sınav sonucu yok.</p>}
          {exams?.map((e) => (
            <Card key={e.id} className={styles.row} padding="md">
              <div>
                <strong>{e.examName || e.examType || 'Sınav'}</strong>
                <span className={styles.meta}> {fmt(e.examDate)}</span>
              </div>
              <span className={styles.net}>Net: {e.totalNet ?? '-'}</span>
            </Card>
          ))}
        </div>
      )}

      {tab === 'curriculum' && (
        <div>
          {curriculum?.length === 0 && <p className={styles.empty}>Sınıfınıza ait müfredat bulunamadı.</p>}
          {curriculum?.map((t) => (
            <div key={t.id} className={styles.topicRow}>
              <span className={t.isCompleted ? styles.topicDone : styles.topicOpen}>
                {t.isCompleted ? '✅' : '⬜'}
              </span>
              <div className={styles.topicInfo}>
                <span className={styles.topicName}>{t.topicName}</span>
                <span className={styles.meta}>{t.subjectName} · {t.grade}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentProfilePage;
