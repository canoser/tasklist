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

export default function GoalStreakCard({ variant = 'default' }) {
  const { data: goal } = useStudentGoal();
  const { data: streak = { currentStreak: 0, totalStudyDays: 0 } } = useStudentStreak();

  const uni = goal?.targetUniversity;
  const dept = goal?.targetDepartment;
  const score = goal?.targetScore;

  const daysLeft = Math.max(0, Math.ceil((EXAM_DATE - new Date()) / (1000 * 60 * 60 * 24)));
  const targetSummary = [uni, dept, score ? `${score} Net` : null].filter(Boolean).join(' · ') || (score ? `${score} Net Hedef` : 'Hedef Belirlenmedi');

  // 1. Kompakt Şerit Görünümü (Tek Satır Strip)
  if (variant === 'strip') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg-color-surface, var(--bg-card))',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '8px 12px',
        gap: '8px',
        fontSize: '0.78rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700, color: '#f59e0b', whiteSpace: 'nowrap', flexShrink: 0 }}>
          <Flame size={15} />
          <span>{streak.currentStreak} Gün Seri</span>
        </div>
        <div style={{ width: 1, height: 16, background: 'var(--border-color)', flexShrink: 0 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600, color: '#3b82f6', whiteSpace: 'nowrap', flexShrink: 0 }}>
          <CalendarClock size={15} />
          <span>{daysLeft} Gün Sınava</span>
        </div>
        <div style={{ width: 1, height: 16, background: 'var(--border-color)', flexShrink: 0 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600, color: 'var(--color-primary)', minWidth: 0, flex: 1, overflow: 'hidden' }}>
          <Target size={14} style={{ flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{targetSummary}</span>
        </div>
      </div>
    );
  }

  // 2. Hero Widget Görünümü
  if (variant === 'hero') {
    return (
      <Card padding="md" style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(6, 17, 13, 0.05))',
        border: '1px solid rgba(16, 185, 129, 0.25)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-primary)', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase' }}>HEDEF PLANIN</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>{targetSummary}</div>
          </div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            background: 'rgba(245, 158, 11, 0.15)',
            color: '#f59e0b',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: 700,
            border: '1px solid rgba(245, 158, 11, 0.3)'
          }}>
            <Flame size={14} />
            <span>{streak.currentStreak} Gün Seri</span>
          </div>
        </div>
      </Card>
    );
  }

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
