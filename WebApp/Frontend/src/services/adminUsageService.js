import apiClient from './apiClient';

export const getGlobalUsageMetrics = async () => {
  try {
    const res = await apiClient.get('/api/admin/usage-metrics');
    return res.data;
  } catch (error) {
    console.error("Global kullanım verileri çekilirken hata oluştu:", error);
    throw error;
  }
};
export const getResourceExpenses = async () => {
  try {
    const res = await apiClient.get('/api/admin/resource-expenses');
    return res.data;
  } catch (error) {
    console.error("Kaynak harcamaları çekilirken hata oluştu:", error);
    throw error;
  }
};

export const syncR2Storage = async () => {
  try {
    const res = await apiClient.post('/api/admin/sync-r2-storage');
    return res.data;
  } catch (error) {
    console.error("R2 senkronizasyonu başlatılırken hata oluştu:", error);
    throw error;
  }
};
