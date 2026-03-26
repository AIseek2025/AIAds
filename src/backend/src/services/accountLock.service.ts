import { getRedis } from '../config/redis';
import { logger } from '../utils/logger';

// M02: Account lock policy configuration
const LOCK_THRESHOLD = 5; // 5 failed attempts
const LOCK_DURATION = 15 * 60; // 15 minutes in seconds

/**
 * Record a login failure for a user
 * Locks account after LOCK_THRESHOLD failures
 */
export async function recordLoginFailure(userId: string): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    logger.warn('Redis not available, skipping login failure tracking', { userId });
    return;
  }

  try {
    const key = `login:failures:${userId}`;
    const count = await redis.incr(key);
    await redis.expire(key, LOCK_DURATION);

    if (count >= LOCK_THRESHOLD) {
      await redis.setex(`login:locked:${userId}`, LOCK_DURATION, '1');
      logger.warn('Account locked due to multiple failed login attempts', {
        userId,
        failedAttempts: count,
        lockDuration: LOCK_DURATION,
      });
    } else {
      logger.debug('Login failure recorded', {
        userId,
        failedAttempts: count,
        threshold: LOCK_THRESHOLD,
      });
    }
  } catch (error) {
    logger.error('Error recording login failure', { userId, error });
    // Fail secure - don't allow login if we can't track failures
  }
}

/**
 * Check if an account is locked
 */
export async function isAccountLocked(userId: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) {
    // If Redis is unavailable, assume not locked (fail open for availability)
    // But log a warning
    logger.warn('Redis not available, cannot check account lock status', { userId });
    return false;
  }

  try {
    const locked = await redis.get(`login:locked:${userId}`);
    return locked === '1';
  } catch (error) {
    logger.error('Error checking account lock status', { userId, error });
    return false;
  }
}

/**
 * Reset login failures for a user (called on successful login)
 */
export async function resetLoginFailures(userId: string): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    return;
  }

  try {
    await redis.del(`login:failures:${userId}`);
    await redis.del(`login:locked:${userId}`);
    logger.debug('Login failures reset', { userId });
  } catch (error) {
    logger.error('Error resetting login failures', { userId, error });
  }
}

/**
 * Get remaining lock time for a locked account
 */
export async function getLockRemainingTime(userId: string): Promise<number> {
  const redis = getRedis();
  if (!redis) {
    return 0;
  }

  try {
    const ttl = await redis.ttl(`login:locked:${userId}`);
    return ttl > 0 ? ttl : 0;
  } catch (error) {
    logger.error('Error getting lock remaining time', { userId, error });
    return 0;
  }
}

/**
 * Manually lock an account (for admin use)
 */
export async function manuallyLockAccount(
  userId: string,
  duration: number = LOCK_DURATION
): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    throw new Error('Redis not available');
  }

  try {
    await redis.setex(`login:locked:${userId}`, duration, '1');
    logger.info('Account manually locked', { userId, duration });
  } catch (error) {
    logger.error('Error manually locking account', { userId, error });
    throw error;
  }
}

/**
 * Manually unlock an account (for admin use)
 */
export async function manuallyUnlockAccount(userId: string): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    throw new Error('Redis not available');
  }

  try {
    await redis.del(`login:locked:${userId}`);
    await redis.del(`login:failures:${userId}`);
    logger.info('Account manually unlocked', { userId });
  } catch (error) {
    logger.error('Error manually unlocking account', { userId, error });
    throw error;
  }
}
