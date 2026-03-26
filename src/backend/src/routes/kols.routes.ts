import { Router } from 'express';
import { kolsController } from '../controllers/kols.controller';
import { auth } from '../middleware/auth';
import { strictRateLimiter, moderateRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// All KOL routes require authentication
router.use(auth());

/**
 * @route   POST /api/v1/kols/profile
 * @desc    Create KOL profile
 * @access  Private (kol)
 */
router.post('/profile', moderateRateLimiter, kolsController.createProfile);

/**
 * @route   GET /api/v1/kols/me
 * @desc    Get current KOL profile
 * @access  Private (kol)
 */
router.get('/me', kolsController.getProfile);

/**
 * @route   PUT /api/v1/kols/me
 * @desc    Update KOL profile
 * @access  Private (kol)
 */
router.put('/me', moderateRateLimiter, kolsController.updateProfile);

/**
 * @route   POST /api/v1/kols/connect/:platform
 * @desc    Bind social account (tiktok/youtube/instagram/xiaohongshu/weibo)
 * @access  Private (kol)
 */
router.post('/connect/:platform', moderateRateLimiter, kolsController.bindAccount);

/**
 * @route   GET /api/v1/kols/accounts
 * @desc    Get bound accounts list
 * @access  Private (kol)
 */
router.get('/accounts', kolsController.getAccounts);

/**
 * @route   DELETE /api/v1/kols/accounts/:id
 * @desc    Unbind account
 * @access  Private (kol)
 */
router.delete('/accounts/:id', strictRateLimiter, kolsController.unbindAccount);

/**
 * @route   POST /api/v1/kols/sync
 * @desc    Sync KOL data (followers, engagement rate, etc.)
 * @access  Private (kol)
 */
router.post('/sync', moderateRateLimiter, kolsController.syncData);

/**
 * @route   GET /api/v1/kols/earnings
 * @desc    Get earnings summary
 * @access  Private (kol)
 */
router.get('/earnings', kolsController.getEarnings);

/**
 * @route   GET /api/v1/kols/balance
 * @desc    Get available balance
 * @access  Private (kol)
 */
router.get('/balance', kolsController.getBalance);

/**
 * @route   POST /api/v1/kols/withdraw
 * @desc    Request withdrawal
 * @access  Private (kol)
 */
router.post('/withdraw', strictRateLimiter, kolsController.withdraw);

/**
 * @route   GET /api/v1/kols/withdrawals
 * @desc    Get withdrawal history
 * @access  Private (kol)
 */
router.get('/withdrawals', kolsController.getWithdrawals);

export default router;
