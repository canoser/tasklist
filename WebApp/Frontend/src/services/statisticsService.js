import apiClient from './apiClient';

export const statisticsService = {
  /**
   * Get statistics for a specific user.
   * If the requester is an observer (teacher/parent), the backend will filter tasks based on shared workspaces.
   * @param {string} userId - The target user's ID
   */
  getUserStatistics: async (userId) => {
    try {
      const response = await apiClient.get(`/statistics/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
      throw error;
    }
  }
};

export default statisticsService;
