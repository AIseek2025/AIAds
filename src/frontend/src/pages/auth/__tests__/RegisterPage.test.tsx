import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RegisterPage } from '../RegisterPage';
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

describe('RegisterPage', () => {
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

  it('应该渲染注册表单', () => {
    renderWithRouter(<RegisterPage />);

    expect(screen.getByText(/选择您的角色/i)).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: /我想投放 KOL 广告/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: /我想接广告赚钱/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /下一步/i })).toBeInTheDocument();
  });

  it('应该验证密码强度', async () => {
    renderWithRouter(<RegisterPage />);
    
    // Select role
    fireEvent.click(screen.getByLabelText(/广告主/i));
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }));
    
    // Enter weak password
    fireEvent.change(screen.getByPlaceholderText(/请设置 8 位以上密码/), {
      target: { value: '123' },
    });
    
    expect(await screen.findByText(/密码强度/i)).toBeInTheDocument();
    expect(screen.getByText(/弱/i)).toBeInTheDocument();
  });

  it('应该验证邮箱格式', async () => {
    renderWithRouter(<RegisterPage />);
    
    fireEvent.click(screen.getByLabelText(/广告主/i));
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }));
    
    fireEvent.change(screen.getByLabelText(/邮箱/i), {
      target: { value: 'invalid' },
    });
    
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }));
    
    expect(await screen.findByText(/邮箱格式不正确/i)).toBeInTheDocument();
  });

  it('应该验证服务条款同意', async () => {
    renderWithRouter(<RegisterPage />);
    
    fireEvent.click(screen.getByLabelText(/广告主/i));
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }));
    
    // Fill in info but don't agree to terms
    fireEvent.change(screen.getByLabelText(/邮箱/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/请设置 8 位以上密码/), {
      target: { value: 'SecurePass123!' },
    });
    
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }));
    
    expect(await screen.findByText(/请同意服务条款/i)).toBeInTheDocument();
  });

  it('应该成功提交注册表单', async () => {
    const mockResponse = {
      user: { id: '1', email: 'test@example.com', role: 'advertiser' as const },
      tokens: { accessToken: 'token', refreshToken: 'refresh', expires_in: 3600 },
    };
    
    (authAPI.register as vi.Mock).mockResolvedValue(mockResponse);
    (authAPI.sendVerificationCode as vi.Mock).mockResolvedValue({});
    
    renderWithRouter(<RegisterPage />);
    
    // Step 1: Select role
    fireEvent.click(screen.getByLabelText(/广告主/i));
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }));
    
    // Step 2: Fill in info
    fireEvent.change(screen.getByLabelText(/邮箱/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/请设置 8 位以上密码/), {
      target: { value: 'SecurePass123!' },
    });
    fireEvent.click(screen.getByLabelText(/我已阅读并同意/i));
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }));

    // Step 3: Enter verification code (after sendVerificationCode + setActiveStep)
    const codeField = await screen.findByPlaceholderText(/请输入 6 位验证码/);
    fireEvent.change(codeField, {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: /完成注册/i }));
    
    await waitFor(() => {
      expect(authAPI.register).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'SecurePass123!',
        phone: '',
        role: 'advertiser',
        inviteCode: '',
        verificationCode: '123456',
        agreeTerms: true,
      });
    });
    
    expect(await screen.findByText(/注册成功/i)).toBeInTheDocument();
  });

  it('应该发送验证码', async () => {
    (authAPI.sendVerificationCode as vi.Mock).mockResolvedValue({});
    
    renderWithRouter(<RegisterPage />);
    
    fireEvent.click(screen.getByLabelText(/广告主/i));
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }));
    
    fireEvent.change(screen.getByLabelText(/邮箱/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/请设置 8 位以上密码/), {
      target: { value: 'SecurePass123!' },
    });
    fireEvent.click(screen.getByLabelText(/我已阅读并同意/i));
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }));

    await screen.findByPlaceholderText(/请输入 6 位验证码/);

    fireEvent.click(screen.getByRole('button', { name: /重新发送/i }));
    
    expect(await screen.findByText(/验证码已发送/i)).toBeInTheDocument();
    expect(authAPI.sendVerificationCode).toHaveBeenCalledWith(
      'email',
      'test@example.com',
      'register'
    );
  });

  it('应该验证验证码格式', async () => {
    renderWithRouter(<RegisterPage />);
    
    fireEvent.click(screen.getByLabelText(/广告主/i));
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }));
    fireEvent.change(screen.getByLabelText(/邮箱/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/请设置 8 位以上密码/), {
      target: { value: 'SecurePass123!' },
    });
    fireEvent.click(screen.getByLabelText(/我已阅读并同意/i));
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }));

    const otpInput = await screen.findByPlaceholderText(/请输入 6 位验证码/);
    // Enter wrong length verification code
    fireEvent.change(otpInput, {
      target: { value: '123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /完成注册/i }));
    
    expect(await screen.findByText(/验证码为 6 位数字/i)).toBeInTheDocument();
  });

  it('应该可以返回上一步', () => {
    renderWithRouter(<RegisterPage />);
    
    fireEvent.click(screen.getByLabelText(/广告主/i));
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }));
    
    expect(screen.getByRole('button', { name: /上一步/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /上一步/i }));
    
    expect(screen.getByText(/选择您的角色/i)).toBeInTheDocument();
  });

  it('应该显示密码可见切换', () => {
    renderWithRouter(<RegisterPage />);
    
    fireEvent.click(screen.getByLabelText(/广告主/i));
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }));
    
    const passwordInput = screen.getByPlaceholderText(/请设置 8 位以上密码/);
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    const visibilityButton = screen.getByRole('button', { name: /显示密码/i });
    fireEvent.click(visibilityButton);
    
    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('应该显示密码强度指示器', async () => {
    renderWithRouter(<RegisterPage />);
    
    fireEvent.click(screen.getByLabelText(/广告主/i));
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }));
    
    // Enter strong password
    fireEvent.change(screen.getByPlaceholderText(/请设置 8 位以上密码/), {
      target: { value: 'SecurePass123!' },
    });

    expect(await screen.findByText(/密码强度/i)).toBeInTheDocument();
    expect(await screen.findByText(/^强$/)).toBeInTheDocument();
  });

  it('应该显示注册步骤', () => {
    renderWithRouter(<RegisterPage />);
    
    expect(screen.getByText(/选择角色/i)).toBeInTheDocument();
    expect(screen.getByText(/填写信息/i)).toBeInTheDocument();
    expect(screen.getByText(/验证邮箱/i)).toBeInTheDocument();
  });

  it('应该显示错误当注册失败', async () => {
    (authAPI.register as vi.Mock).mockRejectedValue(new Error('邮箱已被注册'));
    (authAPI.sendVerificationCode as vi.Mock).mockResolvedValue({});

    renderWithRouter(<RegisterPage />);

    fireEvent.click(screen.getByLabelText(/广告主/i));
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }));
    fireEvent.change(screen.getByLabelText(/邮箱/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/请设置 8 位以上密码/), {
      target: { value: 'SecurePass123!' },
    });
    fireEvent.click(screen.getByLabelText(/我已阅读并同意/i));
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }));

    const codeInput = await screen.findByPlaceholderText(/请输入 6 位验证码/);
    fireEvent.change(codeInput, {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: /完成注册/i }));
    
    expect(await screen.findByText(/邮箱已被注册/i)).toBeInTheDocument();
  });

  it('应该跳转到登录页面', () => {
    renderWithRouter(<RegisterPage />);
    
    expect(screen.getByRole('link', { name: /立即登录/i })).toHaveAttribute(
      'href',
      APP_PATHS.login
    );
  });
});
