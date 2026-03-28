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
import {
  MAIN_APP_SIDEBAR_ITEMS,
  isMainAppSidebarItemActive,
  type MainAppRole,
} from './mainAppNavConfig';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  role?: MainAppRole | 'admin';
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

function MainAppSidebarNavList({
  role,
  onNavigate,
}: {
  role?: MainAppRole | 'admin';
  onNavigate: (path: string) => void;
}) {
  const { pathname } = useLocation();
  const items = MAIN_APP_SIDEBAR_ITEMS.filter(
    (item) => role && role !== 'admin' && item.role === role
  );

  return (
    <List>
      {items.map((item) => {
        const isActive = isMainAppSidebarItemActive(pathname, item.path);
        const Icon = item.Icon;
        return (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={isActive}
              onClick={() => onNavigate(item.path)}
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
                <Icon />
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontWeight: isActive ? 600 : 400,
                }}
              />
            </ListItemButton>
          </ListItem>
        );
      })}
    </List>
  );
}

function SidebarDrawerChrome({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <LogoContainer>
        <Typography variant="h5" color="primary" fontWeight="bold">
          AIAds
        </Typography>
      </LogoContainer>

      <Box sx={{ flexGrow: 1, overflow: 'auto', py: 2 }}>{children}</Box>

      <Box sx={{ p: 2 }}>
        <Divider />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block', textAlign: 'center' }}>
          © 2026 AIAds Platform
        </Typography>
      </Box>
    </Box>
  );
}

export const Sidebar: React.FC<SidebarProps> = ({ open, onClose, role }) => {
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <StyledDrawer
      variant="temporary"
      open={open}
      onClose={onClose}
      ModalProps={{
        keepMounted: true,
      }}
      sx={{
        display: { xs: 'block', sm: 'none' },
        '& .MuiDrawer-paper': {
          boxSizing: 'border-box',
          width: 260,
        },
      }}
    >
      <SidebarDrawerChrome>
        <MainAppSidebarNavList role={role} onNavigate={handleNavigate} />
      </SidebarDrawerChrome>
    </StyledDrawer>
  );
};

export const PersistentSidebar: React.FC<{ role?: MainAppRole | 'admin' }> = ({ role }) => {
  const navigate = useNavigate();

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
        <SidebarDrawerChrome>
          <MainAppSidebarNavList role={role} onNavigate={(path) => void navigate(path)} />
        </SidebarDrawerChrome>
      </Box>
    </Box>
  );
};

export default Sidebar;
