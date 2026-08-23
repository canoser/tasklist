import React from 'react';
import { useTheme } from '../../context/ThemeContext';

export default function NatureDecor() {
  const { themeStyle } = useTheme();

  if (themeStyle !== 'nature') return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: 0,
      opacity: 0.8
    }}>
      <svg 
        viewBox="0 0 400 800" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMinYMin slice"
        style={{ width: '100%', height: '100%', opacity: 0.15 }}
      >
        {/* Ana kalın dal */}
        <path 
          d="M160 -10 Q140 150 90 280 T 50 500 T 30 850" 
          stroke="var(--accent)" 
          strokeWidth="3.5" 
          opacity="0.4"
          fill="none" 
        />
        
        {/* Yan filizler / ince dallar */}
        <path d="M110 60 Q125 45 132 38" stroke="var(--accent)" strokeWidth="1.1" opacity="0.32" strokeLinecap="round"/>
        <path d="M90 110 Q75 90 58 82"   stroke="var(--accent)" strokeWidth="1.1" opacity="0.30" strokeLinecap="round"/>
        <path d="M70 240 Q88 225 102 222" stroke="var(--accent)" strokeWidth="1.1" opacity="0.28" strokeLinecap="round"/>
        <path d="M55 370 Q38 350 24 345" stroke="var(--accent)" strokeWidth="1.1" opacity="0.25" strokeLinecap="round"/>
        <path d="M45 510 Q62 492 76 488" stroke="var(--accent)" strokeWidth="1.1" opacity="0.22" strokeLinecap="round"/>
        <path d="M38 640 Q22 622 12 618" stroke="var(--accent)" strokeWidth="1.1" opacity="0.20" strokeLinecap="round"/>

        {/* Yapraklar */}
        <ellipse cx="125" cy="40"  rx="6" ry="11" fill="var(--accent)" opacity="0.22" transform="rotate(35 125 40)"/>
        <ellipse cx="95"  cy="108" rx="8" ry="14" fill="var(--accent)" opacity="0.24" transform="rotate(16 95 108)"/>
        <ellipse cx="56"  cy="80"  rx="5" ry="10" fill="var(--accent)" opacity="0.20" transform="rotate(-30 56 80)"/>
        <ellipse cx="66"  cy="172" rx="6" ry="11" fill="var(--accent)" opacity="0.18" transform="rotate(-22 66 172)"/>
        <ellipse cx="72"  cy="238" rx="7" ry="13" fill="var(--accent)" opacity="0.22" transform="rotate(-6 72 238)"/>
        <ellipse cx="104" cy="220" rx="5" ry="10" fill="var(--accent)" opacity="0.18" transform="rotate(32 104 220)"/>
        <ellipse cx="64"  cy="305" rx="6" ry="11" fill="var(--accent)" opacity="0.18" transform="rotate(12 64 305)"/>
        <ellipse cx="58"  cy="368" rx="7" ry="12" fill="var(--accent)" opacity="0.20" transform="rotate(8 58 368)"/>
        <ellipse cx="22"  cy="342" rx="5" ry="9"  fill="var(--accent)" opacity="0.16" transform="rotate(-28 22 342)"/>
        <ellipse cx="36"  cy="435" rx="6" ry="10" fill="var(--accent)" opacity="0.16" transform="rotate(-15 36 435)"/>
        <ellipse cx="44"  cy="508" rx="6" ry="11" fill="var(--accent)" opacity="0.18" transform="rotate(-6 44 508)"/>
        <ellipse cx="78"  cy="486" rx="5" ry="9"  fill="var(--accent)" opacity="0.15" transform="rotate(30 78 486)"/>
        <ellipse cx="48"  cy="575" rx="5" ry="10" fill="var(--accent)" opacity="0.16" transform="rotate(18 48 575)"/>
        <ellipse cx="38"  cy="638" rx="6" ry="11" fill="var(--accent)" opacity="0.16" transform="rotate(5 38 638)"/>
        <ellipse cx="10"  cy="616" rx="4" ry="8"  fill="var(--accent)" opacity="0.14" transform="rotate(-25 10 616)"/>
        <ellipse cx="22"  cy="712" rx="5" ry="9"  fill="var(--accent)" opacity="0.15" transform="rotate(-10 22 712)"/>
        <ellipse cx="26"  cy="788" rx="5" ry="8"  fill="var(--accent)" opacity="0.14" transform="rotate(15 26 788)"/>

        {/* Tomurcuk / Nokta detayları */}
        <circle cx="110" cy="62"  r="2.5" fill="var(--accent)" opacity="0.35"/>
        <circle cx="68"  cy="178" r="2"   fill="var(--accent)" opacity="0.28"/>
        <circle cx="50"  cy="442" r="2"   fill="var(--accent)" opacity="0.25"/>
        <circle cx="28"  cy="712" r="1.8" fill="var(--accent)" opacity="0.22"/>
        <circle cx="85"  cy="280" r="1.8" fill="var(--accent)" opacity="0.24"/>
        <circle cx="42"  cy="540" r="1.6" fill="var(--accent)" opacity="0.20"/>
      </svg>
    </div>
  );
}
