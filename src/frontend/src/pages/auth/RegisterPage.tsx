import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import FormControl from '@mui/material/FormControl';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import { styled } from '@mui/material/styles';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { Button, Input, Loading, SnackbarComponent } from '../../components/common';
import { authAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import type { RegisterData } from '../../types';

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
  maxWidth: 500,
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
  marginBottom: theme.spacing(3),
}));

const TitleText = styled(Typography)(({ theme }) => ({
  fontSize: '1.5rem',
  fontWeight: 600,
  marginBottom: theme.spacing(3),
  textAlign: 'center',
}));

const steps = ['选择角色', '填写信息', '验证邮箱'];

interface PasswordStrength {
  score: number;
  label: string;
  color: 'error' | 'warning' | 'success';
}

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [activeStep, setActiveStep] = useState(0);
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

  const [formData, setFormData] = useState<RegisterData>({
    email: '',
    password: '',
    phone: '',
    role: 'advertiser',
    verificationCode: '',
    agreeTerms: false,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof RegisterData, string>>>({});

  const getPasswordStrength = (password: string): PasswordStrength => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 1) return { score, label: '弱', color: 'error' };
    if (score <= 2) return { score, label: '中等', color: 'warning' };
    return { score, label: '强', color: 'success' };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<Record<keyof RegisterData, string>> = {};

    if (step === 0) {
      // Role selection - no validation needed
      return true;
    }

    if (step === 1) {
      if (!formData.email) {
        newErrors.email = '请输入邮箱地址';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = '邮箱格式不正确';
      }

      if (!formData.password) {
        newErrors.password = '请输入密码';
      } else if (formData.password.length < 8) {
        newErrors.password = '密码至少 8 位';
      } else if (passwordStrength.score < 2) {
        newErrors.password = '密码强度不够';
      }

      if (!formData.agreeTerms) {
        newErrors.agreeTerms = '请同意服务条款';
      }
    }

    if (step === 2) {
      if (!formData.verificationCode) {
        newErrors.verificationCode = '请输入验证码';
      } else if (formData.verificationCode.length !== 6) {
        newErrors.verificationCode = '验证码为 6 位数字';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validateStep(activeStep)) {
      return;
    }

    if (activeStep === steps.length - 1) {
      // Final step - submit registration
      setLoading(true);
      try {
        const response = await authAPI.register(formData);
        login(response.user, response.tokens.accessToken, response.tokens.refreshToken);
        
        setSnackbar({
          open: true,
          message: '注册成功！',
          severity: 'success',
        });

        setTimeout(() => {
          if (response.user.role === 'advertiser') {
            navigate('/advertiser/dashboard');
          } else {
            navigate('/kol/dashboard');
          }
        }, 500);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '注册失败，请稍后重试';
        setSnackbar({
          open: true,
          message: errorMessage,
          severity: 'error',
        });
      } finally {
        setLoading(false);
      }
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleInputChange = (field: keyof RegisterData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'agreeTerms' ? e.target.checked : e.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSendCode = async () => {
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setErrors((prev) => ({ ...prev, email: '请输入正确的邮箱地址' }));
      return;
    }

    try {
      await authAPI.sendVerificationCode('email', formData.email, 'register');
      setSnackbar({
        open: true,
        message: '验证码已发送到您的邮箱',
        severity: 'success',
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '发送验证码失败';
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    }
  };

  const handleInputChangeRole = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, role: (event.target as HTMLInputElement).value as 'advertiser' | 'kol' }));
  };

  return (
    <AuthContainer>
      <AuthCard>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ mb: 1 }}>
            <LogoText>AIAds</LogoText>
            <SubtitleText>全球 KOL 营销平台</SubtitleText>
          </Box>

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <TitleText>
            {activeStep === 0 && '选择您的角色'}
            {activeStep === 1 && '填写账号信息'}
            {activeStep === 2 && '验证邮箱'}
          </TitleText>

          {activeStep === 0 && (
            <FormControl component="fieldset" fullWidth sx={{ mb: 3 }}>
              <FormLabel component="legend" sx={{ mb: 2 }}>
                我是
              </FormLabel>
              <RadioGroup
                row
                value={formData.role}
                onChange={handleInputChangeRole}
                sx={{ gap: 2 }}
              >
                <FormControlLabel
                  value="advertiser"
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight="600">
                        广告主
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        我想投放 KOL 广告
                      </Typography>
                    </Box>
                  }
                  sx={{
                    flex: 1,
                    p: 2,
                    borderRadius: 2,
                    border: 1,
                    borderColor: formData.role === 'advertiser' ? 'primary.main' : 'divider',
                    backgroundColor: formData.role === 'advertiser' ? 'primary.light' : 'transparent',
                  }}
                />
                <FormControlLabel
                  value="kol"
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight="600">
                        KOL
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        我想接广告赚钱
                      </Typography>
                    </Box>
                  }
                  sx={{
                    flex: 1,
                    p: 2,
                    borderRadius: 2,
                    border: 1,
                    borderColor: formData.role === 'kol' ? 'primary.main' : 'divider',
                    backgroundColor: formData.role === 'kol' ? 'primary.light' : 'transparent',
                  }}
                />
              </RadioGroup>
            </FormControl>
          )}

          {activeStep === 1 && (
            <Box component="form">
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
                  placeholder="请设置 8 位以上密码"
                  autoComplete="new-password"
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
                {formData.password && (
                  <Box sx={{ mt: 1, mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      密码强度：
                      <Typography
                        component="span"
                        color={passwordStrength.color}
                        fontWeight="600"
                        sx={{ ml: 1 }}
                      >
                        {passwordStrength.label}
                      </Typography>
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                      {[1, 2, 3, 4].map((level) => (
                        <Box
                          key={level}
                          sx={{
                            flex: 1,
                            height: 4,
                            borderRadius: 1,
                            backgroundColor:
                              level <= passwordStrength.score
                                ? passwordStrength.color === 'error'
                                  ? 'error.main'
                                  : passwordStrength.color === 'warning'
                                  ? 'warning.main'
                                  : 'success.main'
                                : 'grey.200',
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>

              <Box sx={{ mb: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.agreeTerms}
                      onChange={handleInputChange('agreeTerms')}
                      color="primary"
                    />
                  }
                  label={
                    <Typography variant="body2">
                      我已阅读并同意{' '}
                      <Link to="/terms" style={{ color: 'inherit' }}>
                        <Typography component="span" color="primary">
                          《服务条款》
                        </Typography>
                      </Link>{' '}
                      和{' '}
                      <Link to="/privacy" style={{ color: 'inherit' }}>
                        <Typography component="span" color="primary">
                          《隐私政策》
                        </Typography>
                      </Link>
                    </Typography>
                  }
                />
                {errors.agreeTerms && (
                  <Typography variant="caption" color="error">
                    {errors.agreeTerms}
                  </Typography>
                )}
              </Box>
            </Box>
          )}

          {activeStep === 2 && (
            <Box component="form">
              <Typography variant="body2" color="text.secondary" paragraph>
                我们已向 <strong>{formData.email}</strong> 发送了 6 位验证码
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Input
                    label="验证码"
                    type="text"
                    value={formData.verificationCode}
                    onChange={handleInputChange('verificationCode')}
                    error={!!errors.verificationCode}
                    helperText={errors.verificationCode}
                    placeholder="请输入 6 位验证码"
                    inputProps={{ maxLength: 6, style: { textAlign: 'center', letterSpacing: '0.5em' } }}
                  />
                </Box>
                <Button
                  variant="outlined"
                  onClick={handleSendCode}
                  sx={{ mt: 1.5, whiteSpace: 'nowrap' }}
                >
                  重新发送
                </Button>
              </Box>
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
            {activeStep > 0 && (
              <Button
                variant="outlined"
                onClick={handleBack}
                fullWidth
              >
                上一步
              </Button>
            )}
            <Button
              variant="contained"
              onClick={handleNext}
              fullWidth
              loading={loading}
            >
              {activeStep === steps.length - 1 ? '完成注册' : '下一步'}
            </Button>
          </Box>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              已有账号？{' '}
              <Link to="/login" style={{ textDecoration: 'none' }}>
                <Typography component="span" color="primary" fontWeight="600">
                  立即登录
                </Typography>
              </Link>
            </Typography>
          </Box>
        </CardContent>
      </AuthCard>

      <Loading open={loading} message="注册中..." />
      <SnackbarComponent
        open={snackbar.open}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        message={snackbar.message}
        severity={snackbar.severity}
      />
    </AuthContainer>
  );
};

export default RegisterPage;
