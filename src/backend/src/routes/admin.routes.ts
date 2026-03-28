import { Router } from 'express';
import { adminAuth, requirePermission, superAdminOnly } from '../middleware/adminAuth';
import { adminAuthController } from '../controllers/admin/auth.controller';
import { adminUsersController } from '../controllers/admin/users.controller';
import { adminKolsController } from '../controllers/admin/kols.controller';
import { adminContentController } from '../controllers/admin/content.controller';
import { adminFinanceController } from '../controllers/admin/finance.controller';
import { adminStatsController } from '../controllers/admin/stats.controller';
import { adminSettingsController } from '../controllers/admin/settings.controller';
import { adminDashboardController } from '../controllers/admin/dashboard.controller';
import { adminAdvertisersController } from '../controllers/admin/advertisers.controller';
import { adminCampaignsController } from '../controllers/admin/campaigns.controller';
import { adminOrdersController } from '../controllers/admin/orders.controller';
import { adminInviteCodesController } from '../controllers/admin/invite-codes.controller';

const router = Router();

// ============================================================================
// Public routes (no authentication required)
// ============================================================================

// Admin authentication
router.post('/auth/login', adminAuthController.login);

// ============================================================================
// Protected routes (authentication required)
// ============================================================================

// Admin auth routes
router.get('/auth/me', adminAuth, adminAuthController.me);
router.post('/auth/logout', adminAuth, adminAuthController.logout);
router.post('/auth/refresh', adminAuthController.refreshToken);
router.put('/auth/password', adminAuth, adminAuthController.changePassword);
router.post('/auth/reset-password', adminAuth, superAdminOnly, adminAuthController.resetPassword);

// MFA routes
router.post('/auth/mfa/generate', adminAuth, adminAuthController.generateMfa);
router.post('/auth/mfa/enable', adminAuth, adminAuthController.enableMfa);
router.post('/auth/mfa/verify', adminAuth, adminAuthController.verifyMfa);
router.post('/auth/mfa/disable', adminAuth, adminAuthController.disableMfa);

// ============================================================================
// User Management Routes
// ============================================================================
router.get('/users', adminAuth, requirePermission('user:view'), adminUsersController.getUserList);
router.get('/users/:id', adminAuth, requirePermission('user:view'), adminUsersController.getUserById);
router.put('/users/:id', adminAuth, requirePermission('user:edit'), adminUsersController.updateUser);
router.put('/users/:id/status', adminAuth, requirePermission('user:edit'), adminUsersController.updateUserStatus);
router.delete('/users/:id', adminAuth, superAdminOnly, adminUsersController.deleteUser);
router.get('/users/:id/activity', adminAuth, requirePermission('user:view'), adminUsersController.getUserActivity);
router.put('/users/:id/ban', adminAuth, requirePermission('user:ban'), adminUsersController.banUser);
router.put('/users/:id/unban', adminAuth, requirePermission('user:unban'), adminUsersController.unbanUser);
router.put('/users/:id/suspend', adminAuth, requirePermission('user:suspend'), adminUsersController.suspendUser);
router.post(
  '/users/:id/reset-password',
  adminAuth,
  requirePermission('user:reset_password'),
  adminUsersController.resetPassword
);

// ============================================================================
// KOL Management Routes
// ============================================================================
router.get('/kols/pending', adminAuth, requirePermission('kol:review'), adminKolsController.getPendingKols);
router.get('/kols', adminAuth, requirePermission('kol:view'), adminKolsController.getKolList);
router.get('/kols/:id', adminAuth, requirePermission('kol:view'), adminKolsController.getKolById);
router.put('/kols/:id/verify', adminAuth, requirePermission('kol:verify'), adminKolsController.verifyKol);
router.put('/kols/:id/rating', adminAuth, requirePermission('kol:verify'), adminKolsController.rateKol);
router.put('/kols/:id/blacklist', adminAuth, requirePermission('kol:blacklist'), adminKolsController.blacklistKol);
router.delete(
  '/kols/:id/blacklist',
  adminAuth,
  requirePermission('kol:blacklist'),
  adminKolsController.removeFromBlacklist
);
router.post('/kols/:id/approve', adminAuth, requirePermission('kol:approve'), adminKolsController.approveKol);
router.post('/kols/:id/reject', adminAuth, requirePermission('kol:reject'), adminKolsController.rejectKol);
router.post('/kols/:id/suspend', adminAuth, requirePermission('kol:suspend'), adminKolsController.suspendKol);
router.post('/kols/:id/unsuspend', adminAuth, requirePermission('kol:suspend'), adminKolsController.unsuspendKol);
router.post('/kols/:id/sync', adminAuth, requirePermission('kol:verify'), adminKolsController.syncKolData);

// ============================================================================
// Content Management Routes
// ============================================================================
router.get('/content/pending', adminAuth, requirePermission('content:view'), adminContentController.getPendingContent);
router.get('/content/history', adminAuth, requirePermission('content:view'), adminContentController.getReviewHistory);
router.get('/content', adminAuth, requirePermission('content:view'), adminContentController.getContentList);
router.get('/content/:id', adminAuth, requirePermission('content:view'), adminContentController.getContentById);
router.put('/content/:id/verify', adminAuth, requirePermission('content:review'), adminContentController.verifyContent);
router.post(
  '/content/:id/approve',
  adminAuth,
  requirePermission('content:approve'),
  adminContentController.approveContent
);
router.post(
  '/content/:id/reject',
  adminAuth,
  requirePermission('content:reject'),
  adminContentController.rejectContent
);
router.post(
  '/content/batch-verify',
  adminAuth,
  requirePermission('content:review'),
  adminContentController.batchVerify
);
router.delete('/content/:id', adminAuth, requirePermission('content:delete'), adminContentController.deleteContent);

// ============================================================================
// Finance Management Routes
// ============================================================================
router.get(
  '/finance/overview',
  adminAuth,
  requirePermission('finance:view'),
  adminFinanceController.getFinanceOverview
);
router.get('/finance/deposits', adminAuth, requirePermission('finance:view'), adminFinanceController.getDeposits);
router.get('/finance/withdrawals', adminAuth, requirePermission('finance:view'), adminFinanceController.getWithdrawals);
router.get(
  '/finance/withdrawals/pending',
  adminAuth,
  requirePermission('withdrawal:review'),
  adminFinanceController.getPendingWithdrawals
);
router.get(
  '/finance/withdrawals/:id',
  adminAuth,
  requirePermission('withdrawal:review'),
  adminFinanceController.getWithdrawalById
);
router.put(
  '/finance/withdrawals/:id/verify',
  adminAuth,
  requirePermission('withdrawal:review'),
  adminFinanceController.verifyWithdrawal
);
router.post(
  '/finance/withdrawals/:id/approve',
  adminAuth,
  requirePermission('withdrawal:approve'),
  adminFinanceController.approveWithdrawal
);
router.post(
  '/finance/withdrawals/:id/reject',
  adminAuth,
  requirePermission('withdrawal:reject'),
  adminFinanceController.rejectWithdrawal
);
router.get(
  '/finance/transactions',
  adminAuth,
  requirePermission('finance:view'),
  adminFinanceController.getTransactionList
);
router.get('/finance/export', adminAuth, requirePermission('finance:export'), adminFinanceController.exportFinance);
router.post(
  '/finance/recharge/confirm',
  adminAuth,
  requirePermission('recharge:confirm'),
  adminFinanceController.confirmRecharge
);
router.put('/finance/balance/adjust', adminAuth, superAdminOnly, adminFinanceController.adjustBalance);

// ============================================================================
// Statistics Routes
// ============================================================================
router.get('/stats/overview', adminAuth, requirePermission('dashboard:view'), adminStatsController.getOverview);
router.get('/stats/users', adminAuth, requirePermission('analytics:view'), adminStatsController.getUserStats);
router.get('/stats/campaigns', adminAuth, requirePermission('analytics:view'), adminStatsController.getCampaignStats);
router.get('/stats/revenue', adminAuth, requirePermission('analytics:view'), adminStatsController.getRevenueStats);
router.get('/stats/kols', adminAuth, requirePermission('analytics:view'), adminStatsController.getKolStats);
router.get('/stats/orders', adminAuth, requirePermission('analytics:view'), adminStatsController.getOrderStats);
router.get('/stats/content', adminAuth, requirePermission('analytics:view'), adminStatsController.getContentStats);
router.get('/stats/export', adminAuth, requirePermission('analytics:export'), adminStatsController.exportStats);
router.get('/stats/trends', adminAuth, requirePermission('analytics:view'), adminStatsController.getTrends);
router.get('/stats/comparison', adminAuth, requirePermission('analytics:view'), adminStatsController.getComparison);

// ============================================================================
// Settings Routes
// ============================================================================
router.get('/settings/system', adminAuth, requirePermission('settings:view'), adminSettingsController.getSystemConfig);
router.put(
  '/settings/system',
  adminAuth,
  requirePermission('settings:edit'),
  adminSettingsController.updateSystemConfig
);

router.get('/invite-codes', adminAuth, requirePermission('settings:view'), adminInviteCodesController.list);
router.post('/invite-codes', adminAuth, requirePermission('settings:edit'), adminInviteCodesController.create);
router.patch('/invite-codes/:id', adminAuth, requirePermission('settings:edit'), adminInviteCodesController.patch);

// Admin management
router.get('/settings/admins', adminAuth, superAdminOnly, adminSettingsController.getAdminList);
router.post('/settings/admins', adminAuth, superAdminOnly, adminSettingsController.createAdmin);
router.get('/settings/admins/:id', adminAuth, superAdminOnly, adminSettingsController.getAdminById);
router.put('/settings/admins/:id', adminAuth, superAdminOnly, adminSettingsController.updateAdmin);
router.delete('/settings/admins/:id', adminAuth, superAdminOnly, adminSettingsController.deleteAdmin);

// Role management
router.get('/settings/roles', adminAuth, superAdminOnly, adminSettingsController.getRoleList);
router.post('/settings/roles', adminAuth, superAdminOnly, adminSettingsController.createRole);
router.put('/settings/roles/:id', adminAuth, superAdminOnly, adminSettingsController.updateRole);
router.delete('/settings/roles/:id', adminAuth, superAdminOnly, adminSettingsController.deleteRole);

// Audit logs
router.get(
  '/settings/audit-logs',
  adminAuth,
  requirePermission('settings:audit:view'),
  adminSettingsController.getAuditLogs
);
router.get('/settings/audit-logs/export', adminAuth, superAdminOnly, adminSettingsController.exportAuditLogs);

// System monitor
router.get(
  '/settings/system-monitor',
  adminAuth,
  requirePermission('settings:view'),
  adminSettingsController.getSystemMonitor
);

// Sensitive words
router.get(
  '/settings/sensitive-words',
  adminAuth,
  requirePermission('settings:view'),
  adminSettingsController.getSensitiveWords
);
router.post(
  '/settings/sensitive-words',
  adminAuth,
  requirePermission('settings:edit'),
  adminSettingsController.addSensitiveWord
);
router.delete(
  '/settings/sensitive-words/:id',
  adminAuth,
  requirePermission('settings:edit'),
  adminSettingsController.deleteSensitiveWord
);

// Backup management
router.post('/settings/backup/create', adminAuth, superAdminOnly, adminSettingsController.createBackup);
router.get('/settings/backup/list', adminAuth, superAdminOnly, adminSettingsController.getBackupList);
router.post('/settings/backup/restore', adminAuth, superAdminOnly, adminSettingsController.restoreBackup);

// ============================================================================
// Dashboard Routes
// ============================================================================
router.get('/dashboard/stats', adminAuth, requirePermission('dashboard:view'), adminDashboardController.getStats);
router.get(
  '/dashboard/analytics',
  adminAuth,
  requirePermission('analytics:view'),
  adminDashboardController.getAnalytics
);
router.get(
  '/dashboard/kol-rankings',
  adminAuth,
  requirePermission('dashboard:view'),
  adminDashboardController.getKolRankings
);
router.get(
  '/dashboard/kol-frequency-policy',
  adminAuth,
  requirePermission('dashboard:view'),
  adminDashboardController.getKolFrequencyPolicy
);

// ============================================================================
// Advertiser Management Routes
// ============================================================================
router.get(
  '/advertisers',
  adminAuth,
  requirePermission('advertiser:view'),
  adminAdvertisersController.getAdvertiserList
);
router.get(
  '/advertisers/:id',
  adminAuth,
  requirePermission('advertiser:view'),
  adminAdvertisersController.getAdvertiserById
);
router.put(
  '/advertisers/:id/verify',
  adminAuth,
  requirePermission('advertiser:verify'),
  adminAdvertisersController.verifyAdvertiser
);
router.get(
  '/advertisers/:id/recharges',
  adminAuth,
  requirePermission('finance:view'),
  adminAdvertisersController.getRechargeRecords
);
router.get(
  '/advertisers/:id/consumptions',
  adminAuth,
  requirePermission('finance:view'),
  adminAdvertisersController.getConsumptionRecords
);
router.put(
  '/advertisers/:id/balance',
  adminAuth,
  requirePermission('finance:adjustment'),
  adminAdvertisersController.adjustBalance
);
router.put(
  '/advertisers/:id/freeze',
  adminAuth,
  requirePermission('advertiser:freeze'),
  adminAdvertisersController.freezeAccount
);
router.put(
  '/advertisers/:id/unfreeze',
  adminAuth,
  requirePermission('advertiser:unfreeze'),
  adminAdvertisersController.unfreezeAccount
);

// ============================================================================
// Campaign Management Routes
// ============================================================================
router.get('/campaigns', adminAuth, requirePermission('campaign:view'), adminCampaignsController.getCampaignList);
router.get(
  '/campaigns/budget-risks',
  adminAuth,
  requirePermission('campaign:view'),
  adminCampaignsController.getBudgetRiskCampaigns
);
router.get(
  '/campaigns/abnormal',
  adminAuth,
  requirePermission('campaign:view'),
  adminCampaignsController.getAbnormalCampaigns
);
router.get('/campaigns/:id', adminAuth, requirePermission('campaign:view'), adminCampaignsController.getCampaignById);
router.put(
  '/campaigns/:id/verify',
  adminAuth,
  requirePermission('campaign:review'),
  adminCampaignsController.verifyCampaign
);
router.put(
  '/campaigns/:id/status',
  adminAuth,
  requirePermission('campaign:manage'),
  adminCampaignsController.updateCampaignStatus
);
router.get(
  '/campaigns/:id/stats',
  adminAuth,
  requirePermission('campaign:view'),
  adminCampaignsController.getCampaignStats
);

// ============================================================================
// Order Management Routes（具体路径须先于 /orders/:id，避免 disputes 等被当成 id）
// ============================================================================
router.get('/orders', adminAuth, requirePermission('order:view'), adminOrdersController.getOrderList);
router.get('/orders/disputes', adminAuth, requirePermission('order:dispute'), adminOrdersController.getDisputeOrders);
router.post('/orders/export', adminAuth, requirePermission('order:export'), adminOrdersController.exportOrders);
router.put(
  '/orders/metrics/batch',
  adminAuth,
  requirePermission('order:manage'),
  adminOrdersController.batchUpdateOrderMetrics
);
router.put(
  '/orders/:id/metrics',
  adminAuth,
  requirePermission('order:manage'),
  adminOrdersController.updateOrderMetrics
);
router.get('/orders/:id', adminAuth, requirePermission('order:view'), adminOrdersController.getOrderById);
router.put('/orders/:id/status', adminAuth, requirePermission('order:manage'), adminOrdersController.updateOrderStatus);
router.put('/orders/:id/dispute', adminAuth, requirePermission('order:dispute'), adminOrdersController.handleDispute);

export default router;
