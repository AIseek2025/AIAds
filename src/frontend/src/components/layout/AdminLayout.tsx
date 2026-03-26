import React from 'react';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import { styled } from '@mui/material/styles';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { useAdminAuthStore, useAdminAppStore } from '../../stores/adminStore';

// MUI Components
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import Badge from '@mui/material/Badge';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';

// Icons
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';

// Constants
const HEADER_HEIGHT = 64;
const SIDEBAR_WIDTH = 260;

interface MenuItem {
  text: string;
  icon: React.ReactNode;
  path: string;
  permission?: string;
}

const menuItems: MenuItem[] = [
  { text: '数据看板', icon: <DashboardIcon />, path: '/admin/dashboard' },
  { text: '用户管理', icon: <PeopleIcon />, path: '/admin/users' },
  { text: '广告主管理', icon: <AccountBalanceIcon />, path: '/admin/advertisers' },
  { text: 'KOL 审核', icon: <VerifiedUserIcon />, path: '/admin/kol-review' },
  { text: '内容审核', icon: <FactCheckIcon />, path: '/admin/content-review' },
  { text: '活动管理', icon: <AnalyticsIcon />, path: '/admin/campaigns' },
  { text: '订单管理', icon: <NotificationsIcon />, path: '/admin/orders' },
  { text: '财务管理', icon: <AccountBalanceIcon />, path: '/admin/finance' },
  { text: '数据统计', icon: <AnalyticsIcon />, path: '/admin/stats' },
  { text: '系统设置', icon: <SettingsIcon />, path: '/admin/settings' },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

// Styled Components
const StyledAppBar = styled(AppBar)(({ theme }) => ({
  zIndex: theme.zIndex.drawer + 1,
  backgroundColor: theme.palette.background.paper,
  borderBottom: `1px solid ${theme.palette.divider}`,
  boxShadow: 'none',
  height: HEADER_HEIGHT,
}));

const StyledToolbar = styled(Toolbar)({
  minHeight: HEADER_HEIGHT,
  padding: '0 24px',
});

const MainContainer = styled(Box)({
  display: 'flex',
  minHeight: '100vh',
  flexDirection: 'column',
});

const ContentWrapper = styled(Box)({
  display: 'flex',
  flex: 1,
  marginTop: HEADER_HEIGHT,
});

const MainContent = styled(Box)(({ theme }) => ({
  flex: 1,
  padding: theme.spacing(3),
  backgroundColor: theme.palette.background.default,
  minHeight: `calc(100vh - ${HEADER_HEIGHT}px)`,
}));

const StyledDrawer = styled(Drawer)(({ theme }) => ({
  '& .MuiDrawer-paper': {
    width: SIDEBAR_WIDTH,
    boxSizing: 'border-box',
    borderRight: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
  },
}));

const LogoContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: HEADER_HEIGHT,
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const ActionButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.text.secondary,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const LogoText = styled(Typography)(({ theme }) => ({
  fontSize: '1.5rem',
  fontWeight: 700,
  color: theme.palette.primary.main,
  textDecoration: 'none',
  '&:hover': {
    opacity: 0.9,
  },
}));

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, logout, hasPermission } = useAdminAuthStore();
  const { sidebarCollapsed } = useAdminAppStore();

  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [notifAnchorEl, setNotifAnchorEl] = React.useState<null | HTMLElement>(null);

  const userMenuOpen = Boolean(anchorEl);
  const notifMenuOpen = Boolean(notifAnchorEl);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotifMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotifAnchorEl(event.currentTarget);
  };

  const handleNotifMenuClose = () => {
    setNotifAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleUserMenuClose();
    navigate('/admin/login');
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <LogoContainer>
        <Link component={RouterLink} to="/admin/dashboard" underline="none">
          <LogoText variant="h5">AIAds Admin</LogoText>
        </Link>
      </LogoContainer>

      <Box sx={{ flexGrow: 1, overflow: 'auto', py: 2 }}>
        <List>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  selected={isActive}
                  onClick={() => handleNavigate(item.path)}
                  sx={{
                    mx: 1,
                    my: 0.5,
                    borderRadius: 2,
                    '&.Mui-selected': {
                      backgroundColor: 'primary.light',
                      color: 'primary.main',
                      '& .MuiListItemIcon-root': {
                        color: 'primary.main',
                      },
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 40,
                      color: isActive ? 'primary.main' : 'text.secondary',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontWeight: isActive ? 600 : 400,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      <Box sx={{ p: 2 }}>
        <Divider />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block', textAlign: 'center' }}>
          © 2026 AIAds Platform
        </Typography>
      </Box>
    </Box>
  );

  return (
    <MainContainer>
      <CssBaseline />

      {/* Header */}
      <StyledAppBar position="fixed" elevation={0}>
        <StyledToolbar>
          {/* Mobile menu button */}
          <ActionButton
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </ActionButton>

          {/* Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Link component={RouterLink} to="/admin/dashboard" underline="none">
              <LogoText variant="h6">AIAds Admin</LogoText>
            </Link>
          </Box>

          {/* Spacer */}
          <Box sx={{ flexGrow: 1 }} />

          {/* Actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Notifications */}
            <ActionButton aria-label="notifications" onClick={handleNotifMenuOpen}>
              <Badge badgeContent={3} color="error">
                <NotificationsIcon />
              </Badge>
            </ActionButton>

            <Menu
              anchorEl={notifAnchorEl}
              open={notifMenuOpen}
              onClose={handleNotifMenuClose}
              PaperProps={{
                elevation: 3,
                sx: { minWidth: 280, mt: 1 },
              }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <Box sx={{ px: 2, py: 1.5 }}>
                <Typography variant="subtitle2">通知</Typography>
              </Box>
              <Divider />
              <MenuItem onClick={handleNotifMenuClose}>
                <Box sx={{ py: 1 }}>
                  <Typography variant="body2">3 条待审核内容</Typography>
                  <Typography variant="caption" color="text.secondary">
                    5 分钟前
                  </Typography>
                </Box>
              </MenuItem>
              <MenuItem onClick={handleNotifMenuClose}>
                <Box sx={{ py: 1 }}>
                  <Typography variant="body2">2 条提现申请待处理</Typography>
                  <Typography variant="caption" color="text.secondary">
                    15 分钟前
                  </Typography>
                </Box>
              </MenuItem>
              <MenuItem onClick={handleNotifMenuClose}>
                <Box sx={{ py: 1 }}>
                  <Typography variant="body2">1 条 KOL 认证申请</Typography>
                  <Typography variant="caption" color="text.secondary">
                    1 小时前
                  </Typography>
                </Box>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleNotifMenuClose}>
                <Typography variant="body2" color="primary" sx={{ textAlign: 'center' }}>
                  查看全部通知
                </Typography>
              </MenuItem>
            </Menu>

            {/* User menu */}
            {admin && (
              <>
                <Tooltip title={admin.email}>
                  <IconButton onClick={handleUserMenuOpen} sx={{ ml: 1 }}>
                    <Avatar
                      src={admin.avatarUrl}
                      alt={admin.name}
                      sx={{ width: 36, height: 36 }}
                    >
                      {!admin.avatarUrl && admin.name[0].toUpperCase()}
                    </Avatar>
                  </IconButton>
                </Tooltip>

                <Menu
                  anchorEl={anchorEl}
                  open={userMenuOpen}
                  onClose={handleUserMenuClose}
                  PaperProps={{
                    elevation: 3,
                    sx: { minWidth: 180, mt: 1 },
                  }}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                >
                  <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                    <Typography variant="subtitle2">{admin.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {admin.email}
                    </Typography>
                    {admin.role && (
                      <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 0.5 }}>
                        {admin.role === 'super_admin' ? '超级管理员' : admin.role === 'admin' ? '管理员' : admin.role}
                      </Typography>
                    )}
                  </Box>
                  <MenuItem onClick={() => { handleUserMenuClose(); navigate('/admin/profile'); }}>
                    <ListItemIcon>
                      <PersonIcon fontSize="small" />
                    </ListItemIcon>
                    个人中心
                  </MenuItem>
                  <MenuItem onClick={() => { handleUserMenuClose(); navigate('/admin/settings'); }}>
                    <ListItemIcon>
                      <SettingsIcon fontSize="small" />
                    </ListItemIcon>
                    系统设置
                  </MenuItem>
                  <Divider />
                  <MenuItem onClick={handleLogout}>
                    <ListItemIcon>
                      <LogoutIcon fontSize="small" />
                    </ListItemIcon>
                    退出登录
                  </MenuItem>
                </Menu>
              </>
            )}
          </Box>
        </StyledToolbar>
      </StyledAppBar>

      {/* Sidebar - Mobile */}
      <StyledDrawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
        }}
      >
        {drawerContent}
      </StyledDrawer>

      {/* Sidebar - Desktop */}
      <Box
        sx={{
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          display: { xs: 'none', md: 'block' },
        }}
      >
        <Box
          sx={{
            height: '100%',
            borderRight: (theme) => `1px solid ${theme.palette.divider}`,
            backgroundColor: (theme) => theme.palette.background.paper,
          }}
        >
          {drawerContent}
        </Box>
      </Box>

      {/* Main Content */}
      <ContentWrapper>
        <MainContent>
          {children}
        </MainContent>
      </ContentWrapper>
    </MainContainer>
  );
};

export default AdminLayout;
