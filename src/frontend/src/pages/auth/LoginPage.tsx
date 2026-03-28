import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { styled } from '@mui/material/styles';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import GoogleIcon from '@mui/icons-material/Google';
import { Button, Input, Loading, SnackbarComponent } from '../../components/common';
import { useAuthStore } from '../../stores/authStore';
import { authAPI } from '../../services/api';
import { getApiErrorMessage } from '../../utils/apiError';
import type { LoginData } from '../../types';
import {
  APP_PATHS,
  ADVERTISER_ROUTE_SEG,
  ADMIN_ROUTE_SEG,
  KOL_ROUTE_SEG,
  pathAdvertiser,
  pathKol,
  pathAdmin,
} from '../../constants/appPaths';

const AuthContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: theme.palette.background.default,
  padding: theme.spacing(2),
}));

const AuthCard = styled(Card)(({ theme }) => ({
  width: '100%',
  maxWidth: 440,
  borderRadius: 16,
  boxShadow: theme.shadows[10],
}));

const LogoText = styled(Typography)(({ theme }) => ({
  fontSize: '2rem',
  fontWeight: 800,
  color: theme.palette.primary.main,
  textAlign: 'center',
  marginBottom: theme.spacing(1),
}));

const SubtitleText = styled(Typography)(({ theme }) => ({
  textAlign: 'center',
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(4),
}));

const TitleText = styled(Typography)(({ theme }) => ({
  fontSize: '1.5rem',
  fontWeight: 600,
  marginBottom: theme.spacing(3),
  textAlign: 'center',
}));

const DividerText = styled(Typography)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  padding: theme.spacing(0, 2),
  color: theme.palette.text.secondary,
  fontSize: '0.875rem',
}));

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [loginMode, setLoginMode] = useState<'password' | 'email_code'>('password');
  const [formData, setFormData] = useState<LoginData>({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [emailOtp, setEmailOtp] = useState('');
  const [sendCooldown, setSendCooldown] = useState(0);

  const [errors, setErrors] = useState<Partial<Record<keyof LoginData, string>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  useEffect(() => {
    if (sendCooldown <= 0) return;
    const t = window.setInterval(() => {
      setSendCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [sendCooldown]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof LoginData, string>> = {};

    if (!formData.email) {
      newErrors.email = '请输入邮箱地址';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '邮箱格式不正确';
    }

    if (loginMode === 'password') {
      if (!formData.password) {
        newErrors.password = '请输入密码';
      } else if (formData.password.length < 8) {
        newErrors.password = '密码至少 8 位';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateEmailOtpForm = (): boolean => {
    const newErrors: Partial<Record<keyof LoginData, string>> = {};
    if (!formData.email) {
      newErrors.email = '请输入邮箱地址';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '邮箱格式不正确';
    }
    if (!emailOtp || emailOtp.length !== 6 || !/^\d{6}$/.test(emailOtp)) {
      newErrors.password = '请输入 6 位数字验证码';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendEmailCode = async () => {
    const newErrors: Partial<Record<keyof LoginData, string>> = {};
    if (!formData.email) {
      newErrors.email = '请输入邮箱地址';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '邮箱格式不正确';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    if (sendCooldown > 0) return;

    setLoading(true);
    try {
      await authAPI.sendVerificationCode('email', formData.email, 'login');
      setSnackbar({
        open: true,
        message: '验证码已发送，请查收邮箱',
        severity: 'success',
      });
      setSendCooldown(60);
    } catch (error: unknown) {
      setSnackbar({
        open: true,
        message: getApiErrorMessage(error, '发送验证码失败'),
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const redirectByRole = (role: string) => {
    setTimeout(() => {
      if (role === 'advertiser') {
        navigate(pathAdvertiser(ADVERTISER_ROUTE_SEG.dashboard));
      } else if (role === 'kol') {
        navigate(pathKol(KOL_ROUTE_SEG.dashboard));
      } else if (role === 'admin') {
        navigate(pathAdmin(ADMIN_ROUTE_SEG.dashboard));
      }
    }, 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loginMode === 'email_code') {
      if (!validateEmailOtpForm()) return;
      setLoading(true);
      try {
        const response = await authAPI.loginWithEmailCode({
          email: formData.email,
          code: emailOtp,
        });
        login(response.user, response.tokens.accessToken, response.tokens.refreshToken);
        setSnackbar({ open: true, message: '登录成功！', severity: 'success' });
        redirectByRole(response.user.role);
      } catch (error: unknown) {
        setSnackbar({
          open: true,
          message: getApiErrorMessage(error, '登录失败，请检查验证码'),
          severity: 'error',
        });
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.login(formData);
      login(response.user, response.tokens.accessToken, response.tokens.refreshToken);

      setSnackbar({
        open: true,
        message: '登录成功！',
        severity: 'success',
      });

      redirectByRole(response.user.role);
    } catch (error: unknown) {
      setSnackbar({
        open: true,
        message: getApiErrorMessage(error, '登录失败，请检查您的账号和密码'),
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof LoginData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'rememberMe' ? e.target.checked : e.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleLoginModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    value: 'password' | 'email_code' | null
  ) => {
    if (value === null) return;
    setLoginMode(value);
    setErrors({});
    setEmailOtp('');
  };

  return (
    <AuthContainer>
      <AuthCard>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ mb: 1 }}>
            <LogoText>AIAds</LogoText>
            <SubtitleText>全球 KOL 营销平台</SubtitleText>
          </Box>

          <TitleText>欢迎回来</TitleText>

          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
            <ToggleButtonGroup
              value={loginMode}
              exclusive
              onChange={handleLoginModeChange}
              size="small"
              color="primary"
            >
              <ToggleButton value="password">密码登录</ToggleButton>
              <ToggleButton value="email_code">邮箱验证码</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <form noValidate onSubmit={handleSubmit}>
            <Box sx={{ mb: 2 }}>
              <Input
                label="邮箱"
                type="email"
                value={formData.email}
                onChange={handleInputChange('email')}
                error={!!errors.email}
                helperText={errors.email}
                placeholder="请输入邮箱地址"
                autoComplete="email"
              />
            </Box>

            {loginMode === 'password' && (
              <Box sx={{ mb: 2 }}>
                <Input
                  label="密码"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  error={!!errors.password}
                  helperText={errors.password}
                  placeholder="请输入密码"
                  autoComplete="current-password"
                  endAdornment={
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showPassword ? '隐藏密码' : '显示密码'}
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  }
                />
              </Box>
            )}

            {loginMode === 'email_code' && (
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1 }}>
                    <Input
                      label="邮箱验证码"
                      type="text"
                      value={emailOtp}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setEmailOtp(v);
                        if (errors.password) {
                          setErrors((prev) => ({ ...prev, password: undefined }));
                        }
                      }}
                      error={!!errors.password}
                      helperText={errors.password || '请先点击右侧发送验证码'}
                      placeholder="6 位数字"
                      inputProps={{ maxLength: 6, inputMode: 'numeric' }}
                      autoComplete="one-time-code"
                    />
                  </Box>
                  <Button
                    type="button"
                    variant="outlined"
                    sx={{ mt: 0.5, minWidth: 100, flexShrink: 0 }}
                    onClick={handleSendEmailCode}
                    disabled={loading || sendCooldown > 0}
                  >
                    {sendCooldown > 0 ? `${sendCooldown}s` : '发送验证码'}
                  </Button>
                </Box>
              </Box>
            )}

            {loginMode === 'password' && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.rememberMe}
                      onChange={handleInputChange('rememberMe')}
                      color="primary"
                    />
                  }
                  label="记住我"
                />
                <Link to={APP_PATHS.forgotPassword} style={{ textDecoration: 'none' }}>
                  <Typography variant="body2" color="primary">
                    忘记密码？
                  </Typography>
                </Link>
              </Box>
            )}

            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              fullWidth
              loading={loading}
            >
              登录
            </Button>
          </form>

          <Divider sx={{ my: 3 }}>
            <DividerText>或</DividerText>
          </Divider>

          <Button
            variant="outlined"
            color="primary"
            size="large"
            fullWidth
            startIcon={<GoogleIcon />}
          >
            使用 Google 账号登录
          </Button>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              还没有账号？{' '}
              <Link to={APP_PATHS.register} style={{ textDecoration: 'none' }}>
                <Typography component="span" color="primary" fontWeight="600">
                  立即注册
                </Typography>
              </Link>
            </Typography>
          </Box>
        </CardContent>
      </AuthCard>

      <Loading open={loading} message="登录中..." />
      <SnackbarComponent
        open={snackbar.open}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        message={snackbar.message}
        severity={snackbar.severity}
      />
    </AuthContainer>
  );
};

export default LoginPage;
