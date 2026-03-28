import { describe, it, expect } from 'vitest';
import {
  ADMIN_APP_NAV_ITEMS,
  filterAdminHubNavItems,
  isAdminNavRouteActive,
} from '../adminNavConfig';

describe('isAdminNavRouteActive', () => {
  it('精确匹配列表页', () => {
    expect(isAdminNavRouteActive('/admin/orders', '/admin/orders')).toBe(true);
  });

  it('详情子路由激活父模块（非 dashboard 根）', () => {
    expect(isAdminNavRouteActive('/admin/campaigns/abc', '/admin/campaigns')).toBe(true);
    expect(isAdminNavRouteActive('/admin/advertisers/u1', '/admin/advertisers')).toBe(true);
  });

  it('数据看板根路径不向子路径扩散', () => {
    expect(isAdminNavRouteActive('/admin/dashboard/extra', '/admin/dashboard')).toBe(false);
  });

  it('其它模块路径不交叉误匹配', () => {
    expect(isAdminNavRouteActive('/admin/kol-review', '/admin/kols')).toBe(false);
  });
});

describe('filterAdminHubNavItems', () => {
  it('列表首页隐藏同 path 项', () => {
    const out = filterAdminHubNavItems('/admin/stats', ADMIN_APP_NAV_ITEMS);
    expect(out.some((i) => i.path === '/admin/stats')).toBe(false);
    expect(out.length).toBe(ADMIN_APP_NAV_ITEMS.length - 1);
  });

  it('详情页保留全部模块按钮', () => {
    const out = filterAdminHubNavItems('/admin/campaigns/x', ADMIN_APP_NAV_ITEMS);
    expect(out.length).toBe(ADMIN_APP_NAV_ITEMS.length);
  });
});
