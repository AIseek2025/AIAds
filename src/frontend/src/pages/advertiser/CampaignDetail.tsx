import React, { useMemo, useState } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Avatar from '@mui/material/Avatar';
import Stack from '@mui/material/Stack';
import LinearProgress from '@mui/material/LinearProgress';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Link from '@mui/material/Link';
import Skeleton from '@mui/material/Skeleton';
import { styled } from '@mui/material/styles';

// Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PeopleIcon from '@mui/icons-material/People';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ScheduleIcon from '@mui/icons-material/Schedule';
// Types
import type { Campaign } from '../../types';

// Services
import { AdvertiserHubNav } from '../../components/advertiser/AdvertiserHubNav';
import {
  ADVERTISER_ROUTE_SEG,
  pathAdvertiser,
  pathAdvertiserCampaignEdit,
  pathAdvertiserOrder,
} from '../../constants/appPaths';
import {
  advertiserAPI,
  advertiserBalanceQueryKey,
  campaignAPI,
  orderAPI,
} from '../../services/advertiserApi';
import { AdvertiserLowBalanceAlert } from '../../components/advertiser/AdvertiserLowBalanceAlert';
import { getApiErrorMessage } from '../../utils/apiError';
import { advertiserOrderFrozenCny, advertiserOrderGrossSpendCny } from '../../utils/advertiserOrderGross';
import { usePublicUiConfig, isBudgetAtOrAboveRisk } from '../../hooks/usePublicUiConfig';

/** GET /orders 行（snake_case，含可选 kol / cpm_breakdown） */
interface AdvertiserOrderRow {
  id: string;
  order_no?: string;
  pricing_model?: string;
  price?: number;
  status?: string;
  views?: number;
  content_count?: number;
  content_type?: string;
  created_at?: string;
  kol?: {
    platform_username: string;
    platform_display_name: string | null;
    platform_avatar_url: string | null;
    platform: string;
  };
  cpm_breakdown?: {
    gross_spend: number;
    billable_impressions?: number;
    raw_views?: number;
  };
  frozen_amount?: number;
}

// Styled Components
const StatCard = styled(Card)(() => ({
  height: '100%',
  transition: 'transform 0.2s',
  '&:hover': {
    transform: 'translateY(-4px)',
  },
}));

const StatIconWrapper = styled(Box)<{ color?: string }>(({ theme, color }) => ({
  width: 48,
  height: 48,
  borderRadius: 12,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: color ? `${color}20` : theme.palette.primary.light,
  color: color || theme.palette.primary.main,
}));

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`campaign-tabpanel-${index}`}
      aria-labelledby={`campaign-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `campaign-tab-${index}`,
    'aria-controls': `campaign-tabpanel-${index}`,
  };
}

function canEditCampaignByStatus(status: Campaign['status']): boolean {
  return status !== 'completed' && status !== 'cancelled';
}

function canDeleteCampaignByStatus(status: Campaign['status']): boolean {
  return status === 'draft' || status === 'cancelled';
}

export const CampaignDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tabValue, setTabValue] = useState(0);

  // Fetch campaign details
  const {
    data: campaign,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => campaignAPI.getCampaign(id!),
    enabled: !!id,
    retry: 1,
  });

  // Fetch campaign stats
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['campaignStats', id],
    queryFn: () => campaignAPI.getCampaignStats(id!),
    enabled: !!id,
    retry: 1,
  });

  const { data: ordersData, isLoading: ordersLoading, refetch: refetchOrders } = useQuery({
    queryKey: ['campaignOrders', id],
    queryFn: () => orderAPI.getOrders({ campaign_id: id!, page_size: 100 }),
    enabled: !!id,
    retry: 1,
  });
  const orders = useMemo(
    () => (ordersData?.items ?? []) as unknown as AdvertiserOrderRow[],
    [ordersData]
  );

  const { data: publicUi } = usePublicUiConfig();
  const budgetRiskTh = publicUi?.budget_risk_threshold ?? 0.85;

  const balanceQ = useQuery({
    queryKey: [...advertiserBalanceQueryKey],
    queryFn: advertiserAPI.getBalance,
    retry: 1,
  });
  const campaignBudgetAtRisk = useMemo(() => {
    if (!campaign) return false;
    if (campaign.status !== 'active') return false;
    return isBudgetAtOrAboveRisk(
      campaign.budget,
      campaign.spentAmount ?? 0,
      budgetRiskTh
    );
  }, [campaign, budgetRiskTh]);

  /** 订单列表中按 KOL 去重，用于「合作 KOL」页签 */
  const uniqueKolsFromOrders = useMemo(() => {
    const seen = new Set<string>();
    const out: AdvertiserOrderRow[] = [];
    for (const o of orders) {
      const k = o.kol;
      const key = k
        ? `${k.platform}:${k.platform_username ?? ''}`
        : o.id;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(o);
    }
    return out;
  }, [orders]);

  // Create mutation
  const deleteMutation = useMutation({
    mutationFn: campaignAPI.deleteCampaign,
    onSuccess: () => {
      setSnackbar({
        open: true,
        severity: 'success',
        message: '活动删除成功',
      });
      setTimeout(() => navigate(pathAdvertiser(ADVERTISER_ROUTE_SEG.campaigns)), 1000);
    },
    onError: (err: unknown) => {
      setSnackbar({
        open: true,
        severity: 'error',
        message: getApiErrorMessage(err, '删除失败，请稍后重试'),
      });
    },
  });

  const submitMutation = useMutation({
    mutationFn: campaignAPI.submitCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', id] });
      setSnackbar({
        open: true,
        severity: 'success',
        message: '已提交审核',
      });
    },
    onError: (err: unknown) => {
      setSnackbar({
        open: true,
        severity: 'error',
        message: getApiErrorMessage(err, '提交失败，请稍后重试'),
      });
    },
  });

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    severity: 'success' | 'error';
    message: string;
  }>({ open: false, severity: 'success', message: '' });

  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(value);
  };

  // Format number
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('zh-CN').format(value);
  };

  // Get status label
  const getStatusLabel = (status: Campaign['status']) => {
    const labels: Record<string, string> = {
      draft: '草稿',
      pending_review: '待审核',
      active: '进行中',
      paused: '已暂停',
      completed: '已完成',
      cancelled: '已取消',
      rejected: '已驳回',
    };
    return labels[status] || status;
  };

  // Get status color
  const getStatusColor = (status: Campaign['status']) => {
    const colors: Record<string, 'default' | 'success' | 'warning' | 'info' | 'error'> = {
      draft: 'default',
      pending_review: 'warning',
      active: 'success',
      paused: 'warning',
      completed: 'info',
      cancelled: 'error',
      rejected: 'error',
    };
    return colors[status] || 'default';
  };

  // Get objective label
  const getObjectiveLabel = (objective: Campaign['objective']) => {
    const labels = {
      awareness: '品牌曝光',
      consideration: '用户互动',
      conversion: '转化购买',
    };
    return labels[objective] || objective;
  };

  // Get order status label
  const getOrderStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: '待确认',
      accepted: '已接受',
      in_progress: '进行中',
      submitted: '已提交',
      approved: '已批准',
      published: '已发布',
      completed: '已完成',
      rejected: '已拒绝',
      cancelled: '已取消',
      disputed: '纠纷中',
      revision: '待修改',
    };
    return labels[status] || status;
  };

  // Get order status color
  const getOrderStatusColor = (status: string) => {
    const colors: Record<string, 'default' | 'success' | 'warning' | 'info' | 'error'> = {
      pending: 'warning',
      accepted: 'info',
      in_progress: 'success',
      submitted: 'success',
      approved: 'success',
      published: 'success',
      completed: 'success',
      rejected: 'error',
      cancelled: 'default',
      disputed: 'warning',
      revision: 'info',
    };
    return colors[status] || 'default';
  };

  const handleHubRefresh = () => {
    void refetch();
    void refetchStats();
    void refetchOrders();
    void balanceQ.refetch();
  };

  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="rectangular" height={60} sx={{ mb: 3 }} />
        <Skeleton variant="rectangular" height={200} sx={{ mb: 3 }} />
        <Skeleton variant="rectangular" height={400} />
      </Box>
    );
  }

  if (error || !campaign) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error
            ? getApiErrorMessage(error, '加载活动详情失败，请稍后重试')
            : '未找到该活动或无权查看'}
        </Alert>
        <Button variant="contained" onClick={() => navigate(pathAdvertiser(ADVERTISER_ROUTE_SEG.campaigns))}>
          返回列表
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          mb: 4,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate(pathAdvertiser(ADVERTISER_ROUTE_SEG.campaigns))}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Typography variant="h4">{campaign.title}</Typography>
              <Chip
                label={getStatusLabel(campaign.status)}
                color={getStatusColor(campaign.status)}
              />
            </Box>
            <Typography variant="body1" color="text.secondary">
              {campaign.description || '暂无描述'}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {campaign.status === 'draft' && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<ScheduleIcon />}
              onClick={() => submitMutation.mutate(campaign.id)}
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? '提交中…' : '提交审核'}
            </Button>
          )}
          <Tooltip
            title={
              canEditCampaignByStatus(campaign.status)
                ? '编辑活动'
                : '已完成或已取消的活动不可编辑'
            }
          >
            <span>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() =>
                  navigate(pathAdvertiserCampaignEdit(campaign.id))
                }
                disabled={!canEditCampaignByStatus(campaign.status)}
              >
                编辑
              </Button>
            </span>
          </Tooltip>
          <Tooltip
            title={
              canDeleteCampaignByStatus(campaign.status)
                ? '删除活动'
                : '仅草稿或已取消的活动可删除'
            }
          >
            <span>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => {
                  if (window.confirm('确定要删除这个活动吗？')) {
                    deleteMutation.mutate(campaign.id);
                  }
                }}
                disabled={
                  deleteMutation.isPending ||
                  !canDeleteCampaignByStatus(campaign.status)
                }
              >
                删除
              </Button>
            </span>
          </Tooltip>
        </Box>
      </Box>

      <AdvertiserHubNav preset="campaign-detail" onRefresh={handleHubRefresh} />
      <AdvertiserLowBalanceAlert
        balance={balanceQ.data ?? null}
        publicUi={publicUi}
        context="campaign-detail"
        sx={{ mb: 3 }}
      />
      <Alert severity="info" sx={{ mb: 3 }}>
        本页合作订单与 CPM 展示口径与订单中心一致；预算消耗与冻结以账户流水及订单状态为准。刷新将同步活动主数据、统计卡片与本页订单列表。
      </Alert>
      {campaignBudgetAtRisk ? (
        <Alert severity="warning" sx={{ mb: 3 }}>
          当前活动已消耗 ≥{Math.round(budgetRiskTh * 100)}% 预算（与平台预算风险预警阈值一致），请关注投放节奏或调整预算。
        </Alert>
      ) : null}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <StatIconWrapper color="#1976d2">
                  <AttachMoneyIcon />
                </StatIconWrapper>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    预算使用
                  </Typography>
                  <Typography variant="h5">
                    {formatCurrency(campaign.spentAmount || 0)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    总预算：{formatCurrency(campaign.budget)}
                  </Typography>
                  <Typography
                    variant="caption"
                    color={(campaign.ordersFrozenTotal ?? 0) > 0 ? 'primary.main' : 'text.secondary'}
                    display="block"
                    sx={{ mt: 0.5 }}
                  >
                    订单冻结（本活动）：{formatCurrency(campaign.ordersFrozenTotal ?? 0)}
                  </Typography>
                </Box>
              </Box>
              <LinearProgress
                variant="determinate"
                value={
                  campaign.budget
                    ? ((campaign.spentAmount || 0) / campaign.budget) * 100
                    : 0
                }
                sx={{ mt: 2, borderRadius: 1 }}
              />
            </CardContent>
          </StatCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <StatIconWrapper color="#2e7d32">
                  <VisibilityIcon />
                </StatIconWrapper>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    总曝光量
                  </Typography>
                  <Typography variant="h5">
                    {formatNumber(stats?.total_views || campaign.totalViews || 0)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </StatCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <StatIconWrapper color="#ed6c02">
                  <TrendingUpIcon />
                </StatIconWrapper>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    总互动数
                  </Typography>
                  <Typography variant="h5">
                    {formatNumber(
                      (stats?.total_likes || campaign.totalLikes || 0) +
                        (stats?.total_comments || campaign.totalComments || 0)
                    )}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </StatCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <StatIconWrapper color="#9c27b0">
                  <PeopleIcon />
                </StatIconWrapper>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    合作 KOL 数
                  </Typography>
                  <Typography variant="h5">
                    {campaign.selectedKols || campaign.totalKols || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    已发布：{campaign.publishedVideos || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </StatCard>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="campaign tabs"
          >
            <Tab label="活动详情" {...a11yProps(0)} />
            <Tab label={`订单列表 (${orders.length})`} {...a11yProps(1)} />
            <Tab label={`合作 KOL (${uniqueKolsFromOrders.length})`} {...a11yProps(2)} />
            <Tab label="数据分析" {...a11yProps(3)} />
          </Tabs>
        </Box>

        <CardContent>
          {/* Tab Panel 0: Campaign Details */}
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  基本信息
                </Typography>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        活动目标
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {getObjectiveLabel(campaign.objective)}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        预算类型
                      </Typography>
                      <Typography variant="body2">
                        {campaign.budgetType === 'fixed' ? '固定预算' : '按视频计费'}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        开始日期
                      </Typography>
                      <Typography variant="body2">
                        {new Date(campaign.startDate).toLocaleDateString('zh-CN')}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        结束日期
                      </Typography>
                      <Typography variant="body2">
                        {new Date(campaign.endDate).toLocaleDateString('zh-CN')}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  目标受众
                </Typography>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        年龄范围
                      </Typography>
                      <Typography variant="body2">
                        {campaign.targetAudience?.ageRange || '-'}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        性别
                      </Typography>
                      <Typography variant="body2">
                        {campaign.targetAudience?.gender === 'all'
                          ? '全部'
                          : campaign.targetAudience?.gender === 'male'
                          ? '男性'
                          : '女性'}
                      </Typography>
                    </Grid>
                    {campaign.targetAudience?.locations &&
                      campaign.targetAudience.locations.length > 0 && (
                        <Grid size={{ xs: 12 }}>
                          <Typography variant="caption" color="text.secondary">
                            目标地区
                          </Typography>
                          <Typography variant="body2">
                            {campaign.targetAudience.locations.join(', ')}
                          </Typography>
                        </Grid>
                      )}
                  </Grid>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  投放平台
                </Typography>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {campaign.targetPlatforms.map((platform: string) => (
                      <Chip key={platform} label={platform} variant="outlined" />
                    ))}
                  </Stack>
                </Paper>
              </Grid>

              {campaign.contentRequirements && (
                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    内容要求
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="body2">
                      {campaign.contentRequirements}
                    </Typography>
                  </Paper>
                </Grid>
              )}

              {campaign.requiredHashtags && campaign.requiredHashtags.length > 0 && (
                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    必需标签
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {campaign.requiredHashtags.map((hashtag: string) => (
                        <Chip
                          key={hashtag}
                          label={`#${hashtag}`}
                          variant="outlined"
                        />
                      ))}
                    </Stack>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </TabPanel>

          {/* Tab Panel 1: Orders */}
          <TabPanel value={tabValue} index={1}>
            <Alert severity="info" sx={{ mb: 2 }}>
              曝光、互动等指标通常每约 2 小时从平台同步一次；结算窗口与最终金额以平台规则与订单状态为准。CPM
              订单展示当前口径下的预估/累计应付（gross_spend）。
            </Alert>
            {ordersLoading ? (
              <Skeleton variant="rectangular" height={220} />
            ) : orders.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                暂无订单，请在 KOL 发现页发起合作并下单。
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>KOL</TableCell>
                      <TableCell>平台</TableCell>
                      <TableCell>计价</TableCell>
                      <TableCell align="right">曝光</TableCell>
                      <TableCell align="right">应付/预估</TableCell>
                      <TableCell align="right">
                        <Tooltip title="为该订单从账户预留的冻结金额；无冻结时显示 —。">
                          <span style={{ cursor: 'help' }}>冻结</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell>状态</TableCell>
                      <TableCell>交付</TableCell>
                      <TableCell>创建日期</TableCell>
                      <TableCell align="right">操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orders.map((order) => {
                      const kolLabel =
                        order.kol?.platform_display_name ||
                        order.kol?.platform_username ||
                        order.id.slice(0, 8);
                      const kolInitial = (kolLabel || '?').charAt(0);
                      const spend = advertiserOrderGrossSpendCny(order as unknown as Record<string, unknown>);
                      const frozen = advertiserOrderFrozenCny(order as unknown as Record<string, unknown>);
                      return (
                        <TableRow key={order.id}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar src={order.kol?.platform_avatar_url || undefined} sx={{ width: 32, height: 32 }}>
                                {kolInitial}
                              </Avatar>
                              <Typography variant="body2">{kolLabel}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={order.kol?.platform || '—'}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={order.pricing_model === 'cpm' ? 'CPM' : '固定价'}
                              size="small"
                              color={order.pricing_model === 'cpm' ? 'secondary' : 'default'}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="right">
                            {order.pricing_model === 'cpm' && order.cpm_breakdown ? (
                              <Tooltip
                                title={
                                  <span>
                                    原始曝光（平台同步）：{' '}
                                    {formatNumber(order.cpm_breakdown.raw_views ?? order.views ?? 0)}
                                    <br />
                                    计费曝光（CPM 结算口径）：{' '}
                                    {formatNumber(order.cpm_breakdown.billable_impressions ?? 0)}
                                  </span>
                                }
                                enterTouchDelay={0}
                              >
                                <Typography variant="body2" component="span" sx={{ cursor: 'help' }}>
                                  {formatNumber(order.views ?? 0)}
                                </Typography>
                              </Tooltip>
                            ) : (
                              <Typography variant="body2">{formatNumber(order.views ?? 0)}</Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="bold">
                              {formatCurrency(spend)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              variant="body2"
                              color={frozen > 0 ? 'text.primary' : 'text.secondary'}
                            >
                              {frozen > 0 ? formatCurrency(frozen) : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={getOrderStatusLabel(order.status || '')}
                              size="small"
                              color={getOrderStatusColor(order.status || '')}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {order.content_count ?? 0} · {order.content_type ?? '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {order.created_at
                                ? new Date(order.created_at).toLocaleDateString('zh-CN')
                                : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Link component={RouterLink} to={pathAdvertiserOrder(order.id)} underline="hover">
                              详情
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* Tab Panel 2: KOLs（来自本活动订单，去重） */}
          <TabPanel value={tabValue} index={2}>
            {uniqueKolsFromOrders.length === 0 ? (
              <Box>
                <Typography variant="body2" color="text.secondary" paragraph>
                  暂无合作 KOL。请在 KOL 发现页选择达人并创建订单后，将显示在此处。
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => navigate(pathAdvertiser(ADVERTISER_ROUTE_SEG.kols))}
                >
                  前往 KOL 发现
                </Button>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {uniqueKolsFromOrders.map((order) => {
                  const kol = order.kol;
                  const name =
                    kol?.platform_display_name ||
                    kol?.platform_username ||
                    'KOL';
                  const initial = name.charAt(0);
                  return (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={`${order.id}-${name}`}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar
                              src={kol?.platform_avatar_url || undefined}
                              sx={{ width: 56, height: 56 }}
                            >
                              {initial}
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="subtitle2" noWrap>
                                {name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {kol?.platform_username || '—'}
                              </Typography>
                            </Box>
                            <Chip
                              label={kol?.platform || '—'}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                          <Divider sx={{ my: 2 }} />
                          <Typography variant="caption" color="text.secondary">
                            关联订单状态
                          </Typography>
                          <Box sx={{ mt: 0.5 }}>
                            <Chip
                              label={getOrderStatusLabel(order.status || '')}
                              size="small"
                              color={getOrderStatusColor(order.status || '')}
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </TabPanel>

          {/* Tab Panel 3: Analytics */}
          <TabPanel value={tabValue} index={3}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      曝光趋势
                    </Typography>
                    <Box
                      sx={{
                        height: 200,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'action.hover',
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        图表区域 - 展示曝光量趋势
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      互动趋势
                    </Typography>
                    <Box
                      sx={{
                        height: 200,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'action.hover',
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        图表区域 - 展示互动量趋势
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      点击率 (CTR)
                    </Typography>
                    <Typography variant="h4">
                      {stats?.ctr ? `${(stats.ctr * 100).toFixed(2)}%` : '2.5%'}
                    </Typography>
                    <Typography variant="caption" color="success.main">
                      <TrendingUpIcon fontSize="small" /> 较上周 +0.5%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      转化率
                    </Typography>
                    <Typography variant="h4">
                      {stats?.conversion_rate
                        ? `${(stats.conversion_rate * 100).toFixed(2)}%`
                        : '1.2%'}
                    </Typography>
                    <Typography variant="caption" color="success.main">
                      <TrendingUpIcon fontSize="small" /> 较上周 +0.3%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      ROI
                    </Typography>
                    <Typography variant="h4">
                      {stats
                        ? `${((stats.total_views * 0.01) / campaign.budget).toFixed(2)}x`
                        : '3.5x'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      投入产出比
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>
        </CardContent>
      </Card>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CampaignDetailPage;
