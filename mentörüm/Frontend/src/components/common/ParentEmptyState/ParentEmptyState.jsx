import React from 'react';
import Card from '../Card/Card';

export default function ParentEmptyState({ message = 'Koçunuz henüz bu alanı erişime açmadı.' }) {
  return (
    <div style={{ padding: '2rem 1rem', maxWidth: '600px', margin: '2rem auto', textAlign: 'center' }}>
      <Card padding="xl">
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
        <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)', fontSize: '1.2rem' }}>
          Erişim Kısıtlı
        </h3>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
          {message}
        </p>
      </Card>
    </div>
  );
}
