import React from 'react';
import Card from '../../../../components/common/Card/Card';
import { Grid } from 'lucide-react';

const EisenhowerMatrixCard = ({ homework = [], questions = [] }) => {
  // Otomatik maddeler
  const autoDoFirst = [
    ...homework.filter(h => h.status === 'OVERDUE' || (h.priority === 'HIGH' && h.status === 'PENDING')).map(h => `Acil Ödev: ${h.snapshotTitle}`),
    ...questions.filter(q => q.status === 'OPEN').slice(0, 2).map(q => `Çözülemeyen Soru: ${q.topicText}`)
  ];

  const autoSchedule = homework
    .filter(h => h.priority !== 'HIGH' && h.status === 'PENDING')
    .slice(0, 3)
    .map(h => `Planlı Ödev: ${h.snapshotTitle}`);

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Grid size={18} style={{ color: 'var(--color-primary)' }} />
          <span>Eisenhower Önceliklendirme Matrisi</span>
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
        {/* 1. Acil & Önemli */}
        <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid #fecaca', backgroundColor: 'rgba(254, 242, 242, 0.5)' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#dc2626', marginBottom: '8px' }}>
            🔥 1. Hemen Yap (Acil & Önemli)
          </div>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: 'var(--text-color-main)' }}>
            {autoDoFirst.length === 0 ? (
              <li style={{ color: 'var(--text-color-muted)', fontStyle: 'italic' }}>Acil madde yok</li>
            ) : (
              autoDoFirst.map((item, i) => (
                <li key={`adf_${i}`} style={{ marginBottom: '4px' }}>{item}</li>
              ))
            )}
          </ul>
        </div>

        {/* 2. Acil Değil & Önemli */}
        <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid #bfdbfe', backgroundColor: 'rgba(239, 246, 255, 0.5)' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2563eb', marginBottom: '8px' }}>
            📅 2. Planla (Önemli, Acil Değil)
          </div>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: 'var(--text-color-main)' }}>
            {autoSchedule.length === 0 ? (
              <li style={{ color: 'var(--text-color-muted)', fontStyle: 'italic' }}>Planlı madde yok</li>
            ) : (
              autoSchedule.map((item, i) => (
                <li key={`as_${i}`} style={{ marginBottom: '4px' }}>{item}</li>
              ))
            )}
          </ul>
        </div>

        {/* 3. Acil & Önemsiz */}
        <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid #fed7aa', backgroundColor: 'rgba(255, 247, 237, 0.5)' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ea580c', marginBottom: '8px' }}>
            ⚡ 3. Hızlıca Bitir / Delege Et
          </div>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: 'var(--text-color-main)' }}>
            <li style={{ color: 'var(--text-color-muted)', fontStyle: 'italic' }}>Madde yok</li>
          </ul>
        </div>

        {/* 4. Acil Değil & Önemsiz */}
        <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'rgba(248, 250, 252, 0.5)' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>
            🛑 4. Ele / Sınırla (Zaman Tuzakları)
          </div>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: 'var(--text-color-main)' }}>
            <li style={{ color: 'var(--text-color-muted)', fontStyle: 'italic' }}>Örn: Sosyal medya, plansız oyun</li>
          </ul>
        </div>
      </div>
    </Card>
  );
};

export default EisenhowerMatrixCard;

