import apiClient from './apiClient';
import { normalizeDateInput } from '../utils/dateUtils';

export const normalizeStr = (str) => String(str || '').trim().toLowerCase();

export const conferencesApi = {
  getConferences: async (userRole = 'admin', userAssignedSections = []) => {
    try {
      const response = await apiClient.get('/conferences');
      let list = response.data || [];
      if ((userRole === 'coordinator' || userRole === 'mentor') && userAssignedSections && userAssignedSections.length > 0) {
        list = list.filter(
          (c) => c.scope === 'global' || (c.targetSections && c.targetSections.some((sec) => userAssignedSections.includes(sec)))
        );
      }
      return list;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to fetch conferences';
      throw new Error(msg);
    }
  },

  checkDuplicate: async ({ fullName, shortName, excludeId = null }) => {
    try {
      const response = await apiClient.post('/conferences/check-duplicate', { fullName, shortName, excludeId });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Duplicate check failed';
      throw new Error(msg);
    }
  },

  createConference: async ({
    fullName,
    shortName,
    applicationLink,
    deadline, // YYYY-MM-DD
    scope = 'global',
    targetSections = [],
    creatorName = 'Admin',
    creatorRole = 'admin',
  }) => {
    const cleanDeadline = normalizeDateInput(deadline);

    try {
      const response = await apiClient.post('/conferences', {
        fullName,
        shortName,
        applicationLink,
        deadline: cleanDeadline,
        scope,
        targetSections,
        creatorName,
        creatorRole,
      });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to create conference';
      throw new Error(msg);
    }
  },

  updateConference: async (id, { fullName, shortName, applicationLink, deadline, scope, targetSections }) => {
    const cleanDeadline = normalizeDateInput(deadline);

    try {
      const response = await apiClient.put(`/conferences/${id}`, {
        fullName,
        shortName,
        applicationLink,
        deadline: cleanDeadline,
        scope,
        targetSections,
      });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to update conference';
      throw new Error(msg);
    }
  },

  archiveConference: async (id) => {
    try {
      const response = await apiClient.patch(`/conferences/${id}/archive`);
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to archive conference';
      throw new Error(msg);
    }
  },

  importConferencesBulk: async (validRows, creatorName = 'Admin', creatorRole = 'admin') => {
    try {
      const response = await apiClient.post('/conferences/import-bulk', { conferences: validRows });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to import conferences';
      throw new Error(msg);
    }
  },
};
