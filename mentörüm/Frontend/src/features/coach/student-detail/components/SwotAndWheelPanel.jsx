import React, { useState, useEffect } from 'react';
import Card from '../../../../components/common/Card/Card';
import Button from '../../../../components/common/Button/Button';
import SegmentedTabs from '../../../../components/common/SegmentedTabs/SegmentedTabs';
import { ShieldCheck, AlertTriangle, Sparkles, TrendingUp, Save } from 'lucide-react';

const DEFAULT_WHEEL_AXES = [
  { key: 'study', label: 'Konu Çalışması' },
  { key: 'questions', label: 'Soru Pratiği' },
  { key: 'analysis', label: 'Deneme Analizi' },
  { key: 'timeMgmt', label: 'Zaman Yönetimi' },
  { key: 'sleep', label: 'Uyku & Enerji' },
  { key: 'motivation', label: 'Motivasyon' },
  { key: 'focus', label: 'Dikkat & Odak' },
  { key: 'review', label: 'Tekrar & Pekiştirme' }
];

const safeParseJsonObject = (val) => {
  if (!val) return {};
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val) || {};
  } catch {
    return {};
  }
};

const SwotAndWheelPanel = ({ toolsData, onSaveTools, autoSwot }) => {
  const parsedSwot = safeParseJsonObject(toolsData?.swotData);
  const parsedWheel = safeParseJsonObject(toolsData?.wheelData);

  const [swot, setSwot] = useState({
    strengths: parsedSwot.strengths || [],
    weaknesses: parsedSwot.weaknesses || [],
    opportunities: parsedSwot.opportunities || [],
    threats: parsedSwot.threats || []
  });

  const [wheel, setWheel] = useState(() => {
    const initial = {};
    DEFAULT_WHEEL_AXES.forEach(a => {
      initial[a.key] = parsedWheel[a.key] ?? 5;
    });
    return initial;
  });

  // toolsData async geldiğinde state'i senkronize et (ilk mount sonrası veri ezilmesini önler)
  useEffect(() => {
    setSwot({
      strengths: parsedSwot.strengths || [],
      weaknesses: parsedSwot.weaknesses || [],
      opportunities: parsedSwot.opportunities || [],
      threats: parsedSwot.threats || []
    });
  }, [toolsData?.swotData]);

  useEffect(() => {
    setWheel(prev => {
      const next = { ...prev };
      DEFAULT_WHEEL_AXES.forEach(a => {
        if (parsedWheel[a.key] != null) next[a.key] = parsedWheel[a.key];
      });
      return next;
    });
  }, [toolsData?.wheelData]);

  const [inputVals, setInputVals] = useState({ strengths: '', weaknesses: '', opportunities: '', threats: '' });
  const [activeSection, setActiveSection] = useState('SWOT'); // 'SWOT' | 'WHEEL'

  const handleAddItem = (type) => {
    const val = inputVals[type]?.trim();
    if (!val) return;
    const updated = { ...swot, [type]: [...swot[type], val] };
    setSwot(updated);
    setInputVals({ ...inputVals, [type]: '' });
  };

  const handleRemoveItem = (type, index) => {
    const updated = { ...swot, [type]: swot[type].filter((_, i) => i !== index) };
    setSwot(updated);
  };

  const handleAddAutoItem = (type, text) => {
    if (swot[type].includes(text)) return;
    setSwot({ ...swot, [type]: [...swot[type], text] });
  };

  const handleSaveAll = () => {
    if (onSaveTools) {
      onSaveTools({
        swotData: JSON.stringify(swot),
        wheelData: JSON.stringify(wheel)
      });
    }
  };

  // SVG Radar Çark Hesaplaması
  const size = 260;
  const center = size / 2;
  const radius = center - 35;
  const angleStep = (Math.PI * 2) / DEFAULT_WHEEL_AXES.length;

  const points = DEFAULT_WHEEL_AXES.map((axis, i) => {
    const val = wheel[axis.key] ?? 5;
    const r = (val / 10) * radius;
    const angle = i * angleStep - Math.PI / 2;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle)
    };
  });

  const polygonPath = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Üst Başlık & Sekme Seçici */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <SegmentedTabs
          tabs={[
            { id: 'SWOT', label: 'SWOT Matrisi' },
            { id: 'WHEEL', label: 'Denge & Performans Çarkı' },
          ]}
          activeTab={activeSection}
          onChange={setActiveSection}
          size="sm"
        />

        <Button variant="primary" size="sm" onClick={handleSaveAll}>
          <Save size={14} style={{ marginRight: '4px' }} />
          Değişiklikleri Kaydet
        </Button>
      </div>

      {activeSection === 'SWOT' && (
        <Card title="SWOT Koçluk Analizi (Öğrenciye Gizli / Stratejik Notlar)">
          {/* Otomatik Sistem Önerileri */}
          {autoSwot && (autoSwot.strengths?.length > 0 || autoSwot.weaknesses?.length > 0 || autoSwot.opportunities?.length > 0 || autoSwot.threats?.length > 0) && (
            <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Sparkles size={16} style={{ color: 'var(--color-primary)' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary)' }}>Sistem Tarafından Tespit Edilen Otomatik İpuçları</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {autoSwot.strengths?.map((s, idx) => (
                  <button key={`as_${idx}`} type="button" onClick={() => handleAddAutoItem('strengths', s)} style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '12px', border: '1px solid #10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#047857', cursor: 'pointer' }}>
                    + Güçlü: {s}
                  </button>
                ))}
                {autoSwot.weaknesses?.map((w, idx) => (
                  <button key={`aw_${idx}`} type="button" onClick={() => handleAddAutoItem('weaknesses', w)} style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '12px', border: '1px solid #f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#b45309', cursor: 'pointer' }}>
                    + Zayıf: {w}
                  </button>
                ))}
                {autoSwot.opportunities?.map((o, idx) => (
                  <button key={`ao_${idx}`} type="button" onClick={() => handleAddAutoItem('opportunities', o)} style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '12px', border: '1px solid #3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#1d4ed8', cursor: 'pointer' }}>
                    + Fırsat: {o}
                  </button>
                ))}
                {autoSwot.threats?.map((t, idx) => (
                  <button key={`at_${idx}`} type="button" onClick={() => handleAddAutoItem('threats', t)} style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '12px', border: '1px solid #ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#b91c1c', cursor: 'pointer' }}>
                    + Tehdit: {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 4 Quadrants */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
            {/* Güçlü Yönler */}
            <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0', backgroundColor: 'rgba(240, 253, 244, 0.6)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: '#15803d', fontWeight: 600, fontSize: '0.9rem' }}>
                <ShieldCheck size={16} /> Güçlü Yönler (Strengths)
              </div>
              <ul style={{ margin: '0 0 10px 0', paddingLeft: '18px', fontSize: '0.85rem' }}>
                {swot.strengths.map((item, idx) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>
                    <span>{item}</span>
                    <button type="button" onClick={() => handleRemoveItem('strengths', idx)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', marginLeft: '6px' }}>&times;</button>
                  </li>
                ))}
              </ul>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="Madde ekle..."
                  value={inputVals.strengths}
                  onChange={(e) => setInputVals({ ...inputVals, strengths: e.target.value })}
                  style={{ flex: 1, padding: '4px 8px', borderRadius: '4px', border: '1px solid #bbf7d0', fontSize: '0.8rem' }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddItem('strengths')}
                />
                <Button size="sm" variant="ghost" onClick={() => handleAddItem('strengths')}>+</Button>
              </div>
            </div>

            {/* Zayıf Yönler */}
            <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid #fed7aa', backgroundColor: 'rgba(255, 247, 237, 0.6)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: '#c2410c', fontWeight: 600, fontSize: '0.9rem' }}>
                <AlertTriangle size={16} /> Gelişim Alanları (Weaknesses)
              </div>
              <ul style={{ margin: '0 0 10px 0', paddingLeft: '18px', fontSize: '0.85rem' }}>
                {swot.weaknesses.map((item, idx) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>
                    <span>{item}</span>
                    <button type="button" onClick={() => handleRemoveItem('weaknesses', idx)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', marginLeft: '6px' }}>&times;</button>
                  </li>
                ))}
              </ul>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="Madde ekle..."
                  value={inputVals.weaknesses}
                  onChange={(e) => setInputVals({ ...inputVals, weaknesses: e.target.value })}
                  style={{ flex: 1, padding: '4px 8px', borderRadius: '4px', border: '1px solid #fed7aa', fontSize: '0.8rem' }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddItem('weaknesses')}
                />
                <Button size="sm" variant="ghost" onClick={() => handleAddItem('weaknesses')}>+</Button>
              </div>
            </div>

            {/* Fırsatlar */}
            <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid #bfdbfe', backgroundColor: 'rgba(239, 246, 255, 0.6)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: '#1d4ed8', fontWeight: 600, fontSize: '0.9rem' }}>
                <TrendingUp size={16} /> Fırsatlar (Opportunities)
              </div>
              <ul style={{ margin: '0 0 10px 0', paddingLeft: '18px', fontSize: '0.85rem' }}>
                {swot.opportunities.map((item, idx) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>
                    <span>{item}</span>
                    <button type="button" onClick={() => handleRemoveItem('opportunities', idx)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', marginLeft: '6px' }}>&times;</button>
                  </li>
                ))}
              </ul>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="Madde ekle..."
                  value={inputVals.opportunities}
                  onChange={(e) => setInputVals({ ...inputVals, opportunities: e.target.value })}
                  style={{ flex: 1, padding: '4px 8px', borderRadius: '4px', border: '1px solid #bfdbfe', fontSize: '0.8rem' }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddItem('opportunities')}
                />
                <Button size="sm" variant="ghost" onClick={() => handleAddItem('opportunities')}>+</Button>
              </div>
            </div>

            {/* Tehditler */}
            <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid #fecaca', backgroundColor: 'rgba(254, 242, 242, 0.6)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: '#b91c1c', fontWeight: 600, fontSize: '0.9rem' }}>
                <AlertTriangle size={16} /> Riskler / Tehditler (Threats)
              </div>
              <ul style={{ margin: '0 0 10px 0', paddingLeft: '18px', fontSize: '0.85rem' }}>
                {swot.threats.map((item, idx) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>
                    <span>{item}</span>
                    <button type="button" onClick={() => handleRemoveItem('threats', idx)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', marginLeft: '6px' }}>&times;</button>
                  </li>
                ))}
              </ul>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="Madde ekle..."
                  value={inputVals.threats}
                  onChange={(e) => setInputVals({ ...inputVals, threats: e.target.value })}
                  style={{ flex: 1, padding: '4px 8px', borderRadius: '4px', border: '1px solid #fecaca', fontSize: '0.8rem' }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddItem('threats')}
                />
                <Button size="sm" variant="ghost" onClick={() => handleAddItem('threats')}>+</Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {activeSection === 'WHEEL' && (
        <Card title="Hedef & Denge Çarkı (8 Eksenli Performans Değerlendirmesi)">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', alignItems: 'center' }}>
            {/* SVG Radar */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px' }}>
              <svg width={size} height={size} style={{ overflow: 'visible' }}>
                {/* Eksen Izgaraları (2, 4, 6, 8, 10) */}
                {[0.2, 0.4, 0.6, 0.8, 1.0].map((level, lIdx) => (
                  <circle
                    key={lIdx}
                    cx={center}
                    cy={center}
                    r={radius * level}
                    fill="none"
                    stroke="var(--border-color)"
                    strokeDasharray={level < 1 ? '3,3' : 'none'}
                  />
                ))}

                {/* Eksen Çizgileri */}
                {DEFAULT_WHEEL_AXES.map((_, i) => {
                  const angle = i * angleStep - Math.PI / 2;
                  const x = center + radius * Math.cos(angle);
                  const y = center + radius * Math.sin(angle);
                  return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="var(--border-color)" />;
                })}

                {/* Radar Poligonu */}
                <polygon
                  points={polygonPath}
                  fill="rgba(99, 102, 241, 0.25)"
                  stroke="var(--color-primary)"
                  strokeWidth="2"
                />

                {/* Noktalar ve Etiketler */}
                {points.map((p, i) => {
                  const axis = DEFAULT_WHEEL_AXES[i];
                  const angle = i * angleStep - Math.PI / 2;
                  const labelR = radius + 18;
                  const lx = center + labelR * Math.cos(angle);
                  const ly = center + labelR * Math.sin(angle);
                  return (
                    <g key={i}>
                      <circle cx={p.x} cy={p.y} r="4" fill="var(--color-primary)" />
                      <text
                        x={lx}
                        y={ly}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize="10"
                        fill="var(--text-color-muted)"
                      >
                        {axis.label.slice(0, 8)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Slider Kontrolleri */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {DEFAULT_WHEEL_AXES.map((axis) => {
                const val = wheel[axis.key] ?? 5;
                return (
                  <div key={axis.key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.85rem', width: '130px', color: 'var(--text-color-main)' }}>{axis.label}:</span>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={val}
                      onChange={(e) => setWheel({ ...wheel, [axis.key]: parseInt(e.target.value, 10) })}
                      style={{ flex: 1, accentColor: 'var(--color-primary)' }}
                    />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, width: '24px', textAlign: 'right' }}>{val}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default SwotAndWheelPanel;

