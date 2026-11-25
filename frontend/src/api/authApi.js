import apiClient from './apiClient';

export const authApi = {
  login: async ({ identifier, password, role }) => {
    const normRole = (role || '').trim().toLowerCase();
    const cleanId = String(identifier || '').trim();
    const cleanPwd = String(password || '').trim();

    try {
      const response = await apiClient.post('/auth/login', {
        identifier: cleanId,
        password: cleanPwd,
        role: normRole === 'mentor' ? 'coordinator' : normRole,
      });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Login failed';
      throw new Error(msg);
    }
  },

  forgotPassword: async (email) => {
    try {
      const response = await apiClient.post('/auth/forgot-password', { email });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Password reset request failed';
      throw new Error(msg);
    }
  },

  resetPassword: async ({ token, newPassword }) => {
    try {
      const response = await apiClient.post('/auth/reset-password', { token, newPassword });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Password reset failed';
      throw new Error(msg);
    }
  },

  changePassword: async ({ currentPassword, newPassword }) => {
    try {
      const response = await apiClient.post('/auth/change-password', { currentPassword, newPassword });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Password change failed';
      throw new Error(msg);
    }
  },
};
