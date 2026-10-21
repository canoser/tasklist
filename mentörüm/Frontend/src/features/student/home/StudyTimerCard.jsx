import React, { useState, useEffect } from 'react';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import { Timer, Zap, Play, Pause, RotateCcw, Check, BookOpen } from 'lucide-react';
import { useCreateStudySession, useStudentCurriculum } from '../studentApi';

import { ChevronDown, ChevronUp } from 'lucide-react';

export default function StudyTimerCard({ compact = false, collapsible = false }) {
  const [activeTab, setActiveTab] = useState('timer'); // 'timer' | 'quicklog'
  const [isExpanded, setIsExpanded] = useState(!collapsible);
  
  // Kronometre state
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);

  // Oturum tamamlama form state
  const [showLogModal, setShowLogModal] = useState(false);
  const [loggedMinutes, setLoggedMinutes] = useState(45);
  const [questionCount, setQuestionCount] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [blank, setBlank] = useState(0);
  const [sourceType, setSourceType] = useState('CHRONOMETER');
  const [successMsg, setSuccessMsg] = useState('');

  // Quick-Log state
  const [quickMinutes, setQuickMinutes] = useState(45);
  const [quickQuestions, setQuickQuestions] = useState(20);
  const [quickCorrect, setQuickCorrect] = useState(18);
  const [quickWrong, setQuickWrong] = useState(2);

  const createSessionMutation = useCreateStudySession();
  const { data: curriculum = [] } = useStudentCurriculum();
  const [topicId, setTopicId] = useState('');
  const topics = (curriculum || []).map((t) => ({ id: t.id, label: `${t.subjectName} - ${t.topicName}` }));

  useEffect(() => {
    let interval = null;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const handleStart = () => {
    if (!sessionStartTime) setSessionStartTime(new Date().toISOString());
    setIsActive(true);
  };

  const handlePause = () => {
    setIsActive(false);
  };

  const handleReset = () => {
    setIsActive(false);
    setSeconds(0);
    setSessionStartTime(null);
  };

  const handleQuickPreset = (mins) => {
    setIsActive(false);
    setSeconds(mins * 60);
    setSessionStartTime(new Date().toISOString());
  };

  const handleFinishTimer = () => {
    setIsActive(false);
    const mins = Math.max(1, Math.round(seconds / 60));
    setLoggedMinutes(mins);
    setSourceType('CHRONOMETER');
    setShowLogModal(true);
  };

  const handleSaveSession = (e) => {
    e.preventDefault();
    createSessionMutation.mutate({
      minutes: Number(loggedMinutes) || 0,
      questionCount: Number(questionCount) || 0,
      correct: Number(correct) || 0,
      wrong: Number(wrong) || 0,
      blank: Number(blank) || 0,
      sourceType,
      curriculumTopicId: topicId || undefined,
      startedAt: sessionStartTime || new Date().toISOString(),
      endedAt: new Date().toISOString(),
    }, {
      onSuccess: () => {
        setShowLogModal(false);
        handleReset();
        setSuccessMsg('Çalışma oturumu başarıyla kaydedildi!');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    });
  };

  const handleQuickLogSubmit = (e) => {
    e.preventDefault();
    createSessionMutation.mutate({
      minutes: Number(quickMinutes) || 0,
      questionCount: Number(quickQuestions) || 0,
      correct: Number(quickCorrect) || 0,
      wrong: Number(quickWrong) || 0,
      blank: Math.max(0, (Number(quickQuestions) || 0) - (Number(quickCorrect) || 0) - (Number(quickWrong) || 0)),
      sourceType: 'QUICK_LOG',
      curriculumTopicId: topicId || undefined,
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
    }, {
      onSuccess: () => {
        setSuccessMsg('Hızlı kayıt başarıyla eklendi!');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    });
  };

  const formatTimer = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (collapsible && !isExpanded) {
    return (
      <Card padding="sm" style={{ marginBottom: compact ? '0.75rem' : '1.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div 
            onClick={() => setIsExpanded(true)} 
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }}
          >
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(99, 102, 241, 0.12)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Timer size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {isActive ? `Çalışıyor: ${formatTimer(seconds)}` : 'Kronometre Hazır'}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                {isActive ? 'Oturumu duraklatmak veya detaylar için tıkla' : 'Hızlı odaklanma veya manuel kayıt için tıkla'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {!isActive ? (
              <Button size="sm" variant="primary" onClick={handleStart} style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
                <Play size={13} style={{ marginRight: 4 }} /> Başlat
              </Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={handlePause} style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
                <Pause size={13} style={{ marginRight: 4 }} /> Duraklat
              </Button>
            )}
            <button 
              type="button" 
              onClick={() => setIsExpanded(true)}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }}
              title="Genişlet"
            >
              <ChevronDown size={18} />
            </button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card padding={compact ? 'md' : 'lg'} style={{ marginBottom: compact ? '0.75rem' : '1.5rem', border: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: compact ? '0.6rem' : '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: compact ? '0.5rem' : '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button 
            type="button"
            onClick={() => setActiveTab('timer')}
            style={{
              background: activeTab === 'timer' ? 'var(--color-primary-light, rgba(99, 102, 241, 0.15))' : 'transparent',
              color: activeTab === 'timer' ? 'var(--color-primary, #6366f1)' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '6px',
              padding: compact ? '0.3rem 0.6rem' : '0.4rem 0.8rem',
              fontWeight: 600,
              fontSize: compact ? '0.78rem' : '0.85rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Timer size={14} /> Canlı Kronometre
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('quicklog')}
            style={{
              background: activeTab === 'quicklog' ? 'var(--color-primary-light, rgba(99, 102, 241, 0.15))' : 'transparent',
              color: activeTab === 'quicklog' ? 'var(--color-primary, #6366f1)' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '6px',
              padding: compact ? '0.3rem 0.6rem' : '0.4rem 0.8rem',
              fontWeight: 600,
              fontSize: compact ? '0.78rem' : '0.85rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Zap size={14} /> Hızlı Kayıt
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {successMsg && (
            <span style={{ fontSize: '0.8rem', color: 'var(--color-success, #10b981)', fontWeight: 600 }}>
              {successMsg}
            </span>
          )}
          {collapsible && (
            <button 
              type="button" 
              onClick={() => setIsExpanded(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 2 }}
              title="Daralt"
            >
              <ChevronUp size={18} />
            </button>
          )}
        </div>
      </div>

      {activeTab === 'timer' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: compact ? '0.5rem' : '0.8rem', padding: compact ? '0.2rem 0' : '0.6rem 0' }}>
          {/* Hızlı Ders / Konu Seçimi Çipi (T06) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '320px', width: '100%' }}>
            <BookOpen size={14} style={{ color: 'var(--color-primary, #10B981)', flexShrink: 0 }} />
            <select
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              style={{
                flex: 1,
                padding: '4px 8px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-app)',
                color: 'var(--text-primary)',
                fontSize: '0.78rem',
                outline: 'none',
              }}
            >
              <option value="">Çalışılacak ders/konu seç (opsiyonel)</option>
              {topics.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>

          <div style={{
            fontSize: compact ? '2.3rem' : '3.5rem',
            fontFamily: 'monospace',
            fontWeight: 800,
            color: isActive ? 'var(--color-primary, #6366f1)' : 'var(--text-primary)',
            letterSpacing: '2px',
            lineHeight: 1
          }}>
            {formatTimer(seconds)}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {!isActive ? (
              <Button size={compact ? 'sm' : 'md'} variant="primary" onClick={handleStart} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <Play size={14} /> Başlat
              </Button>
            ) : (
              <Button size={compact ? 'sm' : 'md'} variant="secondary" onClick={handlePause} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <Pause size={14} /> Duraklat
              </Button>
            )}

            <Button size={compact ? 'sm' : 'md'} variant="ghost" onClick={handleReset} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <RotateCcw size={14} /> Sıfırla
            </Button>

            {seconds > 0 && (
              <Button size={compact ? 'sm' : 'md'} variant="primary" onClick={handleFinishTimer} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <Check size={14} /> Bitir ve Kaydet
              </Button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Hızlı Süre:</span>
            <Button size="sm" variant="outline" onClick={() => handleQuickPreset(25)} style={{ padding: '3px 8px', fontSize: '0.72rem' }}>25 dk (Pomodoro)</Button>
            <Button size="sm" variant="outline" onClick={() => handleQuickPreset(45)} style={{ padding: '3px 8px', fontSize: '0.72rem' }}>45 dk (Ders)</Button>
          </div>

          {showLogModal && (
            <div style={{
              width: '100%',
              maxWidth: '480px',
              marginTop: '1rem',
              padding: '1rem',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px'
            }}>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem' }}>Oturum İstatistikleri</h4>
              <form onSubmit={handleSaveSession} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <select value={topicId} onChange={(e) => setTopicId(e.target.value)} style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
                  <option value="">Ders / Konu seç (opsiyonel)</option>
                  {topics.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Süre (Dakika)</label>
                    <input 
                      type="number" 
                      min="1" 
                      value={loggedMinutes} 
                      onChange={(e) => setLoggedMinutes(e.target.value)}
                      style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Toplam Soru</label>
                    <input 
                      type="number" 
                      min="0" 
                      value={questionCount} 
                      onChange={(e) => setQuestionCount(e.target.value)}
                      style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--color-success, #10b981)', display: 'block' }}>Doğru</label>
                    <input 
                      type="number" 
                      min="0" 
                      value={correct} 
                      onChange={(e) => setCorrect(e.target.value)}
                      style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--color-danger, #ef4444)', display: 'block' }}>Yanlış</label>
                    <input 
                      type="number" 
                      min="0" 
                      value={wrong} 
                      onChange={(e) => setWrong(e.target.value)}
                      style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Boş</label>
                    <input 
                      type="number" 
                      min="0" 
                      value={blank} 
                      onChange={(e) => setBlank(e.target.value)}
                      style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowLogModal(false)}>İptal</Button>
                  <Button type="submit" variant="primary" size="sm" isLoading={createSessionMutation.isPending}>Kaydet</Button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {activeTab === 'quicklog' && (
        <form onSubmit={handleQuickLogSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
          <select value={topicId} onChange={(e) => setTopicId(e.target.value)} style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
            <option value="">Ders / Konu seç (opsiyonel)</option>
            {topics.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Tamamladığın çalışma oturumunu tek tıkla sisteme işle:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Dakika</label>
              <input 
                type="number" 
                min="1" 
                value={quickMinutes} 
                onChange={(e) => setQuickMinutes(e.target.value)}
                style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Toplam Soru</label>
              <input 
                type="number" 
                min="0" 
                value={quickQuestions} 
                onChange={(e) => setQuickQuestions(e.target.value)}
                style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--color-success, #10b981)', display: 'block' }}>Doğru</label>
              <input 
                type="number" 
                min="0" 
                value={quickCorrect} 
                onChange={(e) => setQuickCorrect(e.target.value)}
                style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--color-danger, #ef4444)', display: 'block' }}>Yanlış</label>
              <input 
                type="number" 
                min="0" 
                value={quickWrong} 
                onChange={(e) => setQuickWrong(e.target.value)}
                style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="submit" variant="primary" size="md" isLoading={createSessionMutation.isPending} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={15} /> 5 Saniyede Kaydet
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
