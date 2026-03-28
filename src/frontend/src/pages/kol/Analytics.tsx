import React, { useMemo } from 'react';
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
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import { useTheme } from '@mui/material/styles';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssignmentIcon from '@mui/icons-material/Assignment';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FavoriteIcon from '@mui/icons-material/Favorite';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TaskIcon from '@mui/icons-material/Task';
import DashboardIcon from '@mui/icons-material/Dashboard';

import { KolHubNav } from '../../components/kol/KolHubNav';
import { KolFrequencyAlerts } from '../../components/kol/KolFrequencyAlerts';
import { KOL_ROUTE_SEG, pathKol, pathKolMyTask } from '../../constants/appPaths';
import {
  earningsAPI,
  kolAcceptFrequencyQueryKey,
  kolBalanceQueryKey,
  kolProfileAPI,
  myTasksAPI,
} from '../../services/kolApi';
import type { KolTask } from '../../stores/kolStore';
import { getApiErrorMessage } from '../../utils/apiError';

const LIST_PAGE_SIZE = 100;

const queryKeys = {
  profile: 'kol-analytics-profile',
  stats: 'kol-analytics-stats',
  orders: 'kol-analytics-orders',
};

/** 与后端订单 status、活动详情口径一致 */
/** 与 KolTask.status（归一后）一致 */
const KOL_TASK_STATUS_LABEL: Record<KolTask['status'], string> = {
  pending: '待确认',
  accepted: '已接受',
  rejected: '已拒绝/关闭',
  in_progress: '进行中',
  pending_review: '待审核',
  completed: '已完成',
};

const CHART_COLORS = [
  '#1976d2',
  '#2e7d32',
  '#ed6c02',
  '#9c27b0',
  '#d32f2f',
  '#0288d1',
  '#5d4037',
  '#455a64',
];

function formatCny(n: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

export const KolAnalyticsPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const profileQ = useQuery({
    queryKey: [queryKeys.profile],
    queryFn: kolProfileAPI.getProfile,
    retry: 1,
  });

  const statsQ = useQuery({
    queryKey: [queryKeys.stats],
    queryFn: kolProfileAPI.getStats,
    retry: 1,
  });

  const ordersQ = useQuery({
    queryKey: [queryKeys.orders],
    queryFn: () => myTasksAPI.getTasks({ page: 1, page_size: LIST_PAGE_SIZE }),
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

  const loading = profileQ.isLoading || statsQ.isLoading || ordersQ.isLoading || balanceQ.isLoading;
  const err = profileQ.error || statsQ.error || ordersQ.error;

  const orderStatusPie = useMemo(() => {
    const items = ordersQ.data?.items ?? [];
    const map = new Map<string, number>();
    for (const t of items) {
      const label = KOL_TASK_STATUS_LABEL[t.status] ?? t.status;
      map.set(label, (map.get(label) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [ordersQ.data?.items]);

  const topByEarning = useMemo(() => {
    const items = [...(ordersQ.data?.items ?? [])];
    const rows = items.map((t) => {
      const earning =
        t.pricingModel === 'cpm' && t.cpmBreakdown != null
          ? t.cpmBreakdown.kol_earning || t.orderPrice || 0
          : t.kolEarning || t.orderPrice || 0;
      const oid = t.id;
      const frozen = t.frozenAmount ?? 0;
      return {
        id: oid,
        name: truncate(String(t.orderNo ?? t.id ?? ''), 14),
        fullLabel: String(t.orderNo ?? t.id ?? ''),
        campaignTitle: t.campaignTitle,
        earning,
        frozen,
        status: t.status,
      };
    });
    rows.sort((a, b) => b.earning - a.earning);
    return rows.slice(0, 8);
  }, [ordersQ.data?.items]);

  const stats = statsQ.data;
  const orderTotal = ordersQ.data?.pagination?.total ?? 0;

  const handleRefresh = () => {
    void profileQ.refetch();
    void statsQ.refetch();
    void ordersQ.refetch();
    void balanceQ.refetch();
    void freqQ.refetch();
  };

  if (loading) {
    return <LinearProgress />;
  }

  if (err) {
    return (
      <Alert severity="error">
        {getApiErrorMessage(err, '加载分析数据失败，请稍后重试')}
      </Alert>
    );
  }

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            经营分析
          </Typography>
          <Typography variant="body2" color="text.secondary">
            汇总来自账户与最近最多 {LIST_PAGE_SIZE} 条订单（/tasks/kols/orders）；核心指标由服务端聚合（/kols/me/stats）。订单详情与交付请在「我的任务」中操作。
          </Typography>
        </Box>
        <KolHubNav preset="analytics-page" onRefresh={handleRefresh} />
      </Stack>

      <KolFrequencyAlerts
        freqQ={freqQ}
        tone="dashboard"
        onRetry={() => void freqQ.refetch()}
        onGoTaskMarket={() => navigate(pathKol(KOL_ROUTE_SEG.taskMarket))}
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <AttachMoneyIcon color="primary" />
                <Typography variant="subtitle2" color="text.secondary">
                  可提现 / 待结算
                </Typography>
              </Stack>
              <Typography variant="h5" fontWeight={700}>
                {stats ? formatCny(stats.availableBalance) : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                待结算 {stats ? formatCny(stats.pendingEarnings) : '—'}
              </Typography>
              <Typography variant="caption" color="info.main" display="block" sx={{ mt: 0.5 }}>
                订单冻结合计 {balanceQ.data ? formatCny(balanceQ.data.ordersFrozenTotal) : '—'}（与收益页同源）
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <TrendingUpIcon color="primary" />
                <Typography variant="subtitle2" color="text.secondary">
                  累计收益 / 本月
                </Typography>
              </Stack>
              <Typography variant="h5" fontWeight={700}>
                {stats ? formatCny(stats.totalEarnings) : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                本月 {stats ? formatCny(stats.monthlyEarnings) : '—'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <AssignmentIcon color="primary" />
                <Typography variant="subtitle2" color="text.secondary">
                  订单 / 进行中
                </Typography>
              </Stack>
              <Typography variant="h5" fontWeight={700}>
                {stats?.totalTasks ?? 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                进行中 {stats?.ongoingTasks ?? 0} · 完成 {stats?.completedTasks ?? 0} ·
                成功率 {stats?.successRate ?? 0}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <VisibilityIcon color="primary" />
                <Typography variant="subtitle2" color="text.secondary">
                  累计曝光 / 点赞
                </Typography>
              </Stack>
              <Typography variant="h5" fontWeight={700}>
                {stats?.totalViews?.toLocaleString('zh-CN') ?? '0'}
              </Typography>
              <Typography variant="caption" color="text.secondary" component="span">
                <FavoriteIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                {stats?.totalLikes?.toLocaleString('zh-CN') ?? '0'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                订单状态分布（{orderTotal} 条，本页最多 {LIST_PAGE_SIZE}）
              </Typography>
              <Box sx={{ width: '100%', height: 280 }}>
                {orderStatusPie.length === 0 ? (
                  <Typography color="text.secondary" variant="body2">
                    暂无订单数据
                  </Typography>
                ) : (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={orderStatusPie}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label
                      >
                        {orderStatusPie.map((_, i) => (
                          <Cell
                            key={`k-${i}`}
                            fill={CHART_COLORS[i % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                预估 KOL 收入 Top（固定价取 kol_earning；CPM 取计费拆分 kol_earning）
              </Typography>
              <Box sx={{ width: '100%', height: 300 }}>
                {topByEarning.length === 0 ? (
                  <Typography color="text.secondary">暂无数据</Typography>
                ) : (
                  <ResponsiveContainer>
                    <BarChart
                      data={topByEarning}
                      margin={{ top: 8, right: 8, left: 8, bottom: 32 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))} />
                      <Tooltip
                        formatter={(value: number) => formatCny(value)}
                        labelFormatter={(label, payload) => {
                          const row = payload?.[0]?.payload as { fullLabel?: string } | undefined;
                          return row?.fullLabel ?? String(label ?? '');
                        }}
                      />
                      <Bar
                        dataKey="earning"
                        name="预估收入"
                        fill={theme.palette.primary.main}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            快捷导航
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
            <Button
              size="small"
              startIcon={<DashboardIcon />}
              variant="outlined"
              onClick={() => navigate(pathKol(KOL_ROUTE_SEG.dashboard))}
            >
              仪表板
            </Button>
            <Button size="small" startIcon={<TaskIcon />} variant="outlined" onClick={() => navigate(pathKol(KOL_ROUTE_SEG.myTasks))}>
              我的任务
            </Button>
            <Button size="small" variant="outlined" onClick={() => navigate(pathKol(KOL_ROUTE_SEG.taskMarket))}>
              任务广场
            </Button>
            <Button size="small" variant="outlined" onClick={() => navigate(pathKol(KOL_ROUTE_SEG.earnings))}>
              收益管理
            </Button>
            <Button size="small" variant="outlined" onClick={() => navigate(pathKol(KOL_ROUTE_SEG.profile))}>
              我的资料
            </Button>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            当前账号：{profileQ.data?.platformDisplayName ?? profileQ.data?.platformUsername ?? '—'}
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            高预估收入订单（本页样本 Top 8）
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>订单号</TableCell>
                  <TableCell>活动</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell align="right">预估收入</TableCell>
                  <TableCell align="right">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {topByEarning.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.secondary">
                        暂无订单
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  topByEarning.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>
                        <Typography variant="body2">{row.fullLabel}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 220 }}>
                          {row.campaignTitle}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={KOL_TASK_STATUS_LABEL[row.status as KolTask['status']] ?? row.status}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">{formatCny(row.earning)}</TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          color={row.frozen > 0 ? 'text.primary' : 'text.secondary'}
                        >
                          {row.frozen > 0 ? formatCny(row.frozen) : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Button size="small" onClick={() => navigate(pathKolMyTask(row.id))}>
                          详情
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default KolAnalyticsPage;
