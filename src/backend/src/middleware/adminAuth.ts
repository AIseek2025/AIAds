import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../utils/crypto';
import { logger } from '../utils/logger';
import prisma from '../config/database';
import { cacheService } from '../config/redis';

// Extend Express Request type for admin authentication
declare global {
  namespace Express {
    interface Request {
      admin?: {
        id: string;
        email: string;
        name: string;
        role: string;
        permissions: string[];
      };
      adminToken?: string;
    }
  }
}

// Admin JWT Token payload
interface AdminJwtPayload {
  sub: string;          // Admin ID
  email: string;
  role: string;
  permissions: string[];
  iat?: number;
  exp?: number;
  jti: string;          // Unique token ID
}

// Admin Auth middleware options
// interface AdminAuthOptions {
//   requiredPermissions?: string[];
//   requireAllPermissions?: boolean;
// }

/**
 * Admin authentication middleware
 * Verifies admin JWT token and attaches admin info to request
 */
export async function adminAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: '需要提供管理员认证 Token',
        },
      });
      return;
    }

    // Check if token is blacklisted (logout)
    const decoded = verifyToken(token, 'admin_access') as AdminJwtPayload;
    const isBlacklisted = await cacheService.get(`admin_blacklist:${decoded.jti}`);
    
    if (isBlacklisted) {
      res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_BLACKLISTED',
          message: 'Token 已失效，请重新登录',
        },
      });
      return;
    }

    // Verify admin exists and is active
    const admin = await prisma.admin.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        adminRole: {
          select: {
            name: true,
            permissions: true,
          },
        },
      },
    });

    if (!admin) {
      res.status(401).json({
        success: false,
        error: {
          code: 'ADMIN_NOT_FOUND',
          message: '管理员不存在',
        },
      });
      return;
    }

    // Check admin status
    if (admin.status !== 'active') {
      res.status(403).json({
        success: false,
        error: {
          code: 'ADMIN_INACTIVE',
          message: '管理员账号已被禁用',
        },
      });
      return;
    }

    // Attach admin info to request
    req.admin = {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.adminRole?.name || 'admin',
      permissions: (admin.adminRole?.permissions as string[]) || [],
    };
    req.adminToken = token;

    logger.debug('Admin authenticated', {
      adminId: admin.id,
      email: admin.email,
      path: req.path,
    });

    next();
  } catch (error) {
    logger.error('Admin auth middleware error', { error, path: req.path });

    if (error instanceof Error) {
      if (error.name === 'TokenError' || error.message.includes('Token')) {
        res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_INVALID',
            message: '管理员 Token 无效',
          },
        });
        return;
      }
    }

    next(error);
  }
}

/**
 * Require specific permissions middleware
 * Must be used after adminAuth middleware
 */
export function requirePermission(
  ...permissions: string[]
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.admin) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: '需要管理员认证',
        },
      });
      return;
    }

    const adminPermissions = req.admin.permissions || [];
    const hasPermission = permissions.every((p) => adminPermissions.includes(p));

    if (!hasPermission) {
      logger.warn('Permission denied', {
        adminId: req.admin.id,
        requiredPermissions: permissions,
        adminPermissions,
        path: req.path,
      });

      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '没有权限执行此操作',
        },
      });
      return;
    }

    next();
  };
}

/**
 * Require any of the specified permissions
 */
export function requireAnyPermission(
  ...permissions: string[]
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.admin) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: '需要管理员认证',
        },
      });
      return;
    }

    const adminPermissions = req.admin.permissions || [];
    const hasPermission = permissions.some((p) => adminPermissions.includes(p));

    if (!hasPermission) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '没有权限执行此操作',
        },
      });
      return;
    }

    next();
  };
}

/**
 * Super admin only middleware
 */
export function superAdminOnly(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.admin) {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_REQUIRED',
        message: '需要管理员认证',
      },
    });
    return;
  }

  if (req.admin.role !== 'super_admin') {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: '只有超级管理员可以执行此操作',
      },
    });
    return;
  }

  next();
}

/**
 * Admin role checker middleware factory
 */
export function requireRole(...roles: string[]): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.admin) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: '需要管理员认证',
        },
      });
      return;
    }

    if (!roles.includes(req.admin.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '没有权限执行此操作',
        },
      });
      return;
    }

    next();
  };
}
