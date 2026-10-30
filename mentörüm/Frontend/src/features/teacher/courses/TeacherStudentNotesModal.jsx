import React, { useState } from 'react';
import Modal from '../../../components/common/Modal/Modal';
import Button from '../../../components/common/Button/Button';

import { useTeacherStudentNotes, useCreateTeacherNote } from '../teacherApi';

export default function TeacherStudentNotesModal({ isOpen, onClose, courseId, student }) {
  const [note, setNote] = useState('');
  const [summary, setSummary] = useState('');
  const [visibility, setVisibility] = useState('STUDENT_VISIBLE');

  const { data: notes = [], isLoading } = useTeacherStudentNotes(courseId, student?.id);
  const createNoteMutation = useCreateTeacherNote();

  if (!isOpen || !student) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!note.trim()) return;

    createNoteMutation.mutate({
      courseId,
      studentId: student.id,
      data: {
        note: note.trim(),
        summary: summary.trim() || null,
        visibility
      }
    }, {
      onSuccess: () => {
        setNote('');
        setSummary('');
        setVisibility('STUDENT_VISIBLE');
      }
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${student.fullName} — Ders Notları`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* Yeni Not Ekleme Formu */}
        <form onSubmit={handleSubmit} style={{
          background: 'var(--bg-card, rgba(255,255,255,0.05))',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Yeni Not Ekle</h4>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              Tam Not (Koç ve Öğretmen Detayı)
            </label>
            <textarea
              required
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Öğrencinin dersteki durumu, dikkati, eksikleri..."
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-app)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              Kısa Özet (Öğrenci ve Veliye Gösterilebilir)
            </label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Örn: Konuyu iyi kavradı, soru çözümü başarılı."
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-app)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Görünürlük:</label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              style={{
                padding: '0.35rem 0.6rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-app)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem'
              }}
            >
              <option value="STUDENT_VISIBLE">Öğrenciye ve Veliye Görünür</option>
              <option value="COACH_ONLY">Sadece Koç Görsün (Gizli Not)</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
            <Button type="submit" size="sm" isLoading={createNoteMutation.isPending}>
              Notu Kaydet
            </Button>
          </div>
        </form>

        {/* Geçmiş Notlar Listesi */}
        <div>
          <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
            Geçmiş Ders Notları ({notes.length})
          </h4>

          {isLoading ? (
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Yükleniyor...</div>
          ) : notes.length === 0 ? (
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Henüz ders notu eklenmemiş.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto' }}>
              {notes.map((n) => (
                <div key={n.id} style={{
                  padding: '0.75rem',
                  borderRadius: '6px',
                  background: 'var(--bg-card, rgba(255,255,255,0.03))',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.3rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {n.createdAt ? new Date(n.createdAt).toLocaleString('tr-TR') : ''}
                    </span>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: n.visibility === 'COACH_ONLY' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      color: n.visibility === 'COACH_ONLY' ? 'var(--color-danger, #ef4444)' : 'var(--color-success, #10b981)'
                    }}>
                      {n.visibility === 'COACH_ONLY' ? 'Koça Özel' : 'Öğrenciye Açık'}
                    </span>
                  </div>

                  {n.summary && (
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Özet: {n.summary}
                    </div>
                  )}

                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                    {n.note}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </Modal>
  );
}
