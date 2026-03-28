import { ApiError, createError, errors } from '../src/middleware/errorHandler';

describe('ApiError', () => {
  it('carries statusCode, code and optional details', () => {
    const e = new ApiError('msg', 418, 'TEAPOT', [{ field: 'x', message: 'y' }]);
    expect(e.statusCode).toBe(418);
    expect(e.code).toBe('TEAPOT');
    expect(e.message).toBe('msg');
    expect(e.details).toEqual([{ field: 'x', message: 'y' }]);
  });
});

describe('createError', () => {
  it('builds ApiError with defaults', () => {
    const e = createError('bad', 400, 'BAD_REQUEST');
    expect(e).toBeInstanceOf(ApiError);
    expect(e.statusCode).toBe(400);
    expect(e.code).toBe('BAD_REQUEST');
  });
});

describe('errors factory', () => {
  it('badRequest', () => {
    const e = errors.badRequest();
    expect(e.statusCode).toBe(400);
    expect(e.code).toBe('BAD_REQUEST');
  });

  it('unauthorized', () => {
    const e = errors.unauthorized('请登录');
    expect(e.statusCode).toBe(401);
    expect(e.code).toBe('UNAUTHORIZED');
    expect(e.message).toBe('请登录');
  });

  it('forbidden', () => {
    const e = errors.forbidden();
    expect(e.statusCode).toBe(403);
    expect(e.code).toBe('FORBIDDEN');
  });

  it('notFound', () => {
    const e = errors.notFound('无');
    expect(e.statusCode).toBe(404);
    expect(e.code).toBe('NOT_FOUND');
  });

  it('conflict', () => {
    const e = errors.conflict();
    expect(e.statusCode).toBe(409);
    expect(e.code).toBe('CONFLICT');
  });

  it('tooManyRequests', () => {
    const e = errors.tooManyRequests();
    expect(e.statusCode).toBe(429);
    expect(e.code).toBe('TOO_MANY_REQUESTS');
  });

  it('internal', () => {
    const e = errors.internal();
    expect(e.statusCode).toBe(500);
    expect(e.code).toBe('INTERNAL_ERROR');
  });

  it('serviceUnavailable', () => {
    const e = errors.serviceUnavailable();
    expect(e.statusCode).toBe(503);
    expect(e.code).toBe('SERVICE_UNAVAILABLE');
  });
});
