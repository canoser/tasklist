import React from 'react';
import Card from '../../../components/common/Card/Card';
import { useStudentTimeBudget } from '../coachApi';

const CATEGORY_COLORS = {
  study: 'var(--color-primary, #6366f1)',
  sleep: '#38bdf8', // açık mavi
  school: '#f59e0b', // turuncu
  sport: '#10b981', // yeşil
  social: '#ec4899', // pembe
  rest: '#a855f7', // mor
  other: '#94a3b8'  // gri
};

export default function WeeklyTimeBudgetCard({ studentId }) {
  const { data: budget, isLoading } = useStudentTimeBudget(studentId);

  if (isLoading) {
    return <Card padding="lg"><div>Zaman bütçesi yükleniyor...</div></Card>;
  }

  if (!budget) {
    return (
      <Card padding="lg">
        <div style={{ color: 'var(--text-secondary)' }}>Bu öğrenci için haftalık zaman verisi bulunamadı.</div>
      </Card>
    );
  }

  // Dakikaları saate çevirme
  const toHours = (mins) => ((mins || 0) / 60).toFixed(1);

  const studyMins = budget.totalStudyMinutes ?? budget.TotalStudyMinutes ?? 0;
  const sleepMins = budget.sleepMinutes ?? budget.SleepMinutes ?? 0;
  const schoolMins = budget.schoolMinutes ?? budget.SchoolMinutes ?? 0;
  const sportMins = budget.sportMinutes ?? budget.SportMinutes ?? 0;
  const socialMins = budget.socialMinutes ?? budget.SocialMinutes ?? 0;
  const restMins = budget.restMinutes ?? budget.RestMinutes ?? 0;
  const sumMins = studyMins + sleepMins + schoolMins + sportMins + socialMins + restMins + otherMins;
  const totalMins = (budget.totalMinutes ?? budget.TotalMinutes ?? sumMins) || 1;

  const categories = [
    { label: 'Ders Çalışma & Etüt', mins: studyMins, color: CATEGORY_COLORS.study, icon: '📚' },
    { label: 'Uyku & Dinlenme', mins: sleepMins, color: CATEGORY_COLORS.sleep, icon: '🛏️' },
    { label: 'Okul & Dershane', mins: schoolMins, color: CATEGORY_COLORS.school, icon: '🏫' },
    { label: 'Spor & Egzersiz', mins: sportMins, color: CATEGORY_COLORS.sport, icon: '⚽' },
    { label: 'Sosyal & Aile', mins: socialMins, color: CATEGORY_COLORS.social, icon: '👥' },
    { label: 'Mola & Eğlence', mins: restMins, color: CATEGORY_COLORS.rest, icon: '☕' },
  ];

  if (otherMins > 0) {
    categories.push({ label: 'Diğer Aktiviteler', mins: otherMins, color: CATEGORY_COLORS.other, icon: '📌' });
  }

  return (
    <Card padding="lg">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
            Haftalık Zaman Bütçesi (Ders vs Ders Dışı)
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Son 7 gün içinde kaydedilen çalışma oturumları ve kişisel etkinlik dağılımı.
          </p>
        </div>
        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-primary)' }}>
          Toplam {toHours(totalMins)} Saat
        </span>
      </div>

      {/* Çok Renkli İlerleme Çubuğu */}
      <div style={{
        display: 'flex',
        height: '14px',
        borderRadius: '7px',
        overflow: 'hidden',
        background: 'var(--border-color)',
        marginBottom: '1.5rem'
      }}>
        {categories.map((c, i) => {
          const pct = Math.max(0, (c.mins / totalMins) * 100);
          if (pct === 0) return null;
          return (
            <div 
              key={i} 
              title={`${c.label}: ${toHours(c.mins)} sa (%${pct.toFixed(0)})`}
              style={{
                width: `${pct}%`,
                background: c.color,
                transition: 'width 0.3s ease'
              }}
            />
          );
        })}
      </div>

      {/* Kategori Kartları Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '0.75rem'
      }}>
        {categories.map((c, i) => {
          const pct = ((c.mins / totalMins) * 100).toFixed(1);
          return (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.6rem 0.8rem',
              borderRadius: '8px',
              background: 'var(--bg-app)',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem' }}>{c.icon}</span>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {c.label}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {toHours(c.mins)} Saat (%{pct})
                  </div>
                </div>
              </div>
              <span style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: c.color
              }} />
            </div>
          );
        })}
      </div>
    </Card>
  );
}
