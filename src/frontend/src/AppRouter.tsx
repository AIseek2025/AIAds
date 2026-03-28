import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage } from './pages/auth';
import ProtectedRoute from './components/ProtectedRoute';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';
import { MainLayout } from './components/layout';
import AdminLayout from './components/layout/AdminLayout';
import ErrorBoundary from './components/common/ErrorBoundary';
import Loading from './components/common/Loading';
import {
  APP_PATHS,
  ADVERTISER_ROUTE_SEG,
  KOL_ROUTE_SEG,
  ADMIN_ROUTE_SEG,
  pathAdmin,
  pathAdminProfile,
  pathAdminFinanceWithdrawals,
  pathForgotPasswordFromAdmin,
} from './constants/appPaths';

// P2 Performance: Route-level code splitting with lazy loading
// Advertiser routes
const DashboardPage = lazy(() => import('./pages/advertiser/Dashboard'));
const CampaignListPage = lazy(() => import('./pages/advertiser/CampaignList'));
const CampaignCreatePage = lazy(() => import('./pages/advertiser/CampaignCreate'));
const CampaignDetailPage = lazy(() => import('./pages/advertiser/CampaignDetail'));
const KolDiscoveryPage = lazy(() => import('./pages/advertiser/KolDiscovery'));
const RechargePage = lazy(() => import('./pages/advertiser/Recharge'));
const AdvertiserAnalyticsPage = lazy(() => import('./pages/advertiser/Analytics'));
const AdvertiserOrderListPage = lazy(() => import('./pages/advertiser/AdvertiserOrderList'));
const AdvertiserOrderDetailPage = lazy(() => import('./pages/advertiser/AdvertiserOrderDetail'));
const NotificationsPage = lazy(() => import('./pages/notifications/NotificationsPage'));

// KOL routes
const KolDashboard = lazy(() => import('./pages/kol/Dashboard'));
const AccountsPage = lazy(() => import('./pages/kol/Accounts'));
const TaskMarketPage = lazy(() => import('./pages/kol/TaskMarket'));
const TaskMarketDetailPage = lazy(() => import('./pages/kol/TaskMarketDetail'));
const MyTasksPage = lazy(() => import('./pages/kol/MyTasks'));
const MyTaskDetailPage = lazy(() => import('./pages/kol/MyTaskDetail'));
const EarningsPage = lazy(() => import('./pages/kol/Earnings'));
const KolAnalyticsPage = lazy(() => import('./pages/kol/Analytics'));
const KolProfilePage = lazy(() => import('./pages/kol/KolProfile'));

// Admin routes
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminOpsNotificationsPage = lazy(() => import('./pages/admin/AdminOpsNotificationsPage'));
const AdminLoginPage = lazy(() => import('./pages/admin/Login'));
const UsersPage = lazy(() => import('./pages/admin/Users'));
const KolsPage = lazy(() => import('./pages/admin/Kols'));
const KolReviewPage = lazy(() => import('./pages/admin/KolReview'));
const ContentReviewPage = lazy(() => import('./pages/admin/ContentReview'));
const FinancePage = lazy(() => import('./pages/admin/Finance'));
const StatsPage = lazy(() => import('./pages/admin/Stats'));
const SettingsPage = lazy(() => import('./pages/admin/Settings'));
const AdminAdvertisersPage = lazy(() => import('./pages/admin/Advertisers'));
const AdminAdvertiserDetailPage = lazy(() => import('./pages/admin/AdminAdvertiserDetail'));
const AdminCampaignsPage = lazy(() => import('./pages/admin/Campaigns'));
const AdminCampaignAnomaliesPage = lazy(() => import('./pages/admin/AdminCampaignAnomalies'));
const AdminCampaignDetailPage = lazy(() => import('./pages/admin/AdminCampaignDetail'));
const AdminOrdersPage = lazy(() => import('./pages/admin/Orders'));
const AdminInviteCodesPage = lazy(() => import('./pages/admin/AdminInviteCodes'));
const AdminProfilePage = lazy(() => import('./pages/admin/AdminProfile'));

const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense fallback={<Loading open={true} message="页面加载中..." />}>
          <Routes>
            {/* Public Routes */}
            <Route path={APP_PATHS.login} element={<LoginPage />} />
            <Route path={APP_PATHS.register} element={<RegisterPage />} />
            <Route path={APP_PATHS.forgotPassword} element={<ForgotPasswordPage />} />
            <Route path={APP_PATHS.resetPassword} element={<ResetPasswordPage />} />

            {/* Admin Login Route (standalone, no layout) */}
            <Route path={APP_PATHS.adminLogin} element={<AdminLoginPage />} />
            <Route
              path={pathAdmin(ADMIN_ROUTE_SEG.forgotPassword)}
              element={<Navigate to={pathForgotPasswordFromAdmin()} replace />}
            />
            <Route
              path={pathAdmin(ADMIN_ROUTE_SEG.changePassword)}
              element={<Navigate to={pathAdminProfile()} replace />}
            />
            <Route
              path={pathAdmin(ADMIN_ROUTE_SEG.financeWithdrawals)}
              element={<Navigate to={pathAdminFinanceWithdrawals()} replace />}
            />

            {/* Advertiser Routes */}
            <Route
              path="/advertiser"
              element={
                <ProtectedRoute allowedRoles={['advertiser']}>
                  <MainLayout role="advertiser" />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to={ADVERTISER_ROUTE_SEG.dashboard} replace />} />
              <Route path={ADVERTISER_ROUTE_SEG.dashboard} element={<DashboardPage />} />
              <Route path={ADVERTISER_ROUTE_SEG.campaigns} element={<CampaignListPage />} />
              <Route path={ADVERTISER_ROUTE_SEG.campaignsCreate} element={<CampaignCreatePage />} />
              <Route path={ADVERTISER_ROUTE_SEG.campaignById} element={<CampaignDetailPage />} />
              <Route path={ADVERTISER_ROUTE_SEG.campaignEditById} element={<CampaignCreatePage />} />
              <Route path={ADVERTISER_ROUTE_SEG.orderById} element={<AdvertiserOrderDetailPage />} />
              <Route path={ADVERTISER_ROUTE_SEG.orders} element={<AdvertiserOrderListPage />} />
              <Route path={ADVERTISER_ROUTE_SEG.kols} element={<KolDiscoveryPage />} />
              <Route path={ADVERTISER_ROUTE_SEG.analytics} element={<AdvertiserAnalyticsPage />} />
              <Route path={ADVERTISER_ROUTE_SEG.recharge} element={<RechargePage />} />
              <Route path={ADVERTISER_ROUTE_SEG.notifications} element={<NotificationsPage />} />
            </Route>

            {/* KOL Routes */}
            <Route
              path="/kol"
              element={
                <ProtectedRoute allowedRoles={['kol']}>
                  <MainLayout role="kol" />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to={KOL_ROUTE_SEG.dashboard} replace />} />
              <Route path={KOL_ROUTE_SEG.dashboard} element={<KolDashboard />} />
              <Route path={KOL_ROUTE_SEG.profile} element={<KolProfilePage />} />
              <Route path={KOL_ROUTE_SEG.accounts} element={<AccountsPage />} />
              <Route path={KOL_ROUTE_SEG.taskMarketById} element={<TaskMarketDetailPage />} />
              <Route path={KOL_ROUTE_SEG.taskMarket} element={<TaskMarketPage />} />
              <Route path={KOL_ROUTE_SEG.myTasksById} element={<MyTaskDetailPage />} />
              <Route path={KOL_ROUTE_SEG.myTasks} element={<MyTasksPage />} />
              <Route path={KOL_ROUTE_SEG.earnings} element={<EarningsPage />} />
              <Route path={KOL_ROUTE_SEG.analytics} element={<KolAnalyticsPage />} />
              <Route path={KOL_ROUTE_SEG.notifications} element={<NotificationsPage />} />
            </Route>

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedAdminRoute>
                  <AdminLayout />
                </ProtectedAdminRoute>
              }
            >
              <Route index element={<Navigate to={ADMIN_ROUTE_SEG.dashboard} replace />} />
              <Route path={ADMIN_ROUTE_SEG.dashboard} element={<AdminDashboard />} />
              <Route path={ADMIN_ROUTE_SEG.profile} element={<AdminProfilePage />} />
              <Route path={ADMIN_ROUTE_SEG.notifications} element={<AdminOpsNotificationsPage />} />
              <Route path={ADMIN_ROUTE_SEG.users} element={<UsersPage />} />
              <Route path={ADMIN_ROUTE_SEG.kols} element={<KolsPage />} />
              <Route path={ADMIN_ROUTE_SEG.kolReview} element={<KolReviewPage />} />
              <Route path={ADMIN_ROUTE_SEG.contentReview} element={<ContentReviewPage />} />
              <Route path={ADMIN_ROUTE_SEG.finance} element={<FinancePage />} />
              <Route path={ADMIN_ROUTE_SEG.stats} element={<StatsPage />} />
              <Route path={ADMIN_ROUTE_SEG.settings} element={<SettingsPage />} />
              <Route path={ADMIN_ROUTE_SEG.advertisers} element={<AdminAdvertisersPage />} />
              <Route path={ADMIN_ROUTE_SEG.advertiserById} element={<AdminAdvertiserDetailPage />} />
              <Route path={ADMIN_ROUTE_SEG.campaigns} element={<AdminCampaignsPage />} />
              <Route path={ADMIN_ROUTE_SEG.campaignAnomalies} element={<AdminCampaignAnomaliesPage />} />
              <Route path={ADMIN_ROUTE_SEG.campaignById} element={<AdminCampaignDetailPage />} />
              <Route path={ADMIN_ROUTE_SEG.orders} element={<AdminOrdersPage />} />
              <Route path={ADMIN_ROUTE_SEG.inviteCodes} element={<AdminInviteCodesPage />} />
            </Route>

            {/* Default redirect */}
            <Route path="/" element={<Navigate to={APP_PATHS.login} replace />} />
            <Route path="*" element={<Navigate to={APP_PATHS.login} replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default AppRouter;
