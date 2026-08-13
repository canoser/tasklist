import apiClient from './apiClient';

export const getSettings = async () => {
  const response = await apiClient.get('/admin/settings');
  return response.data;
};

export const updateSetting = async (key, value, description) => {
  const response = await apiClient.put(`/admin/settings/${key}`, { value, description });
  return response.data;
};
