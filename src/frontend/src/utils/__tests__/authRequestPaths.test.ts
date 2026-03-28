import { describe, it, expect } from 'vitest';
import { isAuthRefreshPath, isPublicAuthRequestPath } from '../authRequestPaths';

describe('authRequestPaths', () => {
  it('isPublicAuthRequestPath 识别未登录态认证接口', () => {
    expect(isPublicAuthRequestPath('/auth/login')).toBe(true);
    expect(isPublicAuthRequestPath('/auth/register')).toBe(true);
    expect(isPublicAuthRequestPath('/auth/login-email-code')).toBe(true);
    expect(isPublicAuthRequestPath('/auth/verification-code')).toBe(true);
    expect(isPublicAuthRequestPath('/auth/verify-code')).toBe(true);
    expect(isPublicAuthRequestPath('/auth/reset-password')).toBe(true);
    expect(isPublicAuthRequestPath('/auth/forgot-password')).toBe(true);
    expect(isPublicAuthRequestPath('/auth/login?x=1')).toBe(true);
  });

  it('isPublicAuthRequestPath 对业务与 refresh 为 false', () => {
    expect(isPublicAuthRequestPath('/auth/refresh')).toBe(false);
    expect(isPublicAuthRequestPath('/campaigns')).toBe(false);
    expect(isPublicAuthRequestPath('/users/me')).toBe(false);
  });

  it('isAuthRefreshPath 仅匹配 refresh', () => {
    expect(isAuthRefreshPath('/auth/refresh')).toBe(true);
    expect(isAuthRefreshPath('/auth/refresh?x=1')).toBe(true);
    expect(isAuthRefreshPath('/auth/login')).toBe(false);
  });
});
