"use client";

import React, { useEffect, useState } from 'react';

const SYMBOLS = ['∑', '∞', 'π', '√', '∫', '∆', 'Ω', 'λ', 'μ', 'θ', '0', '1', '{', '}', '≈', '≠'];

export default function MatrixLogo() {
  const [grid, setGrid] = useState([]);
  
  useEffect(() => {
    // Initial 3x3 grid
    setGrid(Array.from({ length: 9 }, () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]));
    
    // Interval to randomly change one symbol at a time for a "digital/hacking" feel
    const interval = setInterval(() => {
      setGrid(prev => {
        const newGrid = [...prev];
        const randomIdx = Math.floor(Math.random() * 9);
        newGrid[randomIdx] = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        return newGrid;
      });
    }, 400);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center">
      {/* Container for the Matrix Logo */}
      <div className="flex items-center text-green-400 font-mono select-none" style={{ textShadow: '0 0 10px rgba(74,222,128,0.7)' }}>
        
        {/* Left Bracket */}
        <div className="text-8xl font-light" style={{ transform: 'scaleY(1.5)', marginRight: '1rem', textShadow: '0 0 15px rgba(74,222,128,0.9)' }}>
          [
        </div>
        
        {/* 3x3 Grid */}
        <div className="grid grid-cols-3 gap-6 text-3xl font-bold text-center">
          {grid.map((char, index) => (
            <div 
              key={index} 
              className="w-10 h-10 flex items-center justify-center transition-all duration-300"
              style={{
                // Add a slight random opacity flicker
                opacity: 0.7 + Math.random() * 0.3,
              }}
            >
              {char}
            </div>
          ))}
        </div>

        {/* Right Bracket */}
        <div className="text-8xl font-light" style={{ transform: 'scaleY(1.5)', marginLeft: '1rem', textShadow: '0 0 15px rgba(74,222,128,0.9)' }}>
          ]
        </div>
      </div>

      {/* Brand Text */}
      <div className="mt-12 text-3xl tracking-[0.3em] font-bold text-white uppercase relative">
        Ders<span className="text-green-400">Matris</span>
        <div className="absolute -bottom-2 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-green-400 to-transparent opacity-50"></div>
      </div>
      <div className="mt-4 text-xs tracking-widest text-gray-500 uppercase">
        Eğitimin Yeni Algoritması
      </div>
    </div>
  );
}
