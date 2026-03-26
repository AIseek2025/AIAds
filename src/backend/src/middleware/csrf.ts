import csrf from 'csurf';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import config from '../config';

// CSRF protection middleware configuration
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: config.nodeEnv === 'production', // Require HTTPS in production
    sameSite: 'strict', // Prevent CSRF on cross-site requests
    path: '/',
    maxAge: 60 * 60 * 1000, // 1 hour
  },
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'], // Only protect state-changing methods
});

/**
 * CSRF error handler middleware
 * Handles CSRF token validation errors
 */
export function csrfErrorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  if (err.code === 'EBADCSRFTOKEN') {
    logger.warn('CSRF token validation failed', {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });

    res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_TOKEN_INVALID',
        message: 'CSRF token 无效或已过期，请刷新页面后重试',
      },
    });
    return;
  }

  next(err);
}

/**
 * Get CSRF token endpoint
 * Returns a new CSRF token for the current session
 */
export function getCsrfToken(req: Request, res: Response): void {
  const token = (req as any).csrfToken();
  
  res.json({
    success: true,
    data: {
      csrfToken: token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
    },
  });
}

export default csrfProtection;
