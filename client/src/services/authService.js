import api from './api';

export const checkEmail = (email) => api.post('/auth/check-email', { email });
export const register = (data) => api.post('/auth/register', data);
export const login = (data) => api.post('/auth/login', data);
export const githubCompleteEmail = (data) => api.post('/auth/github/complete-email', data);
export const getMe = () => api.get('/auth/me');
export const updateProfile = (data) => api.put('/auth/profile', data);
export const changePassword = (data) => api.put('/auth/password', data);

export const sendOtp = () => api.post('/otp/send');
export const verifyOtp = (otp) => api.post('/otp/verify', { otp });
export const resendOtp = () => api.post('/otp/resend');

export const createOrg = (name, roleTitle) => api.post('/org/create', { name, roleTitle });
export const joinOrg = (code, roleTitle) => api.post('/org/join', { code, roleTitle });
export const listOrgs = () => api.get('/org/list');
export const selectOrg = (organizationId) => api.post('/org/select', { organizationId });
export const getOrg = (id) => api.get(`/org/${id}`);
export const getOrgMembers = () => api.get('/org/members');
export const updateRoleTitle = (roleTitle) => api.put('/org/role', { roleTitle });

export const getTasks = () => api.get('/tasks');
export const createTask = (data) => api.post('/tasks', data);
export const updateTask = (id, data) => api.put(`/tasks/${id}`, data);
export const deleteTask = (id) => api.delete(`/tasks/${id}`);
