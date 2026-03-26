import React from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { useAdminAuthStore, useAdminAppStore } from '../../stores/adminStore';

// MUI Components
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Collapse from '@mui/material/Collapse';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';

// Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import CampaignIcon from '@mui/icons-material/Campaign';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import InsightsIcon from '@mui/icons-material/Insights';
import SettingsIcon from '@mui/icons-material/Settings';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

// Menu items configuration
const menuItems = [
  {
    title: '数据总览',
    path: '/admin/dashboard',
    icon: <DashboardIcon />,
    permission: 'dashboard:view',
  },
  {
    title: '用户管理',
    path: '/admin/users',
    icon: <PeopleIcon />,
    permission: 'user:view',
  },
  {
    title: '广告主管理',
    path: '/admin/advertisers',
    icon: <BusinessIcon />,
    permission: 'advertiser:view',
  },
  {
    title: 'KOL 管理',
    path: '/admin/kols',
    icon: <VerifiedUserIcon />,
    permission: 'kol:view',
    children: [
      { title: 'KOL 列表', path: '/admin/kols/list', permission: 'kol:view' },
      { title: 'KOL 审核', path: '/admin/kols/review', permission: 'kol:review' },
      { title: '黑名单', path: '/admin/kols/blacklist', permission: 'kol:suspend' },
    ],
  },
  {
    title: '活动管理',
    path: '/admin/campaigns',
    icon: <CampaignIcon />,
    permission: 'campaign:view',
  },
  {
    title: '订单管理',
    path: '/admin/orders',
    icon: <ShoppingCartIcon />,
    permission: 'order:view',
  },
  {
    title: '财务管理',
    path: '/admin/finance',
    icon: <AttachMoneyIcon />,
    permission: 'finance:view',
    children: [
      { title: '交易记录', path: '/admin/finance/transactions', permission: 'finance:view' },
      { title: '充值管理', path: '/admin/finance/recharges', permission: 'finance:view' },
      { title: '提现审核', path: '/admin/finance/withdrawals', permission: 'withdrawal:review' },
      { title: '财务报表', path: '/admin/finance/reports', permission: 'finance:export' },
    ],
  },
  {
    title: '内容审核',
    path: '/admin/content',
    icon: <FactCheckIcon />,
    permission: 'content:view',
  },
  {
    title: '数据统计',
    path: '/admin/stats',
    icon: <InsightsIcon />,
    permission: 'analytics:view',
  },
  {
    title: '系统设置',
    path: '/admin/settings',
    icon: <SettingsIcon />,
    permission: 'settings:view',
    children: [
      { title: '系统配置', path: '/admin/settings/config', permission: 'settings:view' },
      { title: '管理员管理', path: '/admin/settings/admins', permission: 'admin:manage' },
      { title: '角色权限', path: '/admin/settings/roles', permission: 'role:manage' },
      { title: '操作日志', path: '/admin/settings/audit-logs', permission: 'audit:view' },
    ],
  },
];

interface AdminSidebarProps {
  open: boolean;
  onClose: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, role, hasPermission } = useAdminAuthStore();
  const { setSidebarCollapsed } = useAdminAppStore();

  const [expandedMenus, setExpandedMenus] = React.useState<Record<string, boolean>>({});

  const handleToggleMenu = (menuTitle: string) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menuTitle]: !prev[menuTitle],
    }));
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    if (window.innerWidth < 960) {
      onClose();
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const isChildActive = (children?: { path: string; permission?: string }[]) => {
    if (!children) return false;
    return children.some((child) => location.pathname.startsWith(child.path));
  };

  // Filter menu items based on permissions
  const filteredMenuItems = menuItems.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(item.permission as any);
  });

  return (
    <Drawer
      variant={window.innerWidth >= 960 ? 'permanent' : 'temporary'}
      open={open}
      onClose={onClose}
      sx={{
        width: open ? 256 : 64,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: open ? 256 : 64,
          boxSizing: 'border-box',
          overflowX: 'hidden',
          transition: 'width 0.3s',
          backgroundColor: '#1a1a2e',
          color: '#fff',
        },
      }}
    >
      {/* Logo Section */}
      <Box
        sx={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
        }}
      >
        {open ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AdminPanelSettingsIcon sx={{ fontSize: 32, color: '#64B5F6' }} />
            <Typography variant="h6" fontWeight="bold" sx={{ color: '#fff' }}>
              AIAds Admin
            </Typography>
          </Box>
        ) : (
          <AdminPanelSettingsIcon sx={{ fontSize: 32, color: '#64B5F6' }} />
        )}
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

      {/* Admin Info */}
      {open && (
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: '#64B5F6',
                color: '#fff',
                fontSize: '1rem',
              }}
            >
              {admin?.name?.charAt(0) || 'A'}
            </Avatar>
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              <Typography variant="body2" fontWeight="medium" noWrap>
                {admin?.name || 'Admin'}
              </Typography>
              <Chip
                label={role === 'super_admin' ? '超级管理员' : role === 'admin' ? '管理员' : role}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.625rem',
                  bgcolor: 'rgba(100, 181, 246, 0.2)',
                  color: '#64B5F6',
                }}
              />
            </Box>
          </Box>
        </Box>
      )}

      {/* Navigation Menu */}
      <List sx={{ py: 1, flex: 1, overflow: 'auto' }}>
        {filteredMenuItems.map((item) => {
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expandedMenus[item.title];
          const active = isActive(item.path) || isChildActive(item.children);

          // Filter children based on permissions
          const filteredChildren = item.children?.filter((child) => {
            if (!child.permission) return true;
            return hasPermission(child.permission as any);
          });

          const hasVisibleChildren = filteredChildren && filteredChildren.length > 0;

          return (
            <ListItem key={item.title} sx={{ px: 1, py: 0.5 }}>
              <ListItemButton
                onClick={() => {
                  if (hasChildren && hasVisibleChildren) {
                    handleToggleMenu(item.title);
                  } else {
                    handleNavigate(item.path);
                  }
                }}
                selected={active}
                sx={{
                  borderRadius: 2,
                  minHeight: 44,
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(100, 181, 246, 0.15)',
                    '&:hover': {
                      backgroundColor: 'rgba(100, 181, 246, 0.25)',
                    },
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.05)',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: active ? '#64B5F6' : 'rgba(255,255,255,0.7)',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {open && (
                  <ListItemText
                    primary={item.title}
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: active ? 600 : 500,
                      color: active ? '#fff' : 'rgba(255,255,255,0.7)',
                    }}
                  />
                )}
                {open && hasVisibleChildren && (
                  <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                    {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                )}
              </ListItemButton>

              {/* Submenu */}
              {open && hasVisibleChildren && (
                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding sx={{ pl: 2 }}>
                    {filteredChildren.map((child) => {
                      const childActive = isActive(child.path);
                      return (
                        <ListItemButton
                          key={child.path}
                          onClick={() => handleNavigate(child.path)}
                          selected={childActive}
                          sx={{
                            borderRadius: 2,
                            minHeight: 40,
                            my: 0.5,
                            '&.Mui-selected': {
                              backgroundColor: 'rgba(100, 181, 246, 0.15)',
                            },
                          }}
                        >
                          <ListItemText
                            primary={child.title}
                            primaryTypographyProps={{
                              fontSize: '0.8125rem',
                              fontWeight: childActive ? 600 : 400,
                              color: childActive ? '#fff' : 'rgba(255,255,255,0.6)',
                            }}
                          />
                        </ListItemButton>
                      );
                    })}
                  </List>
                </Collapse>
              )}
            </ListItem>
          );
        })}
      </List>

      {/* Footer */}
      {open && (
        <Box
          sx={{
            p: 2,
            borderTop: 1,
            borderColor: 'rgba(255,255,255,0.1)',
            textAlign: 'center',
          }}
        >
          <Typography variant="caption" color="rgba(255,255,255,0.5)">
            AIAds Admin v1.0
          </Typography>
        </Box>
      )}
    </Drawer>
  );
};

export default AdminSidebar;
