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
   * Kullanıcının tüm zincir görevlerini gruplu olarak getirir.
   * @returns {{ chainId: string, tasks: TaskItem[] }[]}
   */
  getChains: async () => {
    if (!currentUser) {
      // LOKAL: Misafir kullanıcı için LocalStorage'dan zincirleri grupla (hem DEV hem PROD)
      const localTasks = storage.get('guest_tasks') || [];
      const chainMap = {};
      
      localTasks.forEach(t => {
        if (t.chainId) {
          if (!chainMap[t.chainId]) chainMap[t.chainId] = { chainId: t.chainId, tasks: [] };
          chainMap[t.chainId].tasks.push(t);
        }
      });
      
      return Object.values(chainMap);
    }

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
    if (!currentUser) {
      // LOKAL: Misafir kullanıcı için zincir görevleri oluştur ve LocalStorage'a kaydet (hem DEV hem PROD)
      const localTasks = storage.get('guest_tasks') || [];
      const newChainId = generateId();
      
      const newTasks = tasks.map((t, index) => ({
        ...t,
        id: `local_task_${Date.now()}_${index}`,
        chainId: newChainId,
        chainOrder: index + 1,
        isCompleted: false,
        taskType: 'Zincirleme'
      }));
      
      storage.set('guest_tasks', [...localTasks, ...newTasks]);
      return { chainId: newChainId, tasks: newTasks };
    }

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
    if (!currentUser) {
      // LOKAL: Misafir kullanıcı için erteleme işlemi (hem DEV hem PROD)
      const localTasks = storage.get('guest_tasks') || [];
      const taskIndex = localTasks.findIndex(t => t.id === taskId);
      
      if (taskIndex !== -1) {
        const currentTask = localTasks[taskIndex];
        
        if (postponeAllChain && currentTask.chainId) {
          // Zincirdeki bu ve sonraki tüm görevleri ertele
          localTasks.forEach(t => {
            if (t.chainId === currentTask.chainId && (t.chainOrder >= (currentTask.chainOrder || 0) || new Date(t.deadline) >= new Date(currentTask.deadline))) {
              if (t.deadline) {
                const date = new Date(t.deadline);
                date.setDate(date.getDate() + daysToShift);
                t.deadline = date.toISOString();
              }
            }
          });
        } else {
          // Sadece tek görevi ertele
          if (currentTask.deadline) {
            const date = new Date(currentTask.deadline);
            date.setDate(date.getDate() + daysToShift);
            currentTask.deadline = date.toISOString();
          }
        }
        storage.set('guest_tasks', localTasks);
      }
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
