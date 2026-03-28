import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ValidationError } from '../utils/validator';
import { TokenError } from '../utils/crypto';

// Custom error class for API errors
export class ApiError extends Error {
  statusCode: number;
  code: string;
  details?: Array<{ field?: string; message: string }>;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: Array<{ field?: string; message: string }>
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

// Error response interface
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{ field?: string; message: string }>;
  };
  request_id?: string;
}

// Error handler middleware
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const requestId = req.requestId ?? `req_${Date.now()}`;

  // Log error
  logger.error('Error occurred', {
    requestId,
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack,
  });

  // Default error response
  let response: ErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: '服务器内部错误',
    },
    request_id: requestId,
  };

  let statusCode = 500;

  // Handle specific error types
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    response = {
      success: false,
      error: {
        code: err.code,
        message: getUserFriendlyMessage(err.message, err.code),
        details: err.details,
      },
      request_id: requestId,
    };
  } else if (err instanceof ValidationError) {
    statusCode = 422;
    response = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '输入数据格式不正确',
        details: err.details?.map((d) => ({
          field: d.field,
          message: getUserFriendlyMessage(d.message, 'VALIDATION_ERROR'),
        })),
      },
      request_id: requestId,
    };
  } else if (err instanceof TokenError) {
    statusCode = 401;
    response = {
      success: false,
      error: {
        code: err.code,
        message: getUserFriendlyMessage(err.message, err.code),
      },
      request_id: requestId,
    };
  } else if (err instanceof SyntaxError && 'body' in req) {
    statusCode = 400;
    response = {
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: '请求数据格式不正确，请检查 JSON 格式',
      },
      request_id: requestId,
    };
  } else if (err instanceof Error && err.message.includes('configuration error')) {
    // P3 Fix: Handle configuration errors with friendly message
    statusCode = 500;
    response = {
      success: false,
      error: {
        code: 'CONFIGURATION_ERROR',
        message: '服务器配置错误，请联系管理员',
      },
      request_id: requestId,
    };
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    response.error.message = '服务器内部错误，请稍后重试或联系技术支持';
  }

  res.status(statusCode).json(response);
}

/**
 * P3 Fix: Convert technical error messages to user-friendly messages
 */
function getUserFriendlyMessage(message: string, code: string): string {
  const friendlyMessages: Record<string, string> = {
    // Authentication errors
    TOKEN_EXPIRED: '登录已过期，请重新登录',
    TOKEN_INVALID: '登录信息无效，请重新登录',
    USER_NOT_FOUND: '用户不存在',
    USER_DELETED: '用户已被删除',
    USER_SUSPENDED: '用户已被暂停使用',
    EMAIL_NOT_VERIFIED: '邮箱尚未验证，请先验证邮箱',

    // Authorization errors
    FORBIDDEN: '没有权限访问此资源',
    UNAUTHORIZED: '请先登录',

    // Resource errors
    NOT_FOUND: '请求的资源不存在',
    CONFLICT: '资源已存在或状态冲突',

    // Rate limiting errors
    RATE_LIMITED: '操作过于频繁，请稍后再试',
    RATE_LIMIT_ERROR: '服务繁忙，请稍后再试',

    // Validation errors
    VALIDATION_ERROR: '输入数据格式不正确',
    BAD_REQUEST: '请求参数错误',

    // System errors
    INTERNAL_ERROR: '服务器内部错误',
    SERVICE_UNAVAILABLE: '服务暂时不可用',
    CONFIGURATION_ERROR: '服务器配置错误',
  };

  // Return friendly message if available, otherwise return original
  return friendlyMessages[code] || message;
}

// 404 handler
export function notFoundHandler(req: Request, res: Response): void {
  const requestId = req.requestId ?? `req_${Date.now()}`;

  logger.info('404 Not Found', {
    requestId,
    method: req.method,
    path: req.path,
  });

  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: '请求的资源不存在',
    },
    request_id: requestId,
  });
}

// Async handler wrapper (to catch async errors)
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Helper function to create API errors
export function createError(
  message: string,
  statusCode: number,
  code: string,
  details?: Array<{ field?: string; message: string }>
): ApiError {
  return new ApiError(message, statusCode, code, details);
}

// Common error creators
export const errors: {
  badRequest: (message?: string) => ApiError;
  unauthorized: (message?: string) => ApiError;
  forbidden: (message?: string) => ApiError;
  notFound: (message?: string) => ApiError;
  conflict: (message?: string) => ApiError;
  tooManyRequests: (message?: string) => ApiError;
  internal: (message?: string) => ApiError;
  serviceUnavailable: (message?: string) => ApiError;
} = {
  badRequest: (message: string = '请求参数错误'): ApiError => createError(message, 400, 'BAD_REQUEST'),

  unauthorized: (message: string = '未授权'): ApiError => createError(message, 401, 'UNAUTHORIZED'),

  forbidden: (message: string = '禁止访问'): ApiError => createError(message, 403, 'FORBIDDEN'),

  notFound: (message: string = '资源不存在'): ApiError => createError(message, 404, 'NOT_FOUND'),

  conflict: (message: string = '资源冲突'): ApiError => createError(message, 409, 'CONFLICT'),

  tooManyRequests: (message: string = '请求过于频繁'): ApiError => createError(message, 429, 'TOO_MANY_REQUESTS'),

  internal: (message: string = '服务器内部错误'): ApiError => createError(message, 500, 'INTERNAL_ERROR'),

  serviceUnavailable: (message: string = '服务不可用'): ApiError => createError(message, 503, 'SERVICE_UNAVAILABLE'),
};
