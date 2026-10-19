import React from 'react';
import { Target, Flame, CalendarClock } from 'lucide-react';
import Card from '../../../components/common/Card/Card';
import { useStudentGoal, useStudentStreak } from '../studentApi';

const getNextExamDate = () => {
  const now = new Date();
  let exam = new Date(now.getFullYear(), 5, 20); // 20 Haziran (YKS dönemi)
  if (exam < now) exam = new Date(now.getFullYear() + 1, 5, 20);
  return exam;
};
const EXAM_DATE = getNextExamDate();

export default function GoalStreakCard() {
  const { data: goal } = useStudentGoal();
  const { data: streak = { currentStreak: 0, totalStudyDays: 0 } } = useStudentStreak();

  const uni = goal?.targetUniversity ?? goal?.target_university ?? goal?.TargetUniversity;
  const dept = goal?.targetDepartment ?? goal?.target_department ?? goal?.TargetDepartment;
  const score = goal?.targetScore ?? goal?.target_score ?? goal?.TargetScore;

  const daysLeft = Math.max(0, Math.ceil((EXAM_DATE - new Date()) / (1000 * 60 * 60 * 24)));

  return (
    <Card padding="md">
      <h3 style={{ margin: '0 0 10px', fontSize: '0.95rem' }}>Hedefim & Çalışma Serim</h3>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '10px', background: 'var(--bg-app)' }}>
          <Flame size={20} style={{ color: '#f59e0b' }} />
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{streak.currentStreak} gün</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Çalışma Serisi</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '10px', background: 'var(--bg-app)' }}>
          <CalendarClock size={20} style={{ color: '#3b82f6' }} />
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{daysLeft} gün</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Sınava Kalan</div>
          </div>
        </div>
      </div>
      {(uni || dept || score) && (
        <div style={{ marginTop: '10px', fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Target size={14} style={{ color: 'var(--color-primary)' }} />
          {[uni, dept, score ? `${score} net` : null].filter(Boolean).join(' · ')}
        </div>
      )}
    </Card>
  );
}
