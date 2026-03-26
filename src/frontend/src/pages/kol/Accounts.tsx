import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { styled } from '@mui/material/styles';

// Icons
import TikTokIcon from '@mui/icons-material/VideoLibrary';
import YouTubeIcon from '@mui/icons-material/YouTube';
import InstagramIcon from '@mui/icons-material/PhotoCamera';
import AddIcon from '@mui/icons-material/Add';
import SyncIcon from '@mui/icons-material/Sync';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';

// Types
import type { KolAccount } from '../../stores/kolStore';

// Services
import { kolAccountAPI } from '../../services/kolApi';

// Styled Components
const PlatformIconWrapper = styled(Box)(({ theme }) => ({
  width: 48,
  height: 48,
  borderRadius: 12,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: theme.spacing(2),
}));

const AccountCard = styled(Card)(({ theme }) => ({
  height: '100%',
  transition: 'transform 0.2s, box-shadow 0.2s',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
  },
}));

// Query keys
const queryKeys = {
  accounts: 'accounts',
};

// Platform configurations
const platformConfig: Record<string, { icon: React.ComponentType<{ fontSize?: 'small' | 'medium' | 'large' }>; color: string; label: string }> = {
  tiktok: { icon: TikTokIcon, color: '#000000', label: 'TikTok' },
  youtube: { icon: YouTubeIcon, color: '#FF0000', label: 'YouTube' },
  instagram: { icon: InstagramIcon, color: '#E4405F', label: 'Instagram' },
};

export const AccountsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [bindDialogOpen, setBindDialogOpen] = useState(false);
  const [unbindDialogOpen, setUnbindDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<KolAccount | null>(null);
  const [bindForm, setBindForm] = useState({
    platform: 'tiktok',
    platformUsername: '',
    authorizationCode: '',
  });

  // Fetch accounts
  const {
    data: accounts,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [queryKeys.accounts],
    queryFn: kolAccountAPI.getAccounts,
    retry: 1,
  });

  // Bind account mutation
  const bindMutation = useMutation({
    mutationFn: kolAccountAPI.bindAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeys.accounts] });
      setBindDialogOpen(false);
      setBindForm({ platform: 'tiktok', platformUsername: '', authorizationCode: '' });
    },
  });

  // Unbind account mutation
  const unbindMutation = useMutation({
    mutationFn: kolAccountAPI.unbindAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeys.accounts] });
      setUnbindDialogOpen(false);
      setSelectedAccount(null);
    },
  });

  // Sync account mutation
  const syncMutation = useMutation({
    mutationFn: kolAccountAPI.syncAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeys.accounts] });
    },
  });

  // Sync all accounts mutation
  const syncAllMutation = useMutation({
    mutationFn: kolAccountAPI.syncAllAccounts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeys.accounts] });
    },
  });

  const handleBindAccount = () => {
    bindMutation.mutate(bindForm);
  };

  const handleUnbindAccount = () => {
    if (selectedAccount) {
      unbindMutation.mutate(selectedAccount.id);
    }
  };

  const handleSyncAccount = (accountId: string) => {
    syncMutation.mutate(accountId);
  };

  const handleSyncAll = () => {
    syncAllMutation.mutate();
  };

  const openBindDialog = () => {
    setBindDialogOpen(true);
  };

  const openUnbindDialog = (account: KolAccount) => {
    setSelectedAccount(account);
    setUnbindDialogOpen(true);
  };

  const getPlatformIcon = (platform: string) => {
    const config = platformConfig[platform.toLowerCase()] || platformConfig.tiktok;
    const IconComponent = config.icon;
    return <Box sx={{ color: config.color, display: 'inline-flex' }}><IconComponent fontSize="medium" /></Box>;
  };

  const getStatusChip = (status: KolAccount['status']) => {
    const config: Record<string, { label: string; color: 'success' | 'warning' | 'error'; icon: React.ReactNode }> = {
      active: { label: '已连接', color: 'success', icon: <CheckCircleIcon fontSize="small" /> },
      pending: { label: '待验证', color: 'warning', icon: <WarningIcon fontSize="small" /> },
      disconnected: { label: '已断开', color: 'error', icon: <ErrorIcon fontSize="small" /> },
    };
    const { label, color, icon } = config[status] || config.disconnected;
    return <Chip icon={icon as React.ReactElement} label={label} size="small" color={color} />;
  };

  const formatNumber = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };

  if (isLoading) {
    return <LinearProgress />;
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        加载账号列表失败，请稍后重试
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 4,
        }}
      >
        <Box>
          <Typography variant="h4" gutterBottom>
            账号绑定
          </Typography>
          <Typography variant="body1" color="text.secondary">
            管理您的社交媒体账号，同步数据以接收更多任务
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<SyncIcon />}
            onClick={handleSyncAll}
            disabled={syncAllMutation.isPending || !accounts?.length}
          >
            同步全部
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openBindDialog}
          >
            绑定新账号
          </Button>
        </Box>
      </Box>

      {/* Accounts Grid */}
      {accounts && accounts.length > 0 ? (
        <Grid container spacing={3}>
          {accounts.map((account) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={account.id}>
              <AccountCard>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                    <PlatformIconWrapper
                      sx={{
                        bgcolor: `${platformConfig[account.platform.toLowerCase()]?.color}15`,
                      }}
                    >
                      {getPlatformIcon(account.platform)}
                    </PlatformIconWrapper>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {account.platformDisplayName}
                        </Typography>
                        {getStatusChip(account.status)}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        @{account.platformUsername}
                      </Typography>
                    </Box>
                  </Box>

                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        粉丝数
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {formatNumber(account.followers)}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        互动率
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {account.engagementRate.toFixed(2)}%
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        平均播放
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {formatNumber(account.avgViews)}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        平均点赞
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {formatNumber(account.avgLikes)}
                      </Typography>
                    </Grid>
                  </Grid>

                  {account.lastSyncAt && (
                    <Typography variant="caption" color="text.secondary">
                      最后同步：{new Date(account.lastSyncAt).toLocaleString('zh-CN')}
                    </Typography>
                  )}
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
                  <Button
                    size="small"
                    startIcon={<SyncIcon />}
                    onClick={() => handleSyncAccount(account.id)}
                    disabled={syncMutation.isPending}
                  >
                    同步
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => openUnbindDialog(account)}
                  >
                    解绑
                  </Button>
                </CardActions>
              </AccountCard>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Card>
          <CardContent>
            <Box
              sx={{
                textAlign: 'center',
                py: 6,
              }}
            >
              <TikTokIcon sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                暂无绑定账号
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                绑定您的社交媒体账号以开始接收任务
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={openBindDialog}
              >
                绑定新账号
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Bind Dialog */}
      <Dialog open={bindDialogOpen} onClose={() => setBindDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>绑定新账号</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <FormControl fullWidth>
              <InputLabel>平台</InputLabel>
              <Select
                value={bindForm.platform}
                label="平台"
                onChange={(e) => setBindForm({ ...bindForm, platform: e.target.value })}
              >
                <MenuItem value="tiktok">TikTok</MenuItem>
                <MenuItem value="youtube">YouTube</MenuItem>
                <MenuItem value="instagram">Instagram</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="平台用户名"
              value={bindForm.platformUsername}
              onChange={(e) => setBindForm({ ...bindForm, platformUsername: e.target.value })}
              fullWidth
              placeholder="请输入您的平台用户名"
            />

            <TextField
              label="授权码（可选）"
              value={bindForm.authorizationCode}
              onChange={(e) => setBindForm({ ...bindForm, authorizationCode: e.target.value })}
              fullWidth
              placeholder="部分平台需要授权码"
            />

            <Alert severity="info">
              绑定账号后，系统将自动同步您的账号数据，用于匹配适合您的任务。
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBindDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleBindAccount}
            disabled={bindMutation.isPending || !bindForm.platformUsername}
          >
            {bindMutation.isPending ? '绑定中...' : '确认绑定'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Unbind Dialog */}
      <Dialog open={unbindDialogOpen} onClose={() => setUnbindDialogOpen(false)}>
        <DialogTitle>确认解绑</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography>
              确定要解绑账号 <strong>{selectedAccount?.platformDisplayName}</strong> 吗？
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              解绑后，该账号的数据将不再同步，您将无法接收需要该平台的任务。
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnbindDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleUnbindAccount}
            disabled={unbindMutation.isPending}
          >
            {unbindMutation.isPending ? '解绑中...' : '确认解绑'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AccountsPage;
