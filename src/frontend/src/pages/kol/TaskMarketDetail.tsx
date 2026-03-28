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
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TikTokIcon from '@mui/icons-material/VideoLibrary';
import YouTubeIcon from '@mui/icons-material/YouTube';
import InstagramIcon from '@mui/icons-material/PhotoCamera';
import { KolHubNav } from '../../components/kol/KolHubNav';
import { KolFrequencyAlerts } from '../../components/kol/KolFrequencyAlerts';
import { KOL_ROUTE_SEG, pathKol } from '../../constants/appPaths';
import { kolAcceptFrequencyQueryKey, kolProfileAPI, taskMarketAPI } from '../../services/kolApi';
import type { KolTask } from '../../stores/kolStore';
import { getApiErrorMessage } from '../../utils/apiError';

const qkCampaign = (id: string) => ['task-market-campaign', id] as const;
const qkTaskList = ['tasks'] as const;

const platformConfig: Record<string, { icon: React.ComponentType<{ fontSize?: 'small' | 'medium' | 'large' }>; color: string }> = {
  tiktok: { icon: TikTokIcon, color: '#000000' },
  youtube: { icon: YouTubeIcon, color: '#FF0000' },
  instagram: { icon: InstagramIcon, color: '#E4405F' },
};

function campaignAllowsApply(t: KolTask): boolean {
  const raw = t.campaignStatusRaw ?? '';
  return raw === 'active' || raw === 'pending_review';
}

export const TaskMarketDetailPage: React.FC = () => {
  const { id: campaignId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyMessage, setApplyMessage] = useState('');

  const {
    data: task,
    isLoading: taskLoading,
    isError: taskError,
    error: taskErr,
    refetch: refetchTask,
  } = useQuery({
    queryKey: campaignId ? qkCampaign(campaignId) : ['task-market-campaign', 'missing'],
    queryFn: () => taskMarketAPI.getTask(campaignId!),
    enabled: Boolean(campaignId),
    retry: 1,
  });

  const freqQ = useQuery({
    queryKey: [...kolAcceptFrequencyQueryKey],
    queryFn: kolProfileAPI.getAcceptFrequency,
    retry: 0,
  });

  const applyMutation = useMutation({
    mutationFn: ({ taskId, message }: { taskId: string; message?: string }) =>
      taskMarketAPI.applyTask(taskId, message),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: qkTaskList });
      if (campaignId) await queryClient.invalidateQueries({ queryKey: qkCampaign(campaignId) });
      setApplyOpen(false);
      setApplyMessage('');
    },
  });

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(n);

  const formatDate = (s?: string) => (s ? new Date(s).toLocaleString('zh-CN') : '—');

  const getPlatformIcon = (platform: string) => {
    const config = platformConfig[platform.toLowerCase()] || platformConfig.tiktok;
    const Icon = config.icon;
    return <Box sx={{ color: config.color, display: 'inline-flex' }}><Icon fontSize="medium" /></Box>;
  };

  if (!campaignId) {
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        无效的活动链接
      </Alert>
    );
  }

  if (taskLoading) {
    return <LinearProgress />;
  }

  if (taskError || !task) {
    return (
      <Box sx={{ mt: 2 }}>
        <Alert severity="error">{getApiErrorMessage(taskErr, '加载活动失败')}</Alert>
        <Button sx={{ mt: 2 }} startIcon={<ArrowBackIcon />} onClick={() => navigate(pathKol(KOL_ROUTE_SEG.taskMarket))}>
          返回任务广场
        </Button>
      </Box>
    );
  }

  const canApply = campaignAllowsApply(task);

  return (
    <Box>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate(pathKol(KOL_ROUTE_SEG.taskMarket))}
          sx={{ cursor: 'pointer' }}
        >
          任务广场
        </Link>
        <Typography color="text.primary">活动详情</Typography>
      </Breadcrumbs>

      <KolHubNav
        preset="task-market-page"
        onRefresh={() => {
          void refetchTask();
          void freqQ.refetch();
        }}
      />

      <KolFrequencyAlerts
        freqQ={freqQ}
        tone="task-market"
        onRetry={() => void freqQ.refetch()}
        onGoTaskMarket={() => navigate(pathKol(KOL_ROUTE_SEG.taskMarket))}
        alertSx={{ mb: 2 }}
      />

      <Alert severity="info" sx={{ mb: 3 }}>
        {canApply
          ? '报名成功后请在「我的任务」跟进接单与交付；收入与结算口径与收益、经营分析一致。'
          : '当前活动不可申请（未上架或已结束）。请返回广场浏览其他任务，或前往「我的任务」查看已有订单。'}
      </Alert>

      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              bgcolor: 'action.hover',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {getPlatformIcon(task.platform)}
          </Box>
          <Box>
            <Typography variant="h4" gutterBottom>
              {task.campaignTitle}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {task.campaignStatusRaw && (
                <Chip size="small" label={`状态：${task.campaignStatusRaw}`} variant="outlined" />
              )}
              {task.objective && <Chip size="small" label={task.objective} />}
            </Stack>
          </Box>
        </Box>
        <Stack direction="row" spacing={1}>
          {canApply && (
            <Button variant="contained" onClick={() => setApplyOpen(true)}>
              申请任务
            </Button>
          )}
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(pathKol(KOL_ROUTE_SEG.taskMarket))}>
            返回列表
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                预算与排期
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Stack spacing={1.5}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    预算
                  </Typography>
                  <Typography variant="body1" fontWeight="bold" color="success.main">
                    {formatCurrency(task.budget)}
                  </Typography>
                </Box>
                {(task.frozenAmount ?? 0) > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      订单冻结
                    </Typography>
                    <Typography variant="body2" fontWeight="medium" color="warning.main">
                      {formatCurrency(task.frozenAmount!)}
                    </Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    截止
                  </Typography>
                  <Typography variant="body2">{formatDate(task.deadline)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    开始 / 结束
                  </Typography>
                  <Typography variant="body2" sx={{ textAlign: 'right' }}>
                    {formatDate(task.startDate)}
                    <br />
                    {formatDate(task.endDate)}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                参与情况
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    已报名 / 已选中
                  </Typography>
                  <Typography variant="body2">
                    {task.appliedKols ?? 0} / {task.selectedKols ?? 0}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    内容类型
                  </Typography>
                  <Typography variant="body2">
                    {task.contentType ?? '—'} × {task.contentCount ?? 1}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    已发布视频
                  </Typography>
                  <Typography variant="body2">{task.publishedVideos ?? 0}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                门槛
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    粉丝
                  </Typography>
                  <Typography variant="body2">
                    {task.minFollowers != null || task.maxFollowers != null
                      ? `${task.minFollowers ?? 0} ~ ${task.maxFollowers ?? '∞'}`
                      : '—'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    互动率 ≥
                  </Typography>
                  <Typography variant="body2">
                    {task.minEngagementRate != null ? `${task.minEngagementRate}%` : '—'}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {!!task.requiredCategories?.length && (
          <Grid size={{ xs: 12 }}>
            <Typography variant="subtitle2" gutterBottom>
              类目
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {task.requiredCategories.map((c) => (
                <Chip key={c} label={c} size="small" />
              ))}
            </Stack>
          </Grid>
        )}

        {!!task.targetCountries?.length && (
          <Grid size={{ xs: 12 }}>
            <Typography variant="subtitle2" gutterBottom>
              目标地区
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {task.targetCountries.join('、')}
            </Typography>
          </Grid>
        )}

        {(task.campaignDescription || task.objective) && (
          <Grid size={{ xs: 12 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  活动说明
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                  {task.campaignDescription || task.objective}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}

        {(task.contentRequirements || task.contentGuidelines) && (
          <Grid size={{ xs: 12 }}>
            <Card variant="outlined">
              <CardContent>
                {task.contentRequirements && (
                  <>
                    <Typography variant="subtitle2" gutterBottom>
                      内容要求
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
                      {task.contentRequirements}
                    </Typography>
                  </>
                )}
                {task.contentGuidelines && (
                  <>
                    <Typography variant="subtitle2" gutterBottom>
                      内容规范
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                      {task.contentGuidelines}
                    </Typography>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}

        {(!!task.requiredHashtags?.length || !!task.requiredMentions?.length) && (
          <Grid size={{ xs: 12 }}>
            <Card variant="outlined">
              <CardContent>
                {!!task.requiredHashtags?.length && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      话题标签
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {task.requiredHashtags.map((h) => (
                        <Chip key={h} label={`#${h.replace(/^#/, '')}`} size="small" color="primary" variant="outlined" />
                      ))}
                    </Stack>
                  </Box>
                )}
                {!!task.requiredMentions?.length && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      需 @mentions
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {task.requiredMentions.map((m) => (
                        <Chip key={m} label={m.startsWith('@') ? m : `@${m}`} size="small" />
                      ))}
                    </Stack>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      <Dialog open={applyOpen} onClose={() => setApplyOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>申请任务</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" paragraph>
              申请：<strong>{task.campaignTitle}</strong>
            </Typography>
            <TextField
              label="申请留言（可选）"
              value={applyMessage}
              onChange={(e) => setApplyMessage(e.target.value)}
              fullWidth
              multiline
              rows={4}
              placeholder="向广告主介绍您的优势与匹配点…"
            />
            {applyMutation.isError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {getApiErrorMessage(applyMutation.error, '申请失败')}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApplyOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={() => applyMutation.mutate({ taskId: campaignId, message: applyMessage || undefined })}
            disabled={applyMutation.isPending || !canApply}
          >
            {applyMutation.isPending ? '提交中…' : '提交申请'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TaskMarketDetailPage;
