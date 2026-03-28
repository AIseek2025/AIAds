import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import UploadIcon from '@mui/icons-material/Upload';
import EditIcon from '@mui/icons-material/Edit';
import { KolHubNav } from '../../components/kol/KolHubNav';
import { KOL_ROUTE_SEG, pathKol } from '../../constants/appPaths';
import type { KolTask } from '../../stores/kolStore';
import { kolAcceptFrequencyQueryKey, kolProfileAPI, myTasksAPI } from '../../services/kolApi';
import { getApiErrorMessage } from '../../utils/apiError';

const qkOrder = (id: string) => ['kol-order', id] as const;
const qkTasksList = ['tasks'] as const;

const statusConfig: Record<
  KolTask['status'],
  { label: string; color: 'default' | 'info' | 'warning' | 'primary' | 'success' | 'error' }
> = {
  pending: { label: '待接受', color: 'default' },
  accepted: { label: '已接受', color: 'info' },
  in_progress: { label: '进行中', color: 'warning' },
  pending_review: { label: '待审核', color: 'primary' },
  completed: { label: '已完成', color: 'success' },
  rejected: { label: '已拒绝', color: 'error' },
};

export const MyTaskDetailPage: React.FC = () => {
  const { id: orderId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [submitForm, setSubmitForm] = useState({ contentUrl: '', contentDescription: '' });

  const {
    data: task,
    isLoading: orderLoading,
    isError: orderError,
    error: orderErr,
    refetch: refetchOrder,
  } = useQuery({
    queryKey: orderId ? qkOrder(orderId) : ['kol-order', 'missing'],
    queryFn: () => myTasksAPI.getTask(orderId!),
    enabled: Boolean(orderId),
    retry: 1,
  });

  const freqQ = useQuery({
    queryKey: [...kolAcceptFrequencyQueryKey],
    queryFn: kolProfileAPI.getAcceptFrequency,
    retry: 0,
  });

  const invalidate = async () => {
    if (orderId) await queryClient.invalidateQueries({ queryKey: qkOrder(orderId) });
    await queryClient.invalidateQueries({ queryKey: qkTasksList });
  };

  const acceptMutation = useMutation({
    mutationFn: myTasksAPI.acceptTask,
    onSuccess: async () => {
      await invalidate();
      await queryClient.invalidateQueries({ queryKey: [...kolAcceptFrequencyQueryKey] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ oid, reason }: { oid: string; reason?: string }) => myTasksAPI.rejectTask(oid, reason),
    onSuccess: () => {
      invalidate();
      setRejectDialogOpen(false);
      setRejectReason('');
    },
  });

  const submitMutation = useMutation({
    mutationFn: ({
      oid,
      data,
    }: {
      oid: string;
      data: { contentUrl: string; contentDescription?: string };
    }) => myTasksAPI.submitWork(oid, data),
    onSuccess: () => {
      invalidate();
      setSubmitDialogOpen(false);
      setSubmitForm({ contentUrl: '', contentDescription: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      oid,
      data,
    }: {
      oid: string;
      data: { contentUrl: string; contentDescription?: string };
    }) => myTasksAPI.updateWork(oid, data),
    onSuccess: () => {
      invalidate();
      setSubmitDialogOpen(false);
      setSubmitForm({ contentUrl: '', contentDescription: '' });
    },
  });

  const canAccept = (t: KolTask) => t.status === 'pending';
  const canSubmit = (t: KolTask) => t.status === 'in_progress';
  const canEdit = (t: KolTask) => t.status === 'pending_review';

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(n);

  const formatDate = (s?: string) => (s ? new Date(s).toLocaleString('zh-CN') : '—');

  const handleOpenSubmit = () => {
    if (!task) return;
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
    if (!task || !orderId) return;
    if (task.contentUrl) {
      updateMutation.mutate({ oid: orderId, data: submitForm });
    } else {
      submitMutation.mutate({ oid: orderId, data: submitForm });
    }
  };

  if (!orderId) {
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        无效的订单链接
      </Alert>
    );
  }

  if (orderLoading) {
    return <LinearProgress />;
  }

  if (orderError || !task) {
    return (
      <Box sx={{ mt: 2 }}>
        <Alert severity="error">{getApiErrorMessage(orderErr, '加载订单失败')}</Alert>
        <Button sx={{ mt: 2 }} startIcon={<ArrowBackIcon />} onClick={() => navigate(pathKol(KOL_ROUTE_SEG.myTasks))}>
          返回我的任务
        </Button>
      </Box>
    );
  }

  const sc = statusConfig[task.status];
  const freqBlock = Boolean(freqQ.data?.enabled && freqQ.data.remaining <= 0 && canAccept(task));

  return (
    <Box>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate(pathKol(KOL_ROUTE_SEG.myTasks))}
          sx={{ cursor: 'pointer' }}
        >
          我的任务
        </Link>
        <Typography color="text.primary">订单详情</Typography>
      </Breadcrumbs>

      <KolHubNav
        preset="my-tasks-page"
        onRefresh={() => {
          void refetchOrder();
          void freqQ.refetch();
        }}
      />

      <Alert severity="info" sx={{ mb: 3 }}>
        订单状态、CPM 与交付链接与列表页一致；结算与收入口径见收益管理与经营分析。
      </Alert>
      {freqQ.data?.enabled && canAccept(task) && (
        <Alert severity={freqBlock ? 'warning' : 'info'} sx={{ mb: 2 }}>
          接单频控：近 {freqQ.data.rollingDays} 日已接单 {freqQ.data.currentCount}/{freqQ.data.maxAccepts}
          {freqBlock ? '，已达上限，无法接受本单。' : `，尚可接单约 ${freqQ.data.remaining} 次。`}
        </Alert>
      )}

      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            {task.campaignTitle}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {task.orderNo ? `订单号 ${task.orderNo}` : `订单 ${task.id.slice(0, 8)}…`}
          </Typography>
        </Box>
        <Chip label={sc.label} color={sc.color} />
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        {canAccept(task) && (
          <>
            <Button color="error" variant="outlined" onClick={() => setRejectDialogOpen(true)}>
              拒绝
            </Button>
            <Button
              variant="contained"
              onClick={() => acceptMutation.mutate(orderId)}
              disabled={acceptMutation.isPending || freqBlock}
            >
              {acceptMutation.isPending ? '处理中…' : '接受任务'}
            </Button>
          </>
        )}
        {canSubmit(task) && (
          <Button variant="contained" startIcon={<UploadIcon />} onClick={handleOpenSubmit}>
            提交作品
          </Button>
        )}
        {canEdit(task) && (
          <Button variant="outlined" startIcon={<EditIcon />} onClick={handleOpenSubmit}>
            修改作品
          </Button>
        )}
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(pathKol(KOL_ROUTE_SEG.myTasks))}>
          返回列表
        </Button>
      </Stack>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                订单与报酬
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    计价模式
                  </Typography>
                  <Typography variant="body2">{task.pricingModel === 'cpm' ? 'CPM' : '固定价'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    KOL 报酬
                  </Typography>
                  <Typography variant="body2" fontWeight="bold" color="success.main">
                    {formatCurrency(task.kolEarning ?? task.budget)}
                  </Typography>
                </Box>
                {task.orderPrice != null && task.orderPrice > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      订单金额
                    </Typography>
                    <Typography variant="body2">{formatCurrency(task.orderPrice)}</Typography>
                  </Box>
                )}
                {task.frozenAmount != null && task.frozenAmount > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      冻结金额
                    </Typography>
                    <Typography variant="body2">{formatCurrency(task.frozenAmount)}</Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    平台
                  </Typography>
                  <Typography variant="body2">{task.platform}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    截止
                  </Typography>
                  <Typography variant="body2">{formatDate(task.deadline)}</Typography>
                </Box>
                {task.revisionCount != null && task.revisionCount > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      修改轮次
                    </Typography>
                    <Typography variant="body2">{task.revisionCount}</Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                数据与内容
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    曝光 / 点赞
                  </Typography>
                  <Typography variant="body2">
                    {task.views ?? 0} / {task.likes ?? 0}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    提交时间
                  </Typography>
                  <Typography variant="body2">{formatDate(task.submittedAt)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    创建时间
                  </Typography>
                  <Typography variant="body2">{formatDate(task.createdAt)}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {task.pricingModel === 'cpm' && task.cpmBreakdown && (
          <Grid size={{ xs: 12 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  CPM 结算明细
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary">
                      计费曝光
                    </Typography>
                    <Typography variant="body1">{task.cpmBreakdown.billable_impressions}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary">
                      原始播放
                    </Typography>
                    <Typography variant="body1">{task.cpmBreakdown.raw_views}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary">
                      总消耗
                    </Typography>
                    <Typography variant="body1">{formatCurrency(task.cpmBreakdown.gross_spend)}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary">
                      KOL 分成
                    </Typography>
                    <Typography variant="body1" color="success.main">
                      {formatCurrency(task.cpmBreakdown.kol_earning)}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {(task.campaignDescription || task.contentDescription) && (
          <Grid size={{ xs: 12 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  需求说明
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                  {task.campaignDescription || task.contentDescription}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}

        {(task.draftUrls?.length || task.publishedUrls?.length) ? (
          <Grid size={{ xs: 12 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  链接
                </Typography>
                {!!task.draftUrls?.length && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      草稿 / 提交
                    </Typography>
                    <Stack spacing={0.5}>
                      {task.draftUrls.map((u) => (
                        <Link key={u} href={u} target="_blank" rel="noopener noreferrer">
                          {u}
                        </Link>
                      ))}
                    </Stack>
                  </Box>
                )}
                {!!task.publishedUrls?.length && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      已发布
                    </Typography>
                    <Stack spacing={0.5}>
                      {task.publishedUrls.map((u) => (
                        <Link key={u} href={u} target="_blank" rel="noopener noreferrer">
                          {u}
                        </Link>
                      ))}
                    </Stack>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ) : null}

        {task.rejectionReason && (
          <Grid size={{ xs: 12 }}>
            <Alert severity="error">{task.rejectionReason}</Alert>
          </Grid>
        )}
      </Grid>

      <Dialog open={submitDialogOpen} onClose={() => setSubmitDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{task.contentUrl ? '修改作品' : '提交作品'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="作品链接"
              value={submitForm.contentUrl}
              onChange={(e) => setSubmitForm((f) => ({ ...f, contentUrl: e.target.value }))}
              fullWidth
              required
              placeholder="请输入作品链接"
            />
            <TextField
              label="作品描述（可选）"
              value={submitForm.contentDescription}
              onChange={(e) => setSubmitForm((f) => ({ ...f, contentDescription: e.target.value }))}
              fullWidth
              multiline
              rows={4}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubmitDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleSubmitWork}
            disabled={
              submitMutation.isPending || updateMutation.isPending || !submitForm.contentUrl.trim()
            }
          >
            {submitMutation.isPending || updateMutation.isPending ? '提交中…' : '提交'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>拒绝任务</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              label="拒绝原因（可选）"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>取消</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => rejectMutation.mutate({ oid: orderId, reason: rejectReason || undefined })}
            disabled={rejectMutation.isPending}
          >
            {rejectMutation.isPending ? '拒绝中…' : '确认拒绝'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MyTaskDetailPage;
