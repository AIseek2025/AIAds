import { describe, it, expect } from 'vitest';
import {
  isMainAppSidebarItemActive,
  MAIN_APP_SIDEBAR_ITEMS,
  MAIN_APP_SIDEBAR_PREFIX_PATHS,
} from '../mainAppNavConfig';

describe('isMainAppSidebarItemActive', () => {
  it('列表页精确匹配', () => {
    expect(isMainAppSidebarItemActive('/advertiser/orders', '/advertiser/orders')).toBe(true);
  });

  it('详情子路由在 prefix 列表中则高亮', () => {
    expect(isMainAppSidebarItemActive('/advertiser/campaigns/create', '/advertiser/campaigns')).toBe(true);
    expect(isMainAppSidebarItemActive('/advertiser/orders/uuid', '/advertiser/orders')).toBe(true);
    expect(isMainAppSidebarItemActive('/kol/task-market/x', '/kol/task-market')).toBe(true);
  });

  it('非 prefix 路径不向子路径扩散', () => {
    expect(isMainAppSidebarItemActive('/advertiser/dashboard/foo', '/advertiser/dashboard')).toBe(false);
  });
});

describe('MAIN_APP_SIDEBAR_ITEMS', () => {
  it('与 prefix 集合路径均在配置中存在', () => {
    const paths = new Set(MAIN_APP_SIDEBAR_ITEMS.map((i) => i.path));
    for (const p of MAIN_APP_SIDEBAR_PREFIX_PATHS) {
      expect(paths.has(p)).toBe(true);
    }
  });
});
