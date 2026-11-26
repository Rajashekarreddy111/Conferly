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

  checkDuplicate: async ({ fullName, shortName, applicationLink, venue, dates, excludeId = null }) => {
    try {
      const response = await apiClient.post('/conferences/check-duplicate', {
        fullName,
        shortName,
        applicationLink,
        venue,
        dates,
        excludeId,
      });
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
    venue = null,
    dates = null,
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
        venue,
        dates,
      });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to create conference';
      throw new Error(msg);
    }
  },

  updateConference: async (id, { fullName, shortName, applicationLink, deadline, scope, targetSections, venue, dates }) => {
    const cleanDeadline = normalizeDateInput(deadline);

    try {
      const response = await apiClient.put(`/conferences/${id}`, {
        fullName,
        shortName,
        applicationLink,
        deadline: cleanDeadline,
        scope,
        targetSections,
        venue,
        dates,
      });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to update conference';
      throw new Error(msg);
    }
  },

  deleteConference: async (id) => {
    try {
      const response = await apiClient.delete(`/conferences/${id}`);
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to delete or unlink conference';
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

  getSuggestions: async () => {
    try {
      const response = await apiClient.get('/conferences/suggestions');
      return response.data || [];
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to fetch conference suggestions';
      throw new Error(msg);
    }
  },

  acceptSuggestion: async (id) => {
    try {
      const response = await apiClient.post(`/conferences/${id}/accept`);
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to accept conference suggestion';
      throw new Error(msg);
    }
  },

  declineSuggestion: async (id) => {
    try {
      const response = await apiClient.post(`/conferences/${id}/decline`);
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to decline conference suggestion';
      throw new Error(msg);
    }
  },

  batchSuggestionAction: async (action, conferenceIds) => {
    try {
      const response = await apiClient.post('/conferences/suggestions/batch', {
        action,
        conferenceIds,
      });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to process batch suggestion action';
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
