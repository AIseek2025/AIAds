import { Router } from 'express';
import { advertiserController } from '../controllers/advertisers.controller';
import { auth } from '../middleware/auth';
import { moderateRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// All advertiser routes require authentication
router.use(auth());

/**
 * @route   POST /api/v1/advertisers
 * @desc    Create advertiser profile
 * @access  Private (advertiser)
 */
router.post('/', moderateRateLimiter, advertiserController.createAdvertiser);

/**
 * @route   GET /api/v1/advertisers/me
 * @desc    Get current advertiser profile
 * @access  Private (advertiser)
 */
router.get('/me', advertiserController.getAdvertiser);

/**
 * @route   PUT /api/v1/advertisers/me
 * @desc    Update advertiser profile
 * @access  Private (advertiser)
 */
router.put('/me', moderateRateLimiter, advertiserController.updateAdvertiser);

/**
 * @route   POST /api/v1/advertisers/me/recharge
 * @desc    Recharge advertiser account
 * @access  Private (advertiser)
 */
router.post('/me/recharge', moderateRateLimiter, advertiserController.recharge);

/**
 * @route   GET /api/v1/advertisers/me/balance
 * @desc    Get advertiser balance
 * @access  Private (advertiser)
 */
router.get('/me/balance', advertiserController.getBalance);

/**
 * @route   GET /api/v1/advertisers/me/transactions
 * @desc    Get transaction history
 * @access  Private (advertiser)
 */
router.get('/me/transactions', advertiserController.getTransactions);

export default router;
