import { create } from 'zustand';

export const useUIStore = create((set) => ({
  sidebarOpen: false,
  activeModal: null, // string (örn: 'createHomeworkModal') veya null

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  
  openSidebar: () => set({ sidebarOpen: true }),
  
  closeSidebar: () => set({ sidebarOpen: false }),

  openModal: (modalId) => set({ activeModal: modalId }),
  
  closeModal: () => set({ activeModal: null }),
}));
