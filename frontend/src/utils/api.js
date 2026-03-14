import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('ci_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ci_token');
      localStorage.removeItem('ci_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────
export const authAPI = {
  login:         d => api.post('/auth/login', d),
  register:      d => api.post('/auth/register', d),
  forgotPassword:d => api.post('/auth/forgot-password', d),
  resetPassword: d => api.post('/auth/reset-password', d),
  me:            () => api.get('/auth/me'),
  updateProfile: d => api.put('/auth/profile', d),
};

// ── Dashboard ─────────────────────────────────────────────────
export const dashboardAPI = { get: (p) => api.get('/dashboard', { params: p }) };

// ── Products ──────────────────────────────────────────────────
export const productsAPI = {
  list:   p => api.get('/products', { params: p }),
  get:    id => api.get(`/products/${id}`),
  create: d => api.post('/products', d),
  update: (id, d) => api.put(`/products/${id}`, d),
  delete: id => api.delete(`/products/${id}`),
};

// ── Categories ────────────────────────────────────────────────
export const categoriesAPI = {
  list:   () => api.get('/categories'),
  create: d => api.post('/categories', d),
  update: (id, d) => api.put(`/categories/${id}`, d),
  delete: id => api.delete(`/categories/${id}`),
};

// ── Warehouses ────────────────────────────────────────────────
export const warehousesAPI = {
  list:   () => api.get('/warehouses'),
  create: d => api.post('/warehouses', d),
  update: (id, d) => api.put(`/warehouses/${id}`, d),
  delete: id => api.delete(`/warehouses/${id}`),
};

// ── Receipts ──────────────────────────────────────────────────
export const receiptsAPI = {
  list:     p => api.get('/receipts', { params: p }),
  get:      id => api.get(`/receipts/${id}`),
  create:   d => api.post('/receipts', d),
  update:   (id, d) => api.put(`/receipts/${id}`, d),
  advance:  id => api.post(`/receipts/${id}/advance`),
  revert:   id => api.post(`/receipts/${id}/revert`),
  cancel:   id => api.post(`/receipts/${id}/cancel`),
  validate: id => api.post(`/receipts/${id}/validate`),
  delete:   id => api.delete(`/receipts/${id}`),
};

// ── Deliveries ────────────────────────────────────────────────
export const deliveriesAPI = {
  list:     p => api.get('/deliveries', { params: p }),
  get:      id => api.get(`/deliveries/${id}`),
  create:   d => api.post('/deliveries', d),
  update:   (id, d) => api.put(`/deliveries/${id}`, d),
  confirm:  id => api.post(`/deliveries/${id}/confirm`),   // draft → waiting
  pick:     id => api.post(`/deliveries/${id}/pick`),      // waiting → picking
  pack:     id => api.post(`/deliveries/${id}/pack`),      // picking → packing
  ready:    id => api.post(`/deliveries/${id}/ready`),     // packing → ready
  revert:   id => api.post(`/deliveries/${id}/revert`),    // one step back
  cancel:   id => api.post(`/deliveries/${id}/cancel`),
  validate: id => api.post(`/deliveries/${id}/validate`),  // ready → done (manager only)
  delete:   id => api.delete(`/deliveries/${id}`),
};

// ── Transfers ─────────────────────────────────────────────────
export const transfersAPI = {
  list:     p => api.get('/transfers', { params: p }),
  get:      id => api.get(`/transfers/${id}`),
  create:   d => api.post('/transfers', d),
  update:   (id, d) => api.put(`/transfers/${id}`, d),
  advance:  id => api.post(`/transfers/${id}/advance`),
  revert:   id => api.post(`/transfers/${id}/revert`),
  cancel:   id => api.post(`/transfers/${id}/cancel`),
  validate: id => api.post(`/transfers/${id}/validate`),
  delete:   id => api.delete(`/transfers/${id}`),
};

// ── Adjustments ───────────────────────────────────────────────
export const adjustmentsAPI = {
  list:     p => api.get('/adjustments', { params: p }),
  get:      id => api.get(`/adjustments/${id}`),
  create:   d => api.post('/adjustments', d),
  validate: id => api.post(`/adjustments/${id}/validate`),
  delete:   id => api.delete(`/adjustments/${id}`),
};

// ── Move History ──────────────────────────────────────────────
export const movesAPI = { list: p => api.get('/moves', { params: p }) };

export default api;

// ── Locations (sub-locations: rack, shelf, bin) ───────────────
export const locationsAPI = {
  list:   p => api.get('/locations', { params: p }),
  create: d => api.post('/locations', d),
  update: (id, d) => api.put(`/locations/${id}`, d),
  delete: id => api.delete(`/locations/${id}`),
};

// ── User Management (admin only) ─────────────────────────────
export const usersAPI = {
  list:   () => api.get('/auth/users'),
  create: d => api.post('/auth/users', d),
  update: (id, d) => api.put(`/auth/users/${id}`, d),
};
