import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { storage } from './storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://gspot.ge';
const API_V1 = `${API_BASE_URL}/api/v1`;

// Queue of requests waiting for a token refresh to complete
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  failedQueue = [];
}

// Called when refresh fails completely (user must re-login)
let onAuthFailed: (() => void) | null = null;
export function setOnAuthFailed(callback: () => void) {
  onAuthFailed = callback;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_V1,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await storage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Transparently refresh tokens on 401 and retry the original request
apiClient.interceptors.response.use(
  (response: import('axios').AxiosResponse) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Another refresh is in progress — queue this request
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          original.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(original);
        })
        .catch((err) => Promise.reject(err));
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = await storage.getRefreshToken();
      if (!refreshToken) throw new Error('No refresh token available');

      const { data } = await axios.post(`${API_V1}/auth/refresh`, { refreshToken });
      const { accessToken, refreshToken: newRefreshToken } = data as {
        accessToken: string;
        refreshToken: string;
      };

      await storage.setTokens(accessToken, newRefreshToken);
      original.headers.Authorization = `Bearer ${accessToken}`;
      processQueue(null, accessToken);
      return apiClient(original);
    } catch (refreshError) {
      processQueue(refreshError, null);
      await storage.clear();
      onAuthFailed?.();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);
