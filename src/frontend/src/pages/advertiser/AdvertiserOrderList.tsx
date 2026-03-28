import React, { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Link from '@mui/material/Link';
import LinearProgress from '@mui/material/LinearProgress';
import Avatar from '@mui/material/Avatar';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';

import { AdvertiserHubNav } from '../../components/advertiser/AdvertiserHubNav';
import { pathAdvertiserOrder } from '../../constants/appPaths';
import {
  advertiserAPI,
  advertiserBalanceQueryKey,
  orderAPI,
} from '../../services/advertiserApi';
import { getApiErrorMessage } from '../../utils/apiError';
import { advertiserOrderFrozenCny, advertiserOrderGrossSpendCny } from '../../utils/advertiserOrderGross';
import { usePublicUiConfig } from '../../hooks/usePublicUiConfig';
import { AdvertiserLowBalanceAlert } from '../../components/advertiser/AdvertiserLowBalanceAlert';

const PAGE_SIZE = 20;

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

function numFromRow(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') return Number(v) || 0;
  return 0;
}

/** GET /orders 列表行（与活动详情订单表一致） */
interface OrderListRow {
  id: string;
  order_no?: string;
  pricing_model?: string;
  price?: number;
  status?: string;
  views?: number;
  campaign_id?: string;
  campaign_title?: string;
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

const AdvertiserOrderListPage: React.FC = () => {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<string>('');

  const { data: balance, refetch: refetchBalance } = useQuery({
    queryKey: [...advertiserBalanceQueryKey],
    queryFn: advertiserAPI.getBalance,
    retry: 1,
  });
  const { data: publicUi } = usePublicUiConfig();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['advertiser-orders', page, status],
    queryFn: () =>
      orderAPI.getOrders({
        page: page + 1,
        page_size: PAGE_SIZE,
        ...(status ? { status } : {}),
      }),
    retry: 1,
  });

  const items = useMemo(() => (data?.items ?? []) as unknown as OrderListRow[], [data]);
  const total = data?.pagination?.total ?? 0;

  return (
    <Box sx={{ p: 3 }}>
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
          <Typography variant="h4" gutterBottom fontWeight="bold">
            订单中心
          </Typography>
          <Typography variant="body2" color="text.secondary">
            查看并管理您与 KOL 的合作订单；进入详情可确认完成并评价。
          </Typography>
        </Box>
        <AdvertiserHubNav
          preset="orders-page"
          onRefresh={() => {
            void refetch();
            void refetchBalance();
          }}
        />
      </Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        CPM 订单的应付与曝光拆分与活动详情、订单详情一致；筛选仅影响本列表分页。刷新将重新拉取当前筛选下的分页数据。
      </Alert>

      <AdvertiserLowBalanceAlert balance={balance} publicUi={publicUi} context="orders" sx={{ mb: 3 }} />

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {getApiErrorMessage(error, '加载订单列表失败')}
        </Alert>
      ) : null}

      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="order-status-filter">订单状态</InputLabel>
              <Select
                labelId="order-status-filter"
                label="订单状态"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as string);
                  setPage(0);
                }}
              >
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="pending">待确认</MenuItem>
                <MenuItem value="accepted,in_progress">进行中</MenuItem>
                <MenuItem value="submitted,approved,published">待确认完成</MenuItem>
                <MenuItem value="completed">已完成</MenuItem>
                <MenuItem value="rejected,cancelled">已结束（拒绝/取消）</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        {isLoading ? <LinearProgress /> : null}
        <CardContent>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>KOL</TableCell>
                  <TableCell>活动</TableCell>
                  <TableCell>计价</TableCell>
                  <TableCell align="right">应付/预估</TableCell>
                  <TableCell align="right">
                    <Tooltip title="为该订单从账户预留的冻结金额；无冻结时显示 —。">
                      <span style={{ cursor: 'help' }}>冻结</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>创建时间</TableCell>
                  <TableCell align="right">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.length === 0 && !isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <Typography variant="body2" color="text.secondary">
                        暂无订单。请前往 KOL 发现页发起合作。
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((order) => {
                    const kolLabel =
                      order.kol?.platform_display_name ||
                      order.kol?.platform_username ||
                      order.id.slice(0, 8);
                    const initial = (kolLabel || '?').charAt(0);
                    const spend = advertiserOrderGrossSpendCny(order as unknown as Record<string, unknown>);
                    const frozen = advertiserOrderFrozenCny(order as unknown as Record<string, unknown>);
                    const st = order.status || '';
                    return (
                      <TableRow key={order.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar
                              src={order.kol?.platform_avatar_url || undefined}
                              sx={{ width: 32, height: 32 }}
                            >
                              {initial}
                            </Avatar>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 160 }}>
                              {kolLabel}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                            {order.campaign_title || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={order.pricing_model === 'cpm' ? 'CPM' : '固定价'}
                            size="small"
                            variant="outlined"
                            color={order.pricing_model === 'cpm' ? 'secondary' : 'default'}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="bold">
                            {formatCurrency(spend)}
                          </Typography>
                          {order.pricing_model === 'cpm' ? (
                            <Typography variant="caption" color="text.secondary" display="block">
                              曝光 {formatNumber(order.views ?? 0)}
                            </Typography>
                          ) : null}
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color={frozen > 0 ? 'text.primary' : 'text.secondary'}>
                            {frozen > 0 ? formatCurrency(frozen) : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={ORDER_STATUS_LABEL[st] || st}
                            size="small"
                            color={ORDER_STATUS_COLOR[st] || 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {order.created_at
                              ? new Date(order.created_at).toLocaleString('zh-CN')
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
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={PAGE_SIZE}
            rowsPerPageOptions={[PAGE_SIZE]}
            labelRowsPerPage="每页"
            labelDisplayedRows={({ from, to, count: c }) => `${from}–${to} / ${c}`}
          />
        </CardContent>
      </Card>
    </Box>
  );
};

export default AdvertiserOrderListPage;
