import apiClient from './apiClient';

export const coordinatorsApi = {
  getCoordinators: async () => {
    try {
      const response = await apiClient.get('/coordinators');
      return response.data || [];
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to fetch coordinators';
      throw new Error(msg);
    }
  },

  addCoordinator: async ({ name, email, assignedSections, initialPassword }) => {
    try {
      const response = await apiClient.post('/coordinators', {
        name,
        email,
        assignedSections,
        initialPassword,
      });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to add coordinator';
      throw new Error(msg);
    }
  },

  updateCoordinator: async (id, { name, email, assignedSections }) => {
    try {
      const response = await apiClient.put(`/coordinators/${id}`, {
        name,
        email,
        assignedSections,
      });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to update coordinator';
      throw new Error(msg);
    }
  },

  toggleCoordinatorStatus: async (id, currentStatus) => {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    try {
      const response = await apiClient.patch(`/coordinators/${id}/status`, { status: newStatus });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to update coordinator status';
      throw new Error(msg);
    }
  },

  deleteCoordinator: async (id) => {
    try {
      const response = await apiClient.delete(`/coordinators/${id}`);
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to delete coordinator';
      throw new Error(msg);
    }
  },

  resetCoordinatorPassword: async (id) => {
    try {
      const response = await apiClient.post(`/coordinators/${id}/reset-password`);
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to reset coordinator password';
      throw new Error(msg);
    }
  },

  importCoordinatorsBulk: async (validRows) => {
    try {
      const response = await apiClient.post('/coordinators/import-bulk', { coordinators: validRows });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to bulk import coordinators';
      throw new Error(msg);
    }
  },
};
