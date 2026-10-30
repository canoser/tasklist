import React, { useState } from 'react';
import { Pin, Trash2, Lock, Eye } from 'lucide-react';
import Button from '../../../components/common/Button/Button';
import SegmentedTabs from '../../../components/common/SegmentedTabs/SegmentedTabs';
import { useStudentNotes, useCreateNote, useUpdateNote, useDeleteNote } from '../studentApi';

export default function StudentNotesCard() {
  const { data: notes = [] } = useStudentNotes();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState('PRIVATE');

  const handleAdd = async () => {
    if (!content.trim()) return;
    await createNote.mutateAsync({ title: title.trim() || 'Not', content: content.trim(), visibility });
    setTitle(''); setContent(''); setVisibility('PRIVATE');
  };

  const inputStyle = {
    padding: '8px',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    background: 'var(--bg-app)',
    color: 'var(--text-primary)'
  };

  return (
    <div style={{ padding: '4px 0' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Başlık (opsiyonel)" style={inputStyle} />
        <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={2} placeholder="Notun..." style={inputStyle} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <SegmentedTabs
            size="sm"
            activeTab={visibility}
            onChange={setVisibility}
            tabs={[
              { id: 'PRIVATE', label: 'Sadece Ben', icon: <Lock size={12} /> },
              { id: 'COACH', label: 'Koçum da Görsün', icon: <Eye size={12} /> },
            ]}
          />

          <Button type="button" variant="primary" size="sm" onClick={handleAdd}>
            Ekle
          </Button>
        </div>
      </div>

      {notes.map((n) => (
        <div key={n.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            iconOnly
            onClick={() => updateNote.mutateAsync({ id: n.id, data: { title: n.title, content: n.content, visibility: n.visibility, isPinned: !n.isPinned } })}
            style={{ color: n.isPinned ? 'var(--color-warning)' : 'var(--text-secondary)' }}
            title="Sabitle"
          >
            <Pin size={15} />
          </Button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <strong style={{ fontSize: '0.85rem' }}>{n.title}</strong>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                {n.visibility === 'COACH' ? <Eye size={12} /> : <Lock size={12} />}
                {n.visibility === 'COACH' ? 'Koç' : 'Özel'}
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-primary)', wordBreak: 'break-word' }}>{n.content}</p>
          </div>
          <Button
            type="button"
            variant="danger-outline"
            size="xs"
            iconOnly
            onClick={() => deleteNote.mutateAsync(n.id)}
            title="Sil"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ))}
      {notes.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Henüz not yok.</p>}
    </div>
  );
}
