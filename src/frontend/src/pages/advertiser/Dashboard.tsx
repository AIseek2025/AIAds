import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { styled } from '@mui/material/styles';

// Icons
import AddIcon from '@mui/icons-material/Add';
import PeopleIcon from '@mui/icons-material/People';
import CampaignIcon from '@mui/icons-material/Campaign';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

// Types
import type { Campaign } from '../../types';

// Stores
import { useAuthStore } from '../../stores/authStore';
import { useAdvertiserStore } from '../../stores/advertiserStore';

// Services
import {
  advertiserAPI,
  advertiserBalanceQueryKey,
  advertiserProfileQueryKey,
  campaignAPI,
  orderAPI,
} from '../../services/advertiserApi';
import { getApiErrorMessage } from '../../utils/apiError';
import { advertiserOrderFrozenCny, advertiserOrderGrossSpendCny } from '../../utils/advertiserOrderGross';
import { AdvertiserHubNav } from '../../components/advertiser/AdvertiserHubNav';
import { AdvertiserLowBalanceAlert } from '../../components/advertiser/AdvertiserLowBalanceAlert';
import { AdvertiserBudgetRiskBanner } from '../../components/advertiser/AdvertiserBudgetRiskBanner';
import {
  ADVERTISER_ROUTE_SEG,
  pathAdvertiser,
  pathAdvertiserCampaign,
  pathAdvertiserOrder,
} from '../../constants/appPaths';
import { usePublicUiConfig } from '../../hooks/usePublicUiConfig';

// Styled Components
const StatCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.2s, box-shadow 0.2s',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
  },
}));

const QuickActionCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(3),
  cursor: 'pointer',
  transition: 'all 0.2s',
  '&:hover': {
    backgroundColor: theme.palette.primary.light,
    '& .quick-action-icon': {
      transform: 'scale(1.1)',
    },
  },
}));

const StatIconWrapper = styled(Box)(({ theme }) => ({
  width: 56,
  height: 56,
  borderRadius: 12,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: theme.spacing(2),
}));

// Query keys
const queryKeys = {
  advertiser: 'advertiser',
  campaigns: 'campaigns',
  recentOrders: 'dashboard-recent-orders',
};

const ORDER_STATUS_SHORT: Record<string, string> = {
  pending: '待确认',
  accepted: '已接受',
  in_progress: '进行中',
  submitted: '已提交',
  approved: '已批准',
  published: '已发布',
  completed: '已完成',
  rejected: '已拒绝',
  cancelled: '已取消',
  disputed: '纠纷',
  revision: '待修改',
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { setAdvertiser, setStats } = useAdvertiserStore();

  // Fetch advertiser profile
  const {
    data: advertiser,
    isLoading: isAdvertiserLoading,
    error: advertiserError,
    refetch: refetchAdvertiser,
  } = useQuery({
    queryKey: [...advertiserProfileQueryKey],
    queryFn: advertiserAPI.getProfile,
    retry: 1,
  });

  // Fetch campaigns
  const {
    data: campaignsData,
    isLoading: isCampaignsLoading,
    refetch: refetchCampaigns,
  } = useQuery({
    queryKey: [queryKeys.campaigns],
    queryFn: () =>
      campaignAPI.getCampaigns({ page: 1, page_size: 5, status: 'active' }),
    retry: 1,
  });

  const {
    data: recentOrdersData,
    isLoading: isRecentOrdersLoading,
    refetch: refetchRecentOrders,
  } = useQuery({
    queryKey: [queryKeys.recentOrders],
    queryFn: () => orderAPI.getOrders({ page: 1, page_size: 5 }),
    retry: 1,
  });

  const {
    data: balance,
    refetch: refetchBalance,
  } = useQuery({
    queryKey: [...advertiserBalanceQueryKey],
    queryFn: advertiserAPI.getBalance,
    retry: 1,
  });

  const { data: budgetWatchData, refetch: refetchBudgetWatch } = useQuery({
    queryKey: ['advertiser-dashboard-budget-watch'],
    queryFn: () => campaignAPI.getCampaigns({ page: 1, page_size: 50, status: 'active' }),
    retry: 1,
  });

  const { data: publicUi } = usePublicUiConfig();
  const budgetRiskTh = publicUi?.budget_risk_threshold ?? 0.85;

  const budgetHighUseCampaigns = React.useMemo(() => {
    const items = budgetWatchData?.items ?? [];
    return items.filter((c) => {
      const b = Number(c.budget) || 0;
      const s = Number(c.spentAmount ?? 0) || 0;
      return b > 0 && s / b >= budgetRiskTh;
    });
  }, [budgetWatchData, budgetRiskTh]);

  // Update store when data changes
  React.useEffect(() => {
    if (advertiser) {
      setAdvertiser(advertiser);
      setStats({
        totalCampaigns: advertiser.totalCampaigns || 0,
        activeCampaigns: advertiser.activeCampaigns || 0,
        totalOrders: advertiser.totalOrders || 0,
        totalSpent: advertiser.totalSpent || 0,
        totalViews: 0,
        totalClicks: 0,
        totalConversions: 0,
      });
    }
  }, [advertiser, setAdvertiser, setStats]);

  const handleRefresh = () => {
    refetchAdvertiser();
    void refetchBalance();
    refetchCampaigns();
    void refetchRecentOrders();
    void refetchBudgetWatch();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(value);
  };

  const orderSpend = (raw: Record<string, unknown>) => advertiserOrderGrossSpendCny(raw);

  const orderFrozen = (raw: Record<string, unknown>) => advertiserOrderFrozenCny(raw);

  const getStatusLabel = (status: Campaign['status']) => {
    const labels = {
      draft: '草稿',
      active: '进行中',
      paused: '已暂停',
      completed: '已完成',
      cancelled: '已取消',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: Campaign['status']) => {
    const colors = {
      draft: 'default',
      active: 'success',
      paused: 'warning',
      completed: 'info',
      cancelled: 'error',
    } as const;
    return colors[status] || 'default';
  };

  if (isAdvertiserLoading) {
    return <LinearProgress />;
  }

  if (advertiserError) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {getApiErrorMessage(advertiserError, '加载广告主信息失败，请稍后重试')}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 2,
          mb: 2,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h4" gutterBottom>
            欢迎回来，{user?.nickname || advertiser?.companyName || '广告主'}！
          </Typography>
          <Typography variant="body1" color="text.secondary">
            这是您的广告主仪表盘，查看您的投放数据和快速操作
          </Typography>
        </Box>
        <AdvertiserHubNav preset="dashboard-page" onRefresh={handleRefresh} />
      </Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        本页汇总账户余额与投放概况；订单明细、CPM 拆分与确认完成请前往订单中心或活动详情。
      </Alert>
      <AdvertiserLowBalanceAlert balance={balance} publicUi={publicUi} context="dashboard" sx={{ mb: 3 }} />
      <AdvertiserBudgetRiskBanner
        mode="dashboard"
        budgetRiskTh={budgetRiskTh}
        campaigns={budgetHighUseCampaigns}
        formatCurrency={formatCurrency}
        onViewCampaign={(id) => navigate(pathAdvertiserCampaign(id))}
      />

      {/* Balance Card */}
      <Card sx={{ mb: 4, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid size={{ xs: 12, md: 8 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    bgcolor: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AttachMoneyIcon sx={{ fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    可用余额
                  </Typography>
                  <Typography variant="h3">
                    {formatCurrency(
                      balance?.wallet_balance ?? advertiser?.walletBalance ?? 0
                    )}
                  </Typography>
                  {(balance?.frozen_balance ?? advertiser?.frozenBalance ?? 0) > 0 && (
                    <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
                      账户冻结 {formatCurrency(balance?.frozen_balance ?? advertiser?.frozenBalance ?? 0)}
                    </Typography>
                  )}
                  {(advertiser?.ordersFrozenTotal ?? 0) > 0 && (
                    <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
                      订单冻结（全活动）{formatCurrency(advertiser.ordersFrozenTotal ?? 0)}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate(pathAdvertiser(ADVERTISER_ROUTE_SEG.recharge))}
                sx={{
                  bgcolor: 'white',
                  color: 'primary.main',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
                }}
                startIcon={<AddIcon />}
              >
                立即充值
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard>
            <CardContent>
              <StatIconWrapper sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
                <CampaignIcon sx={{ fontSize: 32 }} />
              </StatIconWrapper>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                总活动数
              </Typography>
              <Typography variant="h4">
                {advertiser?.totalCampaigns || 0}
              </Typography>
            </CardContent>
          </StatCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard>
            <CardContent>
              <StatIconWrapper sx={{ bgcolor: 'success.light', color: 'success.main' }}>
                <TrendingUpIcon sx={{ fontSize: 32 }} />
              </StatIconWrapper>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                进行中活动
              </Typography>
              <Typography variant="h4">
                {advertiser?.activeCampaigns || 0}
              </Typography>
            </CardContent>
          </StatCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard>
            <CardContent>
              <StatIconWrapper sx={{ bgcolor: 'info.light', color: 'info.main' }}>
                <ReceiptLongIcon sx={{ fontSize: 32 }} />
              </StatIconWrapper>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                合作订单
              </Typography>
              <Typography variant="h4">
                {advertiser?.totalOrders || 0}
              </Typography>
            </CardContent>
          </StatCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard>
            <CardContent>
              <StatIconWrapper sx={{ bgcolor: 'warning.light', color: 'warning.main' }}>
                <TrendingUpIcon sx={{ fontSize: 32 }} />
              </StatIconWrapper>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                累计消费
              </Typography>
              <Typography variant="h4">
                {formatCurrency(advertiser?.totalSpent || 0)}
              </Typography>
            </CardContent>
          </StatCard>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        快速入口
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <QuickActionCard onClick={() => navigate(pathAdvertiser(ADVERTISER_ROUTE_SEG.campaignsCreate))}>
            <Box
              className="quick-action-icon"
              sx={{
                width: 64,
                height: 64,
                borderRadius: 3,
                bgcolor: 'primary.light',
                color: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
                transition: 'transform 0.2s',
              }}
            >
              <AddIcon sx={{ fontSize: 32 }} />
            </Box>
            <Typography variant="subtitle2" align="center">
              创建活动
            </Typography>
            <Typography variant="caption" color="text.secondary">
              快速创建新的广告投放活动
            </Typography>
          </QuickActionCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <QuickActionCard onClick={() => navigate(pathAdvertiser(ADVERTISER_ROUTE_SEG.kols))}>
            <Box
              className="quick-action-icon"
              sx={{
                width: 64,
                height: 64,
                borderRadius: 3,
                bgcolor: 'secondary.light',
                color: 'secondary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
                transition: 'transform 0.2s',
              }}
            >
              <PeopleIcon sx={{ fontSize: 32 }} />
            </Box>
            <Typography variant="subtitle2" align="center">
              发现 KOL
            </Typography>
            <Typography variant="caption" color="text.secondary">
              寻找合适的 KOL 进行合作
            </Typography>
          </QuickActionCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <QuickActionCard onClick={() => navigate(pathAdvertiser(ADVERTISER_ROUTE_SEG.campaigns))}>
            <Box
              className="quick-action-icon"
              sx={{
                width: 64,
                height: 64,
                borderRadius: 3,
                bgcolor: 'success.light',
                color: 'success.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
                transition: 'transform 0.2s',
              }}
            >
              <CampaignIcon sx={{ fontSize: 32 }} />
            </Box>
            <Typography variant="subtitle2" align="center">
              活动管理
            </Typography>
            <Typography variant="caption" color="text.secondary">
              查看和管理所有活动
            </Typography>
          </QuickActionCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <QuickActionCard onClick={() => navigate(pathAdvertiser(ADVERTISER_ROUTE_SEG.orders))}>
            <Box
              className="quick-action-icon"
              sx={{
                width: 64,
                height: 64,
                borderRadius: 3,
                bgcolor: 'warning.light',
                color: 'warning.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
                transition: 'transform 0.2s',
              }}
            >
              <ReceiptLongIcon sx={{ fontSize: 32 }} />
            </Box>
            <Typography variant="subtitle2" align="center">
              订单中心
            </Typography>
            <Typography variant="caption" color="text.secondary">
              查看订单、CPM 明细与确认完成
            </Typography>
          </QuickActionCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <QuickActionCard onClick={() => navigate(pathAdvertiser(ADVERTISER_ROUTE_SEG.analytics))}>
            <Box
              className="quick-action-icon"
              sx={{
                width: 64,
                height: 64,
                borderRadius: 3,
                bgcolor: 'info.light',
                color: 'info.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
                transition: 'transform 0.2s',
              }}
            >
              <TrendingUpIcon sx={{ fontSize: 32 }} />
            </Box>
            <Typography variant="subtitle2" align="center">
              数据分析
            </Typography>
            <Typography variant="caption" color="text.secondary">
              查看详细投放数据
            </Typography>
          </QuickActionCard>
        </Grid>
      </Grid>

      {/* Recent orders — 与订单中心、活动详情同一数据源 */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography variant="h6">最近订单</Typography>
            <Button endIcon={<ArrowForwardIcon />} onClick={() => navigate(pathAdvertiser(ADVERTISER_ROUTE_SEG.orders))}>
              订单中心
            </Button>
          </Box>
          {isRecentOrdersLoading ? (
            <LinearProgress />
          ) : (recentOrdersData?.items?.length ?? 0) > 0 ? (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>KOL / 活动</TableCell>
                    <TableCell>状态</TableCell>
                    <TableCell align="right">应付/预估</TableCell>
                    <TableCell align="right" title="单笔订单冻结预算">
                      冻结
                    </TableCell>
                    <TableCell align="right">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(recentOrdersData!.items as Record<string, unknown>[]).map((row) => {
                    const id = String(row.id ?? '');
                    const kol = row.kol as
                      | {
                          platform_display_name?: string | null;
                          platform_username?: string;
                        }
                      | undefined;
                    const kolLabel =
                      kol?.platform_display_name || kol?.platform_username || id.slice(0, 8);
                    const title = String(row.campaign_title ?? '—');
                    const st = String(row.status ?? '');
                    return (
                      <TableRow key={id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {kolLabel}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {title}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={ORDER_STATUS_SHORT[st] ?? st} variant="outlined" />
                        </TableCell>
                        <TableCell align="right">{formatCurrency(orderSpend(row))}</TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            color={orderFrozen(row) > 0 ? 'text.primary' : 'text.secondary'}
                          >
                            {orderFrozen(row) > 0 ? formatCurrency(orderFrozen(row)) : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Button size="small" onClick={() => navigate(pathAdvertiserOrder(id))}>
                            详情
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body2" color="text.secondary">
              暂无订单。请前往「发现 KOL」发起合作。
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Recent Campaigns */}
      <Card>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 3,
            }}
          >
            <Typography variant="h6">最近活动</Typography>
            <Button
              endIcon={<ArrowForwardIcon />}
              onClick={() => navigate(pathAdvertiser(ADVERTISER_ROUTE_SEG.campaigns))}
            >
              查看全部
            </Button>
          </Box>

          {isCampaignsLoading ? (
            <LinearProgress />
          ) : campaignsData?.items && campaignsData.items.length > 0 ? (
            <Grid container spacing={2}>
              {campaignsData.items.map((campaign: Campaign) => (
                <Grid size={{ xs: 12 }} key={campaign.id}>
                  <Card
                    variant="outlined"
                    sx={{
                      cursor: 'pointer',
                      transition: 'box-shadow 0.2s',
                      '&:hover': {
                        boxShadow: 4,
                      },
                    }}
                    onClick={() =>
                      navigate(pathAdvertiserCampaign(campaign.id))
                    }
                  >
                    <CardContent>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                        }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {campaign.title}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 1, mb: 2 }}
                          >
                            {campaign.description || '暂无描述'}
                          </Typography>
                          <Stack direction="row" spacing={2} flexWrap="wrap">
                            <Chip
                              label={getStatusLabel(campaign.status)}
                              size="small"
                              color={getStatusColor(campaign.status)}
                            />
                            <Typography variant="body2" color="text.secondary">
                              预算：{formatCurrency(campaign.budget)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              开始：{new Date(campaign.startDate).toLocaleDateString('zh-CN')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              结束：{new Date(campaign.endDate).toLocaleDateString('zh-CN')}
                            </Typography>
                          </Stack>
                        </Box>
                        <Box
                          sx={{
                            textAlign: 'right',
                            minWidth: 120,
                          }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            KOL 数
                          </Typography>
                          <Typography variant="h6" color="primary">
                            {campaign.totalKols || 0}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Box
              sx={{
                textAlign: 'center',
                py: 6,
              }}
            >
              <CampaignIcon sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                暂无活动
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                创建您的第一个广告投放活动吧！
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate(pathAdvertiser(ADVERTISER_ROUTE_SEG.campaignsCreate))}
              >
                创建活动
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default DashboardPage;
