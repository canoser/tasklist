import React from 'react';
import StatusBadge from './StatusBadge/StatusBadge';

export const PriorityBadge = ({ priority }) => {
  const p = (priority || 'NORMAL').toUpperCase();
  if (p === 'HIGH' || p === 'URGENT') {
    return (
      <span style={{
        fontSize: '0.7rem',
        fontWeight: 700,
        padding: '2px 8px',
        borderRadius: '12px',
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        color: 'var(--color-danger, #ef4444)',
        border: '1px solid rgba(239, 68, 68, 0.3)'
      }}>
        ⚡ Kritik
      </span>
    );
  }
  if (p === 'LOW') {
    return (
      <span style={{
        fontSize: '0.7rem',
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: '12px',
        backgroundColor: 'rgba(148, 163, 184, 0.15)',
        color: 'var(--text-secondary, #64748b)'
      }}>
        Düşük
      </span>
    );
  }
  return (
    <span style={{
      fontSize: '0.7rem',
      fontWeight: 500,
      padding: '2px 8px',
      borderRadius: '12px',
      backgroundColor: 'rgba(148, 163, 184, 0.12)',
      color: 'var(--text-color-muted, #64748b)'
    }}>
      Normal
    </span>
  );
};

export const AssignedViaBadge = ({ assignedVia }) => {
  const v = (assignedVia || 'INDIVIDUAL').toUpperCase();
  if (v === 'GROUP') {
    return (
      <span style={{
        fontSize: '0.7rem',
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: '12px',
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        color: 'var(--color-info, #3b82f6)',
        border: '1px solid rgba(59, 130, 246, 0.3)'
      }}>
        👥 Grup Ödevi
      </span>
    );
  }
  return (
    <span style={{
      fontSize: '0.7rem',
      fontWeight: 600,
      padding: '2px 8px',
      borderRadius: '12px',
      backgroundColor: 'rgba(124, 58, 237, 0.15)',
      color: 'var(--color-primary, #7c3aed)',
      border: '1px solid rgba(124, 58, 237, 0.3)'
    }}>
      👤 Bireysel
    </span>
  );
};

export const HomeworkStatusBadge = ({ status }) => {
  const s = (status || 'PENDING').toUpperCase();
  const labelMap = {
    COMPLETED: '✓ Tamamlandı',
    DONE: '✓ Tamamlandı',
    OVERDUE: '⚠ Gecikmiş',
    PENDING: 'Devam Ediyor'
  };
  return <StatusBadge status={s} label={labelMap[s] || 'Devam Ediyor'} pill />;
};


