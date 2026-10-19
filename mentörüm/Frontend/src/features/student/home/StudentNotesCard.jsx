import React, { useState } from 'react';
import { Pin, Trash2, Lock, Eye } from 'lucide-react';
import Card from '../../../components/common/Card/Card';
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
    <Card padding="md">
      <h3 style={{ margin: '0 0 10px', fontSize: '0.95rem' }}>Kişisel Notlar</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Başlık (opsiyonel)" style={inputStyle} />
        <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={2} placeholder="Notun..." style={inputStyle} />
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', cursor: 'pointer' }}>
            <input type="radio" checked={visibility === 'PRIVATE'} onChange={() => setVisibility('PRIVATE')} />
            <Lock size={13} /> Sadece Ben
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', cursor: 'pointer' }}>
            <input type="radio" checked={visibility === 'COACH'} onChange={() => setVisibility('COACH')} />
            <Eye size={13} /> Koçum da Görsün
          </label>
          <button type="button" onClick={handleAdd} style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: '8px', border: 'none', background: 'var(--color-primary)', color: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
            Ekle
          </button>
        </div>
      </div>

      {notes.map((n) => (
        <div key={n.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
          <button type="button" onClick={() => updateNote.mutateAsync({ id: n.id, data: { title: n.title, content: n.content, visibility: n.visibility, isPinned: !n.isPinned } })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: n.isPinned ? 'var(--color-warning)' : 'var(--text-secondary)' }}>
            <Pin size={15} />
          </button>
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
          <button type="button" onClick={() => deleteNote.mutateAsync(n.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }}>
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      {notes.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Henüz not yok.</p>}
    </Card>
  );
}
