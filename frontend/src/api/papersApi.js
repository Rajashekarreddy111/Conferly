import apiClient from './apiClient';

export const papersApi = {
  /**
   * Fetches the current logged-in student's base paper.
   */
  getMyPaper: async () => {
    try {
      const response = await apiClient.get('/papers/my-paper');
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to fetch base paper title';
      throw new Error(msg);
    }
  },

  /**
   * Submits or creates a student's base paper title.
   */
  submitMyPaper: async (title) => {
    try {
      const response = await apiClient.post('/papers/my-paper', { title });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to submit base paper title';
      throw new Error(msg);
    }
  },

  /**
   * Updates an existing base paper title.
   */
  updateMyPaper: async (title) => {
    try {
      const response = await apiClient.put('/papers/my-paper', { title });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to update base paper title';
      throw new Error(msg);
    }
  },

  /**
   * Fetches paper tracking overview for coordinators and admins.
   */
  getPaperTracking: async ({
    section = 'all',
    academicYear = 'all',
    status = 'all',
    search = '',
    page = 1,
    limit = 10,
  } = {}) => {
    try {
      const params = new URLSearchParams();
      if (section && section !== 'all') params.append('section', section);
      if (academicYear && academicYear !== 'all') params.append('academicYear', academicYear);
      if (status && status !== 'all') params.append('status', status);
      if (search && search.trim()) params.append('q', search.trim());
      params.append('page', String(page));
      params.append('limit', String(limit));

      const response = await apiClient.get(`/papers/tracking?${params.toString()}`);
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to fetch paper tracking data';
      throw new Error(msg);
    }
  },

  /**
   * Finds related papers by keyword extraction and matching within user scope.
   */
  findRelatedPapers: async (title) => {
    try {
      const response = await apiClient.post('/papers/find-related', { title });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to search related papers';
      throw new Error(msg);
    }
  },
};
