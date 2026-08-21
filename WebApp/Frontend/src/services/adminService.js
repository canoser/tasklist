import apiClient from "./apiClient";

export const searchUsers = async (email) => {
  const response = await apiClient.get(`/admin/users/search?email=${encodeURIComponent(email)}`);
  return response.data;
};

export const updateUserLimits = async (userId, limitsData) => {
  const response = await apiClient.put(`/admin/users/${userId}/override`, limitsData);
  return response.data;
};

export const getSettings = async () => {
  const response = await apiClient.get('/admin/settings');
  return response.data;
};

export const updateSetting = async (key, value, description) => {
  const response = await apiClient.put(`/admin/settings/${key}`, { value, description });
  return response.data;
};

export const getSystemStats = async () => {
  const response = await apiClient.get('/admin/system-stats');
  return response.data;
};

export const getUsageMetrics = async () => {
  const response = await apiClient.get('/admin/usage-metrics');
  return response.data;
};

export const getCloudflareStats = async () => {
  const response = await apiClient.get('/admin/cloudflare-stats');
  return response.data;
};

// --- Workspace Management (Admin) ---

export const getAllWorkspaces = async () => {
  const response = await apiClient.get('/admin/workspaces');
  return response.data;
};

export const updateWorkspaceAsAdmin = async (id, data) => {
  const response = await apiClient.put(`/admin/workspaces/${id}`, data);
  return response.data;
};

export const deleteWorkspaceAsAdmin = async (id, hardDelete = false) => {
  const response = await apiClient.delete(`/admin/workspaces/${id}?hardDelete=${hardDelete}`);
  return response.data;
};

export const restoreWorkspaceAsAdmin = async (id) => {
  const response = await apiClient.post(`/admin/workspaces/${id}/restore`);
  return response.data;
};
