/**
 * Integrations Routes
 *
 * Routes for third-party integrations including TikTok, YouTube, and Instagram.
 */

import { Router } from 'express';
import { integrationsController } from '../controllers/integrations.controller';
import { auth } from '../middleware/auth';
import { strictRateLimiter, moderateRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// ============================================================================
// TikTok OAuth Routes
// ============================================================================

/**
 * @route   GET /api/v1/integrations/tiktok/auth
 * @desc    Get TikTok OAuth authorization URL
 * @access  Private (kol)
 */
router.get('/tiktok/auth', auth(), moderateRateLimiter, integrationsController.getTikTokAuthUrl);

/**
 * @route   GET /api/v1/integrations/tiktok/callback
 * @desc    TikTok OAuth callback handler
 * @access  Public (callback from TikTok)
 */
router.get('/tiktok/callback', integrationsController.handleTikTokCallback);

// ============================================================================
// TikTok Management Routes
// ============================================================================

/**
 * @route   GET /api/v1/integrations/tiktok/status
 * @desc    Get TikTok integration status
 * @access  Private (kol)
 */
router.get('/tiktok/status', auth(), integrationsController.getTikTokStatus);

/**
 * @route   POST /api/v1/kols/connect/tiktok
 * @desc    Connect/bind TikTok account (returns OAuth URL)
 * @access  Private (kol)
 */
router.post('/kols/connect/tiktok', auth(), moderateRateLimiter, integrationsController.connectTikTok);

/**
 * @route   POST /api/v1/kols/tiktok/sync
 * @desc    Manually sync TikTok data
 * @access  Private (kol)
 */
router.post('/kols/tiktok/sync', auth(), strictRateLimiter, integrationsController.syncTikTokData);

/**
 * @route   DELETE /api/v1/kols/tiktok/disconnect
 * @desc    Disconnect TikTok account
 * @access  Private (kol)
 */
router.delete('/kols/tiktok/disconnect', auth(), strictRateLimiter, integrationsController.disconnectTikTok);

// ============================================================================
// TikTok Admin Routes
// ============================================================================

/**
 * @route   GET /api/v1/integrations/tiktok/stats
 * @desc    Get TikTok sync job statistics
 * @access  Private (admin)
 */
router.get('/tiktok/stats', auth(), integrationsController.getTikTokSyncStats);

// ============================================================================
// YouTube OAuth Routes
// ============================================================================

/**
 * @route   GET /api/v1/integrations/youtube/auth
 * @desc    Get YouTube OAuth authorization URL
 * @access  Private (kol)
 */
router.get('/youtube/auth', auth(), moderateRateLimiter, integrationsController.getYouTubeAuthUrl);

/**
 * @route   GET /api/v1/integrations/youtube/callback
 * @desc    YouTube OAuth callback handler
 * @access  Public (callback from YouTube)
 */
router.get('/youtube/callback', integrationsController.handleYouTubeCallback);

// ============================================================================
// YouTube Management Routes
// ============================================================================

/**
 * @route   GET /api/v1/integrations/youtube/status
 * @desc    Get YouTube integration status
 * @access  Private (kol)
 */
router.get('/youtube/status', auth(), integrationsController.getYouTubeStatus);

/**
 * @route   POST /api/v1/kols/connect/youtube
 * @desc    Connect/bind YouTube account (returns OAuth URL)
 * @access  Private (kol)
 */
router.post('/kols/connect/youtube', auth(), moderateRateLimiter, integrationsController.connectYouTube);

/**
 * @route   POST /api/v1/kols/youtube/sync
 * @desc    Manually sync YouTube data
 * @access  Private (kol)
 */
router.post('/kols/youtube/sync', auth(), strictRateLimiter, integrationsController.syncYouTubeData);

/**
 * @route   DELETE /api/v1/kols/youtube/disconnect
 * @desc    Disconnect YouTube account
 * @access  Private (kol)
 */
router.delete('/kols/youtube/disconnect', auth(), strictRateLimiter, integrationsController.disconnectYouTube);

// ============================================================================
// Instagram OAuth Routes
// ============================================================================

/**
 * @route   GET /api/v1/integrations/instagram/auth
 * @desc    Get Instagram OAuth authorization URL
 * @access  Private (kol)
 */
router.get('/instagram/auth', auth(), moderateRateLimiter, integrationsController.getInstagramAuthUrl);

/**
 * @route   GET /api/v1/integrations/instagram/callback
 * @desc    Instagram OAuth callback handler
 * @access  Public (callback from Instagram)
 */
router.get('/instagram/callback', integrationsController.handleInstagramCallback);

// ============================================================================
// Instagram Management Routes
// ============================================================================

/**
 * @route   GET /api/v1/integrations/instagram/status
 * @desc    Get Instagram integration status
 * @access  Private (kol)
 */
router.get('/instagram/status', auth(), integrationsController.getInstagramStatus);

/**
 * @route   POST /api/v1/kols/connect/instagram
 * @desc    Connect/bind Instagram account (returns OAuth URL)
 * @access  Private (kol)
 */
router.post('/kols/connect/instagram', auth(), moderateRateLimiter, integrationsController.connectInstagram);

/**
 * @route   POST /api/v1/kols/instagram/sync
 * @desc    Manually sync Instagram data
 * @access  Private (kol)
 */
router.post('/kols/instagram/sync', auth(), strictRateLimiter, integrationsController.syncInstagramData);

/**
 * @route   DELETE /api/v1/kols/instagram/disconnect
 * @desc    Disconnect Instagram account
 * @access  Private (kol)
 */
router.delete('/kols/instagram/disconnect', auth(), strictRateLimiter, integrationsController.disconnectInstagram);

export default router;
