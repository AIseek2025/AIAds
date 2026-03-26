import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuthStore } from '../stores/adminStore';
import { Loading } from '../components/common';

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
}

export const ProtectedAdminRoute: React.FC<ProtectedAdminRouteProps> = ({
  children,
  requiredPermission,
}) => {
  const { isAuthenticated, isLoading, hasPermission } = useAdminAuthStore();
  const location = useLocation();

  // Show loading while checking auth status
  if (isLoading) {
    return <Loading open />;
  }

  // Redirect to admin login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // Check permission-based access if required
  if (requiredPermission && !hasPermission(requiredPermission as any)) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedAdminRoute;
