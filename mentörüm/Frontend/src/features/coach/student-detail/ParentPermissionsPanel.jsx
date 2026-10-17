import React from 'react';
import { useParentPermissions, useUpdateParentPermissions } from '../coachApi';

const PERMISSION_CONFIG = [
  { key: 'canViewExams', fallback: 'can_view_exams', label: 'Sınav Sonuçları' },
  { key: 'canViewHomework', fallback: 'can_view_homework', label: 'Ödev Takibi' },
  { key: 'canViewCalendar', fallback: 'can_view_calendar', label: 'Akademik Takvim' },
  { key: 'canViewStudyStats', fallback: 'can_view_study_stats', label: 'Çalışma İstatistikleri' },
  { key: 'canViewPayments', fallback: 'can_view_payments', label: 'Ödeme ve Finans' },
];

export default function ParentPermissionsPanel({ studentId, parentId }) {
  const { data: permissions, isLoading } = useParentPermissions(studentId, parentId);
  const updateMutation = useUpdateParentPermissions(studentId, parentId);

  if (isLoading) {
    return <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Yetkiler yükleniyor...</div>;
  }

  const getFlag = (key, fallback) => {
    if (!permissions) return 0;
    return (permissions[key] ?? permissions[fallback]) === 1 ? 1 : 0;
  };

  const handleToggle = (key, fallback) => {
    const currentVal = getFlag(key, fallback);
    const nextVal = currentVal === 1 ? 0 : 1;

    const payload = {
      canViewExams: key === 'canViewExams' ? nextVal : getFlag('canViewExams', 'can_view_exams'),
      canViewHomework: key === 'canViewHomework' ? nextVal : getFlag('canViewHomework', 'can_view_homework'),
      canViewCalendar: key === 'canViewCalendar' ? nextVal : getFlag('canViewCalendar', 'can_view_calendar'),
      canViewStudyStats: key === 'canViewStudyStats' ? nextVal : getFlag('canViewStudyStats', 'can_view_study_stats'),
      canViewPayments: key === 'canViewPayments' ? nextVal : getFlag('canViewPayments', 'can_view_payments'),
    };

    updateMutation.mutate(payload);
  };

  return (
    <div style={{
      marginTop: '1rem',
      paddingTop: '0.75rem',
      borderTop: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem'
    }}>
      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
        Veli Görünürlük İzinleri
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {PERMISSION_CONFIG.map(({ key, fallback, label }) => {
          const isEnabled = getFlag(key, fallback) === 1;
          return (
            <label 
              key={key} 
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                padding: '0.2rem 0'
              }}
            >
              <span>{label}</span>
              <input 
                type="checkbox"
                checked={isEnabled}
                disabled={updateMutation.isPending}
                onChange={() => handleToggle(key, fallback)}
                style={{
                  cursor: 'pointer',
                  accentColor: 'var(--color-primary, #6366f1)',
                  width: '16px',
                  height: '16px'
                }}
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}
