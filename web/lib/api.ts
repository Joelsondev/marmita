import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      const path = window.location.pathname;
      const isClientArea = path.startsWith('/cliente') || path.startsWith('/login') || path.startsWith('/cadastro');
      window.location.href = isClientArea ? '/login' : '/admin/login';
    }
    return Promise.reject(err);
  },
);

// Auth
export const loginAdmin = (email: string, password: string) =>
  api.post('/auth/admin/login', { email, password }).then((r) => r.data);

export const loginClient = (cpf: string, tenantId: string) =>
  api.post('/auth/client/login', { cpf, tenantId }).then((r) => r.data);

export const getClientTenants = (cpf: string) =>
  api.get('/auth/client/tenants', { params: { cpf } }).then((r) => r.data);

export const selfRegisterCustomer = (data: { registrationLinkCode: string; name: string; cpf: string; phone: string }) =>
  api.post('/auth/client/register', data).then((r) => r.data);

export const registerTenant = (data: any) =>
  api.post('/auth/register', data).then((r) => r.data);

// Tenants
export const getTenantBySlug = (slug: string) =>
  api.get(`/tenants/slug/${slug}`).then((r) => r.data);

export const getTenantMe = () =>
  api.get('/tenants/me').then((r) => r.data);

// Customers
export const getMe = () => api.get('/customers/me').then((r) => r.data);
export const getCustomers = () => api.get('/customers').then((r) => r.data);
export const getCustomer = (id: string) => api.get(`/customers/${id}`).then((r) => r.data);
export const getCustomerByCpf = (cpf: string) => api.get(`/customers/cpf/${cpf}`).then((r) => r.data);
export const createCustomer = (data: any) => api.post('/customers', data).then((r) => r.data);
export const updateCustomer = (id: string, data: any) => api.put(`/customers/${id}`, data).then((r) => r.data);

export const unblockCustomer = (id: string) =>
  api.patch(`/customers/${id}/unblock`).then((r) => r.data);

export const getBlockedCustomers = () =>
  api.get('/customers?blocked=true').then((r) => r.data);

// Wallet
export const addCredit = (customerId: string, data: any) =>
  api.post(`/wallet/${customerId}/credit`, data).then((r) => r.data);
export const getAdminTransactions = (customerId: string) =>
  api.get(`/wallet/${customerId}/transactions`).then((r) => r.data);
export const getTransactions = () =>
  api.get('/customers/me/transactions').then((r) => r.data);

// Meals
export const getMeals = (date?: string) =>
  api.get('/meals', { params: date ? { date } : {} }).then((r) => r.data);
export const getTodayMeals = () => api.get('/meals/today').then((r) => r.data);
export const getMeal = (id: string) => api.get(`/meals/${id}`).then((r) => r.data);
export const createMeal = (data: any) => api.post('/meals', data).then((r) => r.data);
export const updateMeal = (id: string, data: any) => api.put(`/meals/${id}`, data).then((r) => r.data);
export const deleteMeal = (id: string) => api.delete(`/meals/${id}`).then((r) => r.data);
export const copyMeal = (id: string, targetDate: string) =>
  api.post(`/meals/${id}/copy`, { targetDate }).then((r) => r.data);

// Option Groups
export const createOptionGroup = (data: any) => api.post('/option-groups', data).then((r) => r.data);
export const deleteOptionGroup = (id: string) => api.delete(`/option-groups/${id}`).then((r) => r.data);

// Options
export const createOption = (data: any) => api.post('/options', data).then((r) => r.data);
export const deleteOption = (id: string) => api.delete(`/options/${id}`).then((r) => r.data);

// Orders
export const getDashboard = () => api.get('/orders/dashboard').then((r) => r.data);
export const getOrders = (date?: string) =>
  api.get('/orders', { params: date ? { date } : {} }).then((r) => r.data);
export const getOrder = (id: string) => api.get(`/orders/${id}`).then((r) => r.data);
export const createOrder = (data: any) => api.post('/orders', data).then((r) => r.data);
export const confirmPickup = (id: string) => api.post(`/orders/${id}/pickup`).then((r) => r.data);
export const approveOrder = (id: string) => api.post(`/orders/${id}/approve`).then((r) => r.data);
export const cancelOrder = (id: string) => api.post(`/orders/${id}/cancel`).then((r) => r.data);
export const confirmPickupByCpf = (cpf: string) =>
  api.post('/orders/pickup/cpf', { cpf }).then((r) => r.data);
export const getMyOrders = () => api.get('/orders/my').then((r) => r.data);
export const lookupCheckout = (params: { cpf?: string; customerId?: string; qrToken?: string }) =>
  api.get('/orders/lookup', { params }).then((r) => r.data);

// Registration Links
export const createRegistrationLink = () =>
  api.post('/registration-links').then((r) => r.data);

export const getRegistrationLinks = () =>
  api.get('/registration-links').then((r) => r.data);

export const validateRegistrationCode = (code: string) =>
  api.get(`/registration-links/validate/${code}`).then((r) => r.data);
export const getDiscountRule = () => api.get('/discounts/rule').then((r) => r.data);
export const upsertDiscountRule = (data: any) => api.put('/discounts/rule', data).then((r) => r.data);

// Subscription
export const getSubscription = () => api.get('/subscription').then((r) => r.data);
export const activateSubscription = (plan: 'monthly' | 'quarterly' | 'annual') =>
  api.post('/subscription/activate', { plan }).then((r) => r.data);

// Audit Logs
export const getAuditLogs = (params?: { action?: string; dateFrom?: string; dateTo?: string; limit?: number; offset?: number }) =>
  api.get('/audit-logs', { params }).then((r) => r.data);

// Super Admin
export const loginSuperAdmin = (email: string, password: string) =>
  api.post('/superadmin/login', { email, password }).then((r) => r.data);
export const getSuperAdminTenants = () =>
  api.get('/superadmin/tenants').then((r) => r.data);

export const updateTenantSubscription = (tenantId: string, data: { plan: string; status: string; durationDays?: number }) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('sa_token') : null;
  return fetch(`${API_URL}/superadmin/tenants/${tenantId}/subscription`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  }).then((r) => {
    if (!r.ok) throw new Error('Erro ao salvar');
    return r.json();
  });
};
