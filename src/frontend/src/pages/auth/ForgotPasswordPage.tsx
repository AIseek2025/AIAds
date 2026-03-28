import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import { styled } from '@mui/material/styles';
import EmailIcon from '@mui/icons-material/Email';
import { Button, Input, Loading, SnackbarComponent } from '../../components/common';
import { authAPI } from '../../services/api';
import { loginPathAfterPasswordRecovery } from '../../constants/appPaths';
import { getApiErrorMessage } from '../../utils/apiError';

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

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const loginPath = useMemo(() => loginPathAfterPasswordRecovery(searchParams), [searchParams]);
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
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

  const validateEmail = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!email) {
      newErrors.email = '请输入邮箱地址';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = '邮箱格式不正确';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateCode = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!verificationCode) {
      newErrors.verificationCode = '请输入验证码';
    } else if (verificationCode.length !== 6) {
      newErrors.verificationCode = '验证码为 6 位数字';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePassword = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!newPassword) {
      newErrors.newPassword = '请输入新密码';
    } else if (newPassword.length < 8) {
      newErrors.newPassword = '密码至少 8 位';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = '请确认新密码';
    } else if (confirmPassword !== newPassword) {
      newErrors.confirmPassword = '两次输入的密码不一致';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendCode = async () => {
    if (!validateEmail()) {
      return;
    }

    setLoading(true);
    try {
      await authAPI.sendVerificationCode('email', email, 'reset_password');
      setSnackbar({
        open: true,
        message: '验证码已发送到您的邮箱',
        severity: 'success',
      });
      setStep(2);
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

  /** 仅校验格式后进入设密步骤；验证码在「重置密码」接口中一次性校验并消费，避免重复 verify 导致 Redis 中码被提前删除 */
  const handleContinueAfterCode = () => {
    if (!validateCode()) {
      return;
    }
    setStep(3);
  };

  const handleResetPassword = async () => {
    if (!validatePassword()) {
      return;
    }

    setLoading(true);
    try {
      await authAPI.resetPassword({
        email,
        verificationCode,
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
      setSnackbar({
        open: true,
        message: getApiErrorMessage(error, '密码重置失败'),
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

  return (
    <AuthContainer>
      <AuthCard>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ mb: 1 }}>
            <LogoText>AIAds</LogoText>
            <SubtitleText>全球 KOL 营销平台</SubtitleText>
          </Box>

          {step === 1 && (
            <>
              <TitleText>忘记密码</TitleText>
              <DescriptionText>
                请输入您的邮箱地址，我们将发送验证码到您
              </DescriptionText>

              <Box sx={{ mb: 2 }}>
                <Input
                  label="邮箱"
                  type="email"
                  value={email}
                  onChange={handleInputChange(setEmail, 'email')}
                  error={!!errors.email}
                  helperText={errors.email}
                  placeholder="请输入注册时的邮箱"
                  startAdornment={
                    <InputAdornment position="start">
                      <EmailIcon color="action" />
                    </InputAdornment>
                  }
                />
              </Box>

              <Button
                variant="contained"
                color="primary"
                size="large"
                fullWidth
                onClick={handleSendCode}
                loading={loading}
              >
                发送验证码
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <TitleText>验证邮箱</TitleText>
              <DescriptionText>
                请输入发送到 <strong>{email}</strong> 的 6 位验证码
              </DescriptionText>

              <Box sx={{ mb: 2 }}>
                <Input
                  label="验证码"
                  type="text"
                  value={verificationCode}
                  onChange={handleInputChange(setVerificationCode, 'verificationCode')}
                  error={!!errors.verificationCode}
                  helperText={errors.verificationCode}
                  placeholder="请输入 6 位验证码"
                  inputProps={{ maxLength: 6, style: { textAlign: 'center', letterSpacing: '0.5em' } }}
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  size="large"
                  fullWidth
                  onClick={() => setStep(1)}
                >
                  返回
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  fullWidth
                  onClick={handleContinueAfterCode}
                >
                  下一步
                </Button>
              </Box>
            </>
          )}

          {step === 3 && (
            <>
              <TitleText>重置密码</TitleText>
              <DescriptionText>
                请设置您的新密码
              </DescriptionText>

              <Box sx={{ mb: 2 }}>
                <Input
                  label="新密码"
                  type="password"
                  value={newPassword}
                  onChange={handleInputChange(setNewPassword, 'newPassword')}
                  error={!!errors.newPassword}
                  helperText={errors.newPassword}
                  placeholder="请设置 8 位以上密码"
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Input
                  label="确认密码"
                  type="password"
                  value={confirmPassword}
                  onChange={handleInputChange(setConfirmPassword, 'confirmPassword')}
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword}
                  placeholder="请再次输入新密码"
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  size="large"
                  fullWidth
                  onClick={() => setStep(2)}
                >
                  返回
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  fullWidth
                  onClick={handleResetPassword}
                  loading={loading}
                >
                  重置密码
                </Button>
              </Box>
            </>
          )}

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

      <Loading open={loading} message="处理中..." />
      <SnackbarComponent
        open={snackbar.open}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        message={snackbar.message}
        severity={snackbar.severity}
      />
    </AuthContainer>
  );
};

export default ForgotPasswordPage;
