import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAdminAppStore } from '../../stores/adminStore';
import AdminSidebar from './AdminSidebar';
import AdminNavbar from './AdminNavbar';

// MUI Components
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';

const AdminLayout: React.FC = () => {
  const { sidebarCollapsed } = useAdminAppStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleSidebarClose = () => {
    setMobileOpen(false);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <CssBaseline />
      
      {/* Top Navigation Bar */}
      <AdminNavbar onMenuClick={handleDrawerToggle} />

      {/* Side Navigation Bar */}
      <Box
        component="nav"
        sx={{
          width: { md: sidebarCollapsed ? 64 : 256 },
          flexShrink: { md: 0 },
        }}
      >
        {/* Mobile drawer */}
        <AdminSidebar open={mobileOpen} onClose={handleSidebarClose} />
        
        {/* Desktop drawer - hidden on mobile */}
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <AdminSidebar open={!sidebarCollapsed} onClose={() => {}} />
        </Box>
      </Box>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: '100%',
          ml: { md: sidebarCollapsed ? '64px' : '256px' },
          transition: 'margin-left 0.3s',
        }}
      >
        {/* Toolbar spacer for fixed app bar */}
        <Box sx={{ height: 64 }} />
        
        {/* Page Content */}
        <Box sx={{ p: 3 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default AdminLayout;
