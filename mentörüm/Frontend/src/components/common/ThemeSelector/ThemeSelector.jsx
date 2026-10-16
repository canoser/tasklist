import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Palette, Trees, Waves, Sparkles, Terminal, Briefcase, Check } from 'lucide-react';
import { useUIStore } from '../../../store/uiStore';
import styles from './ThemeSelector.module.css';

export default function ThemeSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const { themeMode, themeStyle, setThemeMode, setThemeStyle } = useUIStore();

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const styleOptions = [
    { id: 'classic', label: 'Klasik SaaS', icon: Sparkles, colorClass: styles.colorClassic },
    { id: 'nature', label: 'Doğa & Orman', icon: Trees, colorClass: styles.colorNature },
    { id: 'ocean', label: 'Okyanus Esintisi', icon: Waves, colorClass: styles.colorOcean },
    { id: 'cyber', label: 'Cyber (Matrix)', icon: Terminal, colorClass: styles.colorCyber },
    { id: 'formal', label: 'Klasik Formal', icon: Briefcase, colorClass: styles.colorFormal },
  ];

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        className={styles.triggerBtn}
        onClick={() => setIsOpen((prev) => !prev)}
        title="Tema ve Görünüm Ayarları"
        aria-label="Tema Seçici"
        aria-expanded={isOpen}
      >
        <Palette size={18} strokeWidth={1.8} />
      </button>

      {isOpen && (
        <div className={styles.popover}>
          {/* Bölüm 1: Aydınlık / Karanlık Modu */}
          <div>
            <div className={styles.sectionHeader}>Görünüm Modu</div>
            <div className={styles.modeSegmented}>
              <button
                type="button"
                className={`${styles.modeBtn} ${themeMode === 'light' ? styles.modeBtnActive : ''}`}
                onClick={() => setThemeMode('light')}
              >
                <Sun size={15} strokeWidth={1.8} />
                <span>Açık</span>
              </button>
              <button
                type="button"
                className={`${styles.modeBtn} ${themeMode === 'dark' ? styles.modeBtnActive : ''}`}
                onClick={() => setThemeMode('dark')}
              >
                <Moon size={15} strokeWidth={1.8} />
                <span>Koyu</span>
              </button>
            </div>
          </div>

          {/* Bölüm 2: Tema Stilleri */}
          <div>
            <div className={styles.sectionHeader}>Tema Stili</div>
            <div className={styles.styleList}>
              {styleOptions.map((opt) => {
                const IconComponent = opt.icon;
                const isActive = themeStyle === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`${styles.styleItem} ${isActive ? styles.styleItemActive : ''}`}
                    onClick={() => {
                      setThemeStyle(opt.id);
                    }}
                  >
                    <div className={styles.styleLeft}>
                      <span className={`${styles.colorDot} ${opt.colorClass}`} />
                      <IconComponent size={16} strokeWidth={1.8} />
                      <span>{opt.label}</span>
                    </div>
                    {isActive && <Check size={16} strokeWidth={2.2} />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
