/**
 * TikTok Integration Types
 *
 * Type definitions for TikTok API integration
 */

// ============================================================================
// OAuth Types
// ============================================================================

export interface TikTokOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface TikTokAuthUrlResponse {
  authUrl: string;
  state: string;
}

export interface TikTokTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
  open_id: string;
  scope: string;
  token_type: string;
}

export interface TikTokToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  refreshExpiresAt: Date;
  openId: string;
  scope: string;
}

// ============================================================================
// User Info Types
// ============================================================================

export interface TikTokUserInfoResponse {
  data: {
    open_id: string;
    union_id: string;
    display_name: string;
    username: string;
    avatar_url: string;
    avatar_url_100x100: string;
    avatar_large_url: string;
    follower_count: number;
    following_count: number;
    video_count: number;
    heart_count: number;
    is_verified: boolean;
    profile_deep_link: string;
  };
}

export interface TikTokUserInfo {
  openId: string;
  unionId: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  avatarUrl100x100: string;
  avatarLargeUrl: string;
  followerCount: number;
  followingCount: number;
  videoCount: number;
  heartCount: number;
  isVerified: boolean;
  profileDeepLink: string;
}

// ============================================================================
// Video Types
// ============================================================================

export interface TikTokVideoResponse {
  data: {
    videos: TikTokVideoItem[];
    cursor: number;
    has_more: boolean;
  };
}

export interface TikTokVideoItem {
  video_id: string;
  desc: string;
  create_time: number;
  author: {
    id: string;
    unique_id: string;
    nickname: string;
    avatar_thumb: {
      url_list: string[];
    };
  };
  music: {
    id: string;
    title: string;
    author: string;
    duration: number;
  };
  video: {
    play_addr: {
      url_list: string[];
    };
    cover: {
      url_list: string[];
    };
    dynamic_cover: {
      url_list: string[];
    };
    duration: number;
    ratio: string;
    width: number;
    height: number;
  };
  share_url: string;
  is_ad: boolean;
}

export interface TikTokVideo {
  videoId: string;
  description: string;
  createTime: Date;
  author: {
    id: string;
    uniqueId: string;
    nickname: string;
    avatarUrl: string;
  };
  music: {
    id: string;
    title: string;
    author: string;
    duration: number;
  };
  video: {
    playUrl: string;
    coverUrl: string;
    dynamicCoverUrl: string;
    duration: number;
    ratio: string;
    width: number;
    height: number;
  };
  shareUrl: string;
  isAd: boolean;
}

// ============================================================================
// Video Stats Types
// ============================================================================

export interface TikTokVideoStatsResponse {
  data: {
    video_id: string;
    play_count: number;
    like_count: number;
    comment_count: number;
    share_count: number;
    download_count: number;
    forward_count: number;
    lose_count: number;
    lose_comment_count: number;
    whatsapp_share_count: number;
    collect_count: number;
  };
}

export interface TikTokVideoStats {
  videoId: string;
  playCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  downloadCount: number;
  forwardCount: number;
  loseCount: number;
  loseCommentCount: number;
  whatsappShareCount: number;
  collectCount: number;
  engagementRate: number;
}

// ============================================================================
// Sync Types
// ============================================================================

export interface TikTokSyncResult {
  kolId: string;
  accountId: string;
  success: boolean;
  syncedAt: Date;
  userInfo?: TikTokUserInfo;
  videos?: TikTokVideo[];
  videoStats?: TikTokVideoStats[];
  error?: string;
}

export interface TikTokSyncOptions {
  syncUserInfo: boolean;
  syncVideos: boolean;
  syncVideoStats: boolean;
  maxVideos?: number;
}

export interface TikTokSyncStats {
  totalFollowers: number;
  totalFollowing: number;
  totalVideos: number;
  totalLikes: number;
  avgViews: number;
  avgLikes: number;
  avgComments: number;
  avgShares: number;
  engagementRate: number;
}

// ============================================================================
// API Error Types
// ============================================================================

export interface TikTokApiError {
  error: {
    code: number;
    message: string;
    sub_code: number;
    sub_message: string;
  };
}

export interface TikTokRateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

// ============================================================================
// Token Storage Types
// ============================================================================

export interface TikTokTokenStorage {
  kolAccountId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  refreshExpiresAt: Date;
  openId: string;
  scope: string;
}

// ============================================================================
// Integration Status Types
// ============================================================================

export interface TikTokIntegrationStatus {
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

export interface TikTokCallbackParams {
  code: string;
  state: string;
}

export interface TikTokCallbackResult {
  success: boolean;
  kolAccountId?: string;
  redirectUrl: string;
  error?: string;
}
