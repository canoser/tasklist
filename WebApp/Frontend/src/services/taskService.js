import apiClient from './apiClient';
import roleService from './roleService';

// ── Mock Yardımcı (Tek Tanım — DRY) ─────────────────────────────────────────
const _buildMockDay = (year, month, day, userRoles = []) => {
  const dateStr = new Date(year, month, day, 12, 0).toISOString();
  
  // Eğer kullanıcı rol tanımlamadıysa varsayılan roller uyduralım ki takvim boş kalmasın
  const roles = userRoles.length > 0 ? userRoles : [
    { roleName: 'Öğrenci' },
    { roleName: 'Öğretmen' },
    { roleName: 'Diğer / Kişisel' }
  ];
  
  const getRandRole = () => roles[Math.floor(Math.random() * roles.length)].roleName;

  return [
    { id: `m${day}_1`, title: `${day} - Test Çözümü`, subject: 'Matematik', targetCount: 40, deadline: dateStr, isCompleted: false, count: '40 Soru', roleName: getRandRole() },
    { id: `m${day}_2`, title: `${day} - Konu Anlatımı`, subject: 'Fizik', targetCount: 1, deadline: dateStr, isCompleted: false, count: '1 Ünite', roleName: getRandRole() },
    { id: `m${day}_3`, title: `${day} - Okuma`, subject: 'Diğer', targetCount: 20, deadline: dateStr, isCompleted: false, count: '20 Sayfa', roleName: getRandRole() }
  ];
};

const _getMockTasks = (roles = []) => {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth();
  return [1, 8, 15, 22].flatMap(day => _buildMockDay(y, m, day, roles));
};

export const taskService = {
  /**
   * Kullanıcının Timeline görevlerini tarih aralığına göre getirir.
   * Backend: GET /api/tasks/user/{userId}/timeline?start={start}&end={end}
   */
  getTimeline: async (userId, start, end) => {
    try {
      const params = {};
      if (start) params.start = start.toISOString();
      if (end) params.end = end.toISOString();

      const [response, roles] = await Promise.all([
        apiClient.get(`/tasks/user/${userId}/timeline`, { params }),
        roleService.getActive(userId)
      ]);
      const apiData = response.data || [];
      return [...apiData, ..._getMockTasks(roles)];
    } catch (err) {
      console.warn('Timeline API başarısız, sadece mock veri dönülüyor.', err);
      // Fallback için de rolleri almayı deneriz
      try {
        const roles = await roleService.getActive(userId);
        return _getMockTasks(roles);
      } catch (e) {
        return _getMockTasks([]);
      }
    }
  },

  /**
   * Kullanıcının tüm görevlerini getirir.
   * Backend: GET /api/tasks/user/{userId}
   */
  getByUserId: async (userId) => {
    const response = await apiClient.get(`/tasks/user/${userId}`);
    return response.data;
  },

  /**
   * Görevi Id ile getirir.
   * Backend: GET /api/tasks/{id}
   */
  getById: async (id) => {
    const response = await apiClient.get(`/tasks/${id}`);
    return response.data;
  },

  /**
   * Yeni görev oluşturur (Idempotency korumalı).
   * Backend: POST /api/tasks
   */
  create: async (taskData) => {
    const response = await apiClient.post('/tasks', taskData);
    return response.data;
  },

  /**
   * Mevcut görevi günceller (Idempotency korumalı).
   * Backend: PUT /api/tasks/{id}
   */
  update: async (id, taskData) => {
    const response = await apiClient.put(`/tasks/${id}`, taskData);
    return response.data;
  },

  /**
   * Görevi tamamlandı olarak işaretler ve performans skorunu kaydeder (Idempotency korumalı).
   * Backend: PATCH /api/tasks/{id}/complete & POST /api/performance
   */
  completeTask: async (id, performanceData, userId) => {
    // 1. Görevi tamamlandı işaretle
    const completeResponse = await apiClient.patch(`/tasks/${id}/complete`);

    // 2. Performans kaydı verisi varsa kaydet
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
  },

  /**
   * Görevi siler.
   * Backend: DELETE /api/tasks/{id}
   */
  delete: async (id) => {
    const response = await apiClient.delete(`/tasks/${id}`);
    return response.data;
  },
};

export default taskService;
