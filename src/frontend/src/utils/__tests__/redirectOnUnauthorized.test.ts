import { describe, it, expect, vi, afterEach } from 'vitest';
import { APP_PATHS } from '../../constants/appPaths';
import { redirectToAppLogin, redirectToAdminLogin } from '../redirectOnUnauthorized';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('redirectToAppLogin', () => {
  it('在非登录页写入主站登录路径', () => {
    let href = '';
    vi.stubGlobal('window', {
      location: {
        pathname: '/advertiser/campaigns',
        set href(v: string) {
          href = v;
        },
        get href() {
          return href || '/advertiser/campaigns';
        },
      },
    });
    redirectToAppLogin();
    expect(href).toBe(APP_PATHS.login);
  });

  it('在登录页不写入 href', () => {
    let href = '';
    vi.stubGlobal('window', {
      location: {
        pathname: APP_PATHS.login,
        set href(v: string) {
          href = v;
        },
        get href() {
          return APP_PATHS.login;
        },
      },
    });
    redirectToAppLogin();
    expect(href).toBe('');
  });
});

describe('redirectToAdminLogin', () => {
  it('在非管理登录页写入管理登录路径', () => {
    let href = '';
    vi.stubGlobal('window', {
      location: {
        pathname: '/admin/dashboard',
        set href(v: string) {
          href = v;
        },
        get href() {
          return href || '/admin/dashboard';
        },
      },
    });
    redirectToAdminLogin();
    expect(href).toBe(APP_PATHS.adminLogin);
  });

  it('在管理登录页不写入 href', () => {
    let href = '';
    vi.stubGlobal('window', {
      location: {
        pathname: APP_PATHS.adminLogin,
        set href(v: string) {
          href = v;
        },
        get href() {
          return APP_PATHS.adminLogin;
        },
      },
    });
    redirectToAdminLogin();
    expect(href).toBe('');
  });
});
