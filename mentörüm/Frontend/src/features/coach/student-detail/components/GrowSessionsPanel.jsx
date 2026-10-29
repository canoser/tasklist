import React, { useState } from 'react';
import Card from '../../../../components/common/Card/Card';
import Button from '../../../../components/common/Button/Button';
import { Compass, Plus, ChevronDown, ChevronUp, CheckCircle, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const GrowSessionsPanel = ({ sessions = [], onAddSession }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    sessionDate: format(new Date(), 'yyyy-MM-dd'),
    goal: '',
    reality: '',
    options: '',
    willAction: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    if (onAddSession) {
      onAddSession({
        id: `grow_${Date.now()}`,
        title: formData.title.trim(),
        sessionDate: formData.sessionDate,
        growData: {
          goal: formData.goal,
          reality: formData.reality,
          options: formData.options,
          willAction: formData.willAction
        },
        createdAt: new Date().toISOString()
      });
    }

    setFormData({
      title: '',
      sessionDate: format(new Date(), 'yyyy-MM-dd'),
      goal: '',
      reality: '',
      options: '',
      willAction: ''
    });
    setShowAddForm(false);
  };

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Compass size={18} style={{ color: 'var(--color-primary)' }} />
            <span>GROW Seans Modeli & Görüşme Kayıtları</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowAddForm(!showAddForm)}>
            <Plus size={14} style={{ marginRight: '4px' }} />
            Yeni GROW Seansı
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {showAddForm && (
          <form onSubmit={handleSubmit} style={{ padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color-main)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Görüşme Başlığı</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Kasım Ayı Net Değerlendirmesi"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Tarih</label>
                <input
                  type="date"
                  value={formData.sessionDate}
                  onChange={(e) => setFormData({ ...formData, sessionDate: e.target.value })}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary)' }}>🎯 G - Goal (Hedef)</label>
                <textarea
                  rows={2}
                  placeholder="Öğrencinin bu seansta varmak istediği hedef..."
                  value={formData.goal}
                  onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.825rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f59e0b' }}>🔍 R - Reality (Mevcut Durum)</label>
                <textarea
                  rows={2}
                  placeholder="Şu anki gerçek durum, zorlandığı noktalar..."
                  value={formData.reality}
                  onChange={(e) => setFormData({ ...formData, reality: e.target.value })}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.825rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#3b82f6' }}>💡 O - Options (Seçenekler)</label>
                <textarea
                  rows={2}
                  placeholder="Öğrencinin yapabileceği olası hamleler..."
                  value={formData.options}
                  onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.825rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#10b981' }}>🚀 W - Will (Eylem Taahhüdü)</label>
                <textarea
                  rows={2}
                  placeholder="Öğrencinin kesin olarak uygulayacağı aksiyon..."
                  value={formData.willAction}
                  onChange={(e) => setFormData({ ...formData, willAction: e.target.value })}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.825rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>Vazgeç</Button>
              <Button type="submit" variant="primary" size="sm">Seansı Kaydet</Button>
            </div>
          </form>
        )}

        {/* Geçmiş Seanslar Listesi */}
        {sessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-color-muted)', fontSize: '0.85rem' }}>
            Henüz kaydedilmiş GROW koçluk görüşmesi bulunmuyor.
          </div>
        ) : (
          sessions.map((s) => {
            const isExpanded = expandedId === s.id;
            const grow = s.growData || {};
            return (
              <div key={s.id} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                <div
                  onClick={() => setExpandedId(isExpanded ? null : s.id)}
                  style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', backgroundColor: 'var(--bg-color-main)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Calendar size={16} style={{ color: 'var(--text-color-muted)' }} />
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.title}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-color-muted)' }}>{s.sessionDate}</span>
                  </div>
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>

                {isExpanded && (
                  <div style={{ padding: '14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', backgroundColor: 'var(--bg-color-surface)' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)' }}>🎯 Hedef (Goal)</div>
                      <p style={{ margin: '4px 0 0', fontSize: '0.825rem' }}>{grow.goal || '-'}</p>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f59e0b' }}>🔍 Mevcut Durum (Reality)</div>
                      <p style={{ margin: '4px 0 0', fontSize: '0.825rem' }}>{grow.reality || '-'}</p>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#3b82f6' }}>💡 Seçenekler (Options)</div>
                      <p style={{ margin: '4px 0 0', fontSize: '0.825rem' }}>{grow.options || '-'}</p>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10b981' }}>🚀 Aksiyon (Will)</div>
                      <p style={{ margin: '4px 0 0', fontSize: '0.825rem' }}>{grow.willAction || '-'}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
};

export default GrowSessionsPanel;

