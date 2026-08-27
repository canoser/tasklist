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

const getTargetSunY = () => {
  const date = new Date();
  const hour = date.getHours() + date.getMinutes() / 60;
  if (hour < 5 || hour > 19) return 360;
  const progress = (hour - 12) / 7;
  return 60 + 300 * (1 - Math.cos(progress * Math.PI / 2));
};

export default function NatureDecor() {
  const { themeStyle, themeMode } = useTheme();

  // For Moon
  const [targetPhase] = useState(() => getMoonPhase());
  const [currentPhase, setCurrentPhase] = useState(0);

  // For Sun
  const [targetY] = useState(() => getTargetSunY());
  const [currentY, setCurrentY] = useState(360);

  useEffect(() => {
    if (themeStyle !== 'nature') return;

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
    } else {
      let startTimestamp = null;
      const duration = 2500;
      const startY = 360;
      const distance = startY - targetY;
      if (distance <= 0) {
        setCurrentY(targetY);
        return;
      }
      const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 4);
        setCurrentY(startY - distance * easeOut);
        if (progress < 1) requestAnimationFrame(step);
        else setCurrentY(targetY);
      };
      const animId = requestAnimationFrame(step);
      return () => cancelAnimationFrame(animId);
    }
  }, [themeStyle, themeMode, targetPhase, targetY]);

  if (themeStyle !== 'nature') return null;

  const isDark = themeMode === 'dark';

  // Moon Drawing
  const baseCircle = <circle cx="70" cy="120" r="60" fill="#F0F9FF" opacity=".08" />;
  let brightPart = null;
  const p = currentPhase;
  if (p > 0.01 && p < 0.99) {
    if (Math.abs(p - 0.5) < 0.01) {
      brightPart = <circle cx="70" cy="120" r="60" fill="#F0F9FF" opacity=".55" />;
    } else {
      const rx = Math.max(0.01, 60 * Math.abs(Math.cos(p * 2 * Math.PI)));
      const outerSweep = p <= 0.5 ? 1 : 0;
      let innerSweep = 0;
      if ((p > 0.25 && p <= 0.5) || (p > 0.75)) innerSweep = 1;
      const d = `M 70 60 A 60 60 0 0 ${outerSweep} 70 180 A ${rx} 60 0 0 ${innerSweep} 70 60 Z`;
      brightPart = <path d={d} fill="#F0F9FF" opacity=".55" />;
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: 0
    }}>
      <style>
        {`
          @keyframes natureSway {
            0% { transform: rotate(0deg); }
            50% { transform: rotate(1.5deg); }
            100% { transform: rotate(0deg); }
          }
          @keyframes natureSwayBg {
            0% { transform: rotate(0.5deg); }
            50% { transform: rotate(-1deg); }
            100% { transform: rotate(0.5deg); }
          }
        `}
      </style>

      {/* SVG Definitions */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <g id="natureBranch">
            {/* Main branch */}
            <path d="M130 5 Q110 60 90 110 Q65 175 70 240 Q78 310 55 370 Q30 440 45 510 Q60 580 38 640 Q18 710 25 790 Q28 820 20 852" 
              stroke="var(--ac, var(--accent))" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity=".45" />
            
            {/* Side branches */}
            <path d="M110 60 Q125 45 132 38" stroke="var(--ac, var(--accent))" strokeWidth="1.1" opacity=".32" strokeLinecap="round"/>
            <path d="M90 110 Q75 90 58 82" stroke="var(--ac, var(--accent))" strokeWidth="1.1" opacity=".30" strokeLinecap="round"/>
            <path d="M70 240 Q88 225 102 222" stroke="var(--ac, var(--accent))" strokeWidth="1.1" opacity=".28" strokeLinecap="round"/>
            <path d="M55 370 Q38 350 24 345" stroke="var(--ac, var(--accent))" strokeWidth="1.1" opacity=".25" strokeLinecap="round"/>
            <path d="M45 510 Q62 492 76 488" stroke="var(--ac, var(--accent))" strokeWidth="1.1" opacity=".22" strokeLinecap="round"/>
            <path d="M38 640 Q22 622 12 618" stroke="var(--ac, var(--accent))" strokeWidth="1.1" opacity=".20" strokeLinecap="round"/>

            {/* Leaves */}
            <ellipse cx="125" cy="40" rx="6" ry="11" fill="var(--ac, var(--accent))" opacity=".22" transform="rotate(35 125 40)"/>
            <ellipse cx="95" cy="108" rx="8" ry="14" fill="var(--ac, var(--accent))" opacity=".24" transform="rotate(16 95 108)"/>
            <ellipse cx="56" cy="80" rx="5" ry="10" fill="var(--ac, var(--accent))" opacity=".20" transform="rotate(-30 56 80)"/>
            <ellipse cx="66" cy="172" rx="6" ry="11" fill="var(--ac, var(--accent))" opacity=".18" transform="rotate(-22 66 172)"/>
            <ellipse cx="72" cy="238" rx="7" ry="13" fill="var(--ac, var(--accent))" opacity=".22" transform="rotate(-6 72 238)"/>
            <ellipse cx="104" cy="220" rx="5" ry="10" fill="var(--ac, var(--accent))" opacity=".18" transform="rotate(32 104 220)"/>
            <ellipse cx="64" cy="305" rx="6" ry="11" fill="var(--ac, var(--accent))" opacity=".18" transform="rotate(12 64 305)"/>
            <ellipse cx="58" cy="368" rx="7" ry="12" fill="var(--ac, var(--accent))" opacity=".20" transform="rotate(8 58 368)"/>
            <ellipse cx="22" cy="342" rx="5" ry="9" fill="var(--ac, var(--accent))" opacity=".16" transform="rotate(-28 22 342)"/>
            <ellipse cx="36" cy="435" rx="6" ry="10" fill="var(--ac, var(--accent))" opacity=".16" transform="rotate(-15 36 435)"/>
            <ellipse cx="44" cy="508" rx="6" ry="11" fill="var(--ac, var(--accent))" opacity=".18" transform="rotate(-6 44 508)"/>
            <ellipse cx="78" cy="486" rx="5" ry="9" fill="var(--ac, var(--accent))" opacity=".15" transform="rotate(30 78 486)"/>
            <ellipse cx="48" cy="575" rx="5" ry="10" fill="var(--ac, var(--accent))" opacity=".16" transform="rotate(18 48 575)"/>
            <ellipse cx="38" cy="638" rx="6" ry="11" fill="var(--ac, var(--accent))" opacity=".16" transform="rotate(5 38 638)"/>
            <ellipse cx="10" cy="616" rx="4" ry="8" fill="var(--ac, var(--accent))" opacity=".14" transform="rotate(-25 10 616)"/>
            <ellipse cx="22" cy="712" rx="5" ry="9" fill="var(--ac, var(--accent))" opacity=".15" transform="rotate(-10 22 712)"/>
            <ellipse cx="26" cy="788" rx="5" ry="8" fill="var(--ac, var(--accent))" opacity=".14" transform="rotate(15 26 788)"/>

            {/* Buds / Dots */}
            <circle cx="110" cy="62" r="2.5" fill="var(--ac, var(--accent))" opacity=".35"/>
            <circle cx="68" cy="178" r="2" fill="var(--ac, var(--accent))" opacity=".28"/>
            <circle cx="50" cy="442" r="2" fill="var(--ac, var(--accent))" opacity=".25"/>
            <circle cx="28" cy="712" r="1.8" fill="var(--ac, var(--accent))" opacity=".22"/>
            <circle cx="85" cy="280" r="1.8" fill="var(--ac, var(--accent))" opacity=".24"/>
            <circle cx="42" cy="540" r="1.6" fill="var(--ac, var(--accent))" opacity=".20"/>
          </g>
        </defs>
      </svg>

      {/* Gökyüzü (Güneş/Ay) */}
      <svg 
        style={{ position: 'absolute', top: 0, left: 0, right: 'auto', width: '200px', height: '300px' }} 
        viewBox="0 0 200 300" 
        fill="none"
      >
        {isDark ? (
          <>
            {baseCircle}
            {brightPart}
          </>
        ) : (
          <circle cx="70" cy={currentY} r="60" fill="#FDE047" opacity=".55" />
        )}
      </svg>

      {/* Background Branch (Fainter, smaller, slower) */}
      <svg 
        style={{ 
          position: 'absolute', 
          top: 0, 
          right: '30px', 
          height: '100%', 
          width: '110px',
          transformOrigin: 'top right',
          animation: 'natureSwayBg 14s ease-in-out infinite',
          opacity: 0.4
        }} 
        viewBox="0 0 140 852" 
        fill="none" 
        preserveAspectRatio="none"
      >
        <use href="#natureBranch" />
      </svg>

      {/* Foreground Branch (Main) */}
      <svg 
        style={{ 
          position: 'absolute', 
          top: 0, 
          right: 0, 
          height: '100%', 
          width: '140px',
          transformOrigin: 'top right',
          animation: 'natureSway 10s ease-in-out infinite'
        }} 
        viewBox="0 0 140 852" 
        fill="none" 
        preserveAspectRatio="none"
      >
        <use href="#natureBranch" />
      </svg>
    </div>
  );
}
