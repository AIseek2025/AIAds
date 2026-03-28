import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { adminOrderAPI } from '../../services/adminApi';
import { getApiErrorMessage } from '../../utils/apiError';
import { getAdminOrdersActiveTab } from '../../utils/adminOrdersActiveTab';
import type { OrderListItem, OrderListParams } from '../../types';

type OrderStatusFilter = NonNullable<OrderListParams['status']>;

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
import Divider from '@mui/material/Divider';
import TableSortLabel from '@mui/material/TableSortLabel';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import { AdminHubNav } from '../../components/admin/AdminHubNav';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import StepContent from '@mui/material/StepContent';

// Icons
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import ScheduleIcon from '@mui/icons-material/Schedule';
import GavelIcon from '@mui/icons-material/Gavel';

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
      id={`order-tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

const OrderStatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, { color: 'success' | 'warning' | 'error' | 'info' | 'default'; label: string; icon?: React.ReactElement }> = {
    pending: { color: 'warning', label: '待处理', icon: <ScheduleIcon fontSize="small" /> },
    in_progress: { color: 'info', label: '进行中' },
    completed: { color: 'success', label: '已完成', icon: <CheckCircleIcon fontSize="small" /> },
    cancelled: { color: 'error', label: '已取消' },
    disputed: { color: 'error', label: '纠纷中', icon: <ErrorIcon fontSize="small" /> },
  };
  const conf = config[status] || { color: 'default' as const, label: status };
  return (
    <Chip
      label={conf.label}
      color={conf.color}
      size="small"
      sx={{ fontWeight: 500 }}
      icon={conf.icon}
    />
  );
};

const OrderPlatformBadge = ({ platform }: { platform: string }) => {
  const platformConfig: Record<string, { color: string; label: string }> = {
    tiktok: { color: '#FF0050', label: 'TikTok' },
    youtube: { color: '#FF0000', label: 'YouTube' },
    instagram: { color: '#E4405F', label: 'Instagram' },
  };
  const cfg = platformConfig[platform] || { color: '#999', label: platform };
  return (
    <Chip
      label={cfg.label}
      size="small"
      sx={{
        bgcolor: `${cfg.color}15`,
        color: cfg.color,
        fontWeight: 500,
      }}
    />
  );
};

const OrdersPage: React.FC = () => {
  const queryClient = useQueryClient();

  // State
  const [searchParams, setSearchParams] = useSearchParams();
  const disputeTabFromUrl = searchParams.get('tab') === 'disputes';
  const [tabValue, setTabValue] = useState(0);
  const activeTab = getAdminOrdersActiveTab(disputeTabFromUrl, tabValue);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [platformFilter, setPlatformFilter] = useState<string>('');
  const [amountFilter, setAmountFilter] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<OrderListItem | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [statusReason, setStatusReason] = useState('');
  const [disputeOutcome, setDisputeOutcome] = useState<'refund_full' | 'refund_partial' | 'no_refund' | 'escalate'>(
    'no_refund'
  );
  const [disputeRefundAmount, setDisputeRefundAmount] = useState('');
  const [disputeRuling, setDisputeRuling] = useState('');
  const [disputeNotifyParties, setDisputeNotifyParties] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Build query params
  const queryParams: OrderListParams = {
    page: page + 1,
    page_size: pageSize,
    sort: sortField,
    order: sortOrder,
  };

  if (keyword) queryParams.keyword = keyword;
  if (statusFilter) queryParams.status = statusFilter as OrderStatusFilter;
  if (platformFilter) queryParams.platform = platformFilter;
  if (amountFilter) {
    if (amountFilter === 'low') {
      queryParams.amount_max = 500;
    } else if (amountFilter === 'medium') {
      queryParams.amount_min = 500;
      queryParams.amount_max = 2000;
    } else if (amountFilter === 'high') {
      queryParams.amount_min = 2000;
    }
  }

  // Fetch orders
  const { data, isLoading, error, refetch: refetchOrders } = useQuery({
    queryKey: ['adminOrders', queryParams],
    queryFn: () => adminOrderAPI.getOrders(queryParams),
  });

  // Fetch order disputes
  const { data: disputes, refetch: refetchDisputes } = useQuery({
    queryKey: ['adminOrderDisputes'],
    queryFn: () => adminOrderAPI.getOrderDisputes({ page: 1, page_size: 50, status: 'pending' }),
    enabled: activeTab === 3,
  });

  // Fetch order detail
  const { data: orderDetail } = useQuery({
    queryKey: ['adminOrderDetail', selectedOrder?.id],
    queryFn: () => selectedOrder?.id ? adminOrderAPI.getOrder(selectedOrder.id) : null,
    enabled: detailDialogOpen && !!selectedOrder?.id,
  });

  // Update order status mutation
  const updateOrderStatusMutation = useMutation({
    mutationFn: (data: { id: string; status: string; reason?: string }) =>
      adminOrderAPI.updateOrderStatus(data.id, { status: data.status, reason: data.reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
      queryClient.invalidateQueries({ queryKey: ['adminOrderDetail'] });
      setSnackbar({ open: true, message: '订单状态已更新', severity: 'success' });
      setStatusDialogOpen(false);
      setNewStatus('');
      setStatusReason('');
      setSelectedOrder(null);
    },
    onError: (err: unknown) => {
      setSnackbar({
        open: true,
        message: getApiErrorMessage(err, '操作失败'),
        severity: 'error',
      });
    },
  });

  // Resolve dispute mutation
  const resolveDisputeMutation = useMutation({
    mutationFn: (data: {
      orderId: string;
      resolution: 'refund_full' | 'refund_partial' | 'no_refund' | 'escalate';
      refund_amount?: number;
      ruling: string;
      notify_parties?: boolean;
    }) => {
      const { orderId, ...body } = data;
      return adminOrderAPI.resolveOrderDispute(orderId, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
      queryClient.invalidateQueries({ queryKey: ['adminOrderDisputes'] });
      setSnackbar({ open: true, message: '纠纷已处理', severity: 'success' });
      setDisputeDialogOpen(false);
      setDisputeOutcome('no_refund');
      setDisputeRefundAmount('');
      setDisputeRuling('');
      setDisputeNotifyParties(true);
      setSelectedOrder(null);
    },
    onError: (err: unknown) => {
      setSnackbar({
        open: true,
        message: getApiErrorMessage(err, '操作失败'),
        severity: 'error',
      });
    },
  });

  // Handlers
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setPage(0);
    if (searchParams.get('tab') === 'disputes') {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('tab');
          return next;
        },
        { replace: true }
      );
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value);
    setPage(0);
  };

  const handleStatusFilterChange = (e: SelectChangeEvent<string>) => {
    setStatusFilter(e.target.value);
    setPage(0);
  };

  const handlePlatformFilterChange = (e: SelectChangeEvent<string>) => {
    setPlatformFilter(e.target.value);
    setPage(0);
  };

  const handleAmountFilterChange = (e: SelectChangeEvent<string>) => {
    setAmountFilter(e.target.value);
    setPage(0);
  };

  const handlePageChange = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageSize(parseInt(e.target.value, 10));
    setPage(0);
  };

  const handleViewDetail = (order: OrderListItem) => {
    setSelectedOrder(order);
    setDetailDialogOpen(true);
  };

  const handleStatusClick = (order: OrderListItem) => {
    setSelectedOrder(order);
    setStatusDialogOpen(true);
  };

  const handleDisputeClick = (order: OrderListItem) => {
    setSelectedOrder(order);
    setDisputeDialogOpen(true);
  };

  const handleStatusSubmit = () => {
    if (!selectedOrder || !newStatus) {
      setSnackbar({ open: true, message: '请选择新状态', severity: 'error' });
      return;
    }
    updateOrderStatusMutation.mutate({
      id: selectedOrder.id,
      status: newStatus,
      reason: statusReason,
    });
  };

  const handleDisputeSubmit = () => {
    if (!selectedOrder || !disputeRuling.trim()) {
      setSnackbar({ open: true, message: '请填写裁决说明', severity: 'error' });
      return;
    }
    if (disputeOutcome === 'refund_partial') {
      const amt = parseFloat(disputeRefundAmount);
      if (!Number.isFinite(amt) || amt <= 0) {
        setSnackbar({ open: true, message: '部分退款须填写大于 0 的金额', severity: 'error' });
        return;
      }
    }
    resolveDisputeMutation.mutate({
      orderId: selectedOrder.id,
      resolution: disputeOutcome,
      refund_amount: disputeOutcome === 'refund_partial' ? parseFloat(disputeRefundAmount) : undefined,
      ruling: disputeRuling.trim(),
      notify_parties: disputeNotifyParties,
    });
  };

  const handleExport = async () => {
    try {
      const result = await adminOrderAPI.exportOrders({
        format: 'xlsx',
        filters: queryParams,
      });
      window.open(result.download_url, '_blank');
      setSnackbar({ open: true, message: '导出成功', severity: 'success' });
    } catch (err: unknown) {
      setSnackbar({
        open: true,
        message: getApiErrorMessage(err, '导出失败'),
        severity: 'error',
      });
    }
  };

  const handleCloseDetail = () => {
    setDetailDialogOpen(false);
    setSelectedOrder(null);
  };

  const handleCloseStatusDialog = () => {
    setStatusDialogOpen(false);
    setNewStatus('');
    setStatusReason('');
    setSelectedOrder(null);
  };

  const handleCloseDisputeDialog = () => {
    setDisputeDialogOpen(false);
    setDisputeOutcome('no_refund');
    setDisputeRefundAmount('');
    setDisputeRuling('');
    setDisputeNotifyParties(true);
    setSelectedOrder(null);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked && data?.items) {
      setSelectedIds(data.items.map(item => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const orderItemCount = data?.items?.length ?? 0;
  const allOrderRowsSelected = orderItemCount > 0 && selectedIds.length === orderItemCount;

  const handleHubRefresh = () => {
    void refetchOrders();
    void refetchDisputes();
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
            订单管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            管理订单全生命周期，包括状态跟踪和纠纷处理
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport} disabled={!data?.items?.length}>
            导出
          </Button>
        </Stack>
      </Box>
      <AdminHubNav onRefresh={handleHubRefresh} />
      <Alert severity="info" sx={{ mb: 3, mt: 2 }}>
        与侧栏模块路径一致；导出为当前筛选与排序下的列表。刷新将重新拉取订单列表与纠纷数据。
      </Alert>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
          <Tab label={`全部订单 (${data?.pagination.total || 0})`} />
          <Tab label="待处理" />
          <Tab label="进行中" />
          <Tab label={`纠纷订单 (${disputes?.pagination.total || 0})`} />
        </Tabs>
      </Paper>

      {/* Tab Panel 0 - All Orders */}
      <TabPanel value={activeTab} index={0}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 2 }}>
              <TextField
                placeholder="搜索订单号/活动名称/KOL..."
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
                <InputLabel>状态</InputLabel>
                <Select
                  value={statusFilter}
                  label="状态"
                  onChange={handleStatusFilterChange}
                >
                  <MenuItem value="">全部</MenuItem>
                  <MenuItem value="pending">待处理</MenuItem>
                  <MenuItem value="in_progress">进行中</MenuItem>
                  <MenuItem value="completed">已完成</MenuItem>
                  <MenuItem value="cancelled">已取消</MenuItem>
                  <MenuItem value="disputed">纠纷中</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>平台</InputLabel>
                <Select
                  value={platformFilter}
                  label="平台"
                  onChange={handlePlatformFilterChange}
                >
                  <MenuItem value="">全部</MenuItem>
                  <MenuItem value="tiktok">TikTok</MenuItem>
                  <MenuItem value="youtube">YouTube</MenuItem>
                  <MenuItem value="instagram">Instagram</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>金额</InputLabel>
                <Select
                  value={amountFilter}
                  label="金额"
                  onChange={handleAmountFilterChange}
                >
                  <MenuItem value="">全部</MenuItem>
                  <MenuItem value="low">低金额 (&lt;500)</MenuItem>
                  <MenuItem value="medium">中金额 (500-2K)</MenuItem>
                  <MenuItem value="high">高金额 (&gt;2K)</MenuItem>
                </Select>
              </FormControl>
              <IconButton onClick={() => queryClient.invalidateQueries({ queryKey: ['adminOrders'] })}>
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
                  <TableCell padding="checkbox" sx={{ width: 50 }}>
                    <Checkbox
                      checked={allOrderRowsSelected}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell>
                    <TableSortLabel active={sortField === 'order_no'} direction={sortOrder} onClick={() => handleSort('order_no')}>
                      订单号
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>活动/KOL</TableCell>
                  <TableCell>平台</TableCell>
                  <TableCell>
                    <TableSortLabel active={sortField === 'amount'} direction={sortOrder} onClick={() => handleSort('amount')}>
                      金额
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>计价</TableCell>
                  <TableCell>冻结预算</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>
                    <TableSortLabel active={sortField === 'created_at'} direction={sortOrder} onClick={() => handleSort('created_at')}>
                      创建时间
                    </TableSortLabel>
                  </TableCell>
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
                      <TableCell><CircularProgress size={20} /></TableCell>
                      <TableCell><CircularProgress size={20} /></TableCell>
                      <TableCell><CircularProgress size={20} /></TableCell>
                    </TableRow>
                  ))
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      <Alert severity="error">
                        加载失败：{getApiErrorMessage(error, '请稍后重试')}
                      </Alert>
                    </TableCell>
                  </TableRow>
                ) : data?.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      <Typography color="text.secondary" py={4}>暂无数据</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.items.map((order) => (
                    <TableRow key={order.id} hover selected={selectedIds.includes(order.id)}>
                      <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.includes(order.id)}
                          onChange={() => handleSelectRow(order.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="500">
                          {order.orderNo}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {order.campaignName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">{order.kolName}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {order.advertiserName}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <OrderPlatformBadge platform={order.kolPlatform} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {formatCurrency(order.amount)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={(order.pricingModel || order.pricing_model || 'fixed') === 'cpm' ? 'CPM' : '固定价'}
                          color={(order.pricingModel || order.pricing_model) === 'cpm' ? 'secondary' : 'default'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatCurrency(order.frozenAmount ?? order.frozen_amount ?? 0)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <OrderStatusBadge status={order.status} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(order.createdAt).toLocaleDateString('zh-CN')}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="查看详情">
                          <IconButton size="small" onClick={() => handleViewDetail(order)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {order.status === 'in_progress' && (
                          <Tooltip title="管理状态">
                            <IconButton size="small" color="primary" onClick={() => handleStatusClick(order)}>
                              <ScheduleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {order.status === 'disputed' && (
                          <Tooltip title="处理纠纷">
                            <IconButton size="small" color="error" onClick={() => handleDisputeClick(order)}>
                              <GavelIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
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

      {/* Tab Panel 1 - Pending */}
      <TabPanel value={activeTab} index={1}>
        <Alert severity="info" sx={{ mb: 3 }}>
          待处理订单将显示在这里，请及时处理
        </Alert>
      </TabPanel>

      {/* Tab Panel 2 - In Progress */}
      <TabPanel value={activeTab} index={2}>
        <Alert severity="success" sx={{ mb: 3 }}>
          进行中的订单，实时跟踪执行进度
        </Alert>
      </TabPanel>

      {/* Tab Panel 3 - Disputes */}
      <TabPanel value={activeTab} index={3}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          纠纷订单需要及时处理，确保平台和用户权益
        </Alert>
        {disputes?.items && disputes.items.length > 0 && (
          <Card>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>订单号</TableCell>
                    <TableCell>活动/KOL</TableCell>
                    <TableCell>纠纷方</TableCell>
                    <TableCell>纠纷原因</TableCell>
                    <TableCell>状态</TableCell>
                    <TableCell>提交时间</TableCell>
                    <TableCell align="right">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {disputes.items.map((dispute) => (
                    <TableRow key={dispute.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="500">
                          {dispute.orderNo}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{dispute.campaign.title}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {dispute.kol.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={dispute.raisedBy === 'advertiser' ? '广告主' : 'KOL'}
                          size="small"
                          color={dispute.raisedBy === 'advertiser' ? 'info' : 'warning'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                          {dispute.reason}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={dispute.status === 'pending' ? '待处理' : dispute.status === 'investigating' ? '调查中' : '已解决'}
                          size="small"
                          color={dispute.status === 'pending' ? 'warning' : dispute.status === 'investigating' ? 'info' : 'success'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(dispute.createdAt).toLocaleDateString('zh-CN')}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="处理纠纷">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => {
                              const order = data?.items.find(o => o.id === dispute.orderId);
                              if (order) {
                                setSelectedOrder(order);
                                setDisputeDialogOpen(true);
                              }
                            }}
                          >
                            <GavelIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        )}
      </TabPanel>

      {/* Order Detail Dialog */}
      <Dialog open={detailDialogOpen} onClose={handleCloseDetail} maxWidth="lg" fullWidth>
        {orderDetail && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    {orderDetail.orderNo}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {orderDetail.campaignName}
                  </Typography>
                </Box>
                <OrderStatusBadge status={orderDetail.status} />
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={3}>
                {/* Order Info */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        订单信息
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Stack spacing={2}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">订单金额</Typography>
                          <Typography variant="body2" fontWeight="bold">{formatCurrency(orderDetail.amount)}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">广告主</Typography>
                          <Typography variant="body2">{orderDetail.advertiserName}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">KOL</Typography>
                          <Typography variant="body2">{orderDetail.kolName}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">平台</Typography>
                          <OrderPlatformBadge platform={orderDetail.kolPlatform} />
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                {/* KOL Profile */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        KOL 信息
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Stack spacing={2}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">平台账号</Typography>
                          <Typography variant="body2">{orderDetail.kolProfile.platformUsername}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">粉丝数</Typography>
                          <Typography variant="body2">{orderDetail.kolProfile.followers.toLocaleString()}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">互动率</Typography>
                          <Typography variant="body2">{(orderDetail.kolProfile.engagementRate * 100).toFixed(2)}%</Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Deliverables */}
                <Grid size={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        交付内容
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Grid container spacing={2}>
                        <Grid size={4}>
                          <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.lighter', borderRadius: 2 }}>
                            <Typography variant="h5" fontWeight="bold" color="primary.main">
                              {orderDetail.deliverables.videoCount}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">视频</Typography>
                          </Box>
                        </Grid>
                        <Grid size={4}>
                          <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.lighter', borderRadius: 2 }}>
                            <Typography variant="h5" fontWeight="bold" color="success.main">
                              {orderDetail.deliverables.imageCount}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">图片</Typography>
                          </Box>
                        </Grid>
                        <Grid size={4}>
                          <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.lighter', borderRadius: 2 }}>
                            <Typography variant="h5" fontWeight="bold" color="info.main">
                              {orderDetail.deliverables.postCount}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">帖子</Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Timeline */}
                <Grid size={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        时间线
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Stepper orientation="vertical" activeStep={-1}>
                        {orderDetail.timeline.acceptedAt && (
                          <Step completed>
                            <StepLabel>订单已接受</StepLabel>
                            <StepContent>
                              <Typography variant="body2" color="text.secondary">
                                {new Date(orderDetail.timeline.acceptedAt).toLocaleString('zh-CN')}
                              </Typography>
                            </StepContent>
                          </Step>
                        )}
                        {orderDetail.timeline.submittedAt && (
                          <Step completed>
                            <StepLabel>内容已提交</StepLabel>
                            <StepContent>
                              <Typography variant="body2" color="text.secondary">
                                {new Date(orderDetail.timeline.submittedAt).toLocaleString('zh-CN')}
                              </Typography>
                            </StepContent>
                          </Step>
                        )}
                        {orderDetail.timeline.reviewedAt && (
                          <Step completed>
                            <StepLabel>审核通过</StepLabel>
                            <StepContent>
                              <Typography variant="body2" color="text.secondary">
                                {new Date(orderDetail.timeline.reviewedAt).toLocaleString('zh-CN')}
                              </Typography>
                            </StepContent>
                          </Step>
                        )}
                        {orderDetail.timeline.publishedAt && (
                          <Step completed>
                            <StepLabel>已发布</StepLabel>
                            <StepContent>
                              <Typography variant="body2" color="text.secondary">
                                {new Date(orderDetail.timeline.publishedAt).toLocaleString('zh-CN')}
                              </Typography>
                            </StepContent>
                          </Step>
                        )}
                        {orderDetail.timeline.completedAt && (
                          <Step completed>
                            <StepLabel>订单完成</StepLabel>
                            <StepContent>
                              <Typography variant="body2" color="text.secondary">
                                {new Date(orderDetail.timeline.completedAt).toLocaleString('zh-CN')}
                              </Typography>
                            </StepContent>
                          </Step>
                        )}
                      </Stepper>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Dispute Info */}
                {orderDetail.disputeInfo && (
                  <Grid size={12}>
                    <Alert severity="error">
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        纠纷信息
                      </Typography>
                      <Stack spacing={1}>
                        <Typography variant="body2">
                          <strong>纠纷方：</strong>{orderDetail.disputeInfo.raisedBy === 'advertiser' ? '广告主' : 'KOL'}
                        </Typography>
                        <Typography variant="body2">
                          <strong>原因：</strong>{orderDetail.disputeInfo.reason}
                        </Typography>
                        <Typography variant="body2">
                          <strong>描述：</strong>{orderDetail.disputeInfo.description}
                        </Typography>
                        <Typography variant="body2">
                          <strong>状态：</strong>{orderDetail.disputeInfo.status}
                        </Typography>
                        {orderDetail.disputeInfo.resolution && (
                          <Typography variant="body2">
                            <strong>处理方案：</strong>{orderDetail.disputeInfo.resolution}
                          </Typography>
                        )}
                      </Stack>
                    </Alert>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDetail}>关闭</Button>
              {orderDetail.status === 'in_progress' && (
                <Button onClick={() => setStatusDialogOpen(true)}>管理状态</Button>
              )}
              {orderDetail.status === 'disputed' && (
                <Button color="error" onClick={() => setDisputeDialogOpen(true)}>处理纠纷</Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Status Dialog */}
      <Dialog open={statusDialogOpen} onClose={handleCloseStatusDialog} maxWidth="sm" fullWidth>
        <DialogTitle>管理订单状态</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Stack spacing={3}>
              {selectedOrder && (
                <Alert severity="info">
                  订单：{selectedOrder.orderNo}<br />
                  当前状态：<OrderStatusBadge status={selectedOrder.status} />
                </Alert>
              )}
              <FormControl fullWidth>
                <InputLabel>新状态</InputLabel>
                <Select
                  value={newStatus}
                  label="新状态"
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  <MenuItem value="in_progress">进行中</MenuItem>
                  <MenuItem value="completed">已完成</MenuItem>
                  <MenuItem value="cancelled">已取消</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="状态变更原因"
                multiline
                rows={3}
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="说明状态变更原因（选填）"
              />
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseStatusDialog}>取消</Button>
          <Button
            variant="contained"
            onClick={handleStatusSubmit}
            disabled={updateOrderStatusMutation.isPending || !newStatus}
          >
            {updateOrderStatusMutation.isPending ? <CircularProgress size={24} /> : '确认变更'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dispute Dialog */}
      <Dialog open={disputeDialogOpen} onClose={handleCloseDisputeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>处理订单纠纷</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Stack spacing={3}>
              {selectedOrder && orderDetail?.disputeInfo && (
                <>
                  <Alert severity="error">
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      纠纷详情
                    </Typography>
                    <Typography variant="body2">
                      <strong>订单：</strong>{selectedOrder.orderNo}
                    </Typography>
                    <Typography variant="body2">
                      <strong>纠纷方：</strong>{orderDetail.disputeInfo.raisedBy === 'advertiser' ? '广告主' : 'KOL'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>原因：</strong>{orderDetail.disputeInfo.reason}
                    </Typography>
                    <Typography variant="body2">
                      <strong>描述：</strong>{orderDetail.disputeInfo.description}
                    </Typography>
                  </Alert>
                  <FormControl fullWidth>
                    <InputLabel>处理方式</InputLabel>
                    <Select
                      value={disputeOutcome}
                      label="处理方式"
                      onChange={(e) =>
                        setDisputeOutcome(e.target.value as 'refund_full' | 'refund_partial' | 'no_refund' | 'escalate')
                      }
                    >
                      <MenuItem value="no_refund">不予退款（结案）</MenuItem>
                      <MenuItem value="refund_full">全额退款并取消订单</MenuItem>
                      <MenuItem value="refund_partial">部分退款</MenuItem>
                      <MenuItem value="escalate">升级跟进</MenuItem>
                    </Select>
                  </FormControl>
                  {disputeOutcome === 'refund_partial' && (
                    <TextField
                      fullWidth
                      label="退款金额（元）"
                      type="number"
                      value={disputeRefundAmount}
                      onChange={(e) => setDisputeRefundAmount(e.target.value)}
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  )}
                  <TextField
                    fullWidth
                    label="裁决说明"
                    multiline
                    rows={4}
                    value={disputeRuling}
                    onChange={(e) => setDisputeRuling(e.target.value)}
                    placeholder="说明事实认定、处理依据与结果（将同步通知双方）"
                    required
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={disputeNotifyParties}
                        onChange={(e) => setDisputeNotifyParties(e.target.checked)}
                      />
                    }
                    label="处理完成后通知广告主与 KOL（站内通知）"
                  />
                </>
              )}
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDisputeDialog}>取消</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleDisputeSubmit}
            disabled={resolveDisputeMutation.isPending || !disputeRuling.trim()}
          >
            {resolveDisputeMutation.isPending ? <CircularProgress size={24} /> : '确认处理'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default OrdersPage;
