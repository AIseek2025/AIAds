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
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Pagination from '@mui/material/Pagination';
import { styled } from '@mui/material/styles';

// Icons
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import TikTokIcon from '@mui/icons-material/VideoLibrary';
import YouTubeIcon from '@mui/icons-material/YouTube';
import InstagramIcon from '@mui/icons-material/PhotoCamera';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TimelineIcon from '@mui/icons-material/Timeline';
import PeopleIcon from '@mui/icons-material/People';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

// Types
import type { KolTask } from '../../stores/kolStore';
import { KolHubNav } from '../../components/kol/KolHubNav';
import { KolFrequencyAlerts } from '../../components/kol/KolFrequencyAlerts';
import { KOL_ROUTE_SEG, pathKol, pathKolTaskMarketDetail } from '../../constants/appPaths';

// Services
import { kolAcceptFrequencyQueryKey, kolProfileAPI, taskMarketAPI } from '../../services/kolApi';
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

interface FilterState {
  platform: string;
  minBudget: string;
  maxBudget: string;
  category: string;
  keyword: string;
}

export const TaskMarketPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [selectedTask, setSelectedTask] = useState<KolTask | null>(null);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [applyMessage, setApplyMessage] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    platform: '',
    minBudget: '',
    maxBudget: '',
    category: '',
    keyword: '',
  });

  const freqQ = useQuery({
    queryKey: [...kolAcceptFrequencyQueryKey],
    queryFn: kolProfileAPI.getAcceptFrequency,
    retry: 0,
  });

  // Fetch tasks
  const {
    data: tasksData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [queryKeys.tasks, page, filters],
    queryFn: () =>
      taskMarketAPI.getAvailableTasks({
        page,
        page_size: pageSize,
        platform: filters.platform || undefined,
        minBudget: filters.minBudget ? Number(filters.minBudget) : undefined,
        maxBudget: filters.maxBudget ? Number(filters.maxBudget) : undefined,
        category: filters.category || undefined,
        keyword: filters.keyword || undefined,
      }),
    retry: 1,
  });

  // Apply task mutation
  const applyMutation = useMutation({
    mutationFn: ({ taskId, message }: { taskId: string; message?: string }) =>
      taskMarketAPI.applyTask(taskId, message),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [queryKeys.tasks] });
      queryClient.invalidateQueries({ queryKey: ['task-market-campaign', variables.taskId] });
      setApplyDialogOpen(false);
      setApplyMessage('');
      setSelectedTask(null);
    },
  });

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilters({
      platform: '',
      minBudget: '',
      maxBudget: '',
      category: '',
      keyword: '',
    });
    setPage(1);
  };

  const handleApplyTask = () => {
    setApplyDialogOpen(true);
  };

  const handleSubmitApply = () => {
    if (selectedTask) {
      applyMutation.mutate({ taskId: selectedTask.id, message: applyMessage || undefined });
    }
  };

  const getPlatformIcon = (platform: string) => {
    const config = platformConfig[platform.toLowerCase()] || platformConfig.tiktok;
    const IconComponent = config.icon;
    return <Box sx={{ color: config.color, display: 'inline-flex' }}><IconComponent fontSize="medium" /></Box>;
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
            任务广场
          </Typography>
          <Typography variant="body1" color="text.secondary">
            浏览可接活动并报名；接单后在「我的任务」交付，收入与结算见收益与经营分析。
          </Typography>
        </Box>
        <KolHubNav
          preset="task-market-page"
          onRefresh={() => {
            void refetch();
            void freqQ.refetch();
          }}
        />
      </Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        点击卡片进入活动详情页可报名；订单状态与 CPM 口径与「我的任务」详情一致。
      </Alert>
      <KolFrequencyAlerts
        freqQ={freqQ}
        tone="task-market"
        onRetry={() => void freqQ.refetch()}
        onGoTaskMarket={() => navigate(pathKol(KOL_ROUTE_SEG.taskMarket))}
        alertSx={{ mb: 2 }}
      />

      {/* Filters */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <FilterListIcon sx={{ mr: 1, color: 'text.secondary' }} />
            <Typography variant="subtitle2" color="text.secondary">
              筛选条件
            </Typography>
          </Box>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
              <TextField
                label="关键词"
                value={filters.keyword}
                onChange={(e) => handleFilterChange('keyword', e.target.value)}
                fullWidth
                size="small"
                placeholder="搜索任务..."
                InputProps={{
                  endAdornment: <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />,
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>平台</InputLabel>
                <Select
                  value={filters.platform}
                  label="平台"
                  onChange={(e) => handleFilterChange('platform', e.target.value)}
                >
                  <MenuItem value="">全部</MenuItem>
                  <MenuItem value="tiktok">TikTok</MenuItem>
                  <MenuItem value="youtube">YouTube</MenuItem>
                  <MenuItem value="instagram">Instagram</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                label="最低预算"
                value={filters.minBudget}
                onChange={(e) => handleFilterChange('minBudget', e.target.value)}
                fullWidth
                size="small"
                type="number"
                placeholder="¥"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                label="最高预算"
                value={filters.maxBudget}
                onChange={(e) => handleFilterChange('maxBudget', e.target.value)}
                fullWidth
                size="small"
                type="number"
                placeholder="¥"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>类别</InputLabel>
                <Select
                  value={filters.category}
                  label="类别"
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                >
                  <MenuItem value="">全部</MenuItem>
                  <MenuItem value="fashion">时尚</MenuItem>
                  <MenuItem value="beauty">美妆</MenuItem>
                  <MenuItem value="tech">科技</MenuItem>
                  <MenuItem value="food">美食</MenuItem>
                  <MenuItem value="travel">旅行</MenuItem>
                  <MenuItem value="lifestyle">生活</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 1.5 }}>
              <Button
                variant="outlined"
                onClick={handleClearFilters}
                fullWidth
                size="small"
              >
                清除
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tasks Grid */}
      {tasksData?.items && tasksData.items.length > 0 ? (
        <>
          <Grid container spacing={3}>
            {tasksData.items.map((task: KolTask) => (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={task.id}>
                <TaskCard>
                  <CardContent sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                      <PlatformIconWrapper
                        sx={{
                          bgcolor: `${platformConfig[task.platform.toLowerCase()]?.color}15`,
                        }}
                      >
                        {getPlatformIcon(task.platform)}
                      </PlatformIconWrapper>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold" noWrap>
                          {task.campaignTitle}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {task.platform}
                        </Typography>
                      </Box>
                    </Box>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mb: 2,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {task.campaignDescription || '暂无描述'}
                    </Typography>

                    <Stack spacing={1} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AttachMoneyIcon sx={{ fontSize: 16, color: 'success.main' }} />
                        <Typography variant="body2" fontWeight="bold" color="success.main">
                          {formatCurrency(task.budget)}
                        </Typography>
                      </Box>
                      {(task.frozenAmount ?? 0) > 0 ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LockOutlinedIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                          <Typography variant="caption" color="text.secondary">
                            订单冻结 {formatCurrency(task.frozenAmount!)}
                          </Typography>
                        </Box>
                      ) : null}
                      {task.deadline && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TimelineIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                          <Typography variant="caption" color="text.secondary">
                            截止：{formatDate(task.deadline)}
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </CardContent>

                  <CardActions sx={{ px: 2, pb: 2 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => navigate(pathKolTaskMarketDetail(task.id))}
                      fullWidth
                    >
                      详情
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => {
                        setSelectedTask(task);
                        handleApplyTask();
                      }}
                      fullWidth
                    >
                      申请
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
              <PeopleIcon sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                暂无任务
              </Typography>
              <Typography variant="body2" color="text.secondary">
                当前筛选条件下没有找到任务，尝试调整筛选条件
              </Typography>
              <Button
                variant="outlined"
                sx={{ mt: 2 }}
                onClick={handleClearFilters}
              >
                清除筛选
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Apply Dialog */}
      <Dialog open={applyDialogOpen} onClose={() => setApplyDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>申请任务</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" paragraph>
              申请任务：<strong>{selectedTask?.campaignTitle}</strong>
            </Typography>
            <TextField
              label="申请留言（可选）"
              value={applyMessage}
              onChange={(e) => setApplyMessage(e.target.value)}
              fullWidth
              multiline
              rows={4}
              placeholder="向广告主介绍一下自己，说明您为什么适合这个任务..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApplyDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleSubmitApply}
            disabled={applyMutation.isPending}
          >
            {applyMutation.isPending ? '申请中...' : '提交申请'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TaskMarketPage;
