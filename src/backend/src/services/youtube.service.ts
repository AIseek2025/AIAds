/**
 * YouTube Service
 *
 * Handles YouTube API integration including OAuth authentication,
 * channel data fetching, and video statistics.
 */

import crypto from 'crypto';
import prisma from '../config/database';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';
import {
  YouTubeOAuthConfig,
  YouTubeAuthUrlResponse,
  YouTubeToken,
  YouTubeTokenResponse,
  YouTubeChannelInfo,
  YouTubeChannelInfoResponse,
  YouTubeVideo,
  YouTubeVideoListResponse,
  YouTubeVideoStats,
  YouTubeVideoStatsResponse,
  YouTubeSyncResult,
  YouTubeSyncOptions,
  YouTubeSyncStats,
  YouTubeIntegrationStatus,
  YouTubeCallbackResult,
  YouTubeCallbackParams,
} from './youtube.types';

export class YouTubeService {
  private config: YouTubeOAuthConfig;
  private readonly baseUrl = 'https://www.googleapis.com/youtube/v3';
  private readonly authUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  private readonly tokenUrl = 'https://oauth2.googleapis.com/token';
  private readonly tokenRefreshThreshold = 300; // 5 minutes before expiration

  constructor() {
    this.config = {
      clientId: process.env.YOUTUBE_CLIENT_ID || '',
      clientSecret: process.env.YOUTUBE_CLIENT_SECRET || '',
      redirectUri: process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3000/api/v1/integrations/youtube/callback',
      scopes: [
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/youtube.channel.readonly',
      ],
    };

    this.validateConfig();
  }

  /**
   * Validate YouTube configuration
   */
  private validateConfig(): void {
    if (!this.config.clientId || !this.config.clientSecret) {
      logger.warn('YouTube API credentials not configured. YouTube integration will be disabled.');
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
  async getAuthUrl(state?: string): Promise<YouTubeAuthUrlResponse> {
    const oauthState = state || this.generateState();

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      state: oauthState,
      access_type: 'offline',
      prompt: 'consent',
    });

    const authUrl = `${this.authUrl}?${params.toString()}`;

    logger.info('Generated YouTube OAuth URL', { state: oauthState });

    return {
      authUrl,
      state: oauthState,
    };
  }

  /**
   * Exchange authorization code for access token
   */
  async getAccessToken(code: string): Promise<YouTubeToken> {
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
        logger.error('Failed to get YouTube access token', errorData);
        throw new ApiError('Failed to get access token from YouTube', 500, 'YOUTUBE_TOKEN_ERROR');
      }

      const data = await response.json() as YouTubeTokenResponse;

      const now = new Date();
      const token: YouTubeToken = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || '',
        expiresAt: new Date(now.getTime() + data.expires_in * 1000),
        scope: data.scope,
      };

      logger.info('Successfully obtained YouTube access token', {
        expiresAt: token.expiresAt,
      });

      return token;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Error exchanging code for token', { error });
      throw new ApiError('Failed to exchange authorization code', 500, 'YOUTUBE_TOKEN_EXCHANGE_ERROR');
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<YouTubeToken> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
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
        logger.error('Failed to refresh YouTube access token', errorData);
        throw new ApiError('Failed to refresh access token', 500, 'YOUTUBE_TOKEN_REFRESH_ERROR');
      }

      const data = await response.json() as YouTubeTokenResponse;

      const now = new Date();
      const token: YouTubeToken = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresAt: new Date(now.getTime() + data.expires_in * 1000),
        scope: data.scope,
      };

      logger.info('Successfully refreshed YouTube access token', {
        expiresAt: token.expiresAt,
      });

      return token;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Error refreshing access token', { error });
      throw new ApiError('Failed to refresh access token', 500, 'YOUTUBE_TOKEN_REFRESH_ERROR');
    }
  }

  /**
   * Get channel information from YouTube
   */
  async getChannelInfo(accessToken: string): Promise<YouTubeChannelInfo> {
    const url = `${this.baseUrl}/channels`;
    const params = new URLSearchParams({
      part: 'snippet,statistics,brandingSettings',
      mine: 'true',
    });

    try {
      const response = await fetch(`${url}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('Failed to get YouTube channel info', errorData);
        throw new ApiError('Failed to get channel info from YouTube', 500, 'YOUTUBE_CHANNEL_INFO_ERROR');
      }

      const data = await response.json() as YouTubeChannelInfoResponse;

      if (!data.items || data.items.length === 0) {
        throw new ApiError('No channel found', 404, 'YOUTUBE_CHANNEL_NOT_FOUND');
      }

      const channel = data.items[0];
      const channelInfo: YouTubeChannelInfo = {
        channelId: channel.id,
        title: channel.snippet.title,
        description: channel.snippet.description,
        customUrl: channel.snippet.customUrl,
        publishedAt: new Date(channel.snippet.publishedAt),
        thumbnails: {
          default: channel.snippet.thumbnails.default.url,
          medium: channel.snippet.thumbnails.medium.url,
          high: channel.snippet.thumbnails.high.url,
        },
        country: channel.snippet.country || '',
        viewCount: parseInt(channel.statistics.viewCount, 10),
        subscriberCount: parseInt(channel.statistics.subscriberCount, 10),
        videoCount: parseInt(channel.statistics.videoCount, 10),
        hiddenSubscriberCount: channel.statistics.hiddenSubscriberCount,
      };

      logger.info('Successfully fetched YouTube channel info', {
        channelId: channelInfo.channelId,
        title: channelInfo.title,
        subscribers: channelInfo.subscriberCount,
      });

      return channelInfo;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Error fetching channel info', { error });
      throw new ApiError('Failed to fetch channel information', 500, 'YOUTUBE_CHANNEL_INFO_ERROR');
    }
  }

  /**
   * Get channel's video list
   */
  async getChannelVideos(
    accessToken: string,
    channelId: string,
    maxResults: number = 30
  ): Promise<YouTubeVideo[]> {
    const url = `${this.baseUrl}/search`;
    const videos: YouTubeVideo[] = [];
    let nextPageToken: string | undefined;

    try {
      while (videos.length < maxResults) {
        const params = new URLSearchParams({
          part: 'snippet',
          channelId: channelId,
          type: 'video',
          order: 'date',
          maxResults: Math.min(50, maxResults - videos.length).toString(),
        });

        if (nextPageToken) {
          params.append('pageToken', nextPageToken);
        }

        const response = await fetch(`${url}?${params.toString()}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          logger.error('Failed to get YouTube videos', errorData);
          break;
        }

        const data = await response.json() as YouTubeVideoListResponse;
        nextPageToken = data.nextPageToken;

        const videoIds = data.items.map(item => item.id);
        if (videoIds.length === 0) break;

        // Fetch video details with statistics
        const videoDetails = await this.getVideoDetails(accessToken, videoIds);
        
        for (const video of videoDetails) {
          videos.push(video);
        }

        if (!nextPageToken) break;
      }

      logger.info('Successfully fetched YouTube videos', { count: videos.length });
      return videos.slice(0, maxResults);
    } catch (error) {
      logger.error('Error fetching channel videos', { error });
      throw new ApiError('Failed to fetch videos', 500, 'YOUTUBE_VIDEO_LIST_ERROR');
    }
  }

  /**
   * Get video details with statistics
   */
  private async getVideoDetails(
    accessToken: string,
    videoIds: string[]
  ): Promise<YouTubeVideo[]> {
    const url = `${this.baseUrl}/videos`;
    const params = new URLSearchParams({
      part: 'snippet,contentDetails,statistics',
      id: videoIds.join(','),
    });

    try {
      const response = await fetch(`${url}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('Failed to get YouTube video details', errorData);
        return [];
      }

      const data = await response.json() as YouTubeVideoListResponse;

      return data.items.map(item => ({
        videoId: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        publishedAt: new Date(item.snippet.publishedAt),
        channelId: item.snippet.channelId,
        channelTitle: item.snippet.channelTitle,
        thumbnails: {
          default: item.snippet.thumbnails.default.url,
          medium: item.snippet.thumbnails.medium.url,
          high: item.snippet.thumbnails.high.url,
          standard: item.snippet.thumbnails.standard?.url,
          maxres: item.snippet.thumbnails.maxres?.url,
        },
        tags: item.snippet.tags,
        categoryId: item.snippet.categoryId,
        duration: item.contentDetails?.duration || '',
        definition: item.contentDetails?.definition || 'standard',
        viewCount: item.statistics ? parseInt(item.statistics.viewCount, 10) : 0,
        likeCount: item.statistics ? parseInt(item.statistics.likeCount, 10) : 0,
        commentCount: item.statistics ? parseInt(item.statistics.commentCount, 10) : 0,
      }));
    } catch (error) {
      logger.error('Error fetching video details', { error });
      return [];
    }
  }

  /**
   * Get video statistics
   */
  async getVideoStats(
    accessToken: string,
    videoId: string
  ): Promise<YouTubeVideoStats> {
    const url = `${this.baseUrl}/videos`;
    const params = new URLSearchParams({
      part: 'statistics',
      id: videoId,
    });

    try {
      const response = await fetch(`${url}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('Failed to get YouTube video stats', errorData);
        throw new ApiError('Failed to get video statistics', 500, 'YOUTUBE_VIDEO_STATS_ERROR');
      }

      const data = await response.json() as YouTubeVideoStatsResponse;

      if (!data.items || data.items.length === 0) {
        throw new ApiError('Video not found', 404, 'YOUTUBE_VIDEO_NOT_FOUND');
      }

      const stats = data.items[0].statistics;

      // Calculate engagement rate
      const totalEngagements = parseInt(stats.likeCount, 10) + parseInt(stats.commentCount, 10);
      const viewCount = parseInt(stats.viewCount, 10);
      const engagementRate = viewCount > 0
        ? (totalEngagements / viewCount) * 100
        : 0;

      const videoStats: YouTubeVideoStats = {
        videoId,
        viewCount,
        likeCount: parseInt(stats.likeCount, 10),
        dislikeCount: parseInt(stats.dislikeCount || '0', 10),
        favoriteCount: parseInt(stats.favoriteCount, 10),
        commentCount: parseInt(stats.commentCount, 10),
        engagementRate: parseFloat(engagementRate.toFixed(2)),
      };

      logger.info('Successfully fetched YouTube video stats', {
        videoId,
        viewCount,
        engagementRate: videoStats.engagementRate,
      });

      return videoStats;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Error fetching video stats', { error });
      throw new ApiError('Failed to fetch video statistics', 500, 'YOUTUBE_VIDEO_STATS_ERROR');
    }
  }

  /**
   * Handle OAuth callback and save token to database
   */
  async handleCallback(
    params: YouTubeCallbackParams,
    kolId: string
  ): Promise<YouTubeCallbackResult> {
    try {
      // Check for error in callback
      if (params.error) {
        throw new ApiError(`OAuth error: ${params.error}`, 400, 'YOUTUBE_OAUTH_ERROR');
      }

      // Exchange code for token
      const token = await this.getAccessToken(params.code);

      // Get channel info
      const channelInfo = await this.getChannelInfo(token.accessToken);

      // Find or create KOL account
      let kolAccount = await prisma.kolAccount.findFirst({
        where: {
          kolId,
          platform: 'youtube',
        },
      });

      if (kolAccount) {
        // Update existing account
        kolAccount = await prisma.kolAccount.update({
          where: { id: kolAccount.id },
          data: {
            platformId: channelInfo.channelId,
            platformUsername: channelInfo.customUrl || channelInfo.title,
            platformDisplayName: channelInfo.title,
            platformAvatarUrl: channelInfo.thumbnails.high,
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
            platform: 'youtube',
            platformId: channelInfo.channelId,
            platformUsername: channelInfo.customUrl || channelInfo.title,
            platformDisplayName: channelInfo.title,
            platformAvatarUrl: channelInfo.thumbnails.high,
            accessToken: token.accessToken,
            refreshToken: token.refreshToken,
            isVerified: true,
            followers: channelInfo.subscriberCount,
            totalVideos: channelInfo.videoCount,
            totalLikes: channelInfo.viewCount,
          },
        });
      }

      logger.info('YouTube account bound successfully', {
        kolId,
        accountId: kolAccount.id,
        channelId: channelInfo.channelId,
      });

      return {
        success: true,
        kolAccountId: kolAccount.id,
        redirectUrl: `/kol/settings?youtube=success&username=${encodeURIComponent(channelInfo.title)}`,
      };
    } catch (error) {
      logger.error('YouTube callback error', { error });
      return {
        success: false,
        redirectUrl: '/kol/settings?youtube=error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Sync KOL data from YouTube
   */
  async syncKolData(kolId: string, options?: YouTubeSyncOptions): Promise<YouTubeSyncResult> {
    const defaultOptions: YouTubeSyncOptions = {
      syncChannelInfo: true,
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
          platform: 'youtube',
        },
        include: {
          kol: true,
        },
      });

      if (!kolAccount) {
        throw new ApiError('YouTube account not connected', 404, 'YOUTUBE_NOT_CONNECTED');
      }

      if (!kolAccount.accessToken) {
        throw new ApiError('Access token not found, please reconnect', 401, 'YOUTUBE_TOKEN_MISSING');
      }

      // Check if token needs refresh
      let accessToken = kolAccount.accessToken;
      const expiresAt = new Date(kolAccount.expiresAt || '2000-01-01');
      const now = new Date();

      if (expiresAt.getTime() - now.getTime() < this.tokenRefreshThreshold * 1000) {
        logger.info('Refreshing YouTube access token', { kolId });
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

      const result: YouTubeSyncResult = {
        kolId,
        accountId: kolAccount.id,
        success: true,
        syncedAt: new Date(),
      };

      // Sync channel info
      if (defaultOptions.syncChannelInfo) {
        const channelInfo = await this.getChannelInfo(accessToken);
        result.channelInfo = channelInfo;

        // Update KOL account
        await prisma.kolAccount.update({
          where: { id: kolAccount.id },
          data: {
            platformUsername: channelInfo.customUrl || channelInfo.title,
            platformDisplayName: channelInfo.title,
            platformAvatarUrl: channelInfo.thumbnails.high,
            followers: channelInfo.subscriberCount,
            totalVideos: channelInfo.videoCount,
            totalLikes: channelInfo.viewCount,
            isVerified: true,
            lastSyncedAt: new Date(),
          },
        });

        // Update KOL profile
        await prisma.kol.update({
          where: { id: kolId },
          data: {
            platformDisplayName: channelInfo.title,
            platformAvatarUrl: channelInfo.thumbnails.high,
            followers: channelInfo.subscriberCount,
            totalVideos: channelInfo.videoCount,
            totalLikes: channelInfo.viewCount,
            lastSyncedAt: new Date(),
          },
        });

        // Calculate engagement rate
        const avgViews = Math.round(channelInfo.subscriberCount * 0.1);
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
            followers: channelInfo.subscriberCount,
            totalVideos: channelInfo.videoCount,
            totalLikes: channelInfo.viewCount,
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
        const videos = await this.getChannelVideos(
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

      logger.info('YouTube KOL data synced successfully', {
        kolId,
        channelId: result.channelInfo?.channelId,
        subscribers: result.channelInfo?.subscriberCount,
      });

      return result;
    } catch (error) {
      logger.error('Failed to sync YouTube KOL data', { kolId, error });

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
  async getIntegrationStatus(kolId: string): Promise<YouTubeIntegrationStatus> {
    const kolAccount = await prisma.kolAccount.findFirst({
      where: {
        kolId,
        platform: 'youtube',
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
      subscriberCount: kolAccount.followers,
      lastSyncedAt: kolAccount.lastSyncedAt || undefined,
      tokenExpiresAt: expiresAt,
      needsReauth,
    };
  }

  /**
   * Disconnect YouTube account
   */
  async disconnectAccount(kolId: string): Promise<void> {
    await prisma.kolAccount.deleteMany({
      where: {
        kolId,
        platform: 'youtube',
      },
    });

    logger.info('YouTube account disconnected', { kolId });
  }

  /**
   * Calculate sync statistics
   */
  calculateSyncStats(
    channelInfo: YouTubeChannelInfo,
    videoStats: YouTubeVideoStats[]
  ): YouTubeSyncStats {
    const totalVideos = videoStats.length;
    const totalViews = videoStats.reduce((sum, s) => sum + s.viewCount, 0);
    const totalLikes = videoStats.reduce((sum, s) => sum + s.likeCount, 0);
    const totalComments = videoStats.reduce((sum, s) => sum + s.commentCount, 0);

    const avgViews = totalVideos > 0 ? Math.round(totalViews / totalVideos) : 0;
    const avgLikes = totalVideos > 0 ? Math.round(totalLikes / totalVideos) : 0;
    const avgComments = totalVideos > 0 ? Math.round(totalComments / totalVideos) : 0;

    const engagementRate = avgViews > 0
      ? ((avgLikes + avgComments) / avgViews) * 100
      : 0;

    return {
      totalSubscribers: channelInfo.subscriberCount,
      totalVideos: channelInfo.videoCount,
      totalViews: channelInfo.viewCount,
      avgViews,
      avgLikes,
      avgComments,
      engagementRate: parseFloat(engagementRate.toFixed(2)),
    };
  }
}

export const youtubeService = new YouTubeService();
