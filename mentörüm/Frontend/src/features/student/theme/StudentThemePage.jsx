import React, { useState } from 'react';
import { useUIStore } from '../../../store/uiStore';
import Card from '../../../components/common/Card/Card';
import { 
  Palette, 
  Sun, 
  Moon, 
  Monitor,
  Sparkles, 
  Trees, 
  Waves, 
  Terminal, 
  Briefcase, 
  Check, 
  LayoutGrid
} from 'lucide-react';
import styles from './StudentThemePage.module.css';

export default function StudentThemePage() {
  const { 
    themeMode, 
    themeStyle, 
    studentHomeLayout, 
    setThemeMode, 
    setThemeStyle, 
    setStudentHomeLayout 
  } = useUIStore();

  const [activeTab, setActiveTab] = useState('layout'); // 'layout' | 'mode' | 'style'

  const styleOptions = [
    { id: 'classic', label: 'Klasik SaaS', icon: Sparkles, colorClass: styles.colorClassic },
    { id: 'nature', label: 'Doğa & Orman', icon: Trees, colorClass: styles.colorNature },
    { id: 'ocean', label: 'Okyanus Esintisi', icon: Waves, colorClass: styles.colorOcean },
    { id: 'cyber', label: 'Cyber Matrix', icon: Terminal, colorClass: styles.colorCyber },
    { id: 'formal', label: 'Klasik Formal', icon: Briefcase, colorClass: styles.colorFormal },
  ];

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1 className={styles.title}>Görünüm & Temalar</h1>
        <p className={styles.subtitle}>
          Ana sayfa yerleşim düzenini, renk paletini ve karanlık/aydınlık mod tercihlerini özelleştir.
        </p>
      </header>

      {/* ── ÜST SEKME NAVİGASYONU (Uzun sayfayı 3 kompakt sekmeye böler) ── */}
      <div className={styles.themeTabs}>
        <button
          type="button"
          className={`${styles.themeTabBtn} ${activeTab === 'layout' ? styles.themeTabBtnActive : ''}`}
          onClick={() => setActiveTab('layout')}
        >
          <LayoutGrid size={16} />
          <span>Yerleşim Düzeni</span>
        </button>

        <button
          type="button"
          className={`${styles.themeTabBtn} ${activeTab === 'mode' ? styles.themeTabBtnActive : ''}`}
          onClick={() => setActiveTab('mode')}
        >
          <Sun size={16} />
          <span>Görünüm Modu</span>
        </button>

        <button
          type="button"
          className={`${styles.themeTabBtn} ${activeTab === 'style' ? styles.themeTabBtnActive : ''}`}
          onClick={() => setActiveTab('style')}
        >
          <Palette size={16} />
          <span>Tema & Stil</span>
        </button>
      </div>

      {/* ── 1. SEKME: ANA SAYFA YERLEŞİM DÜZENİ ── */}
      {activeTab === 'layout' && (
        <section className={styles.section}>
          <div>
            <h2 className={styles.sectionTitle}>
              <LayoutGrid size={18} style={{ color: 'var(--color-primary)' }} />
              Ana Sayfa Yerleşim Düzeni
            </h2>
            <p className={styles.sectionDesc}>
              Mobil ve masaüstü ekranda kartların nasıl dizileceğini belirle.
            </p>
          </div>

          <div className={styles.layoutGrid}>
            {/* SEÇENEK 1: Odak & Çalışma Öncelikli Akış */}
            <div 
              className={`${styles.layoutCard} ${studentHomeLayout === 'compact' ? styles.layoutCardActive : ''}`}
              onClick={() => setStudentHomeLayout('compact')}
            >
              <div className={styles.layoutCardHeader}>
                <div>
                  <div className={styles.layoutTitle}>1. Çalışma & Odak Öncelikli</div>
                  <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>Önerilen Düzen</div>
                </div>
                {studentHomeLayout === 'compact' && (
                  <span className={styles.layoutBadge}><Check size={13} /> Seçildi</span>
                )}
              </div>

              <p className={styles.layoutDesc}>
                Canlı kronometre, günlük mod ve kişisel notlar en üstte. Mobilde çalışma araçları önde; tablette çift kolonlu ferah çalışma masası.
              </p>

              {/* Gerçek Sayfa ile Birebir Uyumlu Minyatür Şema */}
              <div className={styles.miniPreview}>
                <div style={{ height: 26, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px', fontSize: '8.5px', color: '#34d399', fontWeight: 700 }}>
                  <span>⏱️ Canlı Kronometre (00:00)</span>
                  <span style={{ background: '#10b981', color: '#fff', padding: '1px 5px', borderRadius: 3, fontSize: '7.5px' }}>Başlat</span>
                </div>
                <div style={{ height: 18, background: 'rgba(255,255,255,0.05)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-around', fontSize: '8px', color: 'var(--text-color-muted)' }}>
                  <span>😊 Verimli</span>
                  <span>😐 Normal</span>
                  <span>😴 Yorgun</span>
                </div>
                <div style={{ height: 20, background: 'rgba(255,255,255,0.06)', borderRadius: 4, display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: '8px', color: 'var(--text-color-muted)' }}>
                  <span>📝 Kişisel Notlarım & Takıldıklarım</span>
                </div>
                <div className="miniStrip" style={{ height: 16, background: 'rgba(245, 158, 11, 0.18)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-around', fontSize: '8px', color: '#fbbf24', fontWeight: 700 }}>
                  <span>🔥 0G Seri</span>
                  <span>📅 242G Sınav</span>
                  <span>🎯 Hedef</span>
                </div>
              </div>
            </div>

            {/* SEÇENEK 2: Görev & Ödev Öncelikli Akış */}
            <div 
              className={`${styles.layoutCard} ${studentHomeLayout === 'widget' ? styles.layoutCardActive : ''}`}
              onClick={() => setStudentHomeLayout('widget')}
            >
              <div className={styles.layoutCardHeader}>
                <div>
                  <div className={styles.layoutTitle}>2. Görev & Ödev Öncelikli</div>
                  <div style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: 600 }}>Bento / Aksiyon Odaklı</div>
                </div>
                {studentHomeLayout === 'widget' && (
                  <span className={styles.layoutBadge}><Check size={13} /> Seçildi</span>
                )}
              </div>

              <p className={styles.layoutDesc}>
                Yaklaşan acil ödevler ve 4'lü performans metrikleri en üstte. Mobilde önce teslim edilecek ödevlerini ve genel durumunu görürsün.
              </p>

              {/* Gerçek Sayfa ile Birebir Uyumlu Minyatür Şema */}
              <div className={styles.miniPreview}>
                <div style={{ height: 24, background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px', fontSize: '8.5px', color: '#a5b4fc', fontWeight: 700 }}>
                  <span>📝 Yaklaşan Ödevler</span>
                  <span style={{ background: '#6366f1', color: '#fff', padding: '1px 5px', borderRadius: 3, fontSize: '7.5px' }}>1 Bekleyen</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3 }}>
                  <div style={{ height: 16, background: 'rgba(99,102,241,0.2)', borderRadius: 3, textAlign: 'center', fontSize: '7.5px', lineHeight: '16px', color: '#818cf8', fontWeight: 700 }}>1 Ödev</div>
                  <div style={{ height: 16, background: 'rgba(16,185,129,0.2)', borderRadius: 3, textAlign: 'center', fontSize: '7.5px', lineHeight: '16px', color: '#34d399', fontWeight: 700 }}>%50</div>
                  <div style={{ height: 16, background: 'rgba(245,158,11,0.2)', borderRadius: 3, textAlign: 'center', fontSize: '7.5px', lineHeight: '16px', color: '#fbbf24', fontWeight: 700 }}>0 Gün</div>
                  <div style={{ height: 16, background: 'rgba(59,130,246,0.2)', borderRadius: 3, textAlign: 'center', fontSize: '7.5px', lineHeight: '16px', color: '#60a5fa', fontWeight: 700 }}>242g</div>
                </div>
                <div style={{ height: 18, background: 'rgba(255,255,255,0.05)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-around', fontSize: '8px', color: 'var(--text-color-muted)' }}>
                  <span>Mod: 😊 Verimli</span>
                </div>
                <div style={{ height: 20, background: 'rgba(255,255,255,0.06)', borderRadius: 4, display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: '8px', color: 'var(--text-color-muted)' }}>
                  <span>⏱️ Canlı Kronometre & Notlar</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── 2. SEKME: GÖRÜNÜM MODU (Açık / Koyu / Sistem) ── */}
      {activeTab === 'mode' && (
        <section className={styles.section}>
          <div>
            <h2 className={styles.sectionTitle}>
              <Sun size={18} style={{ color: 'var(--color-warning)' }} />
              Görünüm Modu
            </h2>
            <p className={styles.sectionDesc}>
              Göz konforuna göre açık, koyu veya cihazınızın işletim sistemiyle senkronize modu tercih edebilirsin.
            </p>
          </div>

          <div className={styles.modeSelector}>
            <button
              type="button"
              className={`${styles.modeBtn} ${themeMode === 'light' ? styles.modeBtnActive : ''}`}
              onClick={() => setThemeMode('light')}
            >
              <Sun size={18} />
              <span>Açık Mod</span>
            </button>
            <button
              type="button"
              className={`${styles.modeBtn} ${themeMode === 'dark' ? styles.modeBtnActive : ''}`}
              onClick={() => setThemeMode('dark')}
            >
              <Moon size={18} />
              <span>Koyu Mod</span>
            </button>
            <button
              type="button"
              className={`${styles.modeBtn} ${themeMode === 'system' ? styles.modeBtnActive : ''}`}
              onClick={() => setThemeMode('system')}
            >
              <Monitor size={18} />
              <span>Cihazla Aynı</span>
            </button>
          </div>
        </section>
      )}

      {/* ── 3. SEKME: TEMA STİLLERİ & RENK PALETİ ── */}
      {activeTab === 'style' && (
        <section className={styles.section}>
          <div>
            <h2 className={styles.sectionTitle}>
              <Palette size={18} style={{ color: 'var(--color-primary)' }} />
              Tema Stilleri & Renk Paleti
            </h2>
            <p className={styles.sectionDesc}>
              Uygulamanın renk tonunu ve atmosferini kendi zevkine göre ayarla.
            </p>
          </div>

          <div className={styles.styleGrid}>
            {styleOptions.map((opt) => {
              const IconComponent = opt.icon;
              const isActive = themeStyle === opt.id;
              return (
                <div
                  key={opt.id}
                  className={`${styles.styleCard} ${isActive ? styles.styleCardActive : ''}`}
                  onClick={() => setThemeStyle(opt.id)}
                >
                  <div className={styles.styleLeft}>
                    <span className={`${styles.colorDot} ${opt.colorClass}`} />
                    <IconComponent size={16} />
                    <span>{opt.label}</span>
                  </div>
                  {isActive && <Check size={18} style={{ color: 'var(--color-primary)' }} />}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
