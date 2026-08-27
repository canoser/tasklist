import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';

const getMoonPhase = () => {
  const date = new Date();
  const knownNewMoon = 947182440000;
  const lunarDays = 29.53058770576;
  const msPerDay = 1000 * 60 * 60 * 24;
  const diffDays = (date.getTime() - knownNewMoon) / msPerDay;
  const phase = (diffDays % lunarDays) / lunarDays;
  return phase < 0 ? phase + 1 : phase;
};

export default function SkyDecor() {
  const { themeMode } = useTheme();

  // For Moon
  const [targetPhase] = useState(() => getMoonPhase());
  const [currentPhase, setCurrentPhase] = useState(0);

  useEffect(() => {
    if (themeMode === 'dark') {
      let startTimestamp = null;
      const duration = 2500;
      const totalPhaseToAnimate = 1 + targetPhase;
      const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 4);
        const currentVal = easeOut * totalPhaseToAnimate;
        setCurrentPhase(currentVal % 1);
        if (progress < 1) requestAnimationFrame(step);
        else setCurrentPhase(targetPhase);
      };
      const animId = requestAnimationFrame(step);
      return () => cancelAnimationFrame(animId);
    }
  }, [themeMode, targetPhase]);

  const isDark = themeMode === 'dark';

  // Moon Drawing
  const baseCircle = <circle cx="70" cy="120" r="60" fill="#F0F9FF" opacity=".08" />;
  let brightShape = null;
  const p = currentPhase;
  if (p > 0.01 && p < 0.99) {
    if (Math.abs(p - 0.5) < 0.01) {
      brightShape = <circle cx="70" cy="120" r="60" />;
    } else {
      const rx = Math.max(0.01, 60 * Math.abs(Math.cos(p * 2 * Math.PI)));
      const outerSweep = p <= 0.5 ? 1 : 0;
      let innerSweep = 0;
      if ((p > 0.25 && p <= 0.5) || (p > 0.75)) innerSweep = 1;
      const d = `M 70 60 A 60 60 0 0 ${outerSweep} 70 180 A ${rx} 60 0 0 ${innerSweep} 70 60 Z`;
      brightShape = <path d={d} />;
    }
  }

  const craters = (
    <g fill="#94A3B8" opacity=".4" filter="url(#moonBlur)">
      {/* Oceanus Procellarum & Mare Imbrium */}
      <path d="M 35 105 Q 45 75 60 90 T 70 125 Q 50 145 35 125 Z" />
      {/* Mare Serenitatis & Tranquillitatis */}
      <path d="M 75 85 Q 95 80 105 100 T 95 130 Q 80 115 75 85 Z" />
      {/* Mare Crisium */}
      <ellipse cx="112" cy="95" rx="7" ry="9" opacity=".8" />
      {/* Mare Fecunditatis */}
      <path d="M 98 135 Q 115 145 115 125 T 102 118 Z" />
      {/* Mare Nubium & Humorum */}
      <path d="M 50 145 Q 65 160 80 145 T 65 130 Z" />
    </g>
  );

  return (
    <>
      <style>
        {`
          @keyframes sunPulse {
            0%, 100% { opacity: 0.35; transform: scale(0.95); }
            50% { opacity: 0.65; transform: scale(1.05); }
          }
        `}
      </style>
      <svg 
        style={{ position: 'absolute', top: 0, left: 0, right: 'auto', width: '200px', height: '300px' }} 
        viewBox="0 0 200 300" 
        fill="none"
      >
        {isDark ? (
          <>
            <defs>
              <filter id="moonBlur" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2.5" />
              </filter>
            </defs>
            {baseCircle}
            {craters}
            {brightShape && (
              React.cloneElement(brightShape, { fill: "#F0F9FF", opacity: ".55" })
            )}
          </>
        ) : (
          <circle 
            cx="70" cy="120" r="60" fill="#FDE047" 
            style={{ 
              transformOrigin: '70px 120px', 
              animation: 'sunPulse 4s ease-in-out infinite' 
            }} 
          />
        )}
      </svg>
    </>
  );
}
