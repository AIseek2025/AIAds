/**
 * AIAds Platform - Feature Flag Service
 * Version: 1.3.0
 * Last Updated: 2026-05-06
 *
 * Provides feature flag functionality for production releases
 * Canary release completed - all features fully rolled out
 */

import { createHash } from 'crypto';

export interface FeatureFlagConfig {
  name: string;
  enabled: boolean;
  percentage?: number;
  userWhitelist?: Set<string>;
  userGroupWhitelist?: string[];
  startTime?: Date;
  endTime?: Date;
}

export interface FeatureFlagContext {
  userId?: string;
  userGroup?: string;
  environment: string;
  requestId: string;
}

export class FeatureFlagService {
  // Feature flags configuration
  private flags: Map<string, FeatureFlagConfig> = new Map();

  // Canary user whitelist (kept for emergency rollback)
  private canaryUsers: Set<string> = new Set();

  // Event listeners for flag changes
  private listeners: Map<string, Array<(flag: string, enabled: boolean) => void>> = new Map();

  constructor() {
    this.initializeDefaultFlags();
  }

  /**
   * Initialize default feature flags
   * Production Release v1.3.0 - All features 100% enabled
   */
  private initializeDefaultFlags(): void {
    // Main canary release flag - COMPLETED
    this.flags.set('canaryRelease', {
      name: 'canaryRelease',
      enabled: false,  // Canary release completed
      percentage: 100, // 100% - Full rollout complete
    });

    // New dashboard feature - FULL ROLLOUT
    this.flags.set('newDashboard', {
      name: 'newDashboard',
      enabled: true,
      percentage: 100, // 100% - Full rollout
    });

    // AI matching feature - FULL ROLLOUT
    this.flags.set('aiMatching', {
      name: 'aiMatching',
      enabled: true,
      percentage: 100, // 100% - Full rollout
    });

    // AI matching v2 feature - FULL ROLLOUT
    this.flags.set('aiMatchingV2', {
      name: 'aiMatchingV2',
      enabled: true,
      percentage: 100, // 100% - Full rollout
    });

    // Payment V2 feature - DISABLED (future release)
    this.flags.set('paymentV2', {
      name: 'paymentV2',
      enabled: false,
      percentage: 0,
    });

    // New recommendation engine - FULL ROLLOUT
    this.flags.set('newRecommendationEngine', {
      name: 'newRecommendationEngine',
      enabled: true,
      percentage: 100, // 100% - Full rollout
    });

    // Dark mode - FULL ROLLOUT
    this.flags.set('darkMode', {
      name: 'darkMode',
      enabled: true,
      percentage: 100, // 100% - Full rollout
    });
  }

  /**
   * Check if a feature flag is enabled for a given context
   * @param flag - The feature flag name
   * @param context - The context containing user information
   * @returns boolean indicating if the feature is enabled
   */
  isEnabled(flag: string, context?: FeatureFlagContext): boolean {
    const flagConfig = this.flags.get(flag);
    
    // Flag doesn't exist
    if (!flagConfig) {
      console.warn(`Feature flag '${flag}' not found`);
      return false;
    }

    // Flag is globally disabled
    if (!flagConfig.enabled) {
      return false;
    }

    // Check time-based restrictions
    const now = new Date();
    if (flagConfig.startTime && now < flagConfig.startTime) {
      return false;
    }
    if (flagConfig.endTime && now > flagConfig.endTime) {
      return false;
    }

    // No context provided, return global enabled state
    if (!context) {
      return flagConfig.percentage === 100;
    }

    // Check user whitelist
    if (context.userId && flagConfig.userWhitelist?.has(context.userId)) {
      return true;
    }

    // Check user group whitelist
    if (context.userGroup && flagConfig.userGroupWhitelist?.includes(context.userGroup)) {
      return true;
    }

    // Check canary users
    if (context.userId && this.canaryUsers.has(context.userId)) {
      return true;
    }

    // Percentage-based rollout
    if (flagConfig.percentage !== undefined && flagConfig.percentage < 100) {
      return this.isInPercentageRollout(flag, context.userId, flagConfig.percentage);
    }

    return true;
  }

  /**
   * Determine if a user is in the percentage rollout
   * Uses consistent hashing to ensure same user always gets same result
   */
  private isInPercentageRollout(flag: string, userId: string | undefined, percentage: number): boolean {
    // If no user ID, use random assignment
    if (!userId) {
      return Math.random() * 100 < percentage;
    }

    // Use consistent hashing based on user ID and flag name
    const hash = this.hashUserId(userId, flag);
    const bucket = hash % 100;
    
    return bucket < percentage;
  }

  /**
   * Hash user ID to a consistent number between 0-99
   */
  private hashUserId(userId: string, salt: string = ''): number {
    const hash = createHash('md5');
    hash.update(`${userId}:${salt}`);
    const hashHex = hash.digest('hex');
    return parseInt(hashHex.substring(0, 8), 16) % 100;
  }

  /**
   * Add a user to the canary whitelist
   */
  addCanaryUser(userId: string): void {
    this.canaryUsers.add(userId);
    this.emitFlagChange('canaryRelease', true);
  }

  /**
   * Remove a user from the canary whitelist
   */
  removeCanaryUser(userId: string): void {
    this.canaryUsers.delete(userId);
  }

  /**
   * Check if a user is in the canary group
   */
  isCanaryUser(userId: string): boolean {
    return this.canaryUsers.has(userId);
  }

  /**
   * Get all feature flags for a given context
   */
  getAllFlags(context?: FeatureFlagContext): Record<string, boolean> {
    const result: Record<string, boolean> = {};
    
    for (const [name] of this.flags) {
      result[name] = this.isEnabled(name, context);
    }
    
    return result;
  }

  /**
   * Get a specific feature flag configuration
   */
  getFlagConfig(flag: string): FeatureFlagConfig | undefined {
    return this.flags.get(flag);
  }

  /**
   * Update a feature flag configuration
   */
  updateFlag(flag: string, config: Partial<FeatureFlagConfig>): void {
    const existing = this.flags.get(flag);
    
    if (!existing) {
      throw new Error(`Feature flag '${flag}' not found`);
    }

    const updated = { ...existing, ...config };
    this.flags.set(flag, updated);
    
    this.emitFlagChange(flag, config.enabled ?? existing.enabled);
  }

  /**
   * Create a new feature flag
   */
  createFlag(config: FeatureFlagConfig): void {
    if (this.flags.has(config.name)) {
      throw new Error(`Feature flag '${config.name}' already exists`);
    }
    
    this.flags.set(config.name, config);
  }

  /**
   * Delete a feature flag
   */
  deleteFlag(flag: string): void {
    this.flags.delete(flag);
  }

  /**
   * Subscribe to flag changes
   */
  subscribe(flag: string, callback: (flag: string, enabled: boolean) => void): () => void {
    if (!this.listeners.has(flag)) {
      this.listeners.set(flag, []);
    }
    
    this.listeners.get(flag)!.push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(flag) || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Emit flag change event
   */
  private emitFlagChange(flag: string, enabled: boolean): void {
    const callbacks = this.listeners.get(flag) || [];
    callbacks.forEach(callback => callback(flag, enabled));
  }

  /**
   * Get flag evaluation details for debugging
   */
  getEvaluationDetails(flag: string, context?: FeatureFlagContext): {
    enabled: boolean;
    reason: string;
    flagConfig?: FeatureFlagConfig;
  } {
    const flagConfig = this.flags.get(flag);
    
    if (!flagConfig) {
      return { enabled: false, reason: 'FLAG_NOT_FOUND' };
    }

    if (!flagConfig.enabled) {
      return { enabled: false, reason: 'FLAG_DISABLED', flagConfig };
    }

    if (!context) {
      return { 
        enabled: flagConfig.percentage === 100, 
        reason: 'NO_CONTEXT',
        flagConfig 
      };
    }

    if (context.userId && this.canaryUsers.has(context.userId)) {
      return { enabled: true, reason: 'CANARY_USER', flagConfig };
    }

    if (context.userId && flagConfig.userWhitelist?.has(context.userId)) {
      return { enabled: true, reason: 'USER_WHITELIST', flagConfig };
    }

    if (context.userGroup && flagConfig.userGroupWhitelist?.includes(context.userGroup)) {
      return { enabled: true, reason: 'GROUP_WHITELIST', flagConfig };
    }

    if (flagConfig.percentage !== undefined && flagConfig.percentage < 100) {
      const bucket = this.hashUserId(context.userId || '', flag);
      const inRollout = bucket < flagConfig.percentage;
      return { 
        enabled: inRollout, 
        reason: inRollout ? 'PERCENTAGE_ROLLOUT' : 'PERCENTAGE_EXCLUDED',
        flagConfig 
      };
    }

    return { enabled: true, reason: 'FULLY_ENABLED', flagConfig };
  }

  /**
   * Export all flags for serialization
   */
  export(): Record<string, FeatureFlagConfig> {
    const result: Record<string, FeatureFlagConfig> = {};
    for (const [name, config] of this.flags) {
      result[name] = {
        ...config,
        userWhitelist: config.userWhitelist ? Array.from(config.userWhitelist) : undefined,
      };
    }
    return result;
  }

  /**
   * Import flags from serialization
   */
  import(flags: Record<string, FeatureFlagConfig>): void {
    for (const [name, config] of Object.entries(flags)) {
      const userWhitelist = config.userWhitelist 
        ? new Set(Array.from(config.userWhitelist))
        : undefined;
      
      this.flags.set(name, {
        ...config,
        userWhitelist,
      });
    }
  }
}

// Export singleton instance
export const featureFlagService = new FeatureFlagService();

// Export middleware for Express
export function featureFlagMiddleware(req: any, res: any, next: () => void): void {
  const context: FeatureFlagContext = {
    userId: req.user?.id,
    userGroup: req.user?.group,
    environment: process.env.ENVIRONMENT || 'development',
    requestId: req.id || req.headers['x-request-id'],
  };

  // Attach feature flag service to request
  req.featureFlags = {
    isEnabled: (flag: string) => featureFlagService.isEnabled(flag, context),
    getAll: () => featureFlagService.getAllFlags(context),
    getDetails: (flag: string) => featureFlagService.getEvaluationDetails(flag, context),
  };

  next();
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      featureFlags: {
        isEnabled: (flag: string) => boolean;
        getAll: () => Record<string, boolean>;
        getDetails: (flag: string) => any;
      };
    }
  }
}
