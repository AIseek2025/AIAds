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
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableContainer from '@mui/material/TableContainer';
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
import CampaignIcon from '@mui/icons-material/Campaign';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import type { Campaign } from '../../types';
import { AdvertiserHubNav } from '../../components/advertiser/AdvertiserHubNav';
import {
  ADVERTISER_ROUTE_SEG,
  pathAdvertiser,
  pathAdvertiserCampaign,
  pathAdvertiserOrder,
} from '../../constants/appPaths';
import {
  advertiserAPI,
  advertiserBalanceQueryKey,
  advertiserProfileQueryKey,
  campaignAPI,
  orderAPI,
} from '../../services/advertiserApi';
import { getApiErrorMessage } from '../../utils/apiError';
import { advertiserOrderFrozenCny, advertiserOrderGrossSpendCny } from '../../utils/advertiserOrderGross';
import { usePublicUiConfig, isBudgetAtOrAboveRisk } from '../../hooks/usePublicUiConfig';
import { AdvertiserLowBalanceAlert } from '../../components/advertiser/AdvertiserLowBalanceAlert';
import { AdvertiserBudgetRiskBanner } from '../../components/advertiser/AdvertiserBudgetRiskBanner';

const LIST_PAGE_SIZE = 100;

const queryKeys = {
  campaigns: 'advertiser-analytics-campaigns',
  orders: 'advertiser-analytics-orders',
};

const CAMPAIGN_STATUS_LABEL: Record<Campaign['status'], string> = {
  draft: '草稿',
  pending_review: '待审核',
  active: '进行中',
  paused: '已暂停',
  completed: '已完成',
  cancelled: '已取消',
  rejected: '已拒绝',
};

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: '待确认',
  accepted: '已接受',
  rejected: '已拒绝',
  in_progress: '进行中',
  submitted: '已提交',
  approved: '已批准',
  revision: '待修改',
  published: '已发布',
  completed: '已完成',
  cancelled: '已取消',
  disputed: '纠纷中',
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

export const AdvertiserAnalyticsPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const profileQ = useQuery({
    queryKey: [...advertiserProfileQueryKey],
    queryFn: advertiserAPI.getProfile,
    retry: 1,
  });

  const balanceQ = useQuery({
    queryKey: [...advertiserBalanceQueryKey],
    queryFn: advertiserAPI.getBalance,
    retry: 1,
  });

  const campaignsQ = useQuery({
    queryKey: [queryKeys.campaigns],
    queryFn: () =>
      campaignAPI.getCampaigns({ page: 1, page_size: LIST_PAGE_SIZE }),
    retry: 1,
  });

  const ordersQ = useQuery({
    queryKey: [queryKeys.orders],
    queryFn: () => orderAPI.getOrders({ page: 1, page_size: LIST_PAGE_SIZE }),
    retry: 1,
  });

  const { data: publicUi } = usePublicUiConfig();
  const budgetRiskTh = publicUi?.budget_risk_threshold ?? 0.85;

  const loading =
    profileQ.isLoading ||
    balanceQ.isLoading ||
    campaignsQ.isLoading ||
    ordersQ.isLoading;

  const err =
    profileQ.error ||
    balanceQ.error ||
    campaignsQ.error ||
    ordersQ.error;

  const campaignStatusPie = useMemo(() => {
    const items = campaignsQ.data?.items ?? [];
    const map = new Map<string, number>();
    for (const c of items) {
      const k = c.status;
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([status, value]) => ({
      name: CAMPAIGN_STATUS_LABEL[status as Campaign['status']] ?? status,
      value,
    }));
  }, [campaignsQ.data?.items]);

  const orderStatusPie = useMemo(() => {
    const items = ordersQ.data?.items ?? [];
    const map = new Map<string, number>();
    for (const raw of items) {
      const st = String((raw as { status?: string }).status ?? 'unknown');
      map.set(st, (map.get(st) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([status, value]) => ({
      name: ORDER_STATUS_LABEL[status] ?? status,
      value,
    }));
  }, [ordersQ.data?.items]);

  const topCampaignsBySpent = useMemo(() => {
    const items = [...(campaignsQ.data?.items ?? [])];
    items.sort((a, b) => (b.spentAmount ?? 0) - (a.spentAmount ?? 0));
    return items.slice(0, 8).map((c) => {
      const budget = c.budget ?? 0;
      const spent = c.spentAmount ?? 0;
      const utilRatio = budget > 0 ? spent / budget : 0;
      return {
        name: truncate(c.title || c.id, 12),
        fullTitle: c.title,
        spent,
        budget,
        utilPercent: budget > 0 ? utilRatio * 100 : 0,
        atRisk: isBudgetAtOrAboveRisk(budget, spent, budgetRiskTh),
        id: c.id,
        status: c.status,
      };
    });
  }, [campaignsQ.data?.items, budgetRiskTh]);

  const budgetRiskCampaigns = useMemo(() => {
    const items = campaignsQ.data?.items ?? [];
    return items.filter((c) =>
      isBudgetAtOrAboveRisk(c.budget ?? 0, c.spentAmount ?? 0, budgetRiskTh)
    );
  }, [campaignsQ.data?.items, budgetRiskTh]);

  const recentOrderRows = useMemo(
    () => (ordersQ.data?.items ?? []).slice(0, 5) as Record<string, unknown>[],
    [ordersQ.data?.items]
  );

  const orderSpend = (raw: Record<string, unknown>) => advertiserOrderGrossSpendCny(raw);

  const orderFrozen = (raw: Record<string, unknown>) => advertiserOrderFrozenCny(raw);

  const profile = profileQ.data;
  const balance = balanceQ.data;
  const campTotal = campaignsQ.data?.pagination?.total ?? 0;
  const orderTotal = ordersQ.data?.pagination?.total ?? 0;
  const handleRefresh = () => {
    void profileQ.refetch();
    void balanceQ.refetch();
    void campaignsQ.refetch();
    void ordersQ.refetch();
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
            数据分析
          </Typography>
          <Typography variant="body2" color="text.secondary">
            汇总来自账户与最近最多 {LIST_PAGE_SIZE} 条活动/订单，用于分布与排行；顶部指标与广告主资料一致。单笔确认完成、CPM
            明细与评价请前往订单中心。
          </Typography>
        </Box>
        <AdvertiserHubNav preset="analytics-page" onRefresh={handleRefresh} />
      </Stack>

      <AdvertiserLowBalanceAlert balance={balance} publicUi={publicUi} context="analytics" sx={{ mb: 3 }} />

      <AdvertiserBudgetRiskBanner mode="analytics" budgetRiskTh={budgetRiskTh} atRiskCount={budgetRiskCampaigns.length} />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <AccountBalanceIcon color="primary" />
                <Typography variant="subtitle2" color="text.secondary">
                  可用余额
                </Typography>
              </Stack>
              <Typography variant="h5" fontWeight={700}>
                {balance ? formatCny(balance.wallet_balance) : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                账户冻结 {balance ? formatCny(balance.frozen_balance) : '—'}
              </Typography>
              {(profile?.ordersFrozenTotal ?? 0) > 0 && (
                <Typography variant="caption" color="info.main" display="block">
                  订单冻结（全活动）{formatCny(profile?.ordersFrozenTotal ?? 0)}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <CampaignIcon color="primary" />
                <Typography variant="subtitle2" color="text.secondary">
                  活动
                </Typography>
              </Stack>
              <Typography variant="h5" fontWeight={700}>
                {profile?.totalCampaigns ?? 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                进行中 {profile?.activeCampaigns ?? 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <ShoppingCartIcon color="primary" />
                <Typography variant="subtitle2" color="text.secondary">
                  订单（账户）
                </Typography>
              </Stack>
              <Typography variant="h5" fontWeight={700}>
                {profile?.totalOrders ?? 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                列表样本 {orderTotal} 条内
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
                  累计消费 / 充值
                </Typography>
              </Stack>
              <Typography variant="h5" fontWeight={700}>
                {profile ? formatCny(profile.totalSpent) : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                充值 {profile ? formatCny(profile.totalRecharged) : '—'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              最近订单（当前列表前 5 条）
            </Typography>
            <Button size="small" onClick={() => navigate(pathAdvertiser(ADVERTISER_ROUTE_SEG.orders))}>
              全部订单
            </Button>
          </Stack>
          {recentOrderRows.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              暂无订单数据。
            </Typography>
          ) : (
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
                  {recentOrderRows.map((row) => {
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
                          <Chip
                            size="small"
                            label={ORDER_STATUS_LABEL[st] ?? st}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right">{formatCny(orderSpend(row))}</TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            color={orderFrozen(row) > 0 ? 'text.primary' : 'text.secondary'}
                          >
                            {orderFrozen(row) > 0 ? formatCny(orderFrozen(row)) : '—'}
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
          )}
        </CardContent>
      </Card>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                活动状态分布（{campTotal} 条，本页最多 {LIST_PAGE_SIZE}）
              </Typography>
              <Box sx={{ width: '100%', height: 280 }}>
                {campaignStatusPie.length === 0 ? (
                  <Typography color="text.secondary" variant="body2">
                    暂无活动数据
                  </Typography>
                ) : (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={campaignStatusPie}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label
                      >
                        {campaignStatusPie.map((_, i) => (
                          <Cell
                            key={`c-${i}`}
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
                            key={`o-${i}`}
                            fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]}
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
      </Grid>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            活动投放消耗 Top（按已用预算）
          </Typography>
          <Box sx={{ width: '100%', height: 320 }}>
            {topCampaignsBySpent.length === 0 ? (
              <Typography color="text.secondary">暂无数据</Typography>
            ) : (
              <ResponsiveContainer>
                <BarChart
                  data={topCampaignsBySpent}
                  margin={{ top: 8, right: 8, left: 8, bottom: 32 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis
                    tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCny(value)}
                    labelFormatter={(label, payload) => {
                      const row = payload?.[0]?.payload as { fullTitle?: string } | undefined;
                      return row?.fullTitle ?? String(label ?? '');
                    }}
                  />
                  <Bar dataKey="spent" name="已用" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Box>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              高消耗活动
            </Typography>
            <Button size="small" onClick={() => navigate(pathAdvertiser(ADVERTISER_ROUTE_SEG.campaigns))}>
              管理活动
            </Button>
          </Stack>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>活动</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell align="right">预算</TableCell>
                  <TableCell align="right">已用</TableCell>
                  <TableCell align="center">占用率</TableCell>
                  <TableCell align="right">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {topCampaignsBySpent.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      暂无活动
                    </TableCell>
                  </TableRow>
                ) : (
                  topCampaignsBySpent.map((row) => (
                    <TableRow
                      key={row.id}
                      sx={{ bgcolor: row.atRisk ? 'warning.light' : undefined }}
                    >
                      <TableCell>
                        <Typography variant="body2">{row.fullTitle || row.id}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={CAMPAIGN_STATUS_LABEL[row.status]}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">{formatCny(row.budget)}</TableCell>
                      <TableCell align="right">{formatCny(row.spent)}</TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center" flexWrap="wrap" useFlexGap>
                          <Typography variant="body2" fontWeight={row.atRisk ? 600 : 400}>
                            {row.budget > 0 ? `${row.utilPercent.toFixed(1)}%` : '—'}
                          </Typography>
                          {row.atRisk ? (
                            <Chip size="small" color="warning" label="预警" variant="outlined" />
                          ) : null}
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          onClick={() => navigate(pathAdvertiserCampaign(row.id))}
                        >
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

export default AdvertiserAnalyticsPage;
