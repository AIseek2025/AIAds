import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminKolAPI } from '../../services/adminApi';
import { getApiErrorMessage } from '../../utils/apiError';
import type { KolApplication } from '../../types';

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
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
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
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import { AdminHubNav } from '../../components/admin/AdminHubNav';

// Icons
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';

const KolPlatformBadge = ({ platform }: { platform: string }) => {
  const platformConfig: Record<string, { color: 'error' | 'primary' | 'secondary' | 'success'; label: string }> = {
    tiktok: { color: 'error', label: 'TikTok' },
    youtube: { color: 'primary', label: 'YouTube' },
    instagram: { color: 'secondary', label: 'Instagram' },
    xiaohongshu: { color: 'success', label: '小红书' },
    weibo: { color: 'primary', label: '微博' },
  };

  const config = platformConfig[platform] || { color: 'primary' as const, label: platform };

  return (
    <Chip
      label={config.label}
      color={config.color}
      size="small"
      variant="outlined"
    />
  );
};

const KolReviewStatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { color: 'warning' | 'success' | 'error' | 'default'; label: string }> = {
    pending: { color: 'warning', label: '待审核' },
    active: { color: 'success', label: '已通过' },
    verified: { color: 'success', label: '已认证' },
    rejected: { color: 'error', label: '已拒绝' },
    suspended: { color: 'error', label: '已暂停' },
    banned: { color: 'error', label: '已封禁' },
  };

  const config = statusConfig[status] || { color: 'default' as const, label: status };

  return <Chip label={config.label} color={config.color} size="small" />;
};

const KolReviewPage: React.FC = () => {
  const queryClient = useQueryClient();

  // State
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [selectedKol, setSelectedKol] = useState<KolApplication | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [approveNote, setApproveNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNote, setRejectNote] = useState('');
  const [detailTab, setDetailTab] = useState(0);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Fetch pending KOLs
  const { data, isLoading, error, refetch: refetchPending } = useQuery({
    queryKey: ['adminPendingKols', page, pageSize],
    queryFn: () => adminKolAPI.getPendingKols({ page: page + 1, page_size: pageSize }),
  });

  // Approve KOL mutation
  const approveKolMutation = useMutation({
    mutationFn: (data: { id: string; note?: string; set_verified?: boolean }) =>
      adminKolAPI.approveKol(data.id, { note: data.note, set_verified: data.set_verified }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPendingKols'] });
      setSnackbar({ open: true, message: 'KOL 审核已通过', severity: 'success' });
      setApproveDialogOpen(false);
      setApproveNote('');
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
      queryClient.invalidateQueries({ queryKey: ['adminPendingKols'] });
      setSnackbar({ open: true, message: 'KOL 审核已拒绝', severity: 'success' });
      setRejectDialogOpen(false);
      setRejectReason('');
      setRejectNote('');
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

  // Fetch KOL detail when dialog opens
  const { data: kolDetail, refetch: refetchKolDetail } = useQuery({
    queryKey: ['adminKolDetail', selectedKol?.id],
    queryFn: () => adminKolAPI.getKol(selectedKol!.id),
    enabled: detailOpen && !!selectedKol?.id,
  });

  const handleHubRefresh = () => {
    void refetchPending();
    void refetchKolDetail();
  };

  // Handlers
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
    setDetailTab(0);
  };

  const handleApproveClick = (kol: KolApplication) => {
    setSelectedKol(kol);
    setApproveDialogOpen(true);
  };

  const handleRejectClick = (kol: KolApplication) => {
    setSelectedKol(kol);
    setRejectDialogOpen(true);
  };

  const handleApproveSubmit = () => {
    if (!selectedKol) return;
    approveKolMutation.mutate({
      id: selectedKol.id,
      note: approveNote || undefined,
      set_verified: true,
    });
  };

  const handleRejectSubmit = () => {
    if (!selectedKol || !rejectReason) return;
    rejectKolMutation.mutate({
      id: selectedKol.id,
      reason: rejectReason,
      note: rejectNote || undefined,
    });
  };

  const handleCloseDetail = () => {
    setDetailOpen(false);
    setSelectedKol(null);
  };

  const handleCloseApproveDialog = () => {
    setApproveDialogOpen(false);
    setApproveNote('');
    setSelectedKol(null);
  };

  const handleCloseRejectDialog = () => {
    setRejectDialogOpen(false);
    setRejectReason('');
    setRejectNote('');
    setSelectedKol(null);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setDetailTab(newValue);
  };

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          KOL 审核
        </Typography>
        <Typography variant="body2" color="text.secondary">
          审核 KOL 认证申请，确保平台 KOL 质量
        </Typography>
      </Box>
      <AdminHubNav onRefresh={handleHubRefresh} />
      <Alert severity="info" sx={{ mb: 3, mt: 2 }}>
        与「KOL 库」列表互为补充；通过/拒绝后待审列表会失效刷新，也可手动刷新待审队列与已打开的详情。
      </Alert>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                待审核
              </Typography>
              <Typography variant="h3">{data?.pagination.total || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                今日通过
              </Typography>
              <Typography variant="h3">0</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                今日拒绝
              </Typography>
              <Typography variant="h3">0</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                通过率
              </Typography>
              <Typography variant="h3">0%</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* KOL Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>KOL</TableCell>
                <TableCell>平台</TableCell>
                <TableCell>粉丝数</TableCell>
                <TableCell>互动率</TableCell>
                <TableCell>分类</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>申请时间</TableCell>
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
                    <TableCell><CircularProgress size={20} /></TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Alert severity="error">
                    加载失败：{getApiErrorMessage(error, '请稍后重试')}
                  </Alert>
                  </TableCell>
                </TableRow>
              ) : data?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography color="text.secondary" py={4}>暂无待审核的 KOL 申请</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                data?.items.map((kol) => (
                  <TableRow key={kol.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar src={kol.platformAvatarUrl} sx={{ width: 40, height: 40, mr: 1.5 }}>
                          {kol.platformDisplayName[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="500">
                            {kol.platformDisplayName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {kol.platformUsername}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <KolPlatformBadge platform={kol.platform} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{kol.followers.toLocaleString()}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color={(kol.engagementRate || 0) >= 0.03 ? 'success.main' : 'warning.main'}>
                        {((kol.engagementRate || 0) * 100).toFixed(2)}%
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{kol.category}</Typography>
                    </TableCell>
                    <TableCell>
                      <KolReviewStatusBadge status={kol.status} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(kol.submittedAt).toLocaleString('zh-CN')}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="查看详情">
                        <IconButton size="small" onClick={() => handleViewDetail(kol)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="通过">
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handleApproveClick(kol)}
                          disabled={approveKolMutation.isPending}
                        >
                          <CheckCircleIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="拒绝">
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

      {/* KOL Detail Dialog */}
      <Dialog open={detailOpen} onClose={handleCloseDetail} maxWidth="lg" fullWidth>
        {selectedKol && kolDetail && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar src={kolDetail.platformAvatarUrl} sx={{ width: 48, height: 48, mr: 2 }}>
                    {kolDetail.platformDisplayName[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{kolDetail.platformDisplayName}</Typography>
                    <Typography variant="body2" color="text.secondary">{kolDetail.platformUsername}</Typography>
                  </Box>
                </Box>
                <KolPlatformBadge platform={kolDetail.platform} />
              </Box>
            </DialogTitle>

            <DialogContent sx={{ mt: 2 }}>
              <Tabs value={detailTab} onChange={handleTabChange} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Tab label="基本信息" />
                <Tab label="数据统计" />
                <Tab label="审核历史" />
              </Tabs>

              {detailTab === 0 && (
                <Grid container spacing={3}>
                  {/* Basic Info */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        基本信息
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Stack spacing={2}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">平台 ID</Typography>
                          <Typography variant="body2">{kolDetail.platformId}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">分类</Typography>
                          <Typography variant="body2">{kolDetail.category} {kolDetail.subcategory && `/ ${kolDetail.subcategory}`}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">国家/地区</Typography>
                          <Typography variant="body2">{kolDetail.country}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">简介</Typography>
                          <Typography variant="body2">{kolDetail.bio || '无'}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">标签</Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                            {kolDetail.tags.map((tag, index) => (
                              <Chip key={index} label={tag} size="small" variant="outlined" />
                            ))}
                          </Box>
                        </Box>
                      </Stack>
                    </Paper>
                  </Grid>

                  {/* Stats Overview */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        数据概览
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 6 }}>
                          <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', borderRadius: 2 }}>
                            <TrendingUpIcon sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
                            <Typography variant="h5" fontWeight="bold">{kolDetail.followers.toLocaleString()}</Typography>
                            <Typography variant="caption" color="text.secondary">粉丝数</Typography>
                          </Box>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
                            <Typography variant="h5" fontWeight="bold">{((kolDetail.engagementRate || 0) * 100).toFixed(2)}%</Typography>
                            <Typography variant="caption" color="text.secondary">互动率</Typography>
                          </Box>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.light', borderRadius: 2 }}>
                            <VideoLibraryIcon sx={{ fontSize: 32, color: 'warning.main', mb: 1 }} />
                            <Typography variant="h5" fontWeight="bold">{kolDetail.totalVideos}</Typography>
                            <Typography variant="caption" color="text.secondary">视频数</Typography>
                          </Box>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
                            <AttachMoneyIcon sx={{ fontSize: 32, color: 'info.main', mb: 1 }} />
                            <Typography variant="h5" fontWeight="bold">${kolDetail.basePrice}</Typography>
                            <Typography variant="caption" color="text.secondary">基础报价</Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Paper>
                  </Grid>

                  {/* Detailed Stats */}
                  <Grid size={{ xs: 12 }}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        详细数据
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Grid container spacing={3}>
                        <Grid size={{ xs: 6, md: 3 }}>
                          <Typography variant="caption" color="text.secondary">关注数</Typography>
                          <Typography variant="body2" fontWeight="bold">{kolDetail.following.toLocaleString()}</Typography>
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                          <Typography variant="caption" color="text.secondary">平均播放量</Typography>
                          <Typography variant="body2" fontWeight="bold">{kolDetail.avgViews.toLocaleString()}</Typography>
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                          <Typography variant="caption" color="text.secondary">平均点赞</Typography>
                          <Typography variant="body2" fontWeight="bold">{kolDetail.avgLikes.toLocaleString()}</Typography>
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                          <Typography variant="caption" color="text.secondary">平均评论</Typography>
                          <Typography variant="body2" fontWeight="bold">{kolDetail.avgComments.toLocaleString()}</Typography>
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                          <Typography variant="caption" color="text.secondary">总订单数</Typography>
                          <Typography variant="body2" fontWeight="bold">{kolDetail.totalOrders}</Typography>
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                          <Typography variant="caption" color="text.secondary">完成订单</Typography>
                          <Typography variant="body2" fontWeight="bold">{kolDetail.completedOrders}</Typography>
                        </Grid>
                      </Grid>
                    </Paper>
                  </Grid>
                </Grid>
              )}

              {detailTab === 1 && (
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    粉丝增长趋势
                  </Typography>
                  {kolDetail.statsHistory && kolDetail.statsHistory.length > 0 ? (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>日期</TableCell>
                            <TableCell align="right">粉丝数</TableCell>
                            <TableCell align="right">互动率</TableCell>
                            <TableCell align="right">增长</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {kolDetail.statsHistory.slice().reverse().map((stat, index) => {
                            const prevStat = kolDetail.statsHistory[kolDetail.statsHistory.length - index - 2];
                            const growth = prevStat ? ((stat.followers - prevStat.followers) / prevStat.followers * 100) : 0;
                            return (
                              <TableRow key={stat.date}>
                                <TableCell>{new Date(stat.date).toLocaleDateString('zh-CN')}</TableCell>
                                <TableCell align="right">{stat.followers.toLocaleString()}</TableCell>
                                <TableCell align="right">{(stat.engagementRate * 100).toFixed(2)}%</TableCell>
                                <TableCell align="right">
                                  <Typography color={growth >= 0 ? 'success.main' : 'error.main'}>
                                    {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Typography color="text.secondary" py={4}>暂无历史数据</Typography>
                  )}
                </Paper>
              )}

              {detailTab === 2 && (
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    审核历史
                  </Typography>
                  <Typography color="text.secondary" py={4}>暂无审核历史记录</Typography>
                </Paper>
              )}
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
              <Button onClick={handleCloseDetail}>关闭</Button>
              <Button
                onClick={() => { setDetailOpen(false); handleApproveClick(selectedKol); }}
                variant="contained"
                color="success"
                disabled={approveKolMutation.isPending}
              >
                通过审核
              </Button>
              <Button
                onClick={() => { setDetailOpen(false); handleRejectClick(selectedKol); }}
                variant="outlined"
                color="error"
                disabled={rejectKolMutation.isPending}
              >
                拒绝审核
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onClose={handleCloseApproveDialog} maxWidth="sm" fullWidth>
        <DialogTitle>通过 KOL 审核</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {selectedKol && (
              <Typography variant="body2" paragraph>
                确认通过 <strong>{selectedKol.platformDisplayName}</strong> 的 KOL 认证申请？
              </Typography>
            )}
            <TextField
              fullWidth
              label="审核备注（可选）"
              value={approveNote}
              onChange={(e) => setApproveNote(e.target.value)}
              multiline
              rows={3}
              placeholder="添加备注信息"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseApproveDialog}>取消</Button>
          <Button
            onClick={handleApproveSubmit}
            variant="contained"
            color="success"
            disabled={approveKolMutation.isPending}
          >
            {approveKolMutation.isPending ? <CircularProgress size={24} /> : '确认通过'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onClose={handleCloseRejectDialog} maxWidth="sm" fullWidth>
        <DialogTitle>拒绝 KOL 审核</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {selectedKol && (
              <Typography variant="body2" paragraph>
                拒绝 <strong>{selectedKol.platformDisplayName}</strong> 的 KOL 认证申请
              </Typography>
            )}
            <TextField
              fullWidth
              label="拒绝原因 *"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              multiline
              rows={2}
              required
              placeholder="请说明拒绝原因，如：粉丝数据造假、资料不实等"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="内部备注（可选）"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              multiline
              rows={2}
              placeholder="仅内部可见的备注信息"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRejectDialog}>取消</Button>
          <Button
            onClick={handleRejectSubmit}
            variant="outlined"
            color="error"
            disabled={!rejectReason || rejectKolMutation.isPending}
          >
            {rejectKolMutation.isPending ? <CircularProgress size={24} /> : '确认拒绝'}
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

export default KolReviewPage;
