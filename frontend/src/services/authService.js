import api from './api';

export const authService = {
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  async register(userData) {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  async getMe() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  async getUsers(params) {
    const response = await api.get('/users', { params });
    return response.data;
  },

  async updateUser(userId, data) {
    const response = await api.patch(`/users/${userId}`, data);
    return response.data;
  },
};
