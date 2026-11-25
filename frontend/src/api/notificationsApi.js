import apiClient from './apiClient';

export const notificationsApi = {
  getDeadlineNotifications: async (user) => {
    try {
      const response = await apiClient.get('/notifications/deadlines');
      return response.data || [];
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to fetch deadline notifications';
      throw new Error(msg);
    }
  },
};
