/**
 * TikTok Service
 * 
 * Handles TikTok API integration including OAuth authentication,
 * user data fetching, and video statistics.
 */

import crypto from 'crypto';
import prisma from '../config/database';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';
import {
  TikTokOAuthConfig,
  TikTokAuthUrlResponse,
  TikTokToken,
  TikTokTokenResponse,
  TikTokUserInfo,
  TikTokUserInfoResponse,
  TikTokVideo,
  TikTokVideoResponse,
  TikTokVideoStats,
  TikTokVideoStatsResponse,
  TikTokSyncResult,
  TikTokSyncOptions,
  TikTokSyncStats,
  TikTokIntegrationStatus,
  TikTokCallbackResult,
  TikTokCallbackParams,
} from './tiktok.types';

export class TikTokService {
  private config: TikTokOAuthConfig;
  private readonly baseUrl = 'https://open.tiktokapis.com/v2';
  private readonly authUrl = 'https://www.tiktok.com/auth/authorize';
  private readonly tokenRefreshThreshold = 300; // 5 minutes before expiration

  constructor() {
    this.config = {
      clientId: process.env.TIKTOK_CLIENT_ID || '',
      clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
      redirectUri: process.env.TIKTOK_REDIRECT_URI || 'http://localhost:3000/api/v1/integrations/tiktok/callback',
      scopes: [
        'user.info.basic',
        'video.list',
        'video.statistic',
        'follower.list',
      ],
    };

    this.validateConfig();
  }

  /**
   * Validate TikTok configuration
   */
  private validateConfig(): void {
    if (!this.config.clientId || !this.config.clientSecret) {
      logger.warn('TikTok API credentials not configured. TikTok integration will be disabled.');
    }
  }

  /**
   * Generate a secure random state parameter for OAuth
   */
  private generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Get OAuth authorization URL
   */
  async getAuthUrl(state?: string): Promise<TikTokAuthUrlResponse> {
    const oauthState = state || this.generateState();
    
    const params = new URLSearchParams({
      client_key: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      state: oauthState,
      response_type: 'code',
      scope: this.config.scopes.join(','),
    });

    const authUrl = `${this.authUrl}?${params.toString()}`;
    
    logger.info('Generated TikTok OAuth URL', { state: oauthState });

    return {
      authUrl,
      state: oauthState,
    };
  }

  /**
   * Exchange authorization code for access token
   */
  async getAccessToken(code: string): Promise<TikTokToken> {
    const tokenUrl = `${this.baseUrl}/oauth/token/`;
    
    const params = new URLSearchParams({
      client_key: this.config.clientId,
      client_secret: this.config.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.config.redirectUri,
    });

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('Failed to get TikTok access token', errorData);
        throw new ApiError('Failed to get access token from TikTok', 500, 'TIKTOK_TOKEN_ERROR');
      }

      const data = await response.json() as TikTokTokenResponse;
      
      const now = new Date();
      const token: TikTokToken = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(now.getTime() + data.expires_in * 1000),
        refreshExpiresAt: new Date(now.getTime() + data.refresh_expires_in * 1000),
        openId: data.open_id,
        scope: data.scope,
      };

      logger.info('Successfully obtained TikTok access token', { 
        openId: data.open_id,
        expiresAt: token.expiresAt,
      });

      return token;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Error exchanging code for token', { error });
      throw new ApiError('Failed to exchange authorization code', 500, 'TIKTOK_TOKEN_EXCHANGE_ERROR');
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<TikTokToken> {
    const tokenUrl = `${this.baseUrl}/oauth/refresh_token/`;
    
    const params = new URLSearchParams({
      client_key: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('Failed to refresh TikTok access token', errorData);
        throw new ApiError('Failed to refresh access token', 500, 'TIKTOK_TOKEN_REFRESH_ERROR');
      }

      const data = await response.json() as TikTokTokenResponse;
      
      const now = new Date();
      const token: TikTokToken = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(now.getTime() + data.expires_in * 1000),
        refreshExpiresAt: new Date(now.getTime() + data.refresh_expires_in * 1000),
        openId: data.open_id,
        scope: data.scope,
      };

      logger.info('Successfully refreshed TikTok access token', { 
        openId: data.open_id,
        expiresAt: token.expiresAt,
      });

      return token;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Error refreshing access token', { error });
      throw new ApiError('Failed to refresh access token', 500, 'TIKTOK_TOKEN_REFRESH_ERROR');
    }
  }

  /**
   * Get user information from TikTok
   */
  async getUserInfo(accessToken: string): Promise<TikTokUserInfo> {
    const url = `${this.baseUrl}/user/info/`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('Failed to get TikTok user info', errorData);
        throw new ApiError('Failed to get user info from TikTok', 500, 'TIKTOK_USER_INFO_ERROR');
      }

      const data = await response.json() as TikTokUserInfoResponse;
      
      const userInfo: TikTokUserInfo = {
        openId: data.data.open_id,
        unionId: data.data.union_id,
        displayName: data.data.display_name,
        username: data.data.username,
        avatarUrl: data.data.avatar_url,
        avatarUrl100x100: data.data.avatar_url_100x100,
        avatarLargeUrl: data.data.avatar_large_url,
        followerCount: data.data.follower_count,
        followingCount: data.data.following_count,
        videoCount: data.data.video_count,
        heartCount: data.data.heart_count,
        isVerified: data.data.is_verified,
        profileDeepLink: data.data.profile_deep_link,
      };

      logger.info('Successfully fetched TikTok user info', { 
        username: userInfo.username,
        followers: userInfo.followerCount,
      });

      return userInfo;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Error fetching user info', { error });
      throw new ApiError('Failed to fetch user information', 500, 'TIKTOK_USER_INFO_ERROR');
    }
  }

  /**
   * Get user's video list
   */
  async getUserVideos(
    accessToken: string, 
    userId: string,
    maxResults: number = 30
  ): Promise<TikTokVideo[]> {
    const url = `${this.baseUrl}/video/list/`;
    const videos: TikTokVideo[] = [];
    let cursor = 0;
    let hasMore = true;

    try {
      while (hasMore && videos.length < maxResults) {
        const params = new URLSearchParams({
          open_id: userId,
          count: Math.min(30, maxResults - videos.length).toString(),
          cursor: cursor.toString(),
        });

        const response = await fetch(`${url}?${params.toString()}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          logger.error('Failed to get TikTok videos', errorData);
          break;
        }

        const data = await response.json() as TikTokVideoResponse;
        
        for (const videoItem of data.data.videos) {
          videos.push({
            videoId: videoItem.video_id,
            description: videoItem.desc,
            createTime: new Date(videoItem.create_time * 1000),
            author: {
              id: videoItem.author.id,
              uniqueId: videoItem.author.unique_id,
              nickname: videoItem.author.nickname,
              avatarUrl: videoItem.author.avatar_thumb.url_list[0] || '',
            },
            music: {
              id: videoItem.music.id,
              title: videoItem.music.title,
              author: videoItem.music.author,
              duration: videoItem.music.duration,
            },
            video: {
              playUrl: videoItem.video.play_addr.url_list[0] || '',
              coverUrl: videoItem.video.cover.url_list[0] || '',
              dynamicCoverUrl: videoItem.video.dynamic_cover.url_list[0] || '',
              duration: videoItem.video.duration,
              ratio: videoItem.video.ratio,
              width: videoItem.video.width,
              height: videoItem.video.height,
            },
            shareUrl: videoItem.share_url,
            isAd: videoItem.is_ad,
          });
        }

        hasMore = data.data.has_more;
        cursor = data.data.cursor;
      }

      logger.info('Successfully fetched TikTok videos', { count: videos.length });
      return videos;
    } catch (error) {
      logger.error('Error fetching user videos', { error });
      throw new ApiError('Failed to fetch videos', 500, 'TIKTOK_VIDEO_LIST_ERROR');
    }
  }

  /**
   * Get video statistics
   */
  async getVideoStats(
    accessToken: string, 
    videoId: string
  ): Promise<TikTokVideoStats> {
    const url = `${this.baseUrl}/video/statistic/`;
    
    try {
      const params = new URLSearchParams({
        video_id: videoId,
      });

      const response = await fetch(`${url}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('Failed to get TikTok video stats', errorData);
        throw new ApiError('Failed to get video statistics', 500, 'TIKTOK_VIDEO_STATS_ERROR');
      }

      const data = await response.json() as TikTokVideoStatsResponse;
      const stats = data.data;

      // Calculate engagement rate
      const totalEngagements = stats.like_count + stats.comment_count + stats.share_count;
      const engagementRate = stats.play_count > 0 
        ? (totalEngagements / stats.play_count) * 100 
        : 0;

      const videoStats: TikTokVideoStats = {
        videoId: stats.video_id,
        playCount: stats.play_count,
        likeCount: stats.like_count,
        commentCount: stats.comment_count,
        shareCount: stats.share_count,
        downloadCount: stats.download_count,
        forwardCount: stats.forward_count,
        loseCount: stats.lose_count,
        loseCommentCount: stats.lose_comment_count,
        whatsappShareCount: stats.whatsapp_share_count,
        collectCount: stats.collect_count,
        engagementRate: parseFloat(engagementRate.toFixed(2)),
      };

      logger.info('Successfully fetched TikTok video stats', { 
        videoId,
        playCount: stats.play_count,
        engagementRate: videoStats.engagementRate,
      });

      return videoStats;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Error fetching video stats', { error });
      throw new ApiError('Failed to fetch video statistics', 500, 'TIKTOK_VIDEO_STATS_ERROR');
    }
  }

  /**
   * Handle OAuth callback and save token to database
   */
  async handleCallback(
    params: TikTokCallbackParams,
    kolId: string
  ): Promise<TikTokCallbackResult> {
    try {
      // Exchange code for token
      const token = await this.getAccessToken(params.code);

      // Get user info
      const userInfo = await this.getUserInfo(token.accessToken);

      // Find or create KOL account
      let kolAccount = await prisma.kolAccount.findFirst({
        where: {
          kolId,
          platform: 'tiktok',
        },
      });

      if (kolAccount) {
        // Update existing account
        kolAccount = await prisma.kolAccount.update({
          where: { id: kolAccount.id },
          data: {
            platformId: userInfo.username,
            platformUsername: userInfo.username,
            platformDisplayName: userInfo.displayName,
            platformAvatarUrl: userInfo.avatarLargeUrl,
            accessToken: token.accessToken,
            refreshToken: token.refreshToken,
            isVerified: true,
            lastSyncedAt: new Date(),
          },
        });
      } else {
        // Create new account
        kolAccount = await prisma.kolAccount.create({
          data: {
            kolId,
            platform: 'tiktok',
            platformId: userInfo.username,
            platformUsername: userInfo.username,
            platformDisplayName: userInfo.displayName,
            platformAvatarUrl: userInfo.avatarLargeUrl,
            accessToken: token.accessToken,
            refreshToken: token.refreshToken,
            isVerified: true,
            followers: userInfo.followerCount,
            following: userInfo.followingCount,
            totalVideos: userInfo.videoCount,
            totalLikes: userInfo.heartCount,
          },
        });
      }

      logger.info('TikTok account bound successfully', { 
        kolId, 
        accountId: kolAccount.id,
        username: userInfo.username,
      });

      return {
        success: true,
        kolAccountId: kolAccount.id,
        redirectUrl: `/kol/settings?tiktok=success&username=${encodeURIComponent(userInfo.username)}`,
      };
    } catch (error) {
      logger.error('TikTok callback error', { error });
      return {
        success: false,
        redirectUrl: '/kol/settings?tiktok=error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Sync KOL data from TikTok
   */
  async syncKolData(kolId: string, options?: TikTokSyncOptions): Promise<TikTokSyncResult> {
    const defaultOptions: TikTokSyncOptions = {
      syncUserInfo: true,
      syncVideos: true,
      syncVideoStats: true,
      maxVideos: 10,
      ...options,
    };

    try {
      // Get KOL account
      const kolAccount = await prisma.kolAccount.findFirst({
        where: {
          kolId,
          platform: 'tiktok',
        },
        include: {
          kol: true,
        },
      });

      if (!kolAccount) {
        throw new ApiError('TikTok account not connected', 404, 'TIKTOK_NOT_CONNECTED');
      }

      if (!kolAccount.accessToken) {
        throw new ApiError('Access token not found, please reconnect', 401, 'TIKTOK_TOKEN_MISSING');
      }

      // Check if token needs refresh
      let accessToken = kolAccount.accessToken;
      const expiresAt = new Date(kolAccount.expiresAt || '2000-01-01');
      const now = new Date();
      
      if (expiresAt.getTime() - now.getTime() < this.tokenRefreshThreshold * 1000) {
        logger.info('Refreshing TikTok access token', { kolId });
        if (kolAccount.refreshToken) {
          const newToken = await this.refreshAccessToken(kolAccount.refreshToken);
          accessToken = newToken.accessToken;
          
          await prisma.kolAccount.update({
            where: { id: kolAccount.id },
            data: {
              accessToken: newToken.accessToken,
              refreshToken: newToken.refreshToken,
            },
          });
        }
      }

      const result: TikTokSyncResult = {
        kolId,
        accountId: kolAccount.id,
        success: true,
        syncedAt: new Date(),
      };

      // Sync user info
      if (defaultOptions.syncUserInfo) {
        const userInfo = await this.getUserInfo(accessToken);
        result.userInfo = userInfo;

        // Update KOL account
        await prisma.kolAccount.update({
          where: { id: kolAccount.id },
          data: {
            platformUsername: userInfo.username,
            platformDisplayName: userInfo.displayName,
            platformAvatarUrl: userInfo.avatarLargeUrl,
            followers: userInfo.followerCount,
            following: userInfo.followingCount,
            totalVideos: userInfo.videoCount,
            totalLikes: userInfo.heartCount,
            isVerified: userInfo.isVerified,
            lastSyncedAt: new Date(),
          },
        });

        // Update KOL profile
        await prisma.kol.update({
          where: { id: kolId },
          data: {
            platformDisplayName: userInfo.displayName,
            platformAvatarUrl: userInfo.avatarLargeUrl,
            followers: userInfo.followerCount,
            following: userInfo.followingCount,
            totalVideos: userInfo.videoCount,
            totalLikes: userInfo.heartCount,
            lastSyncedAt: new Date(),
          },
        });

        // Calculate engagement rate
        const avgViews = Math.round(userInfo.followerCount * 0.1);
        const avgLikes = Math.round(avgViews * 0.05);
        const avgComments = Math.round(avgViews * 0.01);
        const avgShares = Math.round(avgViews * 0.005);
        const engagementRate = avgViews > 0 
          ? ((avgLikes + avgComments + avgShares) / avgViews) * 100 
          : 0;

        // Create stats history
        await prisma.kolStatsHistory.create({
          data: {
            kolId,
            followers: userInfo.followerCount,
            following: userInfo.followingCount,
            totalVideos: userInfo.videoCount,
            totalLikes: userInfo.heartCount,
            avgViews,
            avgLikes,
            avgComments,
            avgShares,
            engagementRate,
            snapshotDate: new Date(),
          },
        });
      }

      // Sync videos
      if (defaultOptions.syncVideos) {
        const videos = await this.getUserVideos(
          accessToken, 
          kolAccount.platformId,
          defaultOptions.maxVideos
        );
        result.videos = videos;
      }

      // Sync video stats (for recent videos)
      if (defaultOptions.syncVideoStats && result.videos) {
        const videoStatsPromises = result.videos.slice(0, 5).map(
          (video) => this.getVideoStats(accessToken, video.videoId)
        );
        result.videoStats = await Promise.all(videoStatsPromises);
      }

      logger.info('TikTok KOL data synced successfully', { 
        kolId, 
        username: result.userInfo?.username,
        followers: result.userInfo?.followerCount,
      });

      return result;
    } catch (error) {
      logger.error('Failed to sync TikTok KOL data', { kolId, error });
      
      return {
        kolId,
        accountId: '',
        success: false,
        syncedAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get integration status for a KOL
   */
  async getIntegrationStatus(kolId: string): Promise<TikTokIntegrationStatus> {
    const kolAccount = await prisma.kolAccount.findFirst({
      where: {
        kolId,
        platform: 'tiktok',
      },
    });

    if (!kolAccount) {
      return {
        isConnected: false,
        needsReauth: false,
      };
    }

    const now = new Date();
    const expiresAt = new Date(kolAccount.expiresAt || '2000-01-01');
    const needsReauth = !kolAccount.accessToken || expiresAt < now;

    return {
      isConnected: true,
      accountId: kolAccount.id,
      platformUsername: kolAccount.platformUsername || undefined,
      platformDisplayName: kolAccount.platformDisplayName || undefined,
      followerCount: kolAccount.followers,
      lastSyncedAt: kolAccount.lastSyncedAt || undefined,
      tokenExpiresAt: expiresAt,
      needsReauth,
    };
  }

  /**
   * Disconnect TikTok account
   */
  async disconnectAccount(kolId: string): Promise<void> {
    await prisma.kolAccount.deleteMany({
      where: {
        kolId,
        platform: 'tiktok',
      },
    });

    logger.info('TikTok account disconnected', { kolId });
  }

  /**
   * Calculate sync statistics
   */
  calculateSyncStats(
    userInfo: TikTokUserInfo,
    videoStats: TikTokVideoStats[]
  ): TikTokSyncStats {
    const totalVideos = videoStats.length;
    const totalViews = videoStats.reduce((sum, s) => sum + s.playCount, 0);
    const totalLikes = videoStats.reduce((sum, s) => sum + s.likeCount, 0);
    const totalComments = videoStats.reduce((sum, s) => sum + s.commentCount, 0);
    const totalShares = videoStats.reduce((sum, s) => sum + s.shareCount, 0);

    const avgViews = totalVideos > 0 ? Math.round(totalViews / totalVideos) : 0;
    const avgLikes = totalVideos > 0 ? Math.round(totalLikes / totalVideos) : 0;
    const avgComments = totalVideos > 0 ? Math.round(totalComments / totalVideos) : 0;
    const avgShares = totalVideos > 0 ? Math.round(totalShares / totalVideos) : 0;

    const engagementRate = avgViews > 0
      ? ((avgLikes + avgComments + avgShares) / avgViews) * 100
      : 0;

    return {
      totalFollowers: userInfo.followerCount,
      totalFollowing: userInfo.followingCount,
      totalVideos: userInfo.videoCount,
      totalLikes: userInfo.heartCount,
      avgViews,
      avgLikes,
      avgComments,
      avgShares,
      engagementRate: parseFloat(engagementRate.toFixed(2)),
    };
  }
}

export const tiktokService = new TikTokService();
