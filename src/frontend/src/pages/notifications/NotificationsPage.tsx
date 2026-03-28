import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Chip from '@mui/material/Chip';
import Pagination from '@mui/material/Pagination';
import Stack from '@mui/material/Stack';
import LinearProgress from '@mui/material/LinearProgress';
import Alert from '@mui/material/Alert';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { AdvertiserHubNav } from '../../components/advertiser/AdvertiserHubNav';
import { KolHubNav } from '../../components/kol/KolHubNav';
import { notificationsAPI } from '../../services/notificationsApi';
import { getApiErrorMessage } from '../../utils/apiError';
import { openNotificationActionUrl } from '../../utils/notificationActionUrl';
import {
  ADVERTISER_ROUTE_SEG,
  KOL_ROUTE_SEG,
  pathAdvertiser,
  pathKol,
} from '../../constants/appPaths';
import { advertiserBalanceQueryKey } from '../../services/advertiserApi';

const PAGE_SIZE = 15;

const NotificationsPage: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdvertiser = pathname.startsWith('/advertiser');
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const listQuery = useQuery({
    queryKey: ['notifications', 'list', page, unreadOnly],
    queryFn: () => notificationsAPI.list({ page, page_size: PAGE_SIZE, unread_only: unreadOnly }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsAPI.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-preview'] });
    },
  });

  const markOneMutation = useMutation({
    mutationFn: (id: string) => notificationsAPI.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-preview'] });
    },
  });

  const items = listQuery.data?.items ?? [];
  const pagination = listQuery.data?.pagination;
  const hubPath = isAdvertiser
    ? pathAdvertiser(ADVERTISER_ROUTE_SEG.dashboard)
    : pathKol(KOL_ROUTE_SEG.dashboard);

  const handleOpen = (n: (typeof items)[0]) => {
    if (!n.isRead) {
      markOneMutation.mutate(n.id);
    }
    if (n.actionUrl) {
      openNotificationActionUrl(n.actionUrl, navigate);
    }
  };

  return (
    <Box>
      {isAdvertiser ? (
        <AdvertiserHubNav
          preset="notifications-page"
          onRefresh={() => {
            void listQuery.refetch();
            void queryClient.invalidateQueries({ queryKey: [...advertiserBalanceQueryKey] });
          }}
        />
      ) : (
        <KolHubNav preset="notifications-page" onRefresh={() => void listQuery.refetch()} />
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2 }}>
        <Typography variant="h5" fontWeight={600}>
          通知中心
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <ToggleButtonGroup
            size="small"
            value={unreadOnly ? 'unread' : 'all'}
            exclusive
            onChange={(_, v: 'all' | 'unread' | null) => {
              if (v != null) {
                setUnreadOnly(v === 'unread');
                setPage(1);
              }
            }}
          >
            <ToggleButton value="all">全部</ToggleButton>
            <ToggleButton value="unread">未读</ToggleButton>
          </ToggleButtonGroup>
          <Button variant="outlined" size="small" onClick={() => navigate(hubPath)}>
            返回工作台
          </Button>
          <Button
            variant="contained"
            size="small"
            disabled={markAllMutation.isPending}
            onClick={() => markAllMutation.mutate()}
          >
            全部标为已读
          </Button>
        </Stack>
      </Box>

      {listQuery.isLoading && <LinearProgress sx={{ mb: 2 }} />}
      {listQuery.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {getApiErrorMessage(listQuery.error, '加载通知失败')}
        </Alert>
      )}

      <Paper variant="outlined">
        {items.length === 0 && !listQuery.isLoading ? (
          <Box sx={{ py: 6, textAlign: 'center', px: 2 }}>
            <Typography color="text.secondary" gutterBottom>
              {unreadOnly ? '暂无未读通知' : '暂无通知'}
            </Typography>
            <Typography variant="body2" color="text.disabled">
              订单与活动相关提醒会出现在此处；若已开启邮件/短信，请同时留意站外渠道。
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {items.map((n) => (
              <ListItem key={n.id} disablePadding divider>
                <ListItemButton onClick={() => handleOpen(n)} sx={{ alignItems: 'flex-start', py: 2 }}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="subtitle1" component="span" fontWeight={n.isRead ? 400 : 600}>
                          {n.title}
                        </Typography>
                        {!n.isRead && <Chip size="small" label="未读" color="primary" variant="outlined" />}
                        <Chip size="small" label={n.type} variant="outlined" />
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {n.content}
                        </Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
                          {n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}
                          {n.actionText ? ` · ${n.actionText}` : ''}
                        </Typography>
                      </>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      {pagination && pagination.total_pages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={pagination.total_pages}
            page={page}
            onChange={(_, p) => setPage(p)}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Box>
      )}
    </Box>
  );
};

export default NotificationsPage;
