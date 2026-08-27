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

export default function OceanDecor() {
  const { themeStyle, themeMode } = useTheme();

  // For Moon
  const [targetPhase] = useState(() => getMoonPhase());
  const [currentPhase, setCurrentPhase] = useState(0);

  // For Sun
  const [targetY] = useState(() => getTargetSunY());
  const [currentY, setCurrentY] = useState(360);

  useEffect(() => {
    if (themeStyle !== 'ocean') return;

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

  if (themeStyle !== 'ocean') return null;

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
      {/* ── YENİ EKLENEN GÖKYÜZÜ (Güneş/Ay/Yıldızlar) ── */}
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

      <svg 
        style={{ position: 'absolute', top: 0, right: 0, height: '100%', width: '140px' }} 
        viewBox="0 0 140 852" 
        fill="none" 
        preserveAspectRatio="none"
      >
        {isDark && (
          <>
            <path d="M42 65 Q42 75 32 75 Q42 75 42 85 Q42 75 52 75 Q42 75 42 65 Z" fill="#FFFFFF" opacity=".75" />
            <path d="M110 35 Q110 42 103 42 Q110 42 110 49 Q110 42 117 42 Q110 42 110 35 Z" fill="#FFFFFF" opacity=".6" />
            <path d="M28 220 Q28 227 21 227 Q28 227 28 234 Q28 227 35 227 Q28 227 28 220 Z" fill="#FFFFFF" opacity=".65" />
            <circle cx="22" cy="110" r="2.2" fill="#FFFFFF" opacity=".85" />
            <circle cx="120" cy="115" r="1.8" fill="#FFFFFF" opacity=".7" />
            <circle cx="18" cy="165" r="1.5" fill="#FFFFFF" opacity=".8" />
            <circle cx="115" cy="190" r="2" fill="#FFFFFF" opacity=".75" />
            <circle cx="50" cy="270" r="2.5" fill="#FFFFFF" opacity=".8" />
            <circle cx="85" cy="245" r="1.6" fill="#FFFFFF" opacity=".6" />
            <circle cx="125" cy="275" r="2" fill="#FFFFFF" opacity=".7" />
            <circle cx="35" cy="330" r="1.8" fill="#FFFFFF" opacity=".75" />
            <circle cx="105" cy="360" r="2.2" fill="#FFFFFF" opacity=".65" />
            <circle cx="25" cy="430" r="1.5" fill="#FFFFFF" opacity=".6" />
            <circle cx="75" cy="470" r="2" fill="#FFFFFF" opacity=".7" />
            <circle cx="118" cy="520" r="1.8" fill="#FFFFFF" opacity=".65" />
            <circle cx="40" cy="590" r="2" fill="#FFFFFF" opacity=".7" />
            <circle cx="95" cy="650" r="1.6" fill="#FFFFFF" opacity=".6" />
            <circle cx="30" cy="720" r="2" fill="#FFFFFF" opacity=".65" />
            <circle cx="80" cy="780" r="1.5" fill="#FFFFFF" opacity=".55" />
          </>
        )}
      </svg>

      {/* ── KULLANICININ İSTEDİĞİ ESKİ BÜYÜK DALGALAR (ŞİMDİ HAREKETLİ) ── */}
      <style>
        {`
          @keyframes oceanSwayLeft {
            0% { transform: translateX(0); }
            50% { transform: translateX(-15vw); }
            100% { transform: translateX(0); }
          }
          @keyframes oceanSwayRight {
            0% { transform: translateX(-15vw); }
            50% { transform: translateX(0); }
            100% { transform: translateX(-15vw); }
          }
        `}
      </style>
      <svg 
        viewBox="0 0 1440 320" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        style={{ 
          width: '130vw', 
          height: '50vh', 
          position: 'absolute', 
          bottom: 0, 
          left: 0,
          opacity: 0.15,
          animation: 'oceanSwayLeft 30s ease-in-out infinite'
        }}
      >
        <path fill="var(--accent)" fillOpacity="1" d="M0,256L48,229.3C96,203,192,149,288,154.7C384,160,480,224,576,218.7C672,213,768,139,864,128C960,117,1056,171,1152,197.3C1248,224,1344,224,1392,224L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
      </svg>
      <svg 
        viewBox="0 0 1440 320" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        style={{ 
          width: '130vw', 
          height: '60vh', 
          position: 'absolute', 
          bottom: 0, 
          left: 0,
          opacity: 0.1,
          animation: 'oceanSwayRight 40s ease-in-out infinite'
        }}
      >
        <path fill="var(--accent)" fillOpacity="1" d="M0,192L48,170.7C96,149,192,107,288,106.7C384,107,480,149,576,149.3C672,149,768,107,864,117.3C960,128,1056,192,1152,213.3C1248,235,1344,213,1392,202.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
      </svg>
    </div>
  );
}
