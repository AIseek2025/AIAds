import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Avatar from '@mui/material/Avatar';
import Stack from '@mui/material/Stack';
import LinearProgress from '@mui/material/LinearProgress';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import { styled } from '@mui/material/styles';

// Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PeopleIcon from '@mui/icons-material/People';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import RefreshIcon from '@mui/icons-material/Refresh';

// Types
import type { Campaign, Kol } from '../../types';

// Services
import { campaignAPI, kolAPI } from '../../services/advertiserApi';

// Styled Components
const StatCard = styled(Card)(({ theme }) => ({
  height: '100%',
  transition: 'transform 0.2s',
  '&:hover': {
    transform: 'translateY(-4px)',
  },
}));

const StatIconWrapper = styled(Box)<{ color?: string }>(({ theme, color }) => ({
  width: 48,
  height: 48,
  borderRadius: 12,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: color ? `${color}20` : theme.palette.primary.light,
  color: color || theme.palette.primary.main,
}));

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`campaign-tabpanel-${index}`}
      aria-labelledby={`campaign-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `campaign-tab-${index}`,
    'aria-controls': `campaign-tabpanel-${index}`,
  };
}

// Mock data for orders and KOLs (will be replaced with real API calls)
const mockOrders = [
  {
    id: '1',
    kolName: '美妆达人小李',
    kolAvatar: '',
    platform: 'tiktok',
    status: 'completed',
    amount: 500,
    deliverables: '2 视频 + 3 故事',
    createdAt: '2026-03-20',
  },
  {
    id: '2',
    kolName: '科技评测王',
    kolAvatar: '',
    platform: 'youtube',
    status: 'in_progress',
    amount: 800,
    deliverables: '1 视频 + 1 故事',
    createdAt: '2026-03-21',
  },
  {
    id: '3',
    kolName: '时尚博主 Anna',
    kolAvatar: '',
    platform: 'instagram',
    status: 'pending',
    amount: 600,
    deliverables: '3 帖子',
    createdAt: '2026-03-22',
  },
];

const mockKols: Partial<Kol>[] = [
  {
    id: '1',
    platformUsername: '@beautyguru',
    platformDisplayName: 'Beauty Guru',
    platformAvatarUrl: '',
    followers: 15000,
    engagementRate: 0.045,
    basePrice: 300,
  },
  {
    id: '2',
    platformUsername: '@techreview',
    platformDisplayName: 'Tech Review',
    platformAvatarUrl: '',
    followers: 25000,
    engagementRate: 0.038,
    basePrice: 500,
  },
  {
    id: '3',
    platformUsername: '@fashionista',
    platformDisplayName: 'Fashionista',
    platformAvatarUrl: '',
    followers: 18000,
    engagementRate: 0.052,
    basePrice: 400,
  },
];

export const CampaignDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tabValue, setTabValue] = useState(0);

  // Fetch campaign details
  const {
    data: campaign,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => campaignAPI.getCampaign(id!),
    enabled: !!id,
    retry: 1,
  });

  // Fetch campaign stats
  const { data: stats } = useQuery({
    queryKey: ['campaignStats', id],
    queryFn: () => campaignAPI.getCampaignStats(id!),
    enabled: !!id,
    retry: 1,
  });

  // Create mutation
  const deleteMutation = useMutation({
    mutationFn: campaignAPI.deleteCampaign,
    onSuccess: () => {
      setSnackbar({
        open: true,
        severity: 'success',
        message: '活动删除成功',
      });
      setTimeout(() => navigate('/advertiser/campaigns'), 1000);
    },
    onError: () => {
      setSnackbar({
        open: true,
        severity: 'error',
        message: '删除失败，请稍后重试',
      });
    },
  });

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    severity: 'success' | 'error';
    message: string;
  }>({ open: false, severity: 'success', message: '' });

  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(value);
  };

  // Format number
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('zh-CN').format(value);
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

  // Get status color
  const getStatusColor = (status: Campaign['status']) => {
    const colors = {
      draft: 'default',
      active: 'success',
      paused: 'warning',
      completed: 'info',
      cancelled: 'error',
    } as const;
    return colors[status] || 'default';
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

  // Get order status label
  const getOrderStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: '待确认',
      accepted: '已接受',
      in_progress: '进行中',
      submitted: '已提交',
      approved: '已批准',
      published: '已发布',
      completed: '已完成',
    };
    return labels[status] || status;
  };

  // Get order status color
  const getOrderStatusColor = (status: string) => {
    const colors: Record<string, 'default' | 'success' | 'warning' | 'info' | 'error'> = {
      pending: 'warning',
      accepted: 'info',
      in_progress: 'success',
      submitted: 'success',
      approved: 'success',
      published: 'success',
      completed: 'success',
    };
    return colors[status] || 'default';
  };

  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="rectangular" height={60} sx={{ mb: 3 }} />
        <Skeleton variant="rectangular" height={200} sx={{ mb: 3 }} />
        <Skeleton variant="rectangular" height={400} />
      </Box>
    );
  }

  if (error || !campaign) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          加载活动详情失败，请稍后重试
        </Alert>
        <Button variant="contained" onClick={() => navigate('/advertiser/campaigns')}>
          返回列表
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          mb: 4,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/advertiser/campaigns')}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Typography variant="h4">{campaign.title}</Typography>
              <Chip
                label={getStatusLabel(campaign.status)}
                color={getStatusColor(campaign.status)}
              />
            </Box>
            <Typography variant="body1" color="text.secondary">
              {campaign.description || '暂无描述'}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <IconButton onClick={() => refetch()} color="primary">
            <RefreshIcon />
          </IconButton>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/advertiser/campaigns/edit/${campaign.id}`)}
          >
            编辑
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => {
              if (window.confirm('确定要删除这个活动吗？')) {
                deleteMutation.mutate(campaign.id);
              }
            }}
            disabled={deleteMutation.isPending}
          >
            删除
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <StatIconWrapper color="#1976d2">
                  <AttachMoneyIcon />
                </StatIconWrapper>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    预算使用
                  </Typography>
                  <Typography variant="h5">
                    {formatCurrency(campaign.spentAmount || 0)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    总预算：{formatCurrency(campaign.budget)}
                  </Typography>
                </Box>
              </Box>
              <LinearProgress
                variant="determinate"
                value={
                  campaign.budget
                    ? ((campaign.spentAmount || 0) / campaign.budget) * 100
                    : 0
                }
                sx={{ mt: 2, borderRadius: 1 }}
              />
            </CardContent>
          </StatCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <StatIconWrapper color="#2e7d32">
                  <VisibilityIcon />
                </StatIconWrapper>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    总曝光量
                  </Typography>
                  <Typography variant="h5">
                    {formatNumber(stats?.total_views || campaign.totalViews || 0)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </StatCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <StatIconWrapper color="#ed6c02">
                  <TrendingUpIcon />
                </StatIconWrapper>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    总互动数
                  </Typography>
                  <Typography variant="h5">
                    {formatNumber(
                      (stats?.total_likes || campaign.totalLikes || 0) +
                        (stats?.total_comments || campaign.totalComments || 0)
                    )}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </StatCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <StatIconWrapper color="#9c27b0">
                  <PeopleIcon />
                </StatIconWrapper>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    合作 KOL 数
                  </Typography>
                  <Typography variant="h5">
                    {campaign.selectedKols || campaign.totalKols || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    已发布：{campaign.publishedVideos || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </StatCard>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="campaign tabs"
          >
            <Tab label="活动详情" {...a11yProps(0)} />
            <Tab label={`订单列表 (${mockOrders.length})`} {...a11yProps(1)} />
            <Tab label={`KOL 列表 (${mockKols.length})`} {...a11yProps(2)} />
            <Tab label="数据分析" {...a11yProps(3)} />
          </Tabs>
        </Box>

        <CardContent>
          {/* Tab Panel 0: Campaign Details */}
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  基本信息
                </Typography>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        活动目标
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {getObjectiveLabel(campaign.objective)}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        预算类型
                      </Typography>
                      <Typography variant="body2">
                        {campaign.budgetType === 'fixed' ? '固定预算' : '动态预算'}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        开始日期
                      </Typography>
                      <Typography variant="body2">
                        {new Date(campaign.startDate).toLocaleDateString('zh-CN')}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        结束日期
                      </Typography>
                      <Typography variant="body2">
                        {new Date(campaign.endDate).toLocaleDateString('zh-CN')}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  目标受众
                </Typography>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        年龄范围
                      </Typography>
                      <Typography variant="body2">
                        {campaign.targetAudience?.ageRange || '-'}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        性别
                      </Typography>
                      <Typography variant="body2">
                        {campaign.targetAudience?.gender === 'all'
                          ? '全部'
                          : campaign.targetAudience?.gender === 'male'
                          ? '男性'
                          : '女性'}
                      </Typography>
                    </Grid>
                    {campaign.targetAudience?.locations &&
                      campaign.targetAudience.locations.length > 0 && (
                        <Grid size={{ xs: 12 }}>
                          <Typography variant="caption" color="text.secondary">
                            目标地区
                          </Typography>
                          <Typography variant="body2">
                            {campaign.targetAudience.locations.join(', ')}
                          </Typography>
                        </Grid>
                      )}
                  </Grid>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  投放平台
                </Typography>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {campaign.targetPlatforms.map((platform: string) => (
                      <Chip key={platform} label={platform} variant="outlined" />
                    ))}
                  </Stack>
                </Paper>
              </Grid>

              {campaign.contentRequirements && (
                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    内容要求
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="body2">
                      {campaign.contentRequirements}
                    </Typography>
                  </Paper>
                </Grid>
              )}

              {campaign.requiredHashtags && campaign.requiredHashtags.length > 0 && (
                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    必需标签
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {campaign.requiredHashtags.map((hashtag: string) => (
                        <Chip
                          key={hashtag}
                          label={`#${hashtag}`}
                          variant="outlined"
                        />
                      ))}
                    </Stack>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </TabPanel>

          {/* Tab Panel 1: Orders */}
          <TabPanel value={tabValue} index={1}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>KOL</TableCell>
                    <TableCell>平台</TableCell>
                    <TableCell>状态</TableCell>
                    <TableCell align="right">金额</TableCell>
                    <TableCell>交付内容</TableCell>
                    <TableCell>创建日期</TableCell>
                    <TableCell align="right">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mockOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar src={order.kolAvatar} sx={{ width: 32, height: 32 }}>
                            {order.kolName[0]}
                          </Avatar>
                          <Typography variant="body2">{order.kolName}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={order.platform} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getOrderStatusLabel(order.status)}
                          size="small"
                          sx={{
                            bgcolor: order.status === 'in_progress' ? 'primary.light' : undefined,
                            color: order.status === 'in_progress' ? 'primary.main' : undefined,
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold">
                          {formatCurrency(order.amount)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{order.deliverables}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(order.createdAt).toLocaleDateString('zh-CN')}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Button size="small" onClick={() => {}}>
                          查看
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* Tab Panel 2: KOLs */}
          <TabPanel value={tabValue} index={2}>
            <Grid container spacing={2}>
              {mockKols.map((kol) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={kol.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar
                          src={kol.platformAvatarUrl}
                          sx={{ width: 56, height: 56 }}
                        >
                          {kol.platformUsername?.[1]}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2">
                            {kol.platformDisplayName || kol.platformUsername}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {kol.followers?.toLocaleString()} 粉丝
                          </Typography>
                        </Box>
                        <Chip
                          label={`${(kol.engagementRate! * 100).toFixed(1)}%`}
                          size="small"
                          color="success"
                        />
                      </Box>
                      <Divider sx={{ my: 2 }} />
                      <Grid container spacing={1}>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" color="text.secondary">
                            互动率
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {(kol.engagementRate! * 100).toFixed(2)}%
                          </Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" color="text.secondary">
                            基础价格
                          </Typography>
                          <Typography variant="body2" fontWeight="bold" color="primary">
                            {formatCurrency(kol.basePrice || 0)}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </TabPanel>

          {/* Tab Panel 3: Analytics */}
          <TabPanel value={tabValue} index={3}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      曝光趋势
                    </Typography>
                    <Box
                      sx={{
                        height: 200,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'action.hover',
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        图表区域 - 展示曝光量趋势
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      互动趋势
                    </Typography>
                    <Box
                      sx={{
                        height: 200,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'action.hover',
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        图表区域 - 展示互动量趋势
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      点击率 (CTR)
                    </Typography>
                    <Typography variant="h4">
                      {stats?.ctr ? `${(stats.ctr * 100).toFixed(2)}%` : '2.5%'}
                    </Typography>
                    <Typography variant="caption" color="success.main">
                      <TrendingUpIcon fontSize="small" /> 较上周 +0.5%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      转化率
                    </Typography>
                    <Typography variant="h4">
                      {stats?.conversion_rate
                        ? `${(stats.conversion_rate * 100).toFixed(2)}%`
                        : '1.2%'}
                    </Typography>
                    <Typography variant="caption" color="success.main">
                      <TrendingUpIcon fontSize="small" /> 较上周 +0.3%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      ROI
                    </Typography>
                    <Typography variant="h4">
                      {stats
                        ? `${((stats.total_views * 0.01) / campaign.budget).toFixed(2)}x`
                        : '3.5x'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      投入产出比
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>
        </CardContent>
      </Card>

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

export default CampaignDetailPage;
