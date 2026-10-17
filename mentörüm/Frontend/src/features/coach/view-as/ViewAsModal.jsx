import React, { useState } from 'react';
import Modal from '../../../components/common/Modal/Modal';
import Button from '../../../components/common/Button/Button';
import { useAuthStore } from '../../auth/authStore';
import { useStudents } from '../coachApi';
import { usePrograms, useTeachers } from '../coachSchoolApi';

export default function ViewAsModal({ isOpen, onClose }) {
  const { viewAs, setViewAs } = useAuthStore();
  const [role, setRole] = useState('Student'); // 'Student' | 'Teacher' | 'Parent'
  const [targetId, setTargetId] = useState('');

  const { data: students = [] } = useStudents();
  const { data: programs = [] } = usePrograms();
  const { data: teachers = [] } = useTeachers(programs[0]?.id);

  if (!isOpen) return null;

  const handleApply = () => {
    if (!targetId) {
      alert('Lütfen bir kişi seçin.');
      return;
    }

    let name = '';
    if (role === 'Student') {
      name = students.find(s => s.id === targetId)?.fullName || 'Öğrenci';
    } else if (role === 'Teacher') {
      name = teachers.find(t => t.id === targetId)?.fullName || 'Öğretmen';
    } else if (role === 'Parent') {
      // Öğrencinin velisi
      name = `Veli (${students.find(s => s.id === targetId)?.fullName || 'Öğrenci'})`;
    }

    setViewAs({ role, id: targetId, name });
    onClose();
  };

  const handleExit = () => {
    setViewAs(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Rol Gözüyle Gör (Salt-Okunur Önizleme)">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Öğrenci, öğretmen veya velinizin platformu tam olarak nasıl gördüğünü test edin.
          Güvenlik gereği tüm yazma/değiştirme işlemleri (POST/PUT/DELETE) 403 ile engellenir.
        </p>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
            Hangi Rol Gözüyle Bakmak İstiyorsunuz?
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => { setRole('Student'); setTargetId(''); }}
              style={{
                flex: 1,
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: role === 'Student' ? 'var(--color-primary-light, rgba(99, 102, 241, 0.15))' : 'var(--bg-app)',
                color: role === 'Student' ? 'var(--color-primary)' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              🎓 Öğrenci
            </button>
            <button
              type="button"
              onClick={() => { setRole('Teacher'); setTargetId(''); }}
              style={{
                flex: 1,
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: role === 'Teacher' ? 'var(--color-primary-light, rgba(99, 102, 241, 0.15))' : 'var(--bg-app)',
                color: role === 'Teacher' ? 'var(--color-primary)' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              👨‍🏫 Öğretmen
            </button>
            <button
              type="button"
              onClick={() => { setRole('Parent'); setTargetId(''); }}
              style={{
                flex: 1,
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: role === 'Parent' ? 'var(--color-primary-light, rgba(99, 102, 241, 0.15))' : 'var(--bg-app)',
                color: role === 'Parent' ? 'var(--color-primary)' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              👨‍👩‍👧 Veli
            </button>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
            Kişi Seçin:
          </label>
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-app)',
              color: 'var(--text-primary)',
              fontSize: '0.875rem'
            }}
          >
            <option value="">-- Seçiniz --</option>
            {role === 'Student' && students.map(s => (
              <option key={s.id} value={s.id}>{s.fullName} ({s.grade ? s.grade + '. Sınıf' : ''})</option>
            ))}
            {role === 'Teacher' && teachers.map(t => (
              <option key={t.id} value={t.id}>{t.fullName} ({t.branch || 'Öğretmen'})</option>
            ))}
            {role === 'Parent' && students.map(s => (
              <option key={s.id} value={s.id}>{s.fullName} Velisi</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
          {viewAs ? (
            <Button size="sm" variant="ghost" onClick={handleExit} style={{ color: 'var(--color-danger, #ef4444)' }}>
              Önizleme Modundan Çık
            </Button>
          ) : <div />}

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button size="sm" variant="ghost" onClick={onClose}>Vazgeç</Button>
            <Button size="sm" variant="primary" onClick={handleApply}>
              Gözüyle Gör Modunu Başlat
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
