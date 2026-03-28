import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuthStore } from '../stores/adminStore';
import type { AdminPermission } from '../types';
import { APP_PATHS, ADMIN_ROUTE_SEG, pathAdmin } from '../constants/appPaths';

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
  requiredPermission?: AdminPermission;
}

export const ProtectedAdminRoute: React.FC<ProtectedAdminRouteProps> = ({
  children,
  requiredPermission,
}) => {
  const { isAuthenticated, hasPermission } = useAdminAuthStore();
  const location = useLocation();

  useEffect(() => {
    useAdminAuthStore.getState().checkAuth();
  }, []);

  // Redirect to admin login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={APP_PATHS.adminLogin} state={{ from: location }} replace />;
  }

  // Check permission-based access if required
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to={pathAdmin(ADMIN_ROUTE_SEG.dashboard)} replace />;
  }

  return <>{children}</>;
};

export default ProtectedAdminRoute;
