import { create } from 'zustand';

const getInitialThemeMode = () => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('mentorum_theme_mode') || localStorage.getItem('mentorum_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  }
  return 'light';
};

const getInitialThemeStyle = () => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('mentorum_theme_style');
    if (['classic', 'nature', 'ocean', 'cyber', 'formal'].includes(saved)) return saved;
  }
  return 'classic';
};

const applyThemeToDom = (style, mode) => {
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.setAttribute('data-theme', mode); // Geriye dönük uyumluluk
    root.setAttribute('data-theme-mode', mode);
    root.setAttribute('data-theme-style', style);
  }
};

const initialMode = getInitialThemeMode();
const initialStyle = getInitialThemeStyle();
applyThemeToDom(initialStyle, initialMode);

export const useUIStore = create((set) => ({
  sidebarOpen: false,
  activeModal: null, // string (örn: 'createHomeworkModal') veya null
  theme: initialMode, // Geriye dönük uyumluluk: 'light' | 'dark'
  themeMode: initialMode,
  themeStyle: initialStyle,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  openSidebar: () => set({ sidebarOpen: true }),
  closeSidebar: () => set({ sidebarOpen: false }),

  openModal: (modalId) => set({ activeModal: modalId }),
  closeModal: () => set({ activeModal: null }),

  toggleTheme: () => set((state) => {
    const nextMode = state.themeMode === 'light' ? 'dark' : 'light';
    applyThemeToDom(state.themeStyle, nextMode);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('mentorum_theme_mode', nextMode);
      localStorage.setItem('mentorum_theme', nextMode);
    }
    return { theme: nextMode, themeMode: nextMode };
  }),

  setThemeMode: (mode) => set((state) => {
    applyThemeToDom(state.themeStyle, mode);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('mentorum_theme_mode', mode);
      localStorage.setItem('mentorum_theme', mode);
    }
    return { theme: mode, themeMode: mode };
  }),

  setThemeStyle: (style) => set((state) => {
    applyThemeToDom(style, state.themeMode);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('mentorum_theme_style', style);
    }
    return { themeStyle: style };
  }),

  setTheme: (theme) => set((state) => {
    applyThemeToDom(state.themeStyle, theme);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('mentorum_theme_mode', theme);
      localStorage.setItem('mentorum_theme', theme);
    }
    return { theme, themeMode: theme };
  }),
}));

