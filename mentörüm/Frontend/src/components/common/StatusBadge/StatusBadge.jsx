import React from 'react';

const STATUS_CONFIGS = {
  // Gecikmiş / Tehlike
  OVERDUE: { label: 'Gecikti', color: 'var(--color-danger, #ef4444)', bg: 'rgba(239, 68, 68, 0.15)' },
  LATE: { label: 'Gecikti', color: 'var(--color-danger, #ef4444)', bg: 'rgba(239, 68, 68, 0.15)' },
  REJECTED: { label: 'Reddedildi', color: 'var(--color-danger, #ef4444)', bg: 'rgba(239, 68, 68, 0.15)' },
  
  // Uyarı / Bugün Son
  DUE_TODAY: { label: 'Bugün Son', color: 'var(--color-warning, #f59e0b)', bg: 'rgba(245, 158, 11, 0.15)' },
  PARTIAL: { label: 'Kısmi Ödeme', color: 'var(--color-warning, #f59e0b)', bg: 'rgba(245, 158, 11, 0.15)' },
  
  // Başarılı / Tamamlandı
  DONE: { label: 'Tamamlandı', color: 'var(--color-success, #10b981)', bg: 'rgba(16, 185, 129, 0.15)' },
  COMPLETED: { label: 'Tamamlandı', color: 'var(--color-success, #10b981)', bg: 'rgba(16, 185, 129, 0.15)' },
  PAID: { label: 'Ödendi', color: 'var(--color-success, #10b981)', bg: 'rgba(16, 185, 129, 0.15)' },
  APPROVED: { label: 'Onaylandı', color: 'var(--color-success, #10b981)', bg: 'rgba(16, 185, 129, 0.15)' },
  
  // Bekliyor / Nötr
  PENDING: { label: 'Bekliyor', color: 'var(--color-primary, #6366f1)', bg: 'rgba(99, 102, 241, 0.15)' },
  CANCELLED: { label: 'İptal', color: 'var(--text-secondary, #94a3b8)', bg: 'rgba(148, 163, 184, 0.15)' },
};

export default function StatusBadge({ status, label, size = 'sm', style = {} }) {
  const normalizedKey = String(status || '').toUpperCase();
  const config = STATUS_CONFIGS[normalizedKey] || {
    label: label || status || 'Bilinmiyor',
    color: 'var(--text-secondary, #94a3b8)',
    bg: 'rgba(148, 163, 184, 0.15)'
  };

  const displayText = label || config.label;
  const padding = size === 'md' ? '4px 10px' : '2px 8px';
  const fontSize = size === 'md' ? '0.85rem' : '0.75rem';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding,
        fontSize,
        fontWeight: 600,
        borderRadius: '4px',
        color: config.color,
        backgroundColor: config.bg,
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        ...style
      }}
    >
      {displayText}
    </span>
  );
}
