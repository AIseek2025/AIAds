import { Prisma, type Campaign, type Kol, type KolPlatform } from '@prisma/client';
import prisma from '../config/database';
import { errors } from '../middleware/errorHandler';
import { KolResponse } from '../types';

export interface KolRecommendation {
  kol: KolResponse;
  match_score: number;
  match_reasons: string[];
  estimated_reach: number;
  estimated_engagement: number;
}

export interface MatchingCriteria {
  platform?: string;
  min_followers?: number;
  max_followers?: number;
  categories?: string[];
  regions?: string[];
  min_engagement_rate?: number;
  budget_range?: [number, number];
}

export class AiMatchingService {
  /**
   * Recommend KOLs based on campaign requirements
   */
  async recommendKols(campaignId: string, advertiserUserId: string, limit: number = 20): Promise<KolRecommendation[]> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        advertiser: { select: { userId: true } },
      },
    });

    if (!campaign) {
      throw errors.notFound('活动不存在');
    }
    if (campaign.advertiser.userId !== advertiserUserId) {
      throw errors.forbidden('无权查看该活动的 KOL 推荐');
    }

    // Build matching criteria from campaign
    const criteria: MatchingCriteria = {
      platform: campaign.targetPlatforms?.[0],
      min_followers: campaign.minFollowers || undefined,
      max_followers: campaign.maxFollowers || undefined,
      categories: campaign.requiredCategories,
      regions: campaign.targetCountries,
      min_engagement_rate: campaign.minEngagementRate?.toNumber(),
      budget_range: [0, campaign.budget.toNumber()],
    };

    // Get candidate KOLs
    const candidates = await this.getCandidateKols(criteria, limit * 3);

    // Score and rank KOLs
    const scoredKols = candidates.map((kol) => this.scoreKol(kol, campaign));

    // Sort by score and take top N
    scoredKols.sort((a, b) => b.match_score - a.match_score);

    return scoredKols.slice(0, limit);
  }

  /**
   * Get candidate KOLs based on basic criteria
   */
  private async getCandidateKols(criteria: MatchingCriteria, limit: number): Promise<Kol[]> {
    const where: Prisma.KolWhereInput = {
      status: 'active',
      verified: true,
    };

    // Platform filter
    if (criteria.platform) {
      where.platform = criteria.platform as KolPlatform;
    }

    // Followers range
    if (criteria.min_followers !== undefined || criteria.max_followers !== undefined) {
      const fr: Prisma.IntFilter = {};
      if (criteria.min_followers !== undefined) {
        fr.gte = criteria.min_followers;
      }
      if (criteria.max_followers !== undefined) {
        fr.lte = criteria.max_followers;
      }
      where.followers = fr;
    }

    // Engagement rate filter
    if (criteria.min_engagement_rate !== undefined) {
      where.engagementRate = { gte: criteria.min_engagement_rate };
    }

    // Category filter
    if (criteria.categories && criteria.categories.length > 0) {
      where.OR = criteria.categories.map((cat) => ({
        category: { contains: cat, mode: 'insensitive' },
      }));
    }

    // Region filter
    if (criteria.regions && criteria.regions.length > 0) {
      where.country = { in: criteria.regions };
    }

    return prisma.kol.findMany({
      where,
      orderBy: { followers: 'desc' },
      take: limit,
    });
  }

  /**
   * Score a KOL based on campaign match
   */
  private scoreKol(kol: Kol, campaign: Campaign): KolRecommendation {
    let score = 0;
    const reasons: string[] = [];

    // Follower score (0-30 points)
    const followerScore = this.calculateFollowerScore(kol.followers, campaign);
    score += followerScore;
    if (followerScore > 20) {
      reasons.push('粉丝数量匹配');
    }

    // Engagement rate score (0-25 points)
    const engagementScore = this.calculateEngagementScore(kol.engagementRate.toNumber(), campaign);
    score += engagementScore;
    if (engagementScore > 20) {
      reasons.push('高互动率');
    }

    // Category match score (0-20 points)
    const categoryScore = this.calculateCategoryScore(kol.category, campaign.requiredCategories);
    score += categoryScore;
    if (categoryScore > 15) {
      reasons.push('类别匹配');
    }

    // Region match score (0-15 points)
    const regionScore = this.calculateRegionScore(kol.country, campaign.targetCountries);
    score += regionScore;
    if (regionScore > 10) {
      reasons.push('地区匹配');
    }

    // Historical performance score (0-10 points)
    const performanceScore = this.calculatePerformanceScore(kol);
    score += performanceScore;
    if (performanceScore > 7) {
      reasons.push('历史表现优秀');
    }

    // Calculate estimated reach and engagement
    const estimated_reach = Math.round(kol.followers * 0.3); // Assume 30% reach
    const estimated_engagement = Math.round(estimated_reach * kol.engagementRate.toNumber());

    return {
      kol: this.formatKolResponse(kol),
      match_score: Math.round(score * 100) / 100,
      match_reasons: reasons,
      estimated_reach,
      estimated_engagement,
    };
  }

  /**
   * Calculate follower score (0-30 points)
   */
  private calculateFollowerScore(followers: number, campaign: Campaign): number {
    const minFollowers = campaign.minFollowers || 0;
    const maxFollowers = campaign.maxFollowers || 1000000;
    const targetMin = minFollowers;
    const targetMax = maxFollowers;

    if (followers >= targetMin && followers <= targetMax) {
      // Perfect match - in range
      const midPoint = (targetMin + targetMax) / 2;
      const distanceFromMid = Math.abs(followers - midPoint);
      const maxDistance = (targetMax - targetMin) / 2;
      return 30 * (1 - distanceFromMid / maxDistance);
    } else if (followers < targetMin) {
      // Below range - partial score
      return Math.max(0, 30 * (followers / targetMin));
    } else {
      // Above range - slight penalty
      return Math.max(0, 30 * (1 - (followers - targetMax) / targetMax));
    }
  }

  /**
   * Calculate engagement rate score (0-25 points)
   */
  private calculateEngagementScore(engagementRate: number, campaign: Campaign): number {
    const minEngagement = campaign.minEngagementRate?.toNumber() || 0.01;

    if (engagementRate >= minEngagement * 2) {
      return 25; // Excellent
    } else if (engagementRate >= minEngagement * 1.5) {
      return 20; // Good
    } else if (engagementRate >= minEngagement) {
      return 15; // Acceptable
    } else {
      return Math.max(0, 15 * (engagementRate / minEngagement));
    }
  }

  /**
   * Calculate category match score (0-20 points)
   */
  private calculateCategoryScore(kolCategory: string | null, requiredCategories: string[]): number {
    if (!requiredCategories || requiredCategories.length === 0) {
      return 10; // No preference
    }

    if (!kolCategory) {
      return 0;
    }

    for (const category of requiredCategories) {
      if (kolCategory.toLowerCase().includes(category.toLowerCase())) {
        return 20; // Perfect match
      }
    }

    return 5; // Partial match
  }

  /**
   * Calculate region match score (0-15 points)
   */
  private calculateRegionScore(kolCountry: string | null, targetCountries: string[]): number {
    if (!targetCountries || targetCountries.length === 0) {
      return 10; // No preference
    }

    if (!kolCountry) {
      return 0;
    }

    if (targetCountries.includes(kolCountry)) {
      return 15; // Perfect match
    }

    return 5; // Partial match
  }

  /**
   * Calculate historical performance score (0-10 points)
   */
  private calculatePerformanceScore(kol: Kol): number {
    let score = 0;

    // Completed orders score (0-5 points)
    if (kol.completedOrders >= 20) {
      score += 5;
    } else if (kol.completedOrders >= 10) {
      score += 3;
    } else if (kol.completedOrders >= 5) {
      score += 1;
    }

    // Rating score (0-5 points)
    const avgRating = kol.avgRating.toNumber() || 0;
    if (avgRating >= 4.8) {
      score += 5;
    } else if (avgRating >= 4.5) {
      score += 3;
    } else if (avgRating >= 4.0) {
      score += 1;
    }

    return score;
  }

  /**
   * Format KOL response
   */
  private formatKolResponse(kol: Kol): KolResponse {
    return {
      id: kol.id,
      user_id: kol.userId,
      platform: kol.platform,
      platform_id: kol.platformId,
      platform_username: kol.platformUsername,
      platform_display_name: kol.platformDisplayName ?? undefined,
      platform_avatar_url: kol.platformAvatarUrl ?? undefined,
      bio: kol.bio ?? undefined,
      category: kol.category ?? undefined,
      subcategory: kol.subcategory ?? undefined,
      country: kol.country ?? undefined,
      region: kol.region ?? undefined,
      city: kol.city ?? undefined,
      followers: kol.followers,
      following: kol.following,
      total_videos: kol.totalVideos,
      total_likes: kol.totalLikes,
      avg_views: kol.avgViews,
      avg_likes: kol.avgLikes,
      avg_comments: kol.avgComments,
      avg_shares: kol.avgShares,
      engagement_rate: kol.engagementRate.toNumber(),
      status: kol.status,
      verified: kol.verified,
      verified_at: kol.verifiedAt?.toISOString(),
      base_price: kol.basePrice?.toNumber(),
      price_per_video: kol.pricePerVideo?.toNumber(),
      currency: kol.currency,
      total_earnings: kol.totalEarnings.toNumber(),
      available_balance: kol.availableBalance.toNumber(),
      pending_balance: kol.pendingBalance.toNumber(),
      total_orders: kol.totalOrders,
      completed_orders: kol.completedOrders,
      avg_rating: kol.avgRating.toNumber(),
      tags: kol.tags || [],
      created_at: kol.createdAt.toISOString(),
      updated_at: kol.updatedAt.toISOString(),
      last_synced_at: kol.lastSyncedAt?.toISOString(),
    };
  }
}

export const aiMatchingService = new AiMatchingService();
