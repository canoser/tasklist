import React, { useMemo } from 'react';
import { useUIStore } from '../../../store/uiStore';
import styles from './SkyDecor.module.css';

/**
 * Gerçek astronomik ay evresini hesaplar (0: Yeni Ay, 0.25: İlk Dördün, 0.5: Dolunay, 0.75: Son Dördün)
 */
const getMoonPhase = () => {
  const date = new Date();
  const knownNewMoon = 947182440000; // 6 Ocak 2000 Yeni Ay Epoch
  const lunarDays = 29.53058770576; // Sinodik ay döngüsü süresi
  const msPerDay = 86400000;
  const diffDays = (date.getTime() - knownNewMoon) / msPerDay;
  const phase = (diffDays % lunarDays) / lunarDays;
  return phase < 0 ? phase + 1 : phase;
};

// Arka plana dağıtılacak rastgele parıldayan yıldız koordinatları (Tek seferlik sabit)
const STATIC_STARS = [
  { x: '18%', y: '12%', r: 1.2, o: 0.5, d: '6s' },
  { x: '24%', y: '28%', r: 1.5, o: 0.6, d: '8s' },
  { x: '35%', y: '15%', r: 1.0, o: 0.4, d: '7s' },
  { x: '42%', y: '35%', r: 1.8, o: 0.7, d: '9s' },
  { x: '48%', y: '18%', r: 1.2, o: 0.4, d: '5s' },
  { x: '55%', y: '25%', r: 1.6, o: 0.65, d: '8s' },
  { x: '62%', y: '14%', r: 1.3, o: 0.5, d: '7s' },
  { x: '68%', y: '38%', r: 1.7, o: 0.7, d: '10s' },
  { x: '75%', y: '22%', r: 1.1, o: 0.45, d: '6s' },
  { x: '82%', y: '16%', r: 1.5, o: 0.6, d: '8s' },
  { x: '88%', y: '32%', r: 1.3, o: 0.5, d: '7s' },
  { x: '94%', y: '19%', r: 1.8, o: 0.65, d: '9s' },
  { x: '22%', y: '55%', r: 1.4, o: 0.5, d: '8s' },
  { x: '32%', y: '68%', r: 1.1, o: 0.4, d: '6s' },
  { x: '45%', y: '62%', r: 1.6, o: 0.6, d: '9s' },
  { x: '58%', y: '72%', r: 1.3, o: 0.5, d: '7s' },
  { x: '70%', y: '58%', r: 1.7, o: 0.65, d: '8s' },
  { x: '85%', y: '65%', r: 1.2, o: 0.45, d: '6s' },
  { x: '92%', y: '52%', r: 1.5, o: 0.55, d: '7s' },
  { x: '28%', y: '85%', r: 1.5, o: 0.5, d: '9s' },
  { x: '50%', y: '88%', r: 1.2, o: 0.4, d: '6s' },
  { x: '65%', y: '82%', r: 1.6, o: 0.6, d: '8s' },
  { x: '80%', y: '86%', r: 1.3, o: 0.45, d: '7s' },
];

export default function SkyDecor() {
  const { themeMode } = useUIStore();
  const isDark = themeMode === 'dark';

  // Yalnızca bileşen yüklendiğinde 1 defa hesaplanır (0 ms CPU tüketimi)
  const currentPhase = useMemo(() => getMoonPhase(), []);

  // Ayın aydınlık yüzünün dinamik SVG yayı hesabı (cx: 130, cy: 130, r: 100)
  const moonArcPath = useMemo(() => {
    const p = currentPhase;
    const cx = 130;
    const cy = 130;
    const r = 100;
    const top = cy - r;
    const bottom = cy + r;

    // Tam Dolunay veya Yeni Ay eşiği
    if (Math.abs(p - 0.5) < 0.02) {
      return null; // Tam dolunay dairesi çizilir
    }

    const rx = Math.max(0.01, r * Math.abs(Math.cos(p * 2 * Math.PI)));
    const outerSweep = p <= 0.5 ? 1 : 0;
    const innerSweep = (p > 0.25 && p <= 0.5) || p > 0.75 ? 1 : 0;

    return `M ${cx} ${top} A ${r} ${r} 0 0 ${outerSweep} ${cx} ${bottom} A ${rx} ${r} 0 0 ${innerSweep} ${cx} ${top} Z`;
  }, [currentPhase]);

  const isFullMoon = Math.abs(currentPhase - 0.5) < 0.02;

  return (
    <>
      <style>
        {`
          @keyframes skySunCorona {
            0%, 100% { transform: scale(0.97); opacity: 0.25; }
            50% { transform: scale(1.04); opacity: 0.45; }
          }
          @keyframes skyMoonAura {
            0%, 100% { opacity: 0.70; transform: scale(0.99); }
            50% { opacity: 0.90; transform: scale(1.01); }
          }
          @keyframes starTwinkle {
            0%, 100% { opacity: 0.3; transform: scale(0.85); }
            50% { opacity: 0.95; transform: scale(1.15); }
          }
        `}
      </style>

      {/* ── 1. TÜM EKRANA DAĞILMIŞ YILDIZLAR (Her temada ve kutucuk arkalarında parıldar) ── */}
      {isDark && (
        <svg
          className={styles.starsLayer}
          xmlns="http://www.w3.org/2000/svg"
        >
          {STATIC_STARS.map((s, idx) => (
            <circle
              key={idx}
              cx={s.x}
              cy={s.y}
              r={s.r}
              fill="#FFFFFF"
              opacity={s.o}
              style={{
                animation: `starTwinkle ${s.d} ease-in-out infinite`,
                transformOrigin: `${s.x} ${s.y}`,
              }}
            />
          ))}
        </svg>
      )}

      {/* ── 2. GÖK CİSMİ: KULLANICININ İSTEDİĞİ YERDE VE BÜYÜKLÜKTE (Dashboard sol-üst) ── */}
      <div
        className={styles.celestialContainer}
        style={{
          opacity: isDark ? 0.75 : 0.85,
        }}
      >
        <svg
          style={{ width: '100%', height: '100%' }}
          viewBox="0 0 260 260"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {isDark ? (
            /* ── KOYU TEMA: GERÇEK AY VE KRATERLERİ (260px Çap) ── */
            <g style={{ animation: 'skyMoonAura 16s ease-in-out infinite', transformOrigin: '130px 130px' }}>
              {/* Ayın Dış Parıltı Halesi */}
              <circle cx="130" cy="130" r="118" fill="#BAE6FD" opacity="0.04" />
              {/* Ay Arka Plan Dairesi (Karanlık Yüz) */}
              <circle cx="130" cy="130" r="100" fill="#BAE6FD" opacity="0.08" />

              {/* Ay Denizleri & Krater Haritası (260px ölçekli) */}
              <g opacity="0.32">
                {/* Oceanus Procellarum & Mare Imbrium */}
                <path d="M 75 112 Q 92 68 116 88 T 130 144 Q 100 178 75 144 Z" fill="#94A3B8" />
                {/* Mare Serenitatis & Tranquillitatis */}
                <path d="M 138 86 Q 170 78 186 112 T 170 160 Q 146 136 138 86 Z" fill="#94A3B8" />
                {/* Mare Crisium */}
                <ellipse cx="198" cy="100" rx="11" ry="15" fill="#94A3B8" />
                {/* Mare Fecunditatis */}
                <path d="M 175 168 Q 204 182 204 152 T 184 142 Z" fill="#94A3B8" />
                {/* Mare Nubium & Humorum */}
                <path d="M 100 182 Q 124 206 148 182 T 124 160 Z" fill="#94A3B8" />
              </g>

              {/* Dinamik Astronomik Aydınlık Yüz (Bugünün Gerçek Ay Fazı) */}
              {isFullMoon ? (
                <circle cx="130" cy="130" r="100" fill="#F0F9FF" opacity="0.82" />
              ) : moonArcPath ? (
                <path d={moonArcPath} fill="#F0F9FF" opacity="0.80" />
              ) : null}

              {/* Ay Yanındaki Yıldızlar */}
              <circle cx="245" cy="55" r="2.2" fill="#FFFFFF" opacity="0.75" />
              <circle cx="230" cy="210" r="1.8" fill="#FFFFFF" opacity="0.65" />
              <circle cx="18" cy="180" r="1.8" fill="#FFFFFF" opacity="0.60" />
            </g>
          ) : (
            /* ── AÇIK TEMA: SICAK PARLAYAN GÜNEŞ & NEFES ALAN IŞIK HALESİ ── */
            <g style={{ transformOrigin: '130px 130px' }}>
              {/* Dış Hale (Corona) - 9s sakin soluk */}
              <circle
                cx="130"
                cy="130"
                r="125"
                fill="#FEF08A"
                style={{
                  animation: 'skySunCorona 9s ease-in-out infinite',
                  transformOrigin: '130px 130px',
                }}
              />
              {/* Orta Işıma Katmanı */}
              <circle cx="130" cy="130" r="95" fill="#FDE047" opacity="0.35" />
              {/* Güneş Çekirdeği */}
              <circle cx="130" cy="130" r="68" fill="#FACC15" opacity="0.75" />
              <circle cx="130" cy="130" r="46" fill="#EAB308" opacity="0.90" />
            </g>
          )}
        </svg>
      </div>
    </>
  );
}
