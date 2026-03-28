import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { logger } from '../utils/logger';

/**
 * Parse req.body with schema; on failure send 422 and return false.
 * Use inside asyncHandler: `if (!parseBodyOrRespond(schema, req, res)) return;`
 * (Calling validateBody()(req,res, noop) does NOT stop the handler after a failed validation.)
 */
/**
 * Parse req.query with schema; on failure send 422 and return null.
 */
export function parseQueryOrRespond<T>(schema: ZodSchema<T>, req: Request, res: Response): T | null {
  try {
    return schema.parse(req.query);
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.issues.map((issue) => ({
        field: issue.path.map(String).join('.'),
        message: issue.message,
      }));

      logger.debug('Validation error', {
        path: req.path,
        details,
      });

      res.status(422).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '查询参数验证失败',
          details,
        },
      });
      return null;
    }

    throw error;
  }
}

export function parseBodyOrRespond<T>(schema: ZodSchema<T>, req: Request, res: Response): boolean {
  try {
    req.body = schema.parse(req.body);
    return true;
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.issues.map((issue) => ({
        field: issue.path.map(String).join('.'),
        message: issue.message,
      }));

      logger.debug('Validation error', {
        path: req.path,
        details,
      });

      res.status(422).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '请求参数验证失败',
          details,
        },
      });
      return false;
    }

    throw error;
  }
}

// Validation middleware for request body
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((issue) => ({
          field: issue.path.map(String).join('.'),
          message: issue.message,
        }));

        logger.debug('Validation error', {
          path: req.path,
          details,
        });

        res.status(422).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '请求参数验证失败',
            details,
          },
        });
        return;
      }

      next(error);
    }
  };
}

// Validation middleware for query parameters
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as unknown as Request['query'];
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((issue) => ({
          field: issue.path.map(String).join('.'),
          message: issue.message,
        }));

        res.status(422).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '查询参数验证失败',
            details,
          },
        });
        return;
      }

      next(error);
    }
  };
}

// Validation middleware for URL parameters
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.params = schema.parse(req.params) as unknown as Request['params'];
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((issue) => ({
          field: issue.path.map(String).join('.'),
          message: issue.message,
        }));

        res.status(422).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '路径参数验证失败',
            details,
          },
        });
        return;
      }

      next(error);
    }
  };
}

// Combined validation middleware
export function validate<
  TBody,
  TQuery extends Record<string, unknown>,
  TParams extends Record<string, unknown>,
>(options: { body?: ZodSchema<TBody>; query?: ZodSchema<TQuery>; params?: ZodSchema<TParams> }) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (options.body) {
        req.body = options.body.parse(req.body);
      }

      if (options.query) {
        req.query = options.query.parse(req.query) as unknown as Request['query'];
      }

      if (options.params) {
        req.params = options.params.parse(req.params) as unknown as Request['params'];
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((issue) => ({
          field: issue.path.map(String).join('.'),
          message: issue.message,
        }));

        res.status(422).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '请求参数验证失败',
            details,
          },
        });
        return;
      }

      next(error);
    }
  };
}
