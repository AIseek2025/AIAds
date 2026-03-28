import React, { useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import LinearProgress from '@mui/material/LinearProgress';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Rating from '@mui/material/Rating';
import Tooltip from '@mui/material/Tooltip';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { AdvertiserHubNav } from '../../components/advertiser/AdvertiserHubNav';
import {
  ADVERTISER_ROUTE_SEG,
  pathAdvertiser,
  pathAdvertiserCampaign,
} from '../../constants/appPaths';
import {
  advertiserAPI,
  advertiserBalanceQueryKey,
  orderAPI,
} from '../../services/advertiserApi';
import { getApiErrorMessage } from '../../utils/apiError';
import {
  advertiserOrderFrozenCny,
  advertiserOrderGrossSpendCny,
} from '../../utils/advertiserOrderGross';
import { usePublicUiConfig } from '../../hooks/usePublicUiConfig';
import { AdvertiserLowBalanceAlert } from '../../components/advertiser/AdvertiserLowBalanceAlert';

const qkOrder = (id: string) => ['advertiser-order', id] as const;

const ORDER_STATUS_LABEL: Record<string, string> = {
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

const ORDER_STATUS_COLOR: Record<string, 'default' | 'success' | 'warning' | 'info' | 'error'> = {
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value);
}

function num(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') return Number(v) || 0;
  return 0;
}

function str(v: unknown): string {
  return v == null ? '' : String(v);
}

const AdvertiserOrderDetailPage: React.FC = () => {
  const { id: orderId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [completeOpen, setCompleteOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(5);
  const [review, setReview] = useState('');
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    severity: 'success' | 'error';
    message: string;
  }>({ open: false, severity: 'success', message: '' });

  const orderQuery = useQuery({
    queryKey: orderId ? qkOrder(orderId) : ['advertiser-order', 'missing'],
    queryFn: () => orderAPI.getOrder(orderId!),
    enabled: Boolean(orderId),
    retry: 1,
  });

  const balanceQ = useQuery({
    queryKey: [...advertiserBalanceQueryKey],
    queryFn: advertiserAPI.getBalance,
    retry: 1,
  });

  const { data: publicUi } = usePublicUiConfig();

  const { refetch: refetchOrder } = orderQuery;

  const order = orderQuery.data as Record<string, unknown> | undefined;
  const pricingModel = str(order?.pricing_model);

  const cpmQuery = useQuery({
    queryKey: ['advertiser-order-cpm', orderId],
    queryFn: () => orderAPI.getCpmMetrics(orderId!),
    enabled: Boolean(orderId) && orderQuery.isSuccess && pricingModel === 'cpm',
    retry: 1,
  });

  const handleHubRefresh = () => {
    void refetchOrder();
    void cpmQuery.refetch();
    void balanceQ.refetch();
  };

  const cpmBreakdown = useMemo(() => {
    const fromApi = cpmQuery.data as Record<string, unknown> | undefined;
    const embedded = order?.cpm_breakdown as Record<string, unknown> | undefined;
    return fromApi ?? embedded;
  }, [cpmQuery.data, order]);

  /** 与列表页一致：合成 pricing_model + 合并后的 cpm_breakdown 再取 gross / frozen */
  const spend = useMemo(() => {
    if (!order) return 0;
    const row = {
      ...order,
      pricing_model: pricingModel,
      cpm_breakdown: cpmBreakdown ?? order.cpm_breakdown,
    } as Record<string, unknown>;
    return advertiserOrderGrossSpendCny(row);
  }, [order, pricingModel, cpmBreakdown]);

  const frozenAmt = useMemo(
    () => (order ? advertiserOrderFrozenCny(order as Record<string, unknown>) : 0),
    [order]
  );

  const canAdvertiserComplete = useMemo(() => {
    const st = str(order?.status);
    return ['submitted', 'approved', 'published'].includes(st);
  }, [order]);

  const completeMutation = useMutation({
    mutationFn: () =>
      orderAPI.completeOrder(orderId!, {
        rating: rating ?? undefined,
        review: review.trim() || undefined,
      }),
    onSuccess: async () => {
      setCompleteOpen(false);
      setSnackbar({ open: true, severity: 'success', message: '订单已确认完成' });
      if (orderId) {
        await queryClient.invalidateQueries({ queryKey: qkOrder(orderId) });
        await queryClient.invalidateQueries({ queryKey: ['advertiser-order-cpm', orderId] });
      }
      await queryClient.invalidateQueries({ queryKey: ['advertiser-orders'] });
      await queryClient.invalidateQueries({ queryKey: ['campaignOrders'] });
    },
    onError: (err: unknown) => {
      setSnackbar({
        open: true,
        severity: 'error',
        message: getApiErrorMessage(err, '操作失败'),
      });
    },
  });

  if (!orderId) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">缺少订单 ID</Alert>
      </Box>
    );
  }

  if (orderQuery.isError) {
    return (
      <Box sx={{ p: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(pathAdvertiser(ADVERTISER_ROUTE_SEG.orders))}>
          返回订单列表
        </Button>
        <Alert severity="error" sx={{ mt: 2 }}>
          {getApiErrorMessage(orderQuery.error, '加载失败')}
        </Alert>
      </Box>
    );
  }

  const kol = order?.kol as
    | {
        platform_username?: string;
        platform_display_name?: string | null;
        platform_avatar_url?: string | null;
        platform?: string;
      }
    | undefined;

  const kolLabel =
    kol?.platform_display_name || kol?.platform_username || str(order?.kol_id) || 'KOL';
  const status = str(order?.status);
  const campaignId = str(order?.campaign_id);
  const campaignTitle = str(order?.campaign_title) || '—';

  const draftUrls = Array.isArray(order?.draft_urls) ? (order.draft_urls as string[]) : [];
  const publishedUrls = Array.isArray(order?.published_urls)
    ? (order.published_urls as string[])
    : [];

  return (
    <Box sx={{ p: 3 }}>
      {orderQuery.isLoading ? <LinearProgress sx={{ mb: 2 }} /> : null}

      <Breadcrumbs sx={{ mb: 2 }}>
        <Link component={RouterLink} to={pathAdvertiser(ADVERTISER_ROUTE_SEG.orders)} underline="hover" color="inherit">
          订单中心
        </Link>
        <Typography color="text.primary">
          {str(order?.order_no) || orderId.slice(0, 8)}
        </Typography>
      </Breadcrumbs>

      <AdvertiserHubNav preset="order-detail" onRefresh={handleHubRefresh} />

      <Alert severity="info" sx={{ mb: 2 }}>
        CPM 明细与活动详情、订单列表口径一致；确认完成与评价将同步订单与活动侧数据。刷新将同时更新订单主数据与 CPM 明细（若适用）。
      </Alert>

      <AdvertiserLowBalanceAlert
        balance={balanceQ.data}
        publicUi={publicUi}
        context="order-detail"
        sx={{ mb: 2 }}
      />

      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }} flexWrap="wrap">
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(pathAdvertiser(ADVERTISER_ROUTE_SEG.orders))}>
          返回列表
        </Button>
        {campaignId ? (
          <Button variant="outlined" onClick={() => navigate(pathAdvertiserCampaign(campaignId))}>
            查看活动
          </Button>
        ) : null}
      </Stack>

      <Typography variant="h4" gutterBottom fontWeight="bold">
        订单详情
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mb: 2 }}>
                <Avatar src={kol?.platform_avatar_url || undefined} sx={{ width: 56, height: 56 }}>
                  {kolLabel.charAt(0)}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="h6">{kolLabel}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    @{kol?.platform_username || '—'} · {kol?.platform || str(order?.platform) || '—'}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    活动：{campaignTitle}
                  </Typography>
                </Box>
                <Chip
                  label={ORDER_STATUS_LABEL[status] || status}
                  color={ORDER_STATUS_COLOR[status] || 'default'}
                />
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2}>
                <Grid size={{ xs: 6, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">
                    订单号
                  </Typography>
                  <Typography variant="body2">{str(order?.order_no) || orderId}</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">
                    计价
                  </Typography>
                  <Typography variant="body2">
                    {pricingModel === 'cpm' ? 'CPM' : '固定价'}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">
                    应付/预估
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {formatCurrency(spend)}
                  </Typography>
                </Grid>
                {frozenAmt > 0 ? (
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <Tooltip title="订单进行中或待结算时，从账户为该笔订单预留的冻结金额；完成、取消或退款后按规则释放。">
                      <Typography variant="caption" color="text.secondary" sx={{ cursor: 'help' }}>
                        冻结预算
                      </Typography>
                    </Tooltip>
                    <Typography variant="body2">{formatCurrency(frozenAmt)}</Typography>
                  </Grid>
                ) : null}
                <Grid size={{ xs: 6, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">
                    曝光
                  </Typography>
                  <Typography variant="body2">{formatNumber(num(order?.views))}</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">
                    创建时间
                  </Typography>
                  <Typography variant="body2">
                    {order?.created_at
                      ? new Date(str(order.created_at)).toLocaleString('zh-CN')
                      : '—'}
                  </Typography>
                </Grid>
                {order?.completed_at ? (
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary">
                      完成时间
                    </Typography>
                    <Typography variant="body2">
                      {new Date(str(order.completed_at)).toLocaleString('zh-CN')}
                    </Typography>
                  </Grid>
                ) : null}
              </Grid>

              {status === 'completed' && (order?.advertiser_rating != null || order?.advertiser_review) ? (
                <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    我的评价
                  </Typography>
                  {order.advertiser_rating != null ? (
                    <Rating value={num(order.advertiser_rating)} readOnly size="small" />
                  ) : null}
                  {str(order?.advertiser_review) ? (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {str(order.advertiser_review)}
                    </Typography>
                  ) : null}
                </Paper>
              ) : null}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                操作
              </Typography>
              {canAdvertiserComplete ? (
                <>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    内容已发布或待您确认时，可在此确认完成并结算（CPM 按当前曝光与费率计算）。
                  </Alert>
                  <Button variant="contained" fullWidth onClick={() => setCompleteOpen(true)}>
                    确认完成订单
                  </Button>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {status === 'completed'
                    ? '已确认完成。'
                    : '当前状态不可由广告主确认完成；请等待 KOL 提交或内容发布后再试。'}
                </Typography>
              )}
            </CardContent>
          </Card>

          {pricingModel === 'cpm' && cpmBreakdown ? (
            <Card variant="outlined" sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  CPM 口径明细
                </Typography>
                {cpmQuery.isLoading ? <LinearProgress /> : null}
                <Stack spacing={0.5} sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    原始曝光：{formatNumber(num((cpmBreakdown as { raw_views?: unknown }).raw_views))}
                  </Typography>
                  <Typography variant="body2">
                    计费曝光：{formatNumber(
                      num((cpmBreakdown as { billable_impressions?: unknown }).billable_impressions)
                    )}
                  </Typography>
                  <Typography variant="body2">
                    CPM 单价：{formatCurrency(num((cpmBreakdown as { cpm_rate?: unknown }).cpm_rate))} / 千次
                  </Typography>
                  <Typography variant="body2">
                    预算上限：
                    {(cpmBreakdown as { cpm_budget_cap?: unknown }).cpm_budget_cap != null
                      ? formatCurrency(num((cpmBreakdown as { cpm_budget_cap?: unknown }).cpm_budget_cap))
                      : '—'}
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    应付（gross）：{formatCurrency(num((cpmBreakdown as { gross_spend?: unknown }).gross_spend))}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    平台费 {formatCurrency(num((cpmBreakdown as { platform_fee?: unknown }).platform_fee))} · KOL
                    预估 {formatCurrency(num((cpmBreakdown as { kol_earning?: unknown }).kol_earning))}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          ) : null}
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                交付链接
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                草稿与发布链接由 KOL 提交；请以平台侧为准。
              </Typography>
              <Typography variant="subtitle2">草稿</Typography>
              {draftUrls.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  暂无
                </Typography>
              ) : (
                <Stack spacing={0.5} sx={{ mb: 2 }}>
                  {draftUrls.map((u) => (
                    <Link key={u} href={u} target="_blank" rel="noopener noreferrer">
                      {u}
                    </Link>
                  ))}
                </Stack>
              )}
              <Typography variant="subtitle2">已发布</Typography>
              {publishedUrls.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  暂无
                </Typography>
              ) : (
                <Stack spacing={0.5}>
                  {publishedUrls.map((u) => (
                    <Link key={u} href={u} target="_blank" rel="noopener noreferrer">
                      {u}
                    </Link>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={completeOpen} onClose={() => !completeMutation.isPending && setCompleteOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>确认完成订单</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            确认后将按当前规则结算；CPM 订单将按曝光与费率计算最终应付。可选填写对 KOL 的评分与评价。
          </Typography>
          <Typography variant="subtitle2" gutterBottom>
            评分
          </Typography>
          <Rating
            value={rating}
            onChange={(_, v) => setRating(v)}
            size="large"
          />
          <TextField
            label="评价（可选）"
            fullWidth
            multiline
            minRows={3}
            value={review}
            onChange={(e) => setReview(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompleteOpen(false)} disabled={completeMutation.isPending}>
            取消
          </Button>
          <Button
            variant="contained"
            onClick={() => completeMutation.mutate()}
            disabled={completeMutation.isPending}
          >
            确认完成
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdvertiserOrderDetailPage;
