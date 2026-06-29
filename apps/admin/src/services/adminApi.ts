import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('shinra_admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: unknown) => void; reject: (e: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => error ? reject(error) : resolve(token));
  failedQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }
    const refreshToken = localStorage.getItem('shinra_admin_refresh');
    if (!refreshToken) {
      localStorage.removeItem('shinra_admin_token');
      window.location.href = '/login';
      return Promise.reject(error);
    }
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }
    original._retry = true;
    isRefreshing = true;
    try {
      const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
      const { accessToken, refreshToken: newRefresh } = res.data.data;
      localStorage.setItem('shinra_admin_token', accessToken);
      if (newRefresh) localStorage.setItem('shinra_admin_refresh', newRefresh);
      processQueue(null, accessToken);
      original.headers.Authorization = `Bearer ${accessToken}`;
      return api(original);
    } catch (refreshError) {
      processQueue(refreshError, null);
      localStorage.removeItem('shinra_admin_token');
      localStorage.removeItem('shinra_admin_refresh');
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export const adminApi = {
  // Auth
  login: async (email: string, password: string, rememberMe = false) => {
    const res = await api.post('/auth/login', { email, password, rememberMe });
    return res.data;
  },

  // Dashboard
  getDashboardStats: async () => {
    const res = await api.get('/admin/stats');
    return res.data?.data ?? null;
  },
  getActivityData: async () => {
    const res = await api.get('/admin/activity');
    return res.data?.data ?? null;
  },

  // Users
  getUsers: async (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params)}` : '';
    const res = await api.get(`/admin/users${q}`);
    return res.data;
  },
  updateUser: async (userId: string, data: Record<string, unknown>) =>
    api.patch(`/admin/users/${userId}`, data),
  deleteUser: async (userId: string) =>
    api.delete(`/admin/users/${userId}`),
  banUser: async (userId: string, reason: string) =>
    api.post(`/admin/users/${userId}/ban`, { reason }),
  unbanUser: async (userId: string) =>
    api.post(`/admin/users/${userId}/unban`),
  grantPremium: async (userId: string, _days: number) =>
    api.post(`/admin/users/${userId}/grant-premium`),
  revokePremium: async (userId: string) =>
    api.patch(`/admin/users/${userId}`, { isPremium: false, role: 'USER' }),
  setRole: async (userId: string, role: string) =>
    api.patch(`/admin/users/${userId}`, { role }),

  // Matches
  getMatches: async (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params)}` : '';
    const res = await api.get(`/matches${q}`);
    return res.data;
  },
  updateMatchScore: async (matchId: string, data: { homeScore: number; awayScore: number; status: string }) =>
    api.post(`/admin/matches/${matchId}/update-score`, data),
  startMatch: async (matchId: string) =>
    api.post(`/admin/matches/${matchId}/start`),
  finishMatch: async (matchId: string) =>
    api.post(`/admin/matches/${matchId}/finish`),

  // Teams
  getTeams: async () => {
    const res = await api.get('/teams');
    return res.data;
  },

  // Predictions
  getPredictions: async (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params)}` : '';
    const res = await api.get(`/admin/predictions${q}`);
    return res.data;
  },
  resolvePredictions: async (matchId: string) =>
    api.post(`/admin/predictions/resolve/${matchId}`),

  // Notifications
  sendNotification: async (data: { title: string; body: string; type: string; target: string }) =>
    api.post('/notifications/broadcast', data),
  getNotifications: async () => {
    const res = await api.get('/admin/notifications');
    return res.data;
  },

  // News
  getNews: async () => {
    const res = await api.get('/news?limit=50');
    return res.data;
  },
  createNews: async (data: Record<string, unknown>) => api.post('/news', data),
  updateNews: async (id: string, data: Record<string, unknown>) => api.patch(`/news/${id}`, data),
  deleteNews: async (id: string) => api.delete(`/news/${id}`),
  publishNews: async (id: string) => api.patch(`/news/${id}/publish`),

  // Ads
  getAds: async () => {
    const res = await api.get('/admin/ads');
    return res.data;
  },
  createAd: async (data: Record<string, unknown>) => api.post('/admin/ads', data),
  toggleAd: async (id: string, isActive: boolean) =>
    api.patch(`/admin/ads/${id}`, { isActive }),

  // Settings
  getAppConfig: async () => {
    const res = await api.get('/admin/config');
    return res.data;
  },
  updateAppConfig: async (key: string, value: unknown) =>
    api.patch(`/admin/config/${key}`, { value }),
};
