import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAdvertiserAPI } from '../../services/adminApi';
import { getApiErrorMessage } from '../../utils/apiError';
import { ADMIN_ROUTE_SEG, pathAdmin } from '../../constants/appPaths';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';

import { AdminHubNav } from '../../components/admin/AdminHubNav';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import WbSunnyIcon from '@mui/icons-material/WbSunny';

const formatCurrency = (n: number) =>
  `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const AdminAdvertiserDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [freezeOpen, setFreezeOpen] = useState(false);
  const [unfreezeOpen, setUnfreezeOpen] = useState(false);
  const [freezeReason, setFreezeReason] = useState('');
  const [unfreezeReason, setUnfreezeReason] = useState('');

  const { data: adv, isLoading, error, refetch } = useQuery({
    queryKey: ['adminAdvertiser', id],
    queryFn: () => adminAdvertiserAPI.getAdvertiser(id!),
    enabled: Boolean(id),
  });

  const handleHubRefresh = () => {
    void refetch();
  };

  const verifyMutation = useMutation({
    mutationFn: (payload: { action: 'approve' | 'reject'; rejection_reason?: string }) =>
      adminAdvertiserAPI.verifyAdvertiser(id!, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['adminAdvertiser', id] });
      void queryClient.invalidateQueries({ queryKey: ['adminAdvertisers'] });
      setRejectOpen(false);
      setRejectReason('');
    },
  });

  const freezeMutation = useMutation({
    mutationFn: () => adminAdvertiserAPI.freezeAccount(id!, { reason: freezeReason.trim() }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['adminAdvertiser', id] });
      void queryClient.invalidateQueries({ queryKey: ['adminAdvertisers'] });
      setFreezeOpen(false);
      setFreezeReason('');
    },
  });

  const unfreezeMutation = useMutation({
    mutationFn: () => adminAdvertiserAPI.unfreezeAccount(id!, { reason: unfreezeReason.trim() }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['adminAdvertiser', id] });
      void queryClient.invalidateQueries({ queryKey: ['adminAdvertisers'] });
      setUnfreezeOpen(false);
      setUnfreezeReason('');
    },
  });

  if (!id) {
    return <Alert severity="warning">缺少广告主 ID</Alert>;
  }

  if (isLoading) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(pathAdmin(ADMIN_ROUTE_SEG.advertisers))} sx={{ mb: 2 }}>
          返回广告主列表
        </Button>
        <AdminHubNav onRefresh={handleHubRefresh} />
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  if (error || !adv) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(pathAdmin(ADMIN_ROUTE_SEG.advertisers))} sx={{ mb: 2 }}>
          返回列表
        </Button>
        <AdminHubNav onRefresh={handleHubRefresh} />
        <Alert severity="error" sx={{ mb: 2 }}>
          {error
            ? getApiErrorMessage(error, '加载广告主失败')
            : '广告主不存在'}
        </Alert>
      </Box>
    );
  }

  const pending = adv.verificationStatus === 'pending';
  const stats = adv.statistics;

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(pathAdmin(ADMIN_ROUTE_SEG.advertisers))} sx={{ mb: 2 }}>
        返回广告主列表
      </Button>
      <AdminHubNav onRefresh={handleHubRefresh} />
      <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
        刷新将重新拉取本广告主详情与统计；可通过上方快捷入口跳转订单、活动、财务等模块。
      </Alert>

      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
        <Typography variant="h4" fontWeight="bold">
          {adv.companyName}
        </Typography>
        <Chip label={adv.verificationStatus} color={adv.verificationStatus === 'approved' ? 'success' : 'default'} />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        ID：{adv.id}
      </Typography>

      {pending && (
        <Card sx={{ mb: 3, borderColor: 'warning.main', borderWidth: 1, borderStyle: 'solid' }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              资质待审核
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircleIcon />}
                disabled={verifyMutation.isPending}
                onClick={() => verifyMutation.mutate({ action: 'approve' })}
              >
                通过
              </Button>
              <Button variant="outlined" color="error" startIcon={<CancelIcon />} onClick={() => setRejectOpen(true)}>
                拒绝
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                账户资金
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2">可用余额：{formatCurrency(adv.walletBalance ?? 0)}</Typography>
              <Typography variant="body2">账户冻结：{formatCurrency(adv.frozenBalance ?? 0)}</Typography>
              <Typography variant="body2" color={(adv.ordersFrozenTotal ?? 0) > 0 ? 'info.main' : 'text.secondary'}>
                订单冻结（全活动）：{formatCurrency(adv.ordersFrozenTotal ?? 0)}
              </Typography>
              <Typography variant="body2">累计充值：{formatCurrency(adv.totalRecharged)}</Typography>
              <Typography variant="body2">累计消耗：{formatCurrency(adv.totalSpent)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                联系与业务
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2">联系人：{adv.contactPerson ?? '—'}</Typography>
              <Typography variant="body2">电话：{adv.contactPhone || '—'}</Typography>
              <Typography variant="body2">邮箱：{adv.contactEmail}</Typography>
              <Typography variant="body2">行业：{adv.industry ?? '—'}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                统计
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2">活动：{stats?.totalCampaigns ?? 0}（进行中 {stats?.activeCampaigns ?? 0}）</Typography>
              <Typography variant="body2">订单：{stats?.totalOrders ?? 0}（已完成 {stats?.completedOrders ?? 0}）</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                风控操作
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Button
                  variant="outlined"
                  color="info"
                  startIcon={<AcUnitIcon />}
                  onClick={() => setFreezeOpen(true)}
                  disabled={freezeMutation.isPending}
                >
                  冻结账户
                </Button>
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<WbSunnyIcon />}
                  onClick={() => setUnfreezeOpen(true)}
                  disabled={unfreezeMutation.isPending}
                >
                  解冻账户
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={rejectOpen} onClose={() => !verifyMutation.isPending && setRejectOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>拒绝认证</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            minRows={3}
            label="原因"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectOpen(false)}>取消</Button>
          <Button
            color="error"
            variant="contained"
            disabled={verifyMutation.isPending || !rejectReason.trim()}
            onClick={() => verifyMutation.mutate({ action: 'reject', rejection_reason: rejectReason.trim() })}
          >
            确认
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={freezeOpen} onClose={() => !freezeMutation.isPending && setFreezeOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>冻结账户</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            minRows={2}
            label="原因"
            value={freezeReason}
            onChange={(e) => setFreezeReason(e.target.value)}
            sx={{ mt: 1 }}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFreezeOpen(false)}>取消</Button>
          <Button
            variant="contained"
            disabled={freezeMutation.isPending || !freezeReason.trim()}
            onClick={() => freezeMutation.mutate()}
          >
            确认冻结
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={unfreezeOpen} onClose={() => !unfreezeMutation.isPending && setUnfreezeOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>解冻账户</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            minRows={2}
            label="原因"
            value={unfreezeReason}
            onChange={(e) => setUnfreezeReason(e.target.value)}
            sx={{ mt: 1 }}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnfreezeOpen(false)}>取消</Button>
          <Button
            variant="contained"
            disabled={unfreezeMutation.isPending || !unfreezeReason.trim()}
            onClick={() => unfreezeMutation.mutate()}
          >
            确认解冻
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminAdvertiserDetailPage;
