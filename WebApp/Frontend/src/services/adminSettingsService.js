import apiClient from './apiClient';

export const getSettings = async () => {
  const response = await apiClient.get('/api/admin/settings');
  return response.data;
};

export const updateSetting = async (key, value, description) => {
  const response = await apiClient.put(`/api/admin/settings/${key}`, { value, description });
  return response.data;
};
