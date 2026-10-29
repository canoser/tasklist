import React from 'react';

export const PriorityBadge = ({ priority }) => {
  const p = (priority || 'NORMAL').toUpperCase();
  if (p === 'HIGH' || p === 'URGENT') {
    return (
      <span style={{
        fontSize: '0.7rem',
        fontWeight: 700,
        padding: '2px 8px',
        borderRadius: '12px',
        backgroundColor: '#fee2e2',
        color: '#dc2626',
        border: '1px solid #fecaca'
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
        backgroundColor: '#f1f5f9',
        color: '#64748b'
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
      backgroundColor: '#f3f4f6',
      color: '#4b5563'
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
        backgroundColor: '#eff6ff',
        color: '#2563eb',
        border: '1px solid #bfdbfe'
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
      backgroundColor: '#f5f3ff',
      color: '#7c3aed',
      border: '1px solid #ddd6fe'
    }}>
      👤 Bireysel
    </span>
  );
};

export const HomeworkStatusBadge = ({ status }) => {
  const s = (status || 'PENDING').toUpperCase();
  if (s === 'COMPLETED') {
    return (
      <span style={{
        fontSize: '0.75rem',
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: '12px',
        backgroundColor: '#dcfce7',
        color: '#166534'
      }}>
        ✓ Tamamlandı
      </span>
    );
  }
  if (s === 'OVERDUE') {
    return (
      <span style={{
        fontSize: '0.75rem',
        fontWeight: 700,
        padding: '2px 8px',
        borderRadius: '12px',
        backgroundColor: '#fee2e2',
        color: '#b91c1c'
      }}>
        ⚠ Gecikmiş
      </span>
    );
  }
  return (
    <span style={{
      fontSize: '0.75rem',
      fontWeight: 600,
      padding: '2px 8px',
      borderRadius: '12px',
      backgroundColor: '#fef3c7',
      color: '#92400e'
    }}>
      Devam Ediyor
    </span>
  );
};

