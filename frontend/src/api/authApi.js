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

  sendOtp: async ({ email, purpose = 'forgot_password' }) => {
    try {
      const response = await apiClient.post('/auth/otp/send', { email, purpose });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to send OTP';
      throw new Error(msg);
    }
  },

  verifyOtp: async ({ email, otp, purpose = 'forgot_password' }) => {
    try {
      const response = await apiClient.post('/auth/otp/verify', { email, otp, purpose });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'OTP verification failed';
      throw new Error(msg);
    }
  },

  updatePasswordWithToken: async ({ resetToken, newPassword, confirmPassword }) => {
    try {
      const response = await apiClient.post('/auth/password/update', {
        resetToken,
        newPassword,
        confirmPassword,
      });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Password update failed';
      throw new Error(msg);
    }
  },

  forgotPassword: async (email) => {
    try {
      const response = await apiClient.post('/auth/otp/send', { email, purpose: 'forgot_password' });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Password reset request failed';
      throw new Error(msg);
    }
  },

  resetPassword: async ({ resetToken, newPassword, confirmPassword }) => {
    try {
      const response = await apiClient.post('/auth/password/update', {
        resetToken,
        newPassword,
        confirmPassword,
      });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Password reset failed';
      throw new Error(msg);
    }
  },

  changePassword: async ({ resetToken, newPassword, confirmPassword }) => {
    try {
      const response = await apiClient.post('/auth/password/update', {
        resetToken,
        newPassword,
        confirmPassword,
      });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Password change failed';
      throw new Error(msg);
    }
  },

  changeEmailOnce: async ({ newEmail, currentPassword }) => {
    try {
      const response = await apiClient.post('/auth/change-email-once', {
        newEmail,
        currentPassword,
      });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to update email address';
      throw new Error(msg);
    }
  },
};
