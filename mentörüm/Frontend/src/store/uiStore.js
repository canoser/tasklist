import { create } from 'zustand';

const getSystemPreference = () => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
};

const resolveEffectiveMode = (mode) => {
  if (mode === 'system') return getSystemPreference();
  return mode === 'light' ? 'light' : 'dark';
};

const getInitialThemeMode = () => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('mentorum_theme_mode') || localStorage.getItem('mentorum_theme');
    if (saved === 'dark' || saved === 'light' || saved === 'system') return saved;
  }
  return 'dark';
};

const getInitialThemeStyle = () => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('mentorum_theme_style');
    if (['classic', 'nature', 'ocean', 'cyber', 'formal'].includes(saved)) return saved;
  }
  return 'classic';
};

const getInitialStudentHomeLayout = () => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('mentorum_student_home_layout');
    if (saved === 'compact' || saved === 'widget') return saved;
  }
  return 'compact';
};

const applyThemeToDom = (style, mode) => {
  if (typeof document !== 'undefined') {
    const effectiveMode = resolveEffectiveMode(mode);
    const root = document.documentElement;
    root.setAttribute('data-theme', effectiveMode); // Geriye dönük uyumluluk
    root.setAttribute('data-theme-mode', effectiveMode);
    root.setAttribute('data-theme-preference', mode);
    root.setAttribute('data-theme-style', style);
  }
};

// Cihaz tema değişikliğini gerçek zamanlı dinleme
if (typeof window !== 'undefined' && window.matchMedia) {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const listener = () => {
    const saved = localStorage.getItem('mentorum_theme_mode');
    if (saved === 'system') {
      const style = localStorage.getItem('mentorum_theme_style') || 'classic';
      applyThemeToDom(style, 'system');
    }
  };
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', listener);
  } else if (mediaQuery.addListener) {
    mediaQuery.addListener(listener);
  }
}

const initialMode = getInitialThemeMode();
const initialStyle = getInitialThemeStyle();
const initialStudentHomeLayout = getInitialStudentHomeLayout();
applyThemeToDom(initialStyle, initialMode);

export const useUIStore = create((set) => ({
  sidebarOpen: false,
  activeModal: null, // string (örn: 'createHomeworkModal') veya null
  theme: initialMode, // Geriye dönük uyumluluk: 'light' | 'dark'
  themeMode: initialMode,
  themeStyle: initialStyle,
  studentHomeLayout: initialStudentHomeLayout, // 'compact' | 'widget'

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

  setStudentHomeLayout: (layout) => set(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('mentorum_student_home_layout', layout);
    }
    return { studentHomeLayout: layout };
  }),
}));

