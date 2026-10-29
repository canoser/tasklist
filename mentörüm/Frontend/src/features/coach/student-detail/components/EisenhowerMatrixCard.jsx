import React, { useState } from 'react';
import Card from '../../../../components/common/Card/Card';
import Button from '../../../../components/common/Button/Button';
import { Grid, Plus, Trash2, CheckCircle } from 'lucide-react';

const EisenhowerMatrixCard = ({ homework = [], questions = [] }) => {
  const [customItems, setCustomItems] = useState({
    doFirst: [],
    schedule: [],
    delegate: [],
    eliminate: []
  });
  const [inputVal, setInputVal] = useState({ quadrant: 'doFirst', text: '' });

  // Otomatik maddeler
  const autoDoFirst = [
    ...homework.filter(h => h.status === 'OVERDUE' || (h.priority === 'HIGH' && h.status === 'PENDING')).map(h => `Acil Ödev: ${h.snapshotTitle}`),
    ...questions.filter(q => q.status === 'OPEN').slice(0, 2).map(q => `Çözülemeyen Soru: ${q.topicText}`)
  ];

  const autoSchedule = [
    ...homework.filter(h => h.priority !== 'HIGH' && h.status === 'PENDING').slice(0, 3).map(h => `Planlı Ödev: ${h.snapshotTitle}`)
  ];

  const handleAdd = (quadrant) => {
    if (!inputVal.text.trim()) return;
    setCustomItems({
      ...customItems,
      [quadrant]: [...customItems[quadrant], inputVal.text.trim()]
    });
    setInputVal({ quadrant: 'doFirst', text: '' });
  };

  const handleRemove = (quadrant, idx) => {
    setCustomItems({
      ...customItems,
      [quadrant]: customItems[quadrant].filter((_, i) => i !== idx)
    });
  };

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
            {autoDoFirst.map((item, i) => (
              <li key={`adf_${i}`} style={{ marginBottom: '4px' }}>{item}</li>
            ))}
            {customItems.doFirst.map((item, i) => (
              <li key={`cdf_${i}`} style={{ marginBottom: '4px' }}>
                {item}
                <button type="button" onClick={() => handleRemove('doFirst', i)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', marginLeft: '4px' }}>&times;</button>
              </li>
            ))}
          </ul>
        </div>

        {/* 2. Acil Değil & Önemli */}
        <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid #bfdbfe', backgroundColor: 'rgba(239, 246, 255, 0.5)' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2563eb', marginBottom: '8px' }}>
            📅 2. Planla (Önemli, Acil Değil)
          </div>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: 'var(--text-color-main)' }}>
            {autoSchedule.map((item, i) => (
              <li key={`as_${i}`} style={{ marginBottom: '4px' }}>{item}</li>
            ))}
            {customItems.schedule.map((item, i) => (
              <li key={`cs_${i}`} style={{ marginBottom: '4px' }}>
                {item}
                <button type="button" onClick={() => handleRemove('schedule', i)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', marginLeft: '4px' }}>&times;</button>
              </li>
            ))}
          </ul>
        </div>

        {/* 3. Acil & Önemsiz */}
        <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid #fed7aa', backgroundColor: 'rgba(255, 247, 237, 0.5)' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ea580c', marginBottom: '8px' }}>
            ⚡ 3. Hızlıca Bitir / Delege Et
          </div>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: 'var(--text-color-main)' }}>
            {customItems.delegate.length === 0 ? (
              <li style={{ color: 'var(--text-color-muted)', fontStyle: 'italic' }}>Madde yok</li>
            ) : (
              customItems.delegate.map((item, i) => (
                <li key={`cd_${i}`} style={{ marginBottom: '4px' }}>
                  {item}
                  <button type="button" onClick={() => handleRemove('delegate', i)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', marginLeft: '4px' }}>&times;</button>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* 4. Acil Değil & Önemsiz */}
        <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'rgba(248, 250, 252, 0.5)' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>
            🛑 4. Ele / Sınırla (Zaman Tuzakları)
          </div>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: 'var(--text-color-main)' }}>
            {customItems.eliminate.length === 0 ? (
              <li style={{ color: 'var(--text-color-muted)', fontStyle: 'italic' }}>Örn: Sosyal medya, plansız oyun</li>
            ) : (
              customItems.eliminate.map((item, i) => (
                <li key={`ce_${i}`} style={{ marginBottom: '4px' }}>
                  {item}
                  <button type="button" onClick={() => handleRemove('eliminate', i)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', marginLeft: '4px' }}>&times;</button>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </Card>
  );
};

export default EisenhowerMatrixCard;

