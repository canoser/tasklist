import apiClient from './apiClient';
import storage from '../utils/storage';
import { subscribeToAuthChanges } from './authService';

let currentUser = null;
subscribeToAuthChanges((user) => {
  currentUser = user;
});

const generateId = () => `local_chain_${Date.now()}`;

const chainService = {
  /**
   * Kullanıcının tüm zincir şablonlarını (ChainTemplates) getirir.
   */
  getChains: async () => {
    if (!currentUser) return [];

    try {
      const response = await apiClient.get('/chains');
      return response.data || [];
    } catch (err) {
      console.warn('Zincir şablonları alınamadı:', err);
      return [];
    }
  },

  /**
   * Yeni zincir şablonu (ChainTemplate) oluşturur.
   */
  createChainTemplate: async (templateData) => {
    if (!currentUser) return null;

    const idempotencyKey = `chain-template-create-${Date.now()}`;
    const response = await apiClient.post(
      '/chains',
      templateData,
      { headers: { 'Idempotency-Key': idempotencyKey } }
    );
    return response.data;
  },
  
  /**
   * Mevcut zincir şablonunu siler
   */
  deleteChainTemplate: async (templateId) => {
    if (!currentUser) return;
    await apiClient.delete(`/chains/${templateId}`);
  },

  /**
   * Manuel olarak zincir şablonlarından görevleri oluşturur (Lazy Generation)
   */
  generateTasks: async () => {
    if (!currentUser) return;
    await apiClient.post('/chains/generate');
  },

  /**
   * Görevi (ve opsiyonel olarak zincirini) erteler.
   */
  postponeTask: async (taskId, daysToShift, postponeAllChain = false) => {
    if (!currentUser) {
      return;
    }

    const idempotencyKey = `postpone-${taskId}-${Date.now()}`;
    await apiClient.put(
      `/tasks/${taskId}/postpone`,
      { daysToShift, postponeAllChain },
      { headers: { 'Idempotency-Key': idempotencyKey } }
    );
  },
};

export default chainService;
