import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminCampaignAPI } from '../../services/adminApi';
import { getApiErrorMessage } from '../../utils/apiError';
import { ADMIN_ROUTE_SEG, pathAdmin } from '../../constants/appPaths';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';

import { AdminHubNav } from '../../components/admin/AdminHubNav';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

const formatCurrency = (n: number) =>
  `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const statusLabel: Record<string, string> = {
  draft: '草稿',
  pending_review: '待审核',
  active: '进行中',
  paused: '已暂停',
  completed: '已完成',
  cancelled: '已取消',
  rejected: '已拒绝',
};

const AdminCampaignDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [statusEdit, setStatusEdit] = useState<string>('');

  const { data: campaign, isLoading, error, refetch } = useQuery({
    queryKey: ['adminCampaign', id],
    queryFn: () => adminCampaignAPI.getCampaign(id!),
    enabled: Boolean(id),
  });

  const {
    data: campaignStats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['adminCampaignStats', id],
    queryFn: () => adminCampaignAPI.getCampaignStats(id!),
    enabled: Boolean(id),
  });

  const handleHubRefresh = () => {
    void refetch();
    void refetchStats();
  };

  const verifyMutation = useMutation({
    mutationFn: (payload: { action: 'approve' | 'reject'; rejection_reason?: string }) =>
      adminCampaignAPI.verifyCampaign(id!, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['adminCampaign', id] });
      void queryClient.invalidateQueries({ queryKey: ['adminCampaignStats', id] });
      void queryClient.invalidateQueries({ queryKey: ['adminCampaigns'] });
      setRejectOpen(false);
      setRejectReason('');
    },
  });

  const statusMutation = useMutation({
    mutationFn: (payload: { status: string; reason?: string }) =>
      adminCampaignAPI.updateCampaignStatus(id!, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['adminCampaign', id] });
      void queryClient.invalidateQueries({ queryKey: ['adminCampaignStats', id] });
      void queryClient.invalidateQueries({ queryKey: ['adminCampaigns'] });
    },
  });

  if (!id) {
    return <Alert severity="warning">缺少活动 ID</Alert>;
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !campaign) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(pathAdmin(ADMIN_ROUTE_SEG.campaigns))} sx={{ mb: 2 }}>
          返回列表
        </Button>
        <Alert severity="error">
          {error ? getApiErrorMessage(error, '加载活动失败') : '活动不存在'}
        </Alert>
      </Box>
    );
  }

  const pendingReview = campaign.status === 'pending_review';
  const stats = campaign.statistics;

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(pathAdmin(ADMIN_ROUTE_SEG.campaigns))} sx={{ mb: 2 }}>
        返回活动列表
      </Button>
      <AdminHubNav onRefresh={handleHubRefresh} />
      <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
        刷新将重新拉取本活动详情与统计；可通过上方快捷入口跳转订单、财务等模块。
      </Alert>

      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
        <Typography variant="h4" fontWeight="bold">
          {campaign.title}
        </Typography>
        <Chip
          label={statusLabel[campaign.status] ?? campaign.status}
          color={campaign.status === 'active' ? 'success' : campaign.status === 'pending_review' ? 'warning' : 'default'}
        />
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        广告主：{campaign.advertiserName} · ID：{campaign.id}
      </Typography>

      {pendingReview && (
        <Card sx={{ mb: 3, borderColor: 'warning.main', borderWidth: 1, borderStyle: 'solid' }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              待审核
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircleIcon />}
                disabled={verifyMutation.isPending}
                onClick={() => verifyMutation.mutate({ action: 'approve' })}
              >
                审核通过
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<CancelIcon />}
                disabled={verifyMutation.isPending}
                onClick={() => setRejectOpen(true)}
              >
                拒绝
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                预算与周期
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2" sx={{ mb: 1 }}>
                预算：{formatCurrency(campaign.budget)}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                已消耗：{formatCurrency(campaign.spentAmount ?? 0)}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                订单冻结（本活动）：{formatCurrency(campaign.ordersFrozenTotal ?? 0)}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                开始：{campaign.startDate ? new Date(campaign.startDate).toLocaleString('zh-CN') : '—'}
              </Typography>
              <Typography variant="body2">
                结束：{campaign.endDate ? new Date(campaign.endDate).toLocaleString('zh-CN') : '—'}
              </Typography>
              {campaign.reviewNotes && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  审核说明：{campaign.reviewNotes}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                统计概览
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2">关联订单数（KOL 槽位口径）：{stats?.totalKols ?? 0}</Typography>
              <Typography variant="body2">已完成视频：{stats?.publishedVideos ?? 0}</Typography>
              <Typography variant="body2">曝光（累计）：{stats?.totalImpressions ?? 0}</Typography>
              <Typography variant="body2">互动（累计）：{stats?.totalClicks ?? 0}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                投放分析（API）
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {statsLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={28} />
                </Box>
              )}
              {statsError && (
                <Alert severity="warning">
                  {getApiErrorMessage(statsError, '加载投放分析失败')}
                </Alert>
              )}
              {!statsLoading && !statsError && campaignStats && (
                <>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ gap: 1, mb: 2 }}>
                    <Chip label={`消耗 ${formatCurrency(campaignStats.overview.totalCost)}`} variant="outlined" />
                    <Chip
                      label={`已完成订单金额 ${formatCurrency(campaignStats.overview.totalRevenue)}`}
                      variant="outlined"
                    />
                    <Chip label={`ROI ${campaignStats.overview.roi.toFixed(2)}×`} color="primary" variant="outlined" />
                    <Chip
                      label={`CTR ${(campaignStats.overview.ctr * 100).toFixed(2)}%`}
                      variant="outlined"
                    />
                    <Chip
                      label={`互动率 ${(campaignStats.overview.engagementRate * 100).toFixed(2)}%`}
                      variant="outlined"
                    />
                    <Chip
                      label={`订单转化率 ${(campaignStats.overview.conversionRate * 100).toFixed(1)}%`}
                      variant="outlined"
                    />
                  </Stack>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    近 7 日趋势为将累计曝光/互动按日均分，便于看图；KOL 行数据来自各订单上报。
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>KOL</TableCell>
                          <TableCell align="right">曝光</TableCell>
                          <TableCell align="right">互动</TableCell>
                          <TableCell align="right">已完成</TableCell>
                          <TableCell align="right">评分</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {campaignStats.kolPerformance.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5}>
                              <Typography variant="body2" color="text.secondary">
                                暂无订单维度数据
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          campaignStats.kolPerformance.map((row) => (
                            <TableRow key={row.kolId}>
                              <TableCell>{row.kolName}</TableCell>
                              <TableCell align="right">{row.impressions.toLocaleString('zh-CN')}</TableCell>
                              <TableCell align="right">{row.engagements.toLocaleString('zh-CN')}</TableCell>
                              <TableCell align="right">{row.conversions}</TableCell>
                              <TableCell align="right">{row.performanceScore}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                管理操作 · 更改状态
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>新状态</InputLabel>
                  <Select
                    value={statusEdit}
                    label="新状态"
                    onChange={(e: SelectChangeEvent) => setStatusEdit(e.target.value)}
                  >
                    <MenuItem value="">
                      <em>选择</em>
                    </MenuItem>
                    <MenuItem value="active">进行中</MenuItem>
                    <MenuItem value="paused">已暂停</MenuItem>
                    <MenuItem value="completed">已完成</MenuItem>
                    <MenuItem value="cancelled">已取消</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  disabled={!statusEdit || statusMutation.isPending || statusEdit === campaign.status}
                  onClick={() => {
                    if (statusEdit) statusMutation.mutate({ status: statusEdit });
                  }}
                >
                  保存状态
                </Button>
              </Stack>
              {(verifyMutation.isError || statusMutation.isError) && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {getApiErrorMessage(
                    verifyMutation.error ?? statusMutation.error,
                    '操作失败，请重试'
                  )}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={rejectOpen} onClose={() => !verifyMutation.isPending && setRejectOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>拒绝活动</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            minRows={3}
            label="拒绝原因"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="将写入审核说明"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectOpen(false)} disabled={verifyMutation.isPending}>
            取消
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={verifyMutation.isPending || !rejectReason.trim()}
            onClick={() => verifyMutation.mutate({ action: 'reject', rejection_reason: rejectReason.trim() })}
          >
            确认拒绝
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminCampaignDetailPage;
