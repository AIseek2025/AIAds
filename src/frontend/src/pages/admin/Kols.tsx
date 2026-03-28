import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminKolAPI } from '../../services/adminApi';
import { getApiErrorMessage } from '../../utils/apiError';
import type { KolApplication, KolListParams } from '../../types';

type KolStatusFilter = NonNullable<KolListParams['status']>;

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
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import { AdminHubNav } from '../../components/admin/AdminHubNav';

// Icons
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import RefreshIcon from '@mui/icons-material/Refresh';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';

const KolsPlatformBadge = ({ platform }: { platform: string }) => {
  const platformConfig: Record<string, { color: string; label: string }> = {
    tiktok: { color: '#FF0050', label: 'TikTok' },
    youtube: { color: '#FF0000', label: 'YouTube' },
    instagram: { color: '#E4405F', label: 'Instagram' },
  };

  const config = platformConfig[platform] || { color: '#999', label: platform };

  return (
    <Chip
      label={config.label}
      size="small"
      sx={{
        bgcolor: `${config.color}15`,
        color: config.color,
        fontWeight: 500,
      }}
    />
  );
};

const KolsStatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { color: 'success' | 'warning' | 'error' | 'default'; label: string }> = {
    pending: { color: 'warning', label: '待审核' },
    active: { color: 'success', label: '已激活' },
    verified: { color: 'success', label: '已认证' },
    suspended: { color: 'error', label: '已暂停' },
    banned: { color: 'error', label: '黑名单' },
    rejected: { color: 'default', label: '已拒绝' },
  };

  const config = statusConfig[status] || { color: 'default' as const, label: status };

  return (
    <Chip
      label={config.label}
      color={config.color}
      size="small"
      sx={{ fontWeight: 500 }}
    />
  );
};

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
      id={`kol-tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

const formatCny = (n: number) =>
  new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(n);

const KolsPage: React.FC = () => {
  const queryClient = useQueryClient();

  // State
  const [tabValue, setTabValue] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedKol, setSelectedKol] = useState<KolApplication | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewReason, setReviewReason] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Build query params
  const queryParams: KolListParams = {
    page: page + 1,
    page_size: pageSize,
    sort: 'created_at',
    order: 'desc',
  };

  if (keyword) queryParams.keyword = keyword;
  if (platformFilter) queryParams.platform = platformFilter;
  if (statusFilter) queryParams.status = statusFilter as KolStatusFilter;

  // Fetch KOLs based on tab
  const { data, isLoading, error, refetch: refetchKols } = useQuery({
    queryKey: ['adminKols', queryParams, tabValue],
    queryFn: () => {
      if (tabValue === 0) {
        // Pending tab
        return adminKolAPI.getPendingKols({ page: queryParams.page, page_size: queryParams.page_size });
      } else {
        // All KOLs tab
        return adminKolAPI.getKols(queryParams);
      }
    },
  });

  // Approve KOL mutation
  const approveKolMutation = useMutation({
    mutationFn: (data: { id: string; note?: string }) =>
      adminKolAPI.approveKol(data.id, { note: data.note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminKols'] });
      setSnackbar({ open: true, message: 'KOL 审核通过', severity: 'success' });
      setReviewDialogOpen(false);
      setReviewNote('');
      setSelectedKol(null);
    },
    onError: (err: unknown) => {
      setSnackbar({
        open: true,
        message: getApiErrorMessage(err, '操作失败'),
        severity: 'error',
      });
    },
  });

  // Reject KOL mutation
  const rejectKolMutation = useMutation({
    mutationFn: (data: { id: string; reason: string; note?: string }) =>
      adminKolAPI.rejectKol(data.id, { reason: data.reason, note: data.note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminKols'] });
      setSnackbar({ open: true, message: 'KOL 审核拒绝', severity: 'success' });
      setReviewDialogOpen(false);
      setReviewReason('');
      setReviewNote('');
      setSelectedKol(null);
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
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setPage(0);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value);
    setPage(0);
  };

  const handlePlatformFilterChange = (e: SelectChangeEvent<string>) => {
    setPlatformFilter(e.target.value);
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

  const handleViewDetail = (kol: KolApplication) => {
    setSelectedKol(kol);
    setDetailOpen(true);
  };

  const handleApproveClick = (kol: KolApplication) => {
    setSelectedKol(kol);
    setReviewAction('approve');
    setReviewDialogOpen(true);
  };

  const handleRejectClick = (kol: KolApplication) => {
    setSelectedKol(kol);
    setReviewAction('reject');
    setReviewDialogOpen(true);
  };

  const handleReviewSubmit = () => {
    if (!selectedKol) return;
    if (reviewAction === 'approve') {
      approveKolMutation.mutate({ id: selectedKol.id, note: reviewNote });
    } else {
      if (!reviewReason) {
        setSnackbar({ open: true, message: '请填写拒绝原因', severity: 'error' });
        return;
      }
      rejectKolMutation.mutate({ id: selectedKol.id, reason: reviewReason, note: reviewNote });
    }
  };

  const handleCloseDetail = () => {
    setDetailOpen(false);
    setSelectedKol(null);
  };

  const handleCloseReviewDialog = () => {
    setReviewDialogOpen(false);
    setReviewReason('');
    setReviewNote('');
    setSelectedKol(null);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const commonFilters = (
    <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 2 }}>
      <TextField
        placeholder="搜索 KOL 名称/平台账号"
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
      {tabValue === 1 && (
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>状态</InputLabel>
          <Select
            value={statusFilter}
            label="状态"
            onChange={handleStatusFilterChange}
          >
            <MenuItem value="">全部</MenuItem>
            <MenuItem value="active">已激活</MenuItem>
            <MenuItem value="verified">已认证</MenuItem>
            <MenuItem value="suspended">已暂停</MenuItem>
            <MenuItem value="banned">黑名单</MenuItem>
          </Select>
        </FormControl>
      )}
      <IconButton onClick={() => void refetchKols()} aria-label="刷新列表">
        <RefreshIcon />
      </IconButton>
    </Stack>
  );

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          KOL 管理
        </Typography>
        <Typography variant="body2" color="text.secondary">
          管理 KOL 认证申请和信息
        </Typography>
      </Box>
      <AdminHubNav onRefresh={() => void refetchKols()} />
      <Alert severity="info" sx={{ mb: 3, mt: 2 }}>
        「待审核」与「KOL 列表」分表展示；与「KOL 审核」专页互为补充。刷新将按当前标签与筛选重拉数据。
      </Alert>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label={`待审核 (${data?.pagination.total || 0})`} />
          <Tab label="KOL 列表" />
        </Tabs>
      </Paper>

      {/* Tab Panel 0 - Pending Reviews */}
      <TabPanel value={tabValue} index={0}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            {commonFilters}
          </CardContent>
        </Card>

        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>KOL</TableCell>
                  <TableCell>平台</TableCell>
                  <TableCell>账号</TableCell>
                  <TableCell align="right">粉丝数</TableCell>
                  <TableCell align="right">互动率</TableCell>
                  <TableCell align="right">订单冻结</TableCell>
                  <TableCell>分类</TableCell>
                  <TableCell>提交时间</TableCell>
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
                      <Alert severity="error">
                      加载失败：{getApiErrorMessage(error, '请稍后重试')}
                    </Alert>
                    </TableCell>
                  </TableRow>
                ) : data?.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <Typography color="text.secondary" py={4}>暂无待审核申请</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.items.map((kol) => (
                    <TableRow key={kol.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar src={kol.user?.avatarUrl} sx={{ width: 36, height: 36, mr: 1.5 }}>
                            {kol.user?.nickname?.[0] || 'K'}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="500">
                              {kol.user?.nickname || '未设置'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {kol.user?.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <KolsPlatformBadge platform={kol.platform} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{kol.platformUsername}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">{kol.followers?.toLocaleString() || 0}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {kol.engagementRate ? `${(kol.engagementRate * 100).toFixed(2)}%` : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          color={(kol.ordersFrozenTotal ?? 0) > 0 ? 'info.main' : 'text.secondary'}
                        >
                          {formatCny(kol.ordersFrozenTotal ?? 0)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {kol.category || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {kol.submittedAt ? new Date(kol.submittedAt).toLocaleString('zh-CN') : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="查看详情">
                          <IconButton size="small" onClick={() => handleViewDetail(kol)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="通过审核">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleApproveClick(kol)}
                            disabled={approveKolMutation.isPending}
                          >
                            <CheckCircleIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="拒绝审核">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRejectClick(kol)}
                            disabled={rejectKolMutation.isPending}
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

      {/* Tab Panel 1 - All KOLs */}
      <TabPanel value={tabValue} index={1}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            {commonFilters}
          </CardContent>
        </Card>

        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>KOL</TableCell>
                  <TableCell>平台</TableCell>
                  <TableCell>账号</TableCell>
                  <TableCell align="right">粉丝数</TableCell>
                  <TableCell align="right">互动率</TableCell>
                  <TableCell align="right">订单冻结</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>认证</TableCell>
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
                      <Alert severity="error">
                      加载失败：{getApiErrorMessage(error, '请稍后重试')}
                    </Alert>
                    </TableCell>
                  </TableRow>
                ) : data?.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <Typography color="text.secondary" py={4}>暂无数据</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.items.map((kol) => (
                    <TableRow key={kol.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar src={kol.user?.avatarUrl} sx={{ width: 36, height: 36, mr: 1.5 }}>
                            {kol.user?.nickname?.[0] || 'K'}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="500">
                              {kol.user?.nickname || '未设置'}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <KolsPlatformBadge platform={kol.platform} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{kol.platformUsername}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">{kol.followers?.toLocaleString() || 0}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {kol.engagementRate ? `${(kol.engagementRate * 100).toFixed(2)}%` : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          color={(kol.ordersFrozenTotal ?? 0) > 0 ? 'info.main' : 'text.secondary'}
                        >
                          {formatCny(kol.ordersFrozenTotal ?? 0)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <KolsStatusBadge status={kol.status} />
                      </TableCell>
                      <TableCell>
                        {kol.verified ? (
                          <Chip
                            icon={<VerifiedUserIcon />}
                            label="已认证"
                            color="success"
                            size="small"
                          />
                        ) : (
                          <Chip label="未认证" size="small" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="查看详情">
                          <IconButton size="small" onClick={() => handleViewDetail(kol)}>
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

      {/* KOL Detail Dialog */}
      <Dialog open={detailOpen} onClose={handleCloseDetail} maxWidth="md" fullWidth>
        {selectedKol && (
          <>
            <DialogTitle>KOL 详情</DialogTitle>
            <DialogContent>
              <Box sx={{ pt: 2 }}>
                <Grid container spacing={3}>
                  {/* Basic Info */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar src={selectedKol.user?.avatarUrl} sx={{ width: 64, height: 64, mr: 2 }}>
                        {selectedKol.user?.nickname?.[0] || 'K'}
                      </Avatar>
                      <Box>
                        <Typography variant="h6">{selectedKol.user?.nickname || '未设置'}</Typography>
                        <Typography variant="body2" color="text.secondary">{selectedKol.user?.email}</Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                          <KolsPlatformBadge platform={selectedKol.platform} />
                          <KolsStatusBadge status={selectedKol.status} />
                        </Box>
                      </Box>
                    </Box>

                    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        资金与订单冻结
                      </Typography>
                      <Stack spacing={1} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">
                            累计收益
                          </Typography>
                          <Typography variant="body2">
                            {selectedKol.totalEarnings != null ? formatCny(selectedKol.totalEarnings) : '—'}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">
                            可用余额
                          </Typography>
                          <Typography variant="body2">
                            {selectedKol.availableBalance != null ? formatCny(selectedKol.availableBalance) : '—'}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">
                            订单冻结合计
                          </Typography>
                          <Typography variant="body2" color="info.main" fontWeight={600}>
                            {selectedKol.ordersFrozenTotal != null ? formatCny(selectedKol.ordersFrozenTotal) : '—'}
                          </Typography>
                        </Box>
                      </Stack>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        基本信息
                      </Typography>
                      <Stack spacing={1}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">平台账号</Typography>
                          <Typography variant="body2">{selectedKol.platformUsername}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">显示名称</Typography>
                          <Typography variant="body2">{selectedKol.platformDisplayName || '-'}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">分类</Typography>
                          <Typography variant="body2">{selectedKol.category || '-'}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">国家/地区</Typography>
                          <Typography variant="body2">{selectedKol.country || '-'}</Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  </Grid>

                  {/* Stats */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        数据统计
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid size={6}>
                          <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'primary.light', borderRadius: 1 }}>
                            <Typography variant="h6" fontWeight="bold">{selectedKol.followers?.toLocaleString() || 0}</Typography>
                            <Typography variant="caption" color="text.secondary">粉丝数</Typography>
                          </Box>
                        </Grid>
                        <Grid size={6}>
                          <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'secondary.light', borderRadius: 1 }}>
                            <Typography variant="h6" fontWeight="bold">
                              {selectedKol.engagementRate ? `${(selectedKol.engagementRate * 100).toFixed(2)}%` : '-'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">互动率</Typography>
                          </Box>
                        </Grid>
                        <Grid size={6}>
                          <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'success.light', borderRadius: 1 }}>
                            <Typography variant="h6" fontWeight="bold">{selectedKol.avgViews?.toLocaleString() || 0}</Typography>
                            <Typography variant="caption" color="text.secondary">平均播放</Typography>
                          </Box>
                        </Grid>
                        <Grid size={6}>
                          <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'warning.light', borderRadius: 1 }}>
                            <Typography variant="h6" fontWeight="bold">{selectedKol.totalOrders || 0}</Typography>
                            <Typography variant="caption" color="text.secondary">完成订单</Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDetail}>关闭</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onClose={handleCloseReviewDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{reviewAction === 'approve' ? '通过审核' : '拒绝审核'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {selectedKol && (
              <Typography variant="body2" paragraph>
                正在{reviewAction === 'approve' ? '审核通过' : '拒绝'} KOL：<strong>{selectedKol.user?.nickname || selectedKol.platformUsername}</strong>
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
            {reviewAction === 'approve' ? '确认通过' : '确认拒绝'}
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

export default KolsPage;
