import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import SkyDecor from './SkyDecor';

export default function OceanDecor() {
  const { themeStyle, themeMode } = useTheme();


  if (themeStyle !== 'ocean') return null;

  const isDark = themeMode === 'dark';

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
      <SkyDecor />

      <svg 
        style={{ position: 'absolute', top: 0, right: 0, height: '100%', width: '140px' }} 
        viewBox="0 0 140 852" 
        fill="none" 
        preserveAspectRatio="none"
      >
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
