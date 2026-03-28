import { Router } from 'express';
import { kolsController } from '../controllers/kols.controller';
import { auth } from '../middleware/auth';
import { strictRateLimiter, moderateRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// All KOL routes require authentication
router.use(auth());

/**
 * @route   GET /api/v1/kols/recommend
 * @desc    活动维度 KOL 推荐（规则评分，须为活动所属广告主）
 * @access  Private (advertiser) — 须先于 /:id 注册
 */
router.get('/recommend', moderateRateLimiter, kolsController.recommendKols);

/**
 * @route   GET /api/v1/kols
 * @desc    发现页 KOL 列表（筛选 + 关键词）
 * @access  Private (advertiser | kol)
 */
router.get('/', moderateRateLimiter, kolsController.searchKols);

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
 * @route   GET /api/v1/kols/me/stats
 * @desc    KOL 仪表盘聚合统计
 * @access  Private (kol)
 */
router.get('/me/stats', kolsController.getMyStats);

/**
 * @route   GET /api/v1/kols/me/frequency
 * @desc    接单频次（滚动窗口内已接单次数 / 上限）
 * @access  Private (kol)
 */
router.get('/me/frequency', kolsController.getMyAcceptFrequency);

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
 * @route   GET /api/v1/kols/earnings/history
 * @desc    Paginated earnings / transaction history
 * @access  Private (kol)
 */
router.get('/earnings/history', kolsController.getEarningsHistory);

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

/**
 * @route   GET /api/v1/kols/:id
 * @desc    发现页单个 KOL 公开摘要（非敏感字段）
 * @access  Private (advertiser | kol) — 须置于固定路径之后，避免与 profile/me 等冲突
 */
router.get('/:id', moderateRateLimiter, kolsController.getKolDiscovery);

export default router;
