import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { store } from '../store';
import { clearAuth, setTokens } from '../store/slices/authSlice';
import { logger } from '../utils/logger';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export const apiService: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-App-Version': '1.0.0',
    'X-Platform': 'mobile',
    'Bypass-Tunnel-Reminder': 'true',
  },
});

// Request interceptor â€” attach access token
apiService.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = store.getState().auth.accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: any) => void; reject: (reason?: any) => void }> = [];

function processQueue(error: Error | null, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
}

// Response interceptor â€” handle 401 with token refresh
apiService.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiService(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = store.getState().auth.refreshToken;

      if (!refreshToken) {
        store.dispatch(clearAuth());
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = response.data.data;
        store.dispatch(setTokens({ accessToken, refreshToken: newRefreshToken }));
        processQueue(null, accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiService(originalRequest);
      } catch (err) {
        processQueue(err as Error, null);
        store.dispatch(clearAuth());
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const createWebSocketConnection = (matchId: string) => {
  const { io } = require('socket.io-client');
  const WS_URL = process.env.EXPO_PUBLIC_WS_URL ?? 'http://localhost:4000';
  const token = store.getState().auth.accessToken;

  const socket = io(`${WS_URL}/matches`, {
    auth: { token },
    transports: ['websocket'],
    query: { matchId },
  });

  return socket;
};

