import React from 'react';

/**
 * Klasik Formal / Plaza Teması Arka Plan Dekoru
 * Kurumsal, prestijli, dikkat dağıtmayan zarif plaza mimari hatları ve kurumsal safir/bronz aksanlar
 */
export default function FormalDecor() {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
    >
      <style>
        {`
          @keyframes formalFloatSlow {
            0%, 100% { transform: translateY(0px); opacity: 0.20; }
            50% { transform: translateY(-8px); opacity: 0.32; }
          }
        `}
      </style>

      {/* Sağ Arka Plan: Zarif Plaza / Kurumsal Kule Geometrik Çizgileri */}
      <svg
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: '320px',
          height: '65%',
          opacity: 0.15,
          animation: 'formalFloatSlow 18s ease-in-out infinite',
        }}
        viewBox="0 0 320 600"
        fill="none"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="formalPlazaGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* Kurumsal Plaza Kule Hatları */}
        {/* Kule 1 (Sağ) */}
        <rect x="220" y="80" width="80" height="520" stroke="url(#formalPlazaGrad)" strokeWidth="1.2" fill="none" rx="4" />
        {[120, 160, 200, 240, 280, 320, 360, 400, 440, 480, 520, 560].map((y, i) => (
          <line key={`k1-${i}`} x1="220" y1={y} x2="300" y2={y} stroke="url(#formalPlazaGrad)" strokeWidth="0.8" opacity="0.6" />
        ))}
        {/* Kule 2 (Orta-Yüksek) */}
        <rect x="130" y="150" width="75" height="450" stroke="url(#formalPlazaGrad)" strokeWidth="1.2" fill="none" rx="4" />
        {[190, 230, 270, 310, 350, 390, 430, 470, 510, 550].map((y, i) => (
          <line key={`k2-${i}`} x1="130" y1={y} x2="205" y2={y} stroke="url(#formalPlazaGrad)" strokeWidth="0.8" opacity="0.6" />
        ))}
        {/* Kule 3 (Sol-Alçak) */}
        <rect x="50" y="240" width="70" height="360" stroke="url(#formalPlazaGrad)" strokeWidth="1.2" fill="none" rx="4" />
        {[280, 320, 360, 400, 440, 480, 520, 560].map((y, i) => (
          <line key={`k3-${i}`} x1="50" y1={y} x2="120" y2={y} stroke="url(#formalPlazaGrad)" strokeWidth="0.8" opacity="0.6" />
        ))}

        {/* Çapraz Prestij Aksan Çizgisi */}
        <line x1="0" y1="600" x2="320" y2="280" stroke="var(--color-accent)" strokeWidth="1" strokeDasharray="4 6" opacity="0.3" />
      </svg>
    </div>
  );
}
