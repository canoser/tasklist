import React, { createContext, useContext, useState, useEffect } from 'react';
import storage from '../utils/storage';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [themeStyle, setThemeStyle] = useState(storage.getString('app_theme_style') || 'classic');
  const [themeMode, setThemeMode] = useState(storage.getString('app_theme_mode') || 'dark');
  const [fontFamily, setFontFamily] = useState(storage.getString('app_font_family') || 'inter');
  const [fontSize, setFontSize] = useState(storage.getString('app_font_size') || 'md');

  useEffect(() => {
    const body = document.body;
    
    // Clear old classes and any inline styles from index.html anti-flicker script
    body.className = '';
    body.style.backgroundColor = '';
    
    // Add new classes
    body.classList.add(`theme-${themeStyle}-${themeMode}`);
    body.classList.add(`font-${fontFamily}`);
    body.classList.add(`font-size-${fontSize}`);

    // Persist changes
    storage.setString('app_theme_style', themeStyle);
    storage.setString('app_theme_mode', themeMode);
    storage.setString('app_font_family', fontFamily);
    storage.setString('app_font_size', fontSize);

    // Support legacy data attributes just in case
    document.documentElement.setAttribute('data-theme', themeStyle);
    document.documentElement.setAttribute('data-appearance', themeMode);

  }, [themeStyle, themeMode, fontFamily, fontSize]);

  const toggleMode = () => {
    setThemeMode(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const value = {
    themeStyle,
    setThemeStyle,
    themeMode,
    setThemeMode,
    toggleMode,
    fontFamily,
    setFontFamily,
    fontSize,
    setFontSize
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
