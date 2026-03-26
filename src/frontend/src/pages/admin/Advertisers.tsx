import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAdvertiserAPI } from '../../services/adminApi';
import type { AdvertiserListItem, AdvertiserDetail, AdvertiserListParams } from '../../types';

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
import Avatar from '@mui/material/Avatar';
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
import Link from '@mui/material/Link';
import TableSortLabel from '@mui/material/TableSortLabel';
import Checkbox from '@mui/material/Checkbox';
import Badge from '@mui/material/Badge';

// Icons
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import RefreshIcon from '@mui/icons-material/Refresh';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import BlockIcon from '@mui/icons-material/Block';
import UnlockIcon from '@mui/icons-material/LockOpen';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import HistoryIcon from '@mui/icons-material/History';
import DownloadIcon from '@mui/icons-material/Download';
import FilterListIcon from '@mui/icons-material/FilterList';

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
      id={`advertiser-tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

const AdvertisersPage: React.FC = () => {
  const queryClient = useQueryClient();

  // State
  const [tabValue, setTabValue] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [verificationStatusFilter, setVerificationStatusFilter] = useState<string>('');
  const [industryFilter, setIndustryFilter] = useState<string>('');
  const [balanceFilter, setBalanceFilter] = useState<string>('');
  const [selectedAdvertiser, setSelectedAdvertiser] = useState<AdvertiserListItem | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewReason, setReviewReason] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [balanceAmount, setBalanceAmount] = useState<string>('');
  const [balanceType, setBalanceType] = useState<'manual' | 'refund' | 'compensation' | 'penalty'>('manual');
  const [balanceReason, setBalanceReason] = useState('');
  const [notifyAdvertiser, setNotifyAdvertiser] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Build query params
  const queryParams: AdvertiserListParams = {
    page: page + 1,
    page_size: pageSize,
    sort: sortField,
    order: sortOrder,
  };

  if (keyword) queryParams.keyword = keyword;
  if (verificationStatusFilter) queryParams.verification_status = verificationStatusFilter as any;
  if (industryFilter) queryParams.industry = industryFilter;
  if (balanceFilter) {
    if (balanceFilter === 'positive') {
      queryParams.min_balance = 0.01;
    } else if (balanceFilter === 'zero') {
      queryParams.max_balance = 0;
    } else if (balanceFilter === 'low') {
      queryParams.min_balance = 0;
      queryParams.max_balance = 10000;
    } else if (balanceFilter === 'high') {
      queryParams.min_balance = 50000;
    }
  }

  // Fetch advertisers
  const { data, isLoading, error } = useQuery({
    queryKey: ['adminAdvertisers', queryParams],
    queryFn: () => adminAdvertiserAPI.getAdvertisers(queryParams),
  });

  // Fetch advertiser detail
  const { data: advertiserDetail } = useQuery({
    queryKey: ['adminAdvertiserDetail', selectedAdvertiser?.id],
    queryFn: () => selectedAdvertiser?.id ? adminAdvertiserAPI.getAdvertiser(selectedAdvertiser.id) : null,
    enabled: detailDialogOpen && !!selectedAdvertiser?.id,
  });

  // Verify advertiser mutation
  const verifyAdvertiserMutation = useMutation({
    mutationFn: (data: { id: string; action: 'approve' | 'reject'; note?: string; rejection_reason?: string }) =>
      adminAdvertiserAPI.verifyAdvertiser(data.id, { action: data.action, note: data.note, rejection_reason: data.rejection_reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAdvertisers'] });
      setSnackbar({ open: true, message: reviewAction === 'approve' ? '广告主审核通过' : '广告主审核拒绝', severity: 'success' });
      setReviewDialogOpen(false);
      setReviewReason('');
      setReviewNote('');
      setSelectedAdvertiser(null);
    },
    onError: (err: any) => {
      setSnackbar({ open: true, message: err.response?.data?.error?.message || '操作失败', severity: 'error' });
    },
  });

  // Adjust balance mutation
  const adjustBalanceMutation = useMutation({
    mutationFn: (data: { id: string; amount: number; type: string; reason: string; notify_advertiser?: boolean }) =>
      adminAdvertiserAPI.adjustBalance(data.id, { amount: data.amount, type: data.type, reason: data.reason, notify_advertiser: data.notify_advertiser }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAdvertisers'] });
      queryClient.invalidateQueries({ queryKey: ['adminAdvertiserDetail'] });
      setSnackbar({ open: true, message: '余额调整成功', severity: 'success' });
      setBalanceDialogOpen(false);
      setBalanceAmount('');
      setBalanceReason('');
      setSelectedAdvertiser(null);
    },
    onError: (err: any) => {
      setSnackbar({ open: true, message: err.response?.data?.error?.message || '操作失败', severity: 'error' });
    },
  });

  // Freeze account mutation
  const freezeAccountMutation = useMutation({
    mutationFn: (data: { id: string; reason: string }) =>
      adminAdvertiserAPI.freezeAccount(data.id, { reason: data.reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAdvertisers'] });
      setSnackbar({ open: true, message: '账户已冻结', severity: 'success' });
      setDetailDialogOpen(false);
    },
    onError: (err: any) => {
      setSnackbar({ open: true, message: err.response?.data?.error?.message || '操作失败', severity: 'error' });
    },
  });

  // Unfreeze account mutation
  const unfreezeAccountMutation = useMutation({
    mutationFn: (data: { id: string; reason: string }) =>
      adminAdvertiserAPI.unfreezeAccount(data.id, { reason: data.reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAdvertisers'] });
      setSnackbar({ open: true, message: '账户已解冻', severity: 'success' });
      setDetailDialogOpen(false);
    },
    onError: (err: any) => {
      setSnackbar({ open: true, message: err.response?.data?.error?.message || '操作失败', severity: 'error' });
    },
  });

  // Handlers
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setPage(0);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value);
    setPage(0);
  };

  const handleVerificationStatusFilterChange = (e: SelectChangeEvent<string>) => {
    setVerificationStatusFilter(e.target.value);
    setPage(0);
  };

  const handleIndustryFilterChange = (e: SelectChangeEvent<string>) => {
    setIndustryFilter(e.target.value);
    setPage(0);
  };

  const handleBalanceFilterChange = (e: SelectChangeEvent<string>) => {
    setBalanceFilter(e.target.value);
    setPage(0);
  };

  const handlePageChange = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageSize(parseInt(e.target.value, 10));
    setPage(0);
  };

  const handleViewDetail = (advertiser: AdvertiserListItem) => {
    setSelectedAdvertiser(advertiser);
    setDetailDialogOpen(true);
  };

  const handleApproveClick = (advertiser: AdvertiserListItem) => {
    setSelectedAdvertiser(advertiser);
    setReviewAction('approve');
    setReviewDialogOpen(true);
  };

  const handleRejectClick = (advertiser: AdvertiserListItem) => {
    setSelectedAdvertiser(advertiser);
    setReviewAction('reject');
    setReviewDialogOpen(true);
  };

  const handleBalanceClick = (advertiser: AdvertiserListItem) => {
    setSelectedAdvertiser(advertiser);
    setBalanceDialogOpen(true);
  };

  const handleReviewSubmit = () => {
    if (!selectedAdvertiser) return;
    if (reviewAction === 'reject' && !reviewReason) {
      setSnackbar({ open: true, message: '请填写拒绝原因', severity: 'error' });
      return;
    }
    verifyAdvertiserMutation.mutate({
      id: selectedAdvertiser.id,
      action: reviewAction,
      note: reviewNote,
      rejection_reason: reviewAction === 'reject' ? reviewReason : undefined,
    });
  };

  const handleBalanceSubmit = () => {
    if (!selectedAdvertiser || !balanceAmount || !balanceReason) {
      setSnackbar({ open: true, message: '请填写完整信息', severity: 'error' });
      return;
    }
    adjustBalanceMutation.mutate({
      id: selectedAdvertiser.id,
      amount: parseFloat(balanceAmount),
      type: balanceType,
      reason: balanceReason,
      notify_advertiser: notifyAdvertiser,
    });
  };

  const handleCloseDetail = () => {
    setDetailDialogOpen(false);
    setSelectedAdvertiser(null);
  };

  const handleCloseReviewDialog = () => {
    setReviewDialogOpen(false);
    setReviewReason('');
    setReviewNote('');
    setSelectedAdvertiser(null);
  };

  const handleCloseBalanceDialog = () => {
    setBalanceDialogOpen(false);
    setBalanceAmount('');
    setBalanceReason('');
    setSelectedAdvertiser(null);
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

  const handleFreeze = () => {
    if (!selectedAdvertiser) return;
    freezeAccountMutation.mutate({ id: selectedAdvertiser.id, reason: '违规操作' });
  };

  const handleUnfreeze = () => {
    if (!selectedAdvertiser) return;
    unfreezeAccountMutation.mutate({ id: selectedAdvertiser.id, reason: '解除冻结' });
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Verification status badge
  const VerificationStatusBadge = ({ status }: { status: string }) => {
    const config: Record<string, { color: 'success' | 'warning' | 'error' | 'default'; label: string }> = {
      pending: { color: 'warning', label: '待审核' },
      approved: { color: 'success', label: '已认证' },
      rejected: { color: 'error', label: '已拒绝' },
    };
    const conf = config[status] || { color: 'default', label: status };
    return <Chip label={conf.label} color={conf.color} size="small" sx={{ fontWeight: 500 }} />;
  };

  // Industry options
  const industryOptions = ['互联网科技', '文化传媒', '电商贸易', '教育培训', '游戏娱乐', '其他'];

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            广告主管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            管理广告主信息、认证审核和余额
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" startIcon={<DownloadIcon />} disabled={!data?.items?.length}>
            导出
          </Button>
          {selectedIds.length > 0 && (
            <Button
              variant="contained"
              color="success"
              onClick={() => selectedIds.forEach(id => {
                const adv = data?.items.find(i => i.id === id);
                if (adv) handleApproveClick(adv);
              })}
            >
              批量审核通过 ({selectedIds.length})
            </Button>
          )}
        </Stack>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label={`广告主列表 (${data?.pagination.total || 0})`} />
          <Tab label="待审核" />
        </Tabs>
      </Paper>

      {/* Tab Panel 0 - Advertiser List */}
      <TabPanel value={tabValue} index={0}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 2 }}>
              <TextField
                placeholder="搜索公司名称/联系人/邮箱..."
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
                <InputLabel>认证状态</InputLabel>
                <Select
                  value={verificationStatusFilter}
                  label="认证状态"
                  onChange={handleVerificationStatusFilterChange}
                >
                  <MenuItem value="">全部</MenuItem>
                  <MenuItem value="pending">待审核</MenuItem>
                  <MenuItem value="approved">已认证</MenuItem>
                  <MenuItem value="rejected">已拒绝</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>行业</InputLabel>
                <Select
                  value={industryFilter}
                  label="行业"
                  onChange={handleIndustryFilterChange}
                >
                  <MenuItem value="">全部</MenuItem>
                  {industryOptions.map(ind => (
                    <MenuItem key={ind} value={ind}>{ind}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>余额</InputLabel>
                <Select
                  value={balanceFilter}
                  label="余额"
                  onChange={handleBalanceFilterChange}
                >
                  <MenuItem value="">全部</MenuItem>
                  <MenuItem value="positive">有余额</MenuItem>
                  <MenuItem value="zero">零余额</MenuItem>
                  <MenuItem value="low">低余额 (&lt;1 万)</MenuItem>
                  <MenuItem value="high">高余额 (&gt;5 万)</MenuItem>
                </Select>
              </FormControl>
              <IconButton onClick={() => queryClient.invalidateQueries({ queryKey: ['adminAdvertisers'] })}>
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
                      checked={selectedIds.length === (data?.items?.length || 0) && data?.items?.length! > 0}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell>
                    <TableSortLabel active={sortField === 'company_name'} direction={sortOrder} onClick={() => handleSort('company_name')}>
                      公司名称
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>联系人</TableCell>
                  <TableCell>邮箱</TableCell>
                  <TableCell>
                    <TableSortLabel active={sortField === 'wallet_balance'} direction={sortOrder} onClick={() => handleSort('wallet_balance')}>
                      余额
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>认证状态</TableCell>
                  <TableCell>
                    <TableSortLabel active={sortField === 'active_campaigns'} direction={sortOrder} onClick={() => handleSort('active_campaigns')}>
                      活动数
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel active={sortField === 'created_at'} direction={sortOrder} onClick={() => handleSort('created_at')}>
                      注册时间
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
                    </TableRow>
                  ))
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <Alert severity="error">加载失败：{(error as Error).message}</Alert>
                    </TableCell>
                  </TableRow>
                ) : data?.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <Typography color="text.secondary" py={4}>暂无数据</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.items.map((advertiser) => (
                    <TableRow key={advertiser.id} hover selected={selectedIds.includes(advertiser.id)}>
                      <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.includes(advertiser.id)}
                          onChange={() => handleSelectRow(advertiser.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ width: 36, height: 36, mr: 1.5, bgcolor: 'primary.main' }}>
                            {advertiser.companyName[0]}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="500">
                              {advertiser.companyName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {advertiser.industry}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{advertiser.contactPerson}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                          {advertiser.contactEmail}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold" color={advertiser.walletBalance > 0 ? 'success.main' : 'text.secondary'}>
                          {formatCurrency(advertiser.walletBalance)}
                        </Typography>
                        {advertiser.frozenBalance > 0 && (
                          <Typography variant="caption" color="error.main">
                            (冻结：{formatCurrency(advertiser.frozenBalance)})
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <VerificationStatusBadge status={advertiser.verificationStatus} />
                      </TableCell>
                      <TableCell>
                        <Chip label={advertiser.activeCampaigns} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(advertiser.createdAt).toLocaleDateString('zh-CN')}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="查看详情">
                          <IconButton size="small" onClick={() => handleViewDetail(advertiser)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {advertiser.verificationStatus === 'pending' && (
                          <>
                            <Tooltip title="通过审核">
                              <IconButton size="small" color="success" onClick={() => handleApproveClick(advertiser)}>
                                <CheckCircleIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="拒绝审核">
                              <IconButton size="small" color="error" onClick={() => handleRejectClick(advertiser)}>
                                <CancelIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
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

      {/* Tab Panel 1 - Pending Reviews */}
      <TabPanel value={tabValue} index={1}>
        <Alert severity="info" sx={{ mb: 3 }}>
          待审核广告主将显示在这里，请及时处理审核申请
        </Alert>
        {/* Similar table structure as Tab 0, filtered for pending status */}
      </TabPanel>

      {/* Advertiser Detail Dialog */}
      <Dialog open={detailDialogOpen} onClose={handleCloseDetail} maxWidth="lg" fullWidth>
        {advertiserDetail && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" fontWeight="bold">
                  {advertiserDetail.companyName}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button size="small" variant="outlined" startIcon={<AccountBalanceIcon />} onClick={() => handleBalanceClick(advertiserDetail)}>
                    余额调整
                  </Button>
                  {advertiserDetail.frozenBalance > 0 ? (
                    <Button size="small" variant="outlined" color="success" startIcon={<UnlockIcon />} onClick={handleUnfreeze}>
                      解冻账户
                    </Button>
                  ) : (
                    <Button size="small" variant="outlined" color="error" startIcon={<BlockIcon />} onClick={handleFreeze}>
                      冻结账户
                    </Button>
                  )}
                </Stack>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={3}>
                {/* Basic Info */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        基本信息
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Stack spacing={2}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">公司名称</Typography>
                          <Typography variant="body2">{advertiserDetail.companyName}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">营业执照</Typography>
                          <Link href={advertiserDetail.businessLicenseUrl} target="_blank">
                            {advertiserDetail.businessLicense}
                          </Link>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">法人代表</Typography>
                          <Typography variant="body2">{advertiserDetail.legalRepresentative}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">行业类别</Typography>
                          <Typography variant="body2">{advertiserDetail.industry}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">认证状态</Typography>
                          <VerificationStatusBadge status={advertiserDetail.verificationStatus} />
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Contact Info */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        联系信息
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Stack spacing={2}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">联系人</Typography>
                          <Typography variant="body2">{advertiserDetail.contactPerson}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">联系电话</Typography>
                          <Typography variant="body2">{advertiserDetail.contactPhone}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">联系邮箱</Typography>
                          <Typography variant="body2">{advertiserDetail.contactEmail}</Typography>
                        </Box>
                        {advertiserDetail.website && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">公司网站</Typography>
                            <Link href={advertiserDetail.website} target="_blank">
                              {advertiserDetail.website}
                            </Link>
                          </Box>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Account Stats */}
                <Grid size={12}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                    账户数据
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Card variant="outlined" sx={{ bgcolor: 'success.light' }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography variant="body2" color="success.dark">账户余额</Typography>
                              <Typography variant="h5" fontWeight="bold" color="success.dark">
                                {formatCurrency(advertiserDetail.walletBalance)}
                              </Typography>
                            </Box>
                            <AttachMoneyIcon sx={{ color: 'success.dark', opacity: 0.5 }} />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Card variant="outlined" sx={{ bgcolor: 'error.light' }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography variant="body2" color="error.dark">冻结金额</Typography>
                              <Typography variant="h5" fontWeight="bold" color="error.dark">
                                {formatCurrency(advertiserDetail.frozenBalance)}
                              </Typography>
                            </Box>
                            <BlockIcon sx={{ color: 'error.dark', opacity: 0.5 }} />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Card variant="outlined" sx={{ bgcolor: 'info.light' }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography variant="body2" color="info.dark">累计充值</Typography>
                              <Typography variant="h5" fontWeight="bold" color="info.dark">
                                {formatCurrency(advertiserDetail.totalRecharged)}
                              </Typography>
                            </Box>
                            <TrendingUpIcon sx={{ color: 'info.dark', opacity: 0.5 }} />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Card variant="outlined" sx={{ bgcolor: 'warning.light' }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography variant="body2" color="warning.dark">累计消费</Typography>
                              <Typography variant="h5" fontWeight="bold" color="warning.dark">
                                {formatCurrency(advertiserDetail.totalSpent)}
                              </Typography>
                            </Box>
                            <TrendingDownIcon sx={{ color: 'warning.dark', opacity: 0.5 }} />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Grid>

                {/* Activity Stats */}
                <Grid size={12}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    活动统计
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Card variant="outlined">
                        <CardContent sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" fontWeight="bold">
                            {advertiserDetail.statistics.totalCampaigns}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">总活动数</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Card variant="outlined">
                        <CardContent sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" fontWeight="bold" color="success.main">
                            {advertiserDetail.statistics.activeCampaigns}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">进行中活动</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Card variant="outlined">
                        <CardContent sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" fontWeight="bold">
                            {advertiserDetail.statistics.totalOrders}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">总订单数</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Card variant="outlined">
                        <CardContent sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" fontWeight="bold" color="success.main">
                            {advertiserDetail.statistics.completedOrders}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">完成订单数</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDetail}>关闭</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onClose={handleCloseReviewDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{reviewAction === 'approve' ? '审核通过' : '审核拒绝'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Stack spacing={3}>
              {selectedAdvertiser && (
                <Alert severity={reviewAction === 'approve' ? 'success' : 'warning'}>
                  正在审核：{selectedAdvertiser.companyName}
                </Alert>
              )}
              {reviewAction === 'reject' && (
                <FormControl fullWidth>
                  <InputLabel>拒绝原因</InputLabel>
                  <Select
                    value={reviewReason}
                    label="拒绝原因"
                    onChange={(e) => setReviewReason(e.target.value)}
                  >
                    <MenuItem value="营业执照不清晰">营业执照不清晰</MenuItem>
                    <MenuItem value="信息不一致">信息不一致</MenuItem>
                    <MenuItem value="资质不符">资质不符</MenuItem>
                    <MenuItem value="其他">其他</MenuItem>
                  </Select>
                </FormControl>
              )}
              <TextField
                fullWidth
                label="审核备注"
                multiline
                rows={3}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="填写审核备注信息（选填）"
              />
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseReviewDialog}>取消</Button>
          <Button
            variant={reviewAction === 'approve' ? 'contained' : 'outlined'}
            color={reviewAction === 'approve' ? 'success' : 'error'}
            onClick={handleReviewSubmit}
            disabled={verifyAdvertiserMutation.isPending}
          >
            {verifyAdvertiserMutation.isPending ? <CircularProgress size={24} /> : (reviewAction === 'approve' ? '通过审核' : '拒绝审核')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Balance Adjustment Dialog */}
      <Dialog open={balanceDialogOpen} onClose={handleCloseBalanceDialog} maxWidth="sm" fullWidth>
        <DialogTitle>余额调整</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Stack spacing={3}>
              {selectedAdvertiser && (
                <Alert severity="info">
                  广告主：{selectedAdvertiser.companyName}<br />
                  当前余额：{formatCurrency(selectedAdvertiser.walletBalance)}
                </Alert>
              )}
              <FormControl fullWidth>
                <InputLabel>调整类型</InputLabel>
                <Select
                  value={balanceType}
                  label="调整类型"
                  onChange={(e) => setBalanceType(e.target.value as any)}
                >
                  <MenuItem value="manual">手动调整</MenuItem>
                  <MenuItem value="refund">退款</MenuItem>
                  <MenuItem value="compensation">赔偿</MenuItem>
                  <MenuItem value="penalty">处罚</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="调整金额"
                type="number"
                value={balanceAmount}
                onChange={(e) => setBalanceAmount(e.target.value)}
                placeholder="正数增加，负数减少"
                InputProps={{
                  startAdornment: <InputAdornment position="start">¥</InputAdornment>,
                }}
              />
              {balanceAmount && (
                <Alert severity="info">
                  调整后余额：{formatCurrency((selectedAdvertiser?.walletBalance || 0) + parseFloat(balanceAmount))}
                </Alert>
              )}
              <TextField
                fullWidth
                label="调整原因"
                multiline
                rows={3}
                value={balanceReason}
                onChange={(e) => setBalanceReason(e.target.value)}
                placeholder="详细说明调整原因"
                required
              />
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Checkbox
                  checked={notifyAdvertiser}
                  onChange={(e) => setNotifyAdvertiser(e.target.checked)}
                />
                <Typography variant="body2">通知广告主</Typography>
              </Box>
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBalanceDialog}>取消</Button>
          <Button
            variant="contained"
            onClick={handleBalanceSubmit}
            disabled={adjustBalanceMutation.isPending || !balanceAmount || !balanceReason}
          >
            {adjustBalanceMutation.isPending ? <CircularProgress size={24} /> : '确认调整'}
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

export default AdvertisersPage;
