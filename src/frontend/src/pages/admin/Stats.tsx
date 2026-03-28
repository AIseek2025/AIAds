import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { adminDashboardAPI, adminStatsAPI } from '../../services/adminApi';
import { getApiErrorMessage } from '../../utils/apiError';
import type { AnalyticsData } from '../../types';

// MUI Components
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { AdminHubNav } from '../../components/admin/AdminHubNav';

// Icons
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
// Recharts
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#1976D2', '#2E7D32', '#ED6C02', '#9C27B0', '#F44336', '#00BCD4', '#FF9800', '#4CAF50'];

function formatStatsCurrency(value: number) {
  return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatStatsNumber(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toString();
}

type StatsTooltipPayloadEntry = { name?: string; value?: number; color?: string };

const StatsChartTooltip: React.FC<{
  active?: boolean;
  payload?: StatsTooltipPayloadEntry[];
  label?: string;
}> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <Box sx={{ bgcolor: 'background.paper', p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1, boxShadow: 2 }}>
        <Typography variant="body2" fontWeight="bold" gutterBottom>
          {label}
        </Typography>
        {payload.map((entry, index) => (
          <Typography key={index} variant="body2" sx={{ color: entry.color }}>
            {entry.name}:{' '}
            {entry.name?.includes('金额') || entry.name?.includes('收入')
              ? formatStatsCurrency(entry.value ?? 0)
              : formatStatsNumber(entry.value ?? 0)}
          </Typography>
        ))}
      </Box>
    );
  }
  return null;
};

const piePercentLabel = ({ name, percent }: { name?: string; percent?: number }) =>
  `${name ?? ''}: ${((percent ?? 0) * 100).toFixed(0)}%`;

function statsTimeRangeToPeriod(tr: string): 'week' | 'month' | 'quarter' | 'year' {
  if (tr === 'week') return 'week';
  if (tr === 'quarter') return 'quarter';
  if (tr === 'year') return 'year';
  return 'month';
}

const StatsPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [timeRange, setTimeRange] = useState('month');
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Fetch analytics data
  const { data: analytics, isLoading: analyticsLoading, error, refetch: refetchAnalytics } = useQuery<AnalyticsData>({
    queryKey: ['adminAnalytics', timeRange],
    queryFn: () =>
      adminDashboardAPI.getAnalytics({
        metric: 'all',
        period: timeRange,
        group_by: timeRange === 'year' ? 'month' : 'day',
      }),
  });

  // Handlers
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleTimeRangeChange = (e: SelectChangeEvent<string>) => {
    setTimeRange(e.target.value);
  };

  const exportStatsMutation = useMutation({
    mutationFn: () =>
      adminStatsAPI.exportStatsReport({
        type: 'all',
        period: statsTimeRangeToPeriod(timeRange),
        format: 'csv',
      }),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const p = statsTimeRangeToPeriod(timeRange);
      a.download = `platform_stats_all_${p}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setSnackbar({ open: true, message: '统计报表已开始下载', severity: 'success' });
    },
    onError: (err: unknown) => {
      setSnackbar({
        open: true,
        message: getApiErrorMessage(err, '导出失败（需 analytics:export 权限）'),
        severity: 'error',
      });
    },
  });

  const handleExport = () => {
    exportStatsMutation.mutate();
  };

  // Prepare chart data
  const userGrowthData = analytics?.userGrowth?.labels.map((label, index) => ({
    date: label.slice(5),
    newUsers: analytics?.userGrowth?.series.newUsers[index] || 0,
    activeUsers: analytics?.userGrowth?.series.activeUsers[index] || 0,
    advertisers: analytics?.userGrowth?.series.advertisers[index] || 0,
    kols: analytics?.userGrowth?.series.kols[index] || 0,
  })) || [];

  const revenueData = analytics?.revenueTrend?.labels.map((label, index) => ({
    date: label.slice(5),
    revenue: analytics?.revenueTrend?.series.revenue[index] || 0,
    payout: analytics?.revenueTrend?.series.payout[index] || 0,
    profit: (analytics?.revenueTrend?.series.revenue[index] || 0) - (analytics?.revenueTrend?.series.payout[index] || 0),
  })) || [];

  const cp = analytics?.campaignPerformance;
  const campaignData =
    cp?.labels.map((label, index) => ({
      name: label,
      impressions: cp.series.impressions[index] ?? 0,
      clicks: cp.series.clicks[index] ?? 0,
      conversions: cp.series.conversions[index] ?? 0,
    })) ?? [];

  const platformData = analytics?.platformDistribution
    ? Object.entries(analytics.platformDistribution).map(([platform, value]) => ({
        name: platform === 'tiktok' ? 'TikTok' : platform === 'youtube' ? 'YouTube' : platform === 'instagram' ? 'Instagram' : platform,
        value,
      }))
    : [];

  const categoryDist = analytics?.categoryDistribution ?? analytics?.kolCategoryDistribution;
  const categoryData = categoryDist
    ? Object.entries(categoryDist).map(([category, value]) => ({
        name: category,
        value,
      }))
    : [];

  const campaignTotals = campaignData.reduce(
    (acc, d) => ({
      impressions: acc.impressions + d.impressions,
      clicks: acc.clicks + d.clicks,
      conversions: acc.conversions + d.conversions,
    }),
    { impressions: 0, clicks: 0, conversions: 0 }
  );
  const ctrPercent =
    campaignTotals.impressions > 0 ? (campaignTotals.clicks / campaignTotals.impressions) * 100 : 0;
  const cvrPercent = campaignTotals.clicks > 0 ? (campaignTotals.conversions / campaignTotals.clicks) * 100 : 0;

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          数据统计
        </Typography>
        <Typography variant="body2" color="text.secondary">
          平台数据统计与分析报表
        </Typography>
      </Box>
      <AdminHubNav onRefresh={() => void refetchAnalytics()} />
      <Alert severity="info" sx={{ mb: 2, mt: 2 }}>
        图表随时间范围与聚合粒度变化；「导出数据」为平台统计 CSV，与当前时间范围一致（需具备统计导出权限）。
      </Alert>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap alignItems="center">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>时间范围</InputLabel>
            <Select
              value={timeRange}
              label="时间范围"
              onChange={handleTimeRangeChange}
            >
              <MenuItem value="week">近 7 天</MenuItem>
              <MenuItem value="month">近 30 天</MenuItem>
              <MenuItem value="quarter">近 90 天</MenuItem>
              <MenuItem value="year">近 1 年</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            disabled={exportStatsMutation.isPending}
          >
            {exportStatsMutation.isPending ? '导出中…' : '导出数据'}
          </Button>
          <IconButton onClick={() => void refetchAnalytics()} color="primary" aria-label="刷新统计数据">
            <RefreshIcon />
          </IconButton>
        </Stack>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
          <Tab label="数据总览" />
          <Tab label="用户增长" />
          <Tab label="活动转化" />
          <Tab label="收入分析" />
          <Tab label="KOL 效果" />
        </Tabs>
      </Paper>

      {/* Tab Panel 0 - Overview */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          {/* User Growth Chart */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <Card>
              <CardHeader
                title="用户增长趋势"
                subheader={`近${timeRange === 'week' ? '7' : timeRange === 'month' ? '30' : timeRange === 'quarter' ? '90' : '365'}天用户增长情况`}
              />
              <CardContent>
                {analyticsLoading ? (
                  <Skeleton variant="rectangular" height={300} />
                ) : error ? (
                  <Alert severity="error">
                  加载失败：{getApiErrorMessage(error, '请稍后重试')}
                </Alert>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={userGrowthData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip content={<StatsChartTooltip />} />
                      <Legend />
                      <Area type="monotone" dataKey="newUsers" stroke="#1976D2" fill="#1976D2" fillOpacity={0.3} name="新增用户" />
                      <Area type="monotone" dataKey="activeUsers" stroke="#2E7D32" fill="#2E7D32" fillOpacity={0.3} name="活跃用户" />
                    </AreaChart>
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
                ) : error ? (
                  <Alert severity="error">
                  加载失败：{getApiErrorMessage(error, '请稍后重试')}
                </Alert>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={platformData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={piePercentLabel}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {platformData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<StatsChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Revenue Trend */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <Card>
              <CardHeader
                title="收入趋势"
                subheader="收入与支出对比"
              />
              <CardContent>
                {analyticsLoading ? (
                  <Skeleton variant="rectangular" height={300} />
                ) : error ? (
                  <Alert severity="error">
                  加载失败：{getApiErrorMessage(error, '请稍后重试')}
                </Alert>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip content={<StatsChartTooltip />} />
                      <Legend />
                      <Bar dataKey="revenue" fill="#00897B" name="收入" />
                      <Bar dataKey="payout" fill="#ED6C02" name="支出" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Category Distribution */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <Card>
              <CardHeader
                title="KOL 分类分布"
                subheader="各分类 KOL 数量占比"
              />
              <CardContent>
                {analyticsLoading ? (
                  <Skeleton variant="rectangular" height={300} />
                ) : error ? (
                  <Alert severity="error">
                  加载失败：{getApiErrorMessage(error, '请稍后重试')}
                </Alert>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={piePercentLabel}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<StatsChartTooltip />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab Panel 1 - User Growth */}
      {tabValue === 1 && (
        <Grid container spacing={3}>
          <Grid size={12}>
            <Card>
              <CardHeader
                title="用户增长详细数据"
                subheader="新增用户、活跃用户、广告主、KOL 增长趋势"
              />
              <CardContent>
                {analyticsLoading ? (
                  <Skeleton variant="rectangular" height={400} />
                ) : error ? (
                  <Alert severity="error">
                  加载失败：{getApiErrorMessage(error, '请稍后重试')}
                </Alert>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={userGrowthData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip content={<StatsChartTooltip />} />
                      <Legend />
                      <Line type="monotone" dataKey="newUsers" stroke="#1976D2" strokeWidth={2} name="新增用户" />
                      <Line type="monotone" dataKey="activeUsers" stroke="#2E7D32" strokeWidth={2} name="活跃用户" />
                      <Line type="monotone" dataKey="advertisers" stroke="#ED6C02" strokeWidth={2} name="广告主" />
                      <Line type="monotone" dataKey="kols" stroke="#9C27B0" strokeWidth={2} name="KOL" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab Panel 2 - Campaign Conversion */}
      {tabValue === 2 && (
        <Grid container spacing={3}>
          <Grid size={12}>
            <Card>
              <CardHeader
                title="活动转化漏斗"
                subheader="活动曝光、点击、转化数据分析"
              />
              <CardContent>
                {analyticsLoading ? (
                  <Skeleton variant="rectangular" height={400} />
                ) : error ? (
                  <Alert severity="error">
                  加载失败：{getApiErrorMessage(error, '请稍后重试')}
                </Alert>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={campaignData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip content={<StatsChartTooltip />} />
                      <Legend />
                      <Bar dataKey="impressions" fill="#1976D2" name="曝光量" />
                      <Bar dataKey="clicks" fill="#2E7D32" name="点击量" />
                      <Bar dataKey="conversions" fill="#ED6C02" name="转化量" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  转化率分析
                </Typography>
                {campaignData.length > 0 && (
                  <Stack spacing={2} sx={{ mt: 2 }}>
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2">点击率 (CTR)</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {ctrPercent.toFixed(2)}%
                        </Typography>
                      </Box>
                      <Box sx={{ height: 8, bgcolor: 'grey.200', borderRadius: 1 }}>
                        <Box
                          sx={{
                            height: '100%',
                            width: `${Math.min(ctrPercent * 50, 100)}%`,
                            bgcolor: 'primary.main',
                            borderRadius: 1,
                          }}
                        />
                      </Box>
                    </Box>
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2">转化率 (CVR)</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {cvrPercent.toFixed(2)}%
                        </Typography>
                      </Box>
                      <Box sx={{ height: 8, bgcolor: 'grey.200', borderRadius: 1 }}>
                        <Box
                          sx={{
                            height: '100%',
                            width: `${Math.min(cvrPercent * 20, 100)}%`,
                            bgcolor: 'success.main',
                            borderRadius: 1,
                          }}
                        />
                      </Box>
                    </Box>
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab Panel 3 - Revenue Analysis */}
      {tabValue === 3 && (
        <Grid container spacing={3}>
          <Grid size={12}>
            <Card>
              <CardHeader
                title="收入与利润趋势"
                subheader="收入、支出、利润变化趋势"
              />
              <CardContent>
                {analyticsLoading ? (
                  <Skeleton variant="rectangular" height={400} />
                ) : error ? (
                  <Alert severity="error">
                  加载失败：{getApiErrorMessage(error, '请稍后重试')}
                </Alert>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip content={<StatsChartTooltip />} />
                      <Legend />
                      <Area type="monotone" dataKey="revenue" stroke="#00897B" fill="#00897B" fillOpacity={0.3} name="收入" />
                      <Area type="monotone" dataKey="payout" stroke="#ED6C02" fill="#ED6C02" fillOpacity={0.3} name="支出" />
                      <Area type="monotone" dataKey="profit" stroke="#1976D2" fill="#1976D2" fillOpacity={0.3} name="利润" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab Panel 4 - KOL Performance */}
      {tabValue === 4 && (
        <Grid container spacing={3}>
          <Grid size={12}>
            <Card>
              <CardHeader
                title="KOL 效果分析"
                subheader="KOL 平台分布、分类分布统计"
              />
              <CardContent>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Box sx={{ height: 350 }}>
                      {analyticsLoading ? (
                        <Skeleton variant="rectangular" height={350} />
                      ) : error ? (
                        <Alert severity="error">
                  加载失败：{getApiErrorMessage(error, '请稍后重试')}
                </Alert>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={platformData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={piePercentLabel}
                              outerRadius={120}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {platformData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip content={<StatsChartTooltip />} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Box sx={{ height: 350 }}>
                      {analyticsLoading ? (
                        <Skeleton variant="rectangular" height={350} />
                      ) : error ? (
                        <Alert severity="error">
                  加载失败：{getApiErrorMessage(error, '请稍后重试')}
                </Alert>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={categoryData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={piePercentLabel}
                              outerRadius={120}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {categoryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip content={<StatsChartTooltip />} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
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

export default StatsPage;
