import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import type { Kol } from '../../types';
import { kolAcceptFrequencyQueryKey, kolProfileAPI, type CreateKolProfileInput } from '../../services/kolApi';
import { getApiErrorMessage, isKolProfileNotFoundError } from '../../utils/apiError';
import { KolHubNav } from '../../components/kol/KolHubNav';
import { KolFrequencyAlerts } from '../../components/kol/KolFrequencyAlerts';
import { KOL_ROUTE_SEG, pathKol } from '../../constants/appPaths';

const PLATFORMS = ['tiktok', 'youtube', 'instagram', 'xiaohongshu', 'weibo'] as const;

const queryKeyKol = ['kol'];

export const KolProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: queryKeyKol,
    queryFn: kolProfileAPI.getProfile,
    retry: false,
  });

  const freqQ = useQuery({
    queryKey: [...kolAcceptFrequencyQueryKey],
    queryFn: kolProfileAPI.getAcceptFrequency,
    retry: 0,
  });

  const [createForm, setCreateForm] = useState<CreateKolProfileInput>({
    platform: 'tiktok',
    platformUsername: '',
    platformId: '',
    bio: '',
    category: '',
    country: '',
  });

  const [editForm, setEditForm] = useState({
    bio: '',
    category: '',
    basePrice: '',
    tags: '',
  });

  React.useEffect(() => {
    const k = profileQuery.data;
    if (k) {
      setEditForm({
        bio: k.bio ?? '',
        category: k.category ?? '',
        basePrice: k.basePrice != null ? String(k.basePrice) : '',
        tags: Array.isArray(k.tags) ? k.tags.join(', ') : '',
      });
    }
  }, [profileQuery.data]);

  const createMutation = useMutation({
    mutationFn: kolProfileAPI.createProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeyKol });
      navigate(pathKol(KOL_ROUTE_SEG.dashboard), { replace: true });
    },
  });

  const updateMutation = useMutation({
    mutationFn: kolProfileAPI.updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeyKol });
    },
  });

  const needsCreate = profileQuery.isError && isKolProfileNotFoundError(profileQuery.error);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.platformUsername.trim() || !createForm.platformId.trim()) return;
    createMutation.mutate({
      platform: createForm.platform,
      platformUsername: createForm.platformUsername.trim(),
      platformId: createForm.platformId.trim(),
      bio: createForm.bio?.trim() || undefined,
      category: createForm.category?.trim() || undefined,
      country: createForm.country?.trim() || undefined,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tags = editForm.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const payload: Partial<Kol> = {
      bio: editForm.bio.trim() || undefined,
      category: editForm.category.trim() || undefined,
      tags,
    };
    const bp = Number(editForm.basePrice);
    if (editForm.basePrice !== '' && Number.isFinite(bp) && bp > 0) {
      payload.basePrice = bp;
    }
    updateMutation.mutate(payload);
  };

  if (profileQuery.isPending && !needsCreate) {
    return <LinearProgress />;
  }

  if (profileQuery.isError && !needsCreate) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {getApiErrorMessage(profileQuery.error, '加载资料失败')}
      </Alert>
    );
  }

  if (needsCreate) {
    return (
      <Box component="form" onSubmit={handleCreateSubmit} sx={{ maxWidth: 640 }}>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
            gap: 1,
            mb: 2,
          }}
        >
          <KolHubNav
            preset="profile-page"
            onRefresh={() => {
              void profileQuery.refetch();
              void freqQ.refetch();
            }}
          />
        </Box>
        <Alert severity="info" sx={{ mb: 2 }}>
          尚未创建资料时无法接单；提交后请等待审核，也可随时刷新查看是否已开通。
        </Alert>
        <Typography variant="h4" gutterBottom>
          创建 KOL 资料
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          提交后进入审核，通过后即可接单。请填写主平台用户名与平台侧唯一 ID。
        </Typography>

        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Stack spacing={3}>
              <FormControl fullWidth required>
                <InputLabel>主平台</InputLabel>
                <Select
                  label="主平台"
                  value={createForm.platform}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      platform: e.target.value as CreateKolProfileInput['platform'],
                    }))
                  }
                >
                  {PLATFORMS.map((p) => (
                    <MenuItem key={p} value={p}>
                      {p}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                required
                label="平台用户名"
                value={createForm.platformUsername}
                onChange={(e) => setCreateForm((f) => ({ ...f, platformUsername: e.target.value }))}
                fullWidth
                placeholder="@handle 或展示名"
              />

              <TextField
                required
                label="平台用户 ID"
                value={createForm.platformId}
                onChange={(e) => setCreateForm((f) => ({ ...f, platformId: e.target.value }))}
                fullWidth
                helperText="平台侧唯一 ID；若与用户名相同可重复填写"
              />

              <TextField
                label="个人简介"
                value={createForm.bio}
                onChange={(e) => setCreateForm((f) => ({ ...f, bio: e.target.value }))}
                fullWidth
                multiline
                minRows={3}
                inputProps={{ maxLength: 1000 }}
              />

              <TextField
                label="内容类目（可选）"
                value={createForm.category}
                onChange={(e) => setCreateForm((f) => ({ ...f, category: e.target.value }))}
                fullWidth
                inputProps={{ maxLength: 100 }}
              />

              <TextField
                label="国家/地区（可选）"
                value={createForm.country}
                onChange={(e) => setCreateForm((f) => ({ ...f, country: e.target.value }))}
                fullWidth
                inputProps={{ maxLength: 50 }}
              />

              {createMutation.isError && (
                <Alert severity="error">
                  {getApiErrorMessage(createMutation.error, '创建失败')}
                </Alert>
              )}

              <Button type="submit" variant="contained" size="large" disabled={createMutation.isPending}>
                {createMutation.isPending ? '提交中…' : '提交审核'}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  const kol = profileQuery.data!;

  return (
    <Box component="form" onSubmit={handleEditSubmit} sx={{ maxWidth: 640 }}>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
          gap: 1,
          mb: 2,
        }}
      >
        <KolHubNav
          preset="profile-page"
          onRefresh={() => {
            void profileQuery.refetch();
            void freqQ.refetch();
          }}
        />
      </Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        资料与标签会影响广告主侧发现与匹配；报价与简介变更后建议在任务广场重新浏览合作机会。
      </Alert>
      <KolFrequencyAlerts
        freqQ={freqQ}
        tone="dashboard"
        onRetry={() => void freqQ.refetch()}
        onGoTaskMarket={() => navigate(pathKol(KOL_ROUTE_SEG.taskMarket))}
      />
      <Typography variant="h4" gutterBottom>
        我的资料
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        平台与账号信息在创建后不可在此修改；可更新报价、简介与标签。
      </Typography>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="subtitle2" color="text.secondary">
              账号
            </Typography>
            <Typography variant="body1">
              {kol.platform} · @{kol.platformUsername} · ID {kol.platformId}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              状态：{kol.status === 'active' ? '已激活' : kol.status === 'pending' ? '待审核' : kol.status}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={3}>
            <TextField
              label="个人简介"
              value={editForm.bio}
              onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))}
              fullWidth
              multiline
              minRows={3}
              inputProps={{ maxLength: 1000 }}
            />

            <TextField
              label="内容类目"
              value={editForm.category}
              onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
              fullWidth
              inputProps={{ maxLength: 100 }}
            />

            <TextField
              label="基础报价（元，可选）"
              type="number"
              value={editForm.basePrice}
              onChange={(e) => setEditForm((f) => ({ ...f, basePrice: e.target.value }))}
              fullWidth
              inputProps={{ min: 0, step: 0.01 }}
            />

            <TextField
              label="标签（逗号分隔）"
              value={editForm.tags}
              onChange={(e) => setEditForm((f) => ({ ...f, tags: e.target.value }))}
              fullWidth
              placeholder="美妆, 测评, 生活"
            />

            {updateMutation.isSuccess && (
              <Alert severity="success" onClose={() => updateMutation.reset()}>
                已保存
              </Alert>
            )}
            {updateMutation.isError && (
              <Alert severity="error">{getApiErrorMessage(updateMutation.error, '保存失败')}</Alert>
            )}

            <Button type="submit" variant="contained" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? '保存中…' : '保存更改'}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default KolProfilePage;
