import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Loading } from '../components/common';
import {
  APP_PATHS,
  ADVERTISER_ROUTE_SEG,
  ADMIN_ROUTE_SEG,
  KOL_ROUTE_SEG,
  pathAdvertiser,
  pathKol,
  pathAdmin,
} from '../constants/appPaths';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('advertiser' | 'kol' | 'admin')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const location = useLocation();

  // Show loading while checking auth status
  if (isLoading) {
    return <Loading open />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={APP_PATHS.login} state={{ from: location }} replace />;
  }

  // Check role-based access
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on user role
    if (user.role === 'advertiser') {
      return <Navigate to={pathAdvertiser(ADVERTISER_ROUTE_SEG.dashboard)} replace />;
    } else if (user.role === 'kol') {
      return <Navigate to={pathKol(KOL_ROUTE_SEG.dashboard)} replace />;
    } else if (user.role === 'admin') {
      return <Navigate to={pathAdmin(ADMIN_ROUTE_SEG.dashboard)} replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
