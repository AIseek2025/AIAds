import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '../LoginPage';
import { APP_PATHS } from '../../../constants/appPaths';
import { authAPI } from '../../../services/api';
import { useAuthStore } from '../../../stores/authStore';

// Mock dependencies
vi.mock('../../../services/api');
vi.mock('../../../stores/authStore');

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <MemoryRouter>
      {component}
    </MemoryRouter>
  );
};

describe('LoginPage', () => {
  const mockLogin = vi.fn();
  const mockAuthStore = {
    login: mockLogin,
    user: null,
    isAuthenticated: false,
    logout: vi.fn(),
    updateUser: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuthStore as unknown as vi.Mock).mockReturnValue(mockAuthStore);
  });

  it('应该渲染登录表单', () => {
    renderWithRouter(<LoginPage />);
    
    expect(screen.getByLabelText(/邮箱/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/请输入密码/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^登录$/ })).toBeInTheDocument();
    expect(screen.getByText(/记住我/i)).toBeInTheDocument();
    expect(screen.getByText(/忘记密码/i)).toBeInTheDocument();
  });

  it('应该显示表单验证错误', async () => {
    renderWithRouter(<LoginPage />);
    
    const submitButton = screen.getByRole('button', { name: /^登录$/ });
    fireEvent.click(submitButton);
    
    expect(await screen.findByText(/请输入邮箱地址/i)).toBeInTheDocument();
    expect(await screen.findByText(/请输入密码/i)).toBeInTheDocument();
  });

  it('应该验证邮箱格式', async () => {
    renderWithRouter(<LoginPage />);
    
    const emailInput = screen.getByLabelText(/邮箱/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    
    const submitButton = screen.getByRole('button', { name: /^登录$/ });
    fireEvent.click(submitButton);
    
    expect(await screen.findByText(/邮箱格式不正确/i)).toBeInTheDocument();
  });

  it('应该验证密码长度', async () => {
    renderWithRouter(<LoginPage />);
    
    fireEvent.change(screen.getByLabelText(/邮箱/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/请输入密码/), {
      target: { value: '123' },
    });
    
    const submitButton = screen.getByRole('button', { name: /^登录$/ });
    fireEvent.click(submitButton);
    
    expect(await screen.findByText(/密码至少 8 位/i)).toBeInTheDocument();
  });

  it('应该成功提交登录表单', async () => {
    const mockResponse = {
      user: { id: '1', email: 'test@example.com', role: 'advertiser' as const },
      tokens: { accessToken: 'token', refreshToken: 'refresh', expires_in: 3600 },
    };
    
    (authAPI.login as vi.Mock).mockResolvedValue(mockResponse);
    
    renderWithRouter(<LoginPage />);
    
    fireEvent.change(screen.getByLabelText(/邮箱/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/请输入密码/), {
      target: { value: 'SecurePass123!' },
    });
    
    const submitButton = screen.getByRole('button', { name: /^登录$/ });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(authAPI.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'SecurePass123!',
        rememberMe: false,
      });
    });
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(
        mockResponse.user,
        mockResponse.tokens.accessToken,
        mockResponse.tokens.refreshToken
      );
    });
    
    expect(await screen.findByText(/登录成功/i)).toBeInTheDocument();
  });

  it('应该显示登录错误信息', async () => {
    (authAPI.login as vi.Mock).mockRejectedValue(new Error('邮箱或密码错误'));
    
    renderWithRouter(<LoginPage />);
    
    fireEvent.change(screen.getByLabelText(/邮箱/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/请输入密码/), {
      target: { value: 'wrongpassword' },
    });
    
    const submitButton = screen.getByRole('button', { name: /^登录$/ });
    fireEvent.click(submitButton);
    
    expect(await screen.findByText(/邮箱或密码错误/i)).toBeInTheDocument();
  });

  it('应该记住我功能', () => {
    renderWithRouter(<LoginPage />);
    
    const rememberCheckbox = screen.getByLabelText(/记住我/i);
    expect(rememberCheckbox).not.toBeChecked();
    
    fireEvent.click(rememberCheckbox);
    expect(rememberCheckbox).toBeChecked();
  });

  it('应该显示/隐藏密码', () => {
    renderWithRouter(<LoginPage />);
    
    const passwordInput = screen.getByPlaceholderText(/请输入密码/);
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    const visibilityButton = screen.getByRole('button', { name: /显示密码/i });
    fireEvent.click(visibilityButton);
    
    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('应该跳转到注册页面', () => {
    renderWithRouter(<LoginPage />);

    expect(screen.getByRole('link', { name: /立即注册/i })).toHaveAttribute(
      'href',
      APP_PATHS.register
    );
  });

  it('应该跳转到忘记密码页面', () => {
    renderWithRouter(<LoginPage />);

    expect(screen.getByRole('link', { name: /忘记密码/i })).toHaveAttribute(
      'href',
      APP_PATHS.forgotPassword
    );
  });

  it('应该清除错误当用户开始输入', async () => {
    renderWithRouter(<LoginPage />);
    
    const emailInput = screen.getByLabelText(/邮箱/i);
    const submitButton = screen.getByRole('button', { name: /^登录$/ });
    
    // Trigger validation error
    fireEvent.click(submitButton);
    expect(await screen.findByText(/请输入邮箱地址/i)).toBeInTheDocument();
    
    // Start typing should clear error
    fireEvent.change(emailInput, { target: { value: 't' } });
    
    await waitFor(() => {
      expect(screen.queryByText(/请输入邮箱地址/i)).not.toBeInTheDocument();
    });
  });

  it('应该显示加载状态当提交表单', async () => {
    (authAPI.login as vi.Mock).mockImplementation(() => new Promise(() => {}));
    
    renderWithRouter(<LoginPage />);
    
    fireEvent.change(screen.getByLabelText(/邮箱/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/请输入密码/), {
      target: { value: 'SecurePass123!' },
    });
    
    const submitButton = screen.getByRole('button', { name: /^登录$/ });
    fireEvent.click(submitButton);
    
    expect(await screen.findByText(/登录中/i)).toBeInTheDocument();
  });
});
