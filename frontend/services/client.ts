import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

/** Axios client — baseURL `/api` so Vite :8905 proxies to FastAPI :8000 (D1/D8). */
export const apiClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

const AUTH_ACCESS = 'access_token';
const AUTH_REFRESH = 'refresh_token';

export function getAccessToken(): string | null {
  return localStorage.getItem(AUTH_ACCESS);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(AUTH_REFRESH);
}

export function setTokens(access: string | null, refresh?: string | null) {
  if (access) localStorage.setItem(AUTH_ACCESS, access);
  else localStorage.removeItem(AUTH_ACCESS);
  if (refresh !== undefined) {
    if (refresh) localStorage.setItem(AUTH_REFRESH, refresh);
    else localStorage.removeItem(AUTH_REFRESH);
  }
}

export function clearTokens() {
  localStorage.removeItem(AUTH_ACCESS);
  localStorage.removeItem(AUTH_REFRESH);
}

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  // Use bare axios to avoid interceptor recursion
  const { data } = await axios.post('/api/v1/auth/refresh', { refresh_token: refresh });
  const access = data.access_token as string;
  const nextRefresh = (data.refresh_token as string | undefined) ?? refresh;
  setTokens(access, nextRefresh);
  return access;
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (!original || error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }
    // Do not try refresh on auth endpoints
    if (original.url?.includes('/v1/auth/login') || original.url?.includes('/v1/auth/refresh')) {
      return Promise.reject(error);
    }
    original._retry = true;
    try {
      refreshPromise = refreshPromise ?? refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
      const access = await refreshPromise;
      if (!access) {
        clearTokens();
        return Promise.reject(error);
      }
      original.headers.Authorization = `Bearer ${access}`;
      return apiClient(original);
    } catch (refreshErr) {
      clearTokens();
      return Promise.reject(refreshErr);
    }
  },
);

export default apiClient;
