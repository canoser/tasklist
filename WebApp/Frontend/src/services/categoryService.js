import apiClient from './apiClient';

export const categoryService = {
  getAll: async () => {
    const response = await apiClient.get('/categories');
    return response.data;
  },

  create: async (categoryData) => {
    const response = await apiClient.post('/categories', categoryData);
    return response.data;
  },

  update: async (id, data) => {
    const response = await apiClient.put(`/categories/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/categories/${id}`);
    return response.data;
  },

  getRoots: async () => {
    const response = await apiClient.get('/categories/roots');
    return response.data;
  },

  getChildren: async (parentId) => {
    const response = await apiClient.get(`/categories/${parentId}/children`);
    return response.data;
  }
};
