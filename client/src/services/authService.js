import api from './api';

export const checkEmail = (email) => api.post('/auth/check-email', { email });
export const register = (data) => api.post('/auth/register', data);
export const login = (data) => api.post('/auth/login', data);
export const githubCompleteEmail = (data) => api.post('/auth/github/complete-email', data);
export const getMe = () => api.get('/auth/me');

export const sendOtp = () => api.post('/otp/send');
export const verifyOtp = (otp) => api.post('/otp/verify', { otp });
export const resendOtp = () => api.post('/otp/resend');

export const createOrg = (name) => api.post('/org/create', { name });
export const joinOrg = (code) => api.post('/org/join', { code });
export const listOrgs = () => api.get('/org/list');
export const selectOrg = (organizationId) => api.post('/org/select', { organizationId });
export const getOrg = (id) => api.get(`/org/${id}`);

export const getTasks = () => api.get('/tasks');
export const createTask = (data) => api.post('/tasks', data);
export const updateTask = (id, data) => api.put(`/tasks/${id}`, data);
export const deleteTask = (id) => api.delete(`/tasks/${id}`);
