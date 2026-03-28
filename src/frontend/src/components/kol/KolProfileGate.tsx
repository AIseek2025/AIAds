import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import { kolProfileAPI } from '../../services/kolApi';
import { isKolProfileNotFoundError } from '../../utils/apiError';
import { KOL_ROUTE_SEG, pathKol } from '../../constants/appPaths';

const KOL_PROFILE_PATH = pathKol(KOL_ROUTE_SEG.profile);

/**
 * 未创建 KOL 资料时，除资料页外一律重定向到 /kol/profile，避免各页 API 连环 404。
 */
export const KolProfileGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const q = useQuery({
    queryKey: ['kol'],
    queryFn: kolProfileAPI.getProfile,
    retry: false,
  });

  if (q.isPending) {
    return (
      <Box sx={{ width: '100%' }}>
        <LinearProgress />
      </Box>
    );
  }

  const needsProfile = q.isError && isKolProfileNotFoundError(q.error);
  const onProfilePage =
    location.pathname === KOL_PROFILE_PATH || location.pathname.startsWith(`${KOL_PROFILE_PATH}/`);

  if (needsProfile && !onProfilePage) {
    return <Navigate to={KOL_PROFILE_PATH} replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};
