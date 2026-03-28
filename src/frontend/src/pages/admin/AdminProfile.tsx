import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminPermission } from '../../types';
import { adminAuthAPI } from '../../services/adminApi';
import { useAdminAuthStore } from '../../stores/adminStore';
import { getApiErrorMessage } from '../../utils/apiError';
import { AdminHubNav } from '../../components/admin/AdminHubNav';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';

function roleChipLabel(
  adminRole: string | undefined,
  roleNameFromApi: string | undefined
): string {
  if (roleNameFromApi) return roleNameFromApi;
  if (adminRole === 'super_admin') return '超级管理员';
  if (adminRole === 'admin') return '管理员';
  if (adminRole === 'moderator') return '审核员';
  if (adminRole === 'finance') return '财务';
  if (adminRole === 'analyst') return '分析师';
  return adminRole ?? '—';
}

const AdminProfilePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { admin, updateAdmin, setPermissions } = useAdminAuthStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const { data: meData, refetch } = useQuery({
    queryKey: ['adminAuthMe'],
    queryFn: () => adminAuthAPI.getCurrentAdmin(),
  });

  useEffect(() => {
    if (!meData) return;
    updateAdmin(meData.admin);
    if (meData.permissions?.length) {
      setPermissions(meData.permissions as AdminPermission[]);
    }
  }, [meData, updateAdmin, setPermissions]);

  const pwdMutation = useMutation({
    mutationFn: () =>
      adminAuthAPI.changePassword({
        currentPassword,
        newPassword,
      }),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSnackbar({ open: true, message: '密码已更新', severity: 'success' });
      void queryClient.invalidateQueries({ queryKey: ['adminAuthMe'] });
    },
    onError: (err: unknown) => {
      setSnackbar({
        open: true,
        message: getApiErrorMessage(err, '修改失败'),
        severity: 'error',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setSnackbar({ open: true, message: '两次输入的新密码不一致', severity: 'error' });
      return;
    }
    if (newPassword.length < 8) {
      setSnackbar({ open: true, message: '新密码至少 8 位', severity: 'error' });
      return;
    }
    pwdMutation.mutate();
  };

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          个人中心
        </Typography>
        <Typography variant="body2" color="text.secondary">
          查看账号信息与修改登录密码
        </Typography>
      </Box>
      <AdminHubNav onRefresh={() => void refetch()} />

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader title="账号信息" />
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar src={admin?.avatarUrl} sx={{ width: 56, height: 56 }}>
                  {admin?.name?.[0]?.toUpperCase() ?? '?'}
                </Avatar>
                <Box>
                  <Typography fontWeight={600}>{admin?.name ?? '—'}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {admin?.email ?? '—'}
                  </Typography>
                  <Chip
                    size="small"
                    label={roleChipLabel(admin?.role, meData?.role?.name)}
                    sx={{ mt: 1 }}
                    variant="outlined"
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card component="form" onSubmit={handleSubmit}>
            <CardHeader title="修改密码" />
            <CardContent>
              <Stack spacing={2}>
                <TextField
                  type="password"
                  label="当前密码"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  fullWidth
                  autoComplete="current-password"
                />
                <TextField
                  type="password"
                  label="新密码"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  fullWidth
                  autoComplete="new-password"
                  helperText="至少 8 位，需含大小写字母与数字"
                />
                <TextField
                  type="password"
                  label="确认新密码"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  fullWidth
                  autoComplete="new-password"
                />
                <Button type="submit" variant="contained" disabled={pwdMutation.isPending}>
                  {pwdMutation.isPending ? '提交中…' : '保存新密码'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminProfilePage;
