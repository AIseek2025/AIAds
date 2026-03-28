/**
 * GStack 平台核心域单测批次：CSRF / 性能监控 / 缓存键 / 校验解析 / 审计事件 / Cookie
 */

import type { Request, Response } from 'express';
import { z } from 'zod';
import { csrfErrorHandler, getCsrfToken } from '../src/middleware/csrf';
import { PerformanceMonitor, DatabasePerformanceMonitor } from '../src/middleware/performance';
import { CacheKeys, CacheTTL } from '../src/services/cache.service';
import { parseQueryOrRespond, parseBodyOrRespond } from '../src/middleware/validation';
import {
  logSecurityEvent,
  logAuthEvent,
  logDataAccess,
  logCriticalAction,
} from '../src/middleware/auditLog';
import { setAuthCookies, clearAuthCookies, extractTokenFromCookie } from '../src/middleware/auth';
import { logger } from '../src/utils/logger';

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

function mockReq(query: Record<string, unknown>, body?: unknown): Request {
  return { path: '/t', query, body: body ?? {} } as Request;
}

describe('CSRF csrfErrorHandler', () => {
  it('returns 403 JSON for EBADCSRFTOKEN', () => {
    const req = { path: '/a', method: 'POST', ip: '127.0.0.1' } as Request;
    const res = mockRes();
    const next = jest.fn();
    csrfErrorHandler({ code: 'EBADCSRFTOKEN' }, req, res as Response, next);
    expect(res._status).toBe(403);
    expect((res._json as { error?: { code?: string } })?.error?.code).toBe('CSRF_TOKEN_INVALID');
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next for non-CSRF errors', () => {
    const req = { path: '/b', method: 'GET', ip: '' } as Request;
    const res = mockRes();
    const next = jest.fn();
    const err = new Error('other');
    csrfErrorHandler(err, req, res as Response, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

describe('CSRF getCsrfToken', () => {
  it('returns token and expiry shape', () => {
    const req = { csrfToken: () => 'csrf-test-token' } as unknown as Request;
    const res = mockRes();
    getCsrfToken(req, res as Response);
    expect((res._json as { success?: boolean; data?: { csrfToken?: string } })?.success).toBe(true);
    expect((res._json as { data?: { csrfToken?: string; expiresAt?: string } })?.data?.csrfToken).toBe('csrf-test-token');
    expect((res._json as { data?: { expiresAt?: string } })?.data?.expiresAt).toMatch(/^\d{4}-/);
  });
});

describe('PerformanceMonitor', () => {
  function finishableRes(): Response & { emitFinish: () => void } {
    const listeners: Record<string, Array<() => void>> = {};
    const res = {
      statusCode: 200,
      on(ev: string, fn: () => void) {
        (listeners[ev] = listeners[ev] || []).push(fn);
        return res;
      },
      getHeader: () => undefined,
      emitFinish() {
        (listeners['finish'] || []).forEach((f) => f());
      },
    };
    return res as unknown as Response & { emitFinish: () => void };
  }

  it('increments requestCount and tracks errors for 4xx', () => {
    const pm = new PerformanceMonitor(5000, 100);
    const req = {
      method: 'GET',
      path: '/api/orders/550e8400-e29b-41d4-a716-446655440000',
      headers: {},
      ip: '1.1.1.1',
    } as Request;
    const res = finishableRes();
    pm.middleware(req, res, jest.fn());
    res.statusCode = 404;
    res.emitFinish();

    const m = pm.getMetrics();
    expect(m.requestCount).toBe(1);
    expect(m.errorCount).toBe(1);
    expect(Object.keys(m.pathStats).some((p) => p.includes(':id'))).toBe(true);
  });

  it('checkP95Target reflects sampled durations', () => {
    const pm = new PerformanceMonitor(10000, 50);
    const req = { method: 'POST', path: '/x', headers: {}, ip: '::1' } as Request;
    const res = finishableRes();
    pm.middleware(req, res, jest.fn());
    res.emitFinish();

    const t = pm.checkP95Target(999999);
    expect(t).toMatchObject({ meets: true, target: 999999 });
    expect(typeof t.current).toBe('number');
  });

  it('reset clears counters and getSlowMethods lists by avg duration', () => {
    const pm = new PerformanceMonitor(10000, 100);
    const req = { method: 'GET', path: '/z', headers: {}, ip: '1' } as Request;
    const res = finishableRes();
    jest.spyOn(Date, 'now').mockReturnValueOnce(100).mockReturnValueOnce(250);
    pm.middleware(req, res, jest.fn());
    res.emitFinish();
    jest.restoreAllMocks();
    expect(pm.getSlowMethods().some((m) => m.method === 'GET')).toBe(true);
    pm.reset();
    expect(pm.getMetrics().requestCount).toBe(0);
  });

  it('getSlowPaths filters by threshold', () => {
    const pm = new PerformanceMonitor(1, 200);
    const listeners: Record<string, Array<() => void>> = {};
    const mkRes = () => {
      const res = {
        statusCode: 200,
        on(ev: string, fn: () => void) {
          (listeners[ev] = listeners[ev] || []).push(fn);
          return res;
        },
        getHeader: () => undefined,
        emitFinish() {
          (listeners['finish'] || []).forEach((f) => f());
          listeners['finish'] = [];
        },
      };
      return res;
    };
    jest
      .spyOn(Date, 'now')
      .mockReturnValueOnce(1_000_000)
      .mockReturnValueOnce(1_000_002)
      .mockReturnValueOnce(2_000_000)
      .mockReturnValueOnce(2_000_900);
    const reqFast = { method: 'GET', path: '/fast', headers: {}, ip: '1' } as Request;
    const resFast = mkRes();
    pm.middleware(reqFast, resFast as unknown as Response, jest.fn());
    resFast.emitFinish();
    const reqSlow = { method: 'GET', path: '/slow-path-xyz', headers: {}, ip: '1' } as Request;
    const resSlow = mkRes();
    pm.middleware(reqSlow, resSlow as unknown as Response, jest.fn());
    resSlow.emitFinish();
    jest.restoreAllMocks();

    const slow = pm.getSlowPaths(500);
    expect(slow.some((s) => s.path.includes('slow-path'))).toBe(true);
  });
});

describe('DatabasePerformanceMonitor', () => {
  it('aggregates recordQuery and reset clears', () => {
    const db = new DatabasePerformanceMonitor(5);
    db.recordQuery('User', 'findMany', 10, true);
    db.recordQuery('User', 'findMany', 20, true);
    db.recordQuery('Order', 'update', 3, false);
    const stats = db.getQueryStats();
    expect(stats.find((s) => s.key === 'User:findMany')?.count).toBe(2);
    expect(stats.find((s) => s.key === 'Order:update')?.count).toBe(1);
    db.reset();
    expect(db.getQueryStats().length).toBe(0);
  });

  it('getSlowQueries filters by avg vs threshold', () => {
    const db = new DatabasePerformanceMonitor(50);
    db.recordQuery('X', 'find', 10, true);
    db.recordQuery('X', 'find', 200, true);
    const slow = db.getSlowQueries();
    expect(slow.length).toBeGreaterThan(0);
  });
});

describe('CacheKeys / CacheTTL', () => {
  it('user.byId follows user:{id}', () => {
    expect(CacheKeys.user.byId('u1')).toBe('user:u1');
  });

  it('kol.search is stable for same params', () => {
    const p = { platform: 'tiktok', minFollowers: 1000, category: 'x' };
    const a = CacheKeys.kol.search(p);
    const b = CacheKeys.kol.search({ ...p });
    expect(a).toBe(b);
    expect(a.startsWith('kol:search:')).toBe(true);
  });

  it('order.list encodes advertiser/kol/status', () => {
    expect(CacheKeys.order.list('adv1', undefined, 'pending')).toContain('adv1');
    expect(CacheKeys.order.list(undefined, 'k1', 'all')).toContain('k1');
  });

  it('CacheTTL has positive windows for hot paths', () => {
    expect(CacheTTL.kol.search).toBeGreaterThan(0);
    expect(CacheTTL.order.stats).toBeGreaterThan(0);
    expect(CacheTTL.dashboard.admin).toBeGreaterThan(0);
  });

  it('dashboard.analytics key embeds type and params', () => {
    expect(CacheKeys.dashboard.analytics('funnel', 'a=1')).toBe('dashboard:analytics:funnel:a=1');
  });
});

describe('validation parseQueryOrRespond / parseBodyOrRespond', () => {
  beforeEach(() => {
    jest.spyOn(logger, 'debug').mockImplementation(() => logger);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('parseQueryOrRespond returns parsed object on success', () => {
    const schema = z.object({ page: z.coerce.number() });
    const req = mockReq({ page: '2' });
    const res = mockRes();
    const out = parseQueryOrRespond(schema, req, res as Response);
    expect(out).toEqual({ page: 2 });
  });

  it('parseQueryOrRespond sends 422 on invalid query', () => {
    const schema = z.object({ page: z.coerce.number().positive() });
    const req = mockReq({ page: '-1' });
    const res = mockRes();
    const out = parseQueryOrRespond(schema, req, res as Response);
    expect(out).toBeNull();
    expect(res._status).toBe(422);
    expect((res._json as { error?: { code?: string } })?.error?.code).toBe('VALIDATION_ERROR');
  });

  it('parseBodyOrRespond returns true and mutates body when valid', () => {
    const schema = z.object({ email: z.string().email() });
    const req = mockReq({}, { email: 'ok@example.com' });
    const res = mockRes();
    expect(parseBodyOrRespond(schema, req, res as Response)).toBe(true);
    expect(req.body).toEqual({ email: 'ok@example.com' });
  });

  it('parseBodyOrRespond returns false and 422 when invalid', () => {
    const schema = z.object({ email: z.string().email() });
    const req = mockReq({}, { email: 'bad' });
    const res = mockRes();
    expect(parseBodyOrRespond(schema, req, res as Response)).toBe(false);
    expect(res._status).toBe(422);
  });
});

describe('auditLog logSecurityEvent / logAuthEvent / logDataAccess', () => {
  beforeEach(() => {
    jest.spyOn(logger, 'info').mockImplementation(() => logger);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logSecurityEvent logs structured info', () => {
    logSecurityEvent('mfa_failed', 'u1', { ip: '1.2.3.4' });
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'security',
        action: 'mfa_failed',
        userId: 'u1',
        ip: '1.2.3.4',
      })
    );
  });

  it('logAuthEvent records success flag', () => {
    logAuthEvent('login', 'u2', false, { reason: 'bad' });
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'auth',
        action: 'login',
        userId: 'u2',
        success: false,
      })
    );
  });

  it('logDataAccess includes resource and action', () => {
    logDataAccess('Order', 'ord-1', 'u3', 'read');
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'data_access',
        resourceType: 'Order',
        resourceId: 'ord-1',
        userId: 'u3',
        action: 'read',
      })
    );
  });
});

describe('auditLog logCriticalAction middleware', () => {
  beforeEach(() => {
    jest.spyOn(logger, 'warn').mockImplementation(() => logger);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs and calls next', () => {
    const mw = logCriticalAction('pay_adjust');
    const req = {
      requestId: 'r1',
      method: 'PUT',
      path: '/finance',
      user: { id: 'adm1' },
    } as unknown as Request;
    const next = jest.fn();
    mw(req, {} as Response, next);
    expect(logger.warn).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });
});

describe('auth setAuthCookies / clearAuthCookies / extractTokenFromCookie', () => {
  it('setAuthCookies sets access and refresh cookies', () => {
    const cookies: Record<string, unknown> = {};
    const res = {
      cookie: jest.fn((name: string, val: string, _opts: unknown) => {
        cookies[name] = val;
      }),
    } as unknown as Response;
    setAuthCookies(res, 'acc.tok', 'ref.tok');
    expect(res.cookie).toHaveBeenCalled();
    expect(cookies.accessToken).toBe('acc.tok');
    expect(cookies.refreshToken).toBe('ref.tok');
  });

  it('clearAuthCookies clears both', () => {
    const cleared: string[] = [];
    const res = {
      clearCookie: jest.fn((name: string) => {
        cleared.push(name);
      }),
    } as unknown as Response;
    clearAuthCookies(res);
    expect(cleared).toEqual(expect.arrayContaining(['accessToken', 'refreshToken']));
  });

  it('extractTokenFromCookie reads access or refresh', () => {
    const req = { cookies: { accessToken: 'a', refreshToken: 'r' } } as unknown as Request;
    expect(extractTokenFromCookie(req, 'access')).toBe('a');
    expect(extractTokenFromCookie(req, 'refresh')).toBe('r');
    expect(extractTokenFromCookie({ cookies: {} } as Request, 'access')).toBeNull();
  });
});
