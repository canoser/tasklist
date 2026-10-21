import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  useStudentProfile, 
  useStudentExams, 
  useStudentGoal, 
  useUpdateStudentGoal,
  useStudentSubjectStats 
} from '../studentApi';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import { Palette, FolderOpen, ChevronRight, Clock, FileText } from 'lucide-react';
import styles from './StudentProfilePage.module.css';

const fmt = (d) => (d ? String(d).slice(0, 10) : '');

const StudentProfilePage = () => {
  const navigate = useNavigate();
  const { data: profile, isLoading } = useStudentProfile();
  const { data: exams } = useStudentExams();
  const { data: subjectStats = [] } = useStudentSubjectStats();
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

      {/* Hızlı Erişim: Temalar ve Dosyalar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <button
          type="button"
          onClick={() => navigate('/student/theme')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-color-surface, var(--bg-card))',
            color: 'var(--text-color-main)',
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(16, 185, 129, 0.12)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Palette size={17} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Görünüm & Tema</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-color-muted)' }}>Renkler ve Efektler</div>
            </div>
          </div>
          <ChevronRight size={16} color="var(--text-color-muted)" />
        </button>

        <button
          type="button"
          onClick={() => navigate('/student/storage')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-color-surface, var(--bg-card))',
            color: 'var(--text-color-main)',
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FolderOpen size={17} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Dosyalarım</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-color-muted)' }}>Bulut Depolama</div>
            </div>
          </div>
          <ChevronRight size={16} color="var(--text-color-muted)" />
        </button>
      </div>

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
        <button className={tab === 'subjectStats' ? `${styles.tab} ${styles.tabActive}` : styles.tab} onClick={() => setTab('subjectStats')}>
          Konu İstatistikleri ({subjectStats.length})
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

      {tab === 'subjectStats' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {subjectStats.length === 0 && (
            <p className={styles.empty}>Henüz konu bazlı çalışma verisi kaydedilmemiş.</p>
          )}
          {subjectStats.map((st, idx) => (
            <Card key={idx} className={styles.row} padding="md" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{st.subjectName} — {st.topicName}</strong>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Clock size={13} /> {st.totalMinutes || 0} dk</span>
                  <span>·</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><FileText size={13} /> {st.totalQuestions || 0} Soru</span>
                  <span style={{ marginLeft: '4px', fontSize: '0.78rem' }}>
                    ({st.totalCorrect || 0} D / {st.totalWrong || 0} Y / {st.totalBlank || 0} B)
                  </span>
                </div>
              </div>
              <span className={styles.net} style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                {st.totalNet != null ? `${st.totalNet} Net` : '-'}
              </span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentProfilePage;
