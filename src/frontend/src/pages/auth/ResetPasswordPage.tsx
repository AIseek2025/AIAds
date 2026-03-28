import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Alert from '@mui/material/Alert';
import { styled } from '@mui/material/styles';
import { Button, Input, Loading, SnackbarComponent } from '../../components/common';
import { authAPI } from '../../services/api';
import {
  loginPathAfterPasswordRecovery,
  pathForgotPasswordPreservingRecoveryContext,
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
  marginBottom: theme.spacing(1),
  textAlign: 'center',
}));

const DescriptionText = styled(Typography)(({ theme }) => ({
  textAlign: 'center',
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(3),
}));

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const loginPath = useMemo(() => loginPathAfterPasswordRecovery(searchParams), [searchParams]);
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
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
  const [isValid, setIsValid] = useState(true);

  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Verify token exists
    if (!token || !email) {
      setIsValid(false);
    }
  }, [token, email]);

  const validatePassword = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!newPassword) {
      newErrors.newPassword = '请输入新密码';
    } else if (newPassword.length < 8) {
      newErrors.newPassword = '密码至少 8 位';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      newErrors.newPassword = '密码需包含大小写字母和数字';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = '请确认新密码';
    } else if (confirmPassword !== newPassword) {
      newErrors.confirmPassword = '两次输入的密码不一致';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async () => {
    if (!validatePassword()) {
      return;
    }

    if (!token || !email) {
      setSnackbar({
        open: true,
        message: '重置链接无效',
        severity: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      await authAPI.resetPassword({
        email,
        verificationCode: token, // Using token as verification code
        newPassword,
      });
      setSnackbar({
        open: true,
        message: '密码重置成功！即将跳转到登录页面',
        severity: 'success',
      });
      setTimeout(() => {
        navigate(loginPath, { replace: true });
      }, 2000);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '密码重置失败';
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange =
    (setter: React.Dispatch<React.SetStateAction<string>>, fieldName: string) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value);
      if (errors[fieldName]) {
        setErrors((prev: Record<string, string>) => ({ ...prev, [fieldName]: undefined } as Record<string, string>));
      }
    };

  if (!isValid) {
    return (
      <AuthContainer>
        <AuthCard>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ mb: 1 }}>
              <LogoText>AIAds</LogoText>
              <SubtitleText>全球 KOL 营销平台</SubtitleText>
            </Box>

            <Alert severity="error" sx={{ mb: 3 }}>
              重置链接无效或已过期，请重新申请重置密码
            </Alert>

            <Button
              variant="contained"
              color="primary"
              size="large"
              fullWidth
              onClick={() => navigate(pathForgotPasswordPreservingRecoveryContext(searchParams))}
            >
              重新设置密码
            </Button>
          </CardContent>
        </AuthCard>
      </AuthContainer>
    );
  }

  return (
    <AuthContainer>
      <AuthCard>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ mb: 1 }}>
            <LogoText>AIAds</LogoText>
            <SubtitleText>全球 KOL 营销平台</SubtitleText>
          </Box>

          <TitleText>重置密码</TitleText>
          <DescriptionText>
            请为 <strong>{email}</strong> 设置新密码
          </DescriptionText>

          <Box sx={{ mb: 2 }}>
            <Input
              label="新密码"
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={handleInputChange(setNewPassword, 'newPassword')}
              error={!!errors.newPassword}
              helperText={errors.newPassword}
              placeholder="请设置 8 位以上密码"
              autoComplete="new-password"
            />
          </Box>

          <Box sx={{ mb: 3 }}>
            <Input
              label="确认密码"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={handleInputChange(setConfirmPassword, 'confirmPassword')}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword}
              placeholder="请再次输入新密码"
              autoComplete="new-password"
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? '隐藏' : '显示'}
                  </IconButton>
                </InputAdornment>
              }
            />
          </Box>

          <Button
            variant="contained"
            color="primary"
            size="large"
            fullWidth
            onClick={handleResetPassword}
            loading={loading}
          >
            确认重置
          </Button>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              记得密码了？{' '}
              <Link to={loginPath} style={{ textDecoration: 'none' }}>
                <Typography component="span" color="primary" fontWeight="600">
                  返回登录
                </Typography>
              </Link>
            </Typography>
          </Box>
        </CardContent>
      </AuthCard>

      <Loading open={loading} message="重置中..." />
      <SnackbarComponent
        open={snackbar.open}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        message={snackbar.message}
        severity={snackbar.severity}
      />
    </AuthContainer>
  );
};

export default ResetPasswordPage;
