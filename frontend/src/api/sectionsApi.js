import apiClient from './apiClient';

export const sectionsApi = {
  getSections: async () => {
    try {
      const response = await apiClient.get('/sections');
      return response.data || [];
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to fetch sections';
      throw new Error(msg);
    }
  },

  addSection: async ({ academicYear, sectionName }) => {
    try {
      const response = await apiClient.post('/sections', { academicYear, sectionName });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to add section';
      throw new Error(msg);
    }
  },

  updateSection: async (id, { academicYear, sectionName }) => {
    try {
      const response = await apiClient.put(`/sections/${id}`, { academicYear, sectionName });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to update section';
      throw new Error(msg);
    }
  },

  deactivateSection: async (id) => {
    try {
      const response = await apiClient.patch(`/sections/${id}/deactivate`);
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to deactivate section';
      throw new Error(msg);
    }
  },

  reactivateSection: async (id) => {
    try {
      const response = await apiClient.patch(`/sections/${id}/reactivate`);
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to reactivate section';
      throw new Error(msg);
    }
  },

  /**
   * Permanent Section Deletion (Cascade delete associated students as explicitly requested)
   */
  deleteSectionCascade: async (id) => {
    try {
      const response = await apiClient.delete(`/sections/${id}?cascade=true`);
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to delete section';
      throw new Error(msg);
    }
  },

  bulkDeactivate: async (ids) => {
    try {
      const response = await apiClient.post('/sections/bulk-deactivate', { ids });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to bulk deactivate sections';
      throw new Error(msg);
    }
  },

  getSectionStudents: async (sectionName) => {
    try {
      const response = await apiClient.get(`/sections/${encodeURIComponent(sectionName)}/students`);
      return response.data || [];
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to fetch section students';
      throw new Error(msg);
    }
  },

  getSectionCoordinators: async (sectionName) => {
    try {
      const response = await apiClient.get(`/sections/${encodeURIComponent(sectionName)}/coordinators`);
      return response.data || [];
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to fetch section coordinators';
      throw new Error(msg);
    }
  },

  // ACADEMIC YEARS
  getAcademicYears: async () => {
    try {
      const response = await apiClient.get('/academic-years');
      return response.data || [];
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to fetch academic years';
      throw new Error(msg);
    }
  },

  addAcademicYear: async (yearString) => {
    const cleanYear = String(yearString || '').trim();
    if (!cleanYear) {
      throw new Error('Academic Year string cannot be blank.');
    }
    if (!/^\d{4}-\d{4}$/.test(cleanYear)) {
      throw new Error('Academic Year must follow the format YYYY-YYYY (e.g. 2026-2027).');
    }

    try {
      const response = await apiClient.post('/academic-years', { year: cleanYear });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to add academic year';
      throw new Error(msg);
    }
  },

  toggleAcademicYearStatus: async (yearName, newStatus) => {
    try {
      const response = await apiClient.patch(`/academic-years/${encodeURIComponent(yearName)}/status`, {
        status: newStatus,
      });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to toggle academic year status';
      throw new Error(msg);
    }
  },

  deleteAcademicYear: async (yearName) => {
    try {
      const response = await apiClient.delete(`/academic-years/${encodeURIComponent(yearName)}`);
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to delete academic year';
      throw new Error(msg);
    }
  },
};
