import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('frontdesk_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle session expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config.url.includes('/auth/login')) {
      localStorage.removeItem('frontdesk_token');
      localStorage.removeItem('frontdesk_agent');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  demoLogin: (email, agentId) => api.post('/auth/demo-login', { email, agentId }),
  getMe: () => api.get('/auth/me'),
  getAgents: () => api.get('/auth/agents'),
};

export const ticketsAPI = {
  getDashboard: () => api.get('/tickets/dashboard'),
  getTickets: (params) => api.get('/tickets', { params }),
  getTicket: (id) => api.get(`/tickets/${id}`),
  createTicket: (data) => api.post('/tickets', data),
  assignTicket: (id, data) => api.post(`/tickets/${id}/assign`, data),
  updateStatus: (id, status, note) => api.patch(`/tickets/${id}/status`, { status, note }),
  updatePriority: (id, priority) => api.patch(`/tickets/${id}/priority`, { priority }),
  sendReply: (id, data) => api.post(`/tickets/${id}/reply`, data),
  addInternalNote: (id, content) => api.post(`/tickets/${id}/internal-notes`, { content }),
  reopenTicket: (id, reason) => api.post(`/tickets/${id}/reopen`, { reason }),
  runAutoClose: () => api.post('/tickets/run-auto-close'),
};

export const customerAPI = {
  getTicket: (ticketNumber) => api.get(`/customer/tickets/${ticketNumber}`),
  reply: (ticketNumber, content, senderName) => api.post(`/customer/tickets/${ticketNumber}/reply`, { content, senderName }),
  reopen: (ticketNumber, reason, senderName) => api.post(`/customer/tickets/${ticketNumber}/reopen`, { reason, senderName }),
};

export const holidaysAPI = {
  getHolidays: () => api.get('/holidays'),
  addHoliday: (data) => api.post('/holidays', data),
  deleteHoliday: (id) => api.delete(`/holidays/${id}`),
};

export const auditAPI = {
  getAuditLogs: (params) => api.get('/audit-logs', { params }),
};
