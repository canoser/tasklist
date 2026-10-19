import React, { useState } from 'react';
import { Flame, Smile, Moon, AlertCircle } from 'lucide-react';
import Card from '../../../components/common/Card/Card';
import { useStudentCheckins, useSaveCheckin } from '../studentApi';

const MOODS = [
  { id: 'ENERGETIC', label: 'Çok Verimli', icon: Flame, color: '#f59e0b' },
  { id: 'NORMAL', label: 'Normal', icon: Smile, color: '#22c55e' },
  { id: 'TIRED', label: 'Yorgun', icon: Moon, color: '#64748b' },
  { id: 'STRESSED', label: 'Stresli', icon: AlertCircle, color: '#ef4444' },
];

export default function MoodCheckinCard() {
  const { data: checkins = [] } = useStudentCheckins();
  const saveCheckin = useSaveCheckin();
  const [msg, setMsg] = useState('');

  const latest = checkins[0];
  const isToday = !!latest && new Date(latest.checkinDate).toDateString() === new Date().toDateString();

  const handleSelect = async (mood) => {
    try {
      await saveCheckin.mutateAsync({ mood });
      setMsg('Durumun kaydedildi.');
    } catch {
      setMsg('Kaydedilemedi.');
    }
  };

  return (
    <Card padding="md">
      <h3 style={{ margin: '0 0 10px', fontSize: '0.95rem' }}>Bugün Nasılsın?</h3>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {MOODS.map((m) => {
          const Icon = m.icon;
          const active = isToday && latest?.mood === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => handleSelect(m.id)}
              style={{
                flex: '1 1 auto',
                minWidth: '72px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '5px',
                padding: '10px 8px',
                borderRadius: '10px',
                border: active ? `2px solid ${m.color}` : '1px solid var(--border-color)',
                background: 'var(--bg-app)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '0.72rem',
                fontWeight: 600
              }}
            >
              <Icon size={18} style={{ color: m.color }} />
              {m.label}
            </button>
          );
        })}
      </div>
      {msg && <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{msg}</p>}
    </Card>
  );
}
