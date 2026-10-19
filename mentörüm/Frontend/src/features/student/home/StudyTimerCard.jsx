import React, { useState, useEffect } from 'react';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import { useCreateStudySession, useStudentCurriculum } from '../studentApi';

export default function StudyTimerCard() {
  const [activeTab, setActiveTab] = useState('timer'); // 'timer' | 'quicklog'
  
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
        setSuccessMsg('Çalışma oturumu başarıyla kaydedildi! 🎯');
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
        setSuccessMsg('Hızlı kayıt başarıyla eklendi! ⚡');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    });
  };

  const formatTimer = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <Card padding="lg" style={{ marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            type="button"
            onClick={() => setActiveTab('timer')}
            style={{
              background: activeTab === 'timer' ? 'var(--color-primary-light, rgba(99, 102, 241, 0.15))' : 'transparent',
              color: activeTab === 'timer' ? 'var(--color-primary, #6366f1)' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '6px',
              padding: '0.4rem 0.8rem',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            ⏱️ Canlı Kronometre
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('quicklog')}
            style={{
              background: activeTab === 'quicklog' ? 'var(--color-primary-light, rgba(99, 102, 241, 0.15))' : 'transparent',
              color: activeTab === 'quicklog' ? 'var(--color-primary, #6366f1)' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '6px',
              padding: '0.4rem 0.8rem',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            ⚡ Hızlı Kayıt (Quick-Log)
          </button>
        </div>

        {successMsg && (
          <span style={{ fontSize: '0.85rem', color: 'var(--color-success, #10b981)', fontWeight: 600 }}>
            {successMsg}
          </span>
        )}
      </div>

      {activeTab === 'timer' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1rem 0' }}>
          <div style={{
            fontSize: '3.5rem',
            fontFamily: 'monospace',
            fontWeight: 800,
            color: isActive ? 'var(--color-primary, #6366f1)' : 'var(--text-primary)',
            letterSpacing: '2px'
          }}>
            {formatTimer(seconds)}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {!isActive ? (
              <Button size="md" variant="primary" onClick={handleStart}>
                Başlat ▶
              </Button>
            ) : (
              <Button size="md" variant="secondary" onClick={handlePause}>
                Duraklat ⏸
              </Button>
            )}

            <Button size="md" variant="ghost" onClick={handleReset}>
              Sıfırla ↺
            </Button>

            {seconds > 0 && (
              <Button size="md" variant="primary" onClick={handleFinishTimer}>
                Oturumu Bitir ve Kaydet ✓
              </Button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', alignSelf: 'center' }}>Hızlı Süre:</span>
            <Button size="sm" variant="outline" onClick={() => handleQuickPreset(25)}>25 dk (Pomodoro)</Button>
            <Button size="sm" variant="outline" onClick={() => handleQuickPreset(45)}>45 dk (Ders)</Button>
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
            <Button type="submit" variant="primary" size="md" isLoading={createSessionMutation.isPending}>
              ⚡ 5 Saniyede Kaydet
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
