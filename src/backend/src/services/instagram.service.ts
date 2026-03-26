/**
 * Instagram Service
 *
 * Handles Instagram Graph API integration including OAuth authentication,
 * account data fetching, and media statistics.
 */

import crypto from 'crypto';
import prisma from '../config/database';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';
import {
  InstagramOAuthConfig,
  InstagramAuthUrlResponse,
  InstagramToken,
  InstagramTokenResponse,
  InstagramLongLivedTokenResponse,
  InstagramAccountInfo,
  InstagramAccountInfoResponse,
  InstagramMedia,
  InstagramMediaListResponse,
  InstagramMediaItem,
  InstagramMediaStats,
  InstagramMediaStatsResponse,
  InstagramSyncResult,
  InstagramSyncOptions,
  InstagramSyncStats,
  InstagramIntegrationStatus,
  InstagramCallbackResult,
  InstagramCallbackParams,
} from './instagram.types';

export class InstagramService {
  private config: InstagramOAuthConfig;
  private readonly baseUrl = 'https://graph.instagram.com';
  private readonly authUrl = 'https://www.instagram.com/oauth/authorize';
  private readonly tokenUrl = 'https://api.instagram.com/oauth/access_token';
  private readonly tokenRefreshThreshold = 300; // 5 minutes before expiration
  private readonly longLivedTokenExpiry = 5184000; // 60 days in seconds

  constructor() {
    this.config = {
      clientId: process.env.INSTAGRAM_CLIENT_ID || '',
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET || '',
      redirectUri: process.env.INSTAGRAM_REDIRECT_URI || 'http://localhost:3000/api/v1/integrations/instagram/callback',
      scopes: [
        'user_profile',
        'user_media',
        'instagram_basic',
        'pages_show_list',
        'pages_read_engagement',
        'instagram_manage_insights',
      ],
    };

    this.validateConfig();
  }

  /**
   * Validate Instagram configuration
   */
  private validateConfig(): void {
    if (!this.config.clientId || !this.config.clientSecret) {
      logger.warn('Instagram API credentials not configured. Instagram integration will be disabled.');
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
  async getAuthUrl(state?: string): Promise<InstagramAuthUrlResponse> {
    const oauthState = state || this.generateState();

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(','),
      response_type: 'code',
      state: oauthState,
    });

    const authUrl = `${this.authUrl}?${params.toString()}`;

    logger.info('Generated Instagram OAuth URL', { state: oauthState });

    return {
      authUrl,
      state: oauthState,
    };
  }

  /**
   * Exchange authorization code for access token
   */
  async getAccessToken(code: string): Promise<InstagramToken> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.config.redirectUri,
    });

    try {
      const response = await fetch(this.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('Failed to get Instagram access token', errorData);
        throw new ApiError('Failed to get access token from Instagram', 500, 'INSTAGRAM_TOKEN_ERROR');
      }

      const data = await response.json() as InstagramTokenResponse;

      // Exchange for long-lived token
      const longLivedToken = await this.exchangeForLongLivedToken(data.access_token);

      const now = new Date();
      const token: InstagramToken = {
        accessToken: longLivedToken.access_token,
        expiresAt: new Date(now.getTime() + this.longLivedTokenExpiry * 1000),
        userId: data.user_id,
      };

      logger.info('Successfully obtained Instagram access token', {
        userId: data.user_id,
        expiresAt: token.expiresAt,
      });

      return token;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Error exchanging code for token', { error });
      throw new ApiError('Failed to exchange authorization code', 500, 'INSTAGRAM_TOKEN_EXCHANGE_ERROR');
    }
  }

  /**
   * Exchange short-lived token for long-lived token
   */
  private async exchangeForLongLivedToken(shortLivedToken: string): Promise<InstagramLongLivedTokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'ig_exchange_token',
      client_secret: this.config.clientSecret,
      access_token: shortLivedToken,
    });

    try {
      const response = await fetch(`${this.baseUrl}/access_token?${params.toString()}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('Failed to exchange for long-lived token', errorData);
        throw new ApiError('Failed to exchange for long-lived token', 500, 'INSTAGRAM_TOKEN_EXCHANGE_ERROR');
      }

      const data = await response.json() as InstagramLongLivedTokenResponse;
      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Error exchanging for long-lived token', { error });
      throw new ApiError('Failed to exchange for long-lived token', 500, 'INSTAGRAM_TOKEN_EXCHANGE_ERROR');
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(accessToken: string): Promise<InstagramToken> {
    const params = new URLSearchParams({
      grant_type: 'ig_refresh_token',
      access_token: accessToken,
    });

    try {
      const response = await fetch(`${this.baseUrl}/refresh_access_token?${params.toString()}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('Failed to refresh Instagram access token', errorData);
        throw new ApiError('Failed to refresh access token', 500, 'INSTAGRAM_TOKEN_REFRESH_ERROR');
      }

      const data = await response.json() as InstagramLongLivedTokenResponse;

      const now = new Date();
      const token: InstagramToken = {
        accessToken: data.access_token,
        expiresAt: new Date(now.getTime() + this.longLivedTokenExpiry * 1000),
        userId: '', // Will be fetched separately
      };

      logger.info('Successfully refreshed Instagram access token', {
        expiresAt: token.expiresAt,
      });

      return token;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Error refreshing access token', { error });
      throw new ApiError('Failed to refresh access token', 500, 'INSTAGRAM_TOKEN_REFRESH_ERROR');
    }
  }

  /**
   * Get account information from Instagram
   */
  async getAccountInfo(accessToken: string): Promise<InstagramAccountInfo> {
    const params = new URLSearchParams({
      fields: 'id,username,name,profile_picture_url,followers_count,follows_count,media_count,biography,website,is_verified,is_business_account,account_type',
      access_token: accessToken,
    });

    try {
      const response = await fetch(`${this.baseUrl}/me?${params.toString()}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('Failed to get Instagram account info', errorData);
        throw new ApiError('Failed to get account info from Instagram', 500, 'INSTAGRAM_ACCOUNT_INFO_ERROR');
      }

      const data = await response.json() as InstagramAccountInfoResponse;

      const accountInfo: InstagramAccountInfo = {
        accountId: data.id,
        username: data.username,
        name: data.name,
        profilePictureUrl: data.profile_picture_url,
        followersCount: data.followers_count || 0,
        followsCount: data.follows_count || 0,
        mediaCount: data.media_count || 0,
        biography: data.biography,
        website: data.website,
        isVerified: data.is_verified || false,
        isBusinessAccount: data.is_business_account || false,
        accountType: data.account_type || 'PERSONAL',
      };

      logger.info('Successfully fetched Instagram account info', {
        username: accountInfo.username,
        followers: accountInfo.followersCount,
      });

      return accountInfo;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Error fetching account info', { error });
      throw new ApiError('Failed to fetch account information', 500, 'INSTAGRAM_ACCOUNT_INFO_ERROR');
    }
  }

  /**
   * Get user's media list
   */
  async getMediaList(
    accessToken: string,
    maxResults: number = 30
  ): Promise<InstagramMedia[]> {
    const media: InstagramMedia[] = [];
    let nextUrl: string | null = `${this.baseUrl}/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,is_video,video_url,username&limit=${Math.min(50, maxResults)}&access_token=${accessToken}`;

    try {
      while (nextUrl && media.length < maxResults) {
        const response = await fetch(nextUrl, {
          method: 'GET',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          logger.error('Failed to get Instagram media', errorData);
          break;
        }

        const data = await response.json() as InstagramMediaListResponse;

        for (const mediaItem of data.data) {
          media.push(this.parseMediaItem(mediaItem));
        }

        // Handle pagination
        nextUrl = data.paging?.next || null;
      }

      logger.info('Successfully fetched Instagram media', { count: media.length });
      return media.slice(0, maxResults);
    } catch (error) {
      logger.error('Error fetching media list', { error });
      throw new ApiError('Failed to fetch media', 500, 'INSTAGRAM_MEDIA_LIST_ERROR');
    }
  }

  /**
   * Parse Instagram media item
   */
  private parseMediaItem(item: InstagramMediaItem): InstagramMedia {
    return {
      mediaId: item.id,
      caption: item.caption,
      mediaType: item.media_type,
      mediaUrl: item.media_url,
      thumbnailUrl: item.thumbnail_url,
      permalink: item.permalink,
      timestamp: new Date(item.timestamp),
      likeCount: item.like_count || 0,
      commentsCount: item.comments_count || 0,
      isVideo: item.is_video || false,
      videoUrl: item.video_url,
      username: item.username,
    };
  }

  /**
   * Get media statistics
   */
  async getMediaStats(
    accessToken: string,
    mediaId: string
  ): Promise<InstagramMediaStats> {
    const params = new URLSearchParams({
      fields: 'id,like_count,comments_count,saved,reach,impressions,engagement,video_views,play_count',
      access_token: accessToken,
    });

    try {
      const response = await fetch(`${this.baseUrl}/${mediaId}?${params.toString()}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('Failed to get Instagram media stats', errorData);
        throw new ApiError('Failed to get media statistics', 500, 'INSTAGRAM_MEDIA_STATS_ERROR');
      }

      const data = await response.json() as InstagramMediaStatsResponse;

      // Calculate engagement rate
      const totalEngagements = (data.like_count || 0) + (data.comments_count || 0);
      const reach = data.reach || data.impressions || totalEngagements;
      const engagementRate = reach > 0
        ? (totalEngagements / reach) * 100
        : 0;

      const mediaStats: InstagramMediaStats = {
        mediaId,
        likeCount: data.like_count || 0,
        commentsCount: data.comments_count || 0,
        saved: data.saved,
        reach: data.reach,
        impressions: data.impressions,
        engagement: data.engagement,
        videoViews: data.video_views || data.play_count,
        playCount: data.play_count || data.video_views,
        engagementRate: parseFloat(engagementRate.toFixed(2)),
      };

      logger.info('Successfully fetched Instagram media stats', {
        mediaId,
        likeCount: mediaStats.likeCount,
        engagementRate: mediaStats.engagementRate,
      });

      return mediaStats;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Error fetching media stats', { error });
      throw new ApiError('Failed to fetch media statistics', 500, 'INSTAGRAM_MEDIA_STATS_ERROR');
    }
  }

  /**
   * Handle OAuth callback and save token to database
   */
  async handleCallback(
    params: InstagramCallbackParams,
    kolId: string
  ): Promise<InstagramCallbackResult> {
    try {
      // Exchange code for token
      const token = await this.getAccessToken(params.code);

      // Get account info
      const accountInfo = await this.getAccountInfo(token.accessToken);

      // Find or create KOL account
      let kolAccount = await prisma.kolAccount.findFirst({
        where: {
          kolId,
          platform: 'instagram',
        },
      });

      if (kolAccount) {
        // Update existing account
        kolAccount = await prisma.kolAccount.update({
          where: { id: kolAccount.id },
          data: {
            platformId: accountInfo.accountId,
            platformUsername: accountInfo.username,
            platformDisplayName: accountInfo.name || accountInfo.username,
            platformAvatarUrl: accountInfo.profilePictureUrl,
            accessToken: token.accessToken,
            refreshToken: token.accessToken, // Instagram uses refresh via token refresh
            expiresAt: token.expiresAt,
            isVerified: accountInfo.isVerified,
            lastSyncedAt: new Date(),
          },
        });
      } else {
        // Create new account
        kolAccount = await prisma.kolAccount.create({
          data: {
            kolId,
            platform: 'instagram',
            platformId: accountInfo.accountId,
            platformUsername: accountInfo.username,
            platformDisplayName: accountInfo.name || accountInfo.username,
            platformAvatarUrl: accountInfo.profilePictureUrl,
            accessToken: token.accessToken,
            refreshToken: token.accessToken,
            expiresAt: token.expiresAt,
            isVerified: accountInfo.isVerified,
            followers: accountInfo.followersCount,
            following: accountInfo.followsCount,
            totalVideos: accountInfo.mediaCount,
          },
        });
      }

      logger.info('Instagram account bound successfully', {
        kolId,
        accountId: kolAccount.id,
        username: accountInfo.username,
      });

      return {
        success: true,
        kolAccountId: kolAccount.id,
        redirectUrl: `/kol/settings?instagram=success&username=${encodeURIComponent(accountInfo.username)}`,
      };
    } catch (error) {
      logger.error('Instagram callback error', { error });
      return {
        success: false,
        redirectUrl: '/kol/settings?instagram=error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Sync KOL data from Instagram
   */
  async syncKolData(kolId: string, options?: InstagramSyncOptions): Promise<InstagramSyncResult> {
    const defaultOptions: InstagramSyncOptions = {
      syncAccountInfo: true,
      syncMedia: true,
      syncMediaStats: true,
      maxMedia: 10,
      ...options,
    };

    try {
      // Get KOL account
      const kolAccount = await prisma.kolAccount.findFirst({
        where: {
          kolId,
          platform: 'instagram',
        },
        include: {
          kol: true,
        },
      });

      if (!kolAccount) {
        throw new ApiError('Instagram account not connected', 404, 'INSTAGRAM_NOT_CONNECTED');
      }

      if (!kolAccount.accessToken) {
        throw new ApiError('Access token not found, please reconnect', 401, 'INSTAGRAM_TOKEN_MISSING');
      }

      // Check if token needs refresh
      let accessToken = kolAccount.accessToken;
      const expiresAt = new Date(kolAccount.expiresAt || '2000-01-01');
      const now = new Date();

      if (expiresAt.getTime() - now.getTime() < this.tokenRefreshThreshold * 1000) {
        logger.info('Refreshing Instagram access token', { kolId });
        const newToken = await this.refreshAccessToken(accessToken);
        accessToken = newToken.accessToken;

        await prisma.kolAccount.update({
          where: { id: kolAccount.id },
          data: {
            accessToken: newToken.accessToken,
            refreshToken: newToken.accessToken,
            expiresAt: newToken.expiresAt,
          },
        });
      }

      const result: InstagramSyncResult = {
        kolId,
        accountId: kolAccount.id,
        success: true,
        syncedAt: new Date(),
      };

      // Sync account info
      if (defaultOptions.syncAccountInfo) {
        const accountInfo = await this.getAccountInfo(accessToken);
        result.accountInfo = accountInfo;

        // Update KOL account
        await prisma.kolAccount.update({
          where: { id: kolAccount.id },
          data: {
            platformUsername: accountInfo.username,
            platformDisplayName: accountInfo.name || accountInfo.username,
            platformAvatarUrl: accountInfo.profilePictureUrl,
            followers: accountInfo.followersCount,
            following: accountInfo.followsCount,
            totalVideos: accountInfo.mediaCount,
            isVerified: accountInfo.isVerified,
            lastSyncedAt: new Date(),
          },
        });

        // Update KOL profile
        await prisma.kol.update({
          where: { id: kolId },
          data: {
            platformDisplayName: accountInfo.name || accountInfo.username,
            platformAvatarUrl: accountInfo.profilePictureUrl,
            followers: accountInfo.followersCount,
            following: accountInfo.followsCount,
            totalVideos: accountInfo.mediaCount,
            lastSyncedAt: new Date(),
          },
        });

        // Calculate engagement rate
        const avgLikes = Math.round(accountInfo.followersCount * 0.03);
        const avgComments = Math.round(accountInfo.followersCount * 0.005);
        const avgShares = Math.round(accountInfo.followersCount * 0.002);
        const engagementRate = avgLikes > 0
          ? ((avgLikes + avgComments + avgShares) / accountInfo.followersCount) * 100
          : 0;

        // Create stats history
        await prisma.kolStatsHistory.create({
          data: {
            kolId,
            followers: accountInfo.followersCount,
            following: accountInfo.followsCount,
            totalVideos: accountInfo.mediaCount,
            avgLikes,
            avgComments,
            avgShares,
            engagementRate,
            snapshotDate: new Date(),
          },
        });
      }

      // Sync media
      if (defaultOptions.syncMedia) {
        const media = await this.getMediaList(
          accessToken,
          defaultOptions.maxMedia
        );
        result.media = media;
      }

      // Sync media stats (for recent media)
      if (defaultOptions.syncMediaStats && result.media) {
        const mediaStatsPromises = result.media.slice(0, 5).map(
          (mediaItem) => this.getMediaStats(accessToken, mediaItem.mediaId)
        );
        result.mediaStats = await Promise.all(mediaStatsPromises);
      }

      logger.info('Instagram KOL data synced successfully', {
        kolId,
        username: result.accountInfo?.username,
        followers: result.accountInfo?.followersCount,
      });

      return result;
    } catch (error) {
      logger.error('Failed to sync Instagram KOL data', { kolId, error });

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
  async getIntegrationStatus(kolId: string): Promise<InstagramIntegrationStatus> {
    const kolAccount = await prisma.kolAccount.findFirst({
      where: {
        kolId,
        platform: 'instagram',
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
   * Disconnect Instagram account
   */
  async disconnectAccount(kolId: string): Promise<void> {
    await prisma.kolAccount.deleteMany({
      where: {
        kolId,
        platform: 'instagram',
      },
    });

    logger.info('Instagram account disconnected', { kolId });
  }

  /**
   * Calculate sync statistics
   */
  calculateSyncStats(
    accountInfo: InstagramAccountInfo,
    mediaStats: InstagramMediaStats[]
  ): InstagramSyncStats {
    const totalMedia = mediaStats.length;
    const totalLikes = mediaStats.reduce((sum, s) => sum + s.likeCount, 0);
    const totalComments = mediaStats.reduce((sum, s) => sum + s.commentsCount, 0);
    const totalReach = mediaStats.reduce((sum, s) => sum + (s.reach || 0), 0);
    const totalImpressions = mediaStats.reduce((sum, s) => sum + (s.impressions || 0), 0);

    const avgLikes = totalMedia > 0 ? Math.round(totalLikes / totalMedia) : 0;
    const avgComments = totalMedia > 0 ? Math.round(totalComments / totalMedia) : 0;
    const avgReach = totalMedia > 0 ? Math.round(totalReach / totalMedia) : 0;
    const avgImpressions = totalMedia > 0 ? Math.round(totalImpressions / totalMedia) : 0;

    const engagementRate = avgLikes > 0
      ? ((avgLikes + avgComments) / accountInfo.followersCount) * 100
      : 0;

    return {
      totalFollowers: accountInfo.followersCount,
      totalFollowing: accountInfo.followsCount,
      totalMedia: accountInfo.mediaCount,
      avgLikes,
      avgComments,
      avgReach,
      avgImpressions,
      engagementRate: parseFloat(engagementRate.toFixed(2)),
    };
  }
}

export const instagramService = new InstagramService();
