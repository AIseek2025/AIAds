import React, { useState } from 'react';
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
import { styled } from '@mui/material/styles';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import GoogleIcon from '@mui/icons-material/Google';
import { Button, Input, Loading, SnackbarComponent } from '../../components/common';
import { useAuthStore } from '../../stores/authStore';
import { authAPI } from '../../services/api';
import type { LoginData } from '../../types';

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

  const [formData, setFormData] = useState<LoginData>({
    email: '',
    password: '',
    rememberMe: false,
  });

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

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof LoginData, string>> = {};

    if (!formData.email) {
      newErrors.email = '请输入邮箱地址';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '邮箱格式不正确';
    }

    if (!formData.password) {
      newErrors.password = '请输入密码';
    } else if (formData.password.length < 8) {
      newErrors.password = '密码至少 8 位';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

      // Redirect based on role
      setTimeout(() => {
        if (response.user.role === 'advertiser') {
          navigate('/advertiser/dashboard');
        } else if (response.user.role === 'kol') {
          navigate('/kol/dashboard');
        } else if (response.user.role === 'admin') {
          navigate('/admin/dashboard');
        }
      }, 500);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '登录失败，请检查您的账号和密码';
      setSnackbar({
        open: true,
        message: errorMessage,
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

  return (
    <AuthContainer>
      <AuthCard>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ mb: 1 }}>
            <LogoText>AIAds</LogoText>
            <SubtitleText>全球 KOL 营销平台</SubtitleText>
          </Box>

          <TitleText>欢迎回来</TitleText>

          <form onSubmit={handleSubmit}>
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
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                }
              />
            </Box>

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
              <Link to="/forgot-password" style={{ textDecoration: 'none' }}>
                <Typography variant="body2" color="primary">
                  忘记密码？
                </Typography>
              </Link>
            </Box>

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
              <Link to="/register" style={{ textDecoration: 'none' }}>
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
