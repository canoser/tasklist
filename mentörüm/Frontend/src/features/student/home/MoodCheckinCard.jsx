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

export default function MoodCheckinCard({ compact = false }) {
  const { data: checkins = [] } = useStudentCheckins();
  const saveCheckin = useSaveCheckin();
  const [msg, setMsg] = useState('');

  const latest = checkins[0];
  const isToday = !!latest && new Date(latest.checkinDate).toDateString() === new Date().toDateString();

  const handleSelect = async (mood) => {
    try {
      await saveCheckin.mutateAsync({ mood });
      setMsg('Durumun kaydedildi.');
      setTimeout(() => setMsg(''), 2500);
    } catch {
      setMsg('Kaydedilemedi.');
      setTimeout(() => setMsg(''), 2500);
    }
  };

  return (
    <Card padding={compact ? 'sm' : 'md'}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: compact ? '8px' : '10px' }}>
        <h3 style={{ margin: 0, fontSize: compact ? '0.85rem' : '0.95rem', fontWeight: 700 }}>Bugün Nasılsın?</h3>
        {msg ? (
          <span style={{ fontSize: '0.72rem', color: 'var(--color-primary)', fontWeight: 600 }}>{msg}</span>
        ) : (
          <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Günlük Check-in</span>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
        {MOODS.map((m) => {
          const Icon = m.icon;
          const active = isToday && latest?.mood === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => handleSelect(m.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: compact ? '6px 2px' : '8px 4px',
                borderRadius: '8px',
                border: active ? `2px solid ${m.color}` : '1px solid var(--border-color)',
                background: active ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-app)',
                color: active ? m.color : 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '0.68rem',
                fontWeight: active ? 700 : 500,
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={16} style={{ color: m.color }} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{m.label}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
