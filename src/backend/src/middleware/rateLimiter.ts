import { Request, Response, NextFunction } from 'express';
import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';
import { logger } from '../utils/logger';
import { cacheService } from '../services/cache.service';

// M04: Rate limiter fail-closed configuration
// When rate limiting fails, default to DENY requests for security
const FAIL_OPEN = process.env.RATE_LIMIT_FAIL_OPEN === 'true';

// P2 Fix: Configurable rate limit thresholds via environment variables
const RATE_LIMIT_CONFIG = {
  // Auth endpoints: stricter limits
  authWindowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || '900000', 10), // 15 minutes
  authMaxRequests: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '10', 10),

  // API endpoints: moderate limits
  apiWindowMs: parseInt(process.env.RATE_LIMIT_API_WINDOW_MS || '60000', 10), // 1 minute
  apiMaxRequests: parseInt(process.env.RATE_LIMIT_API_MAX || '30', 10),

  // Public endpoints: lighter limits
  publicWindowMs: parseInt(process.env.RATE_LIMIT_PUBLIC_WINDOW_MS || '60000', 10), // 1 minute
  publicMaxRequests: parseInt(process.env.RATE_LIMIT_PUBLIC_MAX || '60', 10),

  // Redis-based limits
  redisLimit: parseInt(process.env.RATE_LIMIT_REDIS_MAX || '100', 10),
  redisWindowSeconds: parseInt(process.env.RATE_LIMIT_REDIS_WINDOW || '60', 10),
};

// Default rate limit configuration
interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// Default rate limit options
const defaultOptions: RateLimitConfig = {
  windowMs: RATE_LIMIT_CONFIG.authWindowMs,
  max: RATE_LIMIT_CONFIG.authMaxRequests,
  message: '请求过于频繁，请稍后再试',
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
};

// Create rate limiter with fail-closed behavior
export function createRateLimiter(options: Partial<RateLimitConfig> = {}): RateLimitRequestHandler {
  const config = { ...defaultOptions, ...options };

  const limiter = rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: config.message,
      },
    },
    skipSuccessfulRequests: config.skipSuccessfulRequests,
    skipFailedRequests: false, // M04: Critical - fail closed (deny on error)
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      return req.ip || 'unknown';
    },
    handler: (req: Request, res: Response) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        method: req.method,
      });

      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: config.message,
        },
      });
    },
  });

  return limiter;
}

// Strict rate limiter (for auth endpoints)
// P2 Fix: Use configurable thresholds
export const strictRateLimiter = createRateLimiter({
  windowMs: RATE_LIMIT_CONFIG.authWindowMs,
  max: RATE_LIMIT_CONFIG.authMaxRequests,
  message: `操作过于频繁，请${Math.ceil(RATE_LIMIT_CONFIG.authWindowMs / 60000)}分钟后再试`,
});

// Moderate rate limiter (for API endpoints)
// P2 Fix: Use configurable thresholds
export const moderateRateLimiter = createRateLimiter({
  windowMs: RATE_LIMIT_CONFIG.apiWindowMs,
  max: RATE_LIMIT_CONFIG.apiMaxRequests,
  message: '请求过于频繁',
});

// Light rate limiter (for public endpoints)
// P2 Fix: Use configurable thresholds
export const lightRateLimiter = createRateLimiter({
  windowMs: RATE_LIMIT_CONFIG.publicWindowMs,
  max: RATE_LIMIT_CONFIG.publicMaxRequests,
  message: '请求过于频繁',
});

// Custom rate limiter using Redis
// P2 Fix: Use configurable thresholds
export function redisRateLimiter(
  keyPrefix: string = 'ratelimit',
  limit: number = RATE_LIMIT_CONFIG.redisLimit,
  windowSeconds: number = RATE_LIMIT_CONFIG.redisWindowSeconds
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const identifier = req.ip || 'unknown';
      const key = `${keyPrefix}:${identifier}`;

      // Get current count
      const current = await cacheService.increment(key, windowSeconds);

      // Set headers
      res.setHeader('X-RateLimit-Limit', limit.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - current).toString());

      if (current > limit) {
        logger.warn('Redis rate limit exceeded', {
          key,
          current,
          limit,
          path: req.path,
        });

        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: '请求过于频繁，请稍后再试',
          },
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Redis rate limiter error', { error });
      // M04: Fail closed - deny request when Redis is unavailable
      if (!FAIL_OPEN) {
        logger.warn('Redis rate limiter failed, denying request (fail-closed mode)');
        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_ERROR',
            message: '服务繁忙，请稍后再试',
          },
        });
        return;
      }
      // Fail open only if explicitly configured (less secure)
      logger.warn('Redis rate limiter failed, allowing request (fail-open mode)');
      next();
    }
  };
}

// Rate limiter by user ID (requires auth middleware)
export function userRateLimiter(limit: number = 100, windowSeconds: number = 60) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      // Fall back to IP-based limiting
      return redisRateLimiter('ratelimit:anon', limit, windowSeconds)(req, res, next);
    }

    return redisRateLimiter(`ratelimit:user:${req.user.id}`, limit, windowSeconds)(req, res, next);
  };
}

// Rate limiter for specific actions (e.g., sending verification codes)
export function actionRateLimiter(action: string, limit: number = 5, windowSeconds: number = 300) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const identifier = req.user?.id || req.ip || 'unknown';
    const key = `action:${action}:${identifier}`;

    const current = await cacheService.increment(key, windowSeconds);

    if (current > limit) {
      logger.warn('Action rate limit exceeded', {
        action,
        identifier,
        current,
        limit,
      });

      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: `操作过于频繁，请${Math.ceil(windowSeconds / 60)}分钟后再试`,
        },
      });
      return;
    }

    next();
  };
}
