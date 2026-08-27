import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';

export default function CyberpunkDecor() {
  const { themeStyle, themeMode } = useTheme();
  
  // A simple way to regenerate random strings to make the rain feel alive
  const [rainStrings, setRainStrings] = useState([]);

  useEffect(() => {
    if (themeStyle !== 'cyberpunk') return;
    
    // Generate initial strings
    const generateStrings = () => {
      return [...Array(20)].map(() => {
        // Random 10-15 chars length hex/binary looking string
        const len = 10 + Math.floor(Math.random() * 5);
        let str = '';
        for (let i = 0; i < len; i++) {
          str += Math.random() > 0.5 ? Math.floor(Math.random() * 10) : String.fromCharCode(65 + Math.floor(Math.random() * 6));
        }
        return str;
      });
    };

    setRainStrings(generateStrings());
    
    // Periodically scramble some strings to look like changing data
    const interval = setInterval(() => {
      setRainStrings(prev => {
        const newStrings = [...prev];
        const indexToScramble = Math.floor(Math.random() * newStrings.length);
        const len = 10 + Math.floor(Math.random() * 5);
        let str = '';
        for (let i = 0; i < len; i++) {
          str += Math.random() > 0.5 ? Math.floor(Math.random() * 10) : String.fromCharCode(65 + Math.floor(Math.random() * 6));
        }
        newStrings[indexToScramble] = str;
        return newStrings;
      });
    }, 6000);

    return () => clearInterval(interval);
  }, [themeStyle]);

  if (themeStyle !== 'cyberpunk') return null;

  const isDark = themeMode === 'dark';
  
  // Vibrant colors for cyberpunk theme
  const rainColor = isDark ? 'rgba(0, 255, 170, 0.5)' : 'rgba(0, 150, 100, 0.2)';
  const circuitColor = isDark ? 'rgba(255, 0, 150, 0.4)' : 'rgba(200, 0, 100, 0.2)';
  const glowColor = isDark ? 'rgba(255, 0, 150, 0.8)' : 'rgba(200, 0, 100, 0.4)';

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0
    }}>
      <style>
        {`
          @keyframes digitalRain {
            0% { transform: translateY(-100%); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(100vh); opacity: 0; }
          }
          @keyframes circuitPulse {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 0.9; filter: drop-shadow(0 0 6px ${glowColor}); }
          }
          .rain-column {
            font-family: 'Courier New', Courier, monospace;
            font-size: 14px;
            font-weight: bold;
            fill: ${rainColor};
            animation: digitalRain linear infinite;
            text-shadow: 0 0 4px ${rainColor};
          }
          .circuit-line {
            stroke: ${circuitColor};
            stroke-width: 2.5;
            fill: none;
            stroke-linecap: round;
            stroke-linejoin: round;
            animation: circuitPulse 4s ease-in-out infinite;
          }
        `}
      </style>

      {/* Digital Rain Background */}
      <svg width="100%" height="100%" style={{ position: 'absolute' }}>
        {rainStrings.map((str, i) => (
          <text 
            key={`rain-${i}`}
            x={`${2 + (i * 5)}%`} 
            y="0" 
            className="rain-column"
            style={{ 
              animationDuration: `${22 + (i % 6) * 4}s`,
              animationDelay: `${(i % 5) * 2.5}s`,
              writingMode: 'vertical-rl',
              textOrientation: 'upright',
              letterSpacing: '5px'
            }}
          >
            {str}
          </text>
        ))}
      </svg>

      {/* Circuit Board Traces (Left) */}
      <svg viewBox="0 0 200 400" style={{ position: 'absolute', left: 0, top: '10%', height: '70vh' }}>
        <g className="circuit-line" style={{ animationDelay: '0s' }}>
          <path d="M-10,50 L50,50 L70,70 L70,120 L90,140 L130,140" />
          <circle cx="130" cy="140" r="4.5" fill={circuitColor} />
          <circle cx="130" cy="140" r="1.5" fill="#fff" />
        </g>
        <g className="circuit-line" style={{ animationDelay: '1.2s' }}>
          <path d="M-10,90 L30,90 L50,110 L50,180 L80,210 L100,210" />
          <rect x="96" y="206" width="8" height="8" fill={circuitColor} />
        </g>
        <g className="circuit-line" style={{ animationDelay: '2.5s' }}>
          <path d="M-10,130 L10,130 L40,160 L40,240 L60,260 L90,260" />
          <circle cx="90" cy="260" r="4" fill={circuitColor} />
        </g>
        <g className="circuit-line" style={{ animationDelay: '0.8s' }}>
          <path d="M-10,200 L20,200 L30,210 L30,280 L50,300 L70,300" />
          <rect x="66" y="296" width="8" height="8" fill={circuitColor} />
        </g>
      </svg>

      {/* Circuit Board Traces (Right) */}
      <svg viewBox="0 0 200 400" style={{ position: 'absolute', right: 0, bottom: '5%', height: '70vh', transform: 'scaleX(-1)' }}>
        <g className="circuit-line" style={{ animationDelay: '0.5s' }}>
          <path d="M-10,60 L40,60 L60,80 L60,150 L80,170 L120,170" />
          <circle cx="120" cy="170" r="4.5" fill={circuitColor} />
          <circle cx="120" cy="170" r="1.5" fill="#fff" />
        </g>
        <g className="circuit-line" style={{ animationDelay: '1.8s' }}>
          <path d="M-10,100 L20,100 L40,120 L40,190 L70,220 L90,220" />
          <rect x="86" y="216" width="8" height="8" fill={circuitColor} />
        </g>
        <g className="circuit-line" style={{ animationDelay: '3.1s' }}>
          <path d="M-10,140 L10,140 L30,160 L30,230 L50,250 L80,250" />
          <circle cx="80" cy="250" r="4" fill={circuitColor} />
        </g>
      </svg>
    </div>
  );
}
