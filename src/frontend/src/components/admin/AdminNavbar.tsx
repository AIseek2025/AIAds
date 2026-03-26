import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAdminAuthStore, useAdminAppStore } from '../../stores/adminStore';
import { useQuery } from '@tanstack/react-query';
import { adminDashboardAPI } from '../../services/adminApi';

// MUI Components
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import InputBase from '@mui/material/InputBase';
import Badge from '@mui/material/Badge';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';

// Icons
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsIcon from '@mui/icons-material/Notifications';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import LogoutIcon from '@mui/icons-material/Logout';
import DashboardIcon from '@mui/icons-material/Dashboard';
import KeyboardCommandKeyIcon from '@mui/icons-material/KeyboardCommandKey';

interface AdminNavbarProps {
  onMenuClick: () => void;
}

const AdminNavbar: React.FC<AdminNavbarProps> = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const { admin, logout, hasPermission } = useAdminAuthStore();
  const { toggleSidebar } = useAdminAppStore();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState<null | HTMLElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch notification counts
  const { data: stats } = useQuery({
    queryKey: ['adminNotificationCounts'],
    queryFn: () => adminDashboardAPI.getStats({ period: 'today' }),
    refetchInterval: 60000, // Refresh every minute
  });

  const pendingReviews = (stats?.content?.pendingReview || 0) + (stats?.kol?.pendingVerification || 0);
  const pendingWithdrawals = stats?.finance?.pendingWithdrawals ? 1 : 0;

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchorEl(event.currentTarget);
  };

  const handleNotificationMenuClose = () => {
    setNotificationAnchorEl(null);
  };

  const handleLogout = () => {
    handleProfileMenuClose();
    logout();
    navigate('/admin/login');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Implement global search
      console.log('Searching for:', searchQuery);
    }
  };

  // Keyboard shortcut for search (Cmd/Ctrl + K)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('global-search')?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: '100%',
          zIndex: 1100,
          backgroundColor: '#fff',
          color: '#333',
          borderBottom: 1,
          borderColor: '#e0e0e0',
        }}
      >
        <Toolbar sx={{ minHeight: 64, px: 2 }}>
          {/* Left Section */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton
              edge="start"
              color="inherit"
              onClick={onMenuClick}
              sx={{
                color: '#333',
                mr: 1,
              }}
            >
              <MenuIcon />
            </IconButton>

            {/* Logo */}
            <Typography
              variant="h6"
              fontWeight="bold"
              sx={{
                display: { xs: 'none', sm: 'block' },
                color: '#1976D2',
              }}
            >
              AIAds Admin
            </Typography>
          </Box>

          {/* Search Bar */}
          <Box
            component="form"
            onSubmit={handleSearch}
            sx={{
              flex: 1,
              maxWidth: 600,
              mx: 4,
              display: { xs: 'none', md: 'block' },
            }}
          >
            <Paper
              component="div"
              sx={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#f5f5f5',
                borderRadius: 2,
                px: 1.5,
                py: 0.5,
              }}
            >
              <SearchIcon sx={{ color: '#999', mr: 1 }} />
              <InputBase
                id="global-search"
                placeholder="搜索用户、KOL、订单..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{
                  flex: 1,
                  fontSize: '0.875rem',
                  '& input': {
                    py: 1,
                  },
                }}
              />
              <Chip
                icon={<KeyboardCommandKeyIcon />}
                label="K"
                size="small"
                sx={{
                  height: 24,
                  fontSize: '0.7rem',
                  bgcolor: '#e0e0e0',
                  color: '#666',
                }}
              />
            </Paper>
          </Box>

          {/* Right Section */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Mobile Search */}
            <IconButton sx={{ display: { xs: 'flex', md: 'none' }, color: '#333' }}>
              <SearchIcon />
            </IconButton>

            {/* Help */}
            <Tooltip title="帮助文档">
              <IconButton sx={{ color: '#333', display: { xs: 'none', sm: 'flex' } }}>
                <HelpOutlineIcon />
              </IconButton>
            </Tooltip>

            {/* Notifications */}
            <Tooltip title="通知">
              <IconButton
                onClick={handleNotificationMenuOpen}
                sx={{ color: '#333' }}
              >
                <Badge
                  badgeContent={pendingReviews + pendingWithdrawals}
                  color="error"
                  overlap="circular"
                >
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Admin Profile */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
              <Typography
                variant="body2"
                fontWeight="medium"
                sx={{ display: { xs: 'none', sm: 'block' } }}
              >
                {admin?.name || 'Admin'}
              </Typography>
              <IconButton onClick={handleProfileMenuOpen} sx={{ p: 0.5 }}>
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: '#1976D2',
                    fontSize: '0.875rem',
                  }}
                >
                  {admin?.name?.charAt(0) || 'A'}
                </Avatar>
              </IconButton>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Profile Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        PaperProps={{
          elevation: 3,
          sx: {
            minWidth: 220,
            mt: 1,
            borderRadius: 2,
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: '#f0f0f0' }}>
          <Typography variant="body1" fontWeight="bold">
            {admin?.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" fontSize="0.75rem">
            {admin?.email}
          </Typography>
        </Box>

        <MenuItem onClick={() => { handleProfileMenuClose(); navigate('/admin/dashboard'); }}>
          <ListItemIcon sx={{ color: '#1976D2' }}>
            <DashboardIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="数据总览" />
        </MenuItem>

        <MenuItem onClick={() => { handleProfileMenuClose(); navigate('/admin/settings'); }}>
          <ListItemIcon sx={{ color: '#1976D2' }}>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="系统设置" />
        </MenuItem>

        <Divider />

        <MenuItem onClick={() => { handleProfileMenuClose(); navigate('/admin/change-password'); }}>
          <ListItemIcon sx={{ color: '#1976D2' }}>
            <LockIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="修改密码" />
        </MenuItem>

        <Divider />

        <MenuItem onClick={handleLogout} sx={{ color: '#d32f2f' }}>
          <ListItemIcon sx={{ color: '#d32f2f' }}>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="退出登录" />
        </MenuItem>
      </Menu>

      {/* Notifications Menu */}
      <Menu
        anchorEl={notificationAnchorEl}
        open={Boolean(notificationAnchorEl)}
        onClose={handleNotificationMenuClose}
        PaperProps={{
          elevation: 3,
          sx: {
            minWidth: 320,
            maxWidth: 400,
            mt: 1,
            borderRadius: 2,
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: '#f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body1" fontWeight="bold">
            通知
          </Typography>
          <Typography
            variant="body2"
            color="primary"
            sx={{ cursor: 'pointer', fontSize: '0.75rem' }}
            onClick={handleNotificationMenuClose}
          >
            全部已读
          </Typography>
        </Box>

        <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
          {/* Pending KOL Reviews */}
          {stats?.kol?.pendingVerification ? (
            <MenuItem
              onClick={() => {
                handleNotificationMenuClose();
                navigate('/admin/kols/review');
              }}
              sx={{ py: 1.5, px: 2 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, width: '100%' }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: '#1976D2',
                    mt: 0.5,
                  }}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight="medium">
                    待审核 KOL
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {stats.kol.pendingVerification} 个待审核
                  </Typography>
                </Box>
                <Chip
                  label={stats.kol.pendingVerification}
                  size="small"
                  color="error"
                />
              </Box>
            </MenuItem>
          ) : null}

          {/* Pending Content Reviews */}
          {stats?.content?.pendingReview ? (
            <MenuItem
              onClick={() => {
                handleNotificationMenuClose();
                navigate('/admin/content');
              }}
              sx={{ py: 1.5, px: 2 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, width: '100%' }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: '#ED6C02',
                    mt: 0.5,
                  }}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight="medium">
                    待审核内容
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {stats.content.pendingReview} 个待审核
                  </Typography>
                </Box>
                <Chip
                  label={stats.content.pendingReview}
                  size="small"
                  color="error"
                />
              </Box>
            </MenuItem>
          ) : null}

          {/* Pending Withdrawals */}
          {stats?.finance?.pendingWithdrawals ? (
            <MenuItem
              onClick={() => {
                handleNotificationMenuClose();
                navigate('/admin/finance/withdrawals');
              }}
              sx={{ py: 1.5, px: 2 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, width: '100%' }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: '#2E7D32',
                    mt: 0.5,
                  }}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight="medium">
                    待处理提现
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {stats.finance.pendingWithdrawals} 个待审核
                  </Typography>
                </Box>
                <Chip
                  label={stats.finance.pendingWithdrawals}
                  size="small"
                  color="error"
                />
              </Box>
            </MenuItem>
          ) : null}

          {!pendingReviews && !pendingWithdrawals && (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                暂无通知
              </Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ px: 2, py: 1.5, borderTop: 1, borderColor: '#f0f0f0', textAlign: 'center' }}>
          <Typography
            variant="body2"
            color="primary"
            sx={{ cursor: 'pointer', fontSize: '0.875rem' }}
            onClick={() => {
              handleNotificationMenuClose();
              navigate('/admin/notifications');
            }}
          >
            查看全部通知
          </Typography>
        </Box>
      </Menu>
    </>
  );
};

export default AdminNavbar;
