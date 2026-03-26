/**
 * Instagram Integration Types
 *
 * Type definitions for Instagram Graph API integration
 */

// ============================================================================
// OAuth Types
// ============================================================================

export interface InstagramOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface InstagramAuthUrlResponse {
  authUrl: string;
  state: string;
}

export interface InstagramTokenResponse {
  access_token: string;
  user_id: string;
}

export interface InstagramLongLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface InstagramToken {
  accessToken: string;
  expiresAt: Date;
  userId: string;
}

// ============================================================================
// Account Info Types
// ============================================================================

export interface InstagramAccountInfoResponse {
  id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  biography?: string;
  website?: string;
  is_verified?: boolean;
  is_business_account?: boolean;
  account_type?: string;
}

export interface InstagramAccountInfo {
  accountId: string;
  username: string;
  name?: string;
  profilePictureUrl?: string;
  followersCount: number;
  followsCount: number;
  mediaCount: number;
  biography?: string;
  website?: string;
  isVerified: boolean;
  isBusinessAccount: boolean;
  accountType: string;
}

// ============================================================================
// Media Types
// ============================================================================

export interface InstagramMediaListResponse {
  data: InstagramMediaItem[];
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
    next?: string;
  };
}

export interface InstagramMediaItem {
  id: string;
  caption?: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
  is_video?: boolean;
  video_url?: string;
  username?: string;
  children?: {
    data: InstagramMediaItem[];
  };
}

export interface InstagramMedia {
  mediaId: string;
  caption?: string;
  mediaType: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  permalink: string;
  timestamp: Date;
  likeCount: number;
  commentsCount: number;
  isVideo: boolean;
  videoUrl?: string;
  username?: string;
}

// ============================================================================
// Media Stats Types
// ============================================================================

export interface InstagramMediaStatsResponse {
  id: string;
  like_count?: number;
  comments_count?: number;
  saved?: number;
  reach?: number;
  impressions?: number;
  engagement?: number;
  video_views?: number;
  play_count?: number;
}

export interface InstagramMediaStats {
  mediaId: string;
  likeCount: number;
  commentsCount: number;
  saved?: number;
  reach?: number;
  impressions?: number;
  engagement?: number;
  videoViews?: number;
  playCount?: number;
  engagementRate: number;
}

// ============================================================================
// Insights Types
// ============================================================================

export interface InstagramInsightsResponse {
  data: {
    id: string;
    insights?: {
      data: InstagramInsightItem[];
    };
  };
}

export interface InstagramInsightItem {
  name: string;
  period: string;
  values: Array<{
    value: number;
    end_time?: string;
  }>;
  title: string;
  description: string;
  id: string;
}

// ============================================================================
// Sync Types
// ============================================================================

export interface InstagramSyncResult {
  kolId: string;
  accountId: string;
  success: boolean;
  syncedAt: Date;
  accountInfo?: InstagramAccountInfo;
  media?: InstagramMedia[];
  mediaStats?: InstagramMediaStats[];
  error?: string;
}

export interface InstagramSyncOptions {
  syncAccountInfo: boolean;
  syncMedia: boolean;
  syncMediaStats: boolean;
  maxMedia?: number;
}

export interface InstagramSyncStats {
  totalFollowers: number;
  totalFollowing: number;
  totalMedia: number;
  avgLikes: number;
  avgComments: number;
  avgReach?: number;
  avgImpressions?: number;
  engagementRate: number;
}

// ============================================================================
// API Error Types
// ============================================================================

export interface InstagramApiError {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

export interface InstagramRateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

// ============================================================================
// Token Storage Types
// ============================================================================

export interface InstagramTokenStorage {
  kolAccountId: string;
  accessToken: string;
  expiresAt: Date;
  userId: string;
}

// ============================================================================
// Integration Status Types
// ============================================================================

export interface InstagramIntegrationStatus {
  isConnected: boolean;
  accountId?: string;
  platformUsername?: string;
  platformDisplayName?: string;
  followerCount?: number;
  lastSyncedAt?: Date;
  tokenExpiresAt?: Date;
  needsReauth: boolean;
}

// ============================================================================
// Callback Types
// ============================================================================

export interface InstagramCallbackParams {
  code: string;
  state?: string;
}

export interface InstagramCallbackResult {
  success: boolean;
  kolAccountId?: string;
  redirectUrl: string;
  error?: string;
}

// ============================================================================
// Facebook/Instagram Graph API Types
// ============================================================================

export interface FacebookPageInfo {
  id: string;
  name: string;
  instagram_business_account?: {
    id: string;
  };
}

export interface InstagramBusinessAccount {
  id: string;
  username: string;
  name: string;
  profile_picture_url: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
  biography: string;
  website: string;
  is_verified: boolean;
  is_business_account: boolean;
}
