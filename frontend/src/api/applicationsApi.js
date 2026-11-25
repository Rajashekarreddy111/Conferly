import apiClient from './apiClient';

export const applicationsApi = {
  getApplications: async () => {
    try {
      const response = await apiClient.get('/applications');
      return response.data || [];
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to fetch applications';
      throw new Error(msg);
    }
  },

  getStudentApplications: async (studentId, rollNumber) => {
    try {
      const target = studentId || rollNumber;
      if (!target) return [];
      const response = await apiClient.get(`/students/${target}/applications`);
      return response.data || [];
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to fetch student applications';
      throw new Error(msg);
    }
  },

  uploadScreenshotProof: async (file) => {
    try {
      const formData = new FormData();
      formData.append('proof', file);
      const response = await apiClient.post('/upload/screenshot', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to upload screenshot proof';
      throw new Error(msg);
    }
  },

  submitApplicationProof: async ({ conferenceId, student, proofFile }) => {
    const uploadResult = await applicationsApi.uploadScreenshotProof(proofFile);
    if (!uploadResult || !uploadResult.fileUrl) {
      throw new Error('Screenshot proof upload failed. Application has NOT been marked as applied.');
    }

    try {
      const response = await apiClient.post('/applications/submit', {
        conferenceId,
        studentId: student?.id,
        rollNumber: student?.rollNumber,
        studentName: student?.name,
        section: student?.section,
        screenshotProof: uploadResult.fileUrl,
        proofFileName: uploadResult.fileName,
      });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to submit application proof';
      throw new Error(msg);
    }
  },

  /**
   * Coordinator / Admin Conference Tracking Details
   */
  getConferenceTrackingDetails: async (conferenceId) => {
    try {
      const response = await apiClient.get(`/conferences/${conferenceId}/tracking`);
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to fetch conference tracking details';
      throw new Error(msg);
    }
  },

  /**
   * Search student tracking details
   */
  getStudentTrackingDetails: async (searchQuery) => {
    try {
      const response = await apiClient.get('/tracking/student', { params: { q: searchQuery } });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to fetch student tracking';
      throw new Error(msg);
    }
  },
};
