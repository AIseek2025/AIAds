import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader, TokenError } from '../utils/crypto';
import { logger } from '../utils/logger';
import prisma from '../config/database';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
      token?: string;
    }
  }
}

// M06: Cookie configuration for secure token storage
interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxAge: number;
  path: string;
}

// Auth middleware options
interface AuthOptions {
  requireVerified?: boolean;
  allowedRoles?: string[];
}

/**
 * M06: Set authentication cookies with secure settings
 * Uses HttpOnly, Secure, and SameSite attributes for XSS/CSRF protection
 */
export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  const isProduction = process.env.NODE_ENV === 'production';

  // Access Token cookie (15 minutes)
  const accessTokenOptions: CookieOptions = {
    httpOnly: true, // Prevents XSS attacks
    secure: isProduction, // Only send over HTTPS in production
    sameSite: 'strict', // Prevents CSRF attacks
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: '/',
  };

  // Refresh Token cookie (7 days)
  const refreshTokenOptions: CookieOptions = {
    httpOnly: true, // Prevents XSS attacks
    secure: isProduction, // Only send over HTTPS in production
    sameSite: 'strict', // Prevents CSRF attacks
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  };

  res.cookie('accessToken', accessToken, accessTokenOptions);
  res.cookie('refreshToken', refreshToken, refreshTokenOptions);

  logger.debug('Auth cookies set', {
    secure: isProduction,
    httpOnly: true,
    sameSite: 'strict',
  });
}

/**
 * Clear authentication cookies
 */
export function clearAuthCookies(res: Response): void {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  logger.debug('Auth cookies cleared');
}

/**
 * Extract token from cookie (alternative to Authorization header)
 */
export function extractTokenFromCookie(req: Request, type: 'access' | 'refresh' = 'access'): string | null {
  const cookieName = type === 'access' ? 'accessToken' : 'refreshToken';
  return req.cookies?.[cookieName] || null;
}

// Authentication middleware
export function auth(options: AuthOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Extract token from header or cookie
      let token: string | null = null;

      // Try Authorization header first
      const authHeader = req.headers.authorization;
      token = extractTokenFromHeader(authHeader);

      // Fall back to cookie if header not present
      if (!token) {
        token = extractTokenFromCookie(req, 'access');
      }

      if (!token) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_REQUIRED',
            message: '需要提供认证令牌',
          },
        });
        return;
      }

      // Verify token
      const payload = verifyToken(token, 'access');

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          emailVerified: true,
        },
      });

      if (!user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: '用户不存在',
          },
        });
        return;
      }

      // Check user status
      if (user.status === 'deleted') {
        res.status(401).json({
          success: false,
          error: {
            code: 'USER_DELETED',
            message: '用户已被删除',
          },
        });
        return;
      }

      if (user.status === 'suspended') {
        res.status(403).json({
          success: false,
          error: {
            code: 'USER_SUSPENDED',
            message: '用户已被暂停',
          },
        });
        return;
      }

      // Check if email verification is required
      if (options.requireVerified && !user.emailVerified) {
        res.status(403).json({
          success: false,
          error: {
            code: 'EMAIL_NOT_VERIFIED',
            message: '请先验证邮箱',
          },
        });
        return;
      }

      // Check allowed roles
      if (options.allowedRoles && !options.allowedRoles.includes(user.role)) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: '没有权限访问此资源',
          },
        });
        return;
      }

      // Attach user info to request
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
      };
      req.token = token;

      logger.debug('User authenticated', {
        userId: user.id,
        email: user.email,
        path: req.path,
      });

      next();
    } catch (error) {
      logger.error('Auth middleware error', { error, path: req.path });

      if (error instanceof TokenError) {
        res.status(401).json({
          success: false,
          error: {
            code: error.code || 'TOKEN_INVALID',
            message: error.message || 'Token 无效',
          },
        });
        return;
      }

      next(error);
    }
  };
}

// Optional auth middleware (doesn't fail if no token)
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  // Try header first
  const authHeader = req.headers.authorization;
  let token = extractTokenFromHeader(authHeader);

  // Fall back to cookie
  if (!token) {
    token = extractTokenFromCookie(req, 'access');
  }

  if (token) {
    try {
      const payload = verifyToken(token, 'access');
      req.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };
      req.token = token;
    } catch (error) {
      // Token invalid, but continue without auth
      logger.debug('Optional auth: invalid token', { error });
    }
  }

  next();
}

// Admin only middleware
export const adminOnly = auth({ allowedRoles: ['admin', 'super_admin'] });

// Super admin only middleware
export const superAdminOnly = auth({ allowedRoles: ['super_admin'] });
