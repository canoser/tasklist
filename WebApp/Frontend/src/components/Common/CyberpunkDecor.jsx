import React from 'react';
import { useTheme } from '../../context/ThemeContext';

export default function CyberpunkDecor() {
  const { themeStyle } = useTheme();

  if (themeStyle !== 'cyberpunk') return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: 0,
      opacity: 0.8,
      overflow: 'hidden'
    }}>
      {/* Background Tech Grid */}
      <svg 
        width="100%" 
        height="100%" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'absolute', top: 0, left: 0, opacity: 0.05 }}
      >
        <defs>
          <pattern id="cyberGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--accent)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#cyberGrid)" />
      </svg>
      
      {/* Digital / Circuit Lines */}
      <svg 
        viewBox="0 0 800 800" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
        style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, opacity: 0.15 }}
      >
        <path d="M-100,100 L150,100 L200,150 L500,150 L550,200 L900,200" stroke="var(--accent)" strokeWidth="1" strokeOpacity="0.5" />
        <circle cx="150" cy="100" r="3" fill="var(--accent)" />
        <circle cx="500" cy="150" r="3" fill="var(--accent)" />
        
        <path d="M-50,600 L200,600 L250,550 L600,550 L650,500 L900,500" stroke="var(--accent)" strokeWidth="1" strokeOpacity="0.3" />
        <circle cx="200" cy="600" r="3" fill="var(--accent)" />
        <circle cx="600" cy="550" r="3" fill="var(--accent)" />
        
        <path d="M300,850 L300,700 L350,650 L350,300 L400,250 L400,-50" stroke="var(--accent)" strokeWidth="1" strokeOpacity="0.4" />
        <circle cx="300" cy="700" r="3" fill="var(--accent)" />
        <circle cx="350" cy="300" r="3" fill="var(--accent)" />
        
        {/* Abstract binary / tech blocks */}
        <rect x="50" y="300" width="20" height="4" fill="var(--accent)" opacity="0.4" />
        <rect x="50" y="310" width="10" height="4" fill="var(--accent)" opacity="0.3" />
        <rect x="50" y="320" width="30" height="4" fill="var(--accent)" opacity="0.5" />
        
        <rect x="650" y="200" width="15" height="4" fill="var(--accent)" opacity="0.4" />
        <rect x="630" y="210" width="35" height="4" fill="var(--accent)" opacity="0.3" />
        
        <rect x="400" y="600" width="40" height="4" fill="var(--accent)" opacity="0.2" />
        <rect x="420" y="610" width="20" height="4" fill="var(--accent)" opacity="0.4" />
      </svg>
    </div>
  );
}
