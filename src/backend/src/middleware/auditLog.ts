import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

// Extend Express Request type for audit logging
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
    }
  }
}

/**
 * M05: Audit logging middleware
 * P2 Fix: Enhanced to log more operations and fields
 */
export function auditLog(req: Request, res: Response, next: NextFunction): void {
  // Generate or extract request ID for tracing
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();

  // Record start time for duration calculation
  const startTime = Date.now();

  // Attach to request object for use in other middleware/controllers
  req.requestId = requestId;
  req.startTime = startTime;

  // Get user ID if available (set by auth middleware)
  const userId = req.user?.id;

  // P2 Fix: Enhanced logging with more fields
  logger.info({
    event: 'request',
    requestId,
    userId: userId || 'anonymous',
    method: req.method,
    path: req.path,
    query: sanitizeQuery(req.query),
    body: sanitizeBody(req.body, req.path),
    ip: req.ip,
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString(),
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    logger.info({
      event: 'response',
      requestId,
      userId: userId || 'anonymous',
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      responseSize: res.getHeader('content-length'),
      timestamp: new Date().toISOString(),
    });
  });

  // Log error if one occurs
  res.on('error', (error) => {
    logger.error({
      event: 'response_error',
      requestId,
      userId: userId || 'anonymous',
      method: req.method,
      path: req.path,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  });

  next();
}

/**
 * Log critical security events
 */
export function logSecurityEvent(event: string, userId: string | undefined, details: Record<string, unknown>): void {
  logger.info({
    event: 'security',
    action: event,
    userId: userId || 'anonymous',
    ...details,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log authentication events
 */
export function logAuthEvent(
  action: 'login' | 'logout' | 'register' | 'password_reset' | 'mfa_enabled' | 'mfa_disabled',
  userId: string | undefined,
  success: boolean,
  details?: Record<string, unknown>
): void {
  logger.info({
    event: 'auth',
    action,
    userId: userId || 'anonymous',
    success,
    ...details,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log data access events (for sensitive data)
 */
export function logDataAccess(
  resourceType: string,
  resourceId: string,
  userId: string,
  action: 'read' | 'create' | 'update' | 'delete'
): void {
  logger.info({
    event: 'data_access',
    resourceType,
    resourceId,
    userId,
    action,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Sanitize query parameters for logging (remove sensitive data)
 */
function sanitizeQuery(query: Request['query']): Record<string, unknown> {
  if (!query) {
    return {};
  }

  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'credit', 'card'];
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(query)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * P2 Fix: Sanitize request body for logging
 * Removes sensitive data while preserving operation context
 */
function sanitizeBody(body: unknown, _path: string): Record<string, unknown> | string {
  if (body === undefined || body === null) {
    return {};
  }

  const bodyStr = JSON.stringify(body);
  if (bodyStr.length > 1000) {
    return '[BODY_TOO_LARGE]';
  }

  if (typeof body !== 'object' || Array.isArray(body)) {
    return bodyStr;
  }

  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'key',
    'auth',
    'creditCard',
    'cardNumber',
    'cvv',
    'idNumber',
    'bankAccount',
    'alipayAccount',
    'wechatPayAccount',
  ];

  const sanitized: Record<string, unknown> = { ...(body as Record<string, unknown>) };

  for (const [key] of Object.entries(sanitized)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Critical action logging decorator/factory
 * Use for high-risk operations
 */
export function logCriticalAction(actionName: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const userId = req.user?.id;

    logger.warn({
      event: 'critical_action',
      action: actionName,
      userId: userId || 'anonymous',
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      timestamp: new Date().toISOString(),
    });

    next();
  };
}
