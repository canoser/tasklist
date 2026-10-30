import React, { useState } from 'react';
import Card from '../../../../components/common/Card/Card';
import Button from '../../../../components/common/Button/Button';
import { Smile, Frown, Meh, AlertCircle, MessageSquare, Send } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const MOOD_MAP = {
  GREAT: { label: 'Harika / Motive', icon: Smile, color: '#10b981' },
  GOOD: { label: 'İyi / Odaklı', icon: Smile, color: '#3b82f6' },
  ENERGETIC: { label: 'Çok Verimli', icon: Smile, color: '#059669' },
  NORMAL: { label: 'Normal', icon: Meh, color: '#3b82f6' },
  TIRED: { label: 'Yorgun', icon: Meh, color: '#f59e0b' },
  STRESSED: { label: 'Stresli', icon: Frown, color: '#f97316' },
  ANXIOUS: { label: 'Kaygılı', icon: AlertCircle, color: '#ef4444' }
};

const StudentPulsePanel = ({ checkins = [], questions = [], onReplyQuestion }) => {
  const [replyingId, setReplyingId] = useState(null);
  const [replyText, setReplyText] = useState('');

  const handleSendReply = (questionId) => {
    if (!replyText.trim()) return;
    if (onReplyQuestion) {
      onReplyQuestion(questionId, replyText.trim());
    }
    setReplyingId(null);
    setReplyText('');
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
      {/* 1. Duygu Durumu & Check-in Nabzı */}
      <Card title="Öğrenci Nabzı & Duygu Durumu (Check-in)">
        {checkins.length === 0 ? (
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-color-muted)', fontStyle: 'italic' }}>
            Henüz check-in kaydı bulunmuyor.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {checkins.slice(0, 5).map((c) => {
              const moodInfo = MOOD_MAP[c.mood] || { label: c.mood, icon: Meh, color: 'var(--text-color-muted)' };
              const IconComp = moodInfo.icon;
              return (
                <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px', borderRadius: '8px', backgroundColor: 'var(--bg-color-main)', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: moodInfo.color, marginTop: '2px' }}>
                    <IconComp size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: moodInfo.color }}>{moodInfo.label}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-color-muted)' }}>
                        {c.checkinDate ? format(new Date(c.checkinDate), 'd MMMM', { locale: tr }) : ''}
                      </span>
                    </div>
                    {c.note && (
                      <p style={{ margin: '4px 0 0', fontSize: '0.825rem', color: 'var(--text-color-main)' }}>
                        "{c.note}"
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* 2. Çözülemeyen Sorular & Koç Yanıtı */}
      <Card title="Çözülemeyen Sorular & Takıldıkları">
        {questions.length === 0 ? (
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-color-muted)', fontStyle: 'italic' }}>
            Çözüm bekleyen soru bulunmuyor.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {questions.map((q) => {
              const isReplying = replyingId === q.id;
              const isResolved = q.status === 'RESOLVED';
              return (
                <div key={q.id} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color-surface)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', padding: '1px 6px', borderRadius: '4px', backgroundColor: isResolved ? '#dcfce7' : '#fef3c7', color: isResolved ? '#166534' : '#92400e', fontWeight: 600 }}>
                        {isResolved ? 'Çözüldü' : 'Çözüm Bekliyor'}
                      </span>
                      {q.subjectName && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-color-muted)', marginLeft: '6px' }}>
                          • {q.subjectName}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-color-muted)' }}>
                      {q.createdAt ? format(new Date(q.createdAt), 'd MMM', { locale: tr }) : ''}
                    </span>
                  </div>

                  <p style={{ margin: '6px 0', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-color-main)' }}>
                    {q.topicText}
                  </p>

                  {/* Koç Cevabı Varsa */}
                  {q.coachReply && (
                    <div style={{ marginTop: '8px', padding: '8px 10px', borderRadius: '6px', backgroundColor: 'rgba(99, 102, 241, 0.08)', borderLeft: '3px solid var(--color-primary)' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '2px' }}>Koç Yanıtı:</div>
                      <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-color-main)' }}>{q.coachReply}</p>
                    </div>
                  )}

                  {/* Koç Yanıt Alanı */}
                  {!isResolved && !isReplying && (
                    <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                      <Button variant="ghost" size="sm" onClick={() => { setReplyingId(q.id); setReplyText(q.coachReply || ''); }}>
                        <MessageSquare size={14} style={{ marginRight: '4px' }} />
                        {q.coachReply ? 'Yanıtı Düzenle' : 'Cevap Yaz'}
                      </Button>
                    </div>
                  )}

                  {isReplying && (
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <textarea
                        rows={2}
                        placeholder="Öğrenciye çözüm ipucu veya açıklama yazın..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.825rem' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <Button variant="ghost" size="sm" onClick={() => setReplyingId(null)}>Vazgeç</Button>
                        <Button variant="primary" size="sm" onClick={() => handleSendReply(q.id)}>
                          <Send size={12} style={{ marginRight: '4px' }} />
                          Cevabı İlet
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default StudentPulsePanel;

