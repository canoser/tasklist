import React from 'react';
import { useTheme } from '../../context/ThemeContext';

export default function NatureDecor() {
  const { themeStyle } = useTheme();

  if (themeStyle !== 'nature') return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: '150px',
      height: '150px',
      pointerEvents: 'none',
      zIndex: 0,
      opacity: 0.12
    }}>
      <svg viewBox="0 0 150 150" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path 
          d="M150 5 Q120 35 90 45 Q60 55 45 80" 
          stroke="var(--accent)" 
          strokeWidth="2" 
          fill="none" 
        />
        <ellipse cx="120" cy="25" rx="15" ry="8" transform="rotate(-30 120 25)" fill="var(--accent)" />
        <ellipse cx="90" cy="55" rx="12" ry="6" transform="rotate(-10 90 55)" fill="var(--accent)" />
        <ellipse cx="65" cy="40" rx="10" ry="5" transform="rotate(-45 65 40)" fill="var(--accent)" />
      </svg>
    </div>
  );
}
