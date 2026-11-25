import apiClient from './apiClient';

export const reportsApi = {
  getAdminReports: async () => {
    try {
      const response = await apiClient.get('/reports/admin');
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to fetch admin reports';
      throw new Error(msg);
    }
  },
};
