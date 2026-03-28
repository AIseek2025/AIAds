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
import { styled } from '@mui/material/styles';

// Icons
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TaskIcon from '@mui/icons-material/Task';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PeopleIcon from '@mui/icons-material/People';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import PersonIcon from '@mui/icons-material/Person';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
// Types
import type { KolTask } from '../../stores/kolStore';

// Stores
import { useAuthStore } from '../../stores/authStore';
import { useKolStore } from '../../stores/kolStore';

// Services
import {
  earningsAPI,
  kolAcceptFrequencyQueryKey,
  kolBalanceQueryKey,
  kolProfileAPI,
  myTasksAPI,
} from '../../services/kolApi';
import { getApiErrorMessage } from '../../utils/apiError';
import { KolHubNav } from '../../components/kol/KolHubNav';
import { KolFrequencyAlerts } from '../../components/kol/KolFrequencyAlerts';
import { KOL_ROUTE_SEG, pathKol, pathKolMyTask } from '../../constants/appPaths';

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
  kol: 'kol',
  tasks: 'tasks',
  stats: 'stats',
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { setKol, setStats } = useKolStore();

  // Fetch KOL profile
  const {
    data: kol,
    isLoading: isKolLoading,
    error: kolError,
    refetch: refetchKol,
  } = useQuery({
    queryKey: [queryKeys.kol],
    queryFn: kolProfileAPI.getProfile,
    retry: 1,
  });

  // Fetch KOL statistics
  const {
    data: stats,
    isLoading: isStatsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: [queryKeys.stats],
    queryFn: kolProfileAPI.getStats,
    retry: 1,
  });

  // Fetch recent tasks
  const {
    data: tasksData,
    isLoading: isTasksLoading,
    refetch: refetchTasks,
  } = useQuery({
    queryKey: [queryKeys.tasks],
    queryFn: () =>
      myTasksAPI.getTasks({ page: 1, page_size: 5 }),
    retry: 1,
  });

  const balanceQ = useQuery({
    queryKey: [...kolBalanceQueryKey],
    queryFn: earningsAPI.getBalance,
    retry: 1,
  });

  const freqQ = useQuery({
    queryKey: [...kolAcceptFrequencyQueryKey],
    queryFn: kolProfileAPI.getAcceptFrequency,
    retry: 0,
  });

  // Update store when data changes
  React.useEffect(() => {
    if (kol) {
      setKol(kol);
    }
    if (stats) {
      setStats(stats);
    }
  }, [kol, stats, setKol, setStats]);

  const handleRefresh = () => {
    refetchKol();
    refetchStats();
    refetchTasks();
    void balanceQ.refetch();
    void freqQ.refetch();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(value);
  };

  const getStatusLabel = (status: KolTask['status']) => {
    const labels = {
      pending: '待接受',
      accepted: '已接受',
      in_progress: '进行中',
      pending_review: '待审核',
      completed: '已完成',
      rejected: '已拒绝',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: KolTask['status']) => {
    const colors = {
      pending: 'default',
      accepted: 'info',
      in_progress: 'warning',
      pending_review: 'primary',
      completed: 'success',
      rejected: 'error',
    } as const;
    return colors[status] || 'default';
  };

  if (isKolLoading || isStatsLoading) {
    return <LinearProgress />;
  }

  if (kolError) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {getApiErrorMessage(kolError, '加载 KOL 信息失败，请稍后重试')}
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
            欢迎回来，{user?.nickname || kol?.platformDisplayName || 'KOL'}！
          </Typography>
          <Typography variant="body1" color="text.secondary">
            这是您的 KOL 仪表盘，查看您的收益数据和任务情况
          </Typography>
        </Box>
        <KolHubNav preset="dashboard-page" onRefresh={handleRefresh} />
      </Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        本页汇总收益与任务概况；接单、交付与订单状态请在「我的任务」或任务广场详情中操作。
      </Alert>
      <KolFrequencyAlerts
        freqQ={freqQ}
        tone="dashboard"
        onRetry={() => void freqQ.refetch()}
        onGoTaskMarket={() => navigate(pathKol(KOL_ROUTE_SEG.taskMarket))}
      />

      {/* Earnings Stats Cards */}
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        收益统计
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard>
            <CardContent>
              <StatIconWrapper sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
                <AttachMoneyIcon sx={{ fontSize: 32 }} />
              </StatIconWrapper>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                本月收益
              </Typography>
              <Typography variant="h4">
                {formatCurrency(stats?.monthlyEarnings || 0)}
              </Typography>
            </CardContent>
          </StatCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard>
            <CardContent>
              <StatIconWrapper sx={{ bgcolor: 'success.light', color: 'success.main' }}>
                <AccountBalanceIcon sx={{ fontSize: 32 }} />
              </StatIconWrapper>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                累计收益
              </Typography>
              <Typography variant="h4">
                {formatCurrency(stats?.totalEarnings || 0)}
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
                待结算收益
              </Typography>
              <Typography variant="h4">
                {formatCurrency(stats?.pendingEarnings || 0)}
              </Typography>
            </CardContent>
          </StatCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard>
            <CardContent>
              <StatIconWrapper sx={{ bgcolor: 'info.light', color: 'info.main' }}>
                <LockOutlinedIcon sx={{ fontSize: 32 }} />
              </StatIconWrapper>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                订单冻结合计
              </Typography>
              <Typography variant="h4" color="info.main">
                {formatCurrency(balanceQ.data?.ordersFrozenTotal ?? 0)}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                与「收益管理」页 /kols/balance 同源
              </Typography>
            </CardContent>
          </StatCard>
        </Grid>
      </Grid>

      {/* Task Stats Cards */}
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        任务统计
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard>
            <CardContent>
              <StatIconWrapper sx={{ bgcolor: 'info.light', color: 'info.main' }}>
                <TaskIcon sx={{ fontSize: 32 }} />
              </StatIconWrapper>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                进行中任务
              </Typography>
              <Typography variant="h4">
                {stats?.ongoingTasks || 0}
              </Typography>
            </CardContent>
          </StatCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard>
            <CardContent>
              <StatIconWrapper sx={{ bgcolor: 'success.light', color: 'success.main' }}>
                <CheckCircleIcon sx={{ fontSize: 32 }} />
              </StatIconWrapper>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                已完成任务
              </Typography>
              <Typography variant="h4">
                {stats?.completedTasks || 0}
              </Typography>
            </CardContent>
          </StatCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard>
            <CardContent>
              <StatIconWrapper sx={{ bgcolor: 'secondary.light', color: 'secondary.main' }}>
                <PlaylistAddCheckIcon sx={{ fontSize: 32 }} />
              </StatIconWrapper>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                任务通过率
              </Typography>
              <Typography variant="h4">
                {stats?.successRate || 0}%
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
          <QuickActionCard onClick={() => navigate(pathKol(KOL_ROUTE_SEG.myTasks))}>
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
              <TaskIcon sx={{ fontSize: 32 }} />
            </Box>
            <Typography variant="subtitle2" align="center">
              我的任务
            </Typography>
            <Typography variant="caption" color="text.secondary">
              接单、交付与订单详情
            </Typography>
          </QuickActionCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <QuickActionCard onClick={() => navigate(pathKol(KOL_ROUTE_SEG.taskMarket))}>
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
              任务广场
            </Typography>
            <Typography variant="caption" color="text.secondary">
              浏览可接取的任务
            </Typography>
          </QuickActionCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <QuickActionCard onClick={() => navigate(pathKol(KOL_ROUTE_SEG.earnings))}>
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
              <AttachMoneyIcon sx={{ fontSize: 32 }} />
            </Box>
            <Typography variant="subtitle2" align="center">
              收益管理
            </Typography>
            <Typography variant="caption" color="text.secondary">
              查看收益和提现
            </Typography>
          </QuickActionCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <QuickActionCard onClick={() => navigate(pathKol(KOL_ROUTE_SEG.analytics))}>
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
              经营分析
            </Typography>
            <Typography variant="caption" color="text.secondary">
              订单分布、收入与曝光汇总
            </Typography>
          </QuickActionCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <QuickActionCard onClick={() => navigate(pathKol(KOL_ROUTE_SEG.profile))}>
            <Box
              className="quick-action-icon"
              sx={{
                width: 64,
                height: 64,
                borderRadius: 3,
                bgcolor: 'grey.200',
                color: 'text.primary',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
                transition: 'transform 0.2s',
              }}
            >
              <PersonIcon sx={{ fontSize: 32 }} />
            </Box>
            <Typography variant="subtitle2" align="center">
              我的资料
            </Typography>
            <Typography variant="caption" color="text.secondary">
              编辑展示信息与报价
            </Typography>
          </QuickActionCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <QuickActionCard onClick={() => navigate(pathKol(KOL_ROUTE_SEG.accounts))}>
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
              <AccountBalanceIcon sx={{ fontSize: 32 }} />
            </Box>
            <Typography variant="subtitle2" align="center">
              账号绑定
            </Typography>
            <Typography variant="caption" color="text.secondary">
              管理社交媒体账号
            </Typography>
          </QuickActionCard>
        </Grid>
      </Grid>

      {/* Recent Tasks */}
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
            <Typography variant="h6">最近任务</Typography>
            <Button
              endIcon={<ArrowForwardIcon />}
              onClick={() => navigate(pathKol(KOL_ROUTE_SEG.myTasks))}
            >
              查看全部
            </Button>
          </Box>

          {isTasksLoading ? (
            <LinearProgress />
          ) : tasksData?.items && tasksData.items.length > 0 ? (
            <Grid container spacing={2}>
              {tasksData.items.map((task: KolTask) => (
                <Grid size={{ xs: 12 }} key={task.id}>
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
                      navigate(pathKolMyTask(task.id))
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
                            {task.campaignTitle}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 1, mb: 2 }}
                          >
                            {task.campaignDescription || '暂无描述'}
                          </Typography>
                          <Stack direction="row" spacing={2} flexWrap="wrap">
                            <Chip
                              label={getStatusLabel(task.status)}
                              size="small"
                              color={getStatusColor(task.status)}
                            />
                            <Typography variant="body2" color="text.secondary">
                              预算：{formatCurrency(task.budget)}
                            </Typography>
                            {(task.frozenAmount ?? 0) > 0 ? (
                              <Typography variant="body2" color="warning.main">
                                冻结：{formatCurrency(task.frozenAmount!)}
                              </Typography>
                            ) : null}
                            <Typography variant="body2" color="text.secondary">
                              平台：{task.platform}
                            </Typography>
                            {task.deadline && (
                              <Typography variant="body2" color="text.secondary">
                                截止：{new Date(task.deadline).toLocaleDateString('zh-CN')}
                              </Typography>
                            )}
                          </Stack>
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
              <TaskIcon sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                暂无任务
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                去任务广场看看有什么适合您的任务吧！
              </Typography>
              <Button
                variant="contained"
                startIcon={<PeopleIcon />}
                onClick={() => navigate(pathKol(KOL_ROUTE_SEG.taskMarket))}
              >
                浏览任务广场
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default DashboardPage;
