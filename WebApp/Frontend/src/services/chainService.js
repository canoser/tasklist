import apiClient from './apiClient';

const chainService = {
  /**
   * Kullanıcının tüm zincir görevlerini gruplu olarak getirir.
   * @returns {{ chainId: string, tasks: TaskItem[] }[]}
   */
  getChains: async () => {
    try {
      const response = await apiClient.get('/tasks/chains');
      return response.data || [];
    } catch (err) {
      console.warn('Zincir görevler alınamadı:', err);
      return [];
    }
  },

  /**
   * Yeni zincir görev oluşturur (bireysel — workspace gerektirmez).
   * @param {{ title: string, deadline: string, categoryId?: number }[]} tasks
   */
  createChain: async (tasks) => {
    const idempotencyKey = `chain-create-${Date.now()}`;
    const response = await apiClient.post(
      '/tasks/chain',
      { tasks, assignedUserIds: [], workspaceId: null },
      { headers: { 'Idempotency-Key': idempotencyKey } }
    );
    return response.data;
  },

  /**
   * Görevi (ve opsiyonel olarak zincirini) erteler.
   * @param {number} taskId
   * @param {number} daysToShift
   * @param {boolean} postponeAllChain
   */
  postponeTask: async (taskId, daysToShift, postponeAllChain = false) => {
    const idempotencyKey = `postpone-${taskId}-${Date.now()}`;
    await apiClient.put(
      `/tasks/${taskId}/postpone`,
      { daysToShift, postponeAllChain },
      { headers: { 'Idempotency-Key': idempotencyKey } }
    );
  },
};

export default chainService;
