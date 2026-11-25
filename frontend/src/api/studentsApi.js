import apiClient from './apiClient';

export const studentsApi = {
  getStudents: async (userRole = 'admin', userAssignedSections = []) => {
    try {
      const response = await apiClient.get('/students');
      let students = response.data || [];
      if ((userRole === 'coordinator' || userRole === 'mentor') && userAssignedSections && userAssignedSections.length > 0) {
        students = students.filter((s) => userAssignedSections.includes(s.section));
      }
      return students;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to fetch students';
      throw new Error(msg);
    }
  },

  addStudent: async ({ rollNumber, name, email, phoneNumber, academicYear, section, initialPassword }) => {
    try {
      const response = await apiClient.post('/students', {
        rollNumber,
        name,
        email,
        phoneNumber,
        academicYear,
        section,
        initialPassword,
      });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to add student';
      throw new Error(msg);
    }
  },

  updateStudent: async (id, { rollNumber, name, email, phoneNumber, academicYear, section }) => {
    try {
      const response = await apiClient.put(`/students/${id}`, {
        rollNumber,
        name,
        email,
        phoneNumber,
        academicYear,
        section,
      });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to update student';
      throw new Error(msg);
    }
  },

  toggleStudentStatus: async (id, currentStatus) => {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    try {
      const response = await apiClient.patch(`/students/${id}/status`, { status: newStatus });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to update student status';
      throw new Error(msg);
    }
  },

  /**
   * Permanent Student Deletion
   */
  deleteStudent: async (id, userRole = 'admin', coordinatorSections = []) => {
    try {
      const response = await apiClient.delete(`/students/${id}`);
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to delete student';
      throw new Error(msg);
    }
  },

  resetStudentPassword: async (id) => {
    try {
      const response = await apiClient.post(`/students/${id}/reset-password`);
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to reset student password';
      throw new Error(msg);
    }
  },

  importStudentsBulk: async (validRows) => {
    try {
      const response = await apiClient.post('/students/import-bulk', { students: validRows });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to bulk import students';
      throw new Error(msg);
    }
  },
};
