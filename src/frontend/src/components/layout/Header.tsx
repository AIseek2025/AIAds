import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Badge from '@mui/material/Badge';
import Divider from '@mui/material/Divider';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MenuIcon from '@mui/icons-material/Menu';
import { styled } from '@mui/material/styles';
import { useAuthStore } from '../../stores/authStore';
import { notificationsAPI } from '../../services/notificationsApi';
import {
  ADVERTISER_ROUTE_SEG,
  KOL_ROUTE_SEG,
  pathAdvertiser,
  pathKol,
} from '../../constants/appPaths';
import { openNotificationActionUrl } from '../../utils/notificationActionUrl';

interface HeaderProps {
  onMenuClick?: () => void;
  /** 主站广告主/KOL 顶栏：接入站内通知 API */
  appRole?: 'advertiser' | 'kol';
}

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  zIndex: theme.zIndex.drawer + 1,
  backgroundColor: theme.palette.background.paper,
  borderBottom: `1px solid ${theme.palette.divider}`,
  boxShadow: 'none',
}));

const StyledToolbar = styled(Toolbar)({
  minHeight: 64,
  padding: '0 24px',
});

const ActionButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.text.secondary,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

export const Header: React.FC<HeaderProps> = ({ onMenuClick, appRole }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [notifAnchorEl, setNotifAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const notifMenuOpen = Boolean(notifAnchorEl);

  const notifListPath =
    appRole === 'kol'
      ? pathKol(KOL_ROUTE_SEG.notifications)
      : pathAdvertiser(ADVERTISER_ROUTE_SEG.notifications);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => notificationsAPI.unreadCount(),
    enabled: Boolean(user && appRole),
    refetchInterval: 60_000,
  });

  const previewQuery = useQuery({
    queryKey: ['notifications-preview'],
    queryFn: () => notificationsAPI.list({ page: 1, page_size: 6 }),
    enabled: Boolean(user && appRole && notifMenuOpen),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsAPI.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-preview'] });
    },
  });

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotifOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotifAnchorEl(event.currentTarget);
  };

  const handleNotifClose = () => {
    setNotifAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleMenuClose();
  };

  return (
    <StyledAppBar position="fixed" elevation={0}>
      <StyledToolbar>
        {onMenuClick && (
          <ActionButton
            edge="start"
            onClick={onMenuClick}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </ActionButton>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="h6" color="primary" fontWeight="bold">
            AIAds
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {user && appRole && (
            <>
              <ActionButton aria-label="notifications" onClick={handleNotifOpen}>
                <Badge
                  badgeContent={unreadCount > 99 ? '99+' : unreadCount}
                  color="error"
                  invisible={unreadCount === 0}
                >
                  <NotificationsIcon />
                </Badge>
              </ActionButton>
              <Menu
                anchorEl={notifAnchorEl}
                open={notifMenuOpen}
                onClose={handleNotifClose}
                PaperProps={{
                  elevation: 3,
                  sx: { minWidth: 320, maxWidth: 400, mt: 1 },
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography variant="subtitle2">通知</Typography>
                </Box>
                <Divider />
                {previewQuery.isLoading && (
                  <MenuItem disabled>
                    <Typography variant="body2" color="text.secondary">
                      加载中…
                    </Typography>
                  </MenuItem>
                )}
                {!previewQuery.isLoading &&
                  (previewQuery.data?.items.length ?? 0) === 0 && (
                    <MenuItem disabled>
                      <Typography variant="body2" color="text.secondary">
                        暂无通知
                      </Typography>
                    </MenuItem>
                  )}
                {(previewQuery.data?.items ?? []).map((n) => (
                  <MenuItem
                    key={n.id}
                    onClick={() => {
                      if (!n.isRead) {
                        markReadMutation.mutate(n.id);
                      }
                      handleNotifClose();
                      if (n.actionUrl) {
                        openNotificationActionUrl(n.actionUrl, navigate);
                      } else {
                        navigate(notifListPath);
                      }
                    }}
                    sx={{ alignItems: 'flex-start', whiteSpace: 'normal' }}
                  >
                    <Box sx={{ py: 0.5 }}>
                      <Typography variant="body2" fontWeight={n.isRead ? 400 : 600}>
                        {n.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {n.content}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
                <Divider />
                <MenuItem
                  onClick={() => {
                    handleNotifClose();
                    navigate(notifListPath);
                  }}
                >
                  <Typography variant="body2" color="primary" sx={{ width: '100%', textAlign: 'center' }}>
                    查看全部
                  </Typography>
                </MenuItem>
              </Menu>
            </>
          )}

          {user && (
            <>
              <Tooltip title={user.email}>
                <IconButton onClick={handleMenuOpen} sx={{ ml: 1 }}>
                  <Avatar
                    src={user.avatarUrl}
                    alt={user.nickname || user.email}
                    sx={{ width: 36, height: 36 }}
                  >
                    {!user.avatarUrl && (user.nickname?.[0] || user.email[0].toUpperCase())}
                  </Avatar>
                </IconButton>
              </Tooltip>

              <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleMenuClose}
                PaperProps={{
                  elevation: 3,
                  sx: { minWidth: 180, mt: 1 },
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography variant="subtitle2">{user.nickname || '用户'}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {user.email}
                  </Typography>
                </Box>
                <MenuItem onClick={handleMenuClose}>个人中心</MenuItem>
                <MenuItem onClick={handleMenuClose}>设置</MenuItem>
                <MenuItem onClick={handleLogout}>退出登录</MenuItem>
              </Menu>
            </>
          )}
        </Box>
      </StyledToolbar>
    </StyledAppBar>
  );
};

export default Header;
