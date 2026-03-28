import React, { useEffect, useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAdminAuthStore } from '../../stores/adminStore';
import { adminAuthAPI } from '../../services/adminApi';
import { getApiErrorMessage, getApiErrorCode } from '../../utils/apiError';
import type { AdminLoginData, AdminPermission } from '../../types';
import { ADMIN_ROUTE_SEG, pathAdmin } from '../../constants/appPaths';

// MUI Components
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';

// Icons
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import PinIcon from '@mui/icons-material/Pin';

const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAdminAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      navigate(pathAdmin(ADMIN_ROUTE_SEG.dashboard), { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const [formData, setFormData] = useState<AdminLoginData>({
    email: '',
    password: '',
    mfa_code: '',
    remember_me: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showMfaInput, setShowMfaInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await adminAuthAPI.login(formData);

      // Store tokens and admin info
      login(
        response.admin,
        response.tokens.access_token,
        response.tokens.refresh_token,
        response.admin.role,
        response.permissions as AdminPermission[]
      );

      // Redirect to admin dashboard
      navigate(pathAdmin(ADMIN_ROUTE_SEG.dashboard));
    } catch (err: unknown) {
      const errorMessage = getApiErrorMessage(err, '登录失败，请检查账号密码');

      // Check if MFA is required
      if (getApiErrorCode(err) === 'MFA_REQUIRED') {
        setShowMfaInput(true);
        setError('需要 MFA 验证码，请检查您的认证器');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        py: 4,
      }}
    >
      <Card
        sx={{
          width: '100%',
          maxWidth: 440,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          {/* Logo and Title */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <AdminPanelSettingsIcon sx={{ fontSize: 56, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              AIAds 管理后台
            </Typography>
            <Typography variant="body2" color="text.secondary">
              管理员登录
            </Typography>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              <AlertTitle>登录失败</AlertTitle>
              {error}
            </Alert>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
              {/* Email Field */}
              <TextField
                fullWidth
                label="邮箱"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                disabled={isLoading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                autoComplete="email"
              />

              {/* Password Field */}
              <TextField
                fullWidth
                label="密码"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange}
                required
                disabled={isLoading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        disabled={isLoading}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                autoComplete="current-password"
              />

              {/* MFA Code Field (conditional) */}
              {showMfaInput && (
                <TextField
                  fullWidth
                  label="MFA 验证码"
                  name="mfa_code"
                  type="text"
                  value={formData.mfa_code}
                  onChange={handleInputChange}
                  placeholder="6 位验证码"
                  inputProps={{ maxLength: 6, style: { textAlign: 'center', letterSpacing: '4px' } }}
                  required={showMfaInput}
                  disabled={isLoading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PinIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  autoComplete="one-time-code"
                />
              )}

              {/* Remember Me & Forgot Password */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      name="remember_me"
                      checked={formData.remember_me}
                      onChange={handleInputChange}
                      disabled={isLoading}
                      size="small"
                    />
                  }
                  label="记住我"
                  sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
                />
                <Link
                  component={RouterLink}
                  to={pathAdmin(ADMIN_ROUTE_SEG.forgotPassword)}
                  variant="body2"
                  underline="hover"
                >
                  忘记密码？
                </Link>
              </Box>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={isLoading}
                sx={{ py: 1.5, mt: 1 }}
              >
                {isLoading ? <CircularProgress size={24} /> : '登录'}
              </Button>
            </Stack>
          </form>

          {/* Divider */}
          <Divider sx={{ my: 3 }}>
            <Typography variant="caption" color="text.secondary">
              温馨提示
            </Typography>
          </Divider>

          {/* Help Text */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" paragraph>
              管理后台仅限授权管理员访问
            </Typography>
            <Typography variant="caption" color="text.secondary">
              如遇登录问题，请联系系统管理员
            </Typography>
          </Box>

          {/* Back to Home */}
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Link
              component={RouterLink}
              to="/"
              variant="body2"
              underline="hover"
              sx={{ display: 'inline-flex', alignItems: 'center' }}
            >
              返回用户登录
            </Link>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AdminLoginPage;
