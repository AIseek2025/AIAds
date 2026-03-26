import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
import { styled } from '@mui/material/styles';

// Icons
import AddIcon from '@mui/icons-material/Add';
import PeopleIcon from '@mui/icons-material/People';
import CampaignIcon from '@mui/icons-material/Campaign';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import RefreshIcon from '@mui/icons-material/Refresh';

// Types
import type { Campaign } from '../../types';

// Stores
import { useAuthStore } from '../../stores/authStore';
import { useAdvertiserStore } from '../../stores/advertiserStore';

// Services
import { advertiserAPI, campaignAPI } from '../../services/advertiserApi';

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
  stats: 'stats',
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
    queryKey: [queryKeys.advertiser],
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

  // Update store when data changes
  React.useEffect(() => {
    if (advertiser) {
      setAdvertiser(advertiser);
      setStats({
        totalCampaigns: advertiser.totalCampaigns || 0,
        activeCampaigns: advertiser.activeCampaigns || 0,
        completedCampaigns: advertiser.totalOrders || 0,
        totalSpent: advertiser.totalSpent || 0,
        totalViews: 0,
        totalClicks: 0,
        totalConversions: 0,
      });
    }
  }, [advertiser, setAdvertiser, setStats]);

  const handleRefresh = () => {
    refetchAdvertiser();
    refetchCampaigns();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(value);
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
        加载广告主信息失败，请稍后重试
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
            欢迎回来，{user?.nickname || advertiser?.companyName || '广告主'}！
          </Typography>
          <Typography variant="body1" color="text.secondary">
            这是您的广告主仪表盘，查看您的投放数据和快速操作
          </Typography>
        </Box>
        <IconButton onClick={handleRefresh} color="primary">
          <RefreshIcon />
        </IconButton>
      </Box>

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
                    账户余额
                  </Typography>
                  <Typography variant="h3">
                    {formatCurrency(advertiser?.walletBalance || 0)}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/advertiser/recharge')}
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
                <CheckCircleIcon sx={{ fontSize: 32 }} />
              </StatIconWrapper>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                已完成活动
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
                <VisibilityIcon sx={{ fontSize: 32 }} />
              </StatIconWrapper>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                总曝光量
              </Typography>
              <Typography variant="h4">
                {formatNumber(advertiser?.totalSpent ? Math.round(advertiser.totalSpent * 100) : 0)}
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
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <QuickActionCard onClick={() => navigate('/advertiser/campaigns/create')}>
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

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <QuickActionCard onClick={() => navigate('/advertiser/kols')}>
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

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <QuickActionCard onClick={() => navigate('/advertiser/campaigns')}>
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

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <QuickActionCard onClick={() => navigate('/advertiser/analytics')}>
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
              onClick={() => navigate('/advertiser/campaigns')}
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
                      navigate(`/advertiser/campaigns/${campaign.id}`)
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
                onClick={() => navigate('/advertiser/campaigns/create')}
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
