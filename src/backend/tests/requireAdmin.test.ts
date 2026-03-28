import type { Request } from 'express';
import { requireAdmin } from '../src/middleware/adminAuth';
import { ApiError } from '../src/middleware/errorHandler';

describe('requireAdmin', () => {
  it('throws ApiError when req.admin is missing', () => {
    const req = {} as Request;
    expect(() => requireAdmin(req)).toThrow(ApiError);
    try {
      requireAdmin(req);
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).statusCode).toBe(401);
      expect((e as ApiError).code).toBe('AUTH_REQUIRED');
    }
  });

  it('returns admin when req.admin is set', () => {
    const req = {
      admin: {
        id: 'id-1',
        email: 'a@example.com',
        name: 'Admin',
        role: 'admin',
        permissions: ['user:view'],
      },
    } as Request;
    const admin = requireAdmin(req);
    expect(admin.id).toBe('id-1');
    expect(admin.email).toBe('a@example.com');
  });
});
