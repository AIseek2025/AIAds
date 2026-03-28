import axios, { AxiosError, AxiosHeaders } from 'axios';
import { getApiErrorMessage } from '../utils/apiError';
import { isAuthRefreshPath, isPublicAuthRequestPath } from '../utils/authRequestPaths';
import { redirectToAppLogin } from '../utils/redirectOnUnauthorized';
import { clearCsrfToken, ensureCsrfToken, getApiBaseUrlForCsrf } from './csrf';
import type { ApiResponse, LoginData, RegisterData, ForgotPasswordData } from '../types';
import type { AuthResponse, User } from '../types';

/** 后端 TokenResponse 为 snake_case，统一为前端 AuthTokens */
function mapAuthResponseData(raw: unknown): AuthResponse {
  if (!raw || typeof raw !== 'object') {
    throw new Error('认证接口返回数据无效');
  }
  const d = raw as {
    user: User;
    tokens: {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      accessToken?: string;
      refreshToken?: string;
      expiresIn?: number;
    };
  };
  const t = d.tokens;
  return {
    user: d.user,
    tokens: {
      accessToken: String(t.accessToken ?? t.access_token ?? ''),
      refreshToken: String(t.refreshToken ?? t.refresh_token ?? ''),
      expiresIn: Number(t.expiresIn ?? t.expires_in ?? 0),
    },
  };
}

// API base URL from environment or default（与 csrf.ts 同源）
const API_BASE_URL = getApiBaseUrlForCsrf();

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor：CSRF（POST/PUT/PATCH/DELETE）+ JWT
api.interceptors.request.use(
  async (config) => {
    const method = (config.method || 'get').toLowerCase();
    const url = config.url || '';
    if (['post', 'put', 'patch', 'delete'].includes(method) && !url.includes('csrf-token')) {
      const csrf = await ensureCsrfToken();
      const headers = AxiosHeaders.from(config.headers ?? {});
      headers.set('X-CSRF-Token', csrf);
      config.headers = headers;
    }
    const token = localStorage.getItem('accessToken');
    if (token) {
      const headers = AxiosHeaders.from(config.headers ?? {});
      headers.set('Authorization', `Bearer ${token}`);
      config.headers = headers;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor：401 时优先 refresh 并重试（与 adminApi 一致）；登录/注册等公开认证接口不刷新
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse>) => {
    const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
    const status = error.response?.status;

    if (status === 403) {
      const errBody = error.response?.data as ApiResponse | undefined;
      if (errBody?.error?.code === 'CSRF_TOKEN_INVALID') {
        clearCsrfToken();
      }
    }

    const logAndReject = () => {
      const errorMessage = getApiErrorMessage(error, '请求失败，请稍后重试');
      console.error('API Error:', errorMessage);
      return Promise.reject(error);
    };

    if (status !== 401 || !originalRequest) {
      return logAndReject();
    }

    const reqUrl = originalRequest.url || '';

    if (isPublicAuthRequestPath(reqUrl)) {
      return logAndReject();
    }

    if (isAuthRefreshPath(reqUrl)) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      redirectToAppLogin();
      return logAndReject();
    }

    if (originalRequest._retry) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      redirectToAppLogin();
      return logAndReject();
    }

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      localStorage.removeItem('accessToken');
      redirectToAppLogin();
      return logAndReject();
    }

    originalRequest._retry = true;
    try {
      const csrf = await ensureCsrfToken();
      const { data } = await axios.post<
        ApiResponse<{ access_token: string; refresh_token: string; expires_in: number }>
      >(
        `${API_BASE_URL}/auth/refresh`,
        { refresh_token: refreshToken },
        {
          withCredentials: true,
          headers: { 'X-CSRF-Token': csrf },
        }
      );
      if (!data.success || !data.data) {
        throw new Error('refresh response invalid');
      }
      const { access_token, refresh_token } = data.data;
      localStorage.setItem('accessToken', access_token);
      localStorage.setItem('refreshToken', refresh_token);
      const headers = AxiosHeaders.from(originalRequest.headers ?? {});
      headers.set('Authorization', `Bearer ${access_token}`);
      originalRequest.headers = headers;
      return api(originalRequest);
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      redirectToAppLogin();
      return logAndReject();
    }
  }
);

// Auth API endpoints
export const authAPI = {
  /**
   * User login
   */
  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', data);
    return mapAuthResponseData(response.data.data);
  },

  /**
   * 邮箱验证码登录（先 sendVerificationCode(..., 'login')）
   */
  loginWithEmailCode: async (payload: { email: string; code: string }): Promise<AuthResponse> => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login-email-code', payload);
    return mapAuthResponseData(response.data.data);
  },

  /**
   * User registration
   */
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const body: Record<string, unknown> = {
      email: data.email,
      password: data.password,
      phone: data.phone,
      role: data.role,
    };
    if (data.inviteCode?.trim()) {
      body.invite_code = data.inviteCode.trim();
    }
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', body);
    return mapAuthResponseData(response.data.data);
  },

  /**
   * User logout
   */
  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  /**
   * Get current user info
   */
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<ApiResponse<User>>('/users/me');
    return response.data.data!;
  },

  /**
   * Send verification code
   */
  sendVerificationCode: async (
    type: 'email' | 'phone',
    target: string,
    purpose: 'register' | 'reset_password' | 'login'
  ): Promise<void> => {
    await api.post('/auth/verification-code', { type, target, purpose });
  },

  /**
   * Verify code
   */
  verifyCode: async (
    type: 'email' | 'phone',
    target: string,
    code: string,
    purpose: 'register' | 'reset_password' | 'verify' | 'login' = 'register'
  ): Promise<void> => {
    await api.post('/auth/verify-code', { type, target, code, purpose });
  },

  /**
   * Reset password
   */
  resetPassword: async (data: ForgotPasswordData): Promise<void> => {
    await api.post('/auth/reset-password', {
      type: 'email',
      target: data.email,
      code: data.verificationCode,
      new_password: data.newPassword,
    });
  },

  /**
   * Refresh token（直连 POST，避免走带拦截器的 `api` 实例导致与拦截器逻辑交织）
   */
  refreshToken: async (refreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> => {
    const csrf = await ensureCsrfToken();
    const { data } = await axios.post<
      ApiResponse<{ access_token: string; refresh_token: string; expires_in: number }>
    >(`${API_BASE_URL}/auth/refresh`, { refresh_token: refreshToken }, {
      withCredentials: true,
      headers: { 'X-CSRF-Token': csrf },
    });
    if (!data.success || !data.data) {
      throw new Error('刷新 Token 失败');
    }
    const d = data.data;
    return {
      accessToken: d.access_token,
      refreshToken: d.refresh_token,
      expiresIn: d.expires_in,
    };
  },
};

export default api;
