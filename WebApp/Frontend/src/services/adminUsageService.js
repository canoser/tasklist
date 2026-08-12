import apiClient from './apiClient';

export const getGlobalUsageMetrics = async () => {
  try {
    const res = await apiClient.get('/admin/usage-metrics');
    return res.data;
  } catch (error) {
    console.error("Global kullanım verileri çekilirken hata oluştu:", error);
    throw error;
  }
};
