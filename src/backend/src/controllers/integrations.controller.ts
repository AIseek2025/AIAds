/**
 * Integrations Controller
 *
 * Handles third-party integration endpoints including TikTok, YouTube,
 * and Instagram OAuth and data synchronization.
 */

import { Request, Response } from 'express';
import { asyncHandler, errors, ApiError } from '../middleware/errorHandler';
import { tiktokService } from '../services/tiktok.service';
import { tiktokSyncService } from '../services/tiktok-sync.service';
import { youtubeService } from '../services/youtube.service';
import { youtubeSyncService } from '../services/youtube-sync.service';
import { instagramService } from '../services/instagram.service';
import { instagramSyncService } from '../services/instagram-sync.service';
import { kolService } from '../services/kols.service';
import { ApiResponse } from '../types';
import { TikTokIntegrationStatus, TikTokSyncResult } from '../services/tiktok.types';
import { YouTubeIntegrationStatus, YouTubeSyncResult } from '../services/youtube.types';
import { InstagramIntegrationStatus, InstagramSyncResult } from '../services/instagram.types';

export class IntegrationsController {
  /**
   * GET /api/v1/integrations/tiktok/auth
   * Get TikTok OAuth authorization URL
   */
  getTikTokAuthUrl = asyncHandler(async (req: Request, res: Response) => {
    // Check if user is authenticated
    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    // Get user's KOL profile
    const kol = await kolService.getKolByUserId(userId);
    if (!kol) {
      throw errors.notFound('请先创建 KOL 资料');
    }

    // Generate OAuth URL
    const { authUrl, state } = await tiktokService.getAuthUrl();

    // Store state in session for validation (using Redis or memory)
    // For now, we'll include it in the response
    // In production, store in Redis with expiration
    const response: ApiResponse<{ auth_url: string; state: string }> = {
      success: true,
      data: {
        auth_url: authUrl,
        state,
      },
      message: '请前往 TikTok 授权',
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/integrations/tiktok/callback
   * TikTok OAuth callback handler
   */
  handleTikTokCallback = asyncHandler(async (req: Request, res: Response) => {
    const { code, state } = req.query;

    if (!code || typeof code !== 'string') {
      throw errors.badRequest('缺少授权码');
    }

    if (!state || typeof state !== 'string') {
      throw errors.badRequest('缺少状态参数');
    }

    // In production, validate state against stored value
    // For now, we'll skip this validation

    // Get KOL from query or session (passed from frontend)
    const kolId = req.query.kol_id as string;
    if (!kolId) {
      // Redirect to error page
      return res.redirect('/kol/settings?tiktok=error&message=缺少 KOL ID');
    }

    // Handle callback and save token
    const result = await tiktokService.handleCallback({ code, state }, kolId);

    if (result.success) {
      // Redirect to frontend success page
      return res.redirect(result.redirectUrl);
    } else {
      // Redirect to frontend error page
      return res.redirect(result.redirectUrl);
    }
  });

  /**
   * GET /api/v1/integrations/tiktok/status
   * Get TikTok integration status
   */
  getTikTokStatus = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const kol = await kolService.getKolByUserId(userId);
    if (!kol) {
      throw errors.notFound('请先创建 KOL 资料');
    }

    const status: TikTokIntegrationStatus = await tiktokService.getIntegrationStatus(kol.id);

    const response: ApiResponse<TikTokIntegrationStatus> = {
      success: true,
      data: status,
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/kols/tiktok/sync
   * Manually sync TikTok data
   */
  syncTikTokData = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const kol = await kolService.getKolByUserId(userId);
    if (!kol) {
      throw errors.notFound('请先创建 KOL 资料');
    }

    const { full_sync } = req.body;
    const fullSync = full_sync === true;

    const result: TikTokSyncResult = await tiktokSyncService.syncKol(kol.id, fullSync);

    if (!result.success) {
      throw new ApiError(result.error || '数据同步失败', 500, 'TIKTOK_SYNC_ERROR');
    }

    const response: ApiResponse<{
      success: boolean;
      synced_at: string;
      username?: string;
      followers?: number;
    }> = {
      success: true,
      data: {
        success: result.success,
        synced_at: result.syncedAt.toISOString(),
        username: result.userInfo?.username,
        followers: result.userInfo?.followerCount,
      },
      message: '数据同步成功',
    };

    res.status(200).json(response);
  });

  /**
   * DELETE /api/v1/kols/tiktok/disconnect
   * Disconnect TikTok account
   */
  disconnectTikTok = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const kol = await kolService.getKolByUserId(userId);
    if (!kol) {
      throw errors.notFound('请先创建 KOL 资料');
    }

    await tiktokService.disconnectAccount(kol.id);

    const response: ApiResponse = {
      success: true,
      message: 'TikTok 账号已解绑',
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/integrations/tiktok/stats
   * Get sync job statistics (admin only)
   */
  getTikTokSyncStats = asyncHandler(async (req: Request, res: Response) => {
    // Check if admin
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      throw errors.forbidden('需要管理员权限');
    }

    const stats = await tiktokSyncService.getJobStats();

    const response: ApiResponse<typeof stats> = {
      success: true,
      data: stats,
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/kols/connect/tiktok
   * Bind TikTok account (alternative endpoint for consistency)
   * This endpoint expects the OAuth flow to be completed first
   */
  connectTikTok = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const kol = await kolService.getKolByUserId(userId);
    if (!kol) {
      throw errors.notFound('请先创建 KOL 资料');
    }

    // Check if already connected
    const status = await tiktokService.getIntegrationStatus(kol.id);
    if (status.isConnected && !status.needsReauth) {
      throw new ApiError('TikTok 账号已连接', 409, 'ALREADY_CONNECTED');
    }

    // Get auth URL for the user to complete OAuth
    const { authUrl } = await tiktokService.getAuthUrl();

    const response: ApiResponse<{ auth_url: string }> = {
      success: true,
      data: {
        auth_url: authUrl,
      },
      message: '请前往 TikTok 完成授权',
    };

    res.status(200).json(response);
  });

  // ============================================================================
  // YouTube Endpoints
  // ============================================================================

  /**
   * GET /api/v1/integrations/youtube/auth
   * Get YouTube OAuth authorization URL
   */
  getYouTubeAuthUrl = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const kol = await kolService.getKolByUserId(userId);
    if (!kol) {
      throw errors.notFound('请先创建 KOL 资料');
    }

    const { authUrl, state } = await youtubeService.getAuthUrl();

    const response: ApiResponse<{ auth_url: string; state: string }> = {
      success: true,
      data: {
        auth_url: authUrl,
        state,
      },
      message: '请前往 YouTube 授权',
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/integrations/youtube/callback
   * YouTube OAuth callback handler
   */
  handleYouTubeCallback = asyncHandler(async (req: Request, res: Response) => {
    const { code, state } = req.query;

    if (!code || typeof code !== 'string') {
      throw errors.badRequest('缺少授权码');
    }

    const kolId = req.query.kol_id as string;
    if (!kolId) {
      return res.redirect('/kol/settings?youtube=error&message=缺少 KOL ID');
    }

    const result = await youtubeService.handleCallback({ code, state: state as string | undefined }, kolId);

    if (result.success) {
      return res.redirect(result.redirectUrl);
    } else {
      return res.redirect(result.redirectUrl);
    }
  });

  /**
   * GET /api/v1/integrations/youtube/status
   * Get YouTube integration status
   */
  getYouTubeStatus = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const kol = await kolService.getKolByUserId(userId);
    if (!kol) {
      throw errors.notFound('请先创建 KOL 资料');
    }

    const status: YouTubeIntegrationStatus = await youtubeService.getIntegrationStatus(kol.id);

    const response: ApiResponse<YouTubeIntegrationStatus> = {
      success: true,
      data: status,
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/kols/youtube/sync
   * Manually sync YouTube data
   */
  syncYouTubeData = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const kol = await kolService.getKolByUserId(userId);
    if (!kol) {
      throw errors.notFound('请先创建 KOL 资料');
    }

    const { full_sync } = req.body;
    const fullSync = full_sync === true;

    const result: YouTubeSyncResult = await youtubeSyncService.syncKol(kol.id, fullSync);

    if (!result.success) {
      throw new ApiError(result.error || '数据同步失败', 500, 'YOUTUBE_SYNC_ERROR');
    }

    const response: ApiResponse<{
      success: boolean;
      synced_at: string;
      username?: string;
      subscribers?: number;
    }> = {
      success: true,
      data: {
        success: result.success,
        synced_at: result.syncedAt.toISOString(),
        username: result.channelInfo?.title,
        subscribers: result.channelInfo?.subscriberCount,
      },
      message: '数据同步成功',
    };

    res.status(200).json(response);
  });

  /**
   * DELETE /api/v1/kols/youtube/disconnect
   * Disconnect YouTube account
   */
  disconnectYouTube = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const kol = await kolService.getKolByUserId(userId);
    if (!kol) {
      throw errors.notFound('请先创建 KOL 资料');
    }

    await youtubeService.disconnectAccount(kol.id);

    const response: ApiResponse = {
      success: true,
      message: 'YouTube 账号已解绑',
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/kols/connect/youtube
   * Bind YouTube account
   */
  connectYouTube = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const kol = await kolService.getKolByUserId(userId);
    if (!kol) {
      throw errors.notFound('请先创建 KOL 资料');
    }

    const status = await youtubeService.getIntegrationStatus(kol.id);
    if (status.isConnected && !status.needsReauth) {
      throw new ApiError('YouTube 账号已连接', 409, 'ALREADY_CONNECTED');
    }

    const { authUrl } = await youtubeService.getAuthUrl();

    const response: ApiResponse<{ auth_url: string }> = {
      success: true,
      data: {
        auth_url: authUrl,
      },
      message: '请前往 YouTube 完成授权',
    };

    res.status(200).json(response);
  });

  // ============================================================================
  // Instagram Endpoints
  // ============================================================================

  /**
   * GET /api/v1/integrations/instagram/auth
   * Get Instagram OAuth authorization URL
   */
  getInstagramAuthUrl = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const kol = await kolService.getKolByUserId(userId);
    if (!kol) {
      throw errors.notFound('请先创建 KOL 资料');
    }

    const { authUrl, state } = await instagramService.getAuthUrl();

    const response: ApiResponse<{ auth_url: string; state: string }> = {
      success: true,
      data: {
        auth_url: authUrl,
        state,
      },
      message: '请前往 Instagram 授权',
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/v1/integrations/instagram/callback
   * Instagram OAuth callback handler
   */
  handleInstagramCallback = asyncHandler(async (req: Request, res: Response) => {
    const { code, state } = req.query;

    if (!code || typeof code !== 'string') {
      throw errors.badRequest('缺少授权码');
    }

    const kolId = req.query.kol_id as string;
    if (!kolId) {
      return res.redirect('/kol/settings?instagram=error&message=缺少 KOL ID');
    }

    const result = await instagramService.handleCallback({ code, state: state as string | undefined }, kolId);

    if (result.success) {
      return res.redirect(result.redirectUrl);
    } else {
      return res.redirect(result.redirectUrl);
    }
  });

  /**
   * GET /api/v1/integrations/instagram/status
   * Get Instagram integration status
   */
  getInstagramStatus = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const kol = await kolService.getKolByUserId(userId);
    if (!kol) {
      throw errors.notFound('请先创建 KOL 资料');
    }

    const status: InstagramIntegrationStatus = await instagramService.getIntegrationStatus(kol.id);

    const response: ApiResponse<InstagramIntegrationStatus> = {
      success: true,
      data: status,
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/kols/instagram/sync
   * Manually sync Instagram data
   */
  syncInstagramData = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const kol = await kolService.getKolByUserId(userId);
    if (!kol) {
      throw errors.notFound('请先创建 KOL 资料');
    }

    const { full_sync } = req.body;
    const fullSync = full_sync === true;

    const result: InstagramSyncResult = await instagramSyncService.syncKol(kol.id, fullSync);

    if (!result.success) {
      throw new ApiError(result.error || '数据同步失败', 500, 'INSTAGRAM_SYNC_ERROR');
    }

    const response: ApiResponse<{
      success: boolean;
      synced_at: string;
      username?: string;
      followers?: number;
    }> = {
      success: true,
      data: {
        success: result.success,
        synced_at: result.syncedAt.toISOString(),
        username: result.accountInfo?.username,
        followers: result.accountInfo?.followersCount,
      },
      message: '数据同步成功',
    };

    res.status(200).json(response);
  });

  /**
   * DELETE /api/v1/kols/instagram/disconnect
   * Disconnect Instagram account
   */
  disconnectInstagram = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const kol = await kolService.getKolByUserId(userId);
    if (!kol) {
      throw errors.notFound('请先创建 KOL 资料');
    }

    await instagramService.disconnectAccount(kol.id);

    const response: ApiResponse = {
      success: true,
      message: 'Instagram 账号已解绑',
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/v1/kols/connect/instagram
   * Bind Instagram account
   */
  connectInstagram = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw errors.unauthorized('未授权');
    }

    const kol = await kolService.getKolByUserId(userId);
    if (!kol) {
      throw errors.notFound('请先创建 KOL 资料');
    }

    const status = await instagramService.getIntegrationStatus(kol.id);
    if (status.isConnected && !status.needsReauth) {
      throw new ApiError('Instagram 账号已连接', 409, 'ALREADY_CONNECTED');
    }

    const { authUrl } = await instagramService.getAuthUrl();

    const response: ApiResponse<{ auth_url: string }> = {
      success: true,
      data: {
        auth_url: authUrl,
      },
      message: '请前往 Instagram 完成授权',
    };

    res.status(200).json(response);
  });
}

export const integrationsController = new IntegrationsController();
