import React from 'react';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';
import { useNavigate, useLocation } from 'react-router-dom';

// Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import CampaignIcon from '@mui/icons-material/Campaign';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SettingsIcon from '@mui/icons-material/Settings';
import TaskIcon from '@mui/icons-material/Task';
import MessageIcon from '@mui/icons-material/Message';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';

interface MenuItem {
  text: string;
  icon: React.ReactNode;
  path: string;
  role?: 'advertiser' | 'kol' | 'admin';
}

const menuItems: MenuItem[] = [
  { text: '仪表板', icon: <DashboardIcon />, path: '/dashboard' },
  { text: '活动管理', icon: <CampaignIcon />, path: '/campaigns', role: 'advertiser' },
  { text: 'KOL 发现', icon: <PeopleIcon />, path: '/kols', role: 'advertiser' },
  { text: '数据分析', icon: <TrendingUpIcon />, path: '/analytics', role: 'advertiser' },
  { text: '任务广场', icon: <PeopleIcon />, path: '/task-market', role: 'kol' },
  { text: '我的任务', icon: <TaskIcon />, path: '/my-tasks', role: 'kol' },
  { text: '账号绑定', icon: <AccountBalanceIcon />, path: '/accounts', role: 'kol' },
  { text: '收益管理', icon: <AttachMoneyIcon />, path: '/earnings', role: 'kol' },
  { text: '数据分析', icon: <TrendingUpIcon />, path: '/analytics' },
  { text: '财务管理', icon: <AccountBalanceIcon />, path: '/finance' },
  { text: '消息中心', icon: <MessageIcon />, path: '/messages' },
  { text: '设置', icon: <SettingsIcon />, path: '/settings' },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  role?: 'advertiser' | 'kol' | 'admin';
}

const StyledDrawer = styled(Drawer)(({ theme }) => ({
  '& .MuiDrawer-paper': {
    width: 260,
    boxSizing: 'border-box',
    borderRight: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
  },
}));

const LogoContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 64,
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const MenuSectionTitle = styled(Typography)(({ theme }) => ({
  padding: theme.spacing(2, 2, 1),
  fontSize: '0.75rem',
  fontWeight: 600,
  color: theme.palette.text.secondary,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}));

export const Sidebar: React.FC<SidebarProps> = ({ open, onClose, role }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const filteredMenuItems = menuItems.filter(
    (item) => !item.role || item.role === role
  );

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <LogoContainer>
        <Typography variant="h5" color="primary" fontWeight="bold">
          AIAds
        </Typography>
      </LogoContainer>

      <Box sx={{ flexGrow: 1, overflow: 'auto', py: 2 }}>
        <List>
          {filteredMenuItems.map((item) => {
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
    <StyledDrawer
      variant="temporary"
      open={open}
      onClose={onClose}
      ModalProps={{
        keepMounted: true, // Better open performance on mobile.
      }}
      sx={{
        display: { xs: 'block', sm: 'none' },
        '& .MuiDrawer-paper': {
          boxSizing: 'border-box',
          width: 260,
        },
      }}
    >
      {drawerContent}
    </StyledDrawer>
  );
};

// Persistent sidebar for desktop
export const PersistentSidebar: React.FC<{ role?: 'advertiser' | 'kol' | 'admin' }> = ({ role }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const filteredMenuItems = menuItems.filter(
    (item) => !item.role || item.role === role
  );

  return (
    <Box
      sx={{
        width: 260,
        flexShrink: 0,
        display: { xs: 'none', md: 'block' },
      }}
    >
      <Box
        sx={{
          height: '100%',
          borderRight: (theme) => `1px solid ${theme.palette.divider}`,
          backgroundColor: (theme) => theme.palette.background.paper,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <LogoContainer>
          <Typography variant="h5" color="primary" fontWeight="bold">
            AIAds
          </Typography>
        </LogoContainer>

        <Box sx={{ flexGrow: 1, overflow: 'auto', py: 2 }}>
          <List>
            {filteredMenuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <ListItem key={item.path} disablePadding>
                  <ListItemButton
                    selected={isActive}
                    onClick={() => navigate(item.path)}
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
    </Box>
  );
};

export default Sidebar;
