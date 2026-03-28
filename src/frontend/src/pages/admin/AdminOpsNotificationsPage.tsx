import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import LinearProgress from '@mui/material/LinearProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import { adminDashboardAPI, adminCampaignAPI } from '../../services/adminApi';
import { AdminHubNav } from '../../components/admin/AdminHubNav';
import {
  ADMIN_ROUTE_SEG,
  pathAdmin,
  pathAdminCampaignAnomalies,
  pathAdminFinanceWithdrawals,
} from '../../constants/appPaths';
import { getApiErrorMessage } from '../../utils/apiError';

function formatCurrency(n: number): string {
  return `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const AdminOpsNotificationsPage: React.FC = () => {
  const { data: stats, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['adminDashboardStats'],
    queryFn: () => adminDashboardAPI.getStats({ period: 'today' }),
  });

  const { data: abnormalBrief, refetch: refetchAbnormal } = useQuery({
    queryKey: ['adminAbnormalCampaignsCount'],
    queryFn: () => adminCampaignAPI.getAbnormalCampaigns({ page: 1, page_size: 1 }),
  });
  const abnormalTotal = abnormalBrief?.pagination?.total ?? 0;

  const { data: kolFreqPolicy, refetch: refetchKolFreq } = useQuery({
    queryKey: ['adminKolFrequencyPolicy'],
    queryFn: () => adminDashboardAPI.getKolFrequencyPolicy(),
  });

  const pendingCampaign = stats?.campaigns?.pendingReview ?? 0;
  const pendingKol = stats?.kol?.pendingVerification ?? 0;
  const pendingContent = stats?.content?.pendingReview ?? 0;
  const pendingWdCount = stats?.finance?.pendingWithdrawalCount ?? 0;
  const pendingWdAmount = stats?.finance?.pendingWithdrawals ?? 0;
  const pendingDisputes = stats?.orders?.pendingDisputes ?? 0;
  const disputedOrders = stats?.orders?.disputed ?? 0;
  const budgetRiskCount = stats?.campaigns?.budgetRiskCount ?? 0;
  const budgetRiskTh = stats?.campaigns?.budgetRiskThreshold ?? 0.85;

  const items = [
    {
      key: 'campaign',
      title: '待审核活动',
      count: pendingCampaign,
      desc: '广告主提交、待平台审核上线',
      to: pathAdmin(ADMIN_ROUTE_SEG.campaigns),
      color: '#1976D2',
    },
    {
      key: 'kol',
      title: '待审核 KOL',
      count: pendingKol,
      desc: '新入驻或资质待审',
      to: pathAdmin(ADMIN_ROUTE_SEG.kolReview),
      color: '#ED6C02',
    },
    {
      key: 'content',
      title: '待审核内容',
      count: pendingContent,
      desc: '内容安全与合规审核',
      to: pathAdmin(ADMIN_ROUTE_SEG.contentReview),
      color: '#9C27B0',
    },
    {
      key: 'budgetRisk',
      title: '预算占用预警',
      count: budgetRiskCount,
      desc: `进行中/已暂停活动，消耗/预算 ≥ ${(budgetRiskTh * 100).toFixed(0)}%（与 Cron 同源）`,
      to: `${pathAdmin(ADMIN_ROUTE_SEG.campaigns)}#budget-risk`,
      color: '#f57c00',
    },
    {
      key: 'disputes',
      title: '纠纷待办',
      count: pendingDisputes,
      desc:
        pendingDisputes > 0 || disputedOrders > 0
          ? `纠纷中订单 ${disputedOrders} 单；未结案工单 ${pendingDisputes} 笔`
          : '无未结案纠纷',
      to: `${pathAdmin(ADMIN_ROUTE_SEG.orders)}?tab=disputes`,
      color: '#b71c1c',
    },
    {
      key: 'wd',
      title: '待处理提现',
      count: pendingWdCount,
      desc: pendingWdCount > 0 ? `待打款合计 ${formatCurrency(pendingWdAmount)}` : '无待处理提现',
      to: pathAdminFinanceWithdrawals(),
      color: '#2E7D32',
    },
    {
      key: 'anomaly',
      title: '活动异常巡检',
      count: abnormalTotal,
      desc: '规则与订单维度巡检项',
      to: pathAdminCampaignAnomalies(),
      color: '#c62828',
    },
  ];

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        运营待办中心
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        数据来自管理端聚合接口；与顶栏铃铛一致，可点击跳转处理。
      </Typography>
      <AdminHubNav
        onRefresh={() => {
          void refetch();
          void refetchAbnormal();
          void refetchKolFreq();
        }}
      />
      {isLoading && <LinearProgress sx={{ my: 2 }} />}
      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {getApiErrorMessage(error, '加载待办失败')}
        </Alert>
      )}
      <Grid container spacing={3} sx={{ mt: 1 }}>
        {items.map((it) => (
          <Grid key={it.key} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card variant="outlined" sx={{ height: '100%', borderLeft: 4, borderLeftColor: it.color }}>
              <CardContent>
                <Stack spacing={1.5}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {it.title}
                    </Typography>
                    <Chip
                      label={it.count}
                      size="small"
                      color={it.count > 0 ? 'error' : 'default'}
                      variant={it.count > 0 ? 'filled' : 'outlined'}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {it.desc}
                  </Typography>
                  <Button component={RouterLink} to={it.to} variant="contained" size="small" sx={{ mt: 1 }}>
                    去处理
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {kolFreqPolicy && (
        <Card variant="outlined" sx={{ mt: 3, borderLeft: 4, borderLeftColor: 'primary.main' }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              KOL 接单滚动窗口（治理）
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              与 KOL 端接单接口一致；调整需改部署环境变量并重启后端。
            </Typography>
            <Typography variant="body2" component="div">
              状态：{kolFreqPolicy.enabled ? '已启用' : '已关闭'}；窗口 {kolFreqPolicy.rolling_days} 日；上限{' '}
              {kolFreqPolicy.max_accepts} 单/窗口。
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              {kolFreqPolicy.env_keys.join('、')}
            </Typography>
            <Button component={RouterLink} to={pathAdmin(ADMIN_ROUTE_SEG.settings)} variant="outlined" size="small" sx={{ mt: 2 }}>
              系统设置
            </Button>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default AdminOpsNotificationsPage;
