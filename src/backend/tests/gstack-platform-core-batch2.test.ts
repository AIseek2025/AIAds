/**
 * GStack 平台核心域单测第二批次：校验中间件 / 全局错误处理 / 异步包装 / Redis 限流 / 校验工具
 */

import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  validateBody,
  validateQuery,
  validateParams,
  validate,
} from '../src/middleware/validation';
import {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  ApiError,
} from '../src/middleware/errorHandler';
import { validateRequest, ValidationError, generateUUID, sanitizeString } from '../src/utils/validator';
import { TokenError } from '../src/utils/crypto';
import { redisRateLimiter, actionRateLimiter } from '../src/middleware/rateLimiter';
import { cacheService } from '../src/services/cache.service';
import { addRequestId, generateRequestId } from '../src/utils/helpers';

jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(() => ({})),
  },
}));

function mockRes(): Response & { _status?: number; _json?: unknown } {
  const r = {
    _status: 200 as number,
    _json: undefined as unknown,
    status(code: number) {
      this._status = code;
      return this;
    },
    json(body: unknown) {
      this._json = body;
      return this;
    },
  };
  return r as Response & { _status?: number; _json?: unknown };
}

describe('validateBody middleware', () => {
  const schema = z.object({ name: z.string().min(1) });

  it('parses body and calls next', () => {
    const mw = validateBody(schema);
    const req = { body: { name: 'ok' }, path: '/a' } as Request;
    const res = mockRes();
    const next = jest.fn();
    mw(req, res as Response, next);
    expect(req.body).toEqual({ name: 'ok' });
    expect(next).toHaveBeenCalled();
  });

  it('responds 422 and does not call next on ZodError', () => {
    const mw = validateBody(schema);
    const req = { body: {}, path: '/a' } as Request;
    const res = mockRes();
    const next = jest.fn();
    mw(req, res as Response, next);
    expect(res._status).toBe(422);
    expect((res._json as { error?: { code?: string } })?.error?.code).toBe('VALIDATION_ERROR');
    expect(next).not.toHaveBeenCalled();
  });
});

describe('validateQuery middleware', () => {
  const schema = z.object({ page: z.coerce.number().int().positive() });

  it('parses query and calls next', () => {
    const mw = validateQuery(schema);
    const req = { query: { page: '3' }, path: '/q' } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();
    mw(req, res as Response, next);
    expect(req.query).toEqual({ page: 3 });
    expect(next).toHaveBeenCalled();
  });

  it('responds 422 on bad query', () => {
    const mw = validateQuery(schema);
    const req = { query: { page: '0' }, path: '/q' } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();
    mw(req, res as Response, next);
    expect(res._status).toBe(422);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('validateParams middleware', () => {
  const schema = z.object({ id: z.string().uuid() });

  it('parses params and calls next', () => {
    const mw = validateParams(schema);
    const id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const req = { params: { id }, path: '/p' } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();
    mw(req, res as Response, next);
    expect(req.params).toEqual({ id });
    expect(next).toHaveBeenCalled();
  });

  it('responds 422 on invalid uuid', () => {
    const mw = validateParams(schema);
    const req = { params: { id: 'not-uuid' }, path: '/p' } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();
    mw(req, res as Response, next);
    expect(res._status).toBe(422);
    expect((res._json as { error?: { message?: string } })?.error?.message).toContain('路径参数');
    expect(next).not.toHaveBeenCalled();
  });
});

describe('validate combined middleware', () => {
  const bodySchema = z.object({ title: z.string() });
  const querySchema = z.object({ dry: z.coerce.boolean().optional() });

  it('validates body and query together', () => {
    const mw = validate({ body: bodySchema, query: querySchema });
    const req = {
      body: { title: 't' },
      query: { dry: 'true' },
      path: '/c',
    } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();
    mw(req, res as Response, next);
    expect(req.body).toEqual({ title: 't' });
    expect(req.query).toEqual({ dry: true });
    expect(next).toHaveBeenCalled();
  });

  it('422 when body invalid', () => {
    const mw = validate({ body: bodySchema, query: querySchema });
    const req = { body: {}, query: {}, path: '/c' } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();
    mw(req, res as Response, next);
    expect(res._status).toBe(422);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('notFoundHandler', () => {
  it('returns 404 NOT_FOUND JSON', () => {
    const req = { method: 'GET', path: '/missing', requestId: 'rid-1' } as Request;
    const res = mockRes();
    notFoundHandler(req, res as Response);
    expect(res._status).toBe(404);
    expect((res._json as { error?: { code?: string } })?.error?.code).toBe('NOT_FOUND');
  });
});

describe('asyncHandler', () => {
  it('forwards async rejection to next', async () => {
    const wrapped = asyncHandler(async (_req, _res, _next) => {
      throw new Error('async-boom');
    });
    const next = jest.fn();
    wrapped({ path: '/x' } as Request, {} as Response, next as NextFunction);
    await new Promise((r) => setImmediate(r));
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'async-boom' }));
  });

  it('does not call next when handler resolves', async () => {
    const wrapped = asyncHandler(async () => {});
    const next = jest.fn();
    wrapped({} as Request, {} as Response, next as NextFunction);
    await new Promise((r) => setImmediate(r));
    expect(next).not.toHaveBeenCalled();
  });
});

describe('errorHandler', () => {
  const baseReq = { method: 'POST', path: '/e', requestId: 'e1' } as Request;

  it('handles ApiError with status and code', () => {
    const err = new ApiError('bad', 400, 'BAD_REQUEST');
    const res = mockRes();
    errorHandler(err, baseReq, res as Response, jest.fn());
    expect(res._status).toBe(400);
    expect((res._json as { error?: { code?: string } })?.error?.code).toBe('BAD_REQUEST');
  });

  it('handles ValidationError as 422', () => {
    const err = new ValidationError('x', [{ field: 'a', message: 'm' }]);
    const res = mockRes();
    errorHandler(err, baseReq, res as Response, jest.fn());
    expect(res._status).toBe(422);
    expect((res._json as { error?: { code?: string } })?.error?.code).toBe('VALIDATION_ERROR');
  });

  it('handles TokenError as 401', () => {
    const err = new TokenError('bad token', 'TOKEN_INVALID');
    const res = mockRes();
    errorHandler(err, baseReq, res as Response, jest.fn());
    expect(res._status).toBe(401);
    expect((res._json as { error?: { code?: string } })?.error?.code).toBe('TOKEN_INVALID');
  });
});

describe('validator validateRequest / generateUUID / sanitizeString', () => {
  it('validateRequest returns parsed data', () => {
    const s = z.object({ n: z.number() });
    expect(validateRequest(s, { n: 1 })).toEqual({ n: 1 });
  });

  it('validateRequest throws ValidationError on Zod failure', () => {
    const s = z.object({ n: z.number() });
    expect(() => validateRequest(s, {})).toThrow(ValidationError);
  });

  it('generateUUID matches v4-like pattern', () => {
    const u = generateUUID();
    expect(u).toMatch(/^[0-9a-f-]{36}$/);
    expect(u[14]).toBe('4');
  });

  it('sanitizeString trims and strips angle brackets', () => {
    expect(sanitizeString('  <b>hi</b>  ')).toBe('bhi/b');
  });

  it('sanitizeString empty after strip yields empty', () => {
    expect(sanitizeString('<<>>')).toBe('');
  });
});

describe('redisRateLimiter', () => {
  beforeEach(() => {
    jest.spyOn(cacheService, 'increment').mockResolvedValue(1);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('calls next when count within limit', async () => {
    jest.spyOn(cacheService, 'increment').mockResolvedValue(3);
    const mw = redisRateLimiter('t', 10, 60);
    const req = { ip: '10.0.0.1', path: '/api' } as Request;
    const res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    const next = jest.fn();
    await mw(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '10');
  });

  it('returns 429 when count exceeds limit', async () => {
    jest.spyOn(cacheService, 'increment').mockResolvedValue(11);
    const mw = redisRateLimiter('t2', 10, 60);
    const req = { ip: '10.0.0.2', path: '/api' } as Request;
    const res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    const next = jest.fn();
    await mw(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
  });

  it('fail-closed returns 429 when increment throws', async () => {
    const prev = process.env.RATE_LIMIT_FAIL_OPEN;
    process.env.RATE_LIMIT_FAIL_OPEN = 'false';
    jest.spyOn(cacheService, 'increment').mockRejectedValue(new Error('redis down'));
    const mw = redisRateLimiter('t3', 5, 30);
    const req = { ip: '10.0.0.3', path: '/api' } as Request;
    const res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    const next = jest.fn();
    await mw(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
    expect((res.json as jest.Mock).mock.calls[0][0].error.code).toBe('RATE_LIMIT_ERROR');
    process.env.RATE_LIMIT_FAIL_OPEN = prev;
  });
});

describe('actionRateLimiter', () => {
  beforeEach(() => {
    jest.spyOn(cacheService, 'increment').mockResolvedValue(1);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('429 when action count exceeds limit', async () => {
    jest.spyOn(cacheService, 'increment').mockResolvedValue(10);
    const mw = actionRateLimiter('send_code', 5, 300);
    const req = { ip: '192.168.1.1', path: '/auth' } as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    const next = jest.fn();
    await mw(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
  });
});

describe('helpers addRequestId / generateRequestId', () => {
  it('generateRequestId uses req_ prefix', () => {
    expect(generateRequestId()).toMatch(/^req_\d+_[a-z0-9]+$/);
  });

  it('addRequestId attaches id and X-Request-ID header', () => {
    const req = {} as Request & { requestId?: string };
    const res = { setHeader: jest.fn() } as unknown as Response;
    const next = jest.fn();
    addRequestId(req, res, next);
    expect(typeof req.requestId).toBe('string');
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', req.requestId);
    expect(next).toHaveBeenCalled();
  });
});
