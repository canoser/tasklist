import React, { useState } from 'react';
import Modal from '../../../components/common/Modal/Modal';
import Button from '../../../components/common/Button/Button';
import Input, { Select, Textarea } from '../../../components/common/Input/Input';
import StatusBadge from '../../../components/common/StatusBadge/StatusBadge';
import { useTeacherStudentNotes, useCreateTeacherNote } from '../teacherApi';

export default function TeacherStudentNotesModal({ isOpen, open, onClose, courseId, student }) {
  const effectiveOpen = isOpen ?? open;
  const [note, setNote] = useState('');
  const [summary, setSummary] = useState('');
  const [visibility, setVisibility] = useState('STUDENT_VISIBLE');

  const { data: notes = [], isLoading } = useTeacherStudentNotes(courseId, student?.id);
  const createNoteMutation = useCreateTeacherNote();

  if (!effectiveOpen || !student) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!note.trim()) return;

    createNoteMutation.mutate(
      {
        courseId,
        studentId: student.id,
        data: {
          note: note.trim(),
          summary: summary.trim() || null,
          visibility,
        },
      },
      {
        onSuccess: () => {
          setNote('');
          setSummary('');
          setVisibility('STUDENT_VISIBLE');
        },
      }
    );
  };

  return (
    <Modal isOpen={effectiveOpen} onClose={onClose} title={`${student.fullName} — Ders Notları`} maxWidth="520px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <form
          onSubmit={handleSubmit}
          style={{
            background: 'var(--bg-color-muted, rgba(148, 163, 184, 0.08))',
            padding: '1rem',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-color-main)' }}>Yeni Not Ekle</h4>

          <Textarea
            label="Tam Not (Koç ve Öğretmen Detayı) *"
            required
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Öğrencinin dersteki durumu, dikkati, eksikleri..."
          />

          <Input
            label="Kısa Özet (Öğrenci ve Veliye Gösterilebilir)"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Örn: Konuyu iyi kavradı, soru çözümü başarılı."
          />

          <Select
            label="Görünürlük"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
          >
            <option value="STUDENT_VISIBLE">Öğrenciye ve Veliye Görünür</option>
            <option value="COACH_ONLY">Sadece Koç Görsün (Gizli Not)</option>
          </Select>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
            <Button type="submit" size="sm" isLoading={createNoteMutation.isPending}>
              Notu Kaydet
            </Button>
          </div>
        </form>

        <div>
          <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', color: 'var(--text-color-main)' }}>
            Geçmiş Ders Notları ({notes.length})
          </h4>

          {isLoading ? (
            <div style={{ color: 'var(--text-color-muted)', fontSize: '0.85rem' }}>Yükleniyor...</div>
          ) : notes.length === 0 ? (
            <div style={{ color: 'var(--text-color-muted)', fontSize: '0.85rem' }}>Henüz ders notu eklenmemiş.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '280px', overflowY: 'auto' }}>
              {notes.map((n) => (
                <div
                  key={n.id}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    background: 'var(--bg-color-surface)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.3rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-color-muted)' }}>
                      {n.createdAt ? new Date(n.createdAt).toLocaleString('tr-TR') : ''}
                    </span>
                    <StatusBadge
                      status={n.visibility === 'COACH_ONLY' ? 'REJECTED' : 'APPROVED'}
                      label={n.visibility === 'COACH_ONLY' ? 'Koça Özel' : 'Öğrenciye Açık'}
                    />
                  </div>

                  {n.summary && (
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-color-main)' }}>
                      Özet: {n.summary}
                    </div>
                  )}

                  <div style={{ fontSize: '0.85rem', color: 'var(--text-color-muted)', whiteSpace: 'pre-wrap' }}>
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
