/**
 * GStack 平台核心域单测第三批次：管理端权限中间件 / Prisma 观测包装 / 用户限流 / helpers 补充
 */

import type { Request, Response } from 'express';
import {
  requirePermission,
  requireAnyPermission,
  superAdminOnly,
  requireRole,
} from '../src/middleware/adminAuth';
import { prismaPerformanceMiddleware, dbPerformanceMonitor } from '../src/middleware/performance';
import { userRateLimiter } from '../src/middleware/rateLimiter';
import { cacheService } from '../src/services/cache.service';
import {
  formatNumber,
  formatCurrency,
  truncate,
  pick,
  omit,
  formatISODate,
  parseISODate,
  slugify,
} from '../src/utils/helpers';

function jsonRes(): Response & { _status?: number; _json?: unknown } {
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

const adminBase = {
  id: 'adm-1',
  email: 'a@x.co',
  name: 'A',
  role: 'admin',
  permissions: ['user:view', 'user:edit', 'kol:view'],
};

describe('requirePermission', () => {
  it('calls next when admin has all required permissions', () => {
    const mw = requirePermission('user:view', 'user:edit');
    const req = { admin: { ...adminBase }, path: '/u' } as unknown as Request;
    const res = jsonRes();
    const next = jest.fn();
    mw(req, res as Response, next);
    expect(next).toHaveBeenCalled();
  });

  it('403 when a required permission is missing', () => {
    const mw = requirePermission('user:view', 'campaign:view');
    const req = { admin: { ...adminBase }, path: '/u' } as unknown as Request;
    const res = jsonRes();
    const next = jest.fn();
    mw(req, res as Response, next);
    expect(res._status).toBe(403);
    expect((res._json as { error?: { code?: string } })?.error?.code).toBe('FORBIDDEN');
    expect(next).not.toHaveBeenCalled();
  });

  it('401 when req.admin is missing', () => {
    const mw = requirePermission('user:view');
    const req = { path: '/u' } as Request;
    const res = jsonRes();
    const next = jest.fn();
    mw(req, res as Response, next);
    expect(res._status).toBe(401);
    expect((res._json as { error?: { code?: string } })?.error?.code).toBe('AUTH_REQUIRED');
    expect(next).not.toHaveBeenCalled();
  });

  it('empty required permission list passes when admin exists', () => {
    const mw = requirePermission();
    const req = { admin: { ...adminBase, permissions: [] }, path: '/u' } as unknown as Request;
    const res = jsonRes();
    const next = jest.fn();
    mw(req, res as Response, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('requireAnyPermission', () => {
  it('calls next when admin has one of the permissions', () => {
    const mw = requireAnyPermission('campaign:view', 'kol:view');
    const req = { admin: { ...adminBase }, path: '/u' } as unknown as Request;
    const res = jsonRes();
    const next = jest.fn();
    mw(req, res as Response, next);
    expect(next).toHaveBeenCalled();
  });

  it('403 when admin has none of the permissions', () => {
    const mw = requireAnyPermission('campaign:delete', 'finance:export');
    const req = { admin: { ...adminBase }, path: '/u' } as unknown as Request;
    const res = jsonRes();
    const next = jest.fn();
    mw(req, res as Response, next);
    expect(res._status).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('401 when req.admin is missing', () => {
    const mw = requireAnyPermission('user:view');
    const req = {} as Request;
    const res = jsonRes();
    const next = jest.fn();
    mw(req, res as Response, next);
    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('superAdminOnly', () => {
  it('calls next for super_admin role', () => {
    const req = {
      admin: { ...adminBase, role: 'super_admin' },
      path: '/s',
    } as unknown as Request;
    const res = jsonRes();
    const next = jest.fn();
    superAdminOnly(req, res as Response, next);
    expect(next).toHaveBeenCalled();
  });

  it('403 for non-super admin', () => {
    const req = { admin: { ...adminBase, role: 'admin' }, path: '/s' } as unknown as Request;
    const res = jsonRes();
    const next = jest.fn();
    superAdminOnly(req, res as Response, next);
    expect(res._status).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('401 when req.admin is missing', () => {
    const req = { path: '/s' } as Request;
    const res = jsonRes();
    const next = jest.fn();
    superAdminOnly(req, res as Response, next);
    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('requireRole', () => {
  it('calls next when role matches', () => {
    const mw = requireRole('admin', 'super_admin');
    const req = { admin: { ...adminBase, role: 'admin' }, path: '/r' } as unknown as Request;
    const res = jsonRes();
    const next = jest.fn();
    mw(req, res as Response, next);
    expect(next).toHaveBeenCalled();
  });

  it('403 when role not in list', () => {
    const mw = requireRole('super_admin');
    const req = { admin: { ...adminBase, role: 'admin' }, path: '/r' } as unknown as Request;
    const res = jsonRes();
    const next = jest.fn();
    mw(req, res as Response, next);
    expect(res._status).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('401 when req.admin is missing', () => {
    const mw = requireRole('admin');
    const req = {} as Request;
    const res = jsonRes();
    const next = jest.fn();
    mw(req, res as Response, next);
    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('prismaPerformanceMiddleware', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    dbPerformanceMonitor.reset();
  });

  it('records successful query with model and action', async () => {
    const spy = jest.spyOn(dbPerformanceMonitor, 'recordQuery');
    const mw = prismaPerformanceMiddleware();
    const result = await mw({ model: 'Campaign', action: 'findUnique' }, async () => ({ id: '1' }));
    expect(result).toEqual({ id: '1' });
    expect(spy).toHaveBeenCalledWith('Campaign', 'findUnique', expect.any(Number), true);
  });

  it('records failed query with success false', async () => {
    const spy = jest.spyOn(dbPerformanceMonitor, 'recordQuery');
    const mw = prismaPerformanceMiddleware();
    await expect(
      mw({ model: 'Order', action: 'update' }, async () => {
        throw new Error('db fail');
      })
    ).rejects.toThrow('db fail');
    expect(spy).toHaveBeenCalledWith('Order', 'update', expect.any(Number), false);
  });

  it('uses unknown model when model omitted', async () => {
    const spy = jest.spyOn(dbPerformanceMonitor, 'recordQuery');
    const mw = prismaPerformanceMiddleware();
    await mw({ action: 'raw' }, async () => 1);
    expect(spy).toHaveBeenCalledWith('unknown', 'raw', expect.any(Number), true);
  });
});

describe('userRateLimiter', () => {
  beforeEach(() => {
    jest.spyOn(cacheService, 'increment').mockResolvedValue(1);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses user-scoped key when req.user present', async () => {
    const mw = userRateLimiter(50, 60);
    const req = { user: { id: 'u-99', email: 'u@x.co', role: 'kol' }, ip: '1.1.1.1', path: '/p' } as unknown as Request;
    const res = { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    const next = jest.fn();
    await mw(req, res, next);
    expect(cacheService.increment).toHaveBeenCalledWith('ratelimit:user:u-99:1.1.1.1', 60);
    expect(next).toHaveBeenCalled();
  });

  it('falls back to anon key when req.user missing', async () => {
    const mw = userRateLimiter(40, 30);
    const req = { ip: '9.9.9.9', path: '/p' } as Request;
    const res = { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    const next = jest.fn();
    await mw(req, res, next);
    expect(cacheService.increment).toHaveBeenCalledWith('ratelimit:anon:9.9.9.9', 30);
    expect(next).toHaveBeenCalled();
  });
});

describe('helpers formatNumber / formatCurrency / truncate / pick / omit', () => {
  it('formatNumber handles negative values', () => {
    expect(formatNumber(-1200)).toContain('1');
    expect(formatNumber(-1200)).toMatch(/-/);
  });

  it('formatCurrency USD', () => {
    expect(formatCurrency(9.99, 'USD')).toMatch(/9/);
  });

  it('truncate when length equals str length returns unchanged', () => {
    expect(truncate('abc', 3)).toBe('abc');
  });

  it('pick with empty keys returns empty object', () => {
    expect(pick({ a: 1, b: 2 }, [])).toEqual({});
  });

  it('omit with empty keys returns shallow copy', () => {
    const o = { a: 1, b: 2 };
    const out = omit(o, []);
    expect(out).toEqual(o);
    expect(out).not.toBe(o);
  });

  it('formatISODate and parseISODate round-trip', () => {
    const d = new Date('2024-06-01T12:00:00.000Z');
    expect(parseISODate(formatISODate(d)).getTime()).toBe(d.getTime());
  });

  it('slugify collapses repeated dashes', () => {
    expect(slugify('foo---bar')).toBe('foo-bar');
  });
});
