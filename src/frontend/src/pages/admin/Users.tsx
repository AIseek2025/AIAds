import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminUserAPI } from '../../services/adminApi';
import { getApiErrorMessage } from '../../utils/apiError';
import type { AdminUser, UserListParams } from '../../types';

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
import { AdminHubNav } from '../../components/admin/AdminHubNav';

// Icons
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';

const UserStatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { color: 'success' | 'warning' | 'error' | 'default'; label: string }> = {
    active: { color: 'success', label: '正常' },
    suspended: { color: 'warning', label: '冻结' },
    banned: { color: 'error', label: '封禁' },
  };

  const config = statusConfig[status] || { color: 'default', label: status };

  return (
    <Chip
      label={config.label}
      color={config.color}
      size="small"
      sx={{ fontWeight: 500 }}
    />
  );
};

const UserRoleBadge = ({ role }: { role: string }) => {
  const roleConfig: Record<string, { color: 'primary' | 'secondary' | 'info'; label: string }> = {
    advertiser: { color: 'primary', label: '广告主' },
    kol: { color: 'secondary', label: 'KOL' },
  };

  const config = roleConfig[role] || { color: 'primary', label: role };

  return (
    <Chip
      label={config.label}
      color={config.color}
      size="small"
      variant="outlined"
    />
  );
};

const UsersPage: React.FC = () => {
  const queryClient = useQueryClient();

  // State
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState<number | ''>('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Build query params
  const queryParams: UserListParams = {
    page: page + 1,
    page_size: pageSize,
    sort: 'created_at',
    order: 'desc',
  };

  if (keyword) queryParams.keyword = keyword;
  if (roleFilter) queryParams.role = roleFilter as 'advertiser' | 'kol';
  if (statusFilter) queryParams.status = statusFilter as 'active' | 'suspended' | 'banned';

  // Fetch users
  const { data, isLoading, error, refetch: refetchUsers } = useQuery({
    queryKey: ['adminUsers', queryParams],
    queryFn: () => adminUserAPI.getUsers(queryParams),
  });

  // Ban user mutation
  const banUserMutation = useMutation({
    mutationFn: (data: { id: string; reason: string; duration_days?: number | null }) =>
      adminUserAPI.banUser(data.id, { reason: data.reason, duration_days: data.duration_days }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      setSnackbar({ open: true, message: '用户已封禁', severity: 'success' });
      setBanDialogOpen(false);
      setBanReason('');
      setBanDuration('');
      setSelectedUser(null);
    },
    onError: (err: unknown) => {
      setSnackbar({
        open: true,
        message: getApiErrorMessage(err, '操作失败'),
        severity: 'error',
      });
    },
  });

  // Unban user mutation
  const unbanUserMutation = useMutation({
    mutationFn: (id: string) => adminUserAPI.unbanUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      setSnackbar({ open: true, message: '用户已解封', severity: 'success' });
      setSelectedUser(null);
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
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value);
    setPage(0);
  };

  const handleRoleFilterChange = (e: SelectChangeEvent<string>) => {
    setRoleFilter(e.target.value);
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

  const handleViewDetail = (user: AdminUser) => {
    setSelectedUser(user);
    setDetailOpen(true);
  };

  const handleBanClick = (user: AdminUser) => {
    setSelectedUser(user);
    setBanDialogOpen(true);
  };

  const handleUnbanClick = (user: AdminUser) => {
    if (confirm('确定要解封该用户吗？')) {
      unbanUserMutation.mutate(user.id);
    }
  };

  const handleBanSubmit = () => {
    if (!selectedUser || !banReason) return;
    banUserMutation.mutate({
      id: selectedUser.id,
      reason: banReason,
      duration_days: banDuration || null,
    });
  };

  const handleCloseDetail = () => {
    setDetailOpen(false);
    setSelectedUser(null);
  };

  const handleCloseBanDialog = () => {
    setBanDialogOpen(false);
    setBanReason('');
    setBanDuration('');
    setSelectedUser(null);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          用户管理
        </Typography>
        <Typography variant="body2" color="text.secondary">
          管理平台用户，包括封禁、解封等操作
        </Typography>
      </Box>
      <AdminHubNav onRefresh={() => void refetchUsers()} />
      <Alert severity="info" sx={{ mb: 3, mt: 2 }}>
        列表与筛选参数绑定；封禁等操作成功后列表会自动失效刷新，也可手动刷新拉取最新用户状态。
      </Alert>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 2 }}>
            {/* Search */}
            <TextField
              placeholder="搜索邮箱/手机/昵称"
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

            {/* Role Filter */}
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>角色</InputLabel>
              <Select
                value={roleFilter}
                label="角色"
                onChange={handleRoleFilterChange}
              >
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="advertiser">广告主</MenuItem>
                <MenuItem value="kol">KOL</MenuItem>
              </Select>
            </FormControl>

            {/* Status Filter */}
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>状态</InputLabel>
              <Select
                value={statusFilter}
                label="状态"
                onChange={handleStatusFilterChange}
              >
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="active">正常</MenuItem>
                <MenuItem value="suspended">冻结</MenuItem>
                <MenuItem value="banned">封禁</MenuItem>
              </Select>
            </FormControl>

            {/* Refresh Button */}
            <IconButton onClick={() => void refetchUsers()} aria-label="刷新用户列表">
              <RefreshIcon />
            </IconButton>
          </Stack>
        </CardContent>
      </Card>

      {/* User Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>用户</TableCell>
                <TableCell>角色</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>邮箱验证</TableCell>
                <TableCell>最后登录</TableCell>
                <TableCell>注册时间</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, index) => (
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
                data?.items.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar src={user.avatarUrl} sx={{ width: 36, height: 36, mr: 1.5 }}>
                          {user.nickname?.[0] || user.email[0].toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="500">
                            {user.nickname || '未设置昵称'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {user.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <UserRoleBadge role={user.role} />
                    </TableCell>
                    <TableCell>
                      <UserStatusBadge status={user.status} />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.emailVerified ? '已验证' : '未验证'}
                        color={user.emailVerified ? 'success' : 'default'}
                        size="small"
                        variant={user.emailVerified ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('zh-CN') : '从未'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="查看详情">
                        <IconButton size="small" onClick={() => handleViewDetail(user)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {user.status === 'banned' ? (
                        <Tooltip title="解封用户">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleUnbanClick(user)}
                            disabled={unbanUserMutation.isPending}
                          >
                            <CheckCircleIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="封禁用户">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleBanClick(user)}
                            disabled={banUserMutation.isPending}
                          >
                            <BlockIcon fontSize="small" />
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

        {/* Pagination */}
        <TablePagination
          component="div"
          count={data?.pagination.total || 0}
          page={page}
          onPageChange={handlePageChange}
          rowsPerPage={pageSize}
          onRowsPerPageChange={handlePageSizeChange}
          rowsPerPageOptions={[10, 20, 50, 100]}
          labelRowsPerPage="每页数量"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
        />
      </Card>

      {/* User Detail Dialog */}
      <Dialog open={detailOpen} onClose={handleCloseDetail} maxWidth="sm" fullWidth>
        {selectedUser && (
          <>
            <DialogTitle>用户详情</DialogTitle>
            <DialogContent>
              <Box sx={{ pt: 2 }}>
                <Stack spacing={3}>
                  {/* Basic Info */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar src={selectedUser.avatarUrl} sx={{ width: 64, height: 64, mr: 2 }}>
                      {selectedUser.nickname?.[0] || selectedUser.email[0].toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="h6">{selectedUser.nickname || '未设置昵称'}</Typography>
                      <Typography variant="body2" color="text.secondary">{selectedUser.email}</Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <UserRoleBadge role={selectedUser.role} />
                        <UserStatusBadge status={selectedUser.status} />
                      </Box>
                    </Box>
                  </Box>

                  {/* Info Grid */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">手机号</Typography>
                      <Typography variant="body2">{selectedUser.phone || '未绑定'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">邮箱验证</Typography>
                      <Typography variant="body2">{selectedUser.emailVerified ? '已验证' : '未验证'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">手机验证</Typography>
                      <Typography variant="body2">{selectedUser.phoneVerified ? '已验证' : '未验证'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">最后登录</Typography>
                      <Typography variant="body2">{selectedUser.lastLoginAt ? new Date(selectedUser.lastLoginAt).toLocaleString('zh-CN') : '从未'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">注册时间</Typography>
                      <Typography variant="body2">{new Date(selectedUser.createdAt).toLocaleString('zh-CN')}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">语言</Typography>
                        <Typography variant="body2">{selectedUser.language ?? 'zh-CN'}</Typography>
                    </Box>
                  </Box>

                  {/* Advertiser Profile */}
                  {selectedUser.advertiserProfile && (
                    <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        广告主信息
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                        <Typography variant="body2">公司：{selectedUser.advertiserProfile.companyName}</Typography>
                        <Typography variant="body2">余额：¥{selectedUser.advertiserProfile.walletBalance.toFixed(2)}</Typography>
                        <Typography variant="body2">总消费：¥{selectedUser.advertiserProfile.totalSpent.toFixed(2)}</Typography>
                        <Typography variant="body2">
                          验证状态：{selectedUser.advertiserProfile.verificationStatus === 'approved' ? '已认证' : '待审核'}
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {/* KOL Profile */}
                  {selectedUser.kolProfile && (
                    <Box sx={{ p: 2, bgcolor: 'secondary.light', borderRadius: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        KOL 信息
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                        <Typography variant="body2">平台：{selectedUser.kolProfile.platform}</Typography>
                        <Typography variant="body2">用户名：{selectedUser.kolProfile.platformUsername}</Typography>
                        <Typography variant="body2">粉丝数：{selectedUser.kolProfile.followers.toLocaleString()}</Typography>
                        <Typography variant="body2">互动率：{(selectedUser.kolProfile.engagementRate * 100).toFixed(2)}%</Typography>
                        <Typography variant="body2">完成订单：{selectedUser.kolProfile.completedOrders}</Typography>
                        <Typography variant="body2">
                          认证状态：{selectedUser.kolProfile.verified ? '已认证' : '未认证'}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </Stack>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDetail}>关闭</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Ban Dialog */}
      <Dialog open={banDialogOpen} onClose={handleCloseBanDialog} maxWidth="sm" fullWidth>
        <DialogTitle>封禁用户</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {selectedUser && (
              <Typography variant="body2" paragraph>
                正在封禁用户：<strong>{selectedUser.nickname || selectedUser.email}</strong>
              </Typography>
            )}
            <TextField
              fullWidth
              label="封禁原因"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              multiline
              rows={3}
              required
              sx={{ mb: 2 }}
              placeholder="请说明封禁原因"
            />
            <TextField
              fullWidth
              label="封禁天数（留空表示永久封禁）"
              type="number"
              value={banDuration}
              onChange={(e) => setBanDuration(e.target.value ? parseInt(e.target.value, 10) : '')}
              inputProps={{ min: 1 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBanDialog}>取消</Button>
          <Button
            onClick={handleBanSubmit}
            variant="contained"
            color="error"
            disabled={!banReason || banUserMutation.isPending}
          >
            {banUserMutation.isPending ? <CircularProgress size={24} /> : '确认封禁'}
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

export default UsersPage;
