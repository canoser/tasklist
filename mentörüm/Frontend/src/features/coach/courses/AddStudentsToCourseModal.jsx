import React, { useState, useMemo } from 'react';
import Modal from '../../../components/common/Modal/Modal';
import Button from '../../../components/common/Button/Button';
import { useStudents } from '../coachApi';
import StatusBadge from '../../../components/common/StatusBadge/StatusBadge';

export default function AddStudentsToCourseModal({
  isOpen,
  onClose,
  existingStudents = [],
  onAddStudents,
  title = "Öğrenci Ekle"
}) {
  const { data: allStudents = [], isLoading } = useStudents();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const existingIds = useMemo(() => {
    return new Set(existingStudents.map(s => s.id || s.studentId));
  }, [existingStudents]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allStudents;
    return allStudents.filter(s => 
      s.fullName?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      (s.grade != null && String(s.grade).includes(q))
    );
  }, [allStudents, searchQuery]);

  if (!isOpen) return null;

  const handleToggle = (id) => {
    if (existingIds.has(id)) return;
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const addableIds = filtered.filter(s => !existingIds.has(s.id)).map(s => s.id);
    setSelectedIds(addableIds);
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  const handleSubmit = async () => {
    if (selectedIds.length === 0) return;
    setIsSubmitting(true);
    try {
      await onAddStudents(selectedIds);
      setSelectedIds([]);
      setSearchQuery('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '75vh' }}>
        
        {/* Arama Inputu */}
        <div>
          <input
            type="text"
            placeholder="Öğrenci adı, e-posta veya sınıf ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 0.8rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-app)',
              color: 'var(--text-primary)',
              fontSize: '0.9rem'
            }}
          />
        </div>

        {/* Çoklu Seçim Hızlı İşlemler */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            Seçilen: <strong>{selectedIds.length}</strong> öğrenci
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Button
              variant="ghost"
              size="xs"
              onClick={handleSelectAll}
              style={{ color: 'var(--color-primary)' }}
            >
              Listelenenleri Seç
            </Button>
            <span style={{ color: 'var(--border-color)' }}>|</span>
            <Button
              variant="ghost"
              size="xs"
              onClick={handleDeselectAll}
            >
              Temizle
            </Button>
          </div>
        </div>

        {/* Öğrenci Listesi */}
        <div style={{
          overflowY: 'auto',
          maxHeight: '320px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '0.5rem'
        }}>
          {isLoading ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Yükleniyor...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Öğrenci bulunamadı.</div>
          ) : (
            filtered.map((s) => {
              const isAlreadyAdded = existingIds.has(s.id);
              const isChecked = selectedIds.includes(s.id);

              return (
                <div
                  key={s.id}
                  onClick={() => handleToggle(s.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    background: isChecked ? 'var(--color-primary-light, rgba(99, 102, 241, 0.1))' : isAlreadyAdded ? 'transparent' : 'var(--bg-card)',
                    border: '1px solid',
                    borderColor: isChecked ? 'var(--color-primary)' : 'var(--border-color)',
                    cursor: isAlreadyAdded ? 'not-allowed' : 'pointer',
                    opacity: isAlreadyAdded ? 0.6 : 1,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input
                      type="checkbox"
                      checked={isChecked || isAlreadyAdded}
                      disabled={isAlreadyAdded}
                      onChange={() => handleToggle(s.id)}
                      style={{ cursor: isAlreadyAdded ? 'not-allowed' : 'pointer', accentColor: 'var(--color-primary)' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {s.fullName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {s.email} {s.grade != null ? `· ${s.grade}. Sınıf` : ''} {s.track ? `· ${s.track}` : ''}
                      </div>
                    </div>
                  </div>

                  {isAlreadyAdded && (
                    <StatusBadge status="DONE" label="Zaten Eklendi" size="sm" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Alt Butonlar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Vazgeç
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={selectedIds.length === 0}
          >
            Seçilenleri Ekle ({selectedIds.length})
          </Button>
        </div>

      </div>
    </Modal>
  );
}
