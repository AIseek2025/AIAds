import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage } from './pages/auth';
import ProtectedRoute from './components/ProtectedRoute';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';
import { MainLayout } from './components/layout';
import AdminLayout from './components/layout/AdminLayout';
import ErrorBoundary from './components/common/ErrorBoundary';

// P2 Performance: Route-level code splitting with lazy loading
// Advertiser routes
const AdvertiserDashboardPage = lazy(() => import('./pages/advertiser/DashboardPage'));
const DashboardPage = lazy(() => import('./pages/advertiser/Dashboard'));
const CampaignListPage = lazy(() => import('./pages/advertiser/CampaignList'));
const CampaignCreatePage = lazy(() => import('./pages/advertiser/CampaignCreate'));
const CampaignDetailPage = lazy(() => import('./pages/advertiser/CampaignDetail'));
const KolDiscoveryPage = lazy(() => import('./pages/advertiser/KolDiscovery'));

// KOL routes
const KolDashboardPage = lazy(() => import('./pages/kol/DashboardPage'));
const KolDashboard = lazy(() => import('./pages/kol/Dashboard'));
const AccountsPage = lazy(() => import('./pages/kol/Accounts'));
const TaskMarketPage = lazy(() => import('./pages/kol/TaskMarket'));
const MyTasksPage = lazy(() => import('./pages/kol/MyTasks'));
const EarningsPage = lazy(() => import('./pages/kol/Earnings'));

// Admin routes
const AdminDashboardPage = lazy(() => import('./pages/admin/DashboardPage'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminLoginPage = lazy(() => import('./pages/admin/Login'));
const UsersPage = lazy(() => import('./pages/admin/Users'));
const KolsPage = lazy(() => import('./pages/admin/Kols'));
const KolReviewPage = lazy(() => import('./pages/admin/KolReview'));
const ContentReviewPage = lazy(() => import('./pages/admin/ContentReview'));
const FinancePage = lazy(() => import('./pages/admin/Finance'));
const StatsPage = lazy(() => import('./pages/admin/Stats'));
const SettingsPage = lazy(() => import('./pages/admin/Settings'));
const AdvertisersDemoPage = lazy(() => import('./pages/admin/AdvertisersDemo'));
const CampaignsDemoPage = lazy(() => import('./pages/admin/CampaignsDemo'));
const OrdersDemoPage = lazy(() => import('./pages/admin/OrdersDemo'));
const StatsDemoPage = lazy(() => import('./pages/admin/StatsDemo'));

const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense fallback={<LoadingSpinner fullScreen />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Admin Login Route (standalone, no layout) */}
            <Route path="/admin/login" element={<AdminLoginPage />} />

            {/* Advertiser Routes */}
            <Route
              path="/advertiser"
              element={
                <ProtectedRoute allowedRoles={['advertiser']}>
                  <MainLayout role="advertiser">
                    <DashboardPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="campaigns" element={<CampaignListPage />} />
              <Route path="campaigns/create" element={<CampaignCreatePage />} />
              <Route path="campaigns/:id" element={<CampaignDetailPage />} />
              <Route path="campaigns/edit/:id" element={<CampaignCreatePage />} />
              <Route path="kols" element={<KolDiscoveryPage />} />
              <Route path="analytics" element={<DashboardPage />} />
              <Route path="recharge" element={<DashboardPage />} />
            </Route>

            {/* KOL Routes */}
            <Route
              path="/kol"
              element={
                <ProtectedRoute allowedRoles={['kol']}>
                  <MainLayout role="kol">
                    <KolDashboardPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<KolDashboard />} />
              <Route path="accounts" element={<AccountsPage />} />
              <Route path="task-market" element={<TaskMarketPage />} />
              <Route path="my-tasks" element={<MyTasksPage />} />
              <Route path="my-tasks/:id" element={<MyTasksPage />} />
              <Route path="earnings" element={<EarningsPage />} />
            </Route>

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedAdminRoute>
                  <AdminLayout>
                    <AdminDashboardPage />
                  </AdminLayout>
                </ProtectedAdminRoute>
              }
            >
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="kols" element={<KolsPage />} />
              <Route path="kol-review" element={<KolReviewPage />} />
              <Route path="content-review" element={<ContentReviewPage />} />
              <Route path="finance" element={<FinancePage />} />
              <Route path="stats" element={<StatsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="advertisers" element={<AdvertisersDemoPage />} />
              <Route path="campaigns" element={<CampaignsDemoPage />} />
              <Route path="orders" element={<OrdersDemoPage />} />
              <Route path="stats" element={<StatsDemoPage />} />
            </Route>

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default AppRouter;
