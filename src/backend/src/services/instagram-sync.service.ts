/**
 * Instagram Sync Service
 *
 * Handles scheduled synchronization of Instagram KOL data.
 * Uses node-cron for scheduling and implements retry logic.
 */

import * as cron from 'node-cron';
import prisma from '../config/database';
import { logger } from '../utils/logger';
import { instagramService } from './instagram.service';
import { InstagramSyncResult } from './instagram.types';

export interface SyncJobStats {
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  lastRunAt?: Date;
  nextRunAt?: Date;
}

export class InstagramSyncService {
  private activeKolsJob: cron.ScheduledTask | null = null;
  private allKolsJob: cron.ScheduledTask | null = null;
  private tokenRefreshJob: cron.ScheduledTask | null = null;
  private isRunning = false;
  private readonly maxRetries = 3;
  private readonly retryDelay = 5000; // 5 seconds

  /**
   * Initialize scheduled tasks
   */
  public init(): void {
    // Check if Instagram integration is enabled
    if (!process.env.INSTAGRAM_CLIENT_ID || !process.env.INSTAGRAM_CLIENT_SECRET) {
      logger.warn('Instagram integration disabled: missing credentials');
      return;
    }

    this.scheduleActiveKolsSync();
    this.scheduleAllKolsSync();
    this.scheduleTokenRefresh();

    logger.info('Instagram sync jobs initialized', {
      activeKolsSchedule: 'Every hour',
      allKolsSchedule: 'Daily at 3:00 AM',
      tokenRefreshSchedule: 'Every 30 minutes',
    });
  }

  /**
   * Schedule active KOLs sync (every hour)
   * Active KOLs are those who have connected Instagram and have recent activity
   */
  private scheduleActiveKolsSync(): void {
    // Run every hour at minute 0
    this.activeKolsJob = cron.schedule(
      '0 * * * *',
      async () => {
        await this.syncActiveKols();
      },
      {
        timezone: 'Asia/Shanghai',
      }
    );

    logger.info('Active KOLs sync job scheduled', { cron: '0 * * * *' });
  }

  /**
   * Schedule all KOLs sync (daily at 3:00 AM)
   */
  private scheduleAllKolsSync(): void {
    // Run daily at 3:00 AM
    this.allKolsJob = cron.schedule(
      '0 3 * * *',
      async () => {
        await this.syncAllKols();
      },
      {
        timezone: 'Asia/Shanghai',
      }
    );

    logger.info('All KOLs sync job scheduled', { cron: '0 3 * * *' });
  }

  /**
   * Schedule token refresh check (every 30 minutes)
   */
  private scheduleTokenRefresh(): void {
    // Run every 30 minutes
    this.tokenRefreshJob = cron.schedule(
      '*/30 * * * *',
      async () => {
        await this.checkAndRefreshTokens();
      },
      {
        timezone: 'Asia/Shanghai',
      }
    );

    logger.info('Token refresh job scheduled', { cron: '*/30 * * * *' });
  }

  /**
   * Sync active KOLs
   * Active KOLs: connected Instagram account and synced in the last 7 days
   */
  async syncActiveKols(): Promise<SyncJobStats> {
    if (this.isRunning) {
      logger.warn('Sync job already running, skipping...');
      return { totalJobs: 0, successfulJobs: 0, failedJobs: 0 };
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      // Find active KOLs with Instagram accounts
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const kolAccounts = await prisma.kolAccount.findMany({
        where: {
          platform: 'instagram',
          accessToken: { not: null },
          lastSyncedAt: {
            gte: sevenDaysAgo,
          },
          kol: {
            status: 'active',
          },
        },
        include: {
          kol: {
            select: {
              id: true,
              userId: true,
              status: true,
            },
          },
        },
      });

      logger.info('Starting active KOLs sync', { count: kolAccounts.length });

      const stats: SyncJobStats = {
        totalJobs: kolAccounts.length,
        successfulJobs: 0,
        failedJobs: 0,
        lastRunAt: new Date(),
      };

      // Process KOLs in batches to avoid rate limiting
      const batchSize = 5;
      for (let i = 0; i < kolAccounts.length; i += batchSize) {
        const batch = kolAccounts.slice(i, i + batchSize);
        const promises = batch.map((account) => this.syncWithRetry(account.kolId, account.id));

        const results = await Promise.all(promises);

        results.forEach((result) => {
          if (result.success) {
            stats.successfulJobs++;
          } else {
            stats.failedJobs++;
          }
        });

        // Add delay between batches to respect rate limits
        if (i + batchSize < kolAccounts.length) {
          await this.delay(2000);
        }
      }

      const duration = Date.now() - startTime;
      logger.info('Active KOLs sync completed', {
        ...stats,
        duration: `${duration}ms`,
      });

      return stats;
    } catch (error) {
      logger.error('Active KOLs sync failed', { error });
      return {
        totalJobs: 0,
        successfulJobs: 0,
        failedJobs: 0,
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Sync all KOLs with Instagram accounts
   */
  async syncAllKols(): Promise<SyncJobStats> {
    if (this.isRunning) {
      logger.warn('Sync job already running, skipping...');
      return { totalJobs: 0, successfulJobs: 0, failedJobs: 0 };
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      // Find all KOLs with Instagram accounts
      const kolAccounts = await prisma.kolAccount.findMany({
        where: {
          platform: 'instagram',
          accessToken: { not: null },
          kol: {
            status: {
              in: ['active', 'verified'],
            },
          },
        },
        include: {
          kol: {
            select: {
              id: true,
              userId: true,
              status: true,
            },
          },
        },
      });

      logger.info('Starting all KOLs sync', { count: kolAccounts.length });

      const stats: SyncJobStats = {
        totalJobs: kolAccounts.length,
        successfulJobs: 0,
        failedJobs: 0,
        lastRunAt: new Date(),
      };

      // Process KOLs in smaller batches for full sync
      const batchSize = 3;
      for (let i = 0; i < kolAccounts.length; i += batchSize) {
        const batch = kolAccounts.slice(i, i + batchSize);
        const promises = batch.map((account) => this.syncWithRetry(account.kolId, account.id, { syncMedia: true }));

        const results = await Promise.all(promises);

        results.forEach((result) => {
          if (result.success) {
            stats.successfulJobs++;
          } else {
            stats.failedJobs++;
          }
        });

        // Add longer delay between batches for full sync
        if (i + batchSize < kolAccounts.length) {
          await this.delay(5000);
        }
      }

      const duration = Date.now() - startTime;
      logger.info('All KOLs sync completed', {
        ...stats,
        duration: `${duration}ms`,
      });

      return stats;
    } catch (error) {
      logger.error('All KOLs sync failed', { error });
      return {
        totalJobs: 0,
        successfulJobs: 0,
        failedJobs: 0,
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Check and refresh expiring tokens
   */
  async checkAndRefreshTokens(): Promise<void> {
    try {
      const now = new Date();
      const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);

      // Find tokens expiring in the next 30 minutes
      const expiringAccounts = await prisma.kolAccount.findMany({
        where: {
          platform: 'instagram',
          refreshToken: { not: null },
          expiresAt: {
            lte: thirtyMinutesFromNow,
          },
        },
      });

      if (expiringAccounts.length === 0) {
        return;
      }

      logger.info('Refreshing expiring tokens', { count: expiringAccounts.length });

      for (const account of expiringAccounts) {
        try {
          await instagramService.syncKolData(account.kolId, {
            syncAccountInfo: true,
            syncMedia: false,
            syncMediaStats: false,
          });
          logger.info('Token refreshed successfully', { accountId: account.id });
        } catch (error) {
          logger.error('Failed to refresh token', {
            accountId: account.id,
            error,
          });
        }
      }
    } catch (error) {
      logger.error('Token refresh check failed', { error });
    }
  }

  /**
   * Sync with retry logic
   */
  private async syncWithRetry(
    kolId: string,
    accountId: string,
    options?: { syncMedia?: boolean }
  ): Promise<InstagramSyncResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await instagramService.syncKolData(kolId, {
          syncAccountInfo: true,
          syncMedia: options?.syncMedia || false,
          syncMediaStats: false,
          maxMedia: 5,
        });

        if (result.success) {
          if (attempt > 1) {
            logger.info('Sync succeeded after retries', {
              kolId,
              attempts: attempt,
            });
          }
          return result;
        }

        lastError = new Error(result.error || 'Sync failed');
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Sync attempt ${attempt} failed`, {
          kolId,
          attempt,
          error: lastError.message,
        });
      }

      // Wait before retry (exponential backoff)
      if (attempt < this.maxRetries) {
        await this.delay(this.retryDelay * attempt);
      }
    }

    logger.error('Sync failed after all retries', {
      kolId,
      accountId,
      attempts: this.maxRetries,
      error: lastError?.message,
    });

    return {
      kolId,
      accountId,
      success: false,
      syncedAt: new Date(),
      error: lastError?.message || 'Unknown error',
    };
  }

  /**
   * Manual sync for a specific KOL
   */
  async syncKol(kolId: string, fullSync: boolean = false): Promise<InstagramSyncResult> {
    try {
      // Verify KOL has Instagram account
      const kolAccount = await prisma.kolAccount.findFirst({
        where: {
          kolId,
          platform: 'instagram',
        },
      });

      if (!kolAccount) {
        throw new Error('Instagram account not connected');
      }

      if (!kolAccount.accessToken) {
        throw new Error('Access token not found, please reconnect');
      }

      return await instagramService.syncKolData(kolId, {
        syncAccountInfo: true,
        syncMedia: fullSync,
        syncMediaStats: fullSync,
        maxMedia: fullSync ? 30 : 5,
      });
    } catch (error) {
      logger.error('Manual sync failed', { kolId, error });
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
   * Get sync job statistics
   */
  async getJobStats(): Promise<{
    activeKols: SyncJobStats;
    allKols: SyncJobStats;
  }> {
    // Get last sync times from database
    const recentSyncs = await prisma.kolAccount.findMany({
      where: {
        platform: 'instagram',
        lastSyncedAt: { not: null },
      },
      orderBy: { lastSyncedAt: 'desc' },
      take: 100,
    });

    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentSyncedCount = recentSyncs.filter((a) => a.lastSyncedAt && a.lastSyncedAt >= last24Hours).length;

    return {
      activeKols: {
        totalJobs: recentSyncedCount,
        successfulJobs: recentSyncedCount,
        failedJobs: 0,
        lastRunAt: recentSyncs[0]?.lastSyncedAt || undefined,
        nextRunAt: this.getNextRunTime('0 * * * *'),
      },
      allKols: {
        totalJobs: recentSyncs.length,
        successfulJobs: recentSyncs.length,
        failedJobs: 0,
        lastRunAt: recentSyncs[0]?.lastSyncedAt || undefined,
        nextRunAt: this.getNextRunTime('0 3 * * *'),
      },
    };
  }

  /**
   * Get next run time for a cron expression
   */
  private getNextRunTime(cronExpression: string): Date | undefined {
    // Simple estimation based on cron expression
    const now = new Date();

    if (cronExpression === '0 * * * *') {
      // Next hour
      return new Date(now.setMinutes(0, 0, 0) + 60 * 60 * 1000);
    } else if (cronExpression === '0 3 * * *') {
      // Next 3 AM
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(3, 0, 0, 0);
      return tomorrow;
    }

    return undefined;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Stop all scheduled jobs
   */
  public stop(): void {
    if (this.activeKolsJob) {
      this.activeKolsJob.stop();
      logger.info('Active KOLs sync job stopped');
    }
    if (this.allKolsJob) {
      this.allKolsJob.stop();
      logger.info('All KOLs sync job stopped');
    }
    if (this.tokenRefreshJob) {
      this.tokenRefreshJob.stop();
      logger.info('Token refresh job stopped');
    }
  }

  /**
   * Start all scheduled jobs
   */
  public start(): void {
    if (this.activeKolsJob) {
      this.activeKolsJob.start();
    }
    if (this.allKolsJob) {
      this.allKolsJob.start();
    }
    if (this.tokenRefreshJob) {
      this.tokenRefreshJob.start();
    }
    logger.info('All Instagram sync jobs started');
  }
}

export const instagramSyncService = new InstagramSyncService();
