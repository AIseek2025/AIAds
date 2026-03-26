/**
 * YouTube Integration Types
 *
 * Type definitions for YouTube API integration
 */

// ============================================================================
// OAuth Types
// ============================================================================

export interface YouTubeOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface YouTubeAuthUrlResponse {
  authUrl: string;
  state: string;
}

export interface YouTubeTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
}

export interface YouTubeToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
}

// ============================================================================
// Channel Info Types
// ============================================================================

export interface YouTubeChannelInfoResponse {
  kind: string;
  etag: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items: YouTubeChannelItem[];
}

export interface YouTubeChannelItem {
  kind: string;
  etag: string;
  id: string;
  snippet: {
    title: string;
    description: string;
    customUrl: string;
    publishedAt: string;
    thumbnails: {
      default: {
        url: string;
        width: number;
        height: number;
      };
      medium: {
        url: string;
        width: number;
        height: number;
      };
      high: {
        url: string;
        width: number;
        height: number;
      };
    };
    localized: {
      title: string;
      description: string;
    };
    country: string;
  };
  statistics: {
    viewCount: string;
    subscriberCount: string;
    hiddenSubscriberCount: boolean;
    videoCount: string;
  };
  brandingSettings?: {
    channel: {
      title: string;
      description: string;
      keywords: string;
      country: string;
    };
    image: {
      bannerExternalUrl: string;
    };
  };
}

export interface YouTubeChannelInfo {
  channelId: string;
  title: string;
  description: string;
  customUrl: string;
  publishedAt: Date;
  thumbnails: {
    default: string;
    medium: string;
    high: string;
  };
  country: string;
  viewCount: number;
  subscriberCount: number;
  videoCount: number;
  hiddenSubscriberCount: boolean;
}

// ============================================================================
// Video Types
// ============================================================================

export interface YouTubeVideoListResponse {
  kind: string;
  etag: string;
  nextPageToken?: string;
  prevPageToken?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items: YouTubeVideoItem[];
}

export interface YouTubeVideoItem {
  kind: string;
  etag: string;
  id: string;
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: {
      default: {
        url: string;
        width: number;
        height: number;
      };
      medium: {
        url: string;
        width: number;
        height: number;
      };
      high: {
        url: string;
        width: number;
        height: number;
      };
      standard?: {
        url: string;
        width: number;
        height: number;
      };
      maxres?: {
        url: string;
        width: number;
        height: number;
      };
    };
    channelTitle: string;
    tags?: string[];
    categoryId: string;
    liveBroadcastContent: string;
    localized: {
      title: string;
      description: string;
    };
    defaultAudioLanguage?: string;
  };
  contentDetails?: {
    duration: string;
    dimension: string;
    definition: string;
    caption: string;
    licensedContent: boolean;
    regionRestriction?: {
      allowed?: string[];
      blocked?: string[];
    };
    projection: string;
  };
  statistics?: {
    viewCount: string;
    likeCount: string;
    dislikeCount?: string;
    favoriteCount: string;
    commentCount: string;
  };
}

export interface YouTubeVideo {
  videoId: string;
  title: string;
  description: string;
  publishedAt: Date;
  channelId: string;
  channelTitle: string;
  thumbnails: {
    default: string;
    medium: string;
    high: string;
    standard?: string;
    maxres?: string;
  };
  tags?: string[];
  categoryId: string;
  duration: string;
  definition: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
}

// ============================================================================
// Video Stats Types
// ============================================================================

export interface YouTubeVideoStatsResponse {
  kind: string;
  etag: string;
  items: YouTubeVideoStatsItem[];
}

export interface YouTubeVideoStatsItem {
  kind: string;
  etag: string;
  id: string;
  statistics: {
    viewCount: string;
    likeCount: string;
    dislikeCount?: string;
    favoriteCount: string;
    commentCount: string;
  };
}

export interface YouTubeVideoStats {
  videoId: string;
  viewCount: number;
  likeCount: number;
  dislikeCount: number;
  favoriteCount: number;
  commentCount: number;
  engagementRate: number;
}

// ============================================================================
// Sync Types
// ============================================================================

export interface YouTubeSyncResult {
  kolId: string;
  accountId: string;
  success: boolean;
  syncedAt: Date;
  channelInfo?: YouTubeChannelInfo;
  videos?: YouTubeVideo[];
  videoStats?: YouTubeVideoStats[];
  error?: string;
}

export interface YouTubeSyncOptions {
  syncChannelInfo: boolean;
  syncVideos: boolean;
  syncVideoStats: boolean;
  maxVideos?: number;
}

export interface YouTubeSyncStats {
  totalSubscribers: number;
  totalVideos: number;
  totalViews: number;
  avgViews: number;
  avgLikes: number;
  avgComments: number;
  engagementRate: number;
}

// ============================================================================
// API Error Types
// ============================================================================

export interface YouTubeApiError {
  error: {
    code: number;
    message: string;
    errors: Array<{
      message: string;
      domain: string;
      reason: string;
    }>;
  };
}

export interface YouTubeRateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

// ============================================================================
// Token Storage Types
// ============================================================================

export interface YouTubeTokenStorage {
  kolAccountId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
}

// ============================================================================
// Integration Status Types
// ============================================================================

export interface YouTubeIntegrationStatus {
  isConnected: boolean;
  accountId?: string;
  platformUsername?: string;
  platformDisplayName?: string;
  subscriberCount?: number;
  lastSyncedAt?: Date;
  tokenExpiresAt?: Date;
  needsReauth: boolean;
}

// ============================================================================
// Callback Types
// ============================================================================

export interface YouTubeCallbackParams {
  code: string;
  state?: string;
  scope?: string;
  error?: string;
}

export interface YouTubeCallbackResult {
  success: boolean;
  kolAccountId?: string;
  redirectUrl: string;
  error?: string;
}
