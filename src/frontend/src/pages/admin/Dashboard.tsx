import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminDashboardAPI, adminCampaignAPI } from '../../services/adminApi';
import type { DashboardStats, AnalyticsData, DashboardKolRankings } from '../../types';

// MUI Components
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';

import { AdminHubNav } from '../../components/admin/AdminHubNav';
import {
  ADMIN_ROUTE_SEG,
  pathAdmin,
  pathAdminCampaign,
  pathAdminCampaignAnomalies,
} from '../../constants/appPaths';

// Icons
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import CampaignIcon from '@mui/icons-material/Campaign';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';

// Recharts
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// Format helpers
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};

const formatCurrency = (num: number): string => {
  return `¥${num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subValue?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, subValue }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="bold">
            {value}
          </Typography>
          {subValue && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {subValue}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: `${color}15`,
            color: color,
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

// Loading Stat Card
const LoadingStatCard = () => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Skeleton variant="text" width="60%" height={20} />
      <Skeleton variant="text" width="80%" height={40} sx={{ mt: 2 }} />
      <Skeleton variant="text" width="40%" height={20} sx={{ mt: 2 }} />
    </CardContent>
  </Card>
);

const AdminDashboard: React.FC = () => {
  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<DashboardStats>({
    queryKey: ['adminDashboardStats'],
    queryFn: () => adminDashboardAPI.getStats({ period: 'today' }),
  });

  // Fetch analytics data
  const { data: analytics, isLoading: analyticsLoading, refetch: refetchAnalytics } = useQuery<AnalyticsData>({
    queryKey: ['adminDashboardAnalytics'],
    queryFn: () => adminDashboardAPI.getAnalytics({ metric: 'user_growth', period: 'month', group_by: 'day' }),
  });

  // Fetch KOL rankings
  const { data: kolRankings, isLoading: rankingsLoading, refetch: refetchRankings } = useQuery<DashboardKolRankings>({
    queryKey: ['adminKolRankings'],
    queryFn: () => adminDashboardAPI.getKolRankings({ metric: 'earnings', limit: 5 }),
  });

  const riskTh = stats?.campaigns?.budgetRiskThreshold ?? 0.85;
  const { data: budgetRisks, isLoading: budgetRisksLoading, refetch: refetchBudgetRisks } = useQuery({
    queryKey: ['adminCampaignBudgetRisks', riskTh],
    queryFn: () => adminCampaignAPI.getBudgetRiskCampaigns({ threshold: riskTh }),
  });

  const { data: abnormalBrief, isLoading: abnormalLoading, refetch: refetchAbnormal } = useQuery({
    queryKey: ['adminAbnormalCampaignsCount'],
    queryFn: () => adminCampaignAPI.getAbnormalCampaigns({ page: 1, page_size: 1 }),
  });
  const abnormalTotal = abnormalBrief?.pagination?.total ?? 0;

  const handleHubRefresh = () => {
    void refetchStats();
    void refetchAnalytics();
    void refetchRankings();
    void refetchBudgetRisks();
    void refetchAbnormal();
  };

  // Prepare chart data
  const userGrowthData = analytics?.userGrowth?.labels.map((label, index) => ({
    date: label.slice(5), // Remove year, show MM-DD
    newUsers: analytics?.userGrowth?.series.newUsers[index] || 0,
    activeUsers: analytics?.userGrowth?.series.activeUsers[index] || 0,
    advertisers: analytics?.userGrowth?.series.advertisers[index] || 0,
    kols: analytics?.userGrowth?.series.kols[index] || 0,
  })) || [];

  const revenueData = analytics?.revenueTrend?.labels.map((label, index) => ({
    date: label.slice(5),
    revenue: analytics?.revenueTrend?.series.revenue[index] || 0,
    payout: analytics?.revenueTrend?.series.payout[index] || 0,
  })) || [];

  const platformData = analytics?.platformDistribution
    ? Object.entries(analytics.platformDistribution).map(([platform, value]) => ({
        name: platform === 'tiktok' ? 'TikTok' : platform === 'youtube' ? 'YouTube' : platform === 'instagram' ? 'Instagram' : platform,
        value,
      }))
    : [];

  const COLORS = ['#FF0080', '#00C8FF', '#FFAB00', '#00E676', '#651FFF'];

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          数据看板
        </Typography>
        <Typography variant="body2" color="text.secondary">
          实时平台数据统计与分析
        </Typography>
      </Box>
      <AdminHubNav onRefresh={handleHubRefresh} />
      <Alert severity="info" sx={{ mb: 3, mt: 2 }}>
        指标与图表来自管理端聚合接口；刷新将同步概览、趋势、KOL 排行、预算风险与异常巡检条数。
      </Alert>
      {!abnormalLoading && abnormalTotal > 0 && (
        <Alert
          severity="warning"
          sx={{ mb: 3 }}
          action={
            <Button component={RouterLink} to={pathAdminCampaignAnomalies()} color="inherit" size="small">
              查看全部
            </Button>
          }
        >
          规则巡检发现 <strong>{abnormalTotal}</strong> 条活动异常，建议及时跟进。
        </Alert>
      )}
      {!statsLoading && (stats?.campaigns?.budgetRiskCount ?? 0) > 0 && (
        <Alert
          severity="warning"
          sx={{ mb: 3 }}
          action={
            <Button
              component={RouterLink}
              to={`${pathAdmin(ADMIN_ROUTE_SEG.campaigns)}#budget-risk`}
              color="inherit"
              size="small"
            >
              活动管理
            </Button>
          }
        >
          当前 <strong>{stats?.campaigns?.budgetRiskCount}</strong> 个活动预算占用 ≥{' '}
          {((stats?.campaigns?.budgetRiskThreshold ?? 0.85) * 100).toFixed(0)}%，请关注投放与续费。
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          {statsLoading ? (
            <LoadingStatCard />
          ) : (
            <StatCard
              title="总用户数"
              value={formatNumber(stats?.users.total || 0)}
              icon={<PeopleIcon />}
              color="#1976D2"
              subValue={`今日新增 +${stats?.users.newToday || 0}`}
            />
          )}
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          {statsLoading ? (
            <LoadingStatCard />
          ) : (
            <StatCard
              title="广告主"
              value={formatNumber(stats?.users.advertisers || 0)}
              icon={<BusinessIcon />}
              color="#2E7D32"
              subValue={`活跃 ${stats?.users.activeToday || 0}`}
            />
          )}
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          {statsLoading ? (
            <LoadingStatCard />
          ) : (
            <StatCard
              title="KOL"
              value={formatNumber(stats?.users.kols || 0)}
              icon={<VerifiedUserIcon />}
              color="#ED6C02"
              subValue={`待审核 ${stats?.kol?.pendingVerification ?? 0}`}
            />
          )}
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          {statsLoading ? (
            <LoadingStatCard />
          ) : (
            <StatCard
              title="活动数"
              value={formatNumber(stats?.campaigns.total || 0)}
              icon={<CampaignIcon />}
              color="#9C27B0"
              subValue={`进行中 ${stats?.campaigns.active || 0}`}
            />
          )}
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          {statsLoading ? (
            <LoadingStatCard />
          ) : (
            <StatCard
              title="今日收入"
              value={formatCurrency(stats?.finance.todayRevenue || 0)}
              icon={<AttachMoneyIcon />}
              color="#00897B"
              subValue={`本月累计 ${formatCurrency(stats?.finance.totalRevenue || 0)}`}
            />
          )}
        </Grid>
      </Grid>

      {/* 活动预算占用预警（与 GET /admin/campaigns/budget-risks 一致） */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12 }}>
          <Card variant="outlined" sx={{ borderColor: 'warning.light' }}>
            <CardHeader
              avatar={
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <WarningAmberIcon color="warning" />
                </Box>
              }
              title="活动预算占用预警"
              subheader={`进行中/已暂停活动中，消耗/预算 ≥ ${((budgetRisks?.threshold ?? 0.85) * 100).toFixed(0)}% 的活动（运维 Cron 可请求同一接口）`}
            />
            <CardContent>
              {budgetRisksLoading ? (
                <Skeleton variant="rectangular" height={120} />
              ) : !budgetRisks?.items?.length ? (
                <Typography variant="body2" color="text.secondary">
                  当前无高占用活动
                </Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>活动名称</TableCell>
                        <TableCell align="right">预算</TableCell>
                        <TableCell align="right">已消耗</TableCell>
                        <TableCell align="right">占用率</TableCell>
                        <TableCell>状态</TableCell>
                        <TableCell align="center">活动 ID</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {budgetRisks.items.map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell>
                            <Link
                              component={RouterLink}
                              to={pathAdminCampaign(row.id)}
                              underline="hover"
                              fontWeight={500}
                              variant="body2"
                            >
                              {row.title}
                            </Link>
                          </TableCell>
                          <TableCell align="right">{formatCurrency(row.budget)}</TableCell>
                          <TableCell align="right">{formatCurrency(row.spentAmount)}</TableCell>
                          <TableCell align="right">
                            <Typography
                              variant="body2"
                              fontWeight="bold"
                              color={row.utilization >= 0.95 ? 'error.main' : 'warning.main'}
                            >
                              {(row.utilization * 100).toFixed(1)}%
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={row.status} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              title="复制活动 ID"
                              onClick={() => {
                                void navigator.clipboard.writeText(row.id);
                              }}
                              aria-label="复制活动 ID"
                            >
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* User Growth Chart */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card>
            <CardHeader
              title="用户增长趋势"
              subheader="近 30 天用户增长情况"
            />
            <CardContent>
              {analyticsLoading ? (
                <Skeleton variant="rectangular" height={300} />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={userGrowthData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="newUsers" stroke="#1976D2" name="新增用户" strokeWidth={2} />
                    <Line type="monotone" dataKey="activeUsers" stroke="#2E7D32" name="活跃用户" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Platform Distribution */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card>
            <CardHeader
              title="平台分布"
              subheader="KOL 平台占比"
            />
            <CardContent>
              {analyticsLoading ? (
                <Skeleton variant="rectangular" height={300} />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={platformData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: { name?: string; percent?: number }) =>
                        `${name ?? ''}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {platformData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Second Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Revenue Trend */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card>
            <CardHeader
              title="收入趋势"
              subheader="近 30 天收入与支出"
            />
            <CardContent>
              {analyticsLoading ? (
                <Skeleton variant="rectangular" height={300} />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="revenue" fill="#00897B" name="收入" />
                    <Bar dataKey="payout" fill="#ED6C02" name="支出" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* KOL Rankings */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card>
            <CardHeader
              title="KOL 排行榜"
              subheader="本月收入 TOP 5"
            />
            <CardContent>
              {rankingsLoading ? (
                <Skeleton variant="rectangular" height={300} />
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell align="center">排名</TableCell>
                        <TableCell>KOL</TableCell>
                        <TableCell>平台</TableCell>
                        <TableCell align="right">收入</TableCell>
                        <TableCell align="center">趋势</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {kolRankings?.rankings.map((ranking) => (
                        <TableRow key={ranking.kol.id} hover>
                          <TableCell align="center">
                            <Chip
                              label={ranking.rank}
                              color={ranking.rank <= 3 ? 'error' : 'default'}
                              size="small"
                              sx={{ width: 32, height: 32 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Avatar src={ranking.kol.avatarUrl} sx={{ width: 32, height: 32, mr: 1.5 }}>
                                {ranking.kol.name[0]}
                              </Avatar>
                              <Typography variant="body2">{ranking.kol.name}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={ranking.kol.platform === 'tiktok' ? 'TikTok' : ranking.kol.platform}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="bold">
                              ${formatNumber(ranking.value)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography
                              variant="body2"
                              color={ranking.change.startsWith('+') ? 'success.main' : 'error.main'}
                            >
                              {ranking.change}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Order Statistics */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader
              title="订单统计"
              subheader="当前订单状态"
            />
            <CardContent>
              {statsLoading ? (
                <Skeleton variant="rectangular" height={200} />
              ) : (
                <Box sx={{ pt: 2 }}>
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">待处理订单</Typography>
                      <Typography variant="body2" fontWeight="bold">{stats?.orders.pending || 0}</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(stats?.orders.pending || 0) / (stats?.orders.total || 1) * 100}
                      color="warning"
                    />
                  </Box>
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">进行中订单</Typography>
                      <Typography variant="body2" fontWeight="bold">{stats?.orders.inProgress || 0}</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(stats?.orders.inProgress || 0) / (stats?.orders.total || 1) * 100}
                      color="info"
                    />
                  </Box>
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
                      <Typography variant="body2">纠纷 / 待结案工单</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight="bold">
                          {stats?.orders.disputed ?? 0} / {stats?.orders.pendingDisputes ?? 0}
                        </Typography>
                        <Link
                          component={RouterLink}
                          to={`${pathAdmin(ADMIN_ROUTE_SEG.orders)}?tab=disputes`}
                          variant="caption"
                          underline="hover"
                        >
                          处理
                        </Link>
                      </Box>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={
                        (stats?.orders.total || 0) > 0
                          ? ((stats?.orders.pendingDisputes || 0) / (stats?.orders.total || 1)) * 100
                          : 0
                      }
                      color="error"
                    />
                  </Box>
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">今日完成</Typography>
                      <Typography variant="body2" fontWeight="bold">{stats?.orders.completedToday || 0}</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(stats?.orders.completedToday || 0) / (stats?.orders.total || 1) * 100}
                      color="success"
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 2, borderTop: 1, borderColor: 'divider' }}>
                    <Typography variant="body2">总订单数</Typography>
                    <Typography variant="h6" fontWeight="bold">{stats?.orders.total || 0}</Typography>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader
              title="财务概览"
              subheader="资金流水统计"
            />
            <CardContent>
              {statsLoading ? (
                <Skeleton variant="rectangular" height={200} />
              ) : (
                <Box sx={{ pt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
                    <Box>
                      <Typography variant="body2" color="success.dark">总收入</Typography>
                      <Typography variant="h5" fontWeight="bold" color="success.dark">
                        {formatCurrency(stats?.finance.totalRevenue || 0)}
                      </Typography>
                    </Box>
                    <AttachMoneyIcon sx={{ fontSize: 40, color: 'success.dark', opacity: 0.5 }} />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, p: 2, bgcolor: 'warning.light', borderRadius: 2 }}>
                    <Box>
                      <Typography variant="body2" color="warning.dark">总支出</Typography>
                      <Typography variant="h5" fontWeight="bold" color="warning.dark">
                        {formatCurrency(stats?.finance.totalPayout || 0)}
                      </Typography>
                    </Box>
                    <ShoppingCartIcon sx={{ fontSize: 40, color: 'warning.dark', opacity: 0.5 }} />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
                    <Box>
                      <Typography variant="body2" color="info.dark">待处理提现</Typography>
                      <Typography variant="h5" fontWeight="bold" color="info.dark">
                        {formatCurrency(stats?.finance.pendingWithdrawals || 0)}
                      </Typography>
                    </Box>
                    <TrendingUpIcon sx={{ fontSize: 40, color: 'info.dark', opacity: 0.5 }} />
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDashboard;
