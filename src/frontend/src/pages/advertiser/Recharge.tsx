import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Pagination from '@mui/material/Pagination';
import LinearProgress from '@mui/material/LinearProgress';
import Alert from '@mui/material/Alert';
import { styled } from '@mui/material/styles';

import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import LockIcon from '@mui/icons-material/Lock';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PaymentsIcon from '@mui/icons-material/Payments';
import {
  advertiserAPI,
  advertiserBalanceQueryKey,
  advertiserProfileQueryKey,
  type AdvertiserTransactionRow,
} from '../../services/advertiserApi';
import { getApiErrorMessage } from '../../utils/apiError';
import { usePublicUiConfig } from '../../hooks/usePublicUiConfig';
import { AdvertiserHubNav } from '../../components/advertiser/AdvertiserHubNav';
import { AdvertiserLowBalanceAlert } from '../../components/advertiser/AdvertiserLowBalanceAlert';
import { ADVERTISER_ROUTE_SEG, pathAdvertiser, pathAdvertiserOrder } from '../../constants/appPaths';

const StatCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.2s, box-shadow 0.2s',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
  },
}));

const StatIconWrap = styled(Box)(({ theme }) => ({
  width: 48,
  height: 48,
  borderRadius: 10,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: theme.spacing(1.5),
}));

const queryKeys = {
  transactions: 'advertiser-transactions',
};

const TX_TYPE_LABEL: Record<AdvertiserTransactionRow['type'], string> = {
  recharge: '充值',
  order_payment: '订单支付',
  withdrawal: '提现',
  refund: '退款',
  commission: '佣金',
};

const TX_STATUS_LABEL: Record<AdvertiserTransactionRow['status'], string> = {
  pending: '待处理',
  processing: '处理中',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消',
};

const TX_STATUS_COLOR: Record<
  AdvertiserTransactionRow['status'],
  'default' | 'primary' | 'success' | 'warning' | 'error'
> = {
  pending: 'warning',
  processing: 'primary',
  completed: 'success',
  failed: 'error',
  cancelled: 'default',
};

const PAY_METHOD_LABEL: Record<string, string> = {
  alipay: '支付宝',
  wechat: '微信',
  bank_transfer: '银行转账',
};

function formatMoney(n: number, currency: string): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: currency === 'CNY' ? 'CNY' : currency,
    minimumFractionDigits: 2,
  }).format(n);
}

function formatDateTime(iso: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('zh-CN');
  } catch {
    return iso;
  }
}

export const RechargePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [typeFilter, setTypeFilter] = useState<string>('');

  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<
    'alipay' | 'wechat' | 'bank_transfer'
  >('alipay');
  const [paymentProof, setPaymentProof] = useState('');

  const {
    data: balance,
    isLoading: balanceLoading,
    refetch: refetchBalance,
    error: balanceError,
  } = useQuery({
    queryKey: [...advertiserBalanceQueryKey],
    queryFn: advertiserAPI.getBalance,
    retry: 1,
  });

  const { data: publicUi } = usePublicUiConfig();
  const lowBalanceLine =
    balance?.low_balance_alert_cny ?? publicUi?.low_balance_alert_cny ?? 500;

  const {
    data: advertiserProfile,
    isLoading: profileLoading,
    refetch: refetchProfile,
    error: profileError,
  } = useQuery({
    queryKey: [...advertiserProfileQueryKey],
    queryFn: advertiserAPI.getProfile,
    retry: 1,
  });

  const {
    data: txData,
    isLoading: txLoading,
    refetch: refetchTx,
    error: txError,
  } = useQuery({
    queryKey: [queryKeys.transactions, page, pageSize, typeFilter],
    queryFn: () =>
      advertiserAPI.getTransactions({
        page,
        page_size: pageSize,
        type: typeFilter || undefined,
      }),
    retry: 1,
  });

  const rechargeMutation = useMutation({
    mutationFn: () => {
      const n = Number(amount);
      if (!Number.isFinite(n) || n <= 0) {
        throw new Error('请输入有效的充值金额');
      }
      return advertiserAPI.recharge({
        amount: n,
        paymentMethod,
        paymentProof: paymentProof.trim() || undefined,
      });
    },
    onSuccess: () => {
      setAmount('');
      setPaymentProof('');
      queryClient.invalidateQueries({ queryKey: [...advertiserBalanceQueryKey] });
      queryClient.invalidateQueries({ queryKey: [...advertiserProfileQueryKey] });
      queryClient.invalidateQueries({ queryKey: [queryKeys.transactions] });
    },
  });

  const totalPages = txData?.pagination?.total_pages ?? 1;
  const items = txData?.items ?? [];

  const balanceErrMsg = balanceError
    ? getApiErrorMessage(balanceError, '加载余额失败')
    : null;
  const profileErrMsg = profileError
    ? getApiErrorMessage(profileError, '加载广告主资料失败')
    : null;
  const txErrMsg = txError ? getApiErrorMessage(txError, '加载流水失败') : null;

  const handleHubRefresh = () => {
    void refetchBalance();
    void refetchProfile();
    void refetchTx();
  };

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'stretch', sm: 'flex-start' }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            充值与流水
          </Typography>
          <Typography variant="body2" color="text.secondary">
            查看余额、冻结与资金流水；与数据分析、订单中心共用同一账户口径。
          </Typography>
        </Box>
        <AdvertiserHubNav preset="recharge-page" onRefresh={handleHubRefresh} />
      </Stack>

      <AdvertiserLowBalanceAlert balance={balance} publicUi={publicUi} context="recharge" sx={{ mb: 2 }} />

      <Alert severity="info" sx={{ mb: 2 }}>
        余额、账户冻结与订单冻结（全活动）与仪表盘、数据分析一致。「订单支付」类流水若关联合作订单，可在下表进入订单详情核对结算与 CPM。右上角刷新将同步余额、资料与当前页流水。
        <Typography component="span" variant="body2" display="block" sx={{ mt: 1 }}>
          低余额提示线：可用余额低于 ¥{lowBalanceLine.toLocaleString('zh-CN')} 时建议在仪表盘与订单冻结占用前充值（与 GET /public/ui-config、GET /advertisers/me/balance 一致）。
        </Typography>
      </Alert>

      {balance && balance.frozen_balance > 0 ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2">
            账户冻结 {formatMoney(balance.frozen_balance, 'CNY')} 为平台风控/账务冻结，与订单占用无关；解除后计入可用余额。
          </Typography>
        </Alert>
      ) : null}

      {(advertiserProfile?.ordersFrozenTotal ?? 0) > 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ sm: 'center' }}
            justifyContent="space-between"
          >
            <Typography variant="body2">
              订单冻结（全活动）{formatMoney(advertiserProfile?.ordersFrozenTotal ?? 0, 'CNY')}
              ，与订单中心、活动详情「冻结」列一致；订单完成或释放后将回到可用余额。
            </Typography>
            <Button variant="outlined" size="small" onClick={() => navigate(pathAdvertiser(ADVERTISER_ROUTE_SEG.orders))}>
              查看订单
            </Button>
          </Stack>
        </Alert>
      ) : null}

      {(balanceErrMsg || profileErrMsg || txErrMsg) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {balanceErrMsg || profileErrMsg || txErrMsg}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard>
            <CardContent>
              {balanceLoading || profileLoading ? (
                <LinearProgress />
              ) : (
                <>
                  <StatIconWrap sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
                    <AccountBalanceWalletIcon />
                  </StatIconWrap>
                  <Typography color="text.secondary" variant="body2">
                    可用余额
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {balance
                      ? formatMoney(balance.wallet_balance, 'CNY')
                      : '—'}
                  </Typography>
                  {(advertiserProfile?.ordersFrozenTotal ?? 0) > 0 && (
                    <Typography variant="caption" color="info.main" display="block" sx={{ mt: 0.5 }}>
                      订单冻结（全活动）{formatMoney(advertiserProfile.ordersFrozenTotal ?? 0, 'CNY')}
                    </Typography>
                  )}
                </>
              )}
            </CardContent>
          </StatCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard>
            <CardContent>
              {balanceLoading ? (
                <LinearProgress />
              ) : (
                <>
                  <StatIconWrap sx={{ bgcolor: 'warning.light', color: 'warning.main' }}>
                    <LockIcon />
                  </StatIconWrap>
                  <Typography color="text.secondary" variant="body2">
                    账户冻结
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {balance
                      ? formatMoney(balance.frozen_balance, 'CNY')
                      : '—'}
                  </Typography>
                </>
              )}
            </CardContent>
          </StatCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard>
            <CardContent>
              {balanceLoading ? (
                <LinearProgress />
              ) : (
                <>
                  <StatIconWrap sx={{ bgcolor: 'success.light', color: 'success.main' }}>
                    <TrendingUpIcon />
                  </StatIconWrap>
                  <Typography color="text.secondary" variant="body2">
                    累计充值
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {balance
                      ? formatMoney(balance.total_recharged, 'CNY')
                      : '—'}
                  </Typography>
                </>
              )}
            </CardContent>
          </StatCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard>
            <CardContent>
              {balanceLoading ? (
                <LinearProgress />
              ) : (
                <>
                  <StatIconWrap sx={{ bgcolor: 'info.light', color: 'info.main' }}>
                    <PaymentsIcon />
                  </StatIconWrap>
                  <Typography color="text.secondary" variant="body2">
                    累计消费
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {balance ? formatMoney(balance.total_spent, 'CNY') : '—'}
                  </Typography>
                </>
              )}
            </CardContent>
          </StatCard>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                发起充值
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                提交后系统将记录充值申请；当前环境可能自动完成入账，请以实际余额与流水为准。
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="金额（元）"
                  type="number"
                  fullWidth
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputProps={{ min: 0.01, step: '0.01' }}
                />
                <FormControl fullWidth>
                  <InputLabel>支付方式</InputLabel>
                  <Select
                    value={paymentMethod}
                    label="支付方式"
                    onChange={(e) =>
                      setPaymentMethod(
                        e.target.value as 'alipay' | 'wechat' | 'bank_transfer'
                      )
                    }
                  >
                    <MenuItem value="alipay">支付宝</MenuItem>
                    <MenuItem value="wechat">微信</MenuItem>
                    <MenuItem value="bank_transfer">银行转账</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label="付款凭证链接（可选）"
                  fullWidth
                  value={paymentProof}
                  onChange={(e) => setPaymentProof(e.target.value)}
                  placeholder="https://..."
                  helperText="填写可公开访问的凭证图片或回单链接"
                />
                {rechargeMutation.isError && (
                  <Alert severity="error">
                    {getApiErrorMessage(rechargeMutation.error, '充值失败')}
                  </Alert>
                )}
                <Button
                  variant="contained"
                  size="large"
                  disabled={rechargeMutation.isPending}
                  onClick={() => rechargeMutation.mutate()}
                >
                  {rechargeMutation.isPending ? '提交中…' : '确认充值'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                justifyContent="space-between"
                spacing={2}
                sx={{ mb: 2 }}
              >
                <Typography variant="h6" fontWeight={600}>
                  资金流水
                </Typography>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel>类型</InputLabel>
                  <Select
                    value={typeFilter}
                    label="类型"
                    onChange={(e) => {
                      setTypeFilter(e.target.value);
                      setPage(1);
                    }}
                  >
                    <MenuItem value="">全部</MenuItem>
                    <MenuItem value="recharge">充值</MenuItem>
                    <MenuItem value="order_payment">订单支付</MenuItem>
                    <MenuItem value="refund">退款</MenuItem>
                    <MenuItem value="commission">佣金</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              {txLoading ? (
                <LinearProgress />
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>时间</TableCell>
                        <TableCell>单号</TableCell>
                        <TableCell>类型</TableCell>
                        <TableCell align="right">金额</TableCell>
                        <TableCell>状态</TableCell>
                        <TableCell>关联订单</TableCell>
                        <TableCell>说明</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center">
                            暂无流水
                          </TableCell>
                        </TableRow>
                      ) : (
                        items.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                              {formatDateTime(row.createdAt)}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                {row.transactionNo}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={TX_TYPE_LABEL[row.type] ?? row.type}
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell align="right">
                              {formatMoney(row.amount, row.currency)}
                            </TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={TX_STATUS_LABEL[row.status]}
                                color={TX_STATUS_COLOR[row.status]}
                              />
                            </TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                              {row.orderId ? (
                                <Button
                                  size="small"
                                  variant="text"
                                  onClick={() => navigate(pathAdvertiserOrder(row.orderId))}
                                >
                                  查看订单
                                </Button>
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  —
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary" noWrap title={row.description}>
                                {row.description || '—'}
                              </Typography>
                              {row.paymentMethod ? (
                                <Typography variant="caption" color="text.disabled" display="block">
                                  {PAY_METHOD_LABEL[row.paymentMethod] ?? row.paymentMethod}
                                </Typography>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(_, p) => setPage(p)}
                    color="primary"
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RechargePage;
