import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../../../components/common/Modal/Modal';
import Button from '../../../components/common/Button/Button';
import { useAuthStore } from '../../auth/authStore';
import { useStudents, useStudent } from '../coachApi';
import { usePrograms, useTeachers } from '../coachSchoolApi';

export default function ViewAsModal({ isOpen, onClose }) {
  const { viewAs, setViewAs } = useAuthStore();
  const navigate = useNavigate();
  const [role, setRole] = useState('Student'); // 'Student' | 'Teacher' | 'Parent'
  const [targetId, setTargetId] = useState('');
  const [parentStudentId, setParentStudentId] = useState('');

  const { data: students = [] } = useStudents();
  const { data: programs = [] } = usePrograms();
  const { data: teachers = [] } = useTeachers(programs[0]?.id);
  const { data: selectedStudent } = useStudent(role === 'Parent' ? parentStudentId : null);

  if (!isOpen) return null;

  const handleApply = () => {
    if (!targetId) {
      alert('Lütfen bir kişi seçin.');
      return;
    }

    let name = '';
    let id = targetId;
    if (role === 'Student') {
      name = students.find(s => s.id === targetId)?.fullName || 'Öğrenci';
    } else if (role === 'Teacher') {
      name = teachers.find(t => t.id === targetId)?.fullName || 'Öğretmen';
    } else if (role === 'Parent') {
      const parent = selectedStudent?.parents?.find(p => p.id === targetId);
      name = parent?.fullName || 'Veli';
    }

    setViewAs({ role, id, name });
    onClose();

    // Tıpa tıp önizleme: hedef rolün ana sayfasına yönlendir
    if (role === 'Student') navigate('/student/home');
    else if (role === 'Teacher') navigate('/teacher/courses');
    else if (role === 'Parent') navigate('/parent/summary');
  };

  const handleExit = () => {
    setViewAs(null);
    onClose();
    navigate('/coach/dashboard');
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
          {role === 'Parent' && (
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Öğrenci Seçin:
              </label>
              <select
                value={parentStudentId}
                onChange={(e) => { setParentStudentId(e.target.value); setTargetId(''); }}
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
                <option value="">-- Öğrenci Seçin --</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.fullName}</option>
                ))}
              </select>
            </div>
          )}

          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
            {role === 'Parent' ? 'Veli Seçin:' : 'Kişi Seçin:'}
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
            {role === 'Parent' && (selectedStudent?.parents || []).map(p => (
              <option key={p.id} value={p.id}>{p.fullName}{p.relation ? ` (${p.relation})` : ''}</option>
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
