import React from 'react';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import { Timer, Zap, Play, Pause, RotateCcw, Check, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { useStudyTimer } from './useStudyTimer';

export default function StudyTimerCard({ compact = false, collapsible = false }) {
  const t = useStudyTimer(collapsible);

  if (collapsible && !t.isExpanded) {
    return (
      <Card padding="sm" style={{ marginBottom: compact ? '0.75rem' : '1.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div onClick={() => t.setIsExpanded(true)} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(99, 102, 241, 0.12)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Timer size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {t.isActive ? `Çalışıyor: ${t.formatTimer(t.seconds)}` : 'Kronometre Hazır'}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                {t.isActive ? 'Oturumu duraklatmak veya detaylar için tıkla' : 'Hızlı odaklanma veya manuel kayıt için tıkla'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {!t.isActive ? (
              <Button size="sm" variant="primary" onClick={t.handleStart} style={{ padding: '6px 12px', fontSize: '0.78rem' }}><Play size={13} style={{ marginRight: 4 }} /> Başlat</Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={t.handlePause} style={{ padding: '6px 12px', fontSize: '0.78rem' }}><Pause size={13} style={{ marginRight: 4 }} /> Duraklat</Button>
            )}
            <button type="button" onClick={() => t.setIsExpanded(true)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }} title="Genişlet">
              <ChevronDown size={18} />
            </button>
          </div>
        </div>
      </Card>
    );
  }

  const inputStyle = { width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' };

  return (
    <Card padding={compact ? 'md' : 'lg'} style={{ marginBottom: compact ? '0.75rem' : '1.5rem', border: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: compact ? '0.6rem' : '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: compact ? '0.5rem' : '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {[
            { id: 'timer', icon: <Timer size={14} />, label: 'Canlı Kronometre' },
            { id: 'quicklog', icon: <Zap size={14} />, label: 'Hızlı Kayıt' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => t.setActiveTab(tab.id)}
              style={{
                background: t.activeTab === tab.id ? 'var(--color-primary-light, rgba(99, 102, 241, 0.15))' : 'transparent',
                color: t.activeTab === tab.id ? 'var(--color-primary, #6366f1)' : 'var(--text-secondary)',
                border: 'none', borderRadius: '6px', padding: compact ? '0.3rem 0.6rem' : '0.4rem 0.8rem',
                fontWeight: 600, fontSize: compact ? '0.78rem' : '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {t.successMsg && <span style={{ fontSize: '0.8rem', color: 'var(--color-success, #10b981)', fontWeight: 600 }}>{t.successMsg}</span>}
          {collapsible && (
            <button type="button" onClick={() => t.setIsExpanded(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 2 }} title="Daralt">
              <ChevronUp size={18} />
            </button>
          )}
        </div>
      </div>

      {t.activeTab === 'timer' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: compact ? '0.5rem' : '0.8rem', padding: compact ? '0.2rem 0' : '0.6rem 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '320px', width: '100%' }}>
            <BookOpen size={14} style={{ color: 'var(--color-primary, #10B981)', flexShrink: 0 }} />
            <select value={t.topicId} onChange={(e) => t.setTopicId(e.target.value)} style={{ ...inputStyle, flex: 1, padding: '4px 8px', borderRadius: '8px', fontSize: '0.78rem', outline: 'none' }}>
              <option value="">Çalışılacak ders/konu seç (opsiyonel)</option>
              {t.topics.map((tp) => <option key={tp.id} value={tp.id}>{tp.label}</option>)}
            </select>
          </div>

          <div style={{ fontSize: compact ? '2.3rem' : '3.5rem', fontFamily: 'monospace', fontWeight: 800, color: t.isActive ? 'var(--color-primary, #6366f1)' : 'var(--text-primary)', letterSpacing: '2px', lineHeight: 1 }}>
            {t.formatTimer(t.seconds)}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {!t.isActive ? (
              <Button size={compact ? 'sm' : 'md'} variant="primary" onClick={t.handleStart} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><Play size={14} /> Başlat</Button>
            ) : (
              <Button size={compact ? 'sm' : 'md'} variant="secondary" onClick={t.handlePause} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><Pause size={14} /> Duraklat</Button>
            )}
            <Button size={compact ? 'sm' : 'md'} variant="ghost" onClick={t.handleReset} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><RotateCcw size={14} /> Sıfırla</Button>
            {t.seconds > 0 && (
              <Button size={compact ? 'sm' : 'md'} variant="primary" onClick={t.handleFinishTimer} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><Check size={14} /> Bitir ve Kaydet</Button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Hızlı Süre:</span>
            <Button size="sm" variant="outline" onClick={() => t.handleQuickPreset(25)} style={{ padding: '3px 8px', fontSize: '0.72rem' }}>25 dk (Pomodoro)</Button>
            <Button size="sm" variant="outline" onClick={() => t.handleQuickPreset(45)} style={{ padding: '3px 8px', fontSize: '0.72rem' }}>45 dk (Ders)</Button>
          </div>

          {t.showLogModal && (
            <div style={{ width: '100%', maxWidth: '480px', marginTop: '1rem', padding: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem' }}>Oturum İstatistikleri</h4>
              <form onSubmit={t.handleSaveSession} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <select value={t.topicId} onChange={(e) => t.setTopicId(e.target.value)} style={inputStyle}>
                  <option value="">Ders / Konu seç (opsiyonel)</option>
                  {t.topics.map((tp) => <option key={tp.id} value={tp.id}>{tp.label}</option>)}
                </select>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div><label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Süre (Dakika)</label><input type="number" min="1" value={t.loggedMinutes} onChange={(e) => t.setLoggedMinutes(e.target.value)} style={inputStyle} /></div>
                  <div><label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Toplam Soru</label><input type="number" min="0" value={t.questionCount} onChange={(e) => t.setQuestionCount(e.target.value)} style={inputStyle} /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                  <div><label style={{ fontSize: '0.8rem', color: 'var(--color-success, #10b981)', display: 'block' }}>Doğru</label><input type="number" min="0" value={t.correct} onChange={(e) => t.setCorrect(e.target.value)} style={inputStyle} /></div>
                  <div><label style={{ fontSize: '0.8rem', color: 'var(--color-danger, #ef4444)', display: 'block' }}>Yanlış</label><input type="number" min="0" value={t.wrong} onChange={(e) => t.setWrong(e.target.value)} style={inputStyle} /></div>
                  <div><label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Boş</label><input type="number" min="0" value={t.blank} onChange={(e) => t.setBlank(e.target.value)} style={inputStyle} /></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <Button type="button" variant="ghost" size="sm" onClick={() => t.setShowLogModal(false)}>İptal</Button>
                  <Button type="submit" variant="primary" size="sm" isLoading={t.isSubmitting}>Kaydet</Button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {t.activeTab === 'quicklog' && (
        <form onSubmit={t.handleQuickLogSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
          <select value={t.topicId} onChange={(e) => t.setTopicId(e.target.value)} style={inputStyle}>
            <option value="">Ders / Konu seç (opsiyonel)</option>
            {t.topics.map((tp) => <option key={tp.id} value={tp.id}>{tp.label}</option>)}
          </select>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Tamamladığın çalışma oturumunu tek tıkla sisteme işle:</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.75rem' }}>
            <div><label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Dakika</label><input type="number" min="1" value={t.quickMinutes} onChange={(e) => t.setQuickMinutes(e.target.value)} style={inputStyle} /></div>
            <div><label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Toplam Soru</label><input type="number" min="0" value={t.quickQuestions} onChange={(e) => t.setQuickQuestions(e.target.value)} style={inputStyle} /></div>
            <div><label style={{ fontSize: '0.8rem', color: 'var(--color-success, #10b981)', display: 'block' }}>Doğru</label><input type="number" min="0" value={t.quickCorrect} onChange={(e) => t.setQuickCorrect(e.target.value)} style={inputStyle} /></div>
            <div><label style={{ fontSize: '0.8rem', color: 'var(--color-danger, #ef4444)', display: 'block' }}>Yanlış</label><input type="number" min="0" value={t.quickWrong} onChange={(e) => t.setQuickWrong(e.target.value)} style={inputStyle} /></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="submit" variant="primary" size="md" isLoading={t.isSubmitting} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={15} /> 5 Saniyede Kaydet
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
