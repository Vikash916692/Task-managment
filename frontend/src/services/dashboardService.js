import api from './api';

export const commentService = {
  async getComments(taskId) {
    const response = await api.get(`/tasks/${taskId}/comments`);
    return response.data;
  },

  async addComment(taskId, content) {
    const response = await api.post(`/tasks/${taskId}/comments`, { content });
    return response.data;
  },

  async deleteComment(taskId, commentId) {
    const response = await api.delete(`/tasks/${taskId}/comments/${commentId}`);
    return response.data;
  },
};

export const notificationService = {
  async getNotifications(params) {
    const response = await api.get('/notifications', { params });
    return response.data;
  },

  async getUnreadCount() {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  },

  async markAsRead(id) {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  },

  async markAllAsRead() {
    const response = await api.post('/notifications/read-all');
    return response.data;
  },
};

export const dashboardService = {
  async getStats() {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },
};
