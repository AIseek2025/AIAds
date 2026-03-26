import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Pagination from '@mui/material/Pagination';
import { styled } from '@mui/material/styles';

// Icons
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import DownloadIcon from '@mui/icons-material/Download';
import HistoryIcon from '@mui/icons-material/History';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CancelIcon from '@mui/icons-material/Cancel';
import RefreshIcon from '@mui/icons-material/Refresh';

// Types
import type { KolEarnings, WithdrawalRecord } from '../../stores/kolStore';

// Services
import { earningsAPI } from '../../services/kolApi';

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
  earnings: 'earnings',
  withdrawals: 'withdrawals',
  balance: 'balance',
};

// Status configurations
const earningsStatusConfig: Record<KolEarnings['status'], { label: string; color: 'default' | 'info' | 'warning' | 'success' }> = {
  pending: { label: '待结算', color: 'warning' },
  settled: { label: '已结算', color: 'success' },
  withdrawn: { label: '已提现', color: 'info' },
};

const withdrawalStatusConfig: Record<WithdrawalRecord['status'], { label: string; color: 'default' | 'info' | 'warning' | 'success' | 'error' }> = {
  pending: { label: '待处理', color: 'warning' },
  processing: { label: '处理中', color: 'info' },
  completed: { label: '已完成', color: 'success' },
  rejected: { label: '已拒绝', color: 'error' },
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`earnings-tabpanel-${index}`}
      aria-labelledby={`earnings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

export const EarningsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tabValue, setTabValue] = useState(0);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [earningsPage, setEarningsPage] = useState(1);
  const [withdrawalsPage, setWithdrawalsPage] = useState(1);
  const [pageSize] = useState(10);
  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    paymentMethod: 'alipay',
    paymentAccount: '',
  });
  const [earningsStatusFilter, setEarningsStatusFilter] = useState<KolEarnings['status'] | ''>('');
  const [withdrawalsStatusFilter, setWithdrawalsStatusFilter] = useState<WithdrawalRecord['status'] | ''>('');

  // Fetch balance
  const {
    data: balance,
    isLoading: isBalanceLoading,
    refetch: refetchBalance,
  } = useQuery({
    queryKey: [queryKeys.balance],
    queryFn: earningsAPI.getBalance,
    retry: 1,
  });

  // Fetch earnings
  const {
    data: earningsData,
    isLoading: isEarningsLoading,
    refetch: refetchEarnings,
  } = useQuery({
    queryKey: [queryKeys.earnings, earningsPage, earningsStatusFilter],
    queryFn: () =>
      earningsAPI.getEarnings({
        page: earningsPage,
        page_size: pageSize,
        status: earningsStatusFilter || undefined,
      }),
    retry: 1,
  });

  // Fetch withdrawals
  const {
    data: withdrawalsData,
    isLoading: isWithdrawalsLoading,
    refetch: refetchWithdrawals,
  } = useQuery({
    queryKey: [queryKeys.withdrawals, withdrawalsPage, withdrawalsStatusFilter],
    queryFn: () =>
      earningsAPI.getWithdrawals({
        page: withdrawalsPage,
        page_size: pageSize,
        status: withdrawalsStatusFilter || undefined,
      }),
    retry: 1,
  });

  // Withdraw mutation
  const withdrawMutation = useMutation({
    mutationFn: earningsAPI.requestWithdrawal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeys.balance] });
      queryClient.invalidateQueries({ queryKey: [queryKeys.withdrawals] });
      setWithdrawDialogOpen(false);
      setWithdrawForm({ amount: '', paymentMethod: 'alipay', paymentAccount: '' });
    },
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleOpenWithdrawDialog = () => {
    setWithdrawDialogOpen(true);
  };

  const handleSubmitWithdraw = () => {
    withdrawMutation.mutate({
      amount: Number(withdrawForm.amount),
      paymentMethod: withdrawForm.paymentMethod,
      paymentAccount: withdrawForm.paymentAccount,
    });
  };

  const handleEarningsPageChange = (_event: React.ChangeEvent<unknown>, newPage: number) => {
    setEarningsPage(newPage);
  };

  const handleWithdrawalsPageChange = (_event: React.ChangeEvent<unknown>, newPage: number) => {
    setWithdrawalsPage(newPage);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  const getEarningsStatusChip = (status: KolEarnings['status']) => {
    const config = earningsStatusConfig[status];
    return <Chip label={config.label} size="small" color={config.color} />;
  };

  const getWithdrawalStatusChip = (status: WithdrawalRecord['status']) => {
    const config = withdrawalStatusConfig[status];
    return <Chip label={config.label} size="small" color={config.color} />;
  };

  const maxWithdrawAmount = balance?.availableBalance || 0;

  if (isBalanceLoading) {
    return <LinearProgress />;
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
            收益管理
          </Typography>
          <Typography variant="body1" color="text.secondary">
            查看您的收益明细和管理提现
          </Typography>
        </Box>
        <IconButton onClick={() => { refetchBalance(); refetchEarnings(); refetchWithdrawals(); }} color="primary">
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Balance Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard>
            <CardContent>
              <StatIconWrapper sx={{ bgcolor: 'success.light', color: 'success.main' }}>
                <AccountBalanceIcon sx={{ fontSize: 32 }} />
              </StatIconWrapper>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                可用余额
              </Typography>
              <Typography variant="h3" color="success.main">
                {formatCurrency(balance?.availableBalance || 0)}
              </Typography>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={handleOpenWithdrawDialog}
                sx={{ mt: 2 }}
                disabled={!balance?.availableBalance}
              >
                申请提现
              </Button>
            </CardContent>
          </StatCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard>
            <CardContent>
              <StatIconWrapper sx={{ bgcolor: 'warning.light', color: 'warning.main' }}>
                <HourglassEmptyIcon sx={{ fontSize: 32 }} />
              </StatIconWrapper>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                待结算金额
              </Typography>
              <Typography variant="h4" color="warning.main">
                {formatCurrency(balance?.pendingBalance || 0)}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                任务完成后自动结算
              </Typography>
            </CardContent>
          </StatCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard>
            <CardContent>
              <StatIconWrapper sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
                <TrendingUpIcon sx={{ fontSize: 32 }} />
              </StatIconWrapper>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                累计收益
              </Typography>
              <Typography variant="h4" color="primary.main">
                {formatCurrency(balance?.totalEarnings || 0)}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                历史总收入
              </Typography>
            </CardContent>
          </StatCard>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card sx={{ mb: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="收益明细" icon={<AttachMoneyIcon />} iconPosition="start" />
            <Tab label="提现记录" icon={<HistoryIcon />} iconPosition="start" />
          </Tabs>
        </Box>
      </Card>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        {/* Earnings Filters */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>状态</InputLabel>
            <Select
              value={earningsStatusFilter}
              label="状态"
              onChange={(e) => {
                setEarningsStatusFilter(e.target.value as KolEarnings['status'] | '');
                setEarningsPage(1);
              }}
            >
              <MenuItem value="">全部</MenuItem>
              <MenuItem value="pending">待结算</MenuItem>
              <MenuItem value="settled">已结算</MenuItem>
              <MenuItem value="withdrawn">已提现</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Earnings Table */}
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>收益 ID</TableCell>
                  <TableCell>任务 ID</TableCell>
                  <TableCell>类型</TableCell>
                  <TableCell>金额</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>结算时间</TableCell>
                  <TableCell>创建时间</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isEarningsLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <LinearProgress />
                    </TableCell>
                  </TableRow>
                ) : earningsData?.items && earningsData.items.length > 0 ? (
                  earningsData.items.map((earning: KolEarnings) => (
                    <TableRow key={earning.id}>
                      <TableCell>{earning.id.slice(0, 8)}</TableCell>
                      <TableCell>{earning.taskId.slice(0, 8)}</TableCell>
                      <TableCell>
                        {earning.type === 'task_reward' && '任务奖励'}
                        {earning.type === 'bonus' && '奖金'}
                        {earning.type === 'refund' && '退款'}
                      </TableCell>
                      <TableCell sx={{ color: 'success.main', fontWeight: 'bold' }}>
                        {formatCurrency(earning.amount)}
                      </TableCell>
                      <TableCell>{getEarningsStatusChip(earning.status)}</TableCell>
                      <TableCell>
                        {earning.settledAt ? formatDate(earning.settledAt) : '-'}
                      </TableCell>
                      <TableCell>{formatDate(earning.createdAt)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                        暂无收益记录
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {earningsData && earningsData.pagination.total_pages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <Pagination
                count={earningsData.pagination.total_pages}
                page={earningsPage}
                onChange={handleEarningsPageChange}
                color="primary"
              />
            </Box>
          )}
        </Card>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {/* Withdrawals Filters */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>状态</InputLabel>
            <Select
              value={withdrawalsStatusFilter}
              label="状态"
              onChange={(e) => {
                setWithdrawalsStatusFilter(e.target.value as WithdrawalRecord['status'] | '');
                setWithdrawalsPage(1);
              }}
            >
              <MenuItem value="">全部</MenuItem>
              <MenuItem value="pending">待处理</MenuItem>
              <MenuItem value="processing">处理中</MenuItem>
              <MenuItem value="completed">已完成</MenuItem>
              <MenuItem value="rejected">已拒绝</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Withdrawals Table */}
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>提现 ID</TableCell>
                  <TableCell>金额</TableCell>
                  <TableCell>支付方式</TableCell>
                  <TableCell>收款账号</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>处理时间</TableCell>
                  <TableCell>创建时间</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isWithdrawalsLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <LinearProgress />
                    </TableCell>
                  </TableRow>
                ) : withdrawalsData?.items && withdrawalsData.items.length > 0 ? (
                  withdrawalsData.items.map((withdrawal: WithdrawalRecord) => (
                    <TableRow key={withdrawal.id}>
                      <TableCell>{withdrawal.id.slice(0, 8)}</TableCell>
                      <TableCell sx={{ color: 'success.main', fontWeight: 'bold' }}>
                        {formatCurrency(withdrawal.amount)}
                      </TableCell>
                      <TableCell>
                        {withdrawal.paymentMethod === 'alipay' && '支付宝'}
                        {withdrawal.paymentMethod === 'wechat' && '微信'}
                        {withdrawal.paymentMethod === 'bank' && '银行卡'}
                      </TableCell>
                      <TableCell>{withdrawal.paymentAccount}</TableCell>
                      <TableCell>{getWithdrawalStatusChip(withdrawal.status)}</TableCell>
                      <TableCell>
                        {withdrawal.processedAt ? formatDate(withdrawal.processedAt) : '-'}
                      </TableCell>
                      <TableCell>{formatDate(withdrawal.createdAt)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                        暂无提现记录
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {withdrawalsData && withdrawalsData.pagination.total_pages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <Pagination
                count={withdrawalsData.pagination.total_pages}
                page={withdrawalsPage}
                onChange={handleWithdrawalsPageChange}
                color="primary"
              />
            </Box>
          )}
        </Card>
      </TabPanel>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawDialogOpen} onClose={() => setWithdrawDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>申请提现</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
              <Typography variant="body2" color="info.dark">
                可用余额：<strong>{formatCurrency(maxWithdrawAmount)}</strong>
              </Typography>
              <Typography variant="caption" color="info.dark">
                最低提现金额：¥10
              </Typography>
            </Box>

            <TextField
              label="提现金额"
              value={withdrawForm.amount}
              onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
              fullWidth
              type="number"
              required
              placeholder="请输入提现金额"
              error={Number(withdrawForm.amount) > maxWithdrawAmount || Number(withdrawForm.amount) < 10}
              helperText={
                Number(withdrawForm.amount) > maxWithdrawAmount
                  ? '提现金额不能超过可用余额'
                  : Number(withdrawForm.amount) < 10 && withdrawForm.amount
                  ? '最低提现金额为¥10'
                  : ''
              }
            />

            <FormControl fullWidth required>
              <InputLabel>支付方式</InputLabel>
              <Select
                value={withdrawForm.paymentMethod}
                label="支付方式"
                onChange={(e) => setWithdrawForm({ ...withdrawForm, paymentMethod: e.target.value })}
              >
                <MenuItem value="alipay">支付宝</MenuItem>
                <MenuItem value="wechat">微信</MenuItem>
                <MenuItem value="bank">银行卡</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="收款账号"
              value={withdrawForm.paymentAccount}
              onChange={(e) => setWithdrawForm({ ...withdrawForm, paymentAccount: e.target.value })}
              fullWidth
              required
              placeholder={
                withdrawForm.paymentMethod === 'alipay'
                  ? '请输入支付宝账号'
                  : withdrawForm.paymentMethod === 'wechat'
                  ? '请输入微信号'
                  : '请输入银行卡号'
              }
            />

            <Alert severity="info">
              提现申请将在 1-3 个工作日内处理，请确保提供的收款信息准确无误。
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWithdrawDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleSubmitWithdraw}
            disabled={
              withdrawMutation.isPending ||
              !withdrawForm.amount ||
              !withdrawForm.paymentAccount ||
              Number(withdrawForm.amount) > maxWithdrawAmount ||
              Number(withdrawForm.amount) < 10
            }
          >
            {withdrawMutation.isPending ? '提交中...' : '提交申请'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EarningsPage;
