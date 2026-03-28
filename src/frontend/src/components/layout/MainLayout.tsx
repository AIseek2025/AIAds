import React from 'react';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import { styled } from '@mui/material/styles';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar, { PersistentSidebar } from './Sidebar';
import Footer from './Footer';
import { KolProfileGate } from '../kol/KolProfileGate';

interface MainLayoutProps {
  role?: 'advertiser' | 'kol' | 'admin';
}

const MainContainer = styled(Box)({
  display: 'flex',
  minHeight: '100vh',
  flexDirection: 'column',
});

const ContentWrapper = styled(Box)(() => ({
  display: 'flex',
  flex: 1,
  marginTop: 64, // Header height
}));

const MainContent = styled(Box)(({ theme }) => ({
  flex: 1,
  padding: theme.spacing(3),
  backgroundColor: theme.palette.background.default,
  minHeight: 'calc(100vh - 64px)',
}));

export const MainLayout: React.FC<MainLayoutProps> = ({ role }) => {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <MainContainer>
      <CssBaseline />
      <Header onMenuClick={handleDrawerToggle} appRole={role === 'admin' ? undefined : role} />
      <ContentWrapper>
        <Sidebar open={mobileOpen} onClose={handleDrawerToggle} role={role} />
        <PersistentSidebar role={role} />
        <MainContent>
          {role === 'kol' ? (
            <KolProfileGate>
              <Outlet />
            </KolProfileGate>
          ) : (
            <Outlet />
          )}
        </MainContent>
      </ContentWrapper>
      <Footer />
    </MainContainer>
  );
};

// Auth layout for login/register pages (no sidebar)
export const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CssBaseline />
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </Box>
    </Box>
  );
};

export default MainLayout;
