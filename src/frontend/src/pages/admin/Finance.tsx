import React, { useState, useEffect, startTransition, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminFinanceAPI } from '../../services/adminApi';
import type { Withdrawal, Transaction, TransactionListParams } from '../../types';

type TxTypeFilter = NonNullable<TransactionListParams['type']>;
type TxStatusFilter = NonNullable<TransactionListParams['status']>;

// MUI Components
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Grid from '@mui/material/Grid';
import StatCard from '../../components/admin/StatCard';
import { AdminHubNav } from '../../components/admin/AdminHubNav';
import { getApiErrorMessage } from '../../utils/apiError';

// Icons
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ReceiptIcon from '@mui/icons-material/Receipt';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`finance-tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

const FinancePage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  // State
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    if (searchParams.get('tab') === 'withdrawals') {
      startTransition(() => setTabValue(1));
    }
  }, [searchParams]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewReason, setReviewReason] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [depositStatusFilter, setDepositStatusFilter] = useState<string>('');
  const [exportRangeType, setExportRangeType] = useState<'all' | 'transactions' | 'withdrawals' | 'deposits'>('transactions');
  const [exportStartDate, setExportStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [exportEndDate, setExportEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedDepositTx, setSelectedDepositTx] = useState<Transaction | null>(null);
  const [confirmDepositOpen, setConfirmDepositOpen] = useState(false);
  const [confirmDepositNote, setConfirmDepositNote] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const { data: statsData, refetch: refetchFinanceStats } = useQuery({
    queryKey: ['adminFinanceStats'],
    queryFn: () => adminFinanceAPI.getOverview({ period: 'month' }),
  });

  // Build query params
  const queryParams: TransactionListParams = {
    page: page + 1,
    page_size: pageSize,
    sort: 'created_at',
    order: 'desc',
  };

  if (keyword) queryParams.keyword = keyword;
  if (typeFilter) queryParams.type = typeFilter as TxTypeFilter;
  if (statusFilter) queryParams.status = statusFilter as TxStatusFilter;

  const depositParams = useMemo((): TransactionListParams => {
    const p: TransactionListParams = {
      page: page + 1,
      page_size: pageSize,
      sort: 'created_at',
      order: 'desc',
    };
    if (depositStatusFilter) p.status = depositStatusFilter as TxStatusFilter;
    return p;
  }, [page, pageSize, depositStatusFilter]);

  const listQueryKey =
    tabValue === 0
      ? queryParams
      : tabValue === 1
        ? { page: queryParams.page, page_size: queryParams.page_size }
        : tabValue === 2
          ? depositParams
          : null;

  const { data, isLoading, error, refetch: refetchFinanceTab } = useQuery({
    queryKey: ['adminFinance', tabValue, listQueryKey],
    queryFn: () => {
      if (tabValue === 0) {
        return adminFinanceAPI.getTransactions(queryParams);
      }
      if (tabValue === 1) {
        return adminFinanceAPI.getPendingWithdrawals({ page: queryParams.page, page_size: queryParams.page_size });
      }
      if (tabValue === 2) {
        return adminFinanceAPI.getDeposits(depositParams);
      }
      return { items: [], pagination: { total: 0, page: 1, page_size: 20, total_pages: 0, has_next: false, has_prev: false } };
    },
  });

  // Approve withdrawal mutation
  const approveWithdrawalMutation = useMutation({
    mutationFn: (data: { id: string; note?: string }) =>
      adminFinanceAPI.approveWithdrawal(data.id, { note: data.note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFinance'] });
      queryClient.invalidateQueries({ queryKey: ['adminFinanceStats'] });
      setSnackbar({ open: true, message: '提现申请已批准', severity: 'success' });
      setReviewDialogOpen(false);
      setReviewNote('');
      setSelectedWithdrawal(null);
    },
    onError: (err: unknown) => {
      setSnackbar({
        open: true,
        message: getApiErrorMessage(err, '操作失败'),
        severity: 'error',
      });
    },
  });

  // Reject withdrawal mutation
  const rejectWithdrawalMutation = useMutation({
    mutationFn: (data: { id: string; reason: string; note?: string }) =>
      adminFinanceAPI.rejectWithdrawal(data.id, { reason: data.reason, note: data.note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFinance'] });
      queryClient.invalidateQueries({ queryKey: ['adminFinanceStats'] });
      setSnackbar({ open: true, message: '提现申请已拒绝', severity: 'success' });
      setReviewDialogOpen(false);
      setReviewReason('');
      setReviewNote('');
      setSelectedWithdrawal(null);
    },
    onError: (err: unknown) => {
      setSnackbar({
        open: true,
        message: getApiErrorMessage(err, '操作失败'),
        severity: 'error',
      });
    },
  });

  const exportMutation = useMutation({
    mutationFn: async (format: 'csv' | 'xlsx') => {
      const blob = await adminFinanceAPI.exportFinanceReport({
        type: exportRangeType,
        start_date: exportStartDate,
        end_date: exportEndDate,
        format,
      });
      return blob;
    },
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finance_${exportRangeType}_${exportStartDate}_${exportEndDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setSnackbar({ open: true, message: '导出已开始', severity: 'success' });
    },
    onError: (err: unknown) => {
      setSnackbar({
        open: true,
        message: getApiErrorMessage(err, '导出失败'),
        severity: 'error',
      });
    },
  });

  const confirmRechargeMutation = useMutation({
    mutationFn: (payload: { id: string; note?: string }) =>
      adminFinanceAPI.confirmRecharge({ transaction_id: payload.id, note: payload.note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFinance'] });
      queryClient.invalidateQueries({ queryKey: ['adminFinanceStats'] });
      setConfirmDepositOpen(false);
      setConfirmDepositNote('');
      setSelectedDepositTx(null);
      setSnackbar({ open: true, message: '充值已确认入账', severity: 'success' });
    },
    onError: (err: unknown) => {
      setSnackbar({
        open: true,
        message: getApiErrorMessage(err, '确认失败'),
        severity: 'error',
      });
    },
  });

  // Handlers
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setPage(0);
    if (newValue !== 2) setDepositStatusFilter('');
  };

  const maskAccount = (s: string | undefined) => {
    if (!s || s.length < 8) return s ?? '-';
    return `${s.slice(0, 4)}****${s.slice(-4)}`;
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value);
    setPage(0);
  };

  const handleTypeFilterChange = (e: SelectChangeEvent<string>) => {
    setTypeFilter(e.target.value);
    setPage(0);
  };

  const handleStatusFilterChange = (e: SelectChangeEvent<string>) => {
    setStatusFilter(e.target.value);
    setPage(0);
  };

  const handlePageChange = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageSize(parseInt(e.target.value, 10));
    setPage(0);
  };

  const handleApproveClick = (withdrawal: Withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setReviewAction('approve');
    setReviewDialogOpen(true);
  };

  const handleRejectClick = (withdrawal: Withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setReviewAction('reject');
    setReviewDialogOpen(true);
  };

  const handleReviewSubmit = () => {
    if (!selectedWithdrawal) return;
    if (reviewAction === 'approve') {
      approveWithdrawalMutation.mutate({ id: selectedWithdrawal.id, note: reviewNote });
    } else {
      if (!reviewReason) {
        setSnackbar({ open: true, message: '请填写拒绝原因', severity: 'error' });
        return;
      }
      rejectWithdrawalMutation.mutate({ id: selectedWithdrawal.id, reason: reviewReason, note: reviewNote });
    }
  };

  const handleCloseReviewDialog = () => {
    setReviewDialogOpen(false);
    setReviewReason('');
    setReviewNote('');
    setSelectedWithdrawal(null);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Type badge
  const TypeBadge = ({ type }: { type: string }) => {
    const config: Record<string, { color: string; label: string; icon?: React.ReactElement }> = {
      recharge: { color: '#4CAF50', label: '充值', icon: <TrendingUpIcon fontSize="small" /> },
      withdrawal: { color: '#F44336', label: '提现', icon: <AccountBalanceIcon fontSize="small" /> },
      order_payment: { color: '#2196F3', label: '订单支付', icon: <ReceiptIcon fontSize="small" /> },
      refund: { color: '#FF9800', label: '退款', icon: <ReceiptIcon fontSize="small" /> },
      commission: { color: '#9C27B0', label: '佣金', icon: <AttachMoneyIcon fontSize="small" /> },
    };

    const c = config[type] || { color: '#999', label: type, icon: undefined };

    return (
      <Chip
        icon={c.icon}
        label={c.label}
        size="small"
        sx={{ bgcolor: `${c.color}15`, color: c.color, fontWeight: 500 }}
      />
    );
  };

  // Status badge
  const StatusBadge = ({ status }: { status: string }) => {
    const config: Record<string, { color: 'success' | 'warning' | 'error' | 'info' | 'default'; label: string }> = {
      success: { color: 'success', label: '成功' },
      completed: { color: 'success', label: '已完成' },
      pending: { color: 'warning', label: '待处理' },
      processing: { color: 'info', label: '处理中' },
      failed: { color: 'error', label: '失败' },
      rejected: { color: 'error', label: '已拒绝' },
      approved: { color: 'success', label: '已批准' },
      cancelled: { color: 'default', label: '已取消' },
    };

    const c = config[status] || { color: 'default' as const, label: status };

    return <Chip label={c.label} color={c.color} size="small" sx={{ fontWeight: 500 }} />;
  };

  const handleHubRefresh = () => {
    void refetchFinanceStats();
    void refetchFinanceTab();
  };

  return (
    <Box>
      {/* Page Header */}
      <Box
        sx={{
          mb: 2,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 2,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            财务管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            管理充值、提现、交易记录和财务报表
          </Typography>
        </Box>
      </Box>
      <AdminHubNav onRefresh={handleHubRefresh} />
      <Alert severity="info" sx={{ mb: 3, mt: 2 }}>
        顶部卡片与列表为管理端展示口径；提现审核与流水以服务端为准。刷新将同步统计与当前标签数据。
      </Alert>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="本月收入"
            value={formatCurrency(statsData?.monthlyRevenue || 0)}
            icon={<AttachMoneyIcon />}
            color="#00897B"
            subValue="平台佣金收入"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="待审核提现"
            value={statsData?.pendingWithdrawals || 0}
            icon={<AccountBalanceIcon />}
            color="#ED6C02"
            subValue="笔待处理"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="待确认充值"
            value={statsData?.pendingRecharges || 0}
            icon={<TrendingUpIcon />}
            color="#1976D2"
            subValue="笔待确认"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="发票待处理"
            value={statsData?.pendingInvoices || 0}
            icon={<ReceiptIcon />}
            color="#9C27B0"
            subValue="张待开具"
          />
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="交易记录" />
          <Tab label={`提现审核 (${statsData?.pendingWithdrawals || 0})`} />
          <Tab label="充值管理" />
          <Tab label="财务报表" />
        </Tabs>
      </Paper>

      {/* Tab Panel 0 - Transactions */}
      <TabPanel value={tabValue} index={0}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 2 }}>
              <TextField
                placeholder="搜索订单号/用户..."
                value={keyword}
                onChange={handleSearch}
                size="small"
                sx={{ minWidth: 240 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>类型</InputLabel>
                <Select
                  value={typeFilter}
                  label="类型"
                  onChange={handleTypeFilterChange}
                >
                  <MenuItem value="">全部</MenuItem>
                  <MenuItem value="recharge">充值</MenuItem>
                  <MenuItem value="withdrawal">提现</MenuItem>
                  <MenuItem value="order_payment">订单支付</MenuItem>
                  <MenuItem value="refund">退款</MenuItem>
                  <MenuItem value="commission">佣金</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>状态</InputLabel>
                <Select
                  value={statusFilter}
                  label="状态"
                  onChange={handleStatusFilterChange}
                >
                  <MenuItem value="">全部</MenuItem>
                  <MenuItem value="success">成功</MenuItem>
                  <MenuItem value="pending">待处理</MenuItem>
                  <MenuItem value="processing">处理中</MenuItem>
                  <MenuItem value="failed">失败</MenuItem>
                  <MenuItem value="rejected">已拒绝</MenuItem>
                </Select>
              </FormControl>
              <IconButton onClick={() => queryClient.invalidateQueries({ queryKey: ['adminFinance'] })}>
                <RefreshIcon />
              </IconButton>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={() => exportMutation.mutate('xlsx')}
                disabled={exportMutation.isPending}
              >
                导出
              </Button>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>时间</TableCell>
                  <TableCell>类型</TableCell>
                  <TableCell>用户</TableCell>
                  <TableCell align="right">金额</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>备注</TableCell>
                  <TableCell align="right">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><CircularProgress size={20} /></TableCell>
                      <TableCell><CircularProgress size={20} /></TableCell>
                      <TableCell><CircularProgress size={20} /></TableCell>
                      <TableCell><CircularProgress size={20} /></TableCell>
                      <TableCell><CircularProgress size={20} /></TableCell>
                      <TableCell><CircularProgress size={20} /></TableCell>
                      <TableCell><CircularProgress size={20} /></TableCell>
                    </TableRow>
                  ))
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Alert severity="error">
                        加载失败：{getApiErrorMessage(error, '请稍后重试')}
                      </Alert>
                    </TableCell>
                  </TableRow>
                ) : data?.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="text.secondary" py={4}>暂无数据</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.items.map((tx) => (
                    <TableRow key={tx.id} hover>
                      <TableCell>
                        <Typography variant="body2">
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleString('zh-CN') : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <TypeBadge type={tx.type} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{tx.user?.nickname || tx.user?.email || '-'}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          color={tx.amount > 0 ? 'success.main' : 'error.main'}
                        >
                          {tx.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(tx.amount))}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={tx.status} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 150 }}>
                          {tx.description || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="查看详情">
                          <IconButton size="small">
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={data?.pagination.total || 0}
            page={page}
            onPageChange={handlePageChange}
            rowsPerPage={pageSize}
            onRowsPerPageChange={handlePageSizeChange}
            rowsPerPageOptions={[10, 20, 50, 100]}
          />
        </Card>
      </TabPanel>

      {/* Tab Panel 1 - Withdrawals */}
      <TabPanel value={tabValue} index={1}>
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>申请时间</TableCell>
                  <TableCell>用户</TableCell>
                  <TableCell align="right">金额</TableCell>
                  <TableCell>提现方式</TableCell>
                  <TableCell>账号</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell align="right">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><CircularProgress size={20} /></TableCell>
                      <TableCell><CircularProgress size={20} /></TableCell>
                      <TableCell><CircularProgress size={20} /></TableCell>
                      <TableCell><CircularProgress size={20} /></TableCell>
                      <TableCell><CircularProgress size={20} /></TableCell>
                      <TableCell><CircularProgress size={20} /></TableCell>
                      <TableCell><CircularProgress size={20} /></TableCell>
                    </TableRow>
                  ))
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Alert severity="error">
                        加载失败：{getApiErrorMessage(error, '请稍后重试')}
                      </Alert>
                    </TableCell>
                  </TableRow>
                ) : data?.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="text.secondary" py={4}>暂无待审核提现</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.items.map((withdrawal) => (
                    <TableRow key={withdrawal.id} hover>
                      <TableCell>
                        <Typography variant="body2">
                          {withdrawal.createdAt ? new Date(withdrawal.createdAt).toLocaleString('zh-CN') : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {withdrawal.kol?.name || withdrawal.kol?.email || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold" color="error.main">
                          {formatCurrency(withdrawal.amount)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{withdrawal.paymentMethod || '银行转账'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {maskAccount(withdrawal.accountNumber)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={withdrawal.status} />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="查看详情">
                          <IconButton size="small">
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="批准">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleApproveClick(withdrawal)}
                            disabled={approveWithdrawalMutation.isPending}
                          >
                            <CheckCircleIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="拒绝">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRejectClick(withdrawal)}
                            disabled={rejectWithdrawalMutation.isPending}
                          >
                            <CancelIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={data?.pagination.total || 0}
            page={page}
            onPageChange={handlePageChange}
            rowsPerPage={pageSize}
            onRowsPerPageChange={handlePageSizeChange}
            rowsPerPageOptions={[10, 20, 50, 100]}
          />
        </Card>
      </TabPanel>

      {/* Tab Panel 2 - Recharges */}
      <TabPanel value={tabValue} index={2}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 2 }} alignItems="center">
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>状态</InputLabel>
                <Select
                  value={depositStatusFilter}
                  label="状态"
                  onChange={(e) => {
                    setDepositStatusFilter(e.target.value);
                    setPage(0);
                  }}
                >
                  <MenuItem value="">全部</MenuItem>
                  <MenuItem value="pending">待处理</MenuItem>
                  <MenuItem value="processing">处理中</MenuItem>
                  <MenuItem value="completed">已完成</MenuItem>
                  <MenuItem value="failed">失败</MenuItem>
                </Select>
              </FormControl>
              <IconButton onClick={() => queryClient.invalidateQueries({ queryKey: ['adminFinance'] })}>
                <RefreshIcon />
              </IconButton>
            </Stack>
          </CardContent>
        </Card>
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>时间</TableCell>
                  <TableCell>广告主</TableCell>
                  <TableCell align="right">金额</TableCell>
                  <TableCell>支付方式</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>备注</TableCell>
                  <TableCell align="right">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <CircularProgress size={20} />
                      </TableCell>
                      <TableCell>
                        <CircularProgress size={20} />
                      </TableCell>
                      <TableCell>
                        <CircularProgress size={20} />
                      </TableCell>
                      <TableCell>
                        <CircularProgress size={20} />
                      </TableCell>
                      <TableCell>
                        <CircularProgress size={20} />
                      </TableCell>
                      <TableCell>
                        <CircularProgress size={20} />
                      </TableCell>
                      <TableCell>
                        <CircularProgress size={20} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Alert severity="error">加载失败：{getApiErrorMessage(error, '请稍后重试')}</Alert>
                    </TableCell>
                  </TableRow>
                ) : data?.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="text.secondary" py={4}>
                        暂无充值记录
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  (data?.items as Transaction[]).map((tx) => (
                    <TableRow key={tx.id} hover>
                      <TableCell>
                        <Typography variant="body2">
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleString('zh-CN') : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {tx.user?.companyName || tx.user?.email || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold" color="success.main">
                          {formatCurrency(Math.abs(tx.amount))}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{tx.paymentMethod || '-'}</Typography>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={tx.status} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 180 }}>
                          {tx.description || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {(tx.status === 'pending' || tx.status === 'processing') && (
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            onClick={() => {
                              setSelectedDepositTx(tx);
                              setConfirmDepositOpen(true);
                            }}
                            disabled={confirmRechargeMutation.isPending}
                          >
                            确认入账
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={data?.pagination.total || 0}
            page={page}
            onPageChange={handlePageChange}
            rowsPerPage={pageSize}
            onRowsPerPageChange={handlePageSizeChange}
            rowsPerPageOptions={[10, 20, 50, 100]}
          />
        </Card>
      </TabPanel>

      {/* Tab Panel 3 - Reports */}
      <TabPanel value={tabValue} index={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              财务报表导出
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              按时间范围导出 CSV（UTF-8，含 BOM，可直接用 Excel 打开）。「全部流水」为区间内所有资金流水；「提现」导出提现单维度。
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2, flexWrap: 'wrap' }}>
              <TextField
                label="开始日期"
                type="date"
                size="small"
                value={exportStartDate}
                onChange={(e) => setExportStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="结束日期"
                type="date"
                size="small"
                value={exportEndDate}
                onChange={(e) => setExportEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>导出范围</InputLabel>
                <Select
                  value={exportRangeType}
                  label="导出范围"
                  onChange={(e) => setExportRangeType(e.target.value as typeof exportRangeType)}
                >
                  <MenuItem value="transactions">资金流水（交易表）</MenuItem>
                  <MenuItem value="deposits">仅充值</MenuItem>
                  <MenuItem value="withdrawals">提现单</MenuItem>
                  <MenuItem value="all">全部流水（同交易表）</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={() => exportMutation.mutate('csv')}
                disabled={exportMutation.isPending}
              >
                导出 CSV
              </Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={() => exportMutation.mutate('xlsx')}
                disabled={exportMutation.isPending}
              >
                导出（Excel 兼容）
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </TabPanel>

      <Dialog
        open={confirmDepositOpen}
        onClose={() => {
          setConfirmDepositOpen(false);
          setConfirmDepositNote('');
          setSelectedDepositTx(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>确认充值入账</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {selectedDepositTx && (
              <Typography variant="body2" paragraph>
                确认将 <strong>{formatCurrency(Math.abs(selectedDepositTx.amount))}</strong> 计入广告主余额（已核对线下到账）。
              </Typography>
            )}
            <TextField
              fullWidth
              label="备注（选填）"
              value={confirmDepositNote}
              onChange={(e) => setConfirmDepositNote(e.target.value)}
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setConfirmDepositOpen(false);
              setConfirmDepositNote('');
              setSelectedDepositTx(null);
            }}
          >
            取消
          </Button>
          <Button
            variant="contained"
            disabled={!selectedDepositTx || confirmRechargeMutation.isPending}
            onClick={() => {
              if (selectedDepositTx) {
                confirmRechargeMutation.mutate({
                  id: selectedDepositTx.id,
                  note: confirmDepositNote || undefined,
                });
              }
            }}
          >
            确认入账
          </Button>
        </DialogActions>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onClose={handleCloseReviewDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{reviewAction === 'approve' ? '批准提现' : '拒绝提现'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {selectedWithdrawal && (
              <Typography variant="body2" paragraph>
                正在{reviewAction === 'approve' ? '批准' : '拒绝'}用户{' '}
                <strong>{selectedWithdrawal.kol?.name || selectedWithdrawal.kol?.email}</strong> 的提现申请
              </Typography>
            )}
            {selectedWithdrawal && (
              <Typography variant="h6" color="error.main" paragraph>
                金额：{formatCurrency(selectedWithdrawal.amount)}
              </Typography>
            )}
            {reviewAction === 'reject' && (
              <TextField
                fullWidth
                label="拒绝原因"
                value={reviewReason}
                onChange={(e) => setReviewReason(e.target.value)}
                multiline
                rows={3}
                required
                sx={{ mb: 2 }}
                placeholder="请说明拒绝原因"
              />
            )}
            <TextField
              fullWidth
              label="备注（选填）"
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              multiline
              rows={2}
              sx={{ mb: 2 }}
              placeholder="内部备注信息"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseReviewDialog}>取消</Button>
          <Button
            onClick={handleReviewSubmit}
            variant="contained"
            color={reviewAction === 'approve' ? 'success' : 'error'}
            disabled={reviewAction === 'reject' && !reviewReason}
          >
            {reviewAction === 'approve' ? '确认批准' : '确认拒绝'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FinancePage;
