import React, { useState } from 'react';
import { Check, HelpCircle } from 'lucide-react';
import Card from '../../../components/common/Card/Card';
import { useStudentQuestions, useCreateQuestion, useResolveQuestion } from '../studentApi';

export default function StudentQuestionsCard() {
  const { data: questions = [] } = useStudentQuestions();
  const createQuestion = useCreateQuestion();
  const resolveQuestion = useResolveQuestion();
  const [text, setText] = useState('');

  const handleAdd = async () => {
    if (!text.trim()) return;
    await createQuestion.mutateAsync({ topicText: text.trim() });
    setText('');
  };

  return (
    <Card padding="md">
      <h3 style={{ margin: '0 0 10px', fontSize: '0.95rem' }}>Takıldığım Konular / Sorulacaklar</h3>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Anlamadığın konu / çözemediğin soru tipi..."
          style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
        />
        <button type="button" onClick={handleAdd} style={{ padding: '0 14px', borderRadius: '8px', border: 'none', background: 'var(--color-primary)', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
          Ekle
        </button>
      </div>
      {questions.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Henüz eklenmiş soru yok.</p>}
      {questions.map((q) => (
        <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: '1px solid var(--border-color)', opacity: q.status === 'RESOLVED' ? 0.5 : 1 }}>
          <HelpCircle size={15} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: '0.85rem', textDecoration: q.status === 'RESOLVED' ? 'line-through' : 'none', wordBreak: 'break-word' }}>{q.topicText}</span>
          {q.status === 'OPEN' && (
            <button type="button" onClick={() => resolveQuestion.mutateAsync(q.id)} title="Çözüldü işaretle"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-success, #10b981)', flexShrink: 0 }}>
              <Check size={16} />
            </button>
          )}
        </div>
      ))}
    </Card>
  );
}
