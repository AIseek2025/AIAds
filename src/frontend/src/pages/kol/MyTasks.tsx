import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Pagination from '@mui/material/Pagination';
import { styled } from '@mui/material/styles';

// Icons
import TikTokIcon from '@mui/icons-material/VideoLibrary';
import YouTubeIcon from '@mui/icons-material/YouTube';
import InstagramIcon from '@mui/icons-material/PhotoCamera';
import TimelineIcon from '@mui/icons-material/Timeline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import UploadIcon from '@mui/icons-material/Upload';
import VisibilityIcon from '@mui/icons-material/Visibility';
// Types
import type { KolTask } from '../../stores/kolStore';
import { KolHubNav } from '../../components/kol/KolHubNav';
import { KolFrequencyAlerts } from '../../components/kol/KolFrequencyAlerts';
import { KOL_ROUTE_SEG, pathKol, pathKolMyTask } from '../../constants/appPaths';

// Services
import { kolAcceptFrequencyQueryKey, kolProfileAPI, myTasksAPI } from '../../services/kolApi';
import { getApiErrorMessage } from '../../utils/apiError';

// Styled Components
const TaskCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.2s, box-shadow 0.2s',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
  },
}));

const PlatformIconWrapper = styled(Box)(({ theme }) => ({
  width: 40,
  height: 40,
  borderRadius: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: theme.spacing(1.5),
}));

// Query keys
const queryKeys = {
  tasks: 'tasks',
};

// Platform configurations
const platformConfig: Record<string, { icon: React.ComponentType<{ fontSize?: 'small' | 'medium' | 'large' }>; color: string; label: string }> = {
  tiktok: { icon: TikTokIcon, color: '#000000', label: 'TikTok' },
  youtube: { icon: YouTubeIcon, color: '#FF0000', label: 'YouTube' },
  instagram: { icon: InstagramIcon, color: '#E4405F', label: 'Instagram' },
};

// Status configurations
const statusConfig: Record<KolTask['status'], { label: string; color: 'default' | 'info' | 'warning' | 'primary' | 'success' | 'error'; icon: React.ComponentType<{ fontSize?: 'small' | 'medium' | 'large' }> }> = {
  pending: { label: '待接受', color: 'default', icon: HourglassEmptyIcon },
  accepted: { label: '已接受', color: 'info', icon: CheckCircleIcon },
  in_progress: { label: '进行中', color: 'warning', icon: TimelineIcon },
  pending_review: { label: '待审核', color: 'primary', icon: PlaylistAddCheckIcon },
  completed: { label: '已完成', color: 'success', icon: CheckCircleIcon },
  rejected: { label: '已拒绝', color: 'error', icon: CancelIcon },
};

export const MyTasksPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [tabValue, setTabValue] = useState(0);
  const [selectedTask, setSelectedTask] = useState<KolTask | null>(null);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [submitForm, setSubmitForm] = useState({
    contentUrl: '',
    contentDescription: '',
  });

  // Determine status filter based on tab
  const statusFilter = tabValue === 0 ? undefined : 
    tabValue === 1 ? 'pending' :
    tabValue === 2 ? 'accepted' :
    tabValue === 3 ? 'in_progress' :
    tabValue === 4 ? 'pending_review' :
    tabValue === 5 ? 'completed' : 'rejected';

  // Fetch tasks
  const {
    data: tasksData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [queryKeys.tasks, page, statusFilter],
    queryFn: () =>
      myTasksAPI.getTasks({
        page,
        page_size: pageSize,
        status: statusFilter as KolTask['status'] | undefined,
      }),
    retry: 1,
  });

  const freqQ = useQuery({
    queryKey: [...kolAcceptFrequencyQueryKey],
    queryFn: kolProfileAPI.getAcceptFrequency,
    retry: 0,
  });

  const freq = freqQ.data;
  const freqBlocksAccept = Boolean(freq?.enabled && freq.remaining <= 0);

  // Accept task mutation
  const acceptMutation = useMutation({
    mutationFn: myTasksAPI.acceptTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeys.tasks] });
      queryClient.invalidateQueries({ queryKey: [...kolAcceptFrequencyQueryKey] });
    },
  });

  // Reject task mutation
  const rejectMutation = useMutation({
    mutationFn: ({ taskId, reason }: { taskId: string; reason?: string }) =>
      myTasksAPI.rejectTask(taskId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeys.tasks] });
      setRejectDialogOpen(false);
      setRejectReason('');
      setSelectedTask(null);
    },
  });

  // Submit work mutation
  const submitMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: { contentUrl: string; contentDescription?: string } }) =>
      myTasksAPI.submitWork(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeys.tasks] });
      setSubmitDialogOpen(false);
      setSubmitForm({ contentUrl: '', contentDescription: '' });
      setSelectedTask(null);
    },
  });

  // Update work mutation
  const updateMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: { contentUrl: string; contentDescription?: string } }) =>
      myTasksAPI.updateWork(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeys.tasks] });
      setSubmitDialogOpen(false);
      setSubmitForm({ contentUrl: '', contentDescription: '' });
      setSelectedTask(null);
    },
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setPage(1);
  };

  const handleAcceptTask = (taskId: string) => {
    acceptMutation.mutate(taskId);
  };

  const handleOpenRejectDialog = (task: KolTask) => {
    setSelectedTask(task);
    setRejectDialogOpen(true);
  };

  const handleSubmitReject = () => {
    if (selectedTask) {
      rejectMutation.mutate({ taskId: selectedTask.id, reason: rejectReason || undefined });
    }
  };

  const handleOpenSubmitDialog = (task: KolTask) => {
    setSelectedTask(task);
    if (task.contentUrl) {
      setSubmitForm({
        contentUrl: task.contentUrl,
        contentDescription: task.contentDescription || '',
      });
    } else {
      setSubmitForm({ contentUrl: '', contentDescription: '' });
    }
    setSubmitDialogOpen(true);
  };

  const handleSubmitWork = () => {
    if (selectedTask) {
      if (selectedTask.contentUrl) {
        updateMutation.mutate({ taskId: selectedTask.id, data: submitForm });
      } else {
        submitMutation.mutate({ taskId: selectedTask.id, data: submitForm });
      }
    }
  };

  const getPlatformIcon = (platform: string) => {
    const config = platformConfig[platform.toLowerCase()] || platformConfig.tiktok;
    const IconComponent = config.icon;
    return <Box sx={{ color: config.color, display: 'inline-flex' }}><IconComponent fontSize="medium" /></Box>;
  };

  const getStatusChip = (status: KolTask['status']) => {
    const config = statusConfig[status];
    const IconComponent = config.icon;
    return (
      <Chip
        icon={<IconComponent fontSize="small" />}
        label={config.label}
        size="small"
        color={config.color}
      />
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, newPage: number) => {
    setPage(newPage);
  };

  const canAccept = (task: KolTask) => task.status === 'pending';
  const canSubmit = (task: KolTask) => task.status === 'in_progress';
  const canEdit = (task: KolTask) => task.status === 'pending_review';

  if (isLoading) {
    return <LinearProgress />;
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {getApiErrorMessage(error, '加载任务列表失败，请稍后重试')}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
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
          <Typography variant="h4" gutterBottom>
            我的任务
          </Typography>
          <Typography variant="body1" color="text.secondary">
            管理接单、交付与审核；详情页可查看订单号、CPM 拆分与交付链接。
          </Typography>
        </Box>
        <KolHubNav
          preset="my-tasks-page"
          onRefresh={() => {
            void refetch();
            void freqQ.refetch();
          }}
        />
      </Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        列表与「任务广场」报名结果同步；完成后结算与待结算金额见收益管理、汇总见经营分析。
      </Alert>
      <KolFrequencyAlerts
        freqQ={freqQ}
        tone="my-tasks"
        onRetry={() => void freqQ.refetch()}
        onGoTaskMarket={() => navigate(pathKol(KOL_ROUTE_SEG.taskMarket))}
        alertSx={{ mb: 2 }}
      />

      {/* Tabs */}
      <Card sx={{ mb: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="全部" />
            <Tab label="待接受" />
            <Tab label="已接受" />
            <Tab label="进行中" />
            <Tab label="待审核" />
            <Tab label="已完成" />
            <Tab label="已拒绝" />
          </Tabs>
        </Box>
      </Card>

      {/* Tasks List */}
      {tasksData?.items && tasksData.items.length > 0 ? (
        <>
          <Grid container spacing={3}>
            {tasksData.items.map((task: KolTask) => (
              <Grid size={{ xs: 12 }} key={task.id}>
                <TaskCard>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                      <PlatformIconWrapper
                        sx={{
                          bgcolor: `${platformConfig[task.platform.toLowerCase()]?.color}15`,
                        }}
                      >
                        {getPlatformIcon(task.platform)}
                      </PlatformIconWrapper>
                      <Box sx={{ flex: 1, ml: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Box>
                            <Typography variant="subtitle1" fontWeight="bold">
                              {task.campaignTitle}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                              {task.campaignDescription || '暂无描述'}
                            </Typography>
                          </Box>
                          {getStatusChip(task.status)}
                        </Box>

                        <Grid container spacing={2} sx={{ mb: 2 }}>
                          <Grid size={{ xs: 6, sm: 3 }}>
                            <Typography variant="caption" color="text.secondary">
                              平台
                            </Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {task.platform}
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 6, sm: 3 }}>
                            <Typography variant="caption" color="text.secondary">
                              预算
                            </Typography>
                            <Typography variant="body2" fontWeight="bold" color="success.main">
                              {formatCurrency(task.budget)}
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 6, sm: 3 }}>
                            <Typography variant="caption" color="text.secondary">
                              订单冻结
                            </Typography>
                            <Typography
                              variant="body2"
                              fontWeight="bold"
                              color={(task.frozenAmount ?? 0) > 0 ? 'warning.main' : 'text.secondary'}
                            >
                              {(task.frozenAmount ?? 0) > 0 ? formatCurrency(task.frozenAmount!) : '—'}
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 6, sm: 3 }}>
                            <Typography variant="caption" color="text.secondary">
                              截止日期
                            </Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {task.deadline ? formatDate(task.deadline) : '-'}
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 6, sm: 3 }}>
                            <Typography variant="caption" color="text.secondary">
                              更新时间
                            </Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {formatDate(task.updatedAt)}
                            </Typography>
                          </Grid>
                        </Grid>

                        {task.contentUrl && (
                          <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary" gutterBottom>
                              提交内容
                            </Typography>
                            <Typography variant="body2">{task.contentUrl}</Typography>
                            {task.contentDescription && (
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                {task.contentDescription}
                              </Typography>
                            )}
                            {task.rejectionReason && (
                              <Alert severity="error" sx={{ mt: 2 }}>
                                <strong>拒绝原因：</strong>{task.rejectionReason}
                              </Alert>
                            )}
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                  <CardActions sx={{ px: 2, pb: 2, justifyContent: 'flex-end' }}>
                    {canAccept(task) && (
                      <>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => handleOpenRejectDialog(task)}
                        >
                          拒绝
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => handleAcceptTask(task.id)}
                          disabled={acceptMutation.isPending || freqBlocksAccept}
                        >
                          {acceptMutation.isPending ? '接受中...' : '接受任务'}
                        </Button>
                      </>
                    )}
                    {canSubmit(task) && (
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<UploadIcon />}
                        onClick={() => handleOpenSubmitDialog(task)}
                      >
                        提交作品
                      </Button>
                    )}
                    {canEdit(task) && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<EditIcon />}
                        onClick={() => handleOpenSubmitDialog(task)}
                      >
                        修改作品
                      </Button>
                    )}
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<VisibilityIcon />}
                      onClick={() => navigate(pathKolMyTask(task.id))}
                    >
                      详情
                    </Button>
                  </CardActions>
                </TaskCard>
              </Grid>
            ))}
          </Grid>

          {/* Pagination */}
          {tasksData.pagination.total_pages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={tasksData.pagination.total_pages}
                page={page}
                onChange={handlePageChange}
                color="primary"
              />
            </Box>
          )}
        </>
      ) : (
        <Card>
          <CardContent>
            <Box
              sx={{
                textAlign: 'center',
                py: 6,
              }}
            >
              <CheckCircleIcon sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                暂无任务
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {tabValue === 0
                  ? '您还没有任何任务，去任务广场看看吧'
                  : `当前状态下没有任务`}
              </Typography>
              {tabValue === 0 && (
                <Button
                  variant="contained"
                  sx={{ mt: 2 }}
                  onClick={() => navigate(pathKol(KOL_ROUTE_SEG.taskMarket))}
                >
                  浏览任务广场
                </Button>
              )}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Submit/Edit Work Dialog */}
      <Dialog open={submitDialogOpen} onClose={() => setSubmitDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedTask?.contentUrl ? '修改作品' : '提交作品'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="作品链接"
              value={submitForm.contentUrl}
              onChange={(e) => setSubmitForm({ ...submitForm, contentUrl: e.target.value })}
              fullWidth
              required
              placeholder="请输入作品链接（如 TikTok 视频链接）"
            />
            <TextField
              label="作品描述（可选）"
              value={submitForm.contentDescription}
              onChange={(e) => setSubmitForm({ ...submitForm, contentDescription: e.target.value })}
              fullWidth
              multiline
              rows={4}
              placeholder="简单描述一下您的作品..."
            />
            <Alert severity="info">
              提交后，广告主将审核您的作品。如有问题，可能会要求您修改。
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubmitDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleSubmitWork}
            disabled={submitMutation.isPending || updateMutation.isPending || !submitForm.contentUrl}
          >
            {submitMutation.isPending || updateMutation.isPending ? '提交中...' : '提交'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>拒绝任务</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" paragraph>
              确定要拒绝任务 <strong>{selectedTask?.campaignTitle}</strong> 吗？
            </Typography>
            <TextField
              label="拒绝原因（可选）"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              fullWidth
              multiline
              rows={3}
              placeholder="请简要说明拒绝原因..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleSubmitReject}
            disabled={rejectMutation.isPending}
          >
            {rejectMutation.isPending ? '拒绝中...' : '确认拒绝'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MyTasksPage;
