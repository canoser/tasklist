import apiClient from './apiClient';
import storage from '../utils/storage';
import { subscribeToAuthChanges } from './authService';

let currentUser = null;
let rootsCache = null;

subscribeToAuthChanges((user) => {
  currentUser = user;
  rootsCache = null; // Kullanıcı değiştiğinde cache temizlensin
});

const generateId = () => `local_cat_${Date.now()}`;

export const categoryService = {
  getCachedRoots: () => rootsCache,
  getAll: async () => {
    if (!currentUser) {
      return storage.get('guest_categories') || [];
    }
    const response = await apiClient.get('/categories');
    return response.data;
  },

  create: async (categoryData) => {
    if (!currentUser) {
      const localCats = storage.get('guest_categories') || [];
      const newCat = { ...categoryData, id: generateId(), createdAt: new Date().toISOString() };
      localCats.push(newCat);
      storage.set('guest_categories', localCats);
      rootsCache = null; // Cache'i temizle
      return newCat;
    }
    const response = await apiClient.post('/categories', categoryData);
    rootsCache = null; // Cache'i temizle
    return response.data;
  },

  update: async (id, data) => {
    if (!currentUser) {
      const localCats = storage.get('guest_categories') || [];
      const index = localCats.findIndex(c => c.id === id);
      if (index !== -1) {
        localCats[index] = { ...localCats[index], ...data };
        storage.set('guest_categories', localCats);
        rootsCache = null; // Cache'i temizle
        return localCats[index];
      }
      return null;
    }
    const response = await apiClient.put(`/categories/${id}`, data);
    rootsCache = null; // Cache'i temizle
    return response.data;
  },

  delete: async (id) => {
    if (!currentUser) {
      let localCats = storage.get('guest_categories') || [];
      localCats = localCats.filter(c => c.id !== id);
      storage.set('guest_categories', localCats);
      rootsCache = null; // Cache'i temizle
      return { success: true };
    }
    const response = await apiClient.delete(`/categories/${id}`);
    rootsCache = null; // Cache'i temizle
    return response.data;
  },

  getRoots: async () => {
    if (rootsCache) return rootsCache;

    if (!currentUser) {
      const localCats = storage.get('guest_categories') || [];
      rootsCache = localCats.filter(c => !c.parentId);
      return rootsCache;
    }
    const response = await apiClient.get('/categories/roots');
    rootsCache = response.data;
    return rootsCache;
  },

  getChildren: async (parentId) => {
    if (!currentUser) {
      const localCats = storage.get('guest_categories') || [];
      return localCats.filter(c => c.parentId === parentId);
    }
    const response = await apiClient.get(`/categories/${parentId}/children`);
    return response.data;
  }
};
