import apiClient, { clearTokens, setTokens } from './client';
import type { AuthUser, UserRole } from '@/types/auth';

export type LoginPayload = { email: string; password: string; otp?: string };
export type RegisterPayload = LoginPayload & {
  full_name: string;
  phone?: string;
  role?: UserRole;
  specialty?: string;
};

export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type?: string;
};

export async function login(payload: LoginPayload): Promise<TokenPair> {
  const { data } = await apiClient.post<TokenPair>('/v1/auth/login', payload);
  setTokens(data.access_token, data.refresh_token);
  return data;
}

export async function register(payload: RegisterPayload) {
  const { data } = await apiClient.post('/v1/auth/register', payload);
  return data;
}

export async function refresh(refresh_token: string): Promise<TokenPair> {
  const { data } = await apiClient.post<TokenPair>('/v1/auth/refresh', { refresh_token });
  setTokens(data.access_token, data.refresh_token);
  return data;
}

export async function logoutApi() {
  const refresh_token = localStorage.getItem('refresh_token');
  try {
    if (refresh_token) {
      await apiClient.post('/v1/auth/logout', { refresh_token });
    }
  } finally {
    clearTokens();
  }
}

export async function fetchMe(): Promise<NonNullable<AuthUser>> {
  const { data } = await apiClient.get('/v1/auth/me');
  return data as NonNullable<AuthUser>;
}

export async function forgotPassword(email: string) {
  const { data } = await apiClient.post('/v1/auth/forgot-password', { email });
  return data as { message: string; dev_token?: string };
}

export async function resetPassword(token: string, new_password: string) {
  const { data } = await apiClient.post('/v1/auth/reset-password', { token, new_password });
  return data;
}

export async function verifyEmail(token: string) {
  const { data } = await apiClient.post('/v1/auth/verify-email', { token });
  return data;
}
