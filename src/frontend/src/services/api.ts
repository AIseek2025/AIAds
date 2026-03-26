import axios, { AxiosError } from 'axios';
import type { ApiResponse, LoginData, RegisterData, ForgotPasswordData } from '../types';
import type { AuthResponse, User } from '../types';

// API base URL from environment or default
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse>) => {
    // Handle 401 Unauthorized - Token expired or invalid
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      // Redirect to login (only if not already on login page)
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    // Handle other errors
    const errorMessage = error.response?.data?.error?.message || '请求失败，请稍后重试';
    console.error('API Error:', errorMessage);

    return Promise.reject(error);
  }
);

// Auth API endpoints
export const authAPI = {
  /**
   * User login
   */
  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', data);
    return response.data.data!;
  },

  /**
   * User registration
   */
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', data);
    return response.data.data!;
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
  sendVerificationCode: async (type: 'email' | 'phone', target: string, purpose: 'register' | 'reset_password'): Promise<void> => {
    await api.post('/auth/verification-code', { type, target, purpose });
  },

  /**
   * Verify code
   */
  verifyCode: async (type: 'email' | 'phone', target: string, code: string): Promise<void> => {
    await api.post('/auth/verify-code', { type, target, code });
  },

  /**
   * Reset password
   */
  resetPassword: async (data: ForgotPasswordData): Promise<void> => {
    await api.post('/auth/reset-password', data);
  },

  /**
   * Refresh token
   */
  refreshToken: async (refreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> => {
    const response = await api.post<ApiResponse<{ accessToken: string; refreshToken: string; expiresIn: number }>>('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return response.data.data!;
  },
};

export default api;
