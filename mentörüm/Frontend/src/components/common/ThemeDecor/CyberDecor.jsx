import React from 'react';

/**
 * Cyber / Matrix Teması Arka Plan Dekoru
 * Kutucukların arkasından sakin ve akıcı bir şekilde süzülen dijital yağmur & siber ızgara
 */
export default function CyberDecor() {
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
          @keyframes matrixStreamFall {
            0% { transform: translateY(-100%); opacity: 0; }
            10% { opacity: 0.8; }
            90% { opacity: 0.8; }
            100% { transform: translateY(120vh); opacity: 0; }
          }
          @keyframes cyberGridScan {
            0% { opacity: 0.10; }
            50% { opacity: 0.22; }
            100% { opacity: 0.10; }
          }
        `}
      </style>

      {/* Siber Perspektif Izgarası (Alt & Arka Plan) */}
      <svg
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100vw',
          height: '50vh',
          opacity: 0.12,
          animation: 'cyberGridScan 8s ease-in-out infinite',
        }}
        viewBox="0 0 1000 400"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="cyberGridFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        {/* Yatay çizgiler */}
        {[80, 160, 230, 290, 340, 375, 395].map((y, i) => (
          <line
            key={`h-${i}`}
            x1="0"
            y1={y}
            x2="1000"
            y2={y}
            stroke="url(#cyberGridFade)"
            strokeWidth="1.2"
          />
        ))}
        {/* Perspektif dikey çizgiler */}
        {[-200, 0, 150, 300, 420, 500, 580, 700, 850, 1000, 1200].map((x, i) => (
          <line
            key={`v-${i}`}
            x1={x}
            y1="400"
            x2={500 + (x - 500) * 0.1}
            y2="50"
            stroke="url(#cyberGridFade)"
            strokeWidth="1.2"
          />
        ))}
      </svg>

      {/* Matrix Dijital Yağmur Sütunları (Kutuların arkasından süzülür) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          justifyContent: 'space-around',
          fontFamily: 'monospace',
          fontSize: '13px',
          fontWeight: 700,
          color: 'var(--color-primary)',
          opacity: 0.35,
          userSelect: 'none',
        }}
      >
        {[
          { left: '8%', dur: '12s', delay: '0s', text: '10101100101101' },
          { left: '22%', dur: '16s', delay: '3s', text: 'const fn = (λ) => {}' },
          { left: '38%', dur: '14s', delay: '1.5s', text: '0x7F 0x00 0xFF 0x1A' },
          { left: '52%', dur: '18s', delay: '5s', text: 'while(active) { run(); }' },
          { left: '68%', dur: '13s', delay: '2s', text: '01001101 01100101' },
          { left: '82%', dur: '15s', delay: '4s', text: '<Matrix.Rain stream="active" />' },
          { left: '94%', dur: '17s', delay: '1s', text: 'async function mentor() { }' },
        ].map((col, idx) => (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left: col.left,
              top: '-300px',
              writingMode: 'vertical-rl',
              letterSpacing: '5px',
              animation: `matrixStreamFall ${col.dur} linear infinite`,
              animationDelay: col.delay,
              textShadow: '0 0 8px var(--color-primary)',
            }}
          >
            {col.text}
          </div>
        ))}
      </div>
    </div>
  );
}
