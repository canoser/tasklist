import apiClient from './apiClient';
import { getCache, setCache, addToOfflineQueue } from '../utils/indexedDB';
import { subscribeToAuthChanges } from './authService';
import storage from '../utils/storage';

let currentUser = null;
subscribeToAuthChanges((user) => {
  currentUser = user;
});

const generateId = () => `local_${Date.now()}`;

export const taskService = {
  getTimeline: async (userId, start, end) => {
    if (!currentUser && !userId) {
      return storage.get('guest_tasks') || [];
    }
    
    try {
      const params = {};
      if (start) params.start = start.toISOString();
      if (end) params.end = end.toISOString();

      const response = await apiClient.get(`/tasks/user/${userId}/timeline`, { params });
      
      // Update Cache (Network-First)
      await setCache(`timeline_${userId}`, response.data);
      
      return response.data || [];
    } catch (err) {
      // If network error, fallback to IDB cache
      if (!err.response) {
        console.warn('Network error, fetching from IDB Cache');
        const cached = await getCache(`timeline_${userId}`);
        return cached || [];
      }
      console.warn('Timeline API Error:', err);
      return [];
    }
  },

  getByUserId: async (userId) => {
    if (!currentUser && !userId) return storage.get('guest_tasks') || [];
    
    try {
      const response = await apiClient.get(`/tasks/user/${userId}`);
      await setCache(`tasks_${userId}`, response.data);
      return response.data;
    } catch (err) {
      if (!err.response) {
        const cached = await getCache(`tasks_${userId}`);
        return cached || [];
      }
      return [];
    }
  },

  getById: async (id) => {
    if (!currentUser) {
      const localTasks = storage.get('guest_tasks') || [];
      return localTasks.find(t => t.id === id) || null;
    }
    try {
      const response = await apiClient.get(`/tasks/${id}`);
      return response.data;
    } catch (err) {
      if (!err.response) {
        return null;
      }
      return null;
    }
  },

  create: async (taskData) => {
    if (!currentUser) {
      const localTasks = storage.get('guest_tasks') || [];
      const newTask = { ...taskData, id: generateId(), isCompleted: false };
      localTasks.push(newTask);
      storage.set('guest_tasks', localTasks);
      return newTask;
    }

    try {
      const response = await apiClient.post('/tasks', taskData);
      return response.data;
    } catch (err) {
      if (!err.response) {
        // Offline: Queue the action
        const fakeId = generateId();
        const action = {
          type: 'POST',
          url: '/tasks',
          data: taskData,
          fakeId,
          timestamp: Date.now()
        };
        await addToOfflineQueue(action);
        
        // Optimistic return
        return { ...taskData, id: fakeId, isCompleted: false, isOffline: true };
      }
      throw err;
    }
  },

  update: async (id, taskData) => {
    if (!currentUser) {
      const localTasks = storage.get('guest_tasks') || [];
      const index = localTasks.findIndex(t => t.id === id);
      if (index !== -1) {
        localTasks[index] = { ...localTasks[index], ...taskData };
        storage.set('guest_tasks', localTasks);
        return localTasks[index];
      }
      return null;
    }

    try {
      const response = await apiClient.put(`/tasks/${id}`, taskData);
      return response.data;
    } catch (err) {
      if (!err.response) {
        await addToOfflineQueue({
          type: 'PUT',
          url: `/tasks/${id}`,
          data: taskData,
          timestamp: Date.now()
        });
        return { ...taskData, id, isOffline: true };
      }
      throw err;
    }
  },

  completeTask: async (id, performanceData, userId) => {
    if (!currentUser) {
      const localTasks = storage.get('guest_tasks') || [];
      const index = localTasks.findIndex(t => t.id === id);
      if (index !== -1) {
        localTasks[index].isCompleted = true;
        storage.set('guest_tasks', localTasks);
        return { success: true, completeData: localTasks[index], performanceData };
      }
      return { success: false };
    }
    
    try {
      const completeResponse = await apiClient.patch(`/tasks/${id}/complete`);
      let performanceResponse = null;
      if (performanceData) {
        performanceResponse = await apiClient.post('/performance', {
          taskItemId: id,
          userId: userId || performanceData.userId || '',
          correctCount: performanceData.correct || 0,
          wrongCount: performanceData.wrong || 0,
          blankCount: performanceData.blank || 0,
          netScore: performanceData.net || 0,
          notes: performanceData.notes || '',
        });
      }

      return {
        success: true,
        completeData: completeResponse.data,
        performanceData: performanceResponse?.data,
      };
    } catch (err) {
      if (!err.response) {
        // Queue the completion
        await addToOfflineQueue({
          type: 'PATCH',
          url: `/tasks/${id}/complete`,
          timestamp: Date.now()
        });
        
        if (performanceData) {
          await addToOfflineQueue({
            type: 'POST',
            url: '/performance',
            data: {
              taskItemId: id,
              userId: userId || performanceData.userId || '',
              correctCount: performanceData.correct || 0,
              wrongCount: performanceData.wrong || 0,
              blankCount: performanceData.blank || 0,
              netScore: performanceData.net || 0,
              notes: performanceData.notes || '',
            },
            timestamp: Date.now()
          });
        }

        return { success: true, completeData: { id, isCompleted: true, isOffline: true }, performanceData };
      }
      return { success: false };
    }
  },

  delete: async (id) => {
    if (!currentUser) {
      let localTasks = storage.get('guest_tasks') || [];
      localTasks = localTasks.filter(t => t.id !== id);
      storage.set('guest_tasks', localTasks);
      return { success: true };
    }

    try {
      const response = await apiClient.delete(`/tasks/${id}`);
      return response.data;
    } catch (err) {
      if (!err.response) {
        await addToOfflineQueue({
          type: 'DELETE',
          url: `/tasks/${id}`,
          timestamp: Date.now()
        });
        return { success: true, isOffline: true };
      }
      throw err;
    }
  },

  attachFile: async (taskId, fileId) => {
    if (!currentUser) return { success: false, message: 'Misafir kullanıcılar dosya yükleyemez.' };

    try {
      // UUID for idempotency
      const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : `idempotency-${Date.now()}`;

      const response = await apiClient.post(
        `/tasks/${taskId}/attach-file`, 
        { fileId },
        { headers: { 'Idempotency-Key': idempotencyKey } }
      );
      return { success: true, data: response.data };
    } catch (err) {
      console.error('Göreve dosya bağlama hatası:', err);
      throw err;
    }
  }
};

export default taskService;
