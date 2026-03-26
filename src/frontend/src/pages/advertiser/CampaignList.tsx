import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import Grid from '@mui/material/Grid';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import LinearProgress from '@mui/material/LinearProgress';
import Tooltip from '@mui/material/Tooltip';
import { styled } from '@mui/material/styles';

// Icons
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FilterListIcon from '@mui/icons-material/FilterList';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';

// Types
import type { Campaign } from '../../types';

// Services
import { campaignAPI } from '../../services/advertiserApi';

// Styled Components
const ActionButton = styled(IconButton)(({ theme }) => ({
  marginRight: theme.spacing(1),
  '&:last-child': {
    marginRight: 0,
  },
}));

const StatusChip = styled(Chip)(({ status }: { status: Campaign['status'] }) => {
  const statusStyles = {
    draft: {
      bgcolor: 'grey.200',
      color: 'grey.700',
    },
    active: {
      bgcolor: 'success.light',
      color: 'success.dark',
    },
    paused: {
      bgcolor: 'warning.light',
      color: 'warning.dark',
    },
    completed: {
      bgcolor: 'info.light',
      color: 'info.dark',
    },
    cancelled: {
      bgcolor: 'error.light',
      color: 'error.dark',
    },
  };

  return {
    fontWeight: 600,
    ...statusStyles[status],
  };
});

// Query keys
const queryKeys = {
  campaigns: 'campaigns',
};

export const CampaignListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // State
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<Campaign['status'] | ''>('');
  const [objectiveFilter, setObjectiveFilter] = useState<Campaign['objective'] | ''>('');
  const [keyword, setKeyword] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    severity: 'success' | 'error';
    message: string;
  }>({ open: false, severity: 'success', message: '' });

  // Fetch campaigns
  const {
    data: campaignsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      queryKeys.campaigns,
      page + 1,
      pageSize,
      statusFilter,
      objectiveFilter,
      keyword,
    ],
    queryFn: () =>
      campaignAPI.getCampaigns({
        page: page + 1,
        page_size: pageSize,
        status: statusFilter || undefined,
        keyword: keyword || undefined,
      }),
    retry: 1,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: campaignAPI.deleteCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeys.campaigns] });
      setSnackbar({
        open: true,
        severity: 'success',
        message: '活动删除成功',
      });
      setDeleteDialogOpen(false);
      setCampaignToDelete(null);
    },
    onError: () => {
      setSnackbar({
        open: true,
        severity: 'error',
        message: '删除失败，请稍后重试',
      });
    },
  });

  // Handle search with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setKeyword(value);

    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      setPage(0);
    }, 500);

    setSearchTimeout(timeout);
  };

  // Handle delete
  const handleDeleteClick = (id: string) => {
    setCampaignToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (campaignToDelete) {
      deleteMutation.mutate(campaignToDelete);
    }
  };

  // Handle status change
  const handleStatusChange = (status: Campaign['status'] | '') => {
    setStatusFilter(status);
    setPage(0);
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(value);
  };

  // Get status label
  const getStatusLabel = (status: Campaign['status']) => {
    const labels = {
      draft: '草稿',
      active: '进行中',
      paused: '已暂停',
      completed: '已完成',
      cancelled: '已取消',
    };
    return labels[status] || status;
  };

  // Get objective label
  const getObjectiveLabel = (objective: Campaign['objective']) => {
    const labels = {
      awareness: '品牌曝光',
      consideration: '用户互动',
      conversion: '转化购买',
    };
    return labels[objective] || objective;
  };

  // Handle pagination
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setPageSize(parseInt(event.target.value, 10));
    setPage(0);
  };

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
            活动管理
          </Typography>
          <Typography variant="body1" color="text.secondary">
            创建、管理和监控您的广告投放活动
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="large"
          startIcon={<AddIcon />}
          onClick={() => navigate('/advertiser/campaigns/create')}
        >
          创建活动
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                placeholder="搜索活动名称..."
                value={keyword}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
                size="small"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>状态</InputLabel>
                <Select
                  value={statusFilter}
                  label="状态"
                  onChange={(e) =>
                    handleStatusChange(e.target.value as Campaign['status'] | '')
                  }
                >
                  <MenuItem value="">全部</MenuItem>
                  <MenuItem value="draft">草稿</MenuItem>
                  <MenuItem value="active">进行中</MenuItem>
                  <MenuItem value="paused">已暂停</MenuItem>
                  <MenuItem value="completed">已完成</MenuItem>
                  <MenuItem value="cancelled">已取消</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>目标</InputLabel>
                <Select
                  value={objectiveFilter}
                  label="目标"
                  onChange={(e) =>
                    setObjectiveFilter(
                      e.target.value as Campaign['objective'] | ''
                    )
                  }
                >
                  <MenuItem value="">全部</MenuItem>
                  <MenuItem value="awareness">品牌曝光</MenuItem>
                  <MenuItem value="consideration">用户互动</MenuItem>
                  <MenuItem value="conversion">转化购买</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterListIcon />}
                onClick={() => {
                  setStatusFilter('');
                  setObjectiveFilter('');
                  setKeyword('');
                  setPage(0);
                }}
              >
                重置
              </Button>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }} sx={{ textAlign: 'right' }}>
              <IconButton onClick={() => refetch()} color="primary">
                <RefreshIcon />
              </IconButton>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Campaigns Table */}
      <Card>
        {isLoading && <LinearProgress />}
        
        {error ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              加载活动列表失败，请稍后重试
            </Alert>
            <Button variant="contained" onClick={() => refetch()}>
              重新加载
            </Button>
          </Box>
        ) : campaignsData?.items && campaignsData.items.length > 0 ? (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>活动名称</TableCell>
                    <TableCell>状态</TableCell>
                    <TableCell>目标</TableCell>
                    <TableCell align="right">预算</TableCell>
                    <TableCell align="right">已花费</TableCell>
                    <TableCell>开始日期</TableCell>
                    <TableCell>结束日期</TableCell>
                    <TableCell align="center">KOL 数</TableCell>
                    <TableCell align="right">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {campaignsData.items.map((campaign: Campaign) => (
                    <TableRow
                      key={campaign.id}
                      hover
                      sx={{
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        },
                      }}
                      onClick={() =>
                        navigate(`/advertiser/campaigns/${campaign.id}`)
                      }
                    >
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {campaign.title}
                        </Typography>
                        {campaign.description && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block', mt: 0.5 }}
                          >
                            {campaign.description.substring(0, 50)}
                            {campaign.description.length > 50 ? '...' : ''}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusChip
                          label={getStatusLabel(campaign.status)}
                          status={campaign.status}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {getObjectiveLabel(campaign.objective)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold">
                          {formatCurrency(campaign.budget)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="text.secondary">
                          {formatCurrency(campaign.spentAmount || 0)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(campaign.startDate).toLocaleDateString('zh-CN')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(campaign.endDate).toLocaleDateString('zh-CN')}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={campaign.totalKols || 0}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="查看">
                          <ActionButton
                            size="small"
                            onClick={() =>
                              navigate(`/advertiser/campaigns/${campaign.id}`)
                            }
                          >
                            <VisibilityIcon fontSize="small" />
                          </ActionButton>
                        </Tooltip>
                        <Tooltip title="编辑">
                          <ActionButton
                            size="small"
                            onClick={() =>
                              navigate(
                                `/advertiser/campaigns/edit/${campaign.id}`
                              )
                            }
                          >
                            <EditIcon fontSize="small" />
                          </ActionButton>
                        </Tooltip>
                        <Tooltip title="删除">
                          <ActionButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteClick(campaign.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </ActionButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={campaignsData.pagination?.total || 0}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={pageSize}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 20, 50]}
              labelDisplayedRows={({ from, to, count }) =>
                `${from}-${to} / ${count !== -1 ? count : `More than ${to}`}`
              }
            />
          </>
        ) : (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: 'action.hover',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <FilterListIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
            </Box>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              暂无活动
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              {keyword || statusFilter || objectiveFilter
                ? '没有符合条件的活动，请尝试调整筛选条件'
                : '创建您的第一个广告投放活动吧！'}
            </Typography>
            {!keyword && !statusFilter && !objectiveFilter && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/advertiser/campaigns/create')}
              >
                创建活动
              </Button>
            )}
          </Box>
        )}
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <DialogContentText>
            您确定要删除这个活动吗？此操作不可恢复，活动相关的所有数据都将被删除。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>取消</Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? '删除中...' : '删除'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CampaignListPage;
