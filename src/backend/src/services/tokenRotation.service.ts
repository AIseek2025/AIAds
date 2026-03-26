import { getRedis } from '../config/redis';
import crypto from 'crypto';
import { logger } from '../utils/logger';

// M03: Token rotation configuration
const USED_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days

/**
 * Rotate refresh token - generate new token and invalidate old one
 * Detects and prevents token reuse attacks
 */
export async function rotateRefreshToken(
  oldToken: string,
  userId: string
): Promise<string> {
  const redis = getRedis();
  if (!redis) {
    throw new Error('Redis not available for token rotation');
  }

  try {
    // Check if token was already used (reuse attack detection)
    const wasUsed = await redis.get(`token:used:${oldToken}`);
    if (wasUsed) {
      // Detected token reuse attack - invalidate all user tokens
      logger.error('Refresh token reuse detected - possible attack', {
        userId,
        tokenHash: hashToken(oldToken),
      });
      await invalidateAllUserTokens(userId);
      throw new Error('Refresh token reuse detected - all tokens invalidated');
    }

    // Generate new refresh token
    const newToken = crypto.randomBytes(32).toString('hex');

    // Mark old token as used
    await redis.setex(`token:used:${oldToken}`, USED_TOKEN_TTL, '1');

    // Store new token
    await redis.setex(`token:refresh:${newToken}`, REFRESH_TOKEN_TTL, userId);

    logger.info('Refresh token rotated', {
      userId,
      oldTokenHash: hashToken(oldToken),
      newTokenHash: hashToken(newToken),
    });

    return newToken;
  } catch (error) {
    if (error instanceof Error && error.message.includes('reuse detected')) {
      throw error;
    }
    logger.error('Error rotating refresh token', { userId, error });
    throw new Error('Failed to rotate refresh token');
  }
}

/**
 * Validate a refresh token
 */
export async function validateRefreshToken(token: string): Promise<string | null> {
  const redis = getRedis();
  if (!redis) {
    return null;
  }

  try {
    // Check if token was already used
    const wasUsed = await redis.get(`token:used:${token}`);
    if (wasUsed) {
      logger.warn('Attempt to use already-rotated token', {
        tokenHash: hashToken(token),
      });
      return null;
    }

    // Get user ID from token
    const userId = await redis.get(`token:refresh:${token}`);
    return userId;
  } catch (error) {
    logger.error('Error validating refresh token', { error });
    return null;
  }
}

/**
 * Store a new refresh token
 */
export async function storeRefreshToken(
  token: string,
  userId: string
): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    logger.warn('Redis not available, cannot store refresh token', { userId });
    return;
  }

  try {
    await redis.setex(`token:refresh:${token}`, REFRESH_TOKEN_TTL, userId);
    logger.debug('Refresh token stored', { userId, tokenHash: hashToken(token) });
  } catch (error) {
    logger.error('Error storing refresh token', { userId, error });
  }
}

/**
 * Invalidate a specific refresh token
 */
export async function invalidateRefreshToken(token: string): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    return;
  }

  try {
    await redis.del(`token:refresh:${token}`);
    await redis.setex(`token:used:${token}`, USED_TOKEN_TTL, '1');
    logger.debug('Refresh token invalidated', { tokenHash: hashToken(token) });
  } catch (error) {
    logger.error('Error invalidating refresh token', { error });
  }
}

/**
 * Invalidate all refresh tokens for a user
 */
export async function invalidateAllUserTokens(userId: string): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    return;
  }

  try {
    // Scan for all user tokens
    const pattern = `token:refresh:*`;
    const keys = await scanKeys(redis, pattern);

    for (const key of keys) {
      const tokenUserId = await redis.get(key);
      if (tokenUserId === userId) {
        const token = key.replace('token:refresh:', '');
        await redis.del(key);
        await redis.setex(`token:used:${token}`, USED_TOKEN_TTL, '1');
      }
    }

    logger.info('All user tokens invalidated', { userId });
  } catch (error) {
    logger.error('Error invalidating all user tokens', { userId, error });
  }
}

/**
 * Hash token for logging (don't log raw tokens)
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex').substring(0, 16);
}

/**
 * Scan Redis keys matching pattern
 */
async function scanKeys(redis: any, pattern: string): Promise<string[]> {
  const keys: string[] = [];
  let cursor = '0';

  do {
    const result = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = result[0];
    keys.push(...result[1]);
  } while (cursor !== '0');

  return keys;
}
